import React from 'react';
import { SlideLayout, SlideHeader } from '../components/SlideLayout';
import { useTranslations } from '../LanguageContext';

export function Slide23Crecimiento() {
  const { t } = useTranslations();

  const embudo = [
    { label: t('slide23.funnel1'), value: t('slide23.funnel1Value') },
    { label: t('slide23.funnel2'), value: t('slide23.funnel2Value') },
    { label: t('slide23.funnel3'), value: t('slide23.funnel3Value') },
    { label: t('slide23.funnel4'), value: t('slide23.funnel4Value') }
  ];

  return (
    <SlideLayout>
      <SlideHeader
        title={t('slide23.title')}
        subtitle={t('slide23.subtitle')}
      />

      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: '48px',
        marginTop: '32px'
      }}>
        {/* Left - Image */}
        <div style={{
          borderRadius: '16px',
          overflow: 'hidden',
          boxShadow: '0 20px 40px rgba(0,0,0,0.3)'
        }}>
          <img
            src="/assets/border_queue_billboard_promo.jpg"
            alt="Billboard AutoRentar en frontera"
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
        </div>

        {/* Right - Funnel */}
        <div>
          <div className="section-header" style={{ marginBottom: '24px' }}>
            {t('slide23.funnelTitle')}
          </div>

          <div className="flex-col" style={{ gap: '20px' }}>
            {embudo.map((e, i) => (
              <div key={i} style={{
                background: 'var(--bg-card)',
                border: '1px solid var(--border-subtle)',
                borderRadius: '12px',
                padding: '16px 20px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <span style={{ fontSize: '16px', color: 'var(--text-secondary)' }}>
                  {e.label}
                </span>
                <span style={{ fontSize: '18px', fontWeight: '700', color: 'var(--accent-green)' }}>
                  {e.value}
                </span>
              </div>
            ))}
          </div>

          <div style={{
            marginTop: '24px',
            padding: '16px',
            background: 'rgba(0, 208, 132, 0.1)',
            border: '1px solid var(--accent-green)',
            borderRadius: '12px'
          }}>
            <p style={{ fontSize: '16px', color: 'var(--accent-green)', fontWeight: '600' }}>
              {t('slide23.cac')}
            </p>
            <p style={{ fontSize: '14px', color: 'var(--text-muted)', marginTop: '8px' }}>
              {t('slide23.scalable')}
            </p>
          </div>
        </div>
      </div>
    </SlideLayout>
  );
}
