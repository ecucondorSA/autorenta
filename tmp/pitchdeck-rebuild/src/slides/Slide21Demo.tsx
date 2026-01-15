import React from 'react';
import { SlideLayout, SlideHeader } from '../components/SlideLayout';
import { useTranslations } from '../LanguageContext';

export function Slide21Demostración() {
  const { t } = useTranslations();
  
  return (
    <SlideLayout>
      <SlideHeader
        title={t('slide21.title')}
        subtitle={t('slide21.subtitle')}
      />

      <div style={{
        display: 'grid',
        gridTemplateColumns: '1.2fr 0.8fr', // Give more space to mockup
        gap: '60px',
        marginTop: '40px',
        alignItems: 'center'
      }}>
        {/* Left - App Mockups */}
        <div style={{
          display: 'flex',
          justifyContent: 'center'
        }}>
          <img
            src="/assets/app-mockups.png"
            alt="AutoRenta App"
            style={{
              width: '100%',
              maxWidth: '700px',
              height: 'auto',
              filter: 'drop-shadow(0 20px 40px rgba(0,0,0,0.4))'
            }}
          />
        </div>

        {/* Right - Access Info */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* QR Code Placeholder */}
          <div style={{
            background: 'var(--bg-card)',
            border: '2px solid var(--accent-green)',
            borderRadius: '24px',
            padding: '32px',
            textAlign: 'center',
            boxShadow: '0 0 40px rgba(0, 208, 132, 0.15)'
          }}>
            <p style={{
              fontSize: '18px',
              color: 'var(--accent-green)',
              marginBottom: '20px',
              fontWeight: '700',
              textTransform: 'uppercase',
              letterSpacing: '3px'
            }}>
              {t('slide21.qrLabel')}
            </p>

            {/* QR Image */}
            <div style={{
              width: '200px',
              height: '200px',
              background: 'white',
              borderRadius: '16px',
              margin: '0 auto 20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '10px'
            }}>
              <img
                src="https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=https://app.autorentar.com&color=000000&bgcolor=ffffff"
                alt="QR Code"
                style={{ width: '100%', height: '100%' }}
              />
            </div>

            <p style={{ fontSize: '24px', color: 'var(--text-primary)', fontWeight: '700', letterSpacing: '1px' }}>
              {t('slide21.url')}
            </p>
          </div>

          {/* Credentials */}
          <div style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border-subtle)',
            borderRadius: '16px',
            padding: '24px'
          }}>
            <p style={{
              fontSize: '16px',
              color: 'var(--text-muted)',
              marginBottom: '16px',
              textTransform: 'uppercase',
              letterSpacing: '1px',
              fontWeight: '600'
            }}>
              {t('slide21.credentials.title')}
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '8px' }}>
                <span style={{ color: 'var(--text-muted)', fontSize: '18px' }}>{t('slide21.credentials.user')}:</span>
                <span style={{ color: 'var(--accent-green)', fontFamily: 'monospace', fontSize: '20px', fontWeight: 'bold' }}>
                  investor@autorentar.com
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: 'var(--text-muted)', fontSize: '18px' }}>{t('slide21.credentials.pass')}:</span>
                <span style={{ color: 'var(--accent-green)', fontFamily: 'monospace', fontSize: '20px', fontWeight: 'bold' }}>
                  demo2026
                </span>
              </div>
            </div>
          </div>

          {/* What you can do */}
          <div style={{
            background: 'rgba(0,208,132,0.1)',
            border: '1px solid var(--accent-green)',
            borderRadius: '16px',
            padding: '24px'
          }}>
            <p style={{ fontSize: '16px', color: 'var(--accent-green)', marginBottom: '16px', fontWeight: '700' }}>
              ✓ {t('slide21.features.title')}:
            </p>
            <ul style={{
              fontSize: '16px',
              color: 'var(--text-primary)',
              lineHeight: 1.8,
              paddingLeft: '24px',
              margin: 0
            }}>
              <li>{t('slide21.features.item1')}</li>
              <li>{t('slide21.features.item2')}</li>
              <li>{t('slide21.features.item3')}</li>
              <li>{t('slide21.features.item4')}</li>
            </ul>
          </div>
        </div>
      </div>
    </SlideLayout>
  );
}
