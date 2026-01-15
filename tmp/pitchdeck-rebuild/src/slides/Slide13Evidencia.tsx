import React from 'react';
import { SlideLayout, SlideHeader } from '../components/SlideLayout';
import { useTranslations } from '../LanguageContext';

export function Slide13Evidencia() {
  const { t } = useTranslations();

  const flows = [
    {
      title: t('slide13.flujoReserva'),
      screens: [
        { name: t('slide13.mapaSeleccion'), img: '/assets/1_cars_list.jpg' },
        { name: t('slide13.confirmacion'), img: '/assets/3_car_detail.jpg' }
      ]
    },
    {
      title: t('slide13.coreFintech'),
      screens: [
        { name: t('slide13.billeteraVirtual'), img: '/assets/2_wallet.jpg' },
        { name: t('slide13.garantiaHistorial'), img: '/assets/5_bookings_history.jpg' }
      ]
    },
    {
      title: t('slide13.sistemaConfianza'),
      screens: [
        { name: t('slide13.validacionID'), img: '/assets/validacion_id.png' }
      ]
    }
  ];

  return (
    <SlideLayout>
      <SlideHeader
        title={t('slide13.title')}
        subtitle={t('slide13.subtitle')}
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
              alignItems: 'stretch',
              justifyContent: 'center',
              gap: '16px'
            }}>
              {f.screens.map((screen, j) => (
                <React.Fragment key={j}>
                  <div className="flex-col align-center" style={{ flex: 1 }}>
                    <div className="device-frame" style={{
                      background: '#1A1A1A',
                      borderRadius: '16px',
                      overflow: 'hidden',
                      border: '4px solid #333',
                      boxShadow: '0 10px 20px rgba(0,0,0,0.3)',
                      width: '100%',
                      maxWidth: '180px',
                      height: '380px'
                    }}>
                      {screen.img ? (
                        <img
                          src={screen.img}
                          className="device-screen"
                          alt={screen.name}
                          style={{
                            width: '100%',
                            height: '100%',
                            objectFit: 'cover',
                            objectPosition: 'top center',
                            background: '#0a0a0a'
                          }}
                        />
                      ) : (
                         <div style={{ padding: '20px', textAlign: 'center', fontSize: '12px' }}>
                           {t('slide13.missing')} {screen.name}
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
                      marginBottom: '30px'
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
