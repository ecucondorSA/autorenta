import React from 'react';
import { SlideLayout, SlideHeader } from '../components/SlideLayout';

export function Slide05Momento() {
  const factores = [
    {
      icon: '📈',
      title: 'Inflación & Crisis Económica',
      stat: '200%+',
      statLabel: 'Inflación anual',
      desc: 'La clase media busca ingresos extra. Un auto parado es un pasivo. Alquilarlo genera USD $200-400/mes.'
    },
    {
      icon: '🚫',
      title: 'Exclusión Financiera',
      stat: '70%',
      statLabel: 'Sin crédito formal',
      desc: 'Las rentadoras tradicionales rechazan al 70%. Mercado cautivo sin alternativas digitales.'
    },
    {
      icon: '🤖',
      title: 'Tecnología Accesible',
      stat: '<$0.01',
      statLabel: 'Costo por verificación IA',
      desc: 'Biometría, video-análisis y contratos digitales son commodity. El timing es ahora.'
    }
  ];

  return (
    <SlideLayout>
      <SlideHeader
        title="¿Por Qué Ahora?"
        subtitle="3 factores macro convergen en Argentina 2026."
      />

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gap: '32px',
        marginTop: '60px'
      }}>
        {factores.map((f, i) => (
          <div key={i} style={{
            background: 'var(--bg-card)',
            border: i === 0 ? '2px solid var(--accent-green)' : '1px solid var(--border-subtle)',
            borderRadius: '16px',
            padding: '32px',
            display: 'flex',
            flexDirection: 'column',
            position: 'relative'
          }}>
            {/* Icon */}
            <div style={{
              fontSize: '48px',
              marginBottom: '20px'
            }}>
              {f.icon}
            </div>

            {/* Title */}
            <h3 style={{
              fontSize: '24px',
              fontWeight: '700',
              marginBottom: '20px',
              color: 'var(--text-primary)'
            }}>
              {f.title}
            </h3>

            {/* Stat */}
            <div style={{
              background: 'rgba(0, 208, 132, 0.1)',
              borderRadius: '12px',
              padding: '16px',
              marginBottom: '20px',
              textAlign: 'center'
            }}>
              <p style={{
                fontSize: '36px',
                fontWeight: '800',
                color: 'var(--accent-green)',
                marginBottom: '4px'
              }}>
                {f.stat}
              </p>
              <p style={{
                fontSize: '14px',
                color: 'var(--text-muted)'
              }}>
                {f.statLabel}
              </p>
            </div>

            {/* Description */}
            <p style={{
              fontSize: '16px',
              color: 'var(--text-secondary)',
              lineHeight: 1.6,
              flex: 1
            }}>
              {f.desc}
            </p>
          </div>
        ))}
      </div>

      {/* Bottom CTA */}
      <div style={{
        marginTop: '48px',
        textAlign: 'center'
      }}>
        <p style={{
          fontSize: '28px',
          color: 'var(--accent-green)',
          fontWeight: '600'
        }}>
          🎯 La ventana de oportunidad está abierta. El que ejecute primero, gana.
        </p>
      </div>
    </SlideLayout>
  );
}
