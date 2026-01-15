import React from 'react';
import { SlideLayout, SlideHeader } from '../components/SlideLayout';

// SVG Icons para cada paso
const icons = {
  registro: (
    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
      <path d="M12 11v4" />
    </svg>
  ),
  busqueda: (
    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="3 6 9 3 15 6 21 3 21 18 15 21 9 18 3 21" />
      <line x1="9" y1="3" x2="9" y2="18" />
      <line x1="15" y1="6" x2="15" y2="21" />
    </svg>
  ),
  reserva: (
    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="1" y="4" width="22" height="16" rx="2" ry="2" />
      <line x1="1" y1="10" x2="23" y2="10" />
    </svg>
  ),
  checkin: (
    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="23 7 16 12 23 17 23 7" />
      <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
    </svg>
  ),
  uso: (
    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  ),
  devolucion: (
    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="9 11 12 14 22 4" />
      <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
    </svg>
  )
};

export function Slide06Producto() {
  const pasos = [
    { num: 1, name: 'REGISTRO', desc: 'Verificación biométrica + CNH validado por IA', icon: icons.registro },
    { num: 2, name: 'BÚSQUEDA', desc: 'Mapa interactivo con filtros y disponibilidad en tiempo real', icon: icons.busqueda },
    { num: 3, name: 'RESERVA', desc: 'Pagos divididos, depósito pre-autorizado', icon: icons.reserva },
    { num: 4, name: 'CHECK-IN', desc: 'Video-inspección guiada por IA (evidencia legal)', icon: icons.checkin },
    { num: 5, name: 'USO', desc: 'Soporte 24/7 + tracking opcional', icon: icons.uso },
    { num: 6, name: 'DEVOLUCIÓN', desc: 'Inspección final + liberación instantánea', icon: icons.devolucion }
  ];

  return (
    <SlideLayout>
      <SlideHeader
        title="Producto (Flujo 100% Digital)"
        subtitle="Una experiencia premium diseñada para la confianza y la velocidad."
      />

      <div style={{
        position: 'relative',
        flex: 1,
        marginTop: '20px',
        display: 'flex',
        flexDirection: 'column',
        gap: '16px'
      }}>

        {/* Background Glow */}
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: '800px',
          height: '400px',
          background: 'radial-gradient(ellipse, rgba(0, 208, 132, 0.08) 0%, transparent 70%)',
          pointerEvents: 'none',
          zIndex: 0
        }} />

        {/* Timeline Container */}
        <div style={{
          position: 'relative',
          zIndex: 1,
          padding: '0 40px'
        }}>
          {/* Connection Line */}
          <div style={{
            position: 'absolute',
            top: '48px',
            left: '120px',
            right: '120px',
            height: '3px',
            background: 'linear-gradient(90deg, var(--accent-green) 0%, rgba(0, 208, 132, 0.3) 50%, var(--accent-green) 100%)',
            zIndex: 0
          }} />

          {/* Steps */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(6, 1fr)',
            gap: '16px',
            position: 'relative',
            zIndex: 1
          }}>
            {pasos.map((p, idx) => (
              <div key={p.num} style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                textAlign: 'center'
              }}>
                {/* Icon Circle */}
                <div style={{
                  width: '96px',
                  height: '96px',
                  background: 'linear-gradient(135deg, rgba(0, 208, 132, 0.2) 0%, rgba(0, 208, 132, 0.05) 100%)',
                  border: '2px solid var(--accent-green)',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--accent-green)',
                  boxShadow: '0 0 30px rgba(0, 208, 132, 0.3), inset 0 0 20px rgba(0, 208, 132, 0.1)',
                  position: 'relative'
                }}>
                  {p.icon}
                  {/* Step Number Badge */}
                  <div style={{
                    position: 'absolute',
                    top: '-4px',
                    right: '-4px',
                    width: '28px',
                    height: '28px',
                    background: 'var(--accent-green)',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '18px',
                    fontWeight: '700',
                    color: 'var(--bg-primary)',
                    boxShadow: '0 4px 12px rgba(0, 208, 132, 0.4)'
                  }}>
                    {p.num}
                  </div>
                </div>

                {/* Step Name */}
                <div style={{
                  marginTop: '20px',
                  fontSize: '18px',
                  letterSpacing: '2px',
                  fontWeight: '700',
                  color: 'var(--accent-green)'
                }}>
                  {p.name}
                </div>

                {/* Step Description */}
                <div style={{
                  marginTop: '8px',
                  fontSize: '16px',
                  color: 'var(--text-secondary)',
                  lineHeight: '1.5',
                  maxWidth: '200px'
                }}>
                  {p.desc}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Hero Car Image */}
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          flex: 1,
          position: 'relative'
        }}>
          <div style={{
            position: 'relative',
            width: '2800px',
            height: '900px'
          }}>
            {/* Glow behind car */}
            <div style={{
              position: 'absolute',
              bottom: '0',
              left: '50%',
              transform: 'translateX(-50%)',
              width: '600px',
              height: '80px',
              background: 'radial-gradient(ellipse, rgba(0, 208, 132, 0.3) 0%, transparent 70%)',
              filter: 'blur(20px)'
            }} />
            <img
              src="/assets/app-mockups.png"
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'contain',
                filter: 'drop-shadow(0 20px 40px rgba(0,0,0,0.5))'
              }}
              alt="Hero Car"
            />
          </div>
        </div>

        {/* Bottom Badge */}
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          gap: '24px',
          zIndex: 1
        }}>
          {[
            { icon: '📱', text: '100% desde tu celular' },
            { icon: '📄', text: 'Sin papeles' },
            { icon: '⚡', text: 'Liberación instantánea' }
          ].map((item, idx) => (
            <div key={idx} style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              background: 'rgba(0, 208, 132, 0.1)',
              border: '1px solid rgba(0, 208, 132, 0.3)',
              padding: '16px 32px',
              borderRadius: '100px'
            }}>
              <span style={{ fontSize: '28px' }}>{item.icon}</span>
              <span style={{
                fontSize: '20px',
                fontWeight: '600',
                color: 'var(--text-primary)'
              }}>
                {item.text}
              </span>
            </div>
          ))}
        </div>
      </div>
    </SlideLayout>
  );
}
