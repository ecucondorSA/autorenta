import React from 'react';
import { SlideLayout, SlideHeader, Card } from '../components/SlideLayout';

export function Slide11ProductUI() {
  const flows = [
    {
      title: 'FLUJO: RESERVA',
      screens: [
        { name: 'Discovery', img: '/assets/product-experience/booking_discovery.png' },
        { name: 'Confirmacion', img: '/assets/product-experience/booking_confirmacion.png' },
      ],
      reduce: ['Abandono por UX', 'Transparencia Precios']
    },
    {
      title: 'FLUJO: FINTECH',
      screens: [
        { name: 'Billetera Virtual', img: '/assets/product-experience/fintech_billetera_virtual.png' },
        { name: 'Hold/Garantia', img: '/assets/product-experience/fintech_hold_garantia.png' },
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
        subtitle="UX diseñada para reduccion de friccion y riesgo."
      />

      <div className="grid-3" style={{ marginTop: '48px' }}>
        {flows.map((f, i) => (
          <div key={i} className="flex-col gap-16">
            <div className="section-header">{f.title}</div>

            {f.screens.map((screen, j) => (
              <Card key={j}>
                <div style={{
                  height: '180px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--text-muted)',
                  fontSize: '14px',
                  position: 'relative',
                  overflow: 'hidden',
                  background: 'var(--bg-card)'
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
                      display: 'block'
                    }}
                  />
                  <div data-fallback="true" style={{ display: 'none' }}>
                    PEGAR FIGMA: {screen.name}
                  </div>
                  <div style={{
                    position: 'absolute',
                    bottom: 0,
                    left: 0,
                    right: 0,
                    padding: '6px 8px',
                    background: 'rgba(0,0,0,0.6)',
                    backdropFilter: 'blur(4px)',
                    fontSize: '10px',
                    color: 'white',
                    textAlign: 'center'
                  }}>
                    {screen.name}
                  </div>
                </div>
              </Card>
            ))}

            {f.reduce.map((r, j) => (
              <p key={j} style={{ fontSize: '16px', color: 'var(--accent-green)' }}>
                Reduce: {r}
              </p>
            ))}
          </div>
        ))}
      </div>
    </SlideLayout>
  );
}
