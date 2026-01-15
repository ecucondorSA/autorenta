import React from 'react';
import { SlideLayout, SlideHeader, Card } from '../components/SlideLayout';

export function Slide22Competencia() {
  const alternativas = [
    'Agencias Tradicionales: Burocracia y Costo Alto.',
    'Informalidad (FB/WhatsApp): Alto riesgo de estafa/daños.',
    'Apps Genericas: Sin motor de riesgo especifico.',
    'Friccion Alta: Depositos manuales o efectivo.'
  ];

  const diferencia = [
    'Sistema de Confianza: KYC Biometrico + Scoring de comportamiento.',
    'Nucleo Fintech: Libro Contable + Billetera Virtual + Pre-autorización (T+2).',
    'Eficiencia: Precios 30% menores que agencias.',
    'Seguridad: Cobertura y contratos digitales.'
  ];

  return (
    <SlideLayout>
      <SlideHeader
        title="Ventaja Competitiva"
        subtitle="Posicionamiento: Alta Confianza (Sistema de Confianza) + Costo Eficiente."
      />

      <div className="grid-2" style={{ marginTop: '64px' }}>
        <Card>
          <div className="section-header">ALTERNATIVAS ACTUALES</div>
          <ul className="list">
            {alternativas.map((a, i) => <li key={i}>{a}</li>)}
          </ul>
        </Card>

        <Card accent>
          <div className="section-header">LA DIFERENCIA AUTORENTA</div>
          <ul className="list">
            {diferencia.map((d, i) => <li key={i}>{d}</li>)}
          </ul>
        </Card>
      </div>
    </SlideLayout>
  );
}
