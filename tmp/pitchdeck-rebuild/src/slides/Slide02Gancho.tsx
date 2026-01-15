import React from 'react';

export function Slide02Gancho() {
  return (
    <div className="slide" style={{
      padding: '80px',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center'
    }}>
      {/* Mensaje principal */}
      <div style={{ textAlign: 'center', marginBottom: '64px' }}>
        <p style={{
          fontSize: '24px',
          color: 'var(--danger)',
          fontWeight: '600',
          marginBottom: '16px',
          textTransform: 'uppercase',
          letterSpacing: '2px'
        }}>
          El Problema
        </p>
        <h1 style={{
          fontSize: '72px',
          fontWeight: '700',
          lineHeight: 1.1,
          marginBottom: '24px'
        }}>
          70% de Latinoamérica<br />
          <span style={{ color: 'var(--danger)' }}>No Puede Alquilar un Auto.</span>
        </h1>
        <p style={{
          fontSize: '28px',
          color: 'var(--text-secondary)',
          maxWidth: '900px',
          margin: '0 auto'
        }}>
          Las rentadoras exigen tarjetas de crédito con cupos de USD $2,000+
        </p>
      </div>

      {/* Comparación visual */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr auto 1fr',
        gap: '48px',
        alignItems: 'center',
        maxWidth: '1400px',
        margin: '0 auto'
      }}>
        {/* Lado izquierdo - Rechazados */}
        <div style={{
          background: 'var(--bg-card)',
          border: '2px solid var(--danger)',
          borderRadius: '16px',
          padding: '40px',
          textAlign: 'center'
        }}>
          <div style={{
            fontSize: '80px',
            marginBottom: '16px'
          }}>🚫</div>
          <p style={{
            fontSize: '48px',
            fontWeight: '700',
            color: 'var(--danger)',
            marginBottom: '8px'
          }}>70%</p>
          <p style={{
            fontSize: '20px',
            color: 'var(--text-secondary)',
            marginBottom: '16px'
          }}>Rechazados por el Sistema</p>
          <div style={{
            fontSize: '14px',
            color: 'var(--text-muted)',
            lineHeight: 1.6
          }}>
            <p>• Sin tarjeta de crédito internacional</p>
            <p>• Sin historial crediticio</p>
            <p>• Trabajadores informales</p>
          </div>
        </div>

        {/* Flecha central */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '16px'
        }}>
          <div style={{
            width: '80px',
            height: '80px',
            background: 'var(--accent-green)',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '36px',
            fontWeight: '700',
            color: 'var(--bg-primary)'
          }}>→</div>
          <p style={{
            fontSize: '18px',
            color: 'var(--accent-green)',
            fontWeight: '600',
            textAlign: 'center'
          }}>AutoRenta<br />los desbloquea</p>
        </div>

        {/* Lado derecho - Oportunidad */}
        <div style={{
          background: 'var(--bg-card)',
          border: '2px solid var(--accent-green)',
          borderRadius: '16px',
          padding: '40px',
          textAlign: 'center'
        }}>
          <div style={{
            fontSize: '80px',
            marginBottom: '16px'
          }}>✓</div>
          <p style={{
            fontSize: '48px',
            fontWeight: '700',
            color: 'var(--accent-green)',
            marginBottom: '8px'
          }}>3x TAM</p>
          <p style={{
            fontSize: '20px',
            color: 'var(--text-secondary)',
            marginBottom: '16px'
          }}>Mercado Desbloqueado</p>
          <div style={{
            fontSize: '14px',
            color: 'var(--text-muted)',
            lineHeight: 1.6
          }}>
            <p>• Garantía en efectivo (Billetera)</p>
            <p>• Verificación biométrica</p>
            <p>• Contrato digital instantáneo</p>
          </div>
        </div>
      </div>

      <div className="diamond" />
    </div>
  );
}
