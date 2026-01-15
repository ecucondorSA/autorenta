import React from 'react';
import { SlideLayout, SlideHeader } from '../components/SlideLayout';
import { useTranslations } from '../LanguageContext';

export function Slide19Metricas() {
  const { t } = useTranslations();
  
  const metricas = [
    {
      category: t('slide19.category1'),
      icon: '📈',
      color: 'var(--accent-green)',
      items: [
        { label: t('slide19.traction.item1.label'), value: t('slide19.traction.item1.value'), target: true },
        { label: t('slide19.traction.item2.label'), value: t('slide19.traction.item2.value'), target: true },
        { label: t('slide19.traction.item3.label'), value: t('slide19.traction.item3.value'), target: true }
      ]
    },
    {
      category: t('slide19.category2'),
      icon: '🛡️',
      color: '#4DD0E1',
      items: [
        { label: t('slide19.risk.item1.label'), value: t('slide19.risk.item1.value'), target: true },
        { label: t('slide19.risk.item2.label'), value: t('slide19.risk.item2.value'), target: true },
        { label: t('slide19.risk.item3.label'), value: t('slide19.risk.item3.value'), target: true }
      ]
    },
    {
      category: t('slide19.category3'),
      icon: '🔄',
      color: '#FFB74D',
      items: [
        { label: t('slide19.retention.item1.label'), value: t('slide19.retention.item1.value'), target: false },
        { label: t('slide19.retention.item2.label'), value: t('slide19.retention.item2.value'), target: false },
        { label: t('slide19.retention.item3.label'), value: t('slide19.retention.item3.value'), target: true }
      ]
    }
  ];

  return (
    <SlideLayout>
      <SlideHeader
        title={t('slide19.title')}
        subtitle={t('slide19.subtitle')}
      />

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gap: '24px',
        marginTop: '48px'
      }}>
        {metricas.map((m, i) => (
          <div key={i} style={{
            background: 'var(--bg-card)',
            border: `2px solid ${m.color}`,
            borderRadius: '16px',
            padding: '28px',
            position: 'relative'
          }}>
            {/* Header */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              marginBottom: '24px'
            }}>
              <span style={{ fontSize: '36px' }}>{m.icon}</span>
              <span style={{
                fontSize: '16px',
                fontWeight: '700',
                color: m.color,
                letterSpacing: '1px'
              }}>
                {m.category}
              </span>
            </div>

            {/* Metrics */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {m.items.map((item, j) => (
                <div key={j} style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '12px 16px',
                  background: 'var(--bg-secondary)',
                  borderRadius: '8px'
                }}>
                  <span style={{
                    fontSize: '14px',
                    color: 'var(--text-secondary)'
                  }}>
                    {item.label}
                  </span>
                  <span style={{
                    fontSize: '20px',
                    fontWeight: '700',
                    color: item.target ? 'var(--accent-green)' : 'var(--text-primary)'
                  }}>
                    {item.value}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Status Bar */}
      <div style={{
        marginTop: '40px',
        display: 'flex',
        justifyContent: 'center',
        gap: '32px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: 'var(--accent-green)' }} />
          <span style={{ fontSize: '14px', color: 'var(--text-muted)' }}>{t('slide19.status.target')}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: 'var(--text-primary)' }} />
          <span style={{ fontSize: '14px', color: 'var(--text-muted)' }}>{t('slide19.status.tracking')}</span>
        </div>
      </div>
    </SlideLayout>
  );
}
