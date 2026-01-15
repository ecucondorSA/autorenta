import React from 'react';
import { SlideLayout, SlideHeader, Card } from '../components/SlideLayout';

export function Slide14EstrategiaMercado() {
  const canales = [
    '5,000+ Contactos Directos (Waitlist)',
    'Alianzas con flotas locales',
    'Canal EcuCondor (Audiencia validada)'
  ];

  const ejecucion = [
    'Foco Geografico: CABA/GBA',
    "Estrategia: 'Land & Expand' via comunidades",
    'Costo Adquisicion Objetivo: < USD 15'
  ];

  return (
    <SlideLayout>
      <SlideHeader
        title="Estrategia de Mercado"
        subtitle="Foco inicial: Argentina + Comunidades Digitales."
      />

      <div className="grid-2" style={{ marginTop: '64px' }}>
        <Card>
          <div className="section-header">CANALES ACTIVOS (HOY)</div>
          <ul className="list">
            {canales.map((c, i) => <li key={i}>{c}</li>)}
          </ul>
        </Card>

        <Card>
          <div className="section-header">EJECUCION INICIAL (Q1-Q2)</div>
          <ul className="list">
            {ejecucion.map((e, i) => <li key={i}>{e}</li>)}
          </ul>
        </Card>
      </div>
    </SlideLayout>
  );
}
