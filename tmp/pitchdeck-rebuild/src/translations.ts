export type Language = 'es' | 'pt';

export const translations = {
  es: {
    // Slide 01 - Cover
    slide01: {
      title: "El Activo Más Ineficiente del Mundo.",
      subtitle1: "Tasa de Uso: < 5%",
      subtitle2: "La propiedad vehicular es un error financiero para la clase media:",
      subtitle3: "Un pasivo de $20k depreciándose el 95% del tiempo.",
      footer: "ARGENTINA | 2026"
    },

    // Slide 02 - Gancho
    slide02: {
      title: "El Problema de Movilidad de la Clase Media",
      subtitle: "3 opciones, todas defectuosas:",
      option1: "PROPIO",
      option1Desc: "US$20k inicial\nDeprecia 20%/año\nUso <5%\nSeguro + Patente + Garage",
      option2: "ALQUILAR",
      option2Desc: "US$80/día (turista)\nUS$1200/mes (largo plazo)\nSin kilometraje ilimitado",
      option3: "REMIS",
      option3Desc: "US$3/km (Uber/Bolt)\nUS$900/mes promedio\nSin privacidad ni flexibilidad",
      highlight: "NADIE OFRECE FLEXIBILIDAD + BAJO COSTO"
    },

    // Slide 03 - Problema
    slide03: {
      title: "El Problema: Espacios Muertos + Alta Fricción",
      subtitle: "La propiedad vehicular es ineficiente en tres dimensiones:",
      point1Title: "USO TEMPORAL",
      point1Desc: "Ocupado 5% del tiempo, estacionado 95%",
      point2Title: "COSTO FINANCIERO",
      point2Desc: "US$20k depreciándose mientras no se usa",
      point3Title: "FRICTION",
      point3Desc: "Seguro, patente, garaje, mantenimiento"
    },

    // Slide 04 - Solución
    slide04: {
      title: "Solución: Movilidad como Servicio",
      subtitle: "Autorenta: Carsharing descentralizado con gestión de flotas P2P",
      concept: "CONCEPTO",
      conceptDesc: "Conectar propietarios de autos ociosos con conductores que necesitan movilidad flexible.",
      features: "CARACTERÍSTICAS",
      feature1Title: "DESCENTRALIZADO",
      feature1Desc: "Sin garajes costosos. Los autos están donde están los propietarios.",
      feature2Title: "GARANTÍA BIOMÉTRICA",
      feature2Desc: "Validación facial para prevenir fraudes y asegurar devolución.",
      feature3Title: "SEGURO INTEGRADO",
      feature3Desc: "Cobertura completa para propietarios y conductores.",
      feature4Title: "RUTAS FLEXIBLES",
      feature4Desc: "Retiro y devolución en puntos de la comunidad."
    },

    // Slide 03 - Problema (Confianza)
    slide03Problema: {
      title: "CONFIANZA.",
      subtitle: "El cuello de botella es la confianza.",
      description: "Las plataformas P2P actuales fallan porque no pueden garantizar seguridad.",
      question1: "¿Me robarán el auto?",
      question2: "¿Quién paga los daños?",
      question3: "¿Qué pasa si mienten?",
      bottomText: "Sin una solución tecnológica al",
      bottomHighlight: "Miedo",
      bottomEnd: ", el mercado no escala."
    },

    // Slide 04 - Solución (Confianza)
    slide04Solucion: {
      title: "La Solución: Confianza Sin Bancos",
      subtitle: "4 pilares tecnológicos + FGO que garantizan cero riesgo para propietarios.",
      pilar1: {
        problema: "Sin tarjeta de crédito",
        solucion: "Billetera Virtual",
        descripcion: "Garantía en efectivo pre-depositada. Sin bancos, sin rechazos.",
        beneficio: "Acceso universal"
      },
      pilar2: {
        problema: "¿Puedo confiar?",
        solucion: "Identidad Verificada por IA",
        descripcion: "Selfie + DNI + Verificación biométrica obligatoria.",
        beneficio: "0% fraude de identidad"
      },
      pilar3: {
        problema: "Disputas por daños",
        solucion: "Video-Inspección 360°",
        descripcion: "IA detecta daños automáticamente. Evidencia legal irrefutable.",
        beneficio: "Resolución en 24h"
      },
      pilar4: {
        problema: "¿Cómo me protego?",
        solucion: "Contrato Digital Vinculante",
        descripcion: "Comodato firmado digitalmente con validez legal completa.",
        beneficio: "Protección jurídica"
      },
      fgo: {
        title: "FGO: Fondo Garantía Operativa",
        subtitle: "Modelo de negocio que garantiza cero riesgo para propietarios",
        cobertura1: {
          title: "1. Daños Menores",
          desc: "Cubre: Daños menores (< USD 500), franquicias y lucro cesante.",
          financiamiento: "10% de cada reserva + Aportes de Propietarios"
        },
        cobertura2: {
          title: "2. Robo Total",
          desc: "Cubre: Póliza de Seguro Madre o del Propietario (endosada).",
          financiamiento: "FGO cubre el deducible para que el propietario no paga."
        },
        cobertura3: {
          title: "3. Evidencia",
          desc: "Sin video de registro validado, arrendatario asume responsabilidad.",
          financiamiento: "Evidencia en Blockchain/Server actúa como árbitro final."
        },
        sinFgo: "SIN FGO",
        conFgo: "CON FGO",
        adoption: "Adopción",
        owners: "Propietarios"
      }
    },

    // Slide 23 - Crecimiento (Frontera)
    slide23: {
      title: "Crecimiento: Adquisición de Bajo Costo",
      subtitle: "Validación del experimento 'Frontera WiFi'.",
      funnelTitle: "EMBUDO MATEMÁTICO (1 NODO / MES)",
      funnel1: "Trafico Potencial (Paso Fronterizo)",
      funnel1Value: "3,000 / dia · 90,000 / mes",
      funnel2: "Adopcion WiFi (Opt-in 10%)",
      funnel2Value: "9,000 usuarios / mes",
      funnel3: "Conversion a Registro (15%)",
      funnel3Value: "1,350 nuevos perfiles",
      funnel4: "Verificados (Barrera Biométrica 45%)",
      funnel4Value: "607 usuarios listos para reservar",
      cac: "CAC Proyectado: < USD 0.50 por usuario verificado",
      scalable: "Escalable mediante replicación de nodos en LatAm."
    },

    // Slide 05 - Timing
    slide05: {
      title: "¿Por Qué Ahora?",
      subtitle: "3 factores macro convergen en una tormenta perfecta de oportunidad.",
      cronologia: "Cronología de la Oportunidad",
      factor1Title: "Crisis & Inflación",
      factor1Stat: "200%+",
      factor1StatLabel: "Inflación anual",
      factor1Desc: "El auto parado es un pasivo costoso. Alquilarlo genera USD $200-400/mes.",
      factor2Title: "Exclusión Financiera",
      factor2Stat: "70%",
      factor2StatLabel: "Sin tarjeta crédito",
      factor2Desc: "Rentadoras tradicionales rechazan al 70%. Mercado cautivo masivo.",
      factor3Title: "Madurez Digital",
      factor3Stat: "<$0.01",
      factor3StatLabel: "Costo validación",
      factor3Desc: "IA, Biometría y Smart Contracts permiten operar sin sucursales físicas.",
      timeline2024Label: "Supply Surge",
      timeline2024Sub: "Crisis = Owners buscan renta",
      timeline2025Label: "Tech Enabled",
      timeline2025Sub: "IA reduce costos operativos",
      timeline2026Label: "Mass Adoption",
      timeline2026Sub: "Cambio cultural Ownership → Access"
    },

    // Slide 06 - Producto
    slide06: {
      title: "Producto (Flujo 100% Digital)",
      subtitle: "Una experiencia premium diseñada para la confianza y la velocidad.",
      step1Name: "ENCUENTRA",
      step1Desc: "Mapa interactivo en tiempo real con filtros avanzados.",
      step2Name: "RESERVA",
      step2Desc: "Pago seguro, depósito pre-autorizado sin fricción.",
      step3Name: "CHECK-IN",
      step3Desc: "Validación de identidad y video-inspección con IA.",
      step4Name: "DEVUELVE",
      step4Desc: "Cierre de contrato instantáneo y liberación de garantía.",
      badge1: "100% Mobile",
      badge2: "Zero Paperwork",
      badge3: "Instant Access"
    },

    // Slide 07 - Mercado
    slide07: {
      title: "Mercado (TAM / SAM / SOM)",
      subtitle: "Oportunidad real en Argentina con expansión LATAM.",
      foco1: "USD $84B en activos depreciándose diariamente por falta de uso.",
      foco2: "BA + CABA: 8.44M vehículos activos (DNRPA) - promedio $10k USD.",
      foco3: "LATAM car-sharing crece 22.7% CAGR 2024-2030.",
      foco4: "Viento de cola macro: clase media busca ingresos extra en 2026.",
      tam: "TAM (ARG)",
      tamValue: "USD 989M",
      sam: "SAM (CABA+GBA)",
      samValue: "USD 361M",
      som: "SOM (Año 1)",
      somValue: "USD 3.6M",
      porQueAhora: "POR QUÉ AHORA",
      fuente: "Fuente: Estimaciones internas DNRPA, Statista 2024"
    },

    // Slide 08 - Failure Modes
    slide08: {
      title: "Modos de Fallo del Mercado · Requisitos de Diseño",
      subtitle: "Aprendizaje de los pioneros en LatAm para asegurar escala.",
      modosFalloTitle: "MODOS DE FALLO (CASO BRASIL)",
      requisitosTitle: "REQUISITOS DE DISEÑO AUTORENTA",
      fallo1Title: "1. Access Restriccion (Acceso)",
      fallo1Desc: "Dependencia de tarjetas de credito con cupo alto. Limito el TAM real a solo la población bancarizada.",
      solucion1Title: "1. Inclusion Financiera",
      solucion1Desc: "Billetera Virtual propia + FGO (Fondo de Garantía Operativa). Desbloquea demanda masiva sin riesgo crediticio.",
      fallo2Title: "2. Autonomia Restriccion (Caja)",
      fallo2Desc: "Modelo de alto tasa de quema esperando liquidez organica. Cierres por falta de capital antes de lograr densidad.",
      solucion2Title: "2. Rentabilidad Unitaria",
      solucion2Desc: "Modelo diseñado para MC positivo desde reserva #1. Crecimiento organico eficiente y escalable.",
      fallo3Title: "3. Ops Restriccion (Operacion)",
      fallo3Desc: "Verificación manual y disputas subjetivas. Unit Economia negativos por costo de soporte humano.",
      solucion3Title: "3. Sistema de Confianza Automatizado",
      solucion3Desc: "Biometria + Evidencia Video + IA. Soporte y riesgo automatizado (Costo marginal ~0)."
    },

    // Slide 09 - Economics
    slide09: {
      title: "Unit Economics",
      subtitle: "Modelo rentable desde la primera transacción.",
      desglose: "Desglose por Transacción",
      ticketPromedio: "Ticket Promedio (AOV)",
      takeRate: "Take Rate (15%)",
      fgoPool: "FGO Pool (10%)",
      pspSoporte: "PSP + Soporte",
      margenNeto: "MARGEN NETO",
      rentableDay1: "✓ Rentable desde Day 1",
      metricasClave: "Métricas Clave",
      takeRateReal: "Take Rate Real",
      takeRateRealDesc: "Variable por tipo de auto y duración (10-20%). Promedio 15%.",
      paybackMeses: "Payback",
      paybackDesc: "Retorno de inversión por vehículo en 12 meses.",
      ltv: "LTV",
      ltvDesc: "Lifetime Value por vehículo en 3 años (promedio 10 reservas/mes)."
    },

    // Slide 10 - Risk Policy
    slide10: {
      title: "Política de Riesgo y Cobertura (Sistema de Confianza)",
      subtitle: "Reglas claras: qué cubre el FGO y cómo gestionamos excepciones.",
      fgoTitle: "FGO (Fondo Garantía Operativa)",
      fgoItem1: "Cubre: Daños menores (< USD 500), franquicias de seguro y lucro cesante.",
      fgoItem2: "Financiado por: 10% de cada reserva + Aportes de Propietarios (Pool).",
      roboTitle: "Robo Total & Destrucción",
      roboItem1: "Cubre: Póliza de Seguro Madre (Partner) o Póliza del Propietario (endosada).",
      roboItem2: "El FGO cubre el deducible para que el propietario no pague nada.",
      evidenciaTitle: "Evidencia Vinculante (Video Registro de Entrada)",
      evidenciaItem1: "Regla: Sin video de registro de salida validado, el arrendatario asume responsabilidad total.",
      evidenciaItem2: "La evidencia en Blockchain/Server actúa como árbitro final.",
      howItWorks: "Cómo Funciona",
      step1: "1. Video-Validación de Entrada",
      step1Desc: "IA detecta daños existentes. Arrendatario confirma con firma digital.",
      step2: "2. Dispositivos IoT (OBD-II)",
      step2Desc: "Monitoreo en tiempo real: velocidad, geolocalización y diagnóstico del vehículo.",
      step3: "3. Video-Validación de Salida",
      step3Desc: "Comparación IA para detectar nuevos daños. Wallet auto-débita o retiene garantía."
    },

    // Slide 11 - Product UI
    slide11: {
      title: "Product Experience (Concept UI)",
      subtitle: "UX diseñada para reducción de fricción y riesgo.",
      flujoReserva: "FLUJO: RESERVA",
      flujoFintech: "FLUJO: FINTECH",
      flujoConfianza: "FLUJO: CONFIANZA",
      discovery: "Discovery",
      confirmacion: "Confirmación",
      billeteraVirtual: "Billetera Virtual",
      holdGarantia: "Hold/Garantía",
      kycCam: "KYC Cam",
      videoCheck: "Video Check",
      reduceReserva: ["Abandono por UX", "Transparencia Precios"],
      reduceFintech: ["Impago", "Siniestralidad"],
      reduceConfianza: ["Fraude Identidad", "Disputas Daños"]
    },

    // Slide 12 - Tecnologia
    slide12: {
      title: "Tecnología & Validación",
      subtitle: "Infraestructura robusta con validación de identidad en tiempo real.",
      verificacionCompletada: "Verificación Completada",
      stackItems: {
        frontend: "Frontend",
        backend: "Backend",
        pagos: "Pagos",
        ia: "IA"
      },
      stackTech: {
        frontend: "Angular 18 + Ionic",
        backend: "Supabase (Postgres)",
        pagos: "MercadoPago API",
        ia: "Gemini Vision"
      },
      ventajasTecnicas: "VENTAJAS TÉCNICAS",
      ventaja1: "Row Level Security (RLS) para aislamiento de datos por tenant.",
      ventaja2: "Edge Functions con geo-distribución automática.",
      ventaja3: "Validación IA sin servidor centralizado (privacidad).",
      ventaja4: "Integración nativa con Mercado Pago (FIAT on/off ramp)."
    },

    // Slide 13 - Evidencia
    slide13: {
      title: "Evidencia de Producto (En Vivo)",
      subtitle: "Infraestructura operativa y flujos validados hoy.",
      flujoReserva: "Flujo de Reserva",
      mapaSeleccion: "Mapa / Selección",
      confirmacion: "Confirmación",
      coreFintech: "Core Fintech",
      billeteraVirtual: "Billetera Virtual",
      garantiaHistorial: "Garantía / Historial",
      sistemaConfianza: "Sistema Confianza",
      validacionID: "Validación ID",
      missing: "Missing:"
    },

    // Slide 14 - Go-To-Market
    slide14: {
      title: "Go-To-Market",
      subtitle: "Estrategia de adquisición de bajo costo.",
      funnelTitle: "Funnel de Conversión (Proyección Q1-Q2)",
      conversionTotal: "Conversión total: 1.5% (benchmark industria: 0.5-2%)",
      canalPrincipal: "CANAL PRINCIPAL: WiFi Fronterizo",
      cacProyectado: "CAC proyectado:",
      vsAds: "vs $15+ en Facebook/Google Ads",
      canalesSecundarios: "CANALES SECUNDARIOS",
      waitlist: "5,000+ Waitlist (EcuCondor)",
      alianzas: "Alianzas flotas locales",
      referidos: "Referidos (bonus en billetera)",
      seo: "SEO orgánico",
      focoGeografico: "Foco geográfico inicial",
      cabaGba: "🇦🇷 CABA + GBA"
    },

    // Slide 15 - Validacion
    slide15: {
      title: "Validación del Sistema (Datos Alpha)",
      subtitle: "Pruebas de estres del 'Sistema de Confianza' en entorno real.",
      metric1Label: "Tasa de Verificación",
      metric1Value: "98%",
      metric2Label: "Tiempo Promedio",
      metric2Value: "45s",
      metric3Label: "Falsos Positivos",
      metric3Value: "<0.1%",
      metric4Label: "Satisfacción Usuario",
      metric4Value: "4.8/5"
    },

    // Slide 16 - Estrategia
    slide16: {
      title: "Estrategia de Ejecución",
      subtitle: "Plan detallado para alcanzar product-market fit.",
      canalesTitle: "CANALES DE DISTRIBUCIÓN",
      canal1: "WiFi Fronterizo (Principal)",
      canal2: "Alianzas Estratégicas",
      canal3: "Marketing Digital",
      ejecucionTitle: "EJECUCIÓN TRIMESTRAL",
      q1: "Q1: MVP + Primeros 100 usuarios",
      q2: "Q2: Expansión CABA + 500 usuarios",
      q3: "Q3: Lanzamiento App + 1K usuarios",
      q4: "Q4: Serie A preparación"
    },

    // Slide 17 - Crecimiento
    slide17: {
      title: "Estrategia de Crecimiento (Hipótesis)",
      subtitle: "Experimento de adquisición de bajo costo (Frontera).",
      hipotesis1: "H1: WiFi = Top of Funnel masivo",
      hipotesis2: "H2: Validación biométrica = Calidad",
      hipotesis3: "H3: Liquidez = Escalabilidad",
      experimento: "Experimento: 1 Nodo Fronterizo",
      metrica1: "Tráfico: 3K/día",
      metrica2: "Conversión: 5%",
      metrica3: "CAC: <$0.50"
    },

    // Slide 18 - Vision
    slide18: {
      title: "Visión 2030",
      subtitle: "La plataforma de movilidad flexible líder en Latinoamérica.",
      item1: "1M+ vehículos en la red",
      item2: "10M+ usuarios activos",
      item3: "Presencia en 15 países",
      item4: "IPO en NYSE"
    },

    // Slide 19 - KPIs
    slide19: {
      title: "Métricas Clave (Tracking)",
      subtitle: "Indicadores de éxito del negocio.",
      kpi1: "Activación: Tiempo primera reserva",
      kpi2: "Retención: Usuarios activos mensuales",
      kpi3: "Eficiencia: Utilización flota",
      kpi4: "Calidad: Net Promoter Score"
    },

    // Slide 20 - MasterPlan
    slide20: {
      title: "Master Plan 2026-2028",
      subtitle: "Hitos clave para el crecimiento.",
      fase1: "FASE 1: R&D + CORE INFRA",
      fase1Desc: "MVP + Validación técnica",
      fase2: "FASE 2: ALPHA TEST (VALIDACIÓN)",
      fase2Desc: "100 usuarios + Feedback loop",
      fase3: "FASE 3: BETA PÚBLICA",
      fase3Desc: "1K usuarios + Expansión CABA",
      fase4: "FASE 4: ESCALADO",
      fase4Desc: "10K usuarios + LATAM expansion"
    },

    // Slide 21 - Demo
    slide21: {
      title: "Demo en Vivo",
      subtitle: "Probá la plataforma ahora mismo (MVP Operativo).",
      qrText: "Escaneá el QR",
      urlText: "O visitá:",
      betaNote: "Beta privada - Código requerido"
    },

    // Slide 22 - Competencia
    slide22: {
      title: "Análisis Competitivo",
      subtitle: "Diferenciadores clave de Autorenta.",
      headers: ["Característica", "Autorenta", "Rentadoras", "Uber/Bolt"],
      row1: ["Sin garajes", "✓", "✗", "✗"],
      row2: ["Validación biométrica", "✓", "✗", "✗"],
      row3: ["Seguro integrado", "✓", "✓", "✗"],
      row4: ["Flexibilidad 24/7", "✓", "✗", "✓"],
      row5: ["Target clase media", "✓", "✗", "✓"]
    },

    // Slide 24 - Inversión
    slide24: {
      title: "Oportunidad de Inversión",
      subtitle: "Ronda Semilla para escalar infraestructura y liquidez.",
      asking: "Ronda Semilla",
      askingAmount: "USD $500K",
      allocation1: "40% Tech Platform",
      allocation2: "30% Liquidez FGO",
      allocation3: "20% Marketing",
      allocation4: "10% Operaciones",
      runwa: "Runway: 18 meses",
      nextRound: "Serie A: USD $5M (12 meses)"
    },

    // Slide 25 - Fintech
    slide25: {
      title: "Flujo Fintech",
      subtitle: "Wallet integrada con garantías automatizadas.",
      paso1: "1. Registro KYC",
      paso2: "2. Carga de saldo",
      paso3: "3. Hold automático",
      paso4: "4. Liberación post-reserva"
    },

    // Slide 26 - Equipo
    slide26: {
      title: "El Equipo (Founders)",
      subtitle: "Ejecución probada en Fintech y Movilidad.",
      linkedin: "LinkedIn"
    }
  },

  pt: {
    // Slide 01 - Cover
    slide01: {
      title: "O Ativo Mais Ineficiente do Mundo.",
      subtitle1: "Taxa de Uso: < 5%",
      subtitle2: "A propriedade veicular é um erro financeiro para a classe média:",
      subtitle3: "Um passivo de $20k depreciando 95% do tempo.",
      footer: "ARGENTINA | 2026"
    },

    // Slide 02 - Gancho
    slide02: {
      title: "O Problema de Mobilidade da Classe Média",
      subtitle: "3 opções, todas defeituosas:",
      option1: "PRÓPRIO",
      option1Desc: "US$20k inicial\nDeprecia 20%/ano\nUso <5%\nSeguro + Patente + Garagem",
      option2: "ALUGAR",
      option2Desc: "US$80/dia (turista)\nUS$1200/mês (longo prazo)\nSem quilometragem ilimitada",
      option3: "REMIS",
      option3Desc: "US$3/km (Uber/Bolt)\nUS$900/mês médio\nSem privacidade nem flexibilidade",
      highlight: "NINGUÉM OFERECE FLEXIBILIDADE + BAIXO CUSTO"
    },

    // Slide 03 - Problema
    slide03: {
      title: "O Problema: Espaços Mortos + Alta Fricção",
      subtitle: "A propriedade veicular é ineficiente em três dimensões:",
      point1Title: "USO TEMPORAL",
      point1Desc: "Ocupado 5% do tempo, estacionado 95%",
      point2Title: "CUSTO FINANCEIRO",
      point2Desc: "US$20k depreciando enquanto não se usa",
      point3Title: "FRICTION",
      point3Desc: "Seguro, patente, garagem, manutenção"
    },

    // Slide 04 - Solución
    slide04: {
      title: "Solução: Mobilidade como Serviço",
      subtitle: "Autorenta: Carsharing descentralizado com gestão de frotas P2P",
      concept: "CONCEITO",
      conceptDesc: "Conectar proprietários de carros ociosos com motoristas que precisam de mobilidade flexível.",
      features: "CARACTERÍSTICAS",
      feature1Title: "DESCENTRALIZADO",
      feature1Desc: "Sem garagens custosos. Os carros estão onde estão os proprietários.",
      feature2Title: "GARANTIA BIOMÉTRICA",
      feature2Desc: "Validação facial para prevenir fraudes e garantir devolução.",
      feature3Title: "SEGURO INTEGRADO",
      feature3Desc: "Cobertura completa para proprietários e motoristas.",
      feature4Title: "ROTAS FLEXÍVEIS",
      feature4Desc: "Retirada e devolução em pontos da comunidade."
    },

    // Slide 03 - Problema (Confiança)
    slide03Problema: {
      title: "CONFIANÇA.",
      subtitle: "O gargalo é a confiança.",
      description: "As plataformas P2P atuais falham porque não podem garantir segurança.",
      question1: "Vão roubar o carro?",
      question2: "Quem paga os danos?",
      question3: "E se mentirem?",
      bottomText: "Sem uma solução tecnológica para o",
      bottomHighlight: "Medo",
      bottomEnd: ", o mercado não escala."
    },

    // Slide 04 - Solução (Confiança)
    slide04Solucion: {
      title: "A Solução: Confiança Sem Bancos",
      subtitle: "4 pilares tecnológicos + FGO que garantem risco zero para proprietários.",
      pilar1: {
        problema: "Sem cartão de crédito",
        solucion: "Carteira Virtual",
        descripcion: "Garantia em dinheiro pré-depositada. Sem bancos, sem rejeições.",
        beneficio: "Acesso universal"
      },
      pilar2: {
        problema: "Posso confiar?",
        solucion: "Identidade Verificada por IA",
        descripcion: "Selfie + RG + Verificação biométrica obrigatória.",
        beneficio: "0% fraude de identidade"
      },
      pilar3: {
        problema: "Disputas por danos",
        solucion: "Video-Inspeção 360°",
        descripcion: "IA detecta danos automaticamente. Evidência legal irrefutável.",
        beneficio: "Resolução em 24h"
      },
      pilar4: {
        problema: "Como me protejo?",
        solucion: "Contrato Digital Vinculante",
        descripcion: "Comodato assinado digitalmente com validade legal completa.",
        beneficio: "Proteção jurídica"
      },
      fgo: {
        title: "FGO: Fundo Garantia Operativa",
        subtitle: "Modelo de negócio que garante risco zero para proprietários",
        cobertura1: {
          title: "1. Danos Menores",
          desc: "Cobre: Danos menores (< USD 500), franquias e lucro cessante.",
          financiamiento: "10% de cada reserva + Contribuições de Proprietários"
        },
        cobertura2: {
          title: "2. Roubo Total",
          desc: "Cobre: Apólice de Seguro Mãe ou do Proprietário (endossada).",
          financiamiento: "FGO cobre o dedutível para que o proprietário não pague."
        },
        cobertura3: {
          title: "3. Evidência",
          desc: "Sem vídeo de registro validado, locatário assume responsabilidade.",
          financiamiento: "Evidência em Blockchain/Servidor atua como árbitro final."
        },
        sinFgo: "SEM FGO",
        conFgo: "COM FGO",
        adoption: "Adoção",
        owners: "Proprietários"
      }
    },

    // Slide 23 - Crecimiento (Frontera)
    slide23: {
      title: "Crescimento: Aquisição de Baixo Custo",
      subtitle: "Validação do experimento 'Fronteira WiFi'.",
      funnelTitle: "FUNIL MATEMÁTICO (1 NÓDULO / MÊS)",
      funnel1: "Tráfego Potencial (Passo de Fronteira)",
      funnel1Value: "3,000 / dia · 90,000 / mês",
      funnel2: "Adoção WiFi (Opt-in 10%)",
      funnel2Value: "9,000 usuários / mês",
      funnel3: "Conversão a Registro (15%)",
      funnel3Value: "1,350 novos perfis",
      funnel4: "Verificados (Barreira Biométrica 45%)",
      funnel4Value: "607 usuários prontos para reservar",
      cac: "CAC Projetado: < USD 0.50 por usuário verificado",
      scalable: "Escalável mediante replicação de nódulos na LatAm."
    },

    // Slide 26 - Equipo
    slide26: {
      title: "A Equipe (Founders)",
      subtitle: "Execução comprovada em Fintech e Mobilidade.",
      linkedin: "LinkedIn"
    },

    // Slide 06 - Produto
    slide06: {
      title: "Produto (Fluxo 100% Digital)",
      subtitle: "Uma experiência premium desenhada para confiança e velocidade.",
      step1Name: "ENCONTRE",
      step1Desc: "Mapa interativo em tempo real com filtros avançados.",
      step2Name: "RESERVA",
      step2Desc: "Pagamento seguro, depósito pré-autorizado sem fricção.",
      step3Name: "CHECK-IN",
      step3Desc: "Validação de identidade e video-inspeção com IA.",
      step4Name: "DEVOLVA",
      step4Desc: "Fechamento de contrato instantâneo e liberação de garantia.",
      badge1: "100% Mobile",
      badge2: "Zero Paperwork",
      badge3: "Instant Access"
    },

    // Slide 07 - Mercado
    slide07: {
      title: "Mercado (TAM / SAM / SOM)",
      subtitle: "Oportunidade real na Argentina com expansão LATAM.",
      foco1: "USD $84B em ativos depreciando diariamente por falta de uso.",
      foco2: "BA + CABA: 8.44M veículos ativos (DNRPA) - média $10k USD.",
      foco3: "LATAM car-sharing cresce 22.7% CAGR 2024-2030.",
      foco4: "Vento de popa macro: classe média busca renda extra em 2026.",
      tam: "TAM (ARG)",
      tamValue: "USD 989M",
      sam: "SAM (CABA+GBA)",
      samValue: "USD 361M",
      som: "SOM (Ano 1)",
      somValue: "USD 3.6M",
      porQueAhora: "POR QUE AGORA",
      fuente: "Fonte: Estimativas internas DNRPA, Statista 2024"
    },

    // Slide 08 - Modos de Falha
    slide08: {
      title: "Modos de Falha do Mercado · Requisitos de Design",
      subtitle: "Aprendizado dos pioneiros na LatAm para garantir escala.",
      modosFalloTitle: "MODOS DE FALHA (CASO BRASIL)",
      requisitosTitle: "REQUISITOS DE DESIGN AUTORENTA",
      fallo1Title: "1. Access Restrição (Acesso)",
      fallo1Desc: "Dependência de cartões de crédito com limite alto. Limita o TAM real apenas à população bancarizada.",
      solucion1Title: "1. Inclusão Financeira",
      solucion1Desc: "Carteira Virtual própria + FGO (Fundo de Garantia Operativa). Desbloqueia demanda massiva sem risco de crédito.",
      fallo2Title: "2. Autonomia Restrição (Caixa)",
      fallo2Desc: "Modelo de alta taxa de queima esperando liquidez orgânica. Fechamentos por falta de capital antes de atingir densidade.",
      solucion2Title: "2. Rentabilidade Unitária",
      solucion2Desc: "Modelo desenhado para MC positivo desde reserva #1. Crescimento orgânico eficiente e escalável.",
      fallo3Title: "3. Ops Restrição (Operação)",
      fallo3Desc: "Verificação manual e disputas subjetivas. Economia Unitária negativa por custo de suporte humano.",
      solucion3Title: "3. Sistema de Confiança Automatizado",
      solucion3Desc: "Biometria + Evidência Vídeo + IA. Suporte e risco automatizados (Custo marginal ~0)."
    },

    // Slide 09 - Economia Unitária
    slide09: {
      title: "Economia Unitária",
      subtitle: "Modelo rentável desde a primeira transação.",
      desglose: "Desconto por Transação",
      ticketPromedio: "Ticket Médio (AOV)",
      takeRate: "Taxa de Comissão (15%)",
      fgoPool: "FGO Pool (10%)",
      pspSoporte: "PSP + Suporte",
      margenNeto: "MARGEM LÍQUIDA",
      rentableDay1: "✓ Rentável desde o Dia 1",
      metricasClave: "Métricas Chave",
      takeRateReal: "Taxa de Comissão Real",
      takeRateRealDesc: "Variável por tipo de carro e duração (10-20%). Média 15%.",
      paybackMeses: "Payback",
      paybackDesc: "Retorno de investimento por veículo em 12 meses.",
      ltv: "LTV",
      ltvDesc: "Lifetime Value por veículo em 3 anos (média 10 reservas/mês)."
    },

    // Slide 10 - Política de Risco
    slide10: {
      title: "Política de Risco e Cobertura (Sistema de Confiança)",
      subtitle: "Regras claras: o que o FGO cobre e como gerenciamos exceções.",
      fgoTitle: "FGO (Fundo de Garantia Operativa)",
      fgoItem1: "Cobre: Danos menores (< USD 500), franquias de seguro e lucro cessante.",
      fgoItem2: "Financiado por: 10% de cada reserva + Aportes de Proprietários (Pool).",
      roboTitle: "Roubo Total & Destruição",
      roboItem1: "Cobre: Apólice de Seguro Mãe (Partner) ou Apólice do Proprietário (endossada).",
      roboItem2: "O FGO cobre o dedutível para que o proprietário não pague nada.",
      evidenciaTitle: "Evidência Vinculante (Vídeo Registro de Entrada)",
      evidenciaItem1: "Regra: Sem vídeo de registro de saída validado, o locatário assume responsabilidade total.",
      evidenciaItem2: "A evidência em Blockchain/Server atua como árbitro final.",
      howItWorks: "Como Funciona",
      step1: "1. Video-Validação de Entrada",
      step1Desc: "IA detecta danos existentes. Locatário confirma com assinatura digital.",
      step2: "2. Dispositivos IoT (OBD-II)",
      step2Desc: "Monitoramento em tempo real: velocidade, geolocalização e diagnóstico do veículo.",
      step3: "3. Video-Validação de Saída",
      step3Desc: "Comparação IA para detectar novos danos. Wallet auto-debita ou retém garantia."
    },

    // Slide 11 - Product UI
    slide11: {
      title: "Product Experience (Concept UI)",
      subtitle: "UX desenhada para redução de fricção e risco.",
      flujoReserva: "FLUXO: RESERVA",
      flujoFintech: "FLUXO: FINTECH",
      flujoConfianza: "FLUXO: CONFIANÇA",
      discovery: "Discovery",
      confirmacion: "Confirmação",
      billeteraVirtual: "Carteira Virtual",
      holdGarantia: "Hold/Garantia",
      kycCam: "KYC Cam",
      videoCheck: "Video Check",
      reduceReserva: ["Abandono por UX", "Transparência Preços"],
      reduceFintech: ["Inadimplência", "Sinistralidade"],
      reduceConfianza: ["Fraude Identidade", "Disputas Danos"]
    },

    // Slide 12 - Tecnologia
    slide12: {
      title: "Tecnologia & Validação",
      subtitle: "Infraestrutura robusta com validação de identidade em tempo real.",
      verificacionCompletada: "Verificação Completa",
      stackItems: {
        frontend: "Frontend",
        backend: "Backend",
        pagos: "Pagamentos",
        ia: "IA"
      },
      stackTech: {
        frontend: "Angular 18 + Ionic",
        backend: "Supabase (Postgres)",
        pagos: "MercadoPago API",
        ia: "Gemini Vision"
      },
      ventajasTecnicas: "VANTAGENS TÉCNICAS",
      ventaja1: "Row Level Security (RLS) para isolamento de dados por tenant.",
      ventaja2: "Edge Functions com geo-distribuição automática.",
      ventaja3: "Validação IA sem servidor centralizado (privacidade).",
      ventaja4: "Integração nativa com Mercado Pago (FIAT on/off ramp)."
    },

    // Slide 13 - Evidencia
    slide13: {
      title: "Evidência de Produto (Ao Vivo)",
      subtitle: "Infraestrutura operativa e fluxos validados hoje.",
      flujoReserva: "Fluxo de Reserva",
      mapaSeleccion: "Mapa / Seleção",
      confirmacion: "Confirmação",
      coreFintech: "Core Fintech",
      billeteraVirtual: "Carteira Virtual",
      garantiaHistorial: "Garantia / Histórico",
      sistemaConfianza: "Sistema Confiança",
      validacionID: "Validação ID",
      missing: "Faltando:"
    },

    // Slide 14 - Go-To-Market
    slide14: {
      title: "Go-To-Market",
      subtitle: "Estratégia de aquisição de baixo custo.",
      funnelTitle: "Funil de Conversão (Projeção Q1-Q2)",
      conversionTotal: "Conversão total: 1.5% (benchmark indústria: 0.5-2%)",
      canalPrincipal: "CANAL PRINCIPAL: WiFi Fronterizo",
      cacProyectado: "CAC projetado:",
      vsAds: "vs $15+ em Facebook/Google Ads",
      canalesSecundarios: "CANAIS SECUNDÁRIOS",
      waitlist: "5,000+ Waitlist (EcuCondor)",
      alianzas: "Alianças frotas locais",
      referidos: "Indicações (bônus na carteira)",
      seo: "SEO orgânico",
      focoGeografico: "Foco geográfico inicial",
      cabaGba: "🇦🇷 CABA + GBA"
    },

    // Slide 15 - Validacao
    slide15: {
      title: "Validação do Sistema (Dados Alpha)",
      subtitle: "Testes de estresse do 'Sistema Confiança' em ambiente real.",
      metric1Label: "Taxa de Verificação",
      metric1Value: "98%",
      metric2Label: "Tempo Médio",
      metric2Value: "45s",
      metric3Label: "Falsos Positivos",
      metric3Value: "<0.1%",
      metric4Label: "Satisfação Usuário",
      metric4Value: "4.8/5"
    },

    // Slide 16 - Estrategia
    slide16: {
      title: "Estratégia de Execução",
      subtitle: "Plano detalhado para atingir product-market fit.",
      canalesTitle: "CANAIS DE DISTRIBUIÇÃO",
      canal1: "WiFi Fronterizo (Principal)",
      canal2: "Alianças Estratégicas",
      canal3: "Marketing Digital",
      ejecucionTitle: "EXECUÇÃO TRIMESTRAL",
      q1: "Q1: MVP + Primeiros 100 usuários",
      q2: "Q2: Expansão CABA + 500 usuários",
      q3: "Q3: Lançamento App + 1K usuários",
      q4: "Q4: Preparação Série A"
    },

    // Slide 17 - Crecimiento
    slide17: {
      title: "Estratégia de Crescimento (Hipótese)",
      subtitle: "Experimento de aquisição de baixo custo (Fronteira).",
      hipotesis1: "H1: WiFi = Top of Funnel massivo",
      hipotesis2: "H2: Validação biométrica = Qualidade",
      hipotesis3: "H3: Liquidez = Escalabilidade",
      experimento: "Experimento: 1 Nó Fronteiriço",
      metrica1: "Tráfego: 3K/dia",
      metrica2: "Conversão: 5%",
      metrica3: "CAC: <$0.50"
    },

    // Slide 18 - Vision
    slide18: {
      title: "Visão 2030",
      subtitle: "A plataforma de mobilidade flexível líder na América Latina.",
      item1: "1M+ veículos na rede",
      item2: "10M+ usuários ativos",
      item3: "Presença em 15 países",
      item4: "IPO na NYSE"
    },

    // Slide 19 - KPIs
    slide19: {
      title: "Métricas Chave (Tracking)",
      subtitle: "Indicadores de sucesso do negócio.",
      kpi1: "Ativação: Tempo primeira reserva",
      kpi2: "Retenção: Usuários ativos mensais",
      kpi3: "Eficiência: Utilização frota",
      kpi4: "Qualidade: Net Promoter Score"
    },

    // Slide 20 - MasterPlan
    slide20: {
      title: "Plano Mestre 2026-2028",
      subtitle: "Marcos chave para o crescimento.",
      fase1: "FASE 1: R&D + INFRA CORE",
      fase1Desc: "MVP + Validação técnica",
      fase2: "FASE 2: ALPHA TEST (VALIDAÇÃO)",
      fase2Desc: "100 usuários + Feedback loop",
      fase3: "FASE 3: BETA PÚBLICA",
      fase3Desc: "1K usuários + Expansão CABA",
      fase4: "FASE 4: ESCALA",
      fase4Desc: "10K usuários + Expansão LATAM"
    },

    // Slide 21 - Demo
    slide21: {
      title: "Demo ao Vivo",
      subtitle: "Teste a plataforma agora mesmo (MVP Operativo).",
      qrText: "Escaneie o QR",
      urlText: "Ou visite:",
      betaNote: "Beta privada - Código requerido"
    },

    // Slide 22 - Competencia
    slide22: {
      title: "Análise Competitivo",
      subtitle: "Diferenciais chave da Autorenta.",
      headers: ["Característica", "Autorenta", "Locadoras", "Uber/Bolt"],
      row1: ["Sem garagens", "✓", "✗", "✗"],
      row2: ["Validação biométrica", "✓", "✗", "✗"],
      row3: ["Seguro integrado", "✓", "✓", "✗"],
      row4: ["Flexibilidade 24/7", "✓", "✗", "✓"],
      row5: "Target classe média".split(' ').concat(["✓", "✗", "✓"])
    },

    // Slide 24 - Inversion
    slide24: {
      title: "Oportunidade de Investimento",
      subtitle: "Rodada Semente para escalar infraestrutura e liquidez.",
      asking: "Rodada Semente",
      askingAmount: "USD $500K",
      allocation1: "40% Tech Platform",
      allocation2: "30% Liquidez FGO",
      allocation3: "20% Marketing",
      allocation4: "10% Operações",
      runwa: "Runway: 18 meses",
      nextRound: "Série A: USD $5M (12 meses)"
    },

    // Slide 25 - Fintech
    slide25: {
      title: "Fluxo Fintech",
      subtitle: "Carteira integrada com garantias automatizadas.",
      paso1: "1. Registro KYC",
      paso2: "2. Carregar saldo",
      paso3: "3. Hold automático",
      paso4: "4. Liberação pós-reserva"
    },

    // Slide 05 - Timing
    slide05: {
      title: "Por Que Agora?",
      subtitle: "3 fatores macro convergem em uma tempestade perfeita de oportunidade.",
      cronologia: "Cronologia da Oportunidade",
      factor1Title: "Crise & Inflação",
      factor1Stat: "200%+",
      factor1StatLabel: "Inflação anual",
      factor1Desc: "O carro parado é um passivo custoso. Alugá-lo gera USD $200-400/mês.",
      factor2Title: "Exclusão Financeira",
      factor2Stat: "70%",
      factor2StatLabel: "Sem cartão crédito",
      factor2Desc: "Locadoras tradicionais rejeitam 70%. Mercado cativo massivo.",
      factor3Title: "Maturidade Digital",
      factor3Stat: "<$0.01",
      factor3StatLabel: "Custo validação",
      factor3Desc: "IA, Biometria e Smart Contracts permitem operar sem sucursais físicas.",
      timeline2024Label: "Supply Surge",
      timeline2024Sub: "Crise = Proprietários buscam aluguel",
      timeline2025Label: "Tech Enabled",
      timeline2025Sub: "IA reduz custos operativos",
      timeline2026Label: "Mass Adoption",
      timeline2026Sub: "Mudança cultural Ownership → Access"
    }
  }
};

export function t(lang: Language, key: string): string {
  const keys = key.split('.');
  let value: any = translations[lang];

  for (const k of keys) {
    value = value?.[k];
  }

  return value || key;
}
