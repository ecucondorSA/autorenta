import React from 'react';
import { SlideLayout, SlideHeader } from '../components/SlideLayout';
import { useTranslations } from '../LanguageContext';

export function Slide05Momento() {
  const { t, lang } = useTranslations();
  
  const factores = [
    {
      icon: (
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none">
          <path d="M3 17L9 11L13 15L21 7" stroke="#00D084" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M17 7H21V11" stroke="#00D084" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      ),
      title: t('slide05.factor1Title'),
      stat: t('slide05.factor1Stat'),
      statLabel: t('slide05.factor1StatLabel'),
      desc: t('slide05.factor1Desc')
    },
    {
      icon: (
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="12" r="10" stroke="#FF4444" strokeWidth="2"/>
          <path d="M15 9L9 15M9 9L15 15" stroke="#FF4444" strokeWidth="2" strokeLinecap="round"/>
        </svg>
      ),
      title: t('slide05.factor2Title'),
      stat: t('slide05.factor2Stat'),
      statLabel: t('slide05.factor2StatLabel'),
      desc: t('slide05.factor2Desc')
    },
    {
      icon: (
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none">
          <rect x="4" y="4" width="16" height="16" rx="2" stroke="#00D084" strokeWidth="2"/>
          <circle cx="9" cy="10" r="1.5" fill="#00D084"/>
          <circle cx="15" cy="10" r="1.5" fill="#00D084"/>
          <path d="M9 15H15" stroke="#00D084" strokeWidth="2" strokeLinecap="round"/>
        </svg>
      ),
      title: t('slide05.factor3Title'),
      stat: t('slide05.factor3Stat'),
      statLabel: t('slide05.factor3StatLabel'),
      desc: t('slide05.factor3Desc')
    }
  ];

  const timeline = [
    { year: '2024', label: t('slide05.timeline2024Label'), sub: t('slide05.timeline2024Sub') },
    { year: '2025', label: t('slide05.timeline2025Label'), sub: t('slide05.timeline2025Sub') },
    { year: '2026', label: t('slide05.timeline2026Label'), sub: t('slide05.timeline2026Sub') }
  ];

  return (
    <SlideLayout>
      <SlideHeader
        title={t('slide05.title')}
        subtitle={t('slide05.subtitle')}
      />

      {/* Cards Section */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gap: '24px',
        marginTop: '32px'
      }}>
        {factores.map((f, i) => (
          <div key={i} style={{
            background: 'var(--bg-card)',
            border: i === 0 ? '2px solid var(--accent-green)' : '1px solid var(--border-subtle)',
            borderRadius: '16px',
            padding: '24px',
            display: 'flex',
            flexDirection: 'column',
            position: 'relative'
          }}>
            <div style={{ marginBottom: '16px' }}>{f.icon}</div>
            <h3 style={{ fontSize: '20px', fontWeight: '700', marginBottom: '12px', color: 'var(--text-primary)' }}>
              {f.title}
            </h3>
            <div style={{
              background: 'rgba(0, 208, 132, 0.1)',
              borderRadius: '8px',
              padding: '12px',
              marginBottom: '16px',
              textAlign: 'center'
            }}>
              <p style={{ fontSize: '32px', fontWeight: '800', color: 'var(--accent-green)', marginBottom: '4px' }}>
                {f.stat}
              </p>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{f.statLabel}</p>
            </div>
            <p style={{ fontSize: '15px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
              {f.desc}
            </p>
          </div>
        ))}
      </div>

      {/* Timeline Section */}
      <div style={{ marginTop: '40px', position: 'relative', padding: '0 40px' }}>
        <p style={{
          fontSize: '18px',
          color: 'var(--text-primary)',
          marginBottom: '24px',
          fontWeight: '600',
          textAlign: 'center'
        }}>
          {t('slide05.cronologia')}
        </p>

        {/* Timeline Line */}
        <div style={{
          position: 'absolute',
          top: '86px',
          left: '60px',
          right: '60px',
          height: '2px',
          background: 'linear-gradient(90deg, rgba(255,255,255,0.1), var(--accent-green), rgba(255,255,255,0.1))',
          zIndex: 0
        }} />

        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr 1fr',
          gap: '20px',
          position: 'relative',
          zIndex: 1
        }}>
          {timeline.map((t, i) => (
            <div key={i} style={{ textAlign: 'center' }}>
              <div style={{
                width: '16px',
                height: '16px',
                background: 'var(--accent-green)',
                borderRadius: '50%',
                margin: '0 auto 16px', // Align with line
                boxShadow: '0 0 10px var(--accent-green)'
              }} />
              <div style={{ fontSize: '24px', fontWeight: '800', color: 'var(--text-primary)', marginBottom: '8px' }}>
                {t.year}
              </div>
              <div style={{ fontSize: '18px', fontWeight: '700', color: 'var(--accent-green)', marginBottom: '4px' }}>
                {t.label}
              </div>
              <div style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>
                {t.sub}
              </div>
            </div>
          ))}
        </div>
      </div>

    </SlideLayout>
  );
}
