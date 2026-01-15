import React from 'react';
import { SlideLayout, SlideHeader } from '../components/SlideLayout';

export function Slide25Fintech() {
  const flujo = [
    { step: '1', icon: '💳', title: 'Depósito', desc: 'Usuario carga saldo a Billetera Virtual' },
    { step: '2', icon: '🔒', title: 'Pre-Auth', desc: 'Se bloquea garantía (T+2)' },
    { step: '3', icon: '🚗', title: 'Reserva', desc: 'Se descuenta del saldo el alquiler' },
    { step: '4', icon: '✅', title: 'Liberación', desc: 'Sin daños: garantía liberada automáticamente' }
  ];

  return (
    <SlideLayout>
      <SlideHeader
        title="Motor Fintech"
        subtitle="Infraestructura propietaria de pagos y garantías."
      />

      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: '48px',
        marginTop: '40px'
      }}>
        {/* Left - Flow */}
        <div>
          <p style={{
            fontSize: '14px',
            color: 'var(--text-muted)',
            marginBottom: '24px',
            textTransform: 'uppercase',
            letterSpacing: '2px'
          }}>
            Flujo de Fondos
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {flujo.map((f, i) => (
              <div key={i} style={{
                display: 'flex',
                alignItems: 'center',
                gap: '20px',
                background: 'var(--bg-card)',
                border: '1px solid var(--border-subtle)',
                borderRadius: '12px',
                padding: '20px',
                position: 'relative'
              }}>
                {/* Step Number */}
                <div style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '50%',
                  background: 'var(--accent-green)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '18px',
                  fontWeight: '700',
                  color: 'var(--bg-primary)'
                }}>
                  {f.step}
                </div>

                <span style={{ fontSize: '32px' }}>{f.icon}</span>

                <div>
                  <p style={{ fontSize: '18px', fontWeight: '600', color: 'var(--text-primary)' }}>
                    {f.title}
                  </p>
                  <p style={{ fontSize: '14px', color: 'var(--text-muted)' }}>
                    {f.desc}
                  </p>
                </div>

                {/* Connector */}
                {i < flujo.length - 1 && (
                  <div style={{
                    position: 'absolute',
                    bottom: '-16px',
                    left: '39px',
                    width: '2px',
                    height: '16px',
                    background: 'var(--accent-green)'
                  }} />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Right - Features */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <p style={{
            fontSize: '14px',
            color: 'var(--text-muted)',
            marginBottom: '4px',
            textTransform: 'uppercase',
            letterSpacing: '2px'
          }}>
            Capacidades Core
          </p>

          {[
            { icon: '📒', title: 'Libro Contable', desc: 'Doble entrada (Debit/Credit) con integridad transaccional' },
            { icon: '💰', title: 'Billetera Virtual', desc: 'Sin licencia bancaria requerida (comodato)' },
            { icon: '🔐', title: 'Pre-Autorizaciones', desc: 'Bloqueo de garantía con liberación automática (T+2)' },
            { icon: '🤖', title: 'Motor de Riesgo IA', desc: 'Scoring de comportamiento + detección de fraude' }
          ].map((c, i) => (
            <div key={i} style={{
              background: 'var(--bg-card)',
              border: '1px solid var(--border-subtle)',
              borderRadius: '12px',
              padding: '20px',
              display: 'flex',
              alignItems: 'center',
              gap: '16px'
            }}>
              <span style={{ fontSize: '36px' }}>{c.icon}</span>
              <div>
                <p style={{ fontSize: '16px', fontWeight: '600', color: 'var(--text-primary)' }}>
                  {c.title}
                </p>
                <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                  {c.desc}
                </p>
              </div>
            </div>
          ))}

          {/* Integration */}
          <div style={{
            background: 'rgba(0,208,132,0.1)',
            border: '1px solid var(--accent-green)',
            borderRadius: '12px',
            padding: '16px',
            textAlign: 'center'
          }}>
            <p style={{ fontSize: '14px', color: 'var(--text-muted)', marginBottom: '8px' }}>
              Integración de Pagos
            </p>
            <p style={{ fontSize: '24px', fontWeight: '700', color: 'var(--accent-green)' }}>
              MercadoPago API
            </p>
          </div>
        </div>
      </div>

      {/* Status Bar */}
      <div style={{
        marginTop: '32px',
        padding: '16px 32px',
        background: 'var(--accent-green)',
        borderRadius: '8px',
        textAlign: 'center'
      }}>
        <p style={{ fontSize: '18px', fontWeight: '700', color: 'var(--bg-primary)' }}>
          ✓ 100% OPERATIVO EN PRODUCCIÓN
        </p>
      </div>
    </SlideLayout>
  );
}
