import React from 'react';
import { SlideLayout, SlideHeader } from '../components/SlideLayout';

export function Slide04Solucion() {
  const soluciones = [
    {
      num: '01',
      icon: '💰',
      problema: 'Sin tarjeta de crédito',
      solucion: 'Billetera Virtual',
      descripcion: 'Garantía en efectivo pre-depositada. Sin bancos, sin rechazos.',
      beneficio: 'Acceso universal',
      color: 'var(--accent-green)'
    },
    {
      num: '02',
      icon: '🔐',
      problema: '¿Puedo confiar?',
      solucion: 'Identidad Verificada por IA',
      descripcion: 'Selfie + DNI + Verificación biométrica obligatoria.',
      beneficio: '0% fraude de identidad',
      color: 'var(--accent-green)'
    },
    {
      num: '03',
      icon: '📹',
      problema: 'Disputas por daños',
      solucion: 'Video-Inspección 360°',
      descripcion: 'IA detecta daños automáticamente. Evidencia legal irrefutable.',
      beneficio: 'Resolución en 24h',
      color: 'var(--accent-green)'
    },
    {
      num: '04',
      icon: '📋',
      problema: '¿Cómo me protejo?',
      solucion: 'Contrato Digital Vinculante',
      descripcion: 'Comodato firmado digitalmente con validez legal completa.',
      beneficio: 'Protección jurídica',
      color: 'var(--accent-green)'
    }
  ];

  return (
    <SlideLayout>
      <SlideHeader
        title="La Solución: Confianza Sin Bancos"
        subtitle="4 pilares tecnológicos que reemplazan el puntaje crediticio."
      />

      {/* 4 Pillars Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        gap: '24px',
        marginTop: '48px'
      }}>
        {soluciones.map((s, i) => (
          <div key={i} style={{
            background: 'linear-gradient(180deg, var(--bg-card) 0%, rgba(0,208,132,0.05) 100%)',
            border: '1px solid var(--accent-green)',
            borderRadius: '16px',
            padding: '32px 24px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            textAlign: 'center',
            position: 'relative',
            overflow: 'hidden'
          }}>
            {/* Number Badge */}
            <div style={{
              position: 'absolute',
              top: '12px',
              left: '12px',
              fontSize: '14px',
              fontWeight: '700',
              color: 'var(--accent-green)',
              opacity: 0.5
            }}>
              {s.num}
            </div>

            {/* Icon */}
            <div style={{
              fontSize: '56px',
              marginBottom: '20px',
              filter: 'drop-shadow(0 4px 12px rgba(0,208,132,0.3))'
            }}>
              {s.icon}
            </div>

            {/* Problem (crossed out) */}
            <p style={{
              fontSize: '14px',
              color: 'var(--danger)',
              textDecoration: 'line-through',
              marginBottom: '12px',
              opacity: 0.7
            }}>
              {s.problema}
            </p>

            {/* Solution Title */}
            <h3 style={{
              fontSize: '22px',
              fontWeight: '700',
              color: 'var(--text-primary)',
              marginBottom: '12px',
              lineHeight: 1.2
            }}>
              {s.solucion}
            </h3>

            {/* Description */}
            <p style={{
              fontSize: '15px',
              color: 'var(--text-secondary)',
              lineHeight: 1.5,
              marginBottom: '20px',
              flex: 1
            }}>
              {s.descripcion}
            </p>

            {/* Benefit Badge */}
            <div style={{
              background: 'rgba(0, 208, 132, 0.15)',
              border: '1px solid var(--accent-green)',
              borderRadius: '100px',
              padding: '8px 16px',
              fontSize: '13px',
              fontWeight: '600',
              color: 'var(--accent-green)'
            }}>
              ✓ {s.beneficio}
            </div>
          </div>
        ))}
      </div>

      {/* Bottom Result */}
      <div style={{
        marginTop: '48px',
        display: 'flex',
        justifyContent: 'center',
        gap: '48px'
      }}>
        <div style={{
          background: 'var(--bg-secondary)',
          padding: '20px 40px',
          borderRadius: '12px',
          borderLeft: '4px solid var(--danger)',
          textAlign: 'center'
        }}>
          <p style={{ fontSize: '14px', color: 'var(--text-muted)', marginBottom: '4px' }}>ANTES</p>
          <p style={{ fontSize: '32px', fontWeight: '700', color: 'var(--danger)' }}>70%</p>
          <p style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>Rechazados</p>
        </div>

        <div style={{
          display: 'flex',
          alignItems: 'center',
          fontSize: '48px',
          color: 'var(--accent-green)'
        }}>
          →
        </div>

        <div style={{
          background: 'var(--bg-secondary)',
          padding: '20px 40px',
          borderRadius: '12px',
          borderLeft: '4px solid var(--accent-green)',
          textAlign: 'center'
        }}>
          <p style={{ fontSize: '14px', color: 'var(--text-muted)', marginBottom: '4px' }}>AHORA</p>
          <p style={{ fontSize: '32px', fontWeight: '700', color: 'var(--accent-green)' }}>100%</p>
          <p style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>Pueden Alquilar</p>
        </div>
      </div>
    </SlideLayout>
  );
}
