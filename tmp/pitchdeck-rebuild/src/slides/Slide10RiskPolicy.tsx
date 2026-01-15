import React from 'react';
import { SlideLayout, SlideHeader } from '../components/SlideLayout';

export function Slide10ProteccionRiesgo() {
  const policies = [
    {
      num: 1,
      title: 'FGO (Fondo Garantia Operativa)',
      items: [
        'Cubre: Daños menores (< USD 500), franquicias de seguro y lucro cesante.',
        'Financiado por: 10% de cada reserva + Aportes de Propietarios (Pool).'
      ]
    },
    {
      num: 2,
      title: 'Robo Total & Destruccion',
      items: [
        'Cubre: Poliza de Seguro Madre (Partner) o Poliza del Propietario (endosada).',
        'El FGO cubre el deducible para que el propietario no pague nada.'
      ]
    },
    {
      num: 3,
      title: 'Evidencia Vinculante (Video Registro de Entrada)',
      items: [
        'Regla: Sin video de registro de salida validado, el arrendatario asume responsabilidad total.',
        'La evidencia en Blockchain/Server actua como arbitro final.'
      ]
    }
  ];

  return (
    <SlideLayout>
      <SlideHeader
        title="Política de Riesgo y Cobertura (Sistema de Confianza)"
        subtitle="Reglas claras: que cubre el FGO y como gestionamos excepciones."
      />

      <div className="flex-col gap-48" style={{ marginTop: '48px' }}>
        {policies.map((p) => (
          <div key={p.num} className="flex-col gap-12">
            <h3 style={{ fontSize: '32px', fontWeight: '600', color: 'var(--accent-green)' }}>
              {p.num}. {p.title}
            </h3>
            {p.items.map((item, i) => (
              <p key={i} style={{ fontSize: '22px', color: 'var(--text-secondary)', paddingLeft: '24px' }}>
                {item}
              </p>
            ))}
          </div>
        ))}
      </div>

      <div style={{
        position: 'absolute',
        bottom: '80px',
        left: '80px',
        right: '80px',
        borderTop: '2px solid var(--accent-green)',
        paddingTop: '24px'
      }}>
        <p style={{ fontSize: '18px', color: 'var(--accent-green)' }}>
          INCIDENTE → EVIDENCIA AI → FGO PAGA (INSTANTANEO) → RECOBRO AL ARRENDATARIO (DIFERIDO)
        </p>
      </div>
    </SlideLayout>
  );
}
