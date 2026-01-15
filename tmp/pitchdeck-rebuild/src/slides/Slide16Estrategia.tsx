import React from 'react';
import { SlideLayout, SlideHeader, Card } from '../components/SlideLayout';

export function Slide16Estrategia() {
  const canales = [
    '5,000+ Contactos Directos (Waitlist).',
    '30+ Comunidades Activas (WhatsApp/FB).',
    'Alianzas con flotas locales y universidades.',
    'Canal EcuCondor (Audiencia validada).'
  ];

  const ejecucion = [
    'Foco Geografico: Argentina (CABA/GBA).',
    "Estrategia: 'Land & Expand' via comunidades.",
    'Costo de Adquisicion (Costo Adquisicion): < USD 15.',
    'Validacion de demanda: 100% Organica.'
  ];

  return (
    <SlideLayout>
      <SlideHeader
        title="Estrategia de Mercado"
        subtitle="Foco inicial: Argentina + Comunidades Digitales."
      />

      <div className="grid-2" style={{ marginTop: '64px' }}>
        <Card>
          <div className="section-header">CANALES ACTIVOS</div>
          <ul className="list">
            {canales.map((c, i) => <li key={i}>{c}</li>)}
          </ul>
        </Card>

        <Card>
          <div className="section-header">EJECUCION INICIAL</div>
          <ul className="list">
            {ejecucion.map((e, i) => <li key={i}>{e}</li>)}
          </ul>
        </Card>
      </div>

      <div style={{
        position: 'absolute',
        bottom: '80px',
        left: '80px'
      }}>
        <h3 style={{ fontSize: '48px', fontWeight: '700', color: 'var(--accent-yellow)' }}>
          Argentina
        </h3>
        <p style={{ fontSize: '16px', color: 'var(--text-muted)', letterSpacing: '2px' }}>
          PAIS FOCO INICIAL
        </p>
      </div>
    </SlideLayout>
  );
}
