import React from 'react';
import { SlideLayout, SlideHeader } from '../components/SlideLayout';

export function Slide23Crecimiento() {
  const embudo = [
    { label: 'Trafico Potencial (Paso Fronterizo)', value: '3,000 / dia · 90,000 / mes' },
    { label: 'Adopcion WiFi (Opt-in 10%)', value: '9,000 usuarios / mes' },
    { label: 'Conversion a Registro (15%)', value: '1,350 nuevos perfiles' },
    { label: 'Verificados (Barrera Biométrica 45%)', value: '607 usuarios listos para reservar' }
  ];

  return (
    <SlideLayout>
      <SlideHeader
        title="Crecimiento: Adquisicion de Bajo Costo"
        subtitle="Validacion del experimento 'Frontera WiFi'."
      />

      <div className="section-header" style={{ marginTop: '48px' }}>
        EMBUDO MATEMATICO (1 NODO / MES)
      </div>

      <div className="flex-col gap-32" style={{ marginTop: '32px' }}>
        {embudo.map((e, i) => (
          <div key={i} style={{
            display: 'grid',
            gridTemplateColumns: '400px 1fr',
            alignItems: 'center',
            gap: '48px'
          }}>
            <span style={{ fontSize: '22px', color: 'var(--text-secondary)' }}>
              {e.label}
            </span>
            <span style={{ fontSize: '28px', fontWeight: '700', color: 'var(--text-primary)' }}>
              {e.value}
            </span>
          </div>
        ))}
      </div>

      <div style={{ marginTop: '64px' }}>
        <p style={{ fontSize: '20px', color: 'var(--text-secondary)' }}>
          HIPOTESIS: Costo Adquisicion Proyectado {'<'} USD 0.50 por usuario verificado.
        </p>
        <p style={{ fontSize: '18px', color: 'var(--text-muted)', marginTop: '12px' }}>
          Escalable mediante replicacion de nodos en puntos estrategicos de LatAm.
        </p>
      </div>
    </SlideLayout>
  );
}
