#!/usr/bin/env node

/**
 * Environment Variables Validator
 * 
 * Valida que todas las variables de entorno requeridas estén configuradas
 */

import 'dotenv/config';

const REQUIRED_VARS = [
    'GROQ_API_KEY',
    'SUPABASE_URL',
    'SUPABASE_SERVICE_ROLE_KEY',
];

const OPTIONAL_VARS = [
    'GITHUB_TOKEN',
    'COOKIE_ENCRYPTION_KEY',
    'HEADLESS',
    'SCREENSHOT_DIR',
    'COOKIES_DIR',
    'PROXY_POOL_FILE',
];

function validateEnv() {
    console.log('🔍 Validating environment variables...\n');

    let missingRequired = [];
    let missingOptional = [];

    // Check required
    for (const varName of REQUIRED_VARS) {
        if (!process.env[varName]) {
            missingRequired.push(varName);
            console.log(`❌ ${varName} - MISSING (required)`);
        } else {
            const value = process.env[varName];
            const preview = value.length > 20 ? value.substring(0, 20) + '...' : value;
            console.log(`✅ ${varName} - ${preview}`);
        }
    }

    console.log('');

    // Check optional
    for (const varName of OPTIONAL_VARS) {
        if (!process.env[varName]) {
            missingOptional.push(varName);
            console.log(`⚠️  ${varName} - missing (optional)`);
        } else {
            const value = process.env[varName];
            const preview = value.length > 20 ? value.substring(0, 20) + '...' : value;
            console.log(`✅ ${varName} - ${preview}`);
        }
    }

    console.log('\n📊 Summary:');
    console.log(`   Required: ${REQUIRED_VARS.length - missingRequired.length}/${REQUIRED_VARS.length}`);
    console.log(`   Optional: ${OPTIONAL_VARS.length - missingOptional.length}/${OPTIONAL_VARS.length}`);

    if (missingRequired.length > 0) {
        console.log('\n❌ VALIDATION FAILED');
        console.log('\nMissing required variables:');
        missingRequired.forEach(v => console.log(`   - ${v}`));
        console.log('\nPlease set these in your .env file');
        console.log('See .env.example for reference\n');
        process.exit(1);
    }

    if (missingOptional.length > 0) {
        console.log('\n⚠️  Missing optional variables (will use defaults):');
        missingOptional.forEach(v => console.log(`   - ${v}`));
    }

    console.log('\n✅ Environment validation passed!\n');
    return true;
}

// CLI execution
if (import.meta.url === `file://${process.argv[1]}`) {
    validateEnv();
}

export { validateEnv };
