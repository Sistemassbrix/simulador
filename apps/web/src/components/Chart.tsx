import { useEffect, useRef } from 'react';
import { Chart as ChartJS, registerables, ChartConfiguration } from 'chart.js';
import { Language, translate } from '../i18n';
ChartJS.register(...registerables);
ChartJS.defaults.font.family = "'Muli', 'Mulish', system-ui, -apple-system, BlinkMacSystemFont, Roboto, sans-serif";
if (ChartJS.defaults.plugins?.title) {
  ChartJS.defaults.plugins.title.font = {
    family: "'Exo', system-ui, -apple-system, sans-serif",
    weight: 'bold'
  };
}
export function Chart({ id, config, details, lang = 'es' }: { id: string; config: any; details?: any; lang?: Language }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    if (!ref.current || !config) return;
    const options = structuredClone(config);
    if (lang === 'en') {
      if (options.data?.datasets) {
        for (const ds of options.data.datasets) {
          if (ds.label) ds.label = translate(ds.label, 'en');
        }
      }
      if (options.options?.plugins?.title?.text) {
        const origTitle = options.options.plugins.title.text;
        if (typeof origTitle === 'string') {
          options.options.plugins.title.text = translate(origTitle, 'en');
        }
      }
      if (options.options?.scales) {
        for (const scale of Object.values(options.options.scales) as any[]) {
          if (scale?.title?.text && typeof scale.title.text === 'string') {
            scale.title.text = translate(scale.title.text, 'en');
          }
        }
      }
    }
    if (id === 'chartTransicionVitrea') {
      options.options = options.options || {};
      options.options.plugins = options.options.plugins || {};
      options.options.plugins.tooltip = {
        callbacks: {
          label: (context: any) => {
            if (context.dataset.type === 'scatter') {
              const pt = context.raw;
              const etapa = lang === 'en' ? translate(pt?.etapa || '', 'en') : (pt?.etapa || '');
              return `${etapa}: ${pt.y.toFixed(1)}°C @ ${pt.x.toFixed(1)}%`;
            }
            return lang === 'en' ? `Tg: ${context.parsed.y}°C @ Moisture: ${context.parsed.x.toFixed(1)}%` : `Tg: ${context.parsed.y}°C @ Humedad: ${context.parsed.x.toFixed(1)}%`;
          }
        }
      };
    } else if (id.includes('ciclo-horario') && details?.hours) {
      options.options.plugins.tooltip.callbacks = {
        afterBody: (context: any) => {
          const h = details.hours[context[0].dataIndex], s = details.franja;
          const active = s.horaInicio <= s.horaFin ? h.hora >= s.horaInicio && h.hora <= s.horaFin : h.hora >= s.horaInicio || h.hora <= s.horaFin;
          if (lang === 'en') {
            return `Psychrometric Deficit: ${h.deficit} g/kg\nCondition: ${active ? '☀️ Active Slot (Drying)' : '🌙 Night / Outside Slot (RH Risk)'}`;
          }
          return `Déficit Psicrométrico: ${h.deficit} g/kg\nCondición: ${active ? '☀️ Franja Activa (Secado)' : '🌙 Nocturna / Fuera de Franja (Riesgo HR)'}`;
        }
      };
    } else if (id.includes('weibull-temp') && details?.statistics) {
      const w = details.statistics.weibull;
      options.options.plugins.tooltip.callbacks = { afterTitle: () => lang === 'en' ? `Mode (Most Frequent): ${w.tempModa}°C | Median (P50): ${w.tempP50}°C` : `Moda (Más Frecuente): ${w.tempModa}°C | Mediana (P50): ${w.tempP50}°C` };
    } else if (id.includes('weibull-hr') && details?.statistics) {
      const w = details.statistics.weibull;
      options.options.plugins.tooltip.callbacks = { afterTitle: () => lang === 'en' ? `Mode (Most Frequent): ${w.hrModa}% | Worst Case (P90): ${details.statistics.critico.hrP90}%` : `Moda (Más Frecuente): ${w.hrModa}% | Peor Caso (P90): ${details.statistics.critico.hrP90}%` };
    }
    const chart = new ChartJS(ref.current, options as ChartConfiguration);
    return () => chart.destroy();
  }, [config, id, details, lang]);
  return <canvas ref={ref} id={id} />;
}
