import React from 'react';
import { SlideLayout, SlideHeader, Card } from '../components/SlideLayout';

export function Slide11ProductUI() {
  const flows = [
    {
      title: 'FLUJO: RESERVA',
      screens: [
        { name: 'Discovery', img: '/assets/product-experience/booking_discovery.png' },
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

      <div className="grid-3" style={{
        marginTop: '32px',
        gap: '32px',
        alignItems: 'start'
      }}>
        {flows.map((f, i) => (
          <div key={i} className="flex-col gap-16" style={{ height: '100%' }}>
            <div className="section-header" style={{
              fontSize: '20px',
              textAlign: 'center',
              marginBottom: '8px',
              color: 'var(--accent-green)',
              letterSpacing: '1px'
            }}>
              {f.title}
            </div>

            {f.screens.map((screen, j) => (
              <Card key={j} style={{
                padding: '0',
                overflow: 'hidden',
                boxShadow: '0 10px 30px rgba(0,0,0,0.3)',
                border: '1px solid rgba(255,255,255,0.1)'
              }}>
                <div style={{
                  height: '300px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--text-muted)',
                  fontSize: '14px',
                  position: 'relative',
                  overflow: 'hidden',
                  background: '#0a0a0a'
                }}>
                  <img
                    src={screen.img}
                    alt={screen.name}
                    onError={(e) => {
                      const img = e.currentTarget as HTMLImageElement;
                      img.style.display = 'none';
                      const fallback = img.parentElement?.querySelector('[data-fallback="true"]');
                      if (fallback instanceof HTMLElement) fallback.style.display = 'block';
                    }}
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'contain',
                      display: 'block'
                    }}
                  />
                  <div data-fallback="true" style={{ display: 'none', color: '#666' }}>
                    {screen.name}
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
