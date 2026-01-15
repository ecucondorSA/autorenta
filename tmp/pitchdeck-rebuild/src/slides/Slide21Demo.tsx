import React from 'react';
import { SlideLayout, SlideHeader, Card } from '../components/SlideLayout';

export function Slide21Demostración() {
  const alcance = [
    'Navegacion completa del Marketplace.',
    'Simulacion de Reserva (End-to-End).',
    'Visualizacion de Billetera Virtual y Carga de Saldo (Demostración).',
    'Acceso a Panel de Control de Propietario (Vista Solo Lectura).'
  ];

  const restricciones = [
    'Pagos reales deshabilitados (Mode Entorno de Pruebas).',
    'Datos personales anonimizados.',
    'Publicacion de vehiculos bloqueada.',
    'Sin acceso a contratos legales vinculantes.'
  ];

  return (
    <SlideLayout>
      <SlideHeader
        title="Acceso Demostración Inversor (Entorno de Pruebas)"
        subtitle="Due diligence tecnica habilitada sin riesgo."
      />

      <div className="grid-2" style={{ marginTop: '64px' }}>
        <Card accent>
          <div className="section-header">CREDENCIALES DE ACCESO</div>
          <div className="flex-col gap-24" style={{ marginTop: '24px' }}>
            <p style={{ fontSize: '22px' }}>
              <span style={{ color: 'var(--text-muted)' }}>URL: </span>
              app.autorentar.com/demo
            </p>
            <p style={{ fontSize: '22px' }}>
              <span style={{ color: 'var(--text-muted)' }}>User: </span>
              investor@autorentar.com
            </p>
            <p style={{ fontSize: '22px' }}>
              <span style={{ color: 'var(--text-muted)' }}>Pass: </span>
              demo2026
            </p>
          </div>
        </Card>

        <div className="flex-col gap-24">
          <Card>
            <div className="section-header" style={{ color: 'var(--accent-green)' }}>
              QUE PUEDES HACER (ALCANCE):
            </div>
            <ul className="list">
              {alcance.map((a, i) => <li key={i}>{a}</li>)}
            </ul>
          </Card>

          <Card>
            <div className="section-header" style={{ color: 'var(--danger)' }}>
              RESTRICCIONES DE SEGURIDAD:
            </div>
            <ul className="list">
              {restricciones.map((r, i) => <li key={i}>{r}</li>)}
            </ul>
          </Card>
        </div>
      </div>
    </SlideLayout>
  );
}
