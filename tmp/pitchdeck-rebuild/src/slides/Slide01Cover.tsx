import React from 'react';
import parkingLot from '../../assets/parking-lot.png';

export function Slide01Cover() {
  return (
    <div className="slide slide--centered" style={{
      backgroundImage: `linear-gradient(to bottom, rgba(13,13,13,0.6), rgba(13,13,13,0.92)), url(${parkingLot})`,
      backgroundSize: 'cover',
      backgroundPosition: 'center',
      position: 'relative'
    }}>
      {/* Subtle glow effect */}
      <div style={{
        position: 'absolute',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        width: '800px',
        height: '400px',
        background: 'radial-gradient(ellipse, rgba(0,208,132,0.1) 0%, transparent 70%)',
        pointerEvents: 'none'
      }} />

      {/* Main quote */}
      <h1 style={{
        fontSize: '84px',
        fontWeight: '700',
        lineHeight: 1.1,
        marginBottom: '48px',
        textAlign: 'center',
        maxWidth: '1200px'
      }}>
        El Activo Más Ineficiente del Mundo.
      </h1>

      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '16px'
      }}>
        <p style={{
          fontSize: '32px',
          color: 'var(--accent-green)',
          fontWeight: '600'
        }}>
          Tasa de Uso: {'<'} 5%
        </p>
        <p style={{
          fontSize: '22px',
          color: 'var(--text-secondary)',
          maxWidth: '700px',
          textAlign: 'center'
        }}>
          La propiedad vehicular es un error financiero para la clase media:
          Un pasivo de $20k depreciándose el 95% del tiempo.
        </p>
      </div>

      {/* Logo bottom */}
      <div style={{
        position: 'absolute',
        bottom: '60px',
        left: '50%',
        transform: 'translateX(-50%)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '12px'
      }}>
        <div style={{
          background: 'var(--accent-green)',
          padding: '12px 28px',
          borderRadius: '6px',
          fontSize: '20px',
          fontWeight: '700',
          color: 'var(--bg-primary)'
        }}>
          AUTORENTAR
        </div>
        <p style={{ fontSize: '14px', color: 'var(--text-muted)' }}>
          Argentina | 2026
        </p>
      </div>

      <div className="diamond" />
    </div>
  );
}
