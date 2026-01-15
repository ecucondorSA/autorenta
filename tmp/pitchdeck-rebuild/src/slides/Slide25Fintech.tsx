import React from 'react';
import { SlideLayout, SlideHeader } from '../components/SlideLayout';
import { useTranslations } from '../LanguageContext';

// SVG Icons para el flujo de fondos
const flujoIcons = {
  deposito: (
    <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
      <rect x="2" y="5" width="20" height="14" rx="2" stroke="#00D084" strokeWidth="2"/>
      <line x1="2" y1="10" x2="22" y2="10" stroke="#00D084" strokeWidth="2"/>
      <rect x="4" y="13" width="4" height="2" rx="1" fill="#00D084"/>
    </svg>
  ),
  preauth: (
    <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
      <rect x="5" y="11" width="14" height="10" rx="2" stroke="#00D084" strokeWidth="2"/>
      <path d="M8 11V7C8 4.79086 9.79086 3 12 3C14.2091 3 16 4.79086 16 7V11" stroke="#00D084" strokeWidth="2"/>
      <circle cx="12" cy="16" r="1.5" fill="#00D084"/>
    </svg>
  ),
  reserva: (
    <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
      <path d="M7 17H4C3.44772 17 3 16.5523 3 16V15C3 14.4477 3.44772 14 4 14H7" stroke="#00D084" strokeWidth="2" strokeLinecap="round"/>
      <path d="M17 17H20C20.5523 17 21 16.5523 21 16V15C21 14.4477 20.5523 14 20 14H17" stroke="#00D084" strokeWidth="2" strokeLinecap="round"/>
      <rect x="5" y="7" width="14" height="10" rx="2" stroke="#00D084" strokeWidth="2"/>
      <circle cx="8" cy="14" r="1.5" fill="#00D084"/>
      <circle cx="16" cy="14" r="1.5" fill="#00D084"/>
    </svg>
  ),
  liberacion: (
    <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="10" stroke="#00D084" strokeWidth="2"/>
      <path d="M8 12L11 15L16 9" stroke="#00D084" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
};

export function Slide25Fintech() {
  const { t } = useTranslations();
  
  const flujo = [
    { step: '1', iconKey: 'deposito' as const, title: t('slide25.flow.step1.title'), desc: t('slide25.flow.step1.desc') },
    { step: '2', iconKey: 'preauth' as const, title: t('slide25.flow.step2.title'), desc: t('slide25.flow.step2.desc') },
    { step: '3', iconKey: 'reserva' as const, title: t('slide25.flow.step3.title'), desc: t('slide25.flow.step3.desc') },
    { step: '4', iconKey: 'liberacion' as const, title: t('slide25.flow.step4.title'), desc: t('slide25.flow.step4.desc') }
  ];

  return (
    <SlideLayout>
      <SlideHeader
        title={t('slide25.title')}
        subtitle={t('slide25.subtitle')}
      />

      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: '48px',
        marginTop: '40px'
      }}>
        {/* Left - Flow */}
        <div>
          <p style={{
            fontSize: '14px',
            color: 'var(--text-muted)',
            marginBottom: '24px',
            textTransform: 'uppercase',
            letterSpacing: '2px'
          }}>
            {t('slide25.flow.title')}
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {flujo.map((f, i) => (
              <div key={i} style={{
                display: 'flex',
                alignItems: 'center',
                gap: '20px',
                background: 'var(--bg-card)',
                border: '1px solid var(--border-subtle)',
                borderRadius: '12px',
                padding: '20px',
                position: 'relative'
              }}>
                {/* Step Number */}
                <div style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '50%',
                  background: 'var(--accent-green)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '18px',
                  fontWeight: '700',
                  color: 'var(--bg-primary)'
                }}>
                  {f.step}
                </div>

                {flujoIcons[f.iconKey]}

                <div>
                  <p style={{ fontSize: '18px', fontWeight: '600', color: 'var(--text-primary)' }}>
                    {f.title}
                  </p>
                  <p style={{ fontSize: '14px', color: 'var(--text-muted)' }}>
                    {f.desc}
                  </p>
                </div>

                {/* Connector */}
                {i < flujo.length - 1 && (
                  <div style={{
                    position: 'absolute',
                    bottom: '-16px',
                    left: '39px',
                    width: '2px',
                    height: '16px',
                    background: 'var(--accent-green)'
                  }} />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Right - Features */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <p style={{
            fontSize: '14px',
            color: 'var(--text-muted)',
            marginBottom: '4px',
            textTransform: 'uppercase',
            letterSpacing: '2px'
          }}>
            {t('slide25.capabilities.title')}
          </p>

          {[
            {
              icon: (
                <svg width="36" height="36" viewBox="0 0 24 24" fill="none">
                  <rect x="4" y="3" width="16" height="18" rx="2" stroke="#00D084" strokeWidth="2"/>
                  <path d="M8 8H16M8 12H16M8 16H13" stroke="#00D084" strokeWidth="2" strokeLinecap="round"/>
                </svg>
              ),
              title: t('slide25.capabilities.ledger.title'),
              desc: t('slide25.capabilities.ledger.desc')
            },
            {
              icon: (
                <svg width="36" height="36" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="12" r="10" stroke="#00D084" strokeWidth="2"/>
                  <path d="M12 6V18M8 10H16M8 14H16" stroke="#00D084" strokeWidth="2" strokeLinecap="round"/>
                </svg>
              ),
              title: t('slide25.capabilities.wallet.title'),
              desc: t('slide25.capabilities.wallet.desc')
            },
            {
              icon: (
                <svg width="36" height="36" viewBox="0 0 24 24" fill="none">
                  <rect x="5" y="11" width="14" height="10" rx="2" stroke="#00D084" strokeWidth="2"/>
                  <path d="M8 11V7C8 4.79086 9.79086 3 12 3C14.2091 3 16 4.79086 16 7V11" stroke="#00D084" strokeWidth="2"/>
                  <circle cx="12" cy="16" r="1.5" fill="#00D084"/>
                </svg>
              ),
              title: t('slide25.capabilities.preauth.title'),
              desc: t('slide25.capabilities.preauth.desc')
            },
            {
              icon: (
                <svg width="36" height="36" viewBox="0 0 24 24" fill="none">
                  <rect x="6" y="4" width="12" height="16" rx="2" stroke="#00D084" strokeWidth="2"/>
                  <circle cx="12" cy="9" r="2" stroke="#00D084" strokeWidth="2"/>
                  <path d="M9 15H15" stroke="#00D084" strokeWidth="2" strokeLinecap="round"/>
                  <circle cx="9" cy="9" r="0.5" fill="#00D084"/>
                  <circle cx="15" cy="9" r="0.5" fill="#00D084"/>
                </svg>
              ),
              title: t('slide25.capabilities.risk.title'),
              desc: t('slide25.capabilities.risk.desc')
            }
          ].map((c, i) => (
            <div key={i} style={{
              background: 'var(--bg-card)',
              border: '1px solid var(--border-subtle)',
              borderRadius: '12px',
              padding: '20px',
              display: 'flex',
              alignItems: 'center',
              gap: '16px'
            }}>
              {c.icon}
              <div>
                <p style={{ fontSize: '16px', fontWeight: '600', color: 'var(--text-primary)' }}>
                  {c.title}
                </p>
                <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                  {c.desc}
                </p>
              </div>
            </div>
          ))}

          {/* Integration */}
          <div style={{
            background: 'rgba(0,208,132,0.1)',
            border: '1px solid var(--accent-green)',
            borderRadius: '12px',
            padding: '16px',
            textAlign: 'center'
          }}>
            <p style={{ fontSize: '14px', color: 'var(--text-muted)', marginBottom: '8px' }}>
              {t('slide25.integration.title')}
            </p>
            <p style={{ fontSize: '24px', fontWeight: '700', color: 'var(--accent-green)' }}>
              {t('slide25.integration.provider')}
            </p>
          </div>
        </div>
      </div>

      {/* Status Bar */}
      <div style={{
        marginTop: '32px',
        padding: '16px 32px',
        background: 'var(--accent-green)',
        borderRadius: '8px',
        textAlign: 'center'
      }}>
        <p style={{ fontSize: '18px', fontWeight: '700', color: 'var(--bg-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <path d="M20 6L9 17L4 12" stroke="var(--bg-primary)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          {t('slide25.status')}
        </p>
      </div>
    </SlideLayout>
  );
}
