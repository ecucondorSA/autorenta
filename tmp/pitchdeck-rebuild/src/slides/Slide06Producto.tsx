import React from 'react';
import { SlideLayout, SlideHeader } from '../components/SlideLayout';
import { useTranslations } from '../LanguageContext';

// SVG Icons para cada paso
const icons = {
  busqueda: (
    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  ),
  reserva: (
    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  ),
  checkin: (
    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
      <polyline points="22 4 12 14.01 9 11.01" />
    </svg>
  ),
  devolucion: (
    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="23 4 23 10 17 10" />
      <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
    </svg>
  )
};

export function Slide06Producto() {
  const { t } = useTranslations();
  
  const pasos = [
    { num: 1, name: t('slide06.step1Name'), desc: t('slide06.step1Desc'), icon: icons.busqueda },
    { num: 2, name: t('slide06.step2Name'), desc: t('slide06.step2Desc'), icon: icons.reserva },
    { num: 3, name: t('slide06.step3Name'), desc: t('slide06.step3Desc'), icon: icons.checkin },
    { num: 4, name: t('slide06.step4Name'), desc: t('slide06.step4Desc'), icon: icons.devolucion }
  ];

  return (
    <SlideLayout>
      <SlideHeader
        title={t('slide06.title')}
        subtitle={t('slide06.subtitle')}
      />

      <div style={{
        position: 'relative',
        flex: 1,
        marginTop: '20px',
        display: 'flex',
        flexDirection: 'column',
        gap: '24px'
      }}>

        {/* Background Glow */}
        <div style={{
          position: 'absolute',
          top: '40%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: '800px',
          height: '400px',
          background: 'radial-gradient(ellipse, rgba(0, 208, 132, 0.1) 0%, transparent 70%)',
          pointerEvents: 'none',
          zIndex: 0
        }} />

        {/* Timeline Container */}
        <div style={{
          position: 'relative',
          zIndex: 1,
          padding: '0 40px',
          marginBottom: '20px'
        }}>
          {/* Connection Line */}
          <div style={{
            position: 'absolute',
            top: '48px',
            left: '150px',
            right: '150px',
            height: '3px',
            background: 'linear-gradient(90deg, var(--accent-green) 0%, rgba(0, 208, 132, 0.3) 50%, var(--accent-green) 100%)',
            zIndex: 0
          }} />

          {/* Steps */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: '32px',
            position: 'relative',
            zIndex: 1
          }}>
            {pasos.map((p) => (
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
                  position: 'relative',
                  backgroundColor: '#1E1E1E' // Ensure solid background behind icon to cover line
                }}>
                  {p.icon}
                  {/* Step Number Badge */}
                  <div style={{
                    position: 'absolute',
                    top: '-4px',
                    right: '-4px',
                    width: '32px',
                    height: '32px',
                    background: 'var(--accent-green)',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '20px',
                    fontWeight: '800',
                    color: 'var(--bg-primary)',
                    boxShadow: '0 4px 12px rgba(0, 208, 132, 0.4)'
                  }}>
                    {p.num}
                  </div>
                </div>

                {/* Step Name */}
                <div style={{
                  marginTop: '24px',
                  fontSize: '24px',
                  letterSpacing: '2px',
                  fontWeight: '800',
                  color: 'var(--accent-green)'
                }}>
                  {p.name}
                </div>

                {/* Step Description */}
                <div style={{
                  marginTop: '12px',
                  fontSize: '18px',
                  color: 'var(--text-secondary)',
                  lineHeight: '1.4',
                  maxWidth: '240px'
                }}>
                  {p.desc}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* App Mockups Grid */}
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          flex: 1,
          position: 'relative',
          minHeight: '200px'
        }}>
          <div style={{
            position: 'relative',
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: '20px',
            maxWidth: '900px',
            width: '100%'
          }}>
            {/* Glow behind mockups */}
            <div style={{
              position: 'absolute',
              bottom: '20px',
              left: '50%',
              transform: 'translateX(-50%)',
              width: '100%',
              height: '80px',
              background: 'radial-gradient(ellipse, rgba(0, 208, 132, 0.3) 0%, transparent 70%)',
              filter: 'blur(40px)',
              zIndex: 0
            }} />

            {/* App Screenshots */}
            {[
              { src: '/assets/product-experience/booking_discovery.png', alt: 'Mapa de Autos', label: 'ENCUENTRA' },
              { src: '/assets/product-experience/fintech_billetera_virtual.png', alt: 'Billetera Virtual', label: 'WALLET' },
              { src: '/assets/product-experience/trust_video_check.png', alt: 'Video Check con IA', label: 'CHECK-IN' }
            ].map((mockup, idx) => (
              <div key={idx} style={{
                position: 'relative',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '12px',
                zIndex: 1
              }}>
                <div style={{
                  width: '180px',
                  height: '320px',
                  background: 'linear-gradient(135deg, #2A2A2A 0%, #1A1A1A 100%)',
                  borderRadius: '24px',
                  border: '2px solid rgba(255, 255, 255, 0.1)',
                  overflow: 'hidden',
                  boxShadow: '0 20px 40px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.05)',
                  position: 'relative'
                }}>
                  <img
                    src={mockup.src}
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover',
                      display: 'block'
                    }}
                    alt={mockup.alt}
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                      e.currentTarget.parentElement!.innerHTML = `
                        <div style="width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; color: var(--text-secondary); font-size: 14px; text-align: center; padding: 20px;">
                          ${mockup.alt}<br/>Imagen no disponible
                        </div>
                      `;
                    }}
                  />
                </div>
                <div style={{
                  fontSize: '14px',
                  fontWeight: '600',
                  color: 'var(--accent-green)',
                  letterSpacing: '1px',
                  textAlign: 'center'
                }}>
                  {mockup.label}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom Badge */}
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          gap: '32px',
          zIndex: 1,
          marginBottom: '20px'
        }}>
          {[
            {
              icon: (
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                  <rect x="6" y="2" width="12" height="20" rx="2" stroke="#00D084" strokeWidth="2"/>
                  <line x1="10" y1="18" x2="14" y2="18" stroke="#00D084" strokeWidth="2" strokeLinecap="round"/>
                </svg>
              ),
              text: t('slide06.badge1')
            },
            {
              icon: (
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                  <path d="M14 2H6C5.46957 2 4.96086 2.21071 4.58579 2.58579C4.21071 2.96086 4 3.46957 4 4V20C4 20.5304 4.21071 21.0391 4.58579 21.4142C4.96086 21.7893 5.46957 22 6 22H18C18.5304 22 19.0391 21.7893 19.4142 21.4142C19.7893 21.0391 20 20.5304 20 20V8L14 2Z" stroke="#00D084" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <polyline points="14,2 14,8 20,8" stroke="#00D084" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              ),
              text: t('slide06.badge2')
            },
            {
              icon: (
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                  <path d="M13 2L4 14H11L10 22L20 10H13L13 2Z" fill="#E6FF00"/>
                </svg>
              ),
              text: t('slide06.badge3')
            }
          ].map((item, idx) => (
            <div key={idx} style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              padding: '12px 24px',
              borderRadius: '50px',
              backdropFilter: 'blur(10px)'
            }}>
              {item.icon}
              <span style={{
                fontSize: '18px',
                fontWeight: '600',
                color: 'var(--text-primary)',
                letterSpacing: '0.5px'
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