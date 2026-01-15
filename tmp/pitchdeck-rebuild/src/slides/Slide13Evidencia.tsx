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
        { name: 'Validacion ID', img: '/assets/4_account_auth.jpg' },
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
            <div className="section-header">{f.title}</div>

            <div style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: '8px'
            }}>
              {f.screens.map((screen, j) => (
                <React.Fragment key={j}>
                  <div className="flex-col align-center">
                    <div className="device-frame">
                      {screen.img ? (
                        <img
                          src={screen.img}
                          className="device-screen"
                          alt={screen.name}
                        />
                      ) : (
                        <div style={{ padding: '20px', textAlign: 'center', fontSize: '12px' }}>
                          Missing: {screen.name}
                        </div>
                      )}
                    </div>
                    <div className="screen-label-v2">{screen.name}</div>
                  </div>

                  {/* Conector entre pantallas del mismo flujo */}
                  {j === 0 && (
                    <div className="flow-connector" style={{ marginTop: '200px' }}>
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
