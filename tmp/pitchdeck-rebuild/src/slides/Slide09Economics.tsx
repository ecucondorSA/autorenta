import React from 'react';
import { SlideLayout, SlideHeader } from '../components/SlideLayout';

export function Slide09Economia() {
  const rows = [
    { label: 'AOV (Ticket Objetivo)', value: 'USD 120.00', desc: 'Alquiler promedio 3-4 dias (Benchmark).', color: 'var(--text-primary)' },
    { label: 'Take Rate (15%)', value: 'USD 18.00', desc: 'Revenue Plataforma.', color: 'var(--accent-green)' },
    { label: 'FGO (10%)', value: 'USD 12.00', desc: 'Fondo de Garantia (Pasivo/Pool).', color: 'var(--text-primary)' },
    { label: 'Costos PSP & Soporte', value: '- USD 7.20', desc: 'Pagos (3.5%) + Riesgo Est. (2.5%).', color: 'var(--danger)' }
  ];

  const protections = [
    'Billetera Virtual Pre-Funded: Elimina el riesgo de impago (Brecha de Pago = 0).',
    'Video Registro de Entrada: Reduce disputas subjetivas (Costo de Riesgo baja 40%).',
    'Barrera Biométrica KYC: Bloquea identidad sintetica antes de reservar.'
  ];

  return (
    <SlideLayout>
      <SlideHeader
        title="La Ecuación (Economía Objetivo)"
        subtitle="Modelo matematico de viabilidad por unidad (Primeros Principios)."
      />

      <p style={{ fontSize: '20px', color: 'var(--accent-green)', marginBottom: '48px' }}>
        MARGEN DE CONTRIBUCIÓN = (AOV x COMISIÓN) - COSTOS - RIESGO
      </p>

      <div className="flex-col gap-24" style={{ marginBottom: '48px' }}>
        {rows.map((r, i) => (
          <div key={i} style={{
            display: 'grid',
            gridTemplateColumns: '280px 160px 1fr',
            alignItems: 'center',
            gap: '32px'
          }}>
            <span style={{ fontSize: '22px' }}>{r.label}</span>
            <span style={{ fontSize: '28px', fontWeight: '700', color: r.color }}>{r.value}</span>
            <span style={{ fontSize: '18px', color: 'var(--text-muted)' }}>{r.desc}</span>
          </div>
        ))}
      </div>

      <div style={{
        background: 'var(--accent-green)',
        padding: '24px 48px',
        borderRadius: '8px',
        marginBottom: '48px'
      }}>
        <p style={{ fontSize: '24px', fontWeight: '700', color: 'var(--bg-primary)', textAlign: 'center' }}>
          TARGET MARGIN: USD 10.80 por reserva (Positivo desde Day 1).
        </p>
      </div>

      <div className="section-header" style={{ color: 'var(--accent-yellow)' }}>
        COMO EL 'SISTEMA CONFIANZA' PROTEGE EL MARGEN:
      </div>
      <ul className="list">
        {protections.map((p, i) => (
          <li key={i}>{p}</li>
        ))}
      </ul>
    </SlideLayout>
  );
}
