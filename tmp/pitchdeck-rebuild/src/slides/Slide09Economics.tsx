import React from 'react';
import { SlideLayout, SlideHeader } from '../components/SlideLayout';
import { useTranslations } from '../LanguageContext';

export function Slide09Economia() {
  const { t } = useTranslations();
  return (
    <SlideLayout>
      <SlideHeader
        title={t('slide09.title')}
        subtitle={t('slide09.subtitle')}
      />

      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: '48px',
        marginTop: '40px'
      }}>
        {/* Left - Breakdown */}
        <div>
          <p style={{
            fontSize: '14px',
            color: 'var(--text-muted)',
            marginBottom: '24px',
            textTransform: 'uppercase',
            letterSpacing: '2px'
          }}>
            {t('slide09.desglose')}
          </p>

          {/* Waterfall Chart */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {[
              { label: t('slide09.ticketPromedio'), value: '$120', bar: 100, color: 'var(--text-primary)', plus: true },
              { label: t('slide09.takeRate'), value: '$18', bar: 60, color: 'var(--accent-green)', plus: true },
              { label: t('slide09.fgoPool'), value: '$12', bar: 40, color: '#4DD0E1', plus: false },
              { label: t('slide09.pspSoporte'), value: '-$7.20', bar: 25, color: 'var(--danger)', plus: false }
            ].map((item, i) => (
              <div key={i} style={{
                display: 'grid',
                gridTemplateColumns: '180px 80px 1fr',
                alignItems: 'center',
                gap: '16px'
              }}>
                <span style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>
                  {item.label}
                </span>
                <span style={{
                  fontSize: '20px',
                  fontWeight: '700',
                  color: item.color,
                  textAlign: 'right'
                }}>
                  {item.value}
                </span>
                <div style={{
                  height: '32px',
                  width: `${item.bar}%`,
                  background: item.color,
                  borderRadius: '4px',
                  opacity: 0.8
                }} />
              </div>
            ))}
          </div>

          {/* Result */}
          <div style={{
            marginTop: '24px',
            padding: '20px',
            background: 'var(--accent-green)',
            borderRadius: '12px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <span style={{ fontSize: '18px', fontWeight: '600', color: 'var(--bg-primary)' }}>
              {t('slide09.margenNeto')}
            </span>
            <span style={{ fontSize: '32px', fontWeight: '800', color: 'var(--bg-primary)' }}>
              $10.80
            </span>
          </div>

          <p style={{
            marginTop: '12px',
            fontSize: '14px',
            color: 'var(--accent-green)',
            textAlign: 'center'
          }}>
            {t('slide09.rentableDay1')}
          </p>
        </div>

        {/* Right - Key Metrics */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <p style={{
            fontSize: '14px',
            color: 'var(--text-muted)',
            marginBottom: '4px',
            textTransform: 'uppercase',
            letterSpacing: '2px'
          }}>
            {t('slide09.metricasClave')}
          </p>

          {[
            { label: 'LTV (12 meses)', value: '$324', desc: t('slide09.ltvDesc') },
            { label: 'CAC Objetivo', value: '<$15', desc: 'WiFi hack reduce a <$0.50' },
            { label: 'LTV:CAC Ratio', value: '21x', desc: 'Benchmark SaaS: 3x mínimo', highlight: true },
            { label: t('slide09.paybackMeses'), value: '<30 días', desc: 'Recuperación inmediata' }
          ].map((m, i) => (
            <div key={i} style={{
              background: m.highlight ? 'rgba(0,208,132,0.15)' : 'var(--bg-card)',
              border: m.highlight ? '2px solid var(--accent-green)' : '1px solid var(--border-subtle)',
              borderRadius: '12px',
              padding: '20px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <div>
                <p style={{ fontSize: '14px', color: 'var(--text-muted)' }}>{m.label}</p>
                <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>{m.desc}</p>
              </div>
              <span style={{
                fontSize: '28px',
                fontWeight: '800',
                color: m.highlight ? 'var(--accent-green)' : 'var(--text-primary)'
              }}>
                {m.value}
              </span>
            </div>
          ))}
        </div>
      </div>
    </SlideLayout>
  );
}
