import React from 'react';
import { SlideLayout, SlideHeader } from '../components/SlideLayout';

export function Slide20PlanMaestro() {
  const fases = [
    {
      title: 'FASE 1: R&D + CORE INFRA',
      desc: 'Construir Sistema de Confianza, Billetera Virtual y Contratos.',
      status: 'STATUS: COMPLETADO (Bootstrap).',
      active: false,
      completed: true
    },
    {
      title: 'FASE 2: ALPHA TEST (VALIDACION)',
      desc: 'Probar el sistema con 50 viajes manuales y Waitlist.',
      status: 'STATUS: COMPLETADO (Data obtenida).',
      active: false,
      completed: true
    },
    {
      title: 'FASE 3: LIQUIDITY INJECTION (ESTA RONDA)',
      desc: 'Capitalizar el FGO y subsidiar oferta para lograr densidad.',
      status: 'OBJETIVO: 18 Meses de Autonomia -> Ronda A.',
      active: true,
      completed: false
    }
  ];

  return (
    <SlideLayout>
      <SlideHeader
        title="El Plan Maestro (Execution)"
        subtitle="Estrategia secuencial de despliegue de capital."
      />

      <div className="flex-col gap-48" style={{ marginTop: '64px' }}>
        {fases.map((f, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '24px' }}>
            <div style={{
              width: '24px',
              height: '24px',
              borderRadius: '50%',
              background: f.completed ? 'var(--accent-green)' : (f.active ? 'var(--accent-yellow)' : 'var(--bg-secondary)'),
              border: `3px solid ${f.completed ? 'var(--accent-green)' : (f.active ? 'var(--accent-yellow)' : 'var(--border-subtle)')}`,
              flexShrink: 0,
              marginTop: '6px'
            }} />
            <div className="flex-col gap-8">
              <h3 style={{
                fontSize: '28px',
                fontWeight: '600',
                color: f.active ? 'var(--accent-yellow)' : (f.completed ? 'var(--accent-green)' : 'var(--text-primary)')
              }}>
                {f.title}
              </h3>
              <p style={{ fontSize: '20px', color: 'var(--text-secondary)' }}>
                {f.desc}
              </p>
              <p style={{ fontSize: '18px', color: 'var(--text-muted)' }}>
                {f.status}
              </p>
            </div>
          </div>
        ))}

        <div style={{ marginTop: '24px', paddingLeft: '48px' }}>
          <p style={{ fontSize: '20px', color: 'var(--text-secondary)' }}>
            Expansion regional y gestion de flotas autonomas.
          </p>
          <p style={{ fontSize: '18px', color: 'var(--text-muted)' }}>
            VISION: 2027+.
          </p>
        </div>
      </div>
    </SlideLayout>
  );
}
