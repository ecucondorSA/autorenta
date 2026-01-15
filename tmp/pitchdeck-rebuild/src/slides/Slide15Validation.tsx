import React from 'react';
import { SlideLayout, SlideHeader, Card, Metric } from '../components/SlideLayout';
import { useTranslations } from '../LanguageContext';

export function Slide15Validacion() {
  const { t } = useTranslations();
  const metrics = [
    { label: t('slide15.metric1Label'), value: t('slide15.metric1Value'), desc: 'Usuarios orgánicos solicitando acceso (Organic Pull).' },
    { label: t('slide15.metric2Label'), value: t('slide15.metric2Value'), desc: "Tasa de usuarios que superan el 'Barrera Biométrica' biométrico.", yellow: true },
    { label: t('slide15.metric3Label'), value: t('slide15.metric3Value'), desc: 'Usuarios bloqueados preventivamente (Fraude evitado).', danger: true },
    { label: t('slide15.metric4Label'), value: t('slide15.metric4Value'), desc: 'Tiempo de respuesta del Libro Contable en pruebas de carga.' }
  ];

  return (
    <SlideLayout>
      <SlideHeader
        title={t('slide15.title')}
        subtitle={t('slide15.subtitle')}
      />

      <div className="flex-col gap-32" style={{ marginTop: '48px' }}>
        {metrics.map((m, i) => (
          <div key={i} className="grid-2" style={{ alignItems: 'center' }}>
            <Card>
              <span style={{ fontSize: '14px', color: 'var(--text-muted)', display: 'block', marginBottom: '8px' }}>
                {m.label}
              </span>
              <span style={{
                fontSize: '56px',
                fontWeight: '700',
                color: m.danger ? 'var(--danger)' : (m.yellow ? 'var(--accent-yellow)' : 'var(--accent-green)')
              }}>
                {m.value}
              </span>
            </Card>
            <p style={{ fontSize: '22px', color: 'var(--text-secondary)' }}>
              {m.desc}
            </p>
          </div>
        ))}
      </div>

      <div style={{ marginTop: '32px' }}>
        <div className="section-header" style={{ color: 'var(--accent-yellow)' }}>
          INFRAESTRUCTURA LISTA (LOIS)
        </div>
        <p style={{ fontSize: '20px', color: 'var(--text-secondary)' }}>
          · Integracion KYC/Biometria: COMPLETADA.
        </p>
      </div>
    </SlideLayout>
  );
}
