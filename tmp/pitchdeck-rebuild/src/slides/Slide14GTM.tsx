import React from 'react';
import { SlideLayout, SlideHeader } from '../components/SlideLayout';
import { useTranslations } from '../LanguageContext';

export function Slide14EstrategiaMercado() {
  const { t } = useTranslations();

  const funnel = [
    { stage: 'AWARENESS', value: '100K+', desc: 'WiFi Fronterizo → Registro vehicular', color: 'var(--text-muted)', width: '100%' },
    { stage: 'INTEREST', value: '30K', desc: 'Push notifications en alta demanda', color: 'var(--text-secondary)', width: '80%' },
    { stage: 'ACTIVATION', value: '5K', desc: 'Primera publicación de vehículo', color: 'var(--text-primary)', width: '60%' },
    { stage: 'REVENUE', value: '1.5K', desc: 'Primera reserva completada', color: 'var(--accent-green)', width: '40%' }
  ];

  return (
    <SlideLayout>
      <SlideHeader
        title={t('slide14.title')}
        subtitle={t('slide14.subtitle')}
      />

      <div style={{
        display: 'grid',
        gridTemplateColumns: '1.2fr 1fr',
        gap: '60px',
        marginTop: '48px',
        alignItems: 'center'
      }}>
        {/* Left - Funnel */}
        <div>
          <p style={{
            fontSize: '14px',
            color: 'var(--text-muted)',
            marginBottom: '24px',
            textTransform: 'uppercase',
            letterSpacing: '2px'
          }}>
            {t('slide14.funnelTitle')}
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {funnel.map((f, i) => (
              <div key={i} style={{
                display: 'flex',
                alignItems: 'center',
                gap: '16px'
              }}>
                {/* Bar */}
                <div style={{
                  background: `linear-gradient(90deg, ${f.color} 0%, rgba(0,208,132,0.3) 100%)`,
                  height: '56px',
                  width: f.width,
                  borderRadius: '8px',
                  display: 'flex',
                  alignItems: 'center',
                  padding: '0 20px',
                  justifyContent: 'space-between'
                }}>
                  <span style={{ fontSize: '14px', fontWeight: '600', color: 'var(--bg-primary)' }}>
                    {f.stage}
                  </span>
                  <span style={{ fontSize: '24px', fontWeight: '800', color: 'var(--bg-primary)' }}>
                    {f.value}
                  </span>
                </div>
              </div>
            ))}
          </div>

          <p style={{
            fontSize: '14px',
            color: 'var(--text-muted)',
            marginTop: '16px'
          }}>
            {t('slide14.conversionTotal')}
          </p>
        </div>

        {/* Right - Channels */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div style={{
            background: 'var(--bg-card)',
            border: '2px solid var(--accent-green)',
            borderRadius: '12px',
            padding: '24px'
          }}>
            <p style={{ fontSize: '14px', color: 'var(--accent-green)', marginBottom: '12px', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <path d="M12 2L4 22H12L20 2H12Z" stroke="#00D084" strokeWidth="2" strokeLinejoin="round"/>
                <path d="M12 22V14" stroke="#00D084" strokeWidth="2"/>
              </svg>
              {t('slide14.canalPrincipal')}
            </p>
            <p style={{ fontSize: '18px', color: 'var(--text-primary)', marginBottom: '8px' }}>
              {t('slide14.cacProyectado')} <strong style={{ color: 'var(--accent-green)' }}>{'<'} $0.50</strong>
            </p>
            <p style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>
              {t('slide14.vsAds')}
            </p>
          </div>

          <div style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border-subtle)',
            borderRadius: '12px',
            padding: '24px'
          }}>
            <p style={{ fontSize: '14px', color: 'var(--text-muted)', marginBottom: '12px' }}>
              {t('slide14.canalesSecundarios')}
            </p>
            <ul style={{
              fontSize: '15px',
              color: 'var(--text-secondary)',
              lineHeight: 2,
              paddingLeft: '20px',
              margin: 0
            }}>
              <li>{t('slide14.waitlist')}</li>
              <li>{t('slide14.alianzas')}</li>
              <li>{t('slide14.referidos')}</li>
              <li>{t('slide14.seo')}</li>
            </ul>
          </div>

          <div style={{
            background: 'var(--bg-secondary)',
            borderRadius: '12px',
            padding: '16px',
            textAlign: 'center'
          }}>
            <p style={{ fontSize: '14px', color: 'var(--text-muted)' }}>
              {t('slide14.focoGeografico')}
            </p>
            <p style={{ fontSize: '24px', fontWeight: '700', color: 'var(--text-primary)' }}>
              {t('slide14.cabaGba')}
            </p>
          </div>
        </div>
      </div>
    </SlideLayout>
  );
}
