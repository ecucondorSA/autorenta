import React from 'react';
import { SlideLayout, SlideHeader } from '../components/SlideLayout';
import { useTranslations } from '../LanguageContext';

export function Slide12Tecnologia() {
  const { t } = useTranslations();

  const stack = [
    { name: t('slide12.stackItems.frontend'), tech: t('slide12.stackTech.frontend'), icon: '📱' },
    { name: t('slide12.stackItems.backend'), tech: t('slide12.stackTech.backend'), icon: '🗄️' },
    { name: t('slide12.stackItems.pagos'), tech: t('slide12.stackTech.pagos'), icon: '💳' },
    { name: t('slide12.stackItems.ia'), tech: t('slide12.stackTech.ia'), icon: '🤖' },
  ];

  const metricas = [
    { label: 'Uptime', value: '99.9%', color: 'var(--accent-green)' },
    { label: 'Edge Functions', value: '45+', color: 'var(--text-primary)' },
  ];

  return (
    <SlideLayout>
      <SlideHeader
        title={t('slide12.title')}
        subtitle={t('slide12.subtitle')}
      />

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'minmax(0, 360px) minmax(0, 1fr)',
        gap: '40px',
        marginTop: '32px',
        height: '100%',
        maxWidth: '1600px',
        margin: '32px auto 0'
      }}>
        {/* Left - Validacion ID Image */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'flex-start',
          background: 'var(--bg-card)',
          borderRadius: '16px',
          padding: '16px',
          border: '1px solid var(--border-subtle)',
          boxShadow: '0 20px 40px rgba(0,0,0,0.2)',
          maxHeight: '520px',
          overflow: 'hidden'
        }}>
          <p style={{
            fontSize: '14px',
            color: 'var(--accent-green)',
            marginBottom: '12px',
            fontWeight: '700',
            textTransform: 'uppercase',
            letterSpacing: '1px',
            width: '100%',
            textAlign: 'center',
            flexShrink: 0
          }}>
            {t('slide12.verificacionCompletada')}
          </p>
          <div style={{
            width: '100%',
            flex: 1,
            minHeight: 0,
            overflow: 'hidden',
            borderRadius: '8px',
            background: '#fff'
          }}>
            <img
              src="/assets/verification_completed.png"
              alt="Verificación Completada"
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'contain',
                objectPosition: 'top center',
                borderRadius: '4px'
              }}
              onError={(e) => {
                e.currentTarget.style.display = 'none';
                const fallback = e.currentTarget.parentElement;
                if (fallback) {
                  fallback.innerHTML = `
                    <div style="width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; background: linear-gradient(135deg, #00D084 0%, #00A86B 100%); border-radius: 4px; color: white; text-align: center; padding: 20px;">
                      <div>
                        <div style="margin-bottom: 16px;">
                          <svg width="48" height="48" viewBox="0 0 24 24" fill="none">
                            <circle cx="12" cy="12" r="10" stroke="white" stroke-width="2"/>
                            <path d="M8 12L11 15L16 9" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                          </svg>
                        </div>
                        <div style="font-size: 18px; font-weight: 600; margin-bottom: 8px;">Verificación Exitosa</div>
                        <div style="font-size: 14px; opacity: 0.8;">Proceso completado</div>
                      </div>
                    </div>
                  `;
                }
              }}
            />
          </div>
        </div>

        {/* Right - Stack & Metrics */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* Stack Grid */}
          <div>
            <p style={{
              fontSize: '14px',
              color: 'var(--text-muted)',
              marginBottom: '16px',
              textTransform: 'uppercase',
              letterSpacing: '2px'
            }}>
              Core Stack
            </p>
            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '16px'
            }}>
              {stack.map((s, i) => (
                <div key={i} style={{
                  background: 'var(--bg-card)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: '12px',
                  padding: '16px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px'
                }}>
                  <span style={{ fontSize: '24px' }}>{s.icon}</span>
                  <div>
                    <p style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{s.name}</p>
                    <p style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text-primary)' }}>{s.tech}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Metrics */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '16px'
          }}>
            {metricas.map((m, i) => (
              <div key={i} style={{
                background: 'rgba(255, 255, 255, 0.05)',
                borderRadius: '12px',
                padding: '16px',
                textAlign: 'center'
              }}>
                <p style={{ fontSize: '28px', fontWeight: '700', color: m.color }}>{m.value}</p>
                <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{m.label}</p>
              </div>
            ))}
          </div>

          {/* Features Box */}
          <div style={{
            background: 'rgba(0, 208, 132, 0.1)',
            border: '1px solid var(--accent-green)',
            borderRadius: '12px',
            padding: '20px',
            marginTop: 'auto'
          }}>
            <p style={{ fontSize: '14px', color: 'var(--accent-green)', marginBottom: '12px', fontWeight: '600' }}>
              ✓ {t('slide12.ventajasTecnicas')}
            </p>
            <ul style={{
              fontSize: '14px',
              color: 'var(--text-secondary)',
              lineHeight: 1.8,
              paddingLeft: '20px',
              margin: 0
            }}>
              <li>{t('slide12.ventaja1')}</li>
              <li>{t('slide12.ventaja2')}</li>
              <li>{t('slide12.ventaja3')}</li>
              <li>{t('slide12.ventaja4')}</li>
            </ul>
          </div>
        </div>
      </div>
    </SlideLayout>
  );
}
