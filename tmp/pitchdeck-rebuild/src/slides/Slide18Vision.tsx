import React from 'react';
import { useTranslations } from '../LanguageContext';

export function Slide18Vision() {
  const { t } = useTranslations();
  return (
    <div className="slide slide--centered" style={{
      backgroundImage: `linear-gradient(to bottom, rgba(13,13,13,0.7), rgba(13,13,13,0.85)), url(/assets/vision-background.png)`,
      backgroundSize: 'cover',
      backgroundPosition: 'center',
      position: 'relative',
      padding: '80px'
    }}>
      {/* Subtle glow */}
      <div style={{
        position: 'absolute',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        width: '1000px',
        height: '500px',
        background: 'radial-gradient(ellipse, rgba(0,208,132,0.15) 0%, transparent 70%)',
        pointerEvents: 'none'
      }} />

      {/* Main Vision Statement */}
      <div style={{ textAlign: 'center', position: 'relative', zIndex: 1 }}>
        <p style={{
          fontSize: '20px',
          color: 'var(--accent-green)',
          fontWeight: '600',
          marginBottom: '24px',
          textTransform: 'uppercase',
          letterSpacing: '4px'
        }}>
          {t('slide18.visionLabel')}
        </p>

        <h1 style={{
          fontSize: '72px',
          fontWeight: '700',
          lineHeight: 1.1,
          marginBottom: '32px',
          maxWidth: '1100px'
        }}>
          {t('slide18.title')}<br />
          <span style={{ color: 'var(--accent-green)' }}>{t('slide18.subtitle')}</span>
        </h1>

        <p style={{
          fontSize: '28px',
          color: 'var(--text-secondary)',
          maxWidth: '800px',
          margin: '0 auto 48px',
          lineHeight: 1.5
        }}>
          {t('slide18.description')}
        </p>

        {/* Key Stats */}
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          gap: '64px',
          marginTop: '48px'
        }}>
          <div style={{ textAlign: 'center' }}>
            <p style={{ fontSize: '56px', fontWeight: '700', color: 'var(--accent-green)' }}>8.4M</p>
            <p style={{ fontSize: '16px', color: 'var(--text-muted)' }}>{t('slide18.stat1.label')}</p>
          </div>
          <div style={{ textAlign: 'center' }}>
            <p style={{ fontSize: '56px', fontWeight: '700', color: 'var(--accent-green)' }}>$84B</p>
            <p style={{ fontSize: '16px', color: 'var(--text-muted)' }}>{t('slide18.stat2.label')}</p>
          </div>
          <div style={{ textAlign: 'center' }}>
            <p style={{ fontSize: '56px', fontWeight: '700', color: 'var(--accent-green)' }}>70%</p>
            <p style={{ fontSize: '16px', color: 'var(--text-muted)' }}>{t('slide18.stat3.label')}</p>
          </div>
        </div>
      </div>

      <div className="diamond" />
    </div>
  );
}
