import React from 'react';
import { SlideLayout, SlideHeader } from '../components/SlideLayout';
import { useTranslations } from '../LanguageContext';

export function Slide08ModosDeRiesgo() {
  const { t } = useTranslations();
  
  const comparisons = [
    {
      fallo: { title: t('slide08.fallo1Title'), desc: t('slide08.fallo1Desc') },
      solution: { title: t('slide08.solucion1Title'), desc: t('slide08.solucion1Desc') }
    },
    {
      fallo: { title: t('slide08.fallo2Title'), desc: t('slide08.fallo2Desc') },
      solution: { title: t('slide08.solucion2Title'), desc: t('slide08.solucion2Desc') }
    },
    {
      fallo: { title: t('slide08.fallo3Title'), desc: t('slide08.fallo3Desc') },
      solution: { title: t('slide08.solucion3Title'), desc: t('slide08.solucion3Desc') }
    }
  ];

  return (
    <SlideLayout>
      <SlideHeader
        title={t('slide08.title')}
        subtitle={t('slide08.subtitle')}
      />

      <div className="grid-2" style={{ marginTop: '32px' }}>
        {/* Left column - Fallos */}
        <div className="flex-col gap-16">
          <div className="section-header" style={{ color: 'var(--danger)' }}>
            {t('slide08.modosFalloTitle')}
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
          <div className="section-header">{t('slide08.requisitosTitle')}</div>
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
