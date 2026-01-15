import React from 'react';
import { SlideLayout, SlideHeader } from '../components/SlideLayout';
import { useTranslations } from '../LanguageContext';

export function Slide10ProteccionRiesgo() {
  const { t } = useTranslations();
  
  const policies = [
    {
      num: 1,
      title: t('slide10.fgoTitle'),
      items: [
        t('slide10.fgoItem1'),
        t('slide10.fgoItem2')
      ]
    },
    {
      num: 2,
      title: t('slide10.roboTitle'),
      items: [
        t('slide10.roboItem1'),
        t('slide10.roboItem2')
      ]
    },
    {
      num: 3,
      title: t('slide10.evidenciaTitle'),
      items: [
        t('slide10.evidenciaItem1'),
        t('slide10.evidenciaItem2')
      ]
    }
  ];

  return (
    <SlideLayout>
      <SlideHeader
        title={t('slide10.title')}
        subtitle={t('slide10.subtitle')}
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
          INCIDENTE → EVIDENCIA AI → FGO PAGA (INSTANTÁNEO) → RECOBRO AL ARRENDATARIO (DIFERIDO)
        </p>
      </div>
    </SlideLayout>
  );
}
