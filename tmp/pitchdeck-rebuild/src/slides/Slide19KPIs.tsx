import React from 'react';
import { SlideLayout, SlideHeader, Card } from '../components/SlideLayout';

export function Slide19Metricas() {
  const columnas = [
    {
      title: 'TRACCION',
      items: [
        '50 Reservas Completadas.',
        'USD 100 Ticket Promedio.',
        '10 Propietarios Iniciales (Aliados).'
      ]
    },
    {
      title: 'RIESGO & SEGURIDAD',
      items: [
        '< 5% Tasa de Incidentes.',
        '100% Cobertura de Seguro.',
        '0 Fraudes de Identidad (Biometria).'
      ]
    },
    {
      title: 'RETENCION',
      items: [
        '> 30% Retencion de Usuarios.',
        'NPS Propietarios > 7.',
        'Feedback Loop Semanal.'
      ]
    }
  ];

  return (
    <SlideLayout>
      <SlideHeader
        title="Metricas Piloto Q1 2026"
        subtitle="Validacion de metricas reales con riesgo acotado."
      />

      <div className="grid-3" style={{ marginTop: '64px' }}>
        {columnas.map((col, i) => (
          <Card key={i}>
            <div className="section-header">{col.title}</div>
            <ul className="list">
              {col.items.map((item, j) => <li key={j}>{item}</li>)}
            </ul>
          </Card>
        ))}
      </div>
    </SlideLayout>
  );
}
