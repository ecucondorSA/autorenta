import React from 'react';
import { SlideLayout, SlideHeader } from '../components/SlideLayout';

export function Slide12Tecnologia() {
  const stack = [
    { name: 'Frontend', tech: 'Angular 18 + Ionic', icon: '📱' },
    { name: 'Backend', tech: 'Supabase (PostgreSQL)', icon: '🗄️' },
    { name: 'Auth', tech: 'Biometría + OAuth', icon: '🔐' },
    { name: 'Pagos', tech: 'MercadoPago API', icon: '💳' },
    { name: 'IA', tech: 'Gemini Vision', icon: '🤖' },
    { name: 'Deploy', tech: 'Cloudflare + GitHub', icon: '☁️' }
  ];

  const metricas = [
    { label: 'Uptime', value: '99.9%', color: 'var(--accent-green)' },
    { label: 'P95 Latency', value: '<200ms', color: 'var(--accent-green)' },
    { label: 'Edge Functions', value: '45+', color: 'var(--text-primary)' },
    { label: 'Cobertura Tests', value: '78%', color: 'var(--text-primary)' }
  ];

  return (
    <SlideLayout>
      <SlideHeader
        title="Stack Tecnológico"
        subtitle="Arquitectura moderna, escalable y de bajo costo."
      />

      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: '48px',
        marginTop: '48px'
      }}>
        {/* Left - Stack */}
        <div>
          <p style={{
            fontSize: '14px',
            color: 'var(--text-muted)',
            marginBottom: '24px',
            textTransform: 'uppercase',
            letterSpacing: '2px'
          }}>
            Stack Principal
          </p>

          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '16px'
          }}>
            {stack.map((s, i) => (
              <div key={i} style={{
                background: 'var(--bg-card)',
                border: '1px solid var(--border-subtle)',
                borderRadius: '12px',
                padding: '20px',
                display: 'flex',
                alignItems: 'center',
                gap: '16px'
              }}>
                <span style={{ fontSize: '32px' }}>{s.icon}</span>
                <div>
                  <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{s.name}</p>
                  <p style={{ fontSize: '16px', fontWeight: '600', color: 'var(--text-primary)' }}>{s.tech}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right - Metrics & Features */}
        <div>
          <p style={{
            fontSize: '14px',
            color: 'var(--text-muted)',
            marginBottom: '24px',
            textTransform: 'uppercase',
            letterSpacing: '2px'
          }}>
            Métricas de Producción
          </p>

          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '16px',
            marginBottom: '32px'
          }}>
            {metricas.map((m, i) => (
              <div key={i} style={{
                background: 'var(--bg-card)',
                border: '1px solid var(--border-subtle)',
                borderRadius: '12px',
                padding: '20px',
                textAlign: 'center'
              }}>
                <p style={{ fontSize: '32px', fontWeight: '700', color: m.color }}>{m.value}</p>
                <p style={{ fontSize: '14px', color: 'var(--text-muted)' }}>{m.label}</p>
              </div>
            ))}
          </div>

          {/* Key Features */}
          <div style={{
            background: 'rgba(0, 208, 132, 0.1)',
            border: '1px solid var(--accent-green)',
            borderRadius: '12px',
            padding: '24px'
          }}>
            <p style={{ fontSize: '14px', color: 'var(--accent-green)', marginBottom: '16px', fontWeight: '600' }}>
              ✓ VENTAJAS TÉCNICAS
            </p>
            <ul style={{
              fontSize: '15px',
              color: 'var(--text-secondary)',
              lineHeight: 2,
              paddingLeft: '20px',
              margin: 0
            }}>
              <li>Row Level Security (RLS) nativo en PostgreSQL</li>
              <li>Edge Functions para lógica de negocio serverless</li>
              <li>Código unificado Web + Android (Capacitor)</li>
              <li>CI/CD automático con GitHub Actions</li>
            </ul>
          </div>
        </div>
      </div>
    </SlideLayout>
  );
}
