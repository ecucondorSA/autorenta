import React from 'react';
import { SlideLayout, SlideHeader } from '../components/SlideLayout';

export function Slide12Tecnologia() {
  const pilares = [
    {
      title: 'Seguridad & Arquitectura',
      items: [
        'Microservicios Edge (Supabase) + RLS.',
        'Diseñado para alta concurrencia y seguridad de datos.'
      ]
    },
    {
      title: 'Estabilidad Transaccional',
      items: [
        'Libro Contable con bloqueos optimistas.',
        'Medimos estabilidad y p95 en entornos de entorno de pruebas y piloto.'
      ]
    },
    {
      title: 'Omnicanalidad Real',
      items: [
        'Codigo unificado para Web y Android.',
        'Despliegue continuo sin tiempos de inactividad.'
      ]
    }
  ];

  return (
    <SlideLayout>
      <SlideHeader
        title="Tecnologia: Validada y Escalable"
        subtitle="Riesgo tecnico mitigado con arquitectura moderna."
      />

      <div className="flex-col gap-48" style={{ marginTop: '64px' }}>
        {pilares.map((p, i) => (
          <div key={i} className="flex-col gap-12">
            <h3 style={{ fontSize: '32px', fontWeight: '600' }}>
              {p.title}
            </h3>
            {p.items.map((item, j) => (
              <p key={j} style={{ fontSize: '22px', color: 'var(--text-secondary)' }}>
                {item}
              </p>
            ))}
          </div>
        ))}
      </div>
    </SlideLayout>
  );
}
