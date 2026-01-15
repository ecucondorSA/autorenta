import React from 'react';
import { SlideLayout, SlideHeader } from '../components/SlideLayout';
import { useTranslations } from '../LanguageContext';

export function Slide04Solucion() {
  const { t } = useTranslations();
  const soluciones = [
    {
      num: '01',
      icon: (
        <svg width="56" height="56" viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="12" r="10" stroke="#00D084" strokeWidth="2"/>
          <path d="M12 6V18M8 10H16M8 14H16" stroke="#00D084" strokeWidth="2" strokeLinecap="round"/>
        </svg>
      ),
      problema: t('slide04Solucion.pilar1.problema'),
      solucion: t('slide04Solucion.pilar1.solucion'),
      descripcion: t('slide04Solucion.pilar1.descripcion'),
      beneficio: t('slide04Solucion.pilar1.beneficio'),
      color: 'var(--accent-green)'
    },
    {
      num: '02',
      icon: (
        <svg width="56" height="56" viewBox="0 0 24 24" fill="none">
          <rect x="5" y="11" width="14" height="10" rx="2" stroke="#00D084" strokeWidth="2"/>
          <path d="M8 11V7C8 4.79086 9.79086 3 12 3C14.2091 3 16 4.79086 16 7V11" stroke="#00D084" strokeWidth="2"/>
          <circle cx="12" cy="16" r="1.5" fill="#00D084"/>
        </svg>
      ),
      problema: t('slide04Solucion.pilar2.problema'),
      solucion: t('slide04Solucion.pilar2.solucion'),
      descripcion: t('slide04Solucion.pilar2.descripcion'),
      beneficio: t('slide04Solucion.pilar2.beneficio'),
      color: 'var(--accent-green)'
    },
    {
      num: '03',
      icon: (
        <svg width="56" height="56" viewBox="0 0 24 24" fill="none">
          <rect x="3" y="5" width="18" height="14" rx="2" stroke="#00D084" strokeWidth="2"/>
          <circle cx="12" cy="12" r="3" stroke="#00D084" strokeWidth="2"/>
          <circle cx="12" cy="12" r="1" fill="#00D084"/>
        </svg>
      ),
      problema: t('slide04Solucion.pilar3.problema'),
      solucion: t('slide04Solucion.pilar3.solucion'),
      descripcion: t('slide04Solucion.pilar3.descripcion'),
      beneficio: t('slide04Solucion.pilar3.beneficio'),
      color: 'var(--accent-green)'
    },
    {
      num: '04',
      icon: (
        <svg width="56" height="56" viewBox="0 0 24 24" fill="none">
          <rect x="4" y="3" width="16" height="18" rx="2" stroke="#00D084" strokeWidth="2"/>
          <path d="M8 8H16M8 12H16M8 16H13" stroke="#00D084" strokeWidth="2" strokeLinecap="round"/>
        </svg>
      ),
      problema: t('slide04Solucion.pilar4.problema'),
      solucion: t('slide04Solucion.pilar4.solucion'),
      descripcion: t('slide04Solucion.pilar4.descripcion'),
      beneficio: t('slide04Solucion.pilar4.beneficio'),
      color: 'var(--accent-green)'
    }
  ];

  return (
    <SlideLayout>
      <SlideHeader
        title={t('slide04Solucion.title')}
        subtitle={t('slide04Solucion.subtitle')}
      />

      {/* 4 Pillars Grid - Compact */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        gap: '10px',
        marginTop: '20px',
        maxWidth: '1350px',
        margin: '20px auto 0',
        width: '100%'
      }}>
        {soluciones.map((s, i) => (
          <div key={i} style={{
            background: 'linear-gradient(180deg, var(--bg-card) 0%, rgba(0,208,132,0.05) 100%)',
            border: '1px solid var(--accent-green)',
            borderRadius: '10px',
            padding: '18px 12px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            textAlign: 'center',
            position: 'relative',
            overflow: 'hidden',
            maxWidth: '100%'
          }}>
            {/* Number Badge */}
            <div style={{
              position: 'absolute',
              top: '8px',
              left: '8px',
              fontSize: '11px',
              fontWeight: '700',
              color: 'var(--accent-green)',
              opacity: 0.5
            }}>
              {s.num}
            </div>

            {/* Icon */}
            <div style={{
              marginBottom: '10px',
              filter: 'drop-shadow(0 4px 12px rgba(0,208,132,0.3))'
            }}>
              {s.icon}
            </div>

            {/* Problem (crossed out) */}
            <p style={{
              fontSize: '12px',
              color: 'var(--danger)',
              textDecoration: 'line-through',
              marginBottom: '8px',
              opacity: 0.7
            }}>
              {s.problema}
            </p>

            {/* Solution Title */}
            <h3 style={{
              fontSize: '15px',
              fontWeight: '700',
              color: 'var(--text-primary)',
              marginBottom: '6px',
              lineHeight: 1.1,
              wordBreak: 'break-word',
              hyphens: 'auto'
            }}>
              {s.solucion}
            </h3>

            {/* Description */}
            <p style={{
              fontSize: '12px',
              color: 'var(--text-secondary)',
              lineHeight: 1.4,
              marginBottom: '12px',
              flex: 1,
              wordWrap: 'break-word',
              overflowWrap: 'break-word'
            }}>
              {s.descripcion}
            </p>

            {/* Benefit Badge */}
            <div style={{
              background: 'rgba(0, 208, 132, 0.15)',
              border: '1px solid var(--accent-green)',
              borderRadius: '100px',
              padding: '4px 10px',
              fontSize: '10px',
              fontWeight: '600',
              color: 'var(--accent-green)',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              maxWidth: '100%'
            }}>
              ✓ {s.beneficio}
            </div>
          </div>
        ))}
      </div>

      {/* Business Model: FGO - Compact */}
      <div style={{
        marginTop: '25px',
        background: 'linear-gradient(135deg, rgba(0,208,132,0.1) 0%, rgba(0,208,132,0.05) 100%)',
        border: '2px solid rgba(0,208,132,0.3)',
        borderRadius: '16px',
        padding: '20px',
        position: 'relative',
        maxWidth: '1350px',
        margin: '25px auto 0',
        width: '100%'
      }}>
        {/* Title */}
        <div style={{
          textAlign: 'center',
          marginBottom: '16px'
        }}>
          <h2 style={{
            fontSize: '24px',
            fontWeight: '700',
            color: 'var(--accent-green)',
            marginBottom: '4px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '10px'
          }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="10" stroke="#00D084" strokeWidth="2"/>
              <path d="M12 6V18M8 10H16M8 14H16" stroke="#00D084" strokeWidth="2" strokeLinecap="round"/>
            </svg>
             {t('slide04Solucion.fgo.title')}
           </h2>
           <p style={{
             fontSize: '14px',
             color: 'var(--text-secondary)'
           }}>
             {t('slide04Solucion.fgo.subtitle')}
          </p>
        </div>

        {/* FGO Components Grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: '12px',
          marginBottom: '16px'
        }}>
          {/* FGO Coverage */}
          <div style={{
            background: 'var(--bg-card)',
            padding: '12px',
            borderRadius: '10px',
            border: '1px solid var(--border-subtle)',
            maxWidth: '100%'
          }}>
            <h4 style={{
              fontSize: '15px',
              fontWeight: '700',
              color: 'var(--accent-green)',
              marginBottom: '8px'
            }}>
              {t('slide04Solucion.fgo.cobertura1.title')}
            </h4>
            <p style={{
              fontSize: '12px',
              color: 'var(--text-secondary)',
              lineHeight: '1.4',
              marginBottom: '8px'
            }}>
              {t('slide04Solucion.fgo.cobertura1.desc')}
            </p>
            <div style={{
              background: 'rgba(0,208,132,0.1)',
              padding: '6px 8px',
              borderRadius: '6px',
              fontSize: '9px',
              fontWeight: '600',
              color: 'var(--accent-green)'
            }}>
              {t('slide04Solucion.fgo.cobertura1.financiamiento')}
            </div>
          </div>

          {/* Insurance Coverage */}
          <div style={{
            background: 'var(--bg-card)',
            padding: '12px',
            borderRadius: '10px',
            border: '1px solid var(--border-subtle)',
            maxWidth: '100%'
          }}>
            <h4 style={{
              fontSize: '15px',
              fontWeight: '700',
              color: 'var(--accent-green)',
              marginBottom: '8px'
            }}>
              {t('slide04Solucion.fgo.cobertura2.title')}
            </h4>
            <p style={{
              fontSize: '12px',
              color: 'var(--text-secondary)',
              lineHeight: '1.4',
              marginBottom: '8px'
            }}>
              {t('slide04Solucion.fgo.cobertura2.desc')}
            </p>
            <div style={{
              background: 'rgba(0,208,132,0.1)',
              padding: '6px 8px',
              borderRadius: '6px',
              fontSize: '9px',
              fontWeight: '600',
              color: 'var(--accent-green)'
            }}>
              {t('slide04Solucion.fgo.cobertura2.financiamiento')}
            </div>
          </div>

          {/* Evidence System */}
          <div style={{
            background: 'var(--bg-card)',
            padding: '12px',
            borderRadius: '10px',
            border: '1px solid var(--border-subtle)',
            maxWidth: '100%'
          }}>
            <h4 style={{
              fontSize: '15px',
              fontWeight: '700',
              color: 'var(--accent-green)',
              marginBottom: '8px'
            }}>
              {t('slide04Solucion.fgo.cobertura3.title')}
            </h4>
            <p style={{
              fontSize: '12px',
              color: 'var(--text-secondary)',
              lineHeight: '1.4',
              marginBottom: '8px'
            }}>
              {t('slide04Solucion.fgo.cobertura3.desc')}
            </p>
            <div style={{
              background: 'rgba(0,208,132,0.1)',
              padding: '6px 8px',
              borderRadius: '6px',
              fontSize: '9px',
              fontWeight: '600',
              color: 'var(--accent-green)'
            }}>
              {t('slide04Solucion.fgo.cobertura3.financiamiento')}
            </div>
          </div>
        </div>

        {/* Business Impact - Compact */}
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          gap: '24px',
          marginTop: '12px',
          alignItems: 'center'
        }}>
          <div style={{
            background: 'var(--bg-secondary)',
            padding: '12px 24px',
            borderRadius: '10px',
            borderLeft: '4px solid var(--danger)',
            textAlign: 'center',
            minWidth: '120px'
          }}>
            <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '2px' }}>{t('slide04Solucion.fgo.sinFgo')}</p>
            <p style={{ fontSize: '24px', fontWeight: '700', color: 'var(--danger)' }}>0%</p>
            <p style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{t('slide04Solucion.fgo.owners')}</p>
          </div>

          <div style={{
            fontSize: '28px',
            color: 'var(--accent-green)',
            fontWeight: '700'
          }}>
            →
          </div>

          <div style={{
            background: 'var(--bg-secondary)',
            padding: '12px 24px',
            borderRadius: '10px',
            borderLeft: '4px solid var(--accent-green)',
            textAlign: 'center',
            minWidth: '120px'
          }}>
            <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '2px' }}>{t('slide04Solucion.fgo.conFgo')}</p>
            <p style={{ fontSize: '24px', fontWeight: '700', color: 'var(--accent-green)' }}>100%</p>
            <p style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{t('slide04Solucion.fgo.adoption')}</p>
          </div>
        </div>
      </div>
    </SlideLayout>
  );
}
