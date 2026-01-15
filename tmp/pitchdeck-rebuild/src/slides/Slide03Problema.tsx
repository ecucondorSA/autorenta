import React from 'react';

export function Slide03Problema() {
  return (
    <div className="slide slide--centered" style={{
      position: 'relative'
    }}>
      {/* Dramatic glow behind the word */}
      <div style={{
        position: 'absolute',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        width: '1000px',
        height: '600px',
        background: 'radial-gradient(ellipse, rgba(255,255,255,0.05) 0%, transparent 50%)',
        pointerEvents: 'none'
      }} />

      {/* Single word - maximum impact */}
      <h1 style={{
        fontSize: '180px',
        fontWeight: '700',
        letterSpacing: '-4px',
        color: 'var(--accent-yellow)',
        textShadow: '0 0 100px rgba(230,255,0,0.3)',
        marginBottom: '48px'
      }}>
        CONFIANZA.
      </h1>

      <p style={{
        fontSize: '36px',
        color: 'var(--text-primary)',
        fontWeight: '500',
        marginBottom: '24px'
      }}>
        El cuello de botella es la confianza.
      </p>

      <p style={{
        fontSize: '24px',
        color: 'var(--text-secondary)',
        maxWidth: '800px',
        textAlign: 'center',
        lineHeight: 1.6,
        marginBottom: '64px'
      }}>
        Las plataformas P2P actuales fallan porque no pueden garantizar seguridad.
      </p>

      {/* Fear questions */}
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
        alignItems: 'center'
      }}>
        {[
          '¿Me robarán el auto?',
          '¿Quién paga los daños?',
          '¿Qué pasa si mienten?'
        ].map((q, i) => (
          <p key={i} style={{
            fontSize: '22px',
            color: 'var(--text-muted)',
            fontStyle: 'italic'
          }}>
            – {q}
          </p>
        ))}
      </div>

      {/* Bottom tagline */}
      <p style={{
        position: 'absolute',
        bottom: '80px',
        fontSize: '20px',
        color: 'var(--text-secondary)'
      }}>
        Sin una solución tecnológica al <span style={{ color: 'var(--accent-green)' }}>Miedo</span>, el mercado no escala.
      </p>

      <div className="diamond" />
    </div>
  );
}
