import React from 'react';
import { SlideLayout, SlideHeader } from '../components/SlideLayout';

export function Slide21Demostración() {
  return (
    <SlideLayout>
      <SlideHeader
        title="Demo en Vivo"
        subtitle="Probá la plataforma ahora mismo."
      />

      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: '60px',
        marginTop: '40px',
        alignItems: 'center'
      }}>
        {/* Left - App Mockups */}
        <div style={{
          display: 'flex',
          justifyContent: 'center'
        }}>
          <img
            src="/assets/app-mockups.png"
            alt="AutoRenta App"
            style={{
              width: '100%',
              maxWidth: '600px',
              height: 'auto',
              filter: 'drop-shadow(0 20px 40px rgba(0,0,0,0.4))'
            }}
          />
        </div>

        {/* Right - Access Info */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* QR Code Placeholder */}
          <div style={{
            background: 'var(--bg-card)',
            border: '2px solid var(--accent-green)',
            borderRadius: '16px',
            padding: '32px',
            textAlign: 'center'
          }}>
            <p style={{
              fontSize: '16px',
              color: 'var(--accent-green)',
              marginBottom: '16px',
              fontWeight: '600',
              textTransform: 'uppercase',
              letterSpacing: '2px'
            }}>
              Escaneá para probar
            </p>

            {/* QR Placeholder */}
            <div style={{
              width: '180px',
              height: '180px',
              background: 'white',
              borderRadius: '12px',
              margin: '0 auto 16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '14px',
              color: '#333'
            }}>
              [QR CODE]
            </div>

            <p style={{ fontSize: '20px', color: 'var(--text-primary)', fontWeight: '600' }}>
              app.autorentar.com
            </p>
          </div>

          {/* Credentials */}
          <div style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border-subtle)',
            borderRadius: '12px',
            padding: '24px'
          }}>
            <p style={{
              fontSize: '14px',
              color: 'var(--text-muted)',
              marginBottom: '16px',
              textTransform: 'uppercase'
            }}>
              Credenciales Demo Inversor
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)' }}>Usuario:</span>
                <span style={{ color: 'var(--accent-green)', fontFamily: 'monospace', fontSize: '16px' }}>
                  investor@autorentar.com
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)' }}>Contraseña:</span>
                <span style={{ color: 'var(--accent-green)', fontFamily: 'monospace', fontSize: '16px' }}>
                  demo2026
                </span>
              </div>
            </div>
          </div>

          {/* What you can do */}
          <div style={{
            background: 'rgba(0,208,132,0.1)',
            border: '1px solid var(--accent-green)',
            borderRadius: '12px',
            padding: '20px'
          }}>
            <p style={{ fontSize: '14px', color: 'var(--accent-green)', marginBottom: '12px', fontWeight: '600' }}>
              ✓ QUÉ PODÉS HACER:
            </p>
            <ul style={{
              fontSize: '14px',
              color: 'var(--text-secondary)',
              lineHeight: 1.8,
              paddingLeft: '20px',
              margin: 0
            }}>
              <li>Navegar el Marketplace completo</li>
              <li>Simular una reserva end-to-end</li>
              <li>Ver la Billetera Virtual</li>
              <li>Explorar el Panel de Propietario</li>
            </ul>
          </div>
        </div>
      </div>
    </SlideLayout>
  );
}
