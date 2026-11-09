import React from 'react';
import {Language, t, translateRole} from '../i18n';
import {Chart} from './Chart';

export interface ClientReportProps {
  user: any;
  values: Record<string, string>;
  view: any;
  machine: string;
  mode: string;
  chartImageSrc?: string | null;
  lang: Language;
}

interface StepItem {
  etapa: string;
  tipo: string;
  badgeClass: string;
  tempAire: string;
  tempGrano: string;
  tempAireSalida: string;
  hrAire: string;
  mEnt: string;
  mSal: string;
  deltaM: string;
}

export function ClientReport({
  user,
  values,
  view,
  machine,
  mode,
  chartImageSrc,
  lang
}: ClientReportProps) {
  const isEn = lang === 'en';

  const format12h = () => {
    const d = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    const year = d.getFullYear();
    const month = pad(d.getMonth() + 1);
    const day = pad(d.getDate());
    let hours = d.getHours();
    const minutes = pad(d.getMinutes());
    const seconds = pad(d.getSeconds());
    const ampm = hours >= 12 ? 'pm' : 'am';
    hours = hours % 12;
    hours = hours ? hours : 12;
    return `${year}-${month}-${day} ${pad(hours)}:${minutes}:${seconds} ${ampm}`;
  };

  const currentDate = format12h();

  // Machine info from view cells or defaults
  const machineModel = machine === 'axl'
    ? (view.cells?.maqAxlModelo?.innerText || 'ST-40AXL')
    : machine === 'menor'
    ? (view.cells?.maqMenorModelo?.innerText || 'ST-20E')
    : (view.cells?.maqAxModelo?.innerText || 'ST-40AX');

  const machineHolding = machine === 'axl'
    ? (view.cells?.maqAxlHolding?.innerText || '70.1')
    : machine === 'menor'
    ? (view.cells?.maqMenorHolding?.innerText || '45.0')
    : (view.cells?.maqAxHolding?.innerText || '70.1');

  const machineCaudal = machine === 'axl'
    ? (view.cells?.maqAxlCaudal?.innerText || '114,173')
    : machine === 'menor'
    ? (view.cells?.maqMenorCaudal?.innerText || '82,500')
    : (view.cells?.maqAxCaudal?.innerText || '163,104');

  // Grain label
  const grainMap: Record<string, {es: string; en: string}> = {
    arroz: {es: 'Arroz Paddy (Largo)', en: 'Rough Rice (Paddy)'},
    maiz: {es: 'Maíz Amarillo', en: 'Yellow Corn'},
    trigo: {es: 'Trigo', en: 'Wheat'},
    sorgo: {es: 'Sorgo', en: 'Sorghum'},
    cebada: {es: 'Cebada', en: 'Barley'},
    soya: {es: 'Soya', en: 'Soybean'}
  };
  const grainKey = (values.tipoGrano || 'arroz').toLowerCase();
  const grainLabel = grainMap[grainKey] ? (isEn ? grainMap[grainKey].en : grainMap[grainKey].es) : (values.tipoGrano || 'Arroz Paddy (Largo)');

  // Configuración de Grano (Image 1)
  const tempLimiteGrano = values.tempLimiteGrano || '43';
  const densidadAparente = values.densidadAparente || '580';

  // Parámetros Operativos (Image 2)
  const hIni = Number(values.humedadInicial || 22).toFixed(1);
  const hObj = Number(values.humedadObjetivo || 13).toFixed(1);
  const metaSecado = values.metaSecado || '250';
  const velocidadAire = values.velocidadAire || '15';

  // Condiciones del Sitio (Image 3)
  const tempAmbiente = values.tempAmbiente || '25.0';
  const hrAmbiente = values.hrAmbiente || '85';
  const altitud = values.altitud || '15';
  const eficienciaTermica = values.eficienciaTermica || '0.5';

  // Simulación Real de Producción (Image 4)
  const tituloSimReal = view.cells?.tituloSimulacionReal?.innerText || `Simulación Real de Producción - ${machineModel}`;
  const tonHumedas = view.cells?.realSelTonHumedas?.innerText || '318.8 Ton/día';
  const humedasHora = view.cells?.realSelHumedasHora?.innerText || '13.3 Ton/h';
  const prodSeca = view.cells?.realSelProdSeca?.innerText || '285.8 Ton/día';
  const secaHora = view.cells?.realSelSecaHora?.innerText || (isEn ? '11.9 Ton/h (Commercial base)' : '11.9 Ton/h (Base comercializable)');
  const energia = view.cells?.realSelEnergia?.innerText || '1870 kWh';
  const diesel = view.cells?.realSelDiesel?.innerText || 'Diesel: 4186 L/día';
  const baches = view.cells?.realSelBaches?.innerText || '2.2';

  // Client info (Datos de la Empresa)
  const empresaNombre = (values.empresaNombre || '').trim() || (isEn ? 'Unspecified Company' : 'Empresa por Definir');
  const empresaUbicacion = (values.empresaUbicacion || '').trim() || (isEn ? 'Unspecified Location' : 'Ubicación por Definir');
  const empresaContacto = (values.empresaContacto || '').trim() || (isEn ? 'Unspecified Contact' : 'Contacto por Definir');

  // Extracción de la Estrategia Multipaso Real (OMITIENDO LA COLUMNA DE TIEMPO)
  const getReportSteps = (): StepItem[] => {
    // 1. Intentar leer directo desde el DOM de la tabla real ya renderizada en la simulación
    if (typeof document !== 'undefined') {
      const table = document.getElementById('tablaPasosReal') || document.getElementById('tablaPasos');
      const trs = table ? Array.from(table.querySelectorAll('tbody tr')) : [];
      if (trs.length > 0) {
        const parsed: StepItem[] = [];
        for (const tr of trs) {
          const tds = tr.querySelectorAll('td');
          if (tds.length >= 9) {
            const etapa = tds[0]?.textContent?.trim() || '';
            const tipoBadge = tds[1]?.querySelector('.sim-badge');
            const tipo = tipoBadge?.textContent?.trim() || tds[1]?.textContent?.trim() || '';
            const bCls = tipoBadge?.className?.includes('badge-heat')
              ? 'badge-heat'
              : tipoBadge?.className?.includes('badge-temper')
              ? 'badge-temper'
              : 'badge-cool';
            const tempAire = tds[2]?.textContent?.trim() || '-';
            const tempGrano = tds[3]?.textContent?.trim() || '-';
            const tempAireSalida = tds[4]?.textContent?.trim() || '-';
            const hrAire = tds[5]?.textContent?.trim() || '-';
            const mEnt = tds[6]?.textContent?.trim() || '-';
            const mSal = tds[7]?.textContent?.trim() || '-';
            const deltaM = tds[8]?.textContent?.trim() || '-';
            if (etapa) {
              parsed.push({
                etapa,
                tipo,
                badgeClass: bCls,
                tempAire,
                tempGrano,
                tempAireSalida,
                hrAire,
                mEnt,
                mSal,
                deltaM
              });
            }
          }
        }
        if (parsed.length > 0) return parsed;
      }
    }

    // 2. Intentar parsear el HTML de las celdas guardadas en view.cells
    const rawHtml = view.cells?.['#tablaPasosReal tbody']?.innerHTML || view.cells?.['#tablaPasos tbody']?.innerHTML;
    if (rawHtml && typeof DOMParser !== 'undefined') {
      try {
        const doc = new DOMParser().parseFromString(`<table><tbody>${rawHtml}</tbody></table>`, 'text/html');
        const trs = Array.from(doc.querySelectorAll('tbody tr'));
        if (trs.length > 0) {
          const parsed: StepItem[] = [];
          for (const tr of trs) {
            const tds = tr.querySelectorAll('td');
            if (tds.length >= 9) {
              const etapa = tds[0]?.textContent?.trim() || '';
              const tipoBadge = tds[1]?.querySelector('.sim-badge');
              const tipo = tipoBadge?.textContent?.trim() || tds[1]?.textContent?.trim() || '';
              const bCls = tipoBadge?.className?.includes('badge-heat')
                ? 'badge-heat'
                : tipoBadge?.className?.includes('badge-temper')
                ? 'badge-temper'
                : 'badge-cool';
              const tempAire = tds[2]?.textContent?.trim() || '-';
              const tempGrano = tds[3]?.textContent?.trim() || '-';
              const tempAireSalida = tds[4]?.textContent?.trim() || '-';
              const hrAire = tds[5]?.textContent?.trim() || '-';
              const mEnt = tds[6]?.textContent?.trim() || '-';
              const mSal = tds[7]?.textContent?.trim() || '-';
              const deltaM = tds[8]?.textContent?.trim() || '-';
              if (etapa) {
                parsed.push({
                  etapa,
                  tipo,
                  badgeClass: bCls,
                  tempAire,
                  tempGrano,
                  tempAireSalida,
                  hrAire,
                  mEnt,
                  mSal,
                  deltaM
                });
              }
            }
          }
          if (parsed.length > 0) return parsed;
        }
      } catch {}
    }

    // 3. Fallback con los pasos multipaso estándar calculados para el escenario actual
    return [
      { etapa: 'Paso 1 (Calor)', tipo: 'Calor', badgeClass: 'badge-heat', tempAire: '63.0', tempGrano: '39.8', tempAireSalida: '44.7', hrAire: '11.6', mEnt: `${hIni}%`, mSal: '17.9%', deltaM: '-4.0%' },
      { etapa: 'Atempero 1', tipo: 'Atempero', badgeClass: 'badge-temper', tempAire: '-', tempGrano: '40.1', tempAireSalida: '-', hrAire: '-', mEnt: '17.9%', mSal: '17.9%', deltaM: '-0.0%' },
      { etapa: 'Paso 2 (Calor)', tipo: 'Calor', badgeClass: 'badge-heat', tempAire: '59.0', tempGrano: '39.3', tempAireSalida: '43.6', hrAire: '14.0', mEnt: '17.9%', mSal: '14.8%', deltaM: '-3.1%' },
      { etapa: 'Atempero 2', tipo: 'Atempero', badgeClass: 'badge-temper', tempAire: '-', tempGrano: '39.5', tempAireSalida: '-', hrAire: '-', mEnt: '14.8%', mSal: '14.8%', deltaM: '-0.0%' },
      { etapa: 'Paso 3 (Calor)', tipo: 'Calor', badgeClass: 'badge-heat', tempAire: '55.0', tempGrano: '39.4', tempAireSalida: '43.0', hrAire: '16.9', mEnt: '14.8%', mSal: `${hObj}%`, deltaM: '-1.8%' },
      { etapa: 'Atempero 3', tipo: 'Atempero', badgeClass: 'badge-temper', tempAire: '-', tempGrano: '39.6', tempAireSalida: '-', hrAire: '-', mEnt: `${hObj}%`, mSal: `${hObj}%`, deltaM: '-0.0%' },
      { etapa: 'Enfriamiento Final', tipo: 'Enfriamiento', badgeClass: 'badge-cool', tempAire: `${tempAmbiente}`, tempGrano: '30.0', tempAireSalida: '26.5', hrAire: `${hrAmbiente}.0`, mEnt: `${hObj}%`, mSal: `${hObj}%`, deltaM: '-0.0%' }
    ];
  };

  const steps = getReportSteps();

  // Generación de configuración de gráfica de transición vítrea (con fallback local autónomo si view.charts aún no está poblado)
  const chartConfig = React.useMemo(() => {
    if (view?.charts?.chartTransicionVitrea) {
      return view.charts.chartTransicionVitrea;
    }
    const granosConfig: Record<string, { nombre: string; limitTemp: number; Tgs: number; Tgw: number; k_gt: number }> = {
      arroz: { nombre: 'Arroz Paddy (Largo)', limitTemp: 43.0, Tgs: 140.0, Tgw: 0.0, k_gt: 9.5 },
      maiz: { nombre: 'Maíz Amarillo', limitTemp: 85.0, Tgs: 145.0, Tgw: 0.0, k_gt: 9.8 },
      trigo: { nombre: 'Trigo', limitTemp: 50.0, Tgs: 135.0, Tgw: 0.0, k_gt: 9.2 },
      sorgo: { nombre: 'Sorgo', limitTemp: 60.0, Tgs: 140.0, Tgw: 0.0, k_gt: 9.5 },
      cebada: { nombre: 'Cebada', limitTemp: 45.0, Tgs: 130.0, Tgw: 0.0, k_gt: 9.0 },
      soya: { nombre: 'Soya', limitTemp: 40.0, Tgs: 120.0, Tgw: 0.0, k_gt: 8.5 }
    };
    const grano = granosConfig[grainKey] || granosConfig.arroz;
    const mValues: number[] = [];
    const tgValues: string[] = [];
    for (let m = 10; m <= 25; m += 0.5) {
      const Xw = m / 100;
      const Xs = 1 - Xw;
      const tg = (Xs * grano.Tgs + grano.k_gt * Xw * grano.Tgw) / (Xs + grano.k_gt * Xw);
      mValues.push(m);
      tgValues.push(tg.toFixed(2));
    }
    const procesoPoints: Array<{ x: number; y: number; etapa: string }> = [];
    for (const st of steps) {
      if (st.tipo.toLowerCase().includes('calor') || st.tipo.toLowerCase().includes('enfri') || st.tipo.toLowerCase().includes('heat') || st.tipo.toLowerCase().includes('cool')) {
        const ent = parseFloat(st.mEnt.replace('%', '')) || 20;
        const sal = parseFloat(st.mSal.replace('%', '')) || ent;
        const tGrano = parseFloat(st.tempGrano) || 40;
        procesoPoints.push({ x: (ent + sal) / 2, y: tGrano, etapa: st.etapa });
      }
    }
    return {
      type: 'line',
      data: {
        labels: mValues,
        datasets: [
          {
            label: isEn ? 'Rubbery State (Soft/Plastic)' : 'Estado Cauchoso (Blando/Plástico)',
            data: tgValues,
            backgroundColor: 'rgba(249, 219, 192, 0.4)',
            fill: 'end',
            borderWidth: 0,
            pointRadius: 0
          },
          {
            label: isEn ? 'Glass Transition Curve (Tg)' : 'Curva de Transición Vítrea (Tg)',
            data: tgValues,
            borderColor: '#2563eb',
            backgroundColor: 'rgba(191, 219, 254, 0.4)',
            fill: 'start',
            borderWidth: 3,
            tension: 0.4,
            pointRadius: 0
          },
          {
            label: isEn ? 'Grain Temp. in Process' : 'Temp. Grano en Proceso',
            data: procesoPoints,
            borderColor: '#ef4444',
            backgroundColor: '#ef4444',
            borderWidth: 1,
            pointRadius: 6,
            type: 'scatter'
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          x: {
            type: 'linear',
            title: { display: true, text: isEn ? 'Moisture Content (% w.b.)' : 'Contenido de Humedad (% b.h.)', font: { weight: 'bold' } },
            min: 10,
            max: 25,
            grid: { color: 'rgba(0,0,0,0.05)' }
          },
          y: {
            title: { display: true, text: isEn ? 'Temperature (°C)' : 'Temperatura (°C)', font: { weight: 'bold' } },
            suggestedMin: 20,
            suggestedMax: Math.max(80, grano.limitTemp + 5),
            grid: { color: 'rgba(0,0,0,0.05)' }
          }
        },
        plugins: {
          title: {
            display: true,
            text: (isEn ? 'Glass Transition Curve (Tg) for ' : 'Curva de Transición Vítrea (Tg) para ') + grano.nombre,
            font: { size: 14 }
          }
        }
      }
    };
  }, [view?.charts?.chartTransicionVitrea, grainKey, steps, isEn]);



  return (
    <div className="client-report-document">
      {/* ==================== PÁGINA 1: DATOS, CONDICIONES, SIMULACIÓN REAL Y TABLA SIN TIEMPOS ==================== */}
      <div className="client-report-page client-report-page-1">
        {/* Barra superior limpia exterior de Logos */}
        <div className="d-flex align-items-center justify-content-between mb-2 px-1">
          <div className="d-flex align-items-center gap-3">
            <img src="/superbrix-logo.png" alt="Superbrix" style={{ height: '38px', width: 'auto', objectFit: 'contain' }} />
            <img src="/logo.png" alt="Simulador LSU" style={{ height: '36px', width: 'auto', objectFit: 'contain' }} />
          </div>
          <div className="text-end">
            <span className="fw-bold text-dark" style={{ letterSpacing: '0.04em', fontSize: '0.85rem' }}>MEGA LSU INDUSTRIAL</span>
            <div className="text-muted small">SuperBrix Drying Technology</div>
          </div>
        </div>

        {/* Banner limpio y estilizado con la imagen corporativa del banner */}
        <div className="client-report-header">
          <div className="d-flex justify-content-between align-items-center w-100">
            <div className="header-left">
              <h1 className="report-main-title">
                {isEn ? 'TECHNICAL REPORT TO THE CLIENT' : 'REPORTE TÉCNICO AL CLIENTE'}
              </h1>
              <p className="report-subtitle">
                {isEn
                  ? 'Industrial Drying Simulation & Performance Evaluation'
                  : 'Simulación de Secado y Evaluación de Rendimiento Industrial'}
              </p>
            </div>
            <div className="header-right">
              <div className="meta-item">
                <span className="meta-label">{isEn ? 'Date' : 'Fecha'}:</span>
                <span className="meta-value">{currentDate}</span>
              </div>
              <div className="meta-item">
                <span className="meta-label">{isEn ? 'Advisor' : 'Asesor'}:</span>
                <span className="meta-value fw-semibold">{user?.nombre || 'Especialista Técnico'}</span>
              </div>
              <div className="meta-item">
                <span className="meta-label">{isEn ? 'Role' : 'Cargo'}:</span>
                <span className="meta-value">{translateRole(user?.cargo, lang) || (isEn ? 'Technical Advisor' : 'Asesor Técnico')}</span>
              </div>
            </div>
          </div>
        </div>

        {/* 1. CONDICIONES DE ENTRADA (4 BLOQUES: Grano, Parámetros, Empresa, Sitio) */}
        <div className="client-report-section-title">
          <i className="fas fa-sliders-h me-2 text-primary"></i>
          {isEn ? 'INPUT CONDITIONS & OPERATING SPECIFICATIONS' : 'CONDICIONES DE ENTRADA Y PARÁMETROS OPERATIVOS'}
        </div>

        <div className="client-inputs-grid-4">
          {/* Bloque: Datos de la Empresa */}
          <div className="input-card">
            <div className="input-card-title text-primary">
              <i className="fas fa-building me-2"></i>{isEn ? 'Company Information' : 'Datos de la Empresa'}
            </div>
            <div className="input-card-row">
              <span className="label">{isEn ? 'Company Name' : 'Nombre de la Empresa'}:</span>
              <span className="val fw-bold text-dark">{empresaNombre}</span>
            </div>
            <div className="input-card-row">
              <span className="label">{isEn ? 'Location' : 'Ubicación'}:</span>
              <span className="val">{empresaUbicacion}</span>
            </div>
            <div className="input-card-row">
              <span className="label">{isEn ? 'Contact' : 'Contacto'}:</span>
              <span className="val">{empresaContacto}</span>
            </div>
          </div>

          {/* Bloque: 1. Configuración de Grano */}
          <div className="input-card">
            <div className="input-card-title text-success">
              <i className="fas fa-seedling me-2"></i>{isEn ? '1. Grain Configuration' : '1. Configuración de Grano'}
            </div>
            <div className="input-card-row">
              <span className="label">{isEn ? 'Grain Type' : 'Tipo de Grano'}:</span>
              <span className="val fw-bold text-success">{grainLabel}</span>
            </div>
            <div className="input-card-row">
              <span className="label">{isEn ? 'Grain Temp. Limit' : 'Límite Temp. Grano'}:</span>
              <span className="val">{tempLimiteGrano} °C</span>
            </div>
            <div className="input-card-row">
              <span className="label">{isEn ? 'Bulk Density' : 'Densidad Aparente'}:</span>
              <span className="val">{densidadAparente} kg/m³</span>
            </div>
          </div>

          {/* Bloque: 2. Parámetros Operativos */}
          <div className="input-card">
            <div className="input-card-title text-purple">
              <i className="fas fa-cogs me-2"></i>{isEn ? '2. Operating Parameters' : '2. Parámetros Operativos'}
            </div>
            <div className="input-card-row">
              <span className="label">{isEn ? 'Initial Moisture (M0)' : 'Humedad Inicial (M₀)'}:</span>
              <span className="val fw-bold text-danger">{hIni}% b.h.</span>
            </div>
            <div className="input-card-row">
              <span className="label">{isEn ? 'Target Moisture (Mf)' : 'Humedad Objetivo (M_f)'}:</span>
              <span className="val fw-bold text-success">{hObj}% b.h.</span>
            </div>
            <div className="input-card-row">
              <span className="label">{isEn ? 'Target Capacity' : 'Meta de Procesamiento'}:</span>
              <span className="val fw-bold text-dark">{metaSecado} Ton/día</span>
            </div>
            <div className="input-card-row">
              <span className="label">{isEn ? 'Air Velocity' : 'Velocidad del Aire'}:</span>
              <span className="val">{velocidadAire} m/s</span>
            </div>
          </div>

          {/* Bloque: 3. Condiciones del Sitio */}
          <div className="input-card">
            <div className="input-card-title text-info">
              <i className="fas fa-cloud-sun me-2"></i>{isEn ? '3. Site Conditions' : '3. Condiciones del Sitio'}
            </div>
            <div className="input-card-row">
              <span className="label">{isEn ? 'Ambient Temperature' : 'Temperatura Ambiente'}:</span>
              <span className="val">{tempAmbiente} °C</span>
            </div>
            <div className="input-card-row">
              <span className="label">{isEn ? 'Relative Humidity' : 'Humedad Relativa'}:</span>
              <span className="val">{hrAmbiente}%</span>
            </div>
            <div className="input-card-row">
              <span className="label">{isEn ? 'Altitude' : 'Altitud'}:</span>
              <span className="val">{altitud} msnm</span>
            </div>
            <div className="input-card-row">
              <span className="label">{isEn ? 'Thermal Efficiency' : 'Eficiencia Térmica'}:</span>
              <span className="val">{eficienciaTermica} ({isEn ? 'Fixed' : 'Fija'})</span>
            </div>
          </div>
        </div>

        {/* 2. SIMULACIÓN REAL DE PRODUCCIÓN (DATOS DE LA MÁQUINA SELECCIONADA) */}
        <div className="client-report-section-title mt-2">
          <i className="fas fa-tachometer-alt me-2 text-primary"></i>
          {isEn ? `REAL PRODUCTION SIMULATION - ${machineModel}` : `${tituloSimReal}`}
        </div>

        <div className="kpi-real-grid">
          <div className="kpi-real-card border-blue">
            <div className="kpi-real-label">{isEn ? 'REAL WET TONNES' : 'TONELADAS HÚMEDAS REALES'}</div>
            <div className="kpi-real-value text-blue">{tonHumedas}</div>
            <div className="kpi-real-sub">{humedasHora}</div>
          </div>

          <div className="kpi-real-card border-green">
            <div className="kpi-real-label">{isEn ? 'REAL FINAL DRY YIELD' : 'PRODUCCIÓN FINAL SECA REAL'}</div>
            <div className="kpi-real-value text-green">{prodSeca}</div>
            <div className="kpi-real-sub">{secaHora}</div>
          </div>

          <div className="kpi-real-card border-amber">
            <div className="kpi-real-label">{isEn ? 'REAL THERMAL CONSUMPTION' : 'CONSUMO TÉRMICO REAL'}</div>
            <div className="kpi-real-value text-amber">{energia}</div>
            <div className="kpi-real-sub">{diesel}</div>
          </div>

          <div className="kpi-real-card border-emerald">
            <div className="kpi-real-label">
              <i className="fas fa-layer-group me-1"></i>{isEn ? 'LOTS' : 'LOTES'}
            </div>
            <div className="kpi-real-value text-emerald">{baches}</div>
            <div className="kpi-real-sub">{isEn ? 'Batches per day' : 'Lotes por día'}</div>
          </div>

          <div className="kpi-real-card border-indigo">
            <div className="kpi-real-label">
              <i className="fas fa-tractor me-1"></i>{isEn ? 'SELECTED MACHINE' : 'MÁQUINA SELECCIONADA'}
            </div>
            <div className="kpi-real-value text-indigo">{machineModel}</div>
            <div className="kpi-real-sub">{machineHolding} Ton | {machineCaudal} m³/h</div>
          </div>
        </div>

        {/* 3. ESTRATEGIA MULTIPASO REAL (SIN LA COLUMNA DE TIEMPO) */}
        <div className="client-report-section-title mt-2">
          <i className="fas fa-layer-group me-2 text-primary"></i>
          {isEn ? 'REAL MULTI-PASS FRACTIONATED THERMAL STRATEGY (LSU)' : 'ESTRATEGIA MULTIPASO POR FRACCIONAMIENTO TÉRMICO (LSU) REAL'}
        </div>

        <div className="steps-table-wrapper">
          <table className="client-report-table">
            <thead>
              <tr>
                <th style={{width: '20%'}}>{isEn ? 'Stage' : 'Etapa'}</th>
                <th style={{width: '12%'}}>{isEn ? 'Type' : 'Tipo'}</th>
                <th style={{width: '10%'}}>{isEn ? 'Air Temp.' : 'Temp. Aire'}<br/><span className="unit-th">(°C)</span></th>
                <th style={{width: '10%'}}>{isEn ? 'Grain Temp.' : 'Temp. Grano'}<br/><span className="unit-th">(°C)</span></th>
                <th style={{width: '11%'}}>{isEn ? 'Outlet Air T.' : 'T. Salida Aire'}<br/><span className="unit-th">(°C)</span></th>
                <th style={{width: '9%'}}>{isEn ? 'Air RH' : 'HR Aire'}<br/><span className="unit-th">(%)</span></th>
                <th style={{width: '10%'}}>{isEn ? 'Inlet Moist.' : 'Humedad Ent.'}<br/><span className="unit-th">(%)</span></th>
                <th style={{width: '10%'}}>{isEn ? 'Outlet Moist.' : 'Humedad Sal.'}<br/><span className="unit-th">(%)</span></th>
                <th style={{width: '8%'}}>{isEn ? 'ΔM (%)' : 'ΔM (%)'}</th>
                {/* LA COLUMNA DE TIEMPO (min) HA SIDO OMITIDA SEGÚN REQUERIMIENTO */}
              </tr>
            </thead>
            <tbody>
              {steps.map((st, idx) => (
                <tr key={idx}>
                  <td><strong>{st.etapa}</strong></td>
                  <td>
                    <span className={`sim-badge ${st.badgeClass}`}>{st.tipo}</span>
                  </td>
                  <td>{st.tempAire}</td>
                  <td>{st.tempGrano}</td>
                  <td>{st.tempAireSalida}</td>
                  <td>{st.hrAire}</td>
                  <td>{st.mEnt}</td>
                  <td>{st.mSal}</td>
                  <td>{st.deltaM}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Resumen de Balance de Masa y Energía */}
        <div className="client-balance-summary mt-2">
          <div className="balance-summary-card">
            <div className="balance-item">
              <span className="balance-label"><i className="fas fa-tint me-1 text-info"></i>{isEn ? 'Moisture Drop' : 'Reducción de Humedad'}:</span>
              <span className="balance-val fw-bold text-primary">{hIni}% ➔ {hObj}% (ΔM: {(Number(hIni) - Number(hObj)).toFixed(1)}%)</span>
            </div>
            <div className="balance-item">
              <span className="balance-label"><i className="fas fa-box-open me-1 text-success"></i>{isEn ? 'Commercial Recovery' : 'Rendimiento Comercial'}:</span>
              <span className="balance-val fw-bold text-success">{prodSeca}</span>
            </div>
            <div className="balance-item">
              <span className="balance-label"><i className="fas fa-gas-pump me-1 text-danger"></i>{isEn ? 'Energy / Fuel' : 'Consumo Térmico'}:</span>
              <span className="balance-val fw-bold text-dark">{diesel}</span>
            </div>
          </div>
        </div>
      </div>

      {/* ==================== PÁGINA 2: CALIDAD, TRANSICIÓN VÍTREA Y FIRMAS ==================== */}
      <div className="client-report-page client-report-page-2">
        <div className="client-report-header-mini">
          <div>
            <span className="fw-bold text-dark">{empresaNombre}</span> — <span className="text-muted">{grainLabel} | {machineModel}</span>
          </div>
          <div className="text-muted small">
            {isEn ? 'Page 2: Quality Assurance & Technical Acceptance' : 'Página 2: Garantía de Calidad y Conformidad Técnica'} | {currentDate}
          </div>
        </div>

        {/* Garantía de Calidad y Transición Vítrea */}
        <div className="client-report-section-title mt-2">
          <i className="fas fa-shield-alt me-2 text-success"></i>
          {isEn ? 'GRAIN QUALITY GUARANTEE & GLASS TRANSITION KINETICS' : 'GARANTÍA DE CALIDAD Y TRANSICIÓN VÍTREA (INTEGRIDAD DE GRANO)'}
        </div>

        <div className="chart-and-quality-box">
          <div className="chart-preview-container">
            <div style={{ width: '100%', minHeight: '260px', height: '260px', position: 'relative' }}>
              <Chart
                id="chartTransicionVitreaClientReport"
                config={chartConfig}
                lang={lang}
              />
            </div>
          </div>

          <div className="quality-statement-card">
            <div className="quality-statement-title">
              <i className="fas fa-check-circle text-success me-2"></i>
              {isEn ? 'Thermal Integrity & Anti-Fissuring Guarantee' : 'Certificación de Integridad Térmica y Cero Fisurado'}
            </div>
            <p className="quality-statement-text">
              {isEn
                ? 'The fractionated multi-stage drying strategy guarantees that grain temperature remains below the glass transition curve (Tg) during critical moisture removal passes. This eliminates thermal stress gradients, prevents starch micro-cracking, and maximizes whole grain milling recovery (head rice yield) and seed germination viability.'
                : 'La estrategia operativa de secado por etapas fraccionadas asegura que la temperatura del grano permanezca siempre por debajo de la curva de transición vítrea (Tg) en los momentos de mayor tasa de remoción de agua. Esto evita el choque higrotérmico y las microfisuras en el endospermo, garantizando el máximo rendimiento de grano entero comercializable y preservando su valor nutricional y poder germinativo.'}
            </p>
          </div>
        </div>

        {/* Recomendaciones Técnicas */}
        <div className="client-report-section-title mt-3">
          <i className="fas fa-clipboard-check me-2 text-primary"></i>
          {isEn ? 'TECHNICAL RECOMMENDATIONS & BEST PRACTICES' : 'RECOMENDACIONES TÉCNICAS Y BUENAS PRÁCTICAS'}
        </div>

        <div className="recommendations-box">
          <div className="recommendation-item">
            <i className="fas fa-thermometer-half text-primary me-2 mt-1"></i>
            <div>
              <strong>{isEn ? 'Air Temperature Regulation:' : 'Regulación Térmica del Aire:'}</strong>{' '}
              {isEn
                ? `Maintain drying plenum air temperature at the recommended limits with continuous burner modulation to prevent grain overheating.`
                : `Mantener la temperatura del aire en el pleno dentro de los límites calculados para cada paso mediante modulación continua del quemador.`}
            </div>
          </div>
          <div className="recommendation-item">
            <i className="fas fa-hourglass-half text-warning me-2 mt-1"></i>
            <div>
              <strong>{isEn ? 'Strict Resting Equilibrium:' : 'Equilibrio Higrotérmico en Reposo:'}</strong>{' '}
              {isEn
                ? 'Ensure complete resting time between drying stages to allow internal moisture gradient dissipation toward the grain husk.'
                : 'Respetar los ciclos de reposo en silos de atemperado entre pasajes de secado para permitir la migración homogénea de humedad interna hacia la cáscara.'}
            </div>
          </div>
          <div className="recommendation-item">
            <i className="fas fa-warehouse text-success me-2 mt-1"></i>
            <div>
              <strong>{isEn ? 'Cooling Before Final Storage:' : 'Enfriamiento Previo a Silos Finales:'}</strong>{' '}
              {isEn
                ? `Cool the final discharge grain close to ambient temperature before long-term storage at target ${hObj}%.`
                : `Asegurar que el grano descargado a la humedad objetivo (${hObj}%) ingrese a los silos de almacenamiento debidamente enfriado para conservar su inocuidad.`}
            </div>
          </div>
        </div>

        {/* Firmas de Conformidad */}
        <div className="signatures-container">
          <div className="signature-card">
            <div className="signature-line"></div>
            <div className="signature-name">{user?.nombre || 'Especialista Técnico'}</div>
            <div className="signature-role">{translateRole(user?.cargo, lang) || (isEn ? 'Technical & Commercial Specialist' : 'Especialista Técnico y Comercial')}</div>
            <div className="signature-org">Mega Drying Systems / Simulador Industrial LSU</div>
            <div className="signature-date">{isEn ? 'Date' : 'Fecha'}: {currentDate.split(' ')[0]}</div>
          </div>

          <div className="signature-card">
            <div className="signature-line"></div>
            <div className="signature-name">{empresaContacto || (isEn ? 'Client Representative' : 'Representante del Cliente')}</div>
            <div className="signature-role">{isEn ? 'Client Acceptance & Receipt' : 'Conformidad y Recepción de Planta'}</div>
            <div className="signature-org">{empresaNombre}</div>
            <div className="signature-date">{isEn ? 'Date' : 'Fecha'}: ______________________</div>
          </div>
        </div>
      </div>
    </div>
  );
}
