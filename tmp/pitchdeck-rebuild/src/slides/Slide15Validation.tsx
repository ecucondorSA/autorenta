import React from 'react';
import { SlideLayout, SlideHeader, Card, Metric } from '../components/SlideLayout';

export function Slide15Validacion() {
  const metrics = [
    { label: 'Demand Pressure (Waitlist)', value: '300+', desc: 'Usuarios organicos solicitando acceso (Organic Pull).' },
    { label: 'Filter Efficiency (KYC)', value: '45%', desc: "Tasa de usuarios que superan el 'Barrera Biométrica' biometrico.", yellow: true },
    { label: 'Tasa de Rechazo por Riesgo', value: '55%', desc: 'Usuarios bloqueados preventivamente (Fraude evitado).', danger: true },
    { label: 'Latencia de Transaccion', value: '< 150ms', desc: 'Tiempo de respuesta del Libro Contable en pruebas de carga.' }
  ];

  return (
    <SlideLayout>
      <SlideHeader
        title="Validación del Sistema (Datos Alpha)"
        subtitle="Pruebas de estres del 'Sistema de Confianza' en entorno real."
      />

      <div className="flex-col gap-32" style={{ marginTop: '48px' }}>
        {metrics.map((m, i) => (
          <div key={i} className="grid-2" style={{ alignItems: 'center' }}>
            <Card>
              <span style={{ fontSize: '14px', color: 'var(--text-muted)', display: 'block', marginBottom: '8px' }}>
                {m.label}
              </span>
              <span style={{
                fontSize: '56px',
                fontWeight: '700',
                color: m.danger ? 'var(--danger)' : (m.yellow ? 'var(--accent-yellow)' : 'var(--accent-green)')
              }}>
                {m.value}
              </span>
            </Card>
            <p style={{ fontSize: '22px', color: 'var(--text-secondary)' }}>
              {m.desc}
            </p>
          </div>
        ))}
      </div>

      <div style={{ marginTop: '32px' }}>
        <div className="section-header" style={{ color: 'var(--accent-yellow)' }}>
          INFRAESTRUCTURA LISTA (LOIS)
        </div>
        <p style={{ fontSize: '20px', color: 'var(--text-secondary)' }}>
          · Integracion KYC/Biometria: COMPLETADA.
        </p>
      </div>
    </SlideLayout>
  );
}
