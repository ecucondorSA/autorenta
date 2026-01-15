import React from 'react';
import { SlideLayout, SlideHeader } from '../components/SlideLayout';
import { useTranslations } from '../LanguageContext';

export function Slide20PlanMaestro() {
  const { t } = useTranslations();
  
  const fases = [
    {
      title: t('slide20.phase1.title'),
      desc: t('slide20.phase1.desc'),
      status: t('slide20.phase1.status'),
      active: false,
      completed: true
    },
    {
      title: t('slide20.phase2.title'),
      desc: t('slide20.phase2.desc'),
      status: t('slide20.phase2.status'),
      active: false,
      completed: true
    },
    {
      title: t('slide20.phase3.title'),
      desc: t('slide20.phase3.desc'),
      status: t('slide20.phase3.status'),
      active: true,
      completed: false
    }
  ];

  return (
    <SlideLayout>
      <SlideHeader
        title={t('slide20.title')}
        subtitle={t('slide20.subtitle')}
      />

      <div className="flex-col gap-48" style={{ marginTop: '64px' }}>
        {fases.map((f, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '24px' }}>
            <div style={{
              width: '24px',
              height: '24px',
              borderRadius: '50%',
              background: f.completed ? 'var(--accent-green)' : (f.active ? 'var(--accent-yellow)' : 'var(--bg-secondary)'),
              border: `3px solid ${f.completed ? 'var(--accent-green)' : (f.active ? 'var(--accent-yellow)' : 'var(--border-subtle)')}`,
              flexShrink: 0,
              marginTop: '6px'
            }} />
            <div className="flex-col gap-8">
              <h3 style={{
                fontSize: '28px',
                fontWeight: '600',
                color: f.active ? 'var(--accent-yellow)' : (f.completed ? 'var(--accent-green)' : 'var(--text-primary)')
              }}>
                {f.title}
              </h3>
              <p style={{ fontSize: '20px', color: 'var(--text-secondary)' }}>
                {f.desc}
              </p>
              <p style={{ fontSize: '18px', color: 'var(--text-muted)' }}>
                {f.status}
              </p>
            </div>
          </div>
        ))}

        <div style={{ marginTop: '24px', paddingLeft: '48px' }}>
          <p style={{ fontSize: '20px', color: 'var(--text-secondary)' }}>
            {t('slide20.phase4.title')}
          </p>
          <p style={{ fontSize: '18px', color: 'var(--text-muted)' }}>
            {t('slide20.phase4.status')}
          </p>
        </div>
      </div>
    </SlideLayout>
  );
}
