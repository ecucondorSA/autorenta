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
        subtitle="4 pilares tecnológicos + FGO que garantizan cero riesgo para propietarios."
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

      {/* Business Model: FGO */}
      <div style={{
        marginTop: '64px',
        background: 'linear-gradient(135deg, rgba(0,208,132,0.1) 0%, rgba(0,208,132,0.05) 100%)',
        border: '2px solid rgba(0,208,132,0.3)',
        borderRadius: '20px',
        padding: '40px',
        position: 'relative'
      }}>
        {/* Title */}
        <div style={{
          textAlign: 'center',
          marginBottom: '32px'
        }}>
          <h2 style={{
            fontSize: '36px',
            fontWeight: '700',
            color: 'var(--accent-green)',
            marginBottom: '8px'
          }}>
            💰 FGO: Fondo Garantía Operativa
          </h2>
          <p style={{
            fontSize: '18px',
            color: 'var(--text-secondary)'
          }}>
            Modelo de negocio que garantiza cero riesgo para propietarios
          </p>
        </div>

        {/* FGO Components Grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: '24px',
          marginBottom: '40px'
        }}>
          {/* FGO Coverage */}
          <div style={{
            background: 'var(--bg-card)',
            padding: '24px',
            borderRadius: '12px',
            border: '1px solid var(--border-subtle)'
          }}>
            <h4 style={{
              fontSize: '20px',
              fontWeight: '700',
              color: 'var(--accent-green)',
              marginBottom: '12px'
            }}>
              1. Daños Menores
            </h4>
            <p style={{
              fontSize: '14px',
              color: 'var(--text-secondary)',
              lineHeight: '1.5',
              marginBottom: '12px'
            }}>
              < USD 500, franquicias de seguro, lucro cesante
            </p>
            <div style={{
              background: 'rgba(0,208,132,0.1)',
              padding: '8px 12px',
              borderRadius: '8px',
              fontSize: '12px',
              fontWeight: '600',
              color: 'var(--accent-green)'
            }}>
              Financiado: 10% reservas + Pool Propietarios
            </div>
          </div>

          {/* Insurance Coverage */}
          <div style={{
            background: 'var(--bg-card)',
            padding: '24px',
            borderRadius: '12px',
            border: '1px solid var(--border-subtle)'
          }}>
            <h4 style={{
              fontSize: '20px',
              fontWeight: '700',
              color: 'var(--accent-green)',
              marginBottom: '12px'
            }}>
              2. Robo Total & Destrucción
            </h4>
            <p style={{
              fontSize: '14px',
              color: 'var(--text-secondary)',
              lineHeight: '1.5',
              marginBottom: '12px'
            }}>
              Póliza madre (Partner) o póliza endosada del propietario
            </p>
            <div style={{
              background: 'rgba(0,208,132,0.1)',
              padding: '8px 12px',
              borderRadius: '8px',
              fontSize: '12px',
              fontWeight: '600',
              color: 'var(--accent-green)'
            }}>
              FGO cubre deducible → Propietario paga $0
            </div>
          </div>

          {/* Evidence System */}
          <div style={{
            background: 'var(--bg-card)',
            padding: '24px',
            borderRadius: '12px',
            border: '1px solid var(--border-subtle)'
          }}>
            <h4 style={{
              fontSize: '20px',
              fontWeight: '700',
              color: 'var(--accent-green)',
              marginBottom: '12px'
            }}>
              3. Evidencia Vinculante
            </h4>
            <p style={{
              fontSize: '14px',
              color: 'var(--text-secondary)',
              lineHeight: '1.5',
              marginBottom: '12px'
            }}>
              Video registro de entrada obligatorio. Sin video validado = responsabilidad total arrendatario
            </p>
            <div style={{
              background: 'rgba(0,208,132,0.1)',
              padding: '8px 12px',
              borderRadius: '8px',
              fontSize: '12px',
              fontWeight: '600',
              color: 'var(--accent-green)'
            }}>
              Blockchain/Server = Árbitro final
            </div>
          </div>
        </div>

        {/* Business Impact */}
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          gap: '48px',
          marginTop: '32px'
        }}>
          <div style={{
            background: 'var(--bg-secondary)',
            padding: '20px 40px',
            borderRadius: '12px',
            borderLeft: '4px solid var(--danger)',
            textAlign: 'center'
          }}>
            <p style={{ fontSize: '14px', color: 'var(--text-muted)', marginBottom: '4px' }}>SIN FGO</p>
            <p style={{ fontSize: '32px', fontWeight: '700', color: 'var(--danger)' }}>0%</p>
            <p style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>Propietarios</p>
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
            <p style={{ fontSize: '14px', color: 'var(--text-muted)', marginBottom: '4px' }}>CON FGO</p>
            <p style={{ fontSize: '32px', fontWeight: '700', color: 'var(--accent-green)' }}>100%</p>
            <p style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>Adopción</p>
          </div>
        </div>
      </div>
    </SlideLayout>
  );
}
