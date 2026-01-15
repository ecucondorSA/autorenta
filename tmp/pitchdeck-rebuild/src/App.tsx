import React, { useState, useEffect } from 'react';
import { createRoot } from 'react-dom/client';

// Importar todas las slides
import { Slide01Cover } from './slides/Slide01Cover';
import { Slide02Gancho } from './slides/Slide02Gancho';
import { Slide03Problema } from './slides/Slide03Problema';
import { Slide04Solucion } from './slides/Slide04Solucion';
import { Slide05Momento } from './slides/Slide05Timing';
import { Slide06Producto } from './slides/Slide06Producto';
import { Slide07Mercado } from './slides/Slide07Mercado';
import { Slide08ModosDeRiesgo } from './slides/Slide08FailureModes';
import { Slide09Economia } from './slides/Slide09Economics';
import { Slide10ProteccionRiesgo } from './slides/Slide10RiskPolicy';
import { Slide11ProductUI } from './slides/Slide11ProductUI';
import { Slide12Tecnologia } from './slides/Slide12Tecnologia';
import { Slide13Evidencia } from './slides/Slide13Evidencia';
import { Slide14EstrategiaMercado } from './slides/Slide14GTM';
import { Slide15Validacion } from './slides/Slide15Validation';
import { Slide16Estrategia } from './slides/Slide16Estrategia';
import { Slide17Crecimiento } from './slides/Slide17Crecimiento';
import { Slide18Vision } from './slides/Slide18Vision';
import { Slide19Metricas } from './slides/Slide19KPIs';
import { Slide20PlanMaestro } from './slides/Slide20MasterPlan';
import { Slide21Demostración } from './slides/Slide21Demo';
import { Slide22Competencia } from './slides/Slide22Competencia';
import { Slide23Crecimiento } from './slides/Slide23Growth';
import { Slide24Inversion } from './slides/Slide24Inversion';
import { Slide25Fintech } from './slides/Slide25Fintech';
import { Slide26Equipo } from './slides/Slide26Equipo';

const slides = [
  Slide01Cover,
  Slide02Gancho,
  Slide03Problema,
  Slide04Solucion,
  Slide05Momento,
  Slide06Producto,
  Slide07Mercado,
  Slide08ModosDeRiesgo,
  Slide09Economia,
  Slide10ProteccionRiesgo,
  Slide11ProductUI,
  Slide12Tecnologia,
  Slide13Evidencia,
  Slide14EstrategiaMercado,
  Slide15Validacion,
  Slide16Estrategia,
  Slide17Crecimiento,
  Slide18Vision,
  Slide19Metricas,
  Slide20PlanMaestro,
  Slide21Demostración,
  Slide22Competencia,
  Slide23Crecimiento,
  Slide24Inversion,
  Slide25Fintech,
  Slide26Equipo,
];

function App() {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === ' ') {
        setCurrentSlide((prev) => Math.min(prev + 1, slides.length - 1));
      } else if (e.key === 'ArrowLeft') {
        setCurrentSlide((prev) => Math.max(prev - 1, 0));
      } else if (e.key === 'Home') {
        setCurrentSlide(0);
      } else if (e.key === 'End') {
        setCurrentSlide(slides.length - 1);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const CurrentSlideComponent = slides[currentSlide];

  if (showAll) {
    return (
      <div id="all-slides" style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '0',
        background: 'var(--bg-primary)'
      }}>
        {slides.map((SlideComponent, index) => (
          <div key={index} className="slide-wrapper" data-slide={index + 1}>
            <SlideComponent />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div style={{
      width: '100vw',
      height: '100vh',
      overflow: 'hidden',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      background: '#000'
    }}>
      <div style={{
        transform: 'scale(0.5)',
        transformOrigin: 'center center'
      }}>
        <CurrentSlideComponent />
      </div>

      {/* Navegacion */}
      <div className="slide-nav">
        <button onClick={() => setCurrentSlide(0)}>⏮</button>
        <button onClick={() => setCurrentSlide((p) => Math.max(p - 1, 0))}>◀</button>
        <span className="slide-counter">{currentSlide + 1} / {slides.length}</span>
        <button onClick={() => setCurrentSlide((p) => Math.min(p + 1, slides.length - 1))}>▶</button>
        <button onClick={() => setCurrentSlide(slides.length - 1)}>⏭</button>
        <button onClick={() => setShowAll(true)} style={{ marginLeft: '16px' }}>📄 Todas</button>
      </div>
    </div>
  );
}

// Montar la app
const root = createRoot(document.getElementById('root')!);
root.render(<App />);

// Exportar array de slides para generacion de PDF
export { slides };
