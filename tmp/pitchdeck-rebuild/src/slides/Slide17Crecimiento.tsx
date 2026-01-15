import React from 'react';
import { SlideLayout, SlideHeader } from '../components/SlideLayout';
import { useTranslations } from '../LanguageContext';

export function Slide17Crecimiento() {
  const { t } = useTranslations();
  
  return (
    <SlideLayout>
      <SlideHeader
        title={t('slide17.title')}
        subtitle={t('slide17.subtitle')}
      />

      <div className="flex-col gap-48" style={{ marginTop: '64px' }}>
        <div className="flex-col gap-12">
          <h3 style={{ fontSize: '32px', fontWeight: '600' }}>
            {t('slide17.hypothesis.title')}
          </h3>
          <p style={{ fontSize: '22px', color: 'var(--text-secondary)' }}>
            {t('slide17.hypothesis.desc')}
          </p>
        </div>

        <div className="flex-col gap-12">
          <h3 style={{ fontSize: '32px', fontWeight: '600' }}>
            {t('slide17.experiment.title')}
          </h3>
          <p style={{ fontSize: '22px', color: 'var(--text-secondary)' }}>
            {t('slide17.experiment.desc1')}
          </p>
          <p style={{ fontSize: '22px', color: 'var(--text-secondary)' }}>
            {t('slide17.experiment.desc2')}
          </p>
        </div>

        <div className="flex-col gap-12">
          <h3 style={{ fontSize: '32px', fontWeight: '600' }}>
            {t('slide17.metrics.title')}
          </h3>
          <ul className="list">
            <li>{t('slide17.metrics.cpl')}</li>
            <li>{t('slide17.metrics.conversion')}</li>
            <li>{t('slide17.metrics.users')}</li>
          </ul>
        </div>
      </div>
    </SlideLayout>
  );
}
