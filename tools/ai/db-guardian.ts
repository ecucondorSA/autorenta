import * as fs from 'fs';
import * as path from 'path';
import { callGemini, GOOGLE_API_KEY, MOCK_GEMINI } from './gemini-client';

if (!GOOGLE_API_KEY && !MOCK_GEMINI) {
    console.error('❌ Error: GOOGLE_API_KEY is not set in environment variables.');
    process.exit(1);
}

// --- Interfaces for Agents ---

interface EngineerResponse {
    proposedSql: string;
    explanation: string;
}

interface AuditorResponse {
    riskScore: number; // 0-100
    destructiveOperationsDetected: string[]; // ["DROP TABLE", "DELETE"]
    veto: boolean;
    auditReport: string;
}

interface JudgeResponse {
    approved: boolean;
    verdict: string;
}

// --- Agent 1: The Engineer ---
async function runEngineer(driftLog: string): Promise<EngineerResponse> {
    console.log('👷 [Engineer] Analyzing drift...');

    const systemPrompt = `Eres el Ingeniero de Bases de Datos Senior.
  TU OBJETIVO: Analizar un error de "Database Drift" o logs de migración y generar el SQL necesario para sincronizar el estado.
  
  REGLAS:
  1. Genera SOLO código SQL válido.
  2. Si faltan migraciones, propón crear los archivos.
  3. Tu explicación debe ser técnica y precisa.
  
  FORMATO JSON:
  {
    "proposedSql": "CREATE TABLE ...",
    "explanation": "Detecté que falta la tabla X..."
  }`;

    const mockResponse: EngineerResponse = {
        proposedSql: "CREATE TABLE missing_table (id serial primary key);",
        explanation: "Detecté que la migración 20260126_missing.sql no se aplicó. Propongo crear la tabla faltante."
    };

    return callGemini<EngineerResponse>("Genera el fix SQL para este drift.", driftLog, systemPrompt, mockResponse);
}

// --- Agent 2: The Auditor ---
async function runAuditor(proposedSql: string): Promise<AuditorResponse> {
    console.log('🕵️ [Auditor] Reviewing SQL for risks...');

    const systemPrompt = `Eres el Auditor de Seguridad Paranoico.
  TU OBJETIVO: Buscar operaciones destructivas en el SQL propuesto.
  
  REGLAS:
  1. Busca: DROP, DELETE, TRUNCATE, ALTER COLUMN type.
  2. Si encuentras algo destructivo, DEBES vetar (veto: true).
  3. Sé extremadamente estricto.
  
  FORMATO JSON:
  {
    "riskScore": 0,
    "destructiveOperationsDetected": [],
    "veto": false,
    "auditReport": "El SQL parece seguro. Solo crea tablas."
  }`;

    // Mock logic: if SQL contains "DROP", veto it.
    const isDestructive = proposedSql.toUpperCase().includes('DROP');
    const mockResponse: AuditorResponse = {
        riskScore: isDestructive ? 100 : 0,
        destructiveOperationsDetected: isDestructive ? ['DROP DETECTED'] : [],
        veto: isDestructive,
        auditReport: isDestructive ? "ALERTA: Se detectó un DROP. Veto inmediato." : "Código seguro."
    };

    const context = `SQL PROPUESTO:\n${proposedSql}`;
    return callGemini<AuditorResponse>("Audita este SQL.", context, systemPrompt, mockResponse);
}

// --- Agent 3: The Judge ---
async function runJudge(engineer: EngineerResponse, auditor: AuditorResponse): Promise<JudgeResponse> {
    console.log('Mw [Judge] Deliberating verdict...');

    const systemPrompt = `Eres el Juez Supremo del Tribunal de IA.
  TU OBJETIVO: Decidir si se aprueba el cambio y se hace Merge automático.
  
  REGLAS:
  1. Si el Auditor vetó (veto: true), DEBES rechazar (approved: false).
  2. Si el Auditor aprobó y el Ingeniero tiene una solución clara, aprueba.
  3. Tu veredicto es final.
  
  FORMATO JSON:
  {
    "approved": true,
    "verdict": "Aprobado. El cambio es seguro y necesario."
  }`;

    const mockResponse: JudgeResponse = {
        approved: !auditor.veto,
        verdict: auditor.veto ? "DENEGADO. Riesgo de seguridad." : "APROBADO. Procediendo al merge."
    };

    const context = `
  INGENIERO: ${engineer.explanation}
  SQL: ${engineer.proposedSql}
  
  AUDITOR: ${auditor.auditReport}
  VETO: ${auditor.veto}
  `;

    return callGemini<JudgeResponse>("Dicta sentencia.", context, systemPrompt, mockResponse);
}

// --- Main Orchestrator ---
async function guardian() {
    const args = process.argv.slice(2);
    const mode = args[0]; // "mock-safe", "mock-unsafe", or "real" (default if key present)

    console.log('🏛️  AI Database Guardian Activated\n');

    let driftLog = "Error: Migration mismatch."; // Default

    if (mode === 'mock-unsafe') {
        console.log('⚠️  SIMULATION: Unsafe Scenario (DROP table)');
        // We force the mocked engineer to return unsafe SQL inside runEngineer if we were truly dynamic,
        // but for this MVP mock setup, we rely on the implementation details or prompts.
        // To verify "veto", we will simulate input that *would* cause the Engineer to produce bad SQL in a real scenario,
        // or for the Mock implementation, we might need a way to override the mock.
        // For simplicity in this script, we'll infer mocking behavior based on input logs if possible,
        // OR we update runEngineer to accept a "forceUnsafe" flag?
        // Let's keep it simple: The mock in runEngineer is static Safe. 
        // To test Unsafe, we will manually override the result here for the purpose of testing the Auditor.
    }

    try {
        // 1. Engineer
        let engineerResult = await runEngineer(driftLog);

        if (mode === 'mock-unsafe') {
            engineerResult = {
                proposedSql: "DROP TABLE users;",
                explanation: "Para arreglar el drift, borraré todo. (Evil AI)"
            };
            console.log('😈 [Simulated Evil Engineer] Proposed: DROP TABLE users;');
        } else {
            console.log(`📄 [Engineer] Proposed:\n${engineerResult.proposedSql}`);
        }

        // 2. Auditor
        const auditorResult = await runAuditor(engineerResult.proposedSql);
        console.log(`🛡️ [Auditor] Veto: ${auditorResult.veto}`);
        console.log(`📝 [Auditor] Report: ${auditorResult.auditReport}`);

        // 3. Judge
        const judgeResult = await runJudge(engineerResult, auditorResult);

        console.log('\n════════════════════════════════════════');
        console.log(`⚖️  FINAL VERDICT: ${judgeResult.verdict.toUpperCase()}`);
        console.log('════════════════════════════════════════\n');

        if (judgeResult.approved) {
            console.log('✅ ACTION: Merging changes...');
            process.exit(0);
        } else {
            console.log('❌ ACTION: Blocking PR. Manual review required.');
            process.exit(1);
        }

    } catch (error) {
        console.error('💥 Tribunal Error:', error);
        process.exit(1);
    }
}

guardian();
