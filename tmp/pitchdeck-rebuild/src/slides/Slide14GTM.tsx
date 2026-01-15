import React from 'react';
import { SlideLayout, SlideHeader } from '../components/SlideLayout';

export function Slide14EstrategiaMercado() {
  const funnel = [
    { stage: 'AWARENESS', value: '100K+', desc: 'WiFi Fronterizo → Registro vehicular', color: 'var(--text-muted)', width: '100%' },
    { stage: 'INTEREST', value: '30K', desc: 'Push notifications en alta demanda', color: 'var(--text-secondary)', width: '80%' },
    { stage: 'ACTIVATION', value: '5K', desc: 'Primera publicación de vehículo', color: 'var(--text-primary)', width: '60%' },
    { stage: 'REVENUE', value: '1.5K', desc: 'Primera reserva completada', color: 'var(--accent-green)', width: '40%' }
  ];

  return (
    <SlideLayout>
      <SlideHeader
        title="Go-To-Market"
        subtitle="Estrategia de adquisición de bajo costo."
      />

      <div style={{
        display: 'grid',
        gridTemplateColumns: '1.2fr 1fr',
        gap: '60px',
        marginTop: '48px',
        alignItems: 'center'
      }}>
        {/* Left - Funnel */}
        <div>
          <p style={{
            fontSize: '14px',
            color: 'var(--text-muted)',
            marginBottom: '24px',
            textTransform: 'uppercase',
            letterSpacing: '2px'
          }}>
            Funnel de Conversión (Proyección Q1-Q2)
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {funnel.map((f, i) => (
              <div key={i} style={{
                display: 'flex',
                alignItems: 'center',
                gap: '16px'
              }}>
                {/* Bar */}
                <div style={{
                  background: `linear-gradient(90deg, ${f.color} 0%, rgba(0,208,132,0.3) 100%)`,
                  height: '56px',
                  width: f.width,
                  borderRadius: '8px',
                  display: 'flex',
                  alignItems: 'center',
                  padding: '0 20px',
                  justifyContent: 'space-between'
                }}>
                  <span style={{ fontSize: '14px', fontWeight: '600', color: 'var(--bg-primary)' }}>
                    {f.stage}
                  </span>
                  <span style={{ fontSize: '24px', fontWeight: '800', color: 'var(--bg-primary)' }}>
                    {f.value}
                  </span>
                </div>
              </div>
            ))}
          </div>

          <p style={{
            fontSize: '14px',
            color: 'var(--text-muted)',
            marginTop: '16px'
          }}>
            Conversión total: 1.5% (benchmark industria: 0.5-2%)
          </p>
        </div>

        {/* Right - Channels */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div style={{
            background: 'var(--bg-card)',
            border: '2px solid var(--accent-green)',
            borderRadius: '12px',
            padding: '24px'
          }}>
            <p style={{ fontSize: '14px', color: 'var(--accent-green)', marginBottom: '12px', fontWeight: '600' }}>
              🚀 CANAL PRINCIPAL: WiFi Fronterizo
            </p>
            <p style={{ fontSize: '18px', color: 'var(--text-primary)', marginBottom: '8px' }}>
              CAC proyectado: <strong style={{ color: 'var(--accent-green)' }}>{'<'} $0.50</strong>
            </p>
            <p style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>
              vs $15+ en Facebook/Google Ads
            </p>
          </div>

          <div style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border-subtle)',
            borderRadius: '12px',
            padding: '24px'
          }}>
            <p style={{ fontSize: '14px', color: 'var(--text-muted)', marginBottom: '12px' }}>
              CANALES SECUNDARIOS
            </p>
            <ul style={{
              fontSize: '15px',
              color: 'var(--text-secondary)',
              lineHeight: 2,
              paddingLeft: '20px',
              margin: 0
            }}>
              <li>5,000+ Waitlist (EcuCondor)</li>
              <li>Alianzas flotas locales</li>
              <li>Referidos (bonus en billetera)</li>
              <li>SEO orgánico</li>
            </ul>
          </div>

          <div style={{
            background: 'var(--bg-secondary)',
            borderRadius: '12px',
            padding: '16px',
            textAlign: 'center'
          }}>
            <p style={{ fontSize: '14px', color: 'var(--text-muted)' }}>
              Foco geográfico inicial
            </p>
            <p style={{ fontSize: '24px', fontWeight: '700', color: 'var(--text-primary)' }}>
              🇦🇷 CABA + GBA
            </p>
          </div>
        </div>
      </div>
    </SlideLayout>
  );
}
