import React from 'react';
import { SlideLayout, SlideHeader } from '../components/SlideLayout';
import { useTranslations } from '../LanguageContext';

export function Slide22Competencia() {
  const { t } = useTranslations();
  
  const competitors = [
    {
      name: t('slide22.competitors.traditional.name'),
      icon: (
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
          <rect x="3" y="8" width="18" height="13" stroke="#B0B0B0" strokeWidth="2"/>
          <path d="M7 8V5C7 3.89543 7.89543 3 9 3H15C16.1046 3 17 3.89543 17 5V8" stroke="#B0B0B0" strokeWidth="2"/>
          <line x1="3" y1="12" x2="21" y2="12" stroke="#B0B0B0" strokeWidth="2"/>
        </svg>
      ),
      cons: [
        t('slide22.competitors.traditional.con1'),
        t('slide22.competitors.traditional.con2'),
        t('slide22.competitors.traditional.con3')
      ],
      score: 20
    },
    {
      name: t('slide22.competitors.social.name'),
      icon: (
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
          <rect x="6" y="2" width="12" height="20" rx="2" stroke="#B0B0B0" strokeWidth="2"/>
          <line x1="10" y1="18" x2="14" y2="18" stroke="#B0B0B0" strokeWidth="2" strokeLinecap="round"/>
        </svg>
      ),
      cons: [
        t('slide22.competitors.social.con1'),
        t('slide22.competitors.social.con2'),
        t('slide22.competitors.social.con3')
      ],
      score: 30
    },
    {
      name: t('slide22.competitors.generic.name'),
      icon: (
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
          <rect x="5" y="3" width="14" height="18" rx="2" stroke="#B0B0B0" strokeWidth="2"/>
          <rect x="8" y="7" width="3" height="3" fill="#B0B0B0"/>
          <rect x="13" y="7" width="3" height="3" fill="#B0B0B0"/>
          <rect x="8" y="12" width="3" height="3" fill="#B0B0B0"/>
          <rect x="13" y="12" width="3" height="3" fill="#B0B0B0"/>
        </svg>
      ),
      cons: [
        t('slide22.competitors.generic.con1'),
        t('slide22.competitors.generic.con2'),
        t('slide22.competitors.generic.con3')
      ],
      score: 45
    }
  ];

  const ventajas = [
    {
      icon: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
          <rect x="5" y="11" width="14" height="10" rx="2" stroke="#00D084" strokeWidth="2"/>
          <path d="M8 11V7C8 4.79086 9.79086 3 12 3C14.2091 3 16 4.79086 16 7V11" stroke="#00D084" strokeWidth="2"/>
          <circle cx="12" cy="16" r="1.5" fill="#00D084"/>
        </svg>
      ),
      label: t('slide22.advantages.kyc.label'),
      desc: t('slide22.advantages.kyc.desc')
    },
    {
      icon: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="12" r="10" stroke="#00D084" strokeWidth="2"/>
          <path d="M12 6V18M8 10H16M8 14H16" stroke="#00D084" strokeWidth="2" strokeLinecap="round"/>
        </svg>
      ),
      label: t('slide22.advantages.wallet.label'),
      desc: t('slide22.advantages.wallet.desc')
    },
    {
      icon: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
          <rect x="3" y="5" width="18" height="14" rx="2" stroke="#00D084" strokeWidth="2"/>
          <circle cx="12" cy="12" r="3" stroke="#00D084" strokeWidth="2"/>
        </svg>
      ),
      label: t('slide22.advantages.video.label'),
      desc: t('slide22.advantages.video.desc')
    },
    {
      icon: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
          <rect x="4" y="3" width="16" height="18" rx="2" stroke="#00D084" strokeWidth="2"/>
          <path d="M8 8H16M8 12H16M8 16H13" stroke="#00D084" strokeWidth="2" strokeLinecap="round"/>
        </svg>
      ),
      label: t('slide22.advantages.contract.label'),
      desc: t('slide22.advantages.contract.desc')
    },
    {
      icon: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
          <path d="M12 2V6M12 18V22M4.93 4.93L7.76 7.76M16.24 16.24L19.07 19.07M2 12H6M18 12H22M4.93 19.07L7.76 16.24M16.24 7.76L19.07 4.93" stroke="#00D084" strokeWidth="2" strokeLinecap="round"/>
        </svg>
      ),
      label: t('slide22.advantages.pricing.label'),
      desc: t('slide22.advantages.pricing.desc')
    },
    {
      icon: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
          <path d="M13 2L4 14H11L10 22L20 10H13L13 2Z" fill="#E6FF00"/>
        </svg>
      ),
      label: t('slide22.advantages.digital.label'),
      desc: t('slide22.advantages.digital.desc')
    }
  ];

  return (
    <SlideLayout>
      <SlideHeader
        title={t('slide22.title')}
        subtitle={t('slide22.subtitle')}
      />

      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1.3fr',
        gap: '48px',
        marginTop: '40px'
      }}>
        {/* Left - Competitors */}
        <div>
          <p style={{
            fontSize: '14px',
            color: 'var(--danger)',
            marginBottom: '20px',
            textTransform: 'uppercase',
            letterSpacing: '2px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="10" stroke="#FF4444" strokeWidth="2"/>
              <path d="M15 9L9 15M9 9L15 15" stroke="#FF4444" strokeWidth="2" strokeLinecap="round"/>
            </svg>
            {t('slide22.alternatives')}
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {competitors.map((c, i) => (
              <div key={i} style={{
                background: 'var(--bg-card)',
                border: '1px solid var(--border-subtle)',
                borderRadius: '12px',
                padding: '20px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                  {c.icon}
                  <span style={{ fontSize: '18px', fontWeight: '600', color: 'var(--text-primary)' }}>
                    {c.name}
                  </span>
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                  {c.cons.map((con, j) => (
                    <span key={j} style={{
                      fontSize: '12px',
                      padding: '4px 10px',
                      background: 'rgba(255,68,68,0.15)',
                      color: 'var(--danger)',
                      borderRadius: '100px'
                    }}>
                      {con}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right - AutoRenta Advantages */}
        <div>
          <p style={{
            fontSize: '14px',
            color: 'var(--accent-green)',
            marginBottom: '20px',
            textTransform: 'uppercase',
            letterSpacing: '2px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="10" stroke="#00D084" strokeWidth="2"/>
              <path d="M8 12L11 15L16 9" stroke="#00D084" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            {t('slide22.difference')}
          </p>

          <div style={{
            background: 'linear-gradient(180deg, var(--bg-card) 0%, rgba(0,208,132,0.08) 100%)',
            border: '2px solid var(--accent-green)',
            borderRadius: '16px',
            padding: '24px'
          }}>
            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '16px'
            }}>
              {ventajas.map((v, i) => (
                <div key={i} style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '12px',
                  padding: '12px',
                  background: 'var(--bg-secondary)',
                  borderRadius: '8px'
                }}>
                  {v.icon}
                  <div>
                    <p style={{ fontSize: '14px', fontWeight: '600', color: 'var(--accent-green)' }}>
                      {v.label}
                    </p>
                    <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                      {v.desc}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Position Statement */}
          <div style={{
            marginTop: '20px',
            padding: '16px',
            background: 'var(--accent-green)',
            borderRadius: '8px',
            textAlign: 'center'
          }}>
            <p style={{ fontSize: '16px', fontWeight: '600', color: 'var(--bg-primary)' }}>
              {t('slide22.positioning')}
            </p>
          </div>
        </div>
      </div>
    </SlideLayout>
  );
}
