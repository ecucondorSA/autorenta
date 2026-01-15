import React from 'react';
import { SlideLayout, SlideHeader, Card } from '../components/SlideLayout';

export function Slide26Inversion() {
  const ronda = [
    'Autonomia: 18 meses.',
    'Objetivo: 100k+ Usuarios.',
    '',
    'USO DE FONDOS:',
    '50% Ingenieria (Escala Supabase + IA).',
    '30% Liquidez y Seguro (Fondo P2P).',
    '20% Crecimiento (Nodos WiFi).'
  ];

  const estrategia = [
    'PROBLEMA:',
    'Captar propietarios via Ads es caro (Costo Adquisicion > USD 15).',
    '',
    'SOLUCION (HACK):',
    'WiFi Gratis de alta velocidad en pasos fronterizos.',
    'Para conectar: Registro obligatorio de vehiculo.',
    '(Marca, Modelo, Año, DNI/Licencia).',
    '',
    'RESULTADO ESPERADO:',
    '100k+ perfiles pre-verificados (Ene-Mar).',
    'Conversion: Activacion automatica en alta demanda.',
    'Costo Adquisicion proyectado: < USD 0.50 por lead calificado.'
  ];

  return (
    <SlideLayout>
      <SlideHeader
        title="Oportunidad de Inversion"
        subtitle="Capital para escalar infraestructura y liquidez."
      />

      <p style={{
        fontSize: '24px',
        color: 'var(--text-secondary)',
        textAlign: 'center',
        marginBottom: '48px'
      }}>
        18 meses de autonomia para escalar a 100k+ usuarios
      </p>

      <div className="grid-2">
        <Card>
          <h3 style={{ fontSize: '24px', fontWeight: '700', marginBottom: '24px' }}>
            RONDA SEMILLA: USD 500k
          </h3>
          {ronda.map((r, i) => (
            <p key={i} style={{
              fontSize: '18px',
              color: r.startsWith('USO') ? 'var(--text-muted)' : 'var(--text-secondary)',
              marginBottom: '8px'
            }}>
              {r === '' ? <br /> : `· ${r}`}
            </p>
          ))}
        </Card>

        <Card>
          <h3 style={{ fontSize: '24px', fontWeight: '700', marginBottom: '24px' }}>
            ESTRATEGIA FRONTERA (Motor de Crecimiento)
          </h3>
          {estrategia.map((s, i) => (
            <p key={i} style={{
              fontSize: '16px',
              color: s.endsWith(':') ? 'var(--text-muted)' : 'var(--text-secondary)',
              marginBottom: '6px',
              fontWeight: s.endsWith(':') ? '600' : '400'
            }}>
              {s === '' ? <br /> : (s.endsWith(':') ? s : `· ${s}`)}
            </p>
          ))}
        </Card>
      </div>
    </SlideLayout>
  );
}
