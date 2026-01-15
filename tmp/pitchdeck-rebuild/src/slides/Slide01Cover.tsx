import React from 'react';
import parkingLot from '../../assets/parking-lot.png';
import { useTranslations } from '../LanguageContext';

export function Slide01Cover() {
  const { t } = useTranslations();
  return (
    <div className="slide slide--centered" style={{
      backgroundImage: `linear-gradient(to bottom, rgba(13,13,13,0.5), rgba(13,13,13,0.85)), url(${parkingLot})`,
      backgroundSize: 'cover',
      backgroundPosition: 'center',
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* Subtle glow effect - Enhanced */}
      <div style={{
        position: 'absolute',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        width: '1000px',
        height: '600px',
        background: 'radial-gradient(ellipse, rgba(0,208,132,0.18) 0%, transparent 75%)',
        pointerEvents: 'none',
        zIndex: 1
      }} />

      {/* Main quote - Added Animation */}
      <h1 style={{
        fontSize: '92px',
        fontWeight: '800',
        lineHeight: 1.05,
        marginBottom: '48px',
        textAlign: 'center',
        maxWidth: '1300px',
        zIndex: 2,
        animation: 'fadeInUp 1s ease-out'
      }}>
        {t('slide01.title')}
      </h1>

      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '20px',
        zIndex: 2,
        animation: 'fadeInUp 1.2s ease-out'
      }}>
        <p style={{
          fontSize: '36px',
          color: 'var(--accent-green)',
          fontWeight: '700',
          letterSpacing: '1px'
        }}>
          {t('slide01.subtitle1')}
        </p>
        <p style={{
          fontSize: '24px',
          color: 'var(--text-secondary)',
          maxWidth: '800px',
          textAlign: 'center',
          lineHeight: 1.5
        }}>
          {t('slide01.subtitle2')}
          {t('slide01.subtitle3')}
        </p>
      </div>

      {/* Logo bottom - Increased Size */}
      <div style={{
        position: 'absolute',
        bottom: '70px',
        left: '50%',
        transform: 'translateX(-50%)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '16px',
        zIndex: 2
      }}>
        <div style={{
          background: 'var(--accent-green)',
          padding: '16px 40px',
          borderRadius: '8px',
          fontSize: '26px',
          fontWeight: '800',
          color: 'var(--bg-primary)',
          boxShadow: '0 10px 30px rgba(0,208,132,0.3)',
          letterSpacing: '2px'
        }}>
          AUTORENTAR
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'center' }}>
          <p style={{ fontSize: '16px', color: 'var(--text-muted)', fontWeight: '500', letterSpacing: '1px' }}>
            {t('slide01.footer')}
          </p>
          <p style={{ fontSize: '14px', color: 'var(--text-secondary)', fontWeight: '500' }}>
            eduardomarques@campus.fmed.uba.ar
          </p>
          <p style={{ fontSize: '14px', color: 'var(--text-secondary)', fontWeight: '500' }}>
            autorentardev@gmail.com
          </p>
        </div>
      </div>

      <div className="diamond" />

      <style>{`
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(30px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
