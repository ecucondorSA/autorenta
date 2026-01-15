import React from 'react';
import { SlideLayout, SlideHeader } from '../components/SlideLayout';

export function Slide05Momento() {
  const factores = [
    {
      title: 'Inflacion & Estacionalidad',
      desc: 'La volatilidad de precios hace indispensable el Pricing Dinamico para proteger el valor del activo.'
    },
    {
      title: 'Exclusion Financiera',
      desc: 'El mercado exige soluciones de movilidad que no dependan de tarjetas de credito bancarias tradicionales.'
    },
    {
      title: 'Riesgo del Activo',
      desc: 'La tecnologia de video y biometria es accesible y barata para mitigar el riesgo de fraude masivamente.'
    }
  ];

  return (
    <SlideLayout>
      <SlideHeader
        title="Por Que Ahora (Momento)"
        subtitle="La convergencia de 3 factores macro en LatAm."
      />

      <div className="flex-col gap-48" style={{ marginTop: '64px' }}>
        {factores.map((f, i) => (
          <div key={i} className="flex-col gap-12">
            <h3 style={{ fontSize: '32px', fontWeight: '600' }}>
              {f.title}
            </h3>
            <p style={{ fontSize: '22px', color: 'var(--text-secondary)' }}>
              {f.desc}
            </p>
          </div>
        ))}
      </div>
    </SlideLayout>
  );
}
