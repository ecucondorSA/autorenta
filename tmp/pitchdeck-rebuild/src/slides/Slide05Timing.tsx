import React from 'react';
import { SlideLayout, SlideHeader } from '../components/SlideLayout';

export function Slide05Momento() {
  const factores = [
    {
      icon: '📈',
      title: 'Crisis & Inflación',
      stat: '200%+',
      statLabel: 'Inflación anul',
      desc: 'El auto parado es un pasivo costoso. Alquilarlo genera USD $200-400/mes.'
    },
    {
      icon: '🚫',
      title: 'Exclusión Financiera',
      stat: '70%',
      statLabel: 'Sin tarjeta crédito',
      desc: 'Rentadoras tradicionales rechazan al 70%. Mercado cautivo masivo.'
    },
    {
      icon: '🤖',
      title: 'Madurez Digital',
      stat: '<$0.01',
      statLabel: 'Costo validación',
      desc: 'IA, Biometría y Smart Contracts permiten operar sin sucursales físicas.'
    }
  ];

  const timeline = [
    { year: '2024', label: 'Supply Surge', sub: 'Crisis = Owners buscan renta' },
    { year: '2025', label: 'Tech Enabled', sub: 'IA reduce costos operativos' },
    { year: '2026', label: 'Mass Adoption', sub: 'Cambio cultural Ownership → Access' }
  ];

  return (
    <SlideLayout>
      <SlideHeader
        title="¿Por Qué Ahora?"
        subtitle="3 factores macro convergen en una tormenta perfecta de oportunidad."
      />

      {/* Cards Section */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gap: '24px',
        marginTop: '32px'
      }}>
        {factores.map((f, i) => (
          <div key={i} style={{
            background: 'var(--bg-card)',
            border: i === 0 ? '2px solid var(--accent-green)' : '1px solid var(--border-subtle)',
            borderRadius: '16px',
            padding: '24px',
            display: 'flex',
            flexDirection: 'column',
            position: 'relative'
          }}>
            <div style={{ fontSize: '40px', marginBottom: '16px' }}>{f.icon}</div>
            <h3 style={{ fontSize: '20px', fontWeight: '700', marginBottom: '12px', color: 'var(--text-primary)' }}>
              {f.title}
            </h3>
            <div style={{
              background: 'rgba(0, 208, 132, 0.1)',
              borderRadius: '8px',
              padding: '12px',
              marginBottom: '16px',
              textAlign: 'center'
            }}>
              <p style={{ fontSize: '32px', fontWeight: '800', color: 'var(--accent-green)', marginBottom: '4px' }}>
                {f.stat}
              </p>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{f.statLabel}</p>
            </div>
            <p style={{ fontSize: '15px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
              {f.desc}
            </p>
          </div>
        ))}
      </div>

      {/* Timeline Section */}
      <div style={{ marginTop: '40px', position: 'relative', padding: '0 40px' }}>
        <p style={{
          fontSize: '18px',
          color: 'var(--text-primary)',
          marginBottom: '24px',
          fontWeight: '600',
          textAlign: 'center'
        }}>
          Cronología de la Oportunidad
        </p>

        {/* Timeline Line */}
        <div style={{
          position: 'absolute',
          top: '86px',
          left: '60px',
          right: '60px',
          height: '2px',
          background: 'linear-gradient(90deg, rgba(255,255,255,0.1), var(--accent-green), rgba(255,255,255,0.1))',
          zIndex: 0
        }} />

        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr 1fr',
          gap: '20px',
          position: 'relative',
          zIndex: 1
        }}>
          {timeline.map((t, i) => (
            <div key={i} style={{ textAlign: 'center' }}>
              <div style={{
                width: '16px',
                height: '16px',
                background: 'var(--accent-green)',
                borderRadius: '50%',
                margin: '0 auto 16px', // Align with line
                boxShadow: '0 0 10px var(--accent-green)'
              }} />
              <div style={{ fontSize: '24px', fontWeight: '800', color: 'var(--text-primary)', marginBottom: '8px' }}>
                {t.year}
              </div>
              <div style={{ fontSize: '18px', fontWeight: '700', color: 'var(--accent-green)', marginBottom: '4px' }}>
                {t.label}
              </div>
              <div style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>
                {t.sub}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom CTA */}
      <div style={{ marginTop: '32px', textAlign: 'center' }}>
        <p style={{ fontSize: '22px', color: 'var(--accent-green)', fontWeight: '600' }}>
          🎯 La ventana de oportunidad está abierta. El que ejecute primero, gana.
        </p>
      </div>
    </SlideLayout>
  );
}
