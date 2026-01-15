import React from 'react';
import { SlideLayout, SlideHeader, Card } from '../components/SlideLayout';

export function Slide07Mercado() {
  const focos = [
    'USD $84B en activos depreciándose diariamente por falta de uso.',
    'BA + CABA: 8.44M vehículos activos (DNRPA) - promedio $10k USD.',
    'LATAM car-sharing crece 22.7% CAGR 2024-2030.',
    'Viento de cola macro: clase media busca ingresos extra en 2026.'
  ];

  return (
    <SlideLayout>
      <SlideHeader
        title="Mercado (TAM / SAM / SOM)"
        subtitle="Oportunidad real en Argentina con expansión LATAM."
      />

      <div style={{ display: 'flex', marginTop: '48px', height: '600px', gap: '80px', alignItems: 'center' }}>

        {/* Visual TAM/SAM/SOM Circles */}
        <div style={{ position: 'relative', width: '600px', height: '600px', flexShrink: 0 }}>
          {/* TAM */}
          <div style={{
            position: 'absolute',
            top: '0', left: '0', right: '0', bottom: '0',
            borderRadius: '50%',
            border: '2px dashed var(--text-muted)',
            background: 'rgba(255,255,255,0.02)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            paddingTop: '40px',
            color: 'var(--text-muted)'
          }}>
            <div style={{ fontWeight: '700', fontSize: '24px' }}>TAM (ARG)</div>
            <div style={{ fontSize: '32px' }}>USD 989M</div>
          </div>

          {/* SAM */}
          <div style={{
            position: 'absolute',
            top: '100px', left: '100px', right: '100px', bottom: '100px',
            borderRadius: '50%',
            border: '2px solid var(--accent-green-dim)',
            background: 'rgba(0, 208, 132, 0.05)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            paddingTop: '60px',
            color: 'var(--text-secondary)'
          }}>
            <div style={{ fontWeight: '700', fontSize: '24px' }}>SAM (Car-sharing)</div>
            <div style={{ fontSize: '36px', color: 'var(--text-primary)' }}>USD 12.4M</div>
          </div>

          {/* SOM */}
          <div style={{
            position: 'absolute',
            top: '220px', left: '220px', right: '220px', bottom: '220px',
            borderRadius: '50%',
            background: 'var(--accent-green)',
            boxShadow: '0 0 40px var(--accent-green-dim)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            color: 'var(--bg-primary)'
          }}>
            <div style={{ fontWeight: '700', fontSize: '18px' }}>SOM (3 Años)</div>
            <div style={{ fontSize: '42px', fontWeight: '800' }}>$1.1M</div>
          </div>
        </div>

        {/* Right - Focus points */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '32px' }}>
          <Card style={{ padding: '40px' }}>
            <div className="section-header">POR QUÉ AHORA</div>
            <ul className="list">
              {focos.map((f, i) => (
                <li key={i} style={{ fontSize: '24px', marginBottom: '16px' }}>{f}</li>
              ))}
            </ul>
          </Card>

          <div style={{
            background: 'var(--bg-secondary)',
            padding: '24px',
            borderRadius: '12px',
            borderLeft: '4px solid var(--accent-green)'
          }}>
            <div style={{ fontSize: '14px', color: 'var(--text-muted)', marginBottom: '8px', textTransform: 'uppercase' }}>
              Validación de Mercado
            </div>
            <div style={{ fontSize: '20px', color: 'var(--text-primary)' }}>
              "Cada día que un auto está estacionado, pierde ~$15 USD en depreciación. Eso son $5,500/año por vehículo."
            </div>
          </div>
        </div>
      </div>

      <p style={{
        position: 'absolute',
        bottom: '40px',
        left: '80px',
        fontSize: '14px',
        color: 'var(--text-muted)',
        maxWidth: '80%'
      }}>
        Fuentes: Estimaciones internas basadas en datos de renting LATAM (2024), Reporte DNRPA y supuestos de conversión del mercado informal.
      </p>
    </SlideLayout>
  );
}
