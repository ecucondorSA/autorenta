import React from 'react';
import { SlideLayout, SlideHeader, Card } from '../components/SlideLayout';

export function Slide11ProductUI() {
  const flows = [
    {
      title: 'FLUJO: RESERVA',
      screens: [
        { name: 'Discovery & Map', img: '/assets/product-experience/booking_discovery.png' },
        { name: 'Confirmación', img: '/assets/product-experience/booking_confirmacion.png' },
      ],
      reduce: ['Abandono por UX', 'Transparencia Precios']
    },
    {
      title: 'FLUJO: FINTECH',
      screens: [
        { name: 'Billetera Virtual', img: '/assets/product-experience/fintech_billetera_virtual.png' },
        { name: 'Hold/Garantía', img: '/assets/product-experience/fintech_hold_garantia.png' },
      ],
      reduce: ['Impago', 'Siniestralidad']
    },
    {
      title: 'FLUJO: CONFIANZA',
      screens: [
        { name: 'KYC Cam', img: '/assets/product-experience/trust_kyc_cam.png' },
        { name: 'Video Check', img: '/assets/product-experience/trust_video_check.png' },
      ],
      reduce: ['Fraude Identidad', 'Disputas Daños']
    }
  ];

  return (
    <SlideLayout>
      <SlideHeader
        title="Product Experience (Concept UI)"
        subtitle="UX diseñada para reducción de fricción y riesgo."
      />

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gap: '40px',
        marginTop: '48px'
      }}>
        {flows.map((f, i) => (
          <div key={i} style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '24px'
          }}>
            <div style={{
              fontSize: '20px',
              fontWeight: '700',
              color: 'var(--accent-green)',
              textAlign: 'center',
              marginBottom: '16px'
            }}>
              {f.title}
            </div>

            {f.screens.map((screen, j) => (
              <Card key={j}>
                <div style={{
                  height: '280px', // Increased from 180px
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--text-muted)',
                  fontSize: '16px', // Increased from 14px
                  position: 'relative',
                  overflow: 'hidden',
                  background: 'var(--bg-card)',
                  borderRadius: '12px',
                  boxShadow: '0 8px 24px rgba(0,0,0,0.3)'
                }}>
                  <img
                    src={screen.img}
                    alt={screen.name}
                    onError={(e) => {
                      const img = e.currentTarget;
                      img.style.display = 'none';
                      const fallback = img.parentElement?.querySelector('[data-fallback="true"]');
                      if (fallback instanceof HTMLElement) fallback.style.display = 'block';
                    }}
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover',
                      objectPosition: 'top',
                      display: 'block',
                      borderRadius: '8px'
                    }}
                  />
                  <div data-fallback="true" style={{
                    display: 'none',
                    textAlign: 'center',
                    padding: '20px',
                    background: 'linear-gradient(135deg, #2A2A2A 0%, #1E1E1E 100%)',
                    borderRadius: '8px',
                    border: '2px dashed var(--accent-green)',
                    width: '100%',
                    height: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexDirection: 'column',
                    gap: '12px'
                  }}>
                    <div style={{ fontSize: '24px' }}>📱</div>
                    <div style={{ fontSize: '16px', fontWeight: '600' }}>{screen.name}</div>
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Screenshot disponible</div>
                  </div>
                  <div style={{
                    position: 'absolute',
                    bottom: 0,
                    left: 0,
                    right: 0,
                    padding: '12px 16px', // Increased padding
                    background: 'rgba(0,0,0,0.8)',
                    backdropFilter: 'blur(8px)',
                    fontSize: '14px', // Increased from 10px
                    fontWeight: '600',
                    color: 'white',
                    textAlign: 'center'
                  }}>
                    {screen.name}
                  </div>
                </div>
              </Card>
            ))}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {f.reduce.map((r, j) => (
                <div key={j} style={{
                  fontSize: '16px',
                  fontWeight: '600',
                  color: 'var(--accent-green)',
                  textAlign: 'center',
                  padding: '8px 12px',
                  background: 'rgba(0, 208, 132, 0.1)',
                  borderRadius: '8px',
                  border: '1px solid rgba(0, 208, 132, 0.3)'
                }}>
                  ↓ Reduce: {r}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </SlideLayout>
  );
}
