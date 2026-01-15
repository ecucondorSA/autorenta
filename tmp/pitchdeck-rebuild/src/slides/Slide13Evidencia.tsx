import React from 'react';
import { SlideLayout, SlideHeader } from '../components/SlideLayout';

export function Slide13Evidencia() {
  const flows = [
    {
      title: 'Flujo de Reserva',
      screens: [
        { name: 'Mapa / Seleccion', img: '/assets/1_cars_list.jpg' },
        { name: 'Confirmacion', img: '/assets/3_car_detail.jpg' }
      ]
    },
    {
      title: 'Core Fintech',
      screens: [
        { name: 'Billetera Virtual', img: '/assets/2_wallet.jpg' },
        { name: 'Garantía / Historial', img: '/assets/5_bookings_history.jpg' }
      ]
    },
    {
      title: 'Sistema Confianza',
      screens: [
        { name: 'Validacion ID', img: '/assets/validacion_id.png' },
        { name: 'Registro Evidencia', img: '/assets/06_evidence_entry.png' }
      ]
    }
  ];

  return (
    <SlideLayout>
      <SlideHeader
        title="Evidencia de Producto (En Vivo)"
        subtitle="Infraestructura operativa y flujos validados hoy."
      />

      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr 1fr',
        gap: '32px',
        marginTop: '20px',
        padding: '0 20px'
      }}>
        {flows.map((f, i) => (
          <div key={i} className="flex-col">
            <div className="section-header" style={{ marginBottom: '24px' }}>{f.title}</div>

            <div style={{
              display: 'flex',
              alignItems: 'stretch', // Align items to stretch to allow center alignment of arrow
              justifyContent: 'center',
              gap: '8px'
            }}>
              {f.screens.map((screen, j) => (
                <React.Fragment key={j}>
                  <div className="flex-col align-center" style={{ flex: 1 }}>
                    <div className="device-frame" style={{
                      background: '#1A1A1A',
                      borderRadius: '16px',
                      overflow: 'hidden',
                      border: '4px solid #333',
                      boxShadow: '0 10px 20px rgba(0,0,0,0.3)'
                    }}>
                      {screen.img ? (
                        <img
                          src={screen.img}
                          className="device-screen"
                          alt={screen.name}
                          style={{
                            width: '100%',
                            height: '100%',
                            objectFit: 'contain',
                            background: '#0a0a0a'
                          }}
                        />
                      ) : (
                        <div style={{ padding: '20px', textAlign: 'center', fontSize: '12px' }}>
                          Missing: {screen.name}
                        </div>
                      )}
                    </div>
                    <div className="screen-label-v2" style={{
                      fontSize: '14px',
                      marginTop: '12px',
                      fontWeight: '600',
                      color: 'var(--text-secondary)'
                    }}>
                      {screen.name}
                    </div>
                  </div>

                  {/* Conector entre pantallas del mismo flujo */}
                  {j === 0 && (
                    <div className="flow-connector" style={{
                      alignSelf: 'center',
                      fontSize: '24px',
                      color: 'var(--accent-green)',
                      marginBottom: '30px' // Offset for label height
                    }}>
                      →
                    </div>
                  )}
                </React.Fragment>
              ))}
            </div>
          </div>
        ))}
      </div>
    </SlideLayout>
  );
}
