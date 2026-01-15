import React from 'react';
import { SlideLayout, SlideHeader } from '../components/SlideLayout';

export function Slide08ModosDeRiesgo() {
  const comparisons = [
    {
      fallo: { title: '1. Access Restriccion (Acceso)', desc: 'Dependencia de tarjetas de credito con cupo alto. Limito el TAM real a solo la poblacion bancarizada.' },
      solution: { title: '1. Inclusion Financiera', desc: 'Billetera Virtual propia + FGO (Fondo de Garantia Operativa). Desbloquea demanda masiva sin riesgo crediticio.' }
    },
    {
      fallo: { title: '2. Autonomia Restriccion (Caja)', desc: 'Modelo de alto tasa de quema esperando liquidez organica. Cierres por falta de capital antes de lograr densidad.' },
      solution: { title: '2. Rentabilidad Unitaria', desc: 'Modelo diseñado para MC positivo desde reserva #1. Crecimiento organico eficiente y escalable.' }
    },
    {
      fallo: { title: '3. Ops Restriccion (Operacion)', desc: 'Verificacion manual y disputas subjetivas. Unit Economia negativos por costo de soporte humano.' },
      solution: { title: '3. Sistema de Confianza Automatizado', desc: 'Biometria + Evidencia Video + IA. Soporte y riesgo automatizado (Costo marginal ~0).' }
    }
  ];

  return (
    <SlideLayout>
      <SlideHeader
        title="Modos de Fallo del Mercado · Requisitos de Diseño"
        subtitle="Aprendizaje de los pioneros en LatAm para asegurar escala."
      />

      <div className="grid-2" style={{ marginTop: '32px' }}>
        {/* Left column - Fallos */}
        <div className="flex-col gap-16">
          <div className="section-header" style={{ color: 'var(--danger)' }}>
            MODOS DE FALLO (CASO BRASIL)
          </div>
          {comparisons.map((c, i) => (
            <div key={i} className="flex-col gap-8" style={{ marginBottom: '24px' }}>
              <h4 style={{ fontSize: '24px', fontWeight: '600' }}>{c.fallo.title}</h4>
              <p style={{ fontSize: '18px', color: 'var(--text-secondary)' }}>{c.fallo.desc}</p>
            </div>
          ))}
        </div>

        {/* Right column - Solutions */}
        <div className="flex-col gap-16">
          <div className="section-header">REQUISITOS DE DISEÑO AUTORENTA</div>
          {comparisons.map((c, i) => (
            <div key={i} className="flex-col gap-8" style={{ marginBottom: '24px' }}>
              <h4 style={{ fontSize: '24px', fontWeight: '600' }}>{c.solution.title}</h4>
              <p style={{ fontSize: '18px', color: 'var(--text-secondary)' }}>{c.solution.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </SlideLayout>
  );
}
