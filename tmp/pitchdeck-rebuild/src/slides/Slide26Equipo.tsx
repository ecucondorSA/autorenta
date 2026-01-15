import React from 'react';
import { SlideLayout, SlideHeader } from '../components/SlideLayout';
import { useTranslations } from '../LanguageContext';

export function Slide26Equipo() {
  const { t } = useTranslations();
  const founders = [
    {
      name: 'EDUARDO MARQUES',
      title: 'CEO & Product Architect',
      img: '/assets/founder-edu.jpg',
      initials: null,
      linkedin: 'https://linkedin.com/in/eduardo-marques-b00739249',
      role: 'Producto & Tecnología (Full-stack). Ex-Fintech.',
      exp: 'Lideró la arquitectura de EcuCondor (Pagos).'
    },
    {
      name: 'CHARLIS REBOLLO',
      title: 'COO & Fleet Ops',
      img: null,
      initials: 'CR',
      linkedin: 'https://linkedin.com/in/charlis-rebollo',
      role: 'Operaciones & Logística.',
      exp: 'Gestión de siniestros y redes de talleres.'
    }
  ];

  return (
    <SlideLayout>
      <SlideHeader
        title={t('slide26.title')}
        subtitle={t('slide26.subtitle')}
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
              boxShadow: '0 0 20px var(--accent-green-dim)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: f.img ? 'transparent' : 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)'
            }}>
              {f.img ? (
                <img
                  src={f.img}
                  alt={f.name}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              ) : (
                <svg width="120" height="120" viewBox="0 0 24 24" fill="none" stroke="var(--accent-green)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="8" r="4" />
                  <path d="M4 20c0-4 4-6 8-6s8 2 8 6" />
                </svg>
              )}
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
              color: 'var(--text-secondary)',
              borderTop: '1px solid var(--border-subtle)',
              paddingTop: '16px',
              width: '100%',
              marginBottom: '20px'
            }}>
              {f.exp}
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', width: '100%' }}>
              {/* LinkedIn Link */}
              <a
                href={f.linkedin}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  padding: '8px 16px',
                  background: 'rgba(0, 208, 132, 0.1)',
                  border: '1px solid var(--accent-green)',
                  borderRadius: '20px',
                  color: 'var(--accent-green)',
                  textDecoration: 'none',
                  fontSize: '16px',
                  fontWeight: '600',
                  transition: 'all 0.3s ease'
                }}
                onMouseEnter={(e) => {
                  const el = e.currentTarget as HTMLAnchorElement;
                  el.style.background = 'rgba(0, 208, 132, 0.2)';
                  el.style.transform = 'translateY(-2px)';
                }}
                onMouseLeave={(e) => {
                  const el = e.currentTarget as HTMLAnchorElement;
                  el.style.background = 'rgba(0, 208, 132, 0.1)';
                  el.style.transform = 'translateY(0)';
                }}
              >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
              </svg>
              {t('slide26.linkedin')}
              </a>

              {/* Email para Eduardo */}
              {i === 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', alignItems: 'center' }}>
                  <a
                    href="mailto:eduardomarques@campus.fmed.uba.ar"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px',
                      padding: '6px 12px',
                      background: 'rgba(255, 255, 255, 0.05)',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: '12px',
                      color: 'var(--text-secondary)',
                      textDecoration: 'none',
                      fontSize: '13px',
                      fontWeight: '500',
                      transition: 'all 0.3s ease'
                    }}
                    onMouseEnter={(e) => {
                      const el = e.currentTarget as HTMLAnchorElement;
                      el.style.background = 'rgba(255, 255, 255, 0.1)';
                      el.style.borderColor = 'var(--accent-green)';
                    }}
                    onMouseLeave={(e) => {
                      const el = e.currentTarget as HTMLAnchorElement;
                      el.style.background = 'rgba(255, 255, 255, 0.05)';
                      el.style.borderColor = 'var(--border-subtle)';
                    }}
                  >
                    eduardomarques@campus.fmed.uba.ar
                  </a>
                  <a
                    href="mailto:autorentardev@gmail.com"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px',
                      padding: '6px 12px',
                      background: 'rgba(255, 255, 255, 0.05)',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: '12px',
                      color: 'var(--text-secondary)',
                      textDecoration: 'none',
                      fontSize: '13px',
                      fontWeight: '500',
                      transition: 'all 0.3s ease'
                    }}
                    onMouseEnter={(e) => {
                      const el = e.currentTarget as HTMLAnchorElement;
                      el.style.background = 'rgba(255, 255, 255, 0.1)';
                      el.style.borderColor = 'var(--accent-green)';
                    }}
                    onMouseLeave={(e) => {
                      const el = e.currentTarget as HTMLAnchorElement;
                      el.style.background = 'rgba(255, 255, 255, 0.05)';
                      el.style.borderColor = 'var(--border-subtle)';
                    }}
                  >
                    autorentardev@gmail.com
                  </a>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </SlideLayout>
  );
}
