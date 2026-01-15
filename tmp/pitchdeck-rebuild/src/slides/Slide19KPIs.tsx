import React from 'react';
import { SlideLayout, SlideHeader } from '../components/SlideLayout';

export function Slide19Metricas() {
  const metricas = [
    {
      category: 'TRACCIÓN',
      icon: '📈',
      color: 'var(--accent-green)',
      items: [
        { label: 'Reservas Completadas', value: '50+', target: true },
        { label: 'Ticket Promedio', value: '$100', target: true },
        { label: 'Propietarios Activos', value: '10', target: true }
      ]
    },
    {
      category: 'RIESGO',
      icon: '🛡️',
      color: '#4DD0E1',
      items: [
        { label: 'Tasa de Incidentes', value: '<5%', target: true },
        { label: 'Cobertura Seguro', value: '100%', target: true },
        { label: 'Fraudes Identidad', value: '0', target: true }
      ]
    },
    {
      category: 'RETENCIÓN',
      icon: '🔄',
      color: '#FFB74D',
      items: [
        { label: 'Retención Usuarios', value: '>30%', target: false },
        { label: 'NPS Propietarios', value: '>7', target: false },
        { label: 'Feedback Loop', value: 'Semanal', target: true }
      ]
    }
  ];

  return (
    <SlideLayout>
      <SlideHeader
        title="Métricas Piloto Q1 2026"
        subtitle="KPIs objetivo para validación con riesgo acotado."
      />

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gap: '24px',
        marginTop: '48px'
      }}>
        {metricas.map((m, i) => (
          <div key={i} style={{
            background: 'var(--bg-card)',
            border: `2px solid ${m.color}`,
            borderRadius: '16px',
            padding: '28px',
            position: 'relative'
          }}>
            {/* Header */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              marginBottom: '24px'
            }}>
              <span style={{ fontSize: '36px' }}>{m.icon}</span>
              <span style={{
                fontSize: '16px',
                fontWeight: '700',
                color: m.color,
                letterSpacing: '1px'
              }}>
                {m.category}
              </span>
            </div>

            {/* Metrics */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {m.items.map((item, j) => (
                <div key={j} style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '12px 16px',
                  background: 'var(--bg-secondary)',
                  borderRadius: '8px'
                }}>
                  <span style={{
                    fontSize: '14px',
                    color: 'var(--text-secondary)'
                  }}>
                    {item.label}
                  </span>
                  <span style={{
                    fontSize: '20px',
                    fontWeight: '700',
                    color: item.target ? 'var(--accent-green)' : 'var(--text-primary)'
                  }}>
                    {item.value}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Status Bar */}
      <div style={{
        marginTop: '40px',
        display: 'flex',
        justifyContent: 'center',
        gap: '32px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: 'var(--accent-green)' }} />
          <span style={{ fontSize: '14px', color: 'var(--text-muted)' }}>Meta alcanzable</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: 'var(--text-primary)' }} />
          <span style={{ fontSize: '14px', color: 'var(--text-muted)' }}>En seguimiento</span>
        </div>
      </div>
    </SlideLayout>
  );
}
