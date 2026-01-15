import React from 'react';
import { SlideLayout, SlideHeader, Card } from '../components/SlideLayout';
import { useTranslations } from '../LanguageContext';

export function Slide16Estrategia() {
  const { t } = useTranslations();
  
  const canales = [
    t('slide16.canales.item1'),
    t('slide16.canales.item2'),
    t('slide16.canales.item3'),
    t('slide16.canales.item4')
  ];

  const ejecucion = [
    t('slide16.ejecucion.item1'),
    t('slide16.ejecucion.item2'),
    t('slide16.ejecucion.item3'),
    t('slide16.ejecucion.item4')
  ];

  return (
    <SlideLayout>
      <SlideHeader
        title={t('slide16.title')}
        subtitle={t('slide16.subtitle')}
      />

      <div className="grid-2" style={{ marginTop: '64px' }}>
        <Card>
          <div className="section-header">{t('slide16.canales.title')}</div>
          <ul className="list">
            {canales.map((c, i) => <li key={i}>{c}</li>)}
          </ul>
        </Card>

        <Card>
          <div className="section-header">{t('slide16.ejecucion.title')}</div>
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
          {t('slide16.focusCountry')}
        </h3>
        <p style={{ fontSize: '16px', color: 'var(--text-muted)', letterSpacing: '2px' }}>
          {t('slide16.focusLabel')}
        </p>
      </div>
    </SlideLayout>
  );
}
