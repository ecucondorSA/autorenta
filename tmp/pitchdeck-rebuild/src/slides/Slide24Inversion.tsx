import React from 'react';
import { SlideLayout, SlideHeader } from '../components/SlideLayout';

export function Slide24Inversion() {
  return (
    <SlideLayout>
      <SlideHeader
        title="Oportunidad de Inversión"
        subtitle="Ronda Semilla para escalar infraestructura y liquidez."
      />

      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1.2fr',
        gap: '60px',
        marginTop: '40px',
        alignItems: 'center'
      }}>
        {/* Left - Investment Amount & Pie Chart */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          {/* Amount */}
          <div style={{
            background: 'linear-gradient(135deg, var(--accent-green) 0%, #00a86b 100%)',
            padding: '24px 48px',
            borderRadius: '16px',
            marginBottom: '32px',
            boxShadow: '0 20px 40px rgba(0,208,132,0.3)'
          }}>
            <p style={{ fontSize: '18px', color: 'rgba(0,0,0,0.6)', marginBottom: '4px', textAlign: 'center' }}>
              RONDA SEMILLA
            </p>
            <p style={{ fontSize: '56px', fontWeight: '800', color: 'var(--bg-primary)', textAlign: 'center' }}>
              USD $500K
            </p>
          </div>

          {/* Pie Chart Image */}
          <img
            src="/assets/investment-pie-chart.png"
            alt="Uso de Fondos"
            style={{
              width: '380px',
              height: 'auto',
              filter: 'drop-shadow(0 10px 30px rgba(0,0,0,0.3))'
            }}
          />
        </div>

        {/* Right - Details */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* Runway */}
          <div style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border-subtle)',
            borderRadius: '12px',
            padding: '24px'
          }}>
            <p style={{ fontSize: '14px', color: 'var(--text-muted)', marginBottom: '8px', textTransform: 'uppercase' }}>
              Autonomía
            </p>
            <p style={{ fontSize: '32px', fontWeight: '700', color: 'var(--accent-green)' }}>
              18 Meses
            </p>
            <p style={{ fontSize: '16px', color: 'var(--text-secondary)' }}>
              Para escalar a 100k+ usuarios activos
            </p>
          </div>

          {/* Use of Funds */}
          <div style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border-subtle)',
            borderRadius: '12px',
            padding: '24px'
          }}>
            <p style={{ fontSize: '14px', color: 'var(--text-muted)', marginBottom: '16px', textTransform: 'uppercase' }}>
              Uso de Fondos
            </p>

            {[
              { pct: '50%', label: 'Ingeniería', desc: 'Escala Supabase + IA', color: 'var(--accent-green)' },
              { pct: '30%', label: 'Liquidez', desc: 'Fondo P2P + Seguros', color: '#4DD0E1' },
              { pct: '20%', label: 'Crecimiento', desc: 'Nodos WiFi Fronterizos', color: '#FFB74D' }
            ].map((item, i) => (
              <div key={i} style={{
                display: 'flex',
                alignItems: 'center',
                gap: '16px',
                marginBottom: i < 2 ? '16px' : 0
              }}>
                <div style={{
                  width: '48px',
                  height: '48px',
                  borderRadius: '8px',
                  background: item.color,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '16px',
                  fontWeight: '700',
                  color: 'var(--bg-primary)'
                }}>
                  {item.pct}
                </div>
                <div>
                  <p style={{ fontSize: '18px', fontWeight: '600', color: 'var(--text-primary)' }}>
                    {item.label}
                  </p>
                  <p style={{ fontSize: '14px', color: 'var(--text-muted)' }}>
                    {item.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* Growth Hack */}
          <div style={{
            background: 'rgba(0,208,132,0.1)',
            border: '1px solid var(--accent-green)',
            borderRadius: '12px',
            padding: '20px'
          }}>
            <p style={{ fontSize: '14px', color: 'var(--accent-green)', marginBottom: '8px', fontWeight: '600' }}>
              🚀 GROWTH HACK: WiFi Fronterizo
            </p>
            <p style={{ fontSize: '15px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
              WiFi gratis en pasos fronterizos → Registro obligatorio de vehículo →
              <strong style={{ color: 'var(--accent-green)' }}> CAC {'<'} $0.50</strong> (vs $15+ en Ads)
            </p>
          </div>
        </div>
      </div>
    </SlideLayout>
  );
}
