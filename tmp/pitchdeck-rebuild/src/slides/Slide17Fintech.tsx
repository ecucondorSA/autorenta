import React from 'react';
import { SlideLayout, SlideHeader, Card } from '../components/SlideLayout';

export function Slide17Fintech() {
  const coreBancario = [
    'Libro Contable de doble entrada (Debit/Credit).',
    'Billetera Virtual digitales por usuario (sin licencia bancaria).',
    'Pagos Divididos & Pre-autorizaciones (T+2).',
    'Bloqueos transaccionales (Advisory Locks).'
  ];

  const arquitectura = [
    '100% Serverless (Supabase Edge Functions).',
    'Latencia < 50ms en LatAm (Global Edge Network).',
    'Motor de Riesgo con IA (Gemini 2.5).',
    'Front-end Omnicanal (Web + Android + iOS).'
  ];

  return (
    <SlideLayout>
      <SlideHeader
        title="Plataforma Fintech Vertical"
        subtitle="Infraestructura propietaria. No es un MVP."
      />

      <div className="grid-2" style={{ marginTop: '48px' }}>
        <Card>
          <div className="section-header">CORE BANCARIO & LEDGER</div>
          <ul className="list">
            {coreBancario.map((c, i) => <li key={i}>{c}</li>)}
          </ul>
        </Card>

        <Card>
          <div className="section-header">ARQUITECTURA EDGE & AI</div>
          <ul className="list">
            {arquitectura.map((a, i) => <li key={i}>{a}</li>)}
          </ul>
        </Card>
      </div>

      <div style={{
        background: 'var(--accent-green)',
        padding: '24px 48px',
        borderRadius: '8px',
        position: 'absolute',
        bottom: '80px',
        left: '80px',
        right: '80px'
      }}>
        <p style={{ fontSize: '24px', fontWeight: '700', color: 'var(--bg-primary)' }}>
          ESTADO ACTUAL: 100% OPERATIVO EN PRODUCCION
        </p>
      </div>
    </SlideLayout>
  );
}
