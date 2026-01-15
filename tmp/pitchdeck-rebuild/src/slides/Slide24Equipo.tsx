import React from 'react';
import { SlideLayout, SlideHeader } from '../components/SlideLayout';

export function Slide24Equipo() {
  const founders = [
    {
      name: 'EDUARDO MARQUES',
      title: 'CEO & Product Architect',
      img: '/assets/founder-edu.jpg',
      role: 'Producto & Tecnología (Full-stack). Ex-Fintech.',
      exp: 'Lideró la arquitectura de EcuCondor (Pagos).'
    },
    {
      name: 'CHARLES REBOLLO',
      title: 'COO & Fleet Ops',
      img: '/assets/founder-charles.jpg',
      role: 'Operaciones & Logística.',
      exp: 'Gestión de siniestros y redes de talleres.'
    }
  ];

  return (
    <SlideLayout>
      <SlideHeader
        title="El Equipo (Founders)"
        subtitle="Ejecución probada en Fintech y Movilidad."
      />

      <div style={{
        display: 'flex',
        gap: '60px',
        marginTop: '80px',
        justifyContent: 'center'
      }}>
        {founders.map((f, i) => (
          <div key={i} style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border-subtle)',
            borderRadius: '24px',
            padding: '40px',
            width: '450px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            textAlign: 'center',
            boxShadow: '0 20px 40px rgba(0,0,0,0.2)'
          }}>
            {/* Avatar */}
            <div style={{
              width: '180px',
              height: '180px',
              borderRadius: '50%',
              overflow: 'hidden',
              marginBottom: '32px',
              border: '4px solid var(--accent-green)',
              boxShadow: '0 0 20px var(--accent-green-dim)'
            }}>
              <img 
                src={f.img} 
                alt={f.name}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            </div>

            {/* Content */}
            <h3 style={{ 
              fontSize: '32px', 
              fontWeight: '700',
              marginBottom: '8px',
              color: 'var(--text-primary)'
            }}>
              {f.name}
            </h3>
            
            <div style={{
              fontSize: '18px',
              color: 'var(--accent-green)',
              fontWeight: '600',
              marginBottom: '24px',
              letterSpacing: '1px',
              textTransform: 'uppercase'
            }}>
              {f.title}
            </div>
            
            <p style={{ 
              fontSize: '20px', 
              color: 'var(--text-secondary)',
              lineHeight: '1.5',
              marginBottom: '16px'
            }}>
              {f.role}
            </p>
            
            <p style={{ 
              fontSize: '18px', 
              color: 'var(--text-muted)',
              borderTop: '1px solid var(--border-subtle)',
              paddingTop: '16px',
              width: '100%'
            }}>
              {f.exp}
            </p>
          </div>
        ))}
      </div>
    </SlideLayout>
  );
}
