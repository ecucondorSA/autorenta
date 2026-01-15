import React from 'react';
import { SlideLayout, SlideHeader } from '../components/SlideLayout';

export function Slide17Crecimiento() {
  return (
    <SlideLayout>
      <SlideHeader
        title="Estrategia de Crecimiento (Hipotesis)"
        subtitle="Experimento de adquisicion de bajo costo (Frontera)."
      />

      <div className="flex-col gap-48" style={{ marginTop: '64px' }}>
        <div className="flex-col gap-12">
          <h3 style={{ fontSize: '32px', fontWeight: '600' }}>
            Hipotesis
          </h3>
          <p style={{ fontSize: '22px', color: 'var(--text-secondary)' }}>
            Captar trafico de 'paso fronterizo' via WiFi gratis convierte
            a usuarios calificados (con auto y documentos) a bajo costo.
          </p>
        </div>

        <div className="flex-col gap-12">
          <h3 style={{ fontSize: '32px', fontWeight: '600' }}>
            Experimento
          </h3>
          <p style={{ fontSize: '22px', color: 'var(--text-secondary)' }}>
            Instalacion de nodos WiFi en pasos clave (AR-BR, AR-UY).
          </p>
          <p style={{ fontSize: '22px', color: 'var(--text-secondary)' }}>
            Registro obligatorio para acceso a internet.
          </p>
        </div>

        <div className="flex-col gap-12">
          <h3 style={{ fontSize: '32px', fontWeight: '600' }}>
            Metricas Esperadas (30 dias)
          </h3>
          <ul className="list">
            <li>Costo por Lead (CPL): {'<'} USD 0.50</li>
            <li>Conversion a Registro: 15%</li>
            <li>Usuarios Verificados: 1,500+</li>
          </ul>
        </div>
      </div>
    </SlideLayout>
  );
}
