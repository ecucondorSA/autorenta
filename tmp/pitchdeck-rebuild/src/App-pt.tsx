import React, { useState, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { LanguageProvider, useTranslations } from './LanguageContext';
import type { Language } from './translations';

// Importar todas as slides
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

const App = () => {
  const [currentSlide, setCurrentSlide] = useState(0);
  const { t } = useTranslations();
  const lang: Language = 'pt';

  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === ' ') {
        e.preventDefault();
        setCurrentSlide((prev) => Math.min(prev + 1, slides.length - 1));
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        setCurrentSlide((prev) => Math.max(prev - 1, 0));
      } else if (e.key === 'Home') {
        e.preventDefault();
        setCurrentSlide(0);
      } else if (e.key === 'End') {
        e.preventDefault();
        setCurrentSlide(slides.length - 1);
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, []);

  const CurrentSlideComponent = slides[currentSlide];

  return (
    <LanguageProvider lang={lang}>
      <div className="h-screen w-full overflow-hidden bg-black text-white flex items-center justify-center">
        <CurrentSlideComponent />
        
        <div className="fixed bottom-8 left-1/2 transform -translate-x-1/2 flex items-center gap-2 bg-black/50 px-4 py-2 rounded-full">
          <span className="text-sm opacity-75">{currentSlide + 1} / {slides.length}</span>
        </div>
        
        <button
          onClick={() => setCurrentSlide((prev) => Math.min(prev + 1, slides.length - 1))}
          className="fixed right-8 top-1/2 transform -translate-y-1/2 bg-white/10 hover:bg-white/20 px-4 py-2 rounded-l-lg transition-colors"
        >
          →
        </button>
        
        <button
          onClick={() => setCurrentSlide((prev) => Math.max(prev - 1, 0))}
          className="fixed left-8 top-1/2 transform -translate-y-1/2 bg-white/10 hover:bg-white/20 px-4 py-2 rounded-r-lg transition-colors"
        >
          ←
        </button>
      </div>
    </LanguageProvider>
  );
};

const root = createRoot(document.getElementById('root')!);
root.render(<App />);