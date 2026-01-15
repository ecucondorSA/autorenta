import React from 'react';
import { SlideLayout, SlideHeader } from '../components/SlideLayout';

export function Slide22Competencia() {
  const competitors = [
    {
      name: 'Rentadoras Tradicionales',
      icon: '🏢',
      cons: ['Burocracia alta', 'Precios +30%', 'Requiere TC internacional'],
      score: 20
    },
    {
      name: 'Facebook / WhatsApp',
      icon: '📱',
      cons: ['Sin verificación', 'Alto riesgo fraude', 'Sin protección legal'],
      score: 30
    },
    {
      name: 'Apps Genéricas',
      icon: '📲',
      cons: ['Sin motor de riesgo', 'Sin billetera virtual', 'UX deficiente'],
      score: 45
    }
  ];

  const ventajas = [
    { icon: '🔐', label: 'KYC Biométrico', desc: 'Verificación de identidad obligatoria' },
    { icon: '💰', label: 'Billetera Virtual', desc: 'Garantía pre-depositada sin TC' },
    { icon: '📹', label: 'Video-Inspección IA', desc: 'Evidencia legal automática' },
    { icon: '📋', label: 'Contrato Digital', desc: 'Comodato con validez jurídica' },
    { icon: '💸', label: 'Precios -30%', desc: 'vs rentadoras tradicionales' },
    { icon: '⚡', label: 'Proceso 100% Digital', desc: 'Sin papeles ni sucursales' }
  ];

  return (
    <SlideLayout>
      <SlideHeader
        title="Ventaja Competitiva"
        subtitle="AutoRenta vs. Alternativas existentes."
      />

      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1.3fr',
        gap: '48px',
        marginTop: '40px'
      }}>
        {/* Left - Competitors */}
        <div>
          <p style={{
            fontSize: '14px',
            color: 'var(--danger)',
            marginBottom: '20px',
            textTransform: 'uppercase',
            letterSpacing: '2px'
          }}>
            ❌ Alternativas Actuales
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {competitors.map((c, i) => (
              <div key={i} style={{
                background: 'var(--bg-card)',
                border: '1px solid var(--border-subtle)',
                borderRadius: '12px',
                padding: '20px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                  <span style={{ fontSize: '28px' }}>{c.icon}</span>
                  <span style={{ fontSize: '18px', fontWeight: '600', color: 'var(--text-primary)' }}>
                    {c.name}
                  </span>
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                  {c.cons.map((con, j) => (
                    <span key={j} style={{
                      fontSize: '12px',
                      padding: '4px 10px',
                      background: 'rgba(255,68,68,0.15)',
                      color: 'var(--danger)',
                      borderRadius: '100px'
                    }}>
                      {con}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right - AutoRenta Advantages */}
        <div>
          <p style={{
            fontSize: '14px',
            color: 'var(--accent-green)',
            marginBottom: '20px',
            textTransform: 'uppercase',
            letterSpacing: '2px'
          }}>
            ✓ La Diferencia AutoRenta
          </p>

          <div style={{
            background: 'linear-gradient(180deg, var(--bg-card) 0%, rgba(0,208,132,0.08) 100%)',
            border: '2px solid var(--accent-green)',
            borderRadius: '16px',
            padding: '24px'
          }}>
            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '16px'
            }}>
              {ventajas.map((v, i) => (
                <div key={i} style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '12px',
                  padding: '12px',
                  background: 'var(--bg-secondary)',
                  borderRadius: '8px'
                }}>
                  <span style={{ fontSize: '24px' }}>{v.icon}</span>
                  <div>
                    <p style={{ fontSize: '14px', fontWeight: '600', color: 'var(--accent-green)' }}>
                      {v.label}
                    </p>
                    <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                      {v.desc}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Position Statement */}
          <div style={{
            marginTop: '20px',
            padding: '16px',
            background: 'var(--accent-green)',
            borderRadius: '8px',
            textAlign: 'center'
          }}>
            <p style={{ fontSize: '16px', fontWeight: '600', color: 'var(--bg-primary)' }}>
              Posicionamiento: Alta Confianza + Bajo Costo
            </p>
          </div>
        </div>
      </div>
    </SlideLayout>
  );
}
