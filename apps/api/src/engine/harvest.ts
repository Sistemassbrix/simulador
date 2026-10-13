import {OutputBuffer} from './output';
// Statistical and synthetic models retain the original constants.
export function calculateHarvest(input:Record<string,any>, data?:any) {
 const output=new OutputBuffer(input); const Plot=output.plotClass();
    const nombresMeses = [
        'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
        'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
    ];

    const diasPorMes = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

    // Variables de Estado Global
    let datosClimaticosGlobales = []; // Días procesados
    let datosHorariosGlobales = [];    // Horas crudas { mes, dia, hora, temp, hr, rad }
    let perfilHorario24h = [];        // 24 horas promediadas { hora, t_mean, t_min, t_max, hr_mean, hr_min, hr_max, deficit }
    let datosFranjaActiva = [];       // Registros horarios filtrados por la franja activa
    let ciudadActualNombre = output.select('#buscar_ciudad').val()?.trim() || 'Acarigua, Venezuela';
    let modoVisualizacion = 'pestanas'; // 'pestanas' o 'cuadricula'

    // Instancias de Gráficos Chart.js (Modo Pestañas)
    let chartCicloHorario = null;
    let chartWeibullTemp = null;
    let chartWeibullHr = null;
    let chartSerieTemporal = null;

    // Instancias de Gráficos Chart.js (Modo Cuadrícula)
    let chartGridCicloHorario = null;
    let chartGridWeibullTemp = null;
    let chartGridWeibullHr = null;
    let chartGridSerieTemporal = null;

    // Configuración de Franja Horaria (Por defecto: Diurna 08:00 - 18:00)
    let franjaActual = input.franja || {
        tipo: 'diurna',
        nombre: 'Franja Diurna / Secado Solar',
        horaInicio: 8,
        horaFin: 18
    };

    // Estadísticas de diseño calculadas
    let estadisticasDiseno = {
        diurna: { temp: 32.8, hr: 52.4 },
        weibull: { tempModa: 33.2, hrModa: 49.5, tempP50: 32.5, hrP50: 51.2, k_t: 3.42, c_t: 34.1, k_hr: 2.85, c_hr: 56.2 },
        critico: { tempP10: 24.5, hrP90: 78.0 },
        promedio24h: { temp: 28.5, hr: 65.4 }
    };


function horaPerteneceAFranja(hora: any, start: any, end: any): any {
    if (start <= end) {
        return hora >= start && hora <= end;
    }
    else {
        return hora >= start || hora <= end;
    }
}
function procesarDatosHistoricosCompletos(data: any, anioInicio: any, anioFin: any, mesesSeleccionados: any, lat: any, lon: any, alt: any): any {
    try {
        const hourly = data.hourly;
        const totalHoras = hourly.time.length;
        const horasFiltradas = [];
        const acumulador24h = Array.from({ length: 24 }, () => ({
            t_sum: 0,
            t_min: 999,
            t_max: -999,
            hr_sum: 0,
            hr_min: 999,
            hr_max: -999,
            rad_sum: 0,
            count: 0
        }));
        const acumuladorPorDia = {};
        for (let i = 0; i < totalHoras; i++) {
            const timeStr = hourly.time[i];
            const fechaHora = timeStr.split('T');
            const partesFecha = fechaHora[0].split('-');
            const mes = parseInt(partesFecha[1], 10);
            const dia = parseInt(partesFecha[2], 10);
            const hora = parseInt(fechaHora[1].split(':')[0], 10);
            if (!mesesSeleccionados.includes(mes)) {
                continue;
            }
            const temp = hourly.temperature_2m[i];
            const hr = hourly.relative_humidity_2m[i];
            const rad = hourly.direct_normal_irradiance ? (hourly.direct_normal_irradiance[i] || 0) : 0;
            if (temp !== null && !isNaN(temp) && hr !== null && !isNaN(hr)) {
                horasFiltradas.push({ mes, dia, hora, temp, hr, rad });
                const acc = acumulador24h[hora];
                acc.t_sum += temp;
                if (temp < acc.t_min)
                    acc.t_min = temp;
                if (temp > acc.t_max)
                    acc.t_max = temp;
                acc.hr_sum += hr;
                if (hr < acc.hr_min)
                    acc.hr_min = hr;
                if (hr > acc.hr_max)
                    acc.hr_max = hr;
                acc.rad_sum += rad;
                acc.count++;
                // Acumulador diario
                const claveDia = `${String(mes).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;
                if (!acumuladorPorDia[claveDia]) {
                    acumuladorPorDia[claveDia] = { mes, dia, t_sum: 0, t_max: -999, t_min: 999, hr_sum: 0, hr_max: -999, hr_min: 999, count: 0 };
                }
                const dAcc = acumuladorPorDia[claveDia];
                dAcc.t_sum += temp;
                if (temp > dAcc.t_max)
                    dAcc.t_max = temp;
                if (temp < dAcc.t_min)
                    dAcc.t_min = temp;
                dAcc.hr_sum += hr;
                if (hr > dAcc.hr_max)
                    dAcc.hr_max = hr;
                if (hr < dAcc.hr_min)
                    dAcc.hr_min = hr;
                dAcc.count++;
            }
        }
        datosHorariosGlobales = horasFiltradas;
        // Calcular perfil horario 24h
        const pAtmKpa = 101.325 * Math.pow(1 - 2.25577e-5 * alt, 5.25588);
        perfilHorario24h = acumulador24h.map((acc: any, h: any) => {
            const tMean = acc.count > 0 ? (acc.t_sum / acc.count) : 28.0;
            const hrMean = acc.count > 0 ? (acc.hr_sum / acc.count) : 65.0;
            const radMean = acc.count > 0 ? (acc.rad_sum / acc.count) : 0;
            const pSat = 0.61078 * Math.exp((17.27 * tMean) / (tMean + 237.3));
            const pVapor = pSat * (hrMean / 100);
            const wActual = 0.622 * (pVapor / Math.max(1, pAtmKpa - pVapor));
            const wSat = 0.622 * (pSat / Math.max(1, pAtmKpa - pSat));
            const deficitGKg = Math.max(0, (wSat - wActual) * 1000);
            return {
                hora: h,
                etiquetaHora: `${String(h).padStart(2, '0')}:00`,
                t_mean: parseFloat(tMean.toFixed(1)),
                t_min: parseFloat((acc.t_min !== 999 ? acc.t_min : tMean - 4).toFixed(1)),
                t_max: parseFloat((acc.t_max !== -999 ? acc.t_max : tMean + 4).toFixed(1)),
                hr_mean: parseFloat(hrMean.toFixed(1)),
                hr_min: parseFloat((acc.hr_min !== 999 ? acc.hr_min : hrMean - 15).toFixed(1)),
                hr_max: parseFloat((acc.hr_max !== -999 ? acc.hr_max : hrMean + 15).toFixed(1)),
                rad_mean: Math.round(radMean),
                deficit: parseFloat(deficitGKg.toFixed(2))
            };
        });
        // Procesar días agregados
        const listaDias = [];
        Object.keys(acumuladorPorDia).sort().forEach((clave: any) => {
            const item = acumuladorPorDia[clave];
            if (item.count > 0) {
                const tMean = item.t_sum / item.count;
                const hrMean = item.hr_sum / item.count;
                let condicion = 'Óptimo';
                let badgeClass = 'badge-condition-optimo';
                if (hrMean > 78) {
                    condicion = 'Lluvioso / Húmedo';
                    badgeClass = 'badge-condition-critico';
                }
                else if (hrMean >= 65) {
                    condicion = 'Favorable';
                    badgeClass = 'badge-condition-favorable';
                }
                listaDias.push({
                    mes: item.mes,
                    dia: item.dia,
                    nombreMes: nombresMeses[item.mes - 1],
                    etiquetaDia: `${item.dia} de ${nombresMeses[item.mes - 1]}`,
                    t_mean: parseFloat(tMean.toFixed(1)),
                    t_max: parseFloat(item.t_max.toFixed(1)),
                    t_min: parseFloat(item.t_min.toFixed(1)),
                    hr_mean: parseFloat(hrMean.toFixed(1)),
                    hr_max: parseFloat(item.hr_max.toFixed(1)),
                    hr_min: parseFloat(item.hr_min.toFixed(1)),
                    condicion: condicion,
                    badgeClass: badgeClass
                });
            }
        });
        datosClimaticosGlobales = listaDias;
        output.select('#resumen-ciudad').text(ciudadActualNombre);
        output.select('#resumen-coords').text(`Lat: ${lat}°N, Lon: ${lon}°W | ${alt} m`);
        output.select('#resumen-periodo').text(`${anioInicio} - ${anioFin}`);
        const cantMeses = mesesSeleccionados.length;
        output.select('#resumen-meses').text(`${cantMeses} ${cantMeses === 1 ? 'Mes' : 'Meses'} de Cosecha`);
        recalcularAnalisisFranja();
    }
    catch (e) {
        console.error('Error al procesar datos históricos:', e);
        generarDatosSinteticosAvanzados(lat, lon, alt, anioInicio, anioFin, mesesSeleccionados);
    }
}
function generarDatosSinteticosAvanzados(lat: any, lon: any, alt: any, anioInicio: any, anioFin: any, mesesSeleccionados: any): any {
    const horasFiltradas = [];
    const baseTemp = 29.5 - (alt * 0.0055) - Math.abs(lat - 9.5) * 0.15;
    const listaDias = [];
    mesesSeleccionados.forEach((mes: any) => {
        const numDias = diasPorMes[mes - 1];
        const esLluvioso = (mes >= 5 && mes <= 11);
        const factorMesTemp = esLluvioso ? -0.8 : 1.6;
        const factorMesHr = esLluvioso ? 11.0 : -9.0;
        for (let d = 1; d <= numDias; d++) {
            const variacionDia = Math.sin((d / 31) * Math.PI) * 0.7;
            const diaTMean = baseTemp + factorMesTemp + variacionDia;
            const diaHrMean = Math.min(90, Math.max(48, 64 + factorMesHr + (Math.sin(d * 0.8) * 3)));
            listaDias.push({
                mes: mes,
                dia: d,
                nombreMes: nombresMeses[mes - 1],
                etiquetaDia: `${d} de ${nombresMeses[mes - 1]}`,
                t_mean: parseFloat(diaTMean.toFixed(1)),
                t_max: parseFloat((diaTMean + 6.2).toFixed(1)),
                t_min: parseFloat((diaTMean - 5.2).toFixed(1)),
                hr_mean: parseFloat(diaHrMean.toFixed(1)),
                hr_max: parseFloat(Math.min(98, diaHrMean + 16).toFixed(1)),
                hr_min: parseFloat(Math.max(32, diaHrMean - 18).toFixed(1)),
                condicion: diaHrMean > 75 ? 'Lluvioso / Húmedo' : 'Favorable',
                badgeClass: diaHrMean > 75 ? 'badge-condition-critico' : 'badge-condition-favorable'
            });
            for (let h = 0; h < 24; h++) {
                const angulo = ((h - 6) / 24) * 2 * Math.PI;
                const oscilacion = Math.sin(angulo);
                const tempHora = diaTMean + (oscilacion * 6.5) + (Math.sin(h * 0.5) * 0.3);
                const hrHora = Math.min(98, Math.max(35, diaHrMean - (oscilacion * 24.0) + (Math.cos(h * 0.5) * 0.8)));
                const radHora = (h >= 6 && h <= 18) ? Math.sin(((h - 6) / 12) * Math.PI) * (esLluvioso ? 600 : 850) : 0;
                horasFiltradas.push({ mes, dia: d, hora: h, temp: tempHora, hr: hrHora, rad: radHora });
            }
        }
    });
    datosHorariosGlobales = horasFiltradas;
    datosClimaticosGlobales = listaDias;
    const pAtmKpa = 101.325 * Math.pow(1 - 2.25577e-5 * alt, 5.25588);
    perfilHorario24h = Array.from({ length: 24 }, (_: any, h: any) => {
        const horasH = horasFiltradas.filter((x: any) => x.hora === h);
        const tMean = horasH.reduce((acc: any, x: any) => acc + x.temp, 0) / horasH.length;
        const hrMean = horasH.reduce((acc: any, x: any) => acc + x.hr, 0) / horasH.length;
        const radMean = horasH.reduce((acc: any, x: any) => acc + x.rad, 0) / horasH.length;
        const pSat = 0.61078 * Math.exp((17.27 * tMean) / (tMean + 237.3));
        const pVapor = pSat * (hrMean / 100);
        const wActual = 0.622 * (pVapor / Math.max(1, pAtmKpa - pVapor));
        const wSat = 0.622 * (pSat / Math.max(1, pAtmKpa - pSat));
        const deficitGKg = Math.max(0, (wSat - wActual) * 1000);
        return {
            hora: h,
            etiquetaHora: `${String(h).padStart(2, '0')}:00`,
            t_mean: parseFloat(tMean.toFixed(1)),
            t_min: parseFloat((tMean - 3.5).toFixed(1)),
            t_max: parseFloat((tMean + 3.8).toFixed(1)),
            hr_mean: parseFloat(hrMean.toFixed(1)),
            hr_min: parseFloat((hrMean - 12).toFixed(1)),
            hr_max: parseFloat((hrMean + 12).toFixed(1)),
            rad_mean: Math.round(radMean),
            deficit: parseFloat(deficitGKg.toFixed(2))
        };
    });
    output.select('#resumen-ciudad').text(ciudadActualNombre);
    output.select('#resumen-coords').text(`Lat: ${lat}°N, Lon: ${lon}°W | ${alt} m`);
    output.select('#resumen-periodo').text(`${anioInicio || 2021} - ${anioFin || 2025}`);
    const cantMeses = mesesSeleccionados.length;
    output.select('#resumen-meses').text(`${cantMeses} ${cantMeses === 1 ? 'Mes' : 'Meses'} de Cosecha`);
    recalcularAnalisisFranja();
}
function ajustarWeibull(datos: any): any {
    if (!datos || datos.length < 5) {
        return { k: 3.2, c: 32.0, moda: 31.5, p50: 31.0, p10: 25.0, p90: 36.0, pdf: () => 0 };
    }
    const N = datos.length;
    const media = datos.reduce((a: any, b: any) => a + b, 0) / N;
    const varianza = datos.reduce((a: any, b: any) => a + Math.pow(b - media, 2), 0) / (N - 1);
    const desv = Math.max(0.1, Math.sqrt(varianza));
    let k = Math.pow(desv / media, -1.086);
    if (isNaN(k) || k < 1.0)
        k = 1.8;
    if (k > 15.0)
        k = 15.0;
    const gammaArg = 1 + (1 / k);
    const gammaVal = aproximarGamma(gammaArg);
    const c = media / gammaVal;
    const moda = k > 1 ? c * Math.pow((k - 1) / k, 1 / k) : media;
    const p50 = c * Math.pow(Math.log(2), 1 / k);
    const p10 = c * Math.pow(-Math.log(0.90), 1 / k);
    const p90 = c * Math.pow(-Math.log(0.10), 1 / k);
    const pdf = function (x: any) {
        if (x <= 0 || c <= 0)
            return 0;
        return (k / c) * Math.pow(x / c, k - 1) * Math.exp(-Math.pow(x / c, k));
    };
    return {
        k: parseFloat(k.toFixed(2)),
        c: parseFloat(c.toFixed(2)),
        media: parseFloat(media.toFixed(1)),
        desv: parseFloat(desv.toFixed(1)),
        moda: parseFloat(moda.toFixed(1)),
        p50: parseFloat(p50.toFixed(1)),
        p10: parseFloat(p10.toFixed(1)),
        p90: parseFloat(p90.toFixed(1)),
        pdf: pdf
    };
}
function aproximarGamma(z: any): any {
    const g = 7;
    const C = [
        0.99999999999980993,
        676.5203681218851,
        -1259.1392167224028,
        771.32342877765313,
        -176.61502916214059,
        12.507343278686905,
        -0.138571095831171,
        9.9843695780195716e-6,
        1.5056327351493116e-7
    ];
    if (z < 0.5) {
        return Math.PI / (Math.sin(Math.PI * z) * aproximarGamma(1 - z));
    }
    z -= 1;
    let x = C[0];
    for (let i = 1; i < g + 2; i++) {
        x += C[i] / (z + i);
    }
    const t = z + g + 0.5;
    return Math.sqrt(2 * Math.PI) * Math.pow(t, z + 0.5) * Math.exp(-t) * x;
}
function recalcularAnalisisFranja(): any {
    if (!datosHorariosGlobales || datosHorariosGlobales.length === 0)
        return;
    datosFranjaActiva = datosHorariosGlobales.filter((item: any) => horaPerteneceAFranja(item.hora, franjaActual.horaInicio, franjaActual.horaFin));
    if (datosFranjaActiva.length === 0) {
        datosFranjaActiva = datosHorariosGlobales;
    }
    const tempFranja = datosFranjaActiva.map((d: any) => d.temp);
    const hrFranja = datosFranjaActiva.map((d: any) => d.hr);
    const tempPromFranja = (tempFranja.reduce((a: any, b: any) => a + b, 0) / tempFranja.length).toFixed(1);
    const hrPromFranja = (hrFranja.reduce((a: any, b: any) => a + b, 0) / hrFranja.length).toFixed(1);
    const tempProm24h = (datosHorariosGlobales.reduce((a: any, b: any) => a + b.temp, 0) / datosHorariosGlobales.length).toFixed(1);
    const hrProm24h = (datosHorariosGlobales.reduce((a: any, b: any) => a + b.hr, 0) / datosHorariosGlobales.length).toFixed(1);
    const weibullTemp = ajustarWeibull(tempFranja);
    const weibullHr = ajustarWeibull(hrFranja);
    estadisticasDiseno = {
        diurna: {
            temp: parseFloat(tempPromFranja),
            hr: parseFloat(hrPromFranja)
        },
        weibull: {
            tempModa: weibullTemp.moda,
            hrModa: weibullHr.moda,
            tempP50: weibullTemp.p50,
            hrP50: weibullHr.p50,
            k_t: weibullTemp.k,
            c_t: weibullTemp.c,
            k_hr: weibullHr.k,
            c_hr: weibullHr.c
        },
        critico: {
            tempP10: weibullTemp.p10,
            hrP90: weibullHr.p90
        },
        promedio24h: {
            temp: parseFloat(tempProm24h),
            hr: parseFloat(hrProm24h)
        }
    };
    // UI Summary Cards
    output.select('#resumen-temp').text(`${tempPromFranja} °C`);
    output.select('#resumen-humedad').text(`HR Franja: ${hrPromFranja}%`);
    output.select('#lbl-franja-temp').text(`${tempPromFranja}°C`);
    output.select('#lbl-franja-hr').text(`${hrPromFranja}%`);
    output.select('#lbl-24h-hr').text(`${hrProm24h}%`);
    let badgeEstado = 'Óptimo Secado';
    if (Number(hrPromFranja) > 75)
        badgeEstado = 'Húmedo / Riesgo';
    else if (Number(hrPromFranja) > 60)
        badgeEstado = 'Favorable';
    output.select('#resumen-condicion-badge').text(badgeEstado);
    output.select('#weibull-resumen-moda').text(`Moda: ${weibullTemp.moda} °C`);
    output.select('#weibull-resumen-hr').text(`HR Moda: ${weibullHr.moda}%`);
    output.select('#weibull-k-badge').text(`k = ${weibullTemp.k}`);
    output.select('#weibull-c-badge').text(`c = ${weibullTemp.c}`);
    output.select('#tag-weibull-temp-k').text(`k = ${weibullTemp.k}`);
    output.select('#tag-weibull-temp-c').text(`c = ${weibullTemp.c} °C`);
    output.select('#tag-weibull-temp-moda').text(`Moda = ${weibullTemp.moda} °C`);
    output.select('#grid-tag-weibull-temp').text(`Moda: ${weibullTemp.moda}°C (k=${weibullTemp.k})`);
    output.select('#tag-weibull-hr-k').text(`k = ${weibullHr.k}`);
    output.select('#tag-weibull-hr-c').text(`c = ${weibullHr.c} %`);
    output.select('#tag-weibull-hr-moda').text(`Moda = ${weibullHr.moda} %`);
    output.select('#grid-tag-weibull-hr').text(`Moda: ${weibullHr.moda}% (k=${weibullHr.k})`);
    // Recommendation Cards
    output.select('#rec-diurna-temp').text(`${tempPromFranja} °C`);
    output.select('#rec-diurna-hr').text(`${hrPromFranja} %`);
    output.select('#rec-weibull-temp').text(`${weibullTemp.moda} °C`);
    output.select('#rec-weibull-hr').text(`${weibullHr.moda} %`);
    output.select('#rec-critico-temp').text(`${weibullTemp.p10} °C`);
    output.select('#rec-critico-hr').text(`${weibullHr.p90} %`);
    output.select('#rec-promedio-temp').text(`${tempProm24h} °C`);
    output.select('#rec-promedio-hr').text(`${hrProm24h} %`);
    // Render Tables
    renderizarTablaHoraria(perfilHorario24h);
    renderizarTablaDiaria(datosClimaticosGlobales);
    // Render Charts (Tabs + Grid)
    renderizarTodosLosGraficos(tempFranja, hrFranja, weibullTemp, weibullHr);
    // Actualizar Predicción de Aptitud
    actualizarPrediccionAptitud(parseFloat(hrProm24h), parseFloat(hrPromFranja), perfilHorario24h);
}
function actualizarPrediccionAptitud(hrPromedio24: any, hrFranja: any, perfil24: any): any {
    // Encontrar el deficit promedio durante la franja activa
    const deficitFranja = perfil24.filter((h: any) => horaPerteneceAFranja(h.hora, franjaActual.horaInicio, franjaActual.horaFin))
        .map((h: any) => h.deficit);
    const deficitPromedio = deficitFranja.length > 0 ? (deficitFranja.reduce((a: any, b: any) => a + b, 0) / deficitFranja.length).toFixed(1) : 0;
    output.select('#aptitud-deficit').text(`${deficitPromedio} g/kg`);
    const $card = output.select('#aptitud-icono').closest('.dashboard-card');
    const $icono = output.select('#aptitud-icono');
    const $titulo = output.select('#aptitud-titulo');
    const $hi = output.select('#aptitud-hi');
    const $riesgo = output.select('#aptitud-riesgo');
    const $desc = output.select('#aptitud-descripcion');
    if (hrPromedio24 < 68 && hrFranja < 62) {
        // ÓPTIMA
        $card.css({ 'border-color': '#10b981', 'background': 'linear-gradient(to right, #ffffff, #f0fdf4)' });
        $icono.html('<i class="fas fa-check-circle" style="color: #10b981;"></i>');
        $titulo.text('ÓPTIMA').css('color', '#10b981');
        $hi.text('16% - 18%').removeClass('text-warning text-danger').addClass('text-success');
        $riesgo.text('Bajo').removeClass('text-warning text-danger').addClass('text-success');
        $desc.html('<strong>Condiciones excelentes:</strong> Precipitaciones bajas y alta capacidad de evaporación solar diurna. El grano entra relativamente seco a planta. El secado será muy rápido y requerirá mínimo gasto de combustible térmico.');
    }
    else if (hrPromedio24 >= 68 && hrPromedio24 <= 78) {
        // MODERADA
        $card.css({ 'border-color': '#f59e0b', 'background': 'linear-gradient(to right, #ffffff, #fffbeb)' });
        $icono.html('<i class="fas fa-exclamation-circle" style="color: #f59e0b;"></i>');
        $titulo.text('MODERADA').css('color', '#f59e0b');
        $hi.text('20% - 22%').removeClass('text-success text-danger').addClass('text-warning');
        $riesgo.text('Medio').removeClass('text-success text-danger').addClass('text-warning');
        $desc.html('<strong>Condiciones favorables con precaución:</strong> Días con nubosidad o lluvias intermitentes. El grano requerirá pre-limpieza rigurosa y secado continuo con aire caliente controlado para evitar pérdida de calidad.');
    }
    else {
        // CRÍTICA
        $card.css({ 'border-color': '#ef4444', 'background': 'linear-gradient(to right, #ffffff, #fef2f2)' });
        $icono.html('<i class="fas fa-times-circle" style="color: #ef4444;"></i>');
        $titulo.text('CRÍTICA / RIESGOSA').css('color', '#ef4444');
        $hi.text('24% - 28%').removeClass('text-success text-warning').addClass('text-danger');
        $riesgo.text('Muy Alto').removeClass('text-success text-warning').addClass('text-danger');
        $desc.html('<strong>Alerta Climática:</strong> Exceso de lluvias y humedad muy alta. El grano hiperhúmedo tiene máximo riesgo de deterioro por hongos y condensación. El secador requerirá <strong>máxima potencia térmica</strong> (Peor Escenario P90).');
    }
}
function renderizarTablaHoraria(horas24: any): any {
    const $tbody = output.select('#tbody-clima-horas');
    if (!$tbody.length)
        return;
    $tbody.empty();
    if (!horas24 || horas24.length === 0) {
        $tbody.html('<tr><td colspan="9" class="text-muted py-4">No hay datos horarios disponibles.</td></tr>');
        return;
    }
    let filasHtml = '';
    horas24.forEach((h: any) => {
        const estaEnFranja = horaPerteneceAFranja(h.hora, franjaActual.horaInicio, franjaActual.horaFin);
        const badgeFranja = estaEnFranja
            ? '<span class="badge bg-success-subtle text-success border border-success-subtle px-2 py-1"><i class="fas fa-sun me-1"></i>Activa</span>'
            : '<span class="badge bg-secondary-subtle text-secondary border border-secondary-subtle px-2 py-1">Fuera de Franja</span>';
        let calidad = 'Excelente Secado';
        let badgeCalidad = 'badge bg-success text-white px-2 py-1';
        if (h.hr_mean > 80 || h.deficit < 2.5) {
            calidad = 'Riesgo Rehumidificación';
            badgeCalidad = 'badge bg-danger text-white px-2 py-1';
        }
        else if (h.hr_mean > 68 || h.deficit < 5.0) {
            calidad = 'Secado Lento';
            badgeCalidad = 'badge bg-warning text-dark px-2 py-1';
        }
        else if (h.hr_mean >= 55 && h.hr_mean <= 68) {
            calidad = 'Favorable';
            badgeCalidad = 'badge bg-info text-dark px-2 py-1';
        }
        filasHtml += `
                <tr class="${estaEnFranja ? 'table-success-subtle' : ''}">
                    <td class="text-start ps-3 fw-bold text-dark"><i class="far fa-clock me-1 text-muted"></i>${h.etiquetaHora}</td>
                    <td>${badgeFranja}</td>
                    <td class="fw-bold text-success">${h.t_mean} °C</td>
                    <td class="text-muted small">${h.t_min} - ${h.t_max} °C</td>
                    <td class="fw-bold text-primary">${h.hr_mean} %</td>
                    <td class="text-muted small">${h.hr_min} - ${h.hr_max} %</td>
                    <td class="fw-semibold" style="color: #6366f1;"><i class="fas fa-wind me-1"></i>${h.deficit} g/kg</td>
                    <td><span class="${badgeCalidad}">${calidad}</span></td>
                    <td>
                        <button type="button" class="btn btn-outline-primary btn-sm btn-simulate-hour" 
                            data-hora="${h.etiquetaHora}" 
                            data-temp="${h.t_mean}" 
                            data-hr="${h.hr_mean}"
                            title="Simular secado a las ${h.etiquetaHora}">
                            <i class="fas fa-play me-1"></i>Simular
                        </button>
                    </td>
                </tr>
            `;
    });
    $tbody.html(filasHtml);
}
function renderizarTablaDiaria(dias: any): any {
    const $tbody = output.select('#tbody-clima-dias');
    if (!$tbody.length)
        return;
    $tbody.empty();
    if (!dias || dias.length === 0) {
        $tbody.html('<tr><td colspan="7" class="text-muted py-4">No hay días que coincidan con la selección.</td></tr>');
        return;
    }
    const filtroTexto = output.select('#filtro-tabla-dia').val()?.toLowerCase().trim() || '';
    const filtroMes = output.select('#filtro-tabla-mes').val() || 'todos';
    let filasHtml = '';
    let contados = 0;
    dias.forEach((d: any) => {
        if (filtroMes !== 'todos' && d.mes !== parseInt(filtroMes))
            return;
        if (filtroTexto && !d.etiquetaDia.toLowerCase().includes(filtroTexto))
            return;
        contados++;
        filasHtml += `
                <tr>
                    <td class="text-start ps-3 fw-semibold text-dark">${d.etiquetaDia}</td>
                    <td class="fw-bold text-success">${d.t_mean} °C</td>
                    <td class="fw-bold text-primary">${d.hr_mean} %</td>
                    <td class="text-muted small">${d.t_max} / ${d.t_min} °C</td>
                    <td class="text-muted small">${d.hr_max} / ${d.hr_min} %</td>
                    <td><span class="${d.badgeClass || 'badge bg-secondary'}">${d.condicion}</span></td>
                    <td>
                        <button type="button" class="btn btn-outline-primary btn-sm btn-simulate-day" 
                            data-dia="${d.etiquetaDia}" 
                            data-temp="${d.t_mean}" 
                            data-hr="${d.hr_mean}"
                            title="Simular secado con este día">
                            <i class="fas fa-play me-1"></i>Simular
                        </button>
                    </td>
                </tr>
            `;
    });
    if (contados === 0) {
        $tbody.html('<tr><td colspan="7" class="text-muted py-4">No hay registros con los filtros aplicados.</td></tr>');
    }
    else {
        $tbody.html(filasHtml);
    }
}
function renderizarTodosLosGraficos(tempFranja: any, hrFranja: any, weibullTemp: any, weibullHr: any): any {
    if (typeof Plot === 'undefined') {
        console.error('Chart.js no está cargado.');
        return;
    }
    // 1. Gráficas de Ciclo Horario
    renderizarGraficoCicloHorarioInstance('grafico-ciclo-horario', perfilHorario24h);
    renderizarGraficoCicloHorarioInstance('grafico-grid-ciclo-horario', perfilHorario24h);
    // 2. Gráficas Weibull Temperatura
    renderizarGraficoWeibullTempInstance('grafico-weibull-temp', tempFranja, weibullTemp);
    renderizarGraficoWeibullTempInstance('grafico-grid-weibull-temp', tempFranja, weibullTemp);
    // 3. Gráficas Weibull Humedad
    renderizarGraficoWeibullHrInstance('grafico-weibull-hr', hrFranja, weibullHr);
    renderizarGraficoWeibullHrInstance('grafico-grid-weibull-hr', hrFranja, weibullHr);
    // 4. Gráficas Serie Temporal Cosecha
    renderizarGraficoSerieTemporalInstance('grafico-serie-temporal', datosClimaticosGlobales);
    renderizarGraficoSerieTemporalInstance('grafico-grid-serie-temporal', datosClimaticosGlobales);
}
function destruirGraficoSeguro(canvasId: any): any {
    const canvas = output.cell(canvasId);
    if (canvas && typeof Plot !== 'undefined') {
        const chartExistente = Plot.getChart(canvas);
        if (chartExistente) {
            try {
                chartExistente.destroy();
            }
            catch (e) {
                console.warn('Error al destruir gráfico en canvas:', canvasId, e);
            }
        }
    }
}
function renderizarGraficoCicloHorarioInstance(canvasId: any, horas24: any): any {
    const canvas = output.cell(canvasId);
    if (!canvas || !horas24 || horas24.length === 0)
        return;
    destruirGraficoSeguro(canvasId);
    const ctx = canvas.getContext('2d');
    const labels = horas24.map((h: any) => h.etiquetaHora);
    const dataTemp = horas24.map((h: any) => h.t_mean);
    const dataHr = horas24.map((h: any) => h.hr_mean);
    const pointColorsTemp = horas24.map((h: any) => horaPerteneceAFranja(h.hora, franjaActual.horaInicio, franjaActual.horaFin) ? '#059669' : '#94a3b8');
    const pointRadii = horas24.map((h: any) => horaPerteneceAFranja(h.hora, franjaActual.horaInicio, franjaActual.horaFin) ? 5 : 3);
    try {
        new Plot(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [
                    {
                        label: 'Temperatura Media (°C)',
                        data: dataTemp,
                        borderColor: '#059669',
                        backgroundColor: 'rgba(5, 150, 105, 0.12)',
                        pointBackgroundColor: pointColorsTemp,
                        pointRadius: pointRadii,
                        pointHoverRadius: 7,
                        borderWidth: 2.8,
                        tension: 0.35,
                        yAxisID: 'yTemp',
                        fill: true
                    },
                    {
                        label: 'Humedad Relativa (%)',
                        data: dataHr,
                        borderColor: '#2563eb',
                        backgroundColor: 'rgba(37, 99, 235, 0.08)',
                        pointBackgroundColor: '#2563eb',
                        pointRadius: 4,
                        borderWidth: 2.8,
                        tension: 0.35,
                        yAxisID: 'yHr',
                        fill: true
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: { mode: 'index', intersect: false },
                scales: {
                    yTemp: {
                        type: 'linear',
                        position: 'left',
                        title: { display: true, text: 'Temperatura (°C)', color: '#059669', font: { weight: 'bold', size: 12 } },
                        min: 15,
                        max: 42,
                        grid: { color: '#f1f5f9' }
                    },
                    yHr: {
                        type: 'linear',
                        position: 'right',
                        title: { display: true, text: 'Humedad Relativa (%)', color: '#2563eb', font: { weight: 'bold', size: 12 } },
                        min: 20,
                        max: 100,
                        grid: { drawOnChartArea: false }
                    },
                    x: {
                        grid: { color: '#f8fafc' },
                        ticks: { font: { size: 11 } }
                    }
                },
                plugins: {
                    legend: { position: 'top' },
                    tooltip: {
                        callbacks: {
                            afterBody: function (context: any) {
                                const idx = context[0].dataIndex;
                                const h = horas24[idx];
                                const estado = horaPerteneceAFranja(h.hora, franjaActual.horaInicio, franjaActual.horaFin)
                                    ? '☀️ Franja Activa (Secado)'
                                    : '🌙 Nocturna / Fuera de Franja (Riesgo HR)';
                                return `Déficit Psicrométrico: ${h.deficit} g/kg\nCondición: ${estado}`;
                            }
                        }
                    }
                }
            }
        });
    }
    catch (err) {
        console.error('Error al instanciar gráfico horario:', err);
    }
}
function renderizarGraficoWeibullTempInstance(canvasId: any, datos: any, weibull: any): any {
    const canvas = output.cell(canvasId);
    if (!canvas || !datos || datos.length === 0)
        return;
    destruirGraficoSeguro(canvasId);
    const ctx = canvas.getContext('2d');
    const minVal = Math.floor(Math.min(...datos) - 1);
    const maxVal = Math.ceil(Math.max(...datos) + 1);
    const numBins = 14;
    const binWidth = Math.max(0.5, (maxVal - minVal) / numBins);
    const binLabels = [];
    const histFrequencies = new Array(numBins).fill(0);
    const weibullCurve = [];
    for (let i = 0; i < numBins; i++) {
        const binCenter = minVal + (i + 0.5) * binWidth;
        binLabels.push(`${binCenter.toFixed(1)}°C`);
        const probDensidad = weibull.pdf(binCenter);
        const freqEsperada = probDensidad * binWidth * 100;
        weibullCurve.push(parseFloat(freqEsperada.toFixed(2)));
    }
    datos.forEach((val: any) => {
        let binIdx = Math.floor((val - minVal) / binWidth);
        if (binIdx >= numBins)
            binIdx = numBins - 1;
        if (binIdx < 0)
            binIdx = 0;
        histFrequencies[binIdx]++;
    });
    const histPorcentajes = histFrequencies.map((count: any) => parseFloat(((count / datos.length) * 100).toFixed(2)));
    try {
        new Plot(ctx, {
            type: 'bar',
            data: {
                labels: binLabels,
                datasets: [
                    {
                        type: 'bar',
                        label: 'Frecuencia Observada (%)',
                        data: histPorcentajes,
                        backgroundColor: 'rgba(16, 185, 129, 0.45)',
                        borderColor: '#10b981',
                        borderWidth: 1.5,
                        borderRadius: 4,
                        order: 2
                    },
                    {
                        type: 'line',
                        label: `Ajuste Weibull (k=${weibull.k}, c=${weibull.c})`,
                        data: weibullCurve,
                        borderColor: '#6366f1',
                        backgroundColor: 'rgba(99, 102, 241, 0.1)',
                        borderWidth: 3,
                        pointRadius: 3,
                        tension: 0.4,
                        order: 1,
                        fill: false
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        title: { display: true, text: 'Probabilidad / Frecuencia (%)' },
                        beginAtZero: true
                    },
                    x: {
                        title: { display: true, text: 'Temperatura Ambiente (°C)' }
                    }
                },
                plugins: {
                    legend: { position: 'top' },
                    tooltip: {
                        callbacks: {
                            afterTitle: function () {
                                return `Moda (Más Frecuente): ${weibull.moda}°C | Mediana (P50): ${weibull.p50}°C`;
                            }
                        }
                    }
                }
            }
        });
    }
    catch (err) {
        console.error('Error al instanciar gráfico Weibull Temp:', err);
    }
}
function renderizarGraficoWeibullHrInstance(canvasId: any, datos: any, weibull: any): any {
    const canvas = output.cell(canvasId);
    if (!canvas || !datos || datos.length === 0)
        return;
    destruirGraficoSeguro(canvasId);
    const ctx = canvas.getContext('2d');
    const minVal = Math.floor(Math.min(...datos) - 2);
    const maxVal = Math.ceil(Math.max(...datos) + 2);
    const numBins = 14;
    const binWidth = Math.max(1, (maxVal - minVal) / numBins);
    const binLabels = [];
    const histFrequencies = new Array(numBins).fill(0);
    const weibullCurve = [];
    for (let i = 0; i < numBins; i++) {
        const binCenter = minVal + (i + 0.5) * binWidth;
        binLabels.push(`${binCenter.toFixed(1)}%`);
        const probDensidad = weibull.pdf(binCenter);
        const freqEsperada = probDensidad * binWidth * 100;
        weibullCurve.push(parseFloat(freqEsperada.toFixed(2)));
    }
    datos.forEach((val: any) => {
        let binIdx = Math.floor((val - minVal) / binWidth);
        if (binIdx >= numBins)
            binIdx = numBins - 1;
        if (binIdx < 0)
            binIdx = 0;
        histFrequencies[binIdx]++;
    });
    const histPorcentajes = histFrequencies.map((count: any) => parseFloat(((count / datos.length) * 100).toFixed(2)));
    try {
        new Plot(ctx, {
            type: 'bar',
            data: {
                labels: binLabels,
                datasets: [
                    {
                        type: 'bar',
                        label: 'Frecuencia Observada (%)',
                        data: histPorcentajes,
                        backgroundColor: 'rgba(59, 130, 246, 0.45)',
                        borderColor: '#3b82f6',
                        borderWidth: 1.5,
                        borderRadius: 4,
                        order: 2
                    },
                    {
                        type: 'line',
                        label: `Ajuste Weibull (k=${weibull.k}, c=${weibull.c})`,
                        data: weibullCurve,
                        borderColor: '#0284c7',
                        backgroundColor: 'rgba(2, 132, 199, 0.1)',
                        borderWidth: 3,
                        pointRadius: 3,
                        tension: 0.4,
                        order: 1,
                        fill: false
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        title: { display: true, text: 'Probabilidad / Frecuencia (%)' },
                        beginAtZero: true
                    },
                    x: {
                        title: { display: true, text: 'Humedad Relativa (%)' }
                    }
                },
                plugins: {
                    legend: { position: 'top' },
                    tooltip: {
                        callbacks: {
                            afterTitle: function () {
                                return `Moda (Más Frecuente): ${weibull.moda}% | Peor Caso (P90): ${weibull.p90}%`;
                            }
                        }
                    }
                }
            }
        });
    }
    catch (err) {
        console.error('Error al instanciar gráfico Weibull HR:', err);
    }
}
function renderizarGraficoSerieTemporalInstance(canvasId: any, dias: any): any {
    const canvas = output.cell(canvasId);
    if (!canvas || !dias || dias.length === 0)
        return;
    destruirGraficoSeguro(canvasId);
    const ctx = canvas.getContext('2d');
    const etiquetas = [];
    const dataTemp = [];
    const dataHr = [];
    const paso = Math.max(1, Math.floor(dias.length / 45));
    for (let i = 0; i < dias.length; i += paso) {
        etiquetas.push(dias[i].etiquetaDia);
        dataTemp.push(dias[i].t_mean);
        dataHr.push(dias[i].hr_mean);
    }
    try {
        new Plot(ctx, {
            type: 'line',
            data: {
                labels: etiquetas,
                datasets: [
                    {
                        label: 'Temperatura Promedio (°C)',
                        data: dataTemp,
                        borderColor: '#059669',
                        backgroundColor: 'rgba(5, 150, 105, 0.08)',
                        pointBackgroundColor: '#059669',
                        pointRadius: 3,
                        borderWidth: 2.2,
                        tension: 0.3,
                        yAxisID: 'yTemp',
                        fill: false
                    },
                    {
                        label: 'Humedad Relativa (%)',
                        data: dataHr,
                        borderColor: '#2563eb',
                        backgroundColor: 'rgba(37, 99, 235, 0.08)',
                        pointBackgroundColor: '#2563eb',
                        pointRadius: 3,
                        borderWidth: 2.2,
                        tension: 0.3,
                        yAxisID: 'yHr',
                        fill: false
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    yTemp: {
                        type: 'linear',
                        position: 'left',
                        title: { display: true, text: 'Temperatura (°C)', color: '#059669', font: { weight: 'bold' } },
                        min: 15,
                        max: 45
                    },
                    yHr: {
                        type: 'linear',
                        position: 'right',
                        title: { display: true, text: 'Humedad (%)', color: '#2563eb', font: { weight: 'bold' } },
                        min: 20,
                        max: 100,
                        grid: { drawOnChartArea: false }
                    },
                    x: {
                        ticks: { maxTicksLimit: 12, font: { size: 10 } }
                    }
                },
                plugins: {
                    legend: { position: 'top' }
                }
            }
        });
    }
    catch (err) {
        console.error('Error al instanciar gráfico serie temporal:', err);
    }
}

 const months=input.months || Array.from({length:12},(_,i)=>i+1);
 const end=2025,start=end-(Number(input.anios_historicos)||5)+1;
 const lat=Number(input.latitud),lon=Number(input.longitud),alt=parseInt(input.altitud_clima)||185;
 if(data?.hourly?.time?.length)procesarDatosHistoricosCompletos(data,start,end,months,lat,lon,alt);
 else generarDatosSinteticosAvanzados(lat,lon,alt,start,end,months);
 return output.result({days:datosClimaticosGlobales,hours:perfilHorario24h,statistics:estadisticasDiseno,raw:datosHorariosGlobales});
}
