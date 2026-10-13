import {OutputBuffer} from './output';
// Translated from the working tree, formulas and rounding preserved.
const datosGranos = {
    arroz: { nombre: 'Arroz Paddy (Largo)', limitTemp: 43.0, rho: 580, E: 0.325, F: 0.048, C: 35.0, k: 0.38, n: 0.72, h_fg: 2450, cp: 1.8, efic: 0.50, Tgs: 140.0, Tgw: 0.0, k_gt: 9.5, defaultRatio: 0.85 },
    maiz: { nombre: 'Maíz Amarillo', limitTemp: 85.0, rho: 720, E: 0.312, F: 0.042, C: 40.0, k: 0.45, n: 0.75, h_fg: 2500, cp: 2.0, efic: 0.60, Tgs: 145.0, Tgw: 0.0, k_gt: 9.8, defaultRatio: 0.88 },
    trigo: { nombre: 'Trigo', limitTemp: 50.0, rho: 780, E: 0.350, F: 0.051, C: 30.0, k: 0.42, n: 0.70, h_fg: 2480, cp: 1.9, efic: 0.50, Tgs: 135.0, Tgw: 0.0, k_gt: 9.2, defaultRatio: 0.90 },
    sorgo: { nombre: 'Sorgo', limitTemp: 55.0, rho: 730, E: 0.330, F: 0.045, C: 38.0, k: 0.40, n: 0.71, h_fg: 2490, cp: 1.9, efic: 0.50, Tgs: 138.0, Tgw: 0.0, k_gt: 9.4, defaultRatio: 0.90 },
    cebada: { nombre: 'Cebada', limitTemp: 45.0, rho: 620, E: 0.340, F: 0.049, C: 32.0, k: 0.39, n: 0.73, h_fg: 2460, cp: 1.9, efic: 0.50, Tgs: 130.0, Tgw: 0.0, k_gt: 9.0, defaultRatio: 0.90 },
    soya: { nombre: 'Soya', limitTemp: 45.0, rho: 670, E: 0.295, F: 0.038, C: 45.0, k: 0.48, n: 0.78, h_fg: 2300, cp: 1.9, efic: 0.40, Tgs: 125.0, Tgw: 0.0, k_gt: 8.8, defaultRatio: 0.91 }
};


const modelosSecadoras = [
    { modelo: 'ST-10AXL', caudal: 28543.2, holding: 24.3 },
    { modelo: 'ST-10AX', caudal: 40776, holding: 24.3 },
    { modelo: 'ST-20AXL', caudal: 57086.4, holding: 41.5 },
    { modelo: 'ST-20AX', caudal: 81552, holding: 41.5 },
    { modelo: 'ST-30AXL', caudal: 85629.6, holding: 52.9 },
    { modelo: 'ST-40AXL', caudal: 114172.8, holding: 70.1 },
    { modelo: 'ST-30AX', caudal: 122328, holding: 52.9 },
    { modelo: 'ST-50AXL', caudal: 142716, holding: 81.5 },
    { modelo: 'ST-40AX', caudal: 163104, holding: 70.1 },
    { modelo: 'ST-60AXL', caudal: 171259.2, holding: 105.8 },
    { modelo: 'ST-50AX', caudal: 203880, holding: 81.5 },
    { modelo: 'ST-80AXL', caudal: 228345.6, holding: 140.2 },
    { modelo: 'ST-60AX', caudal: 244656, holding: 105.8 },
    { modelo: 'ST-90AXL', caudal: 256888.8, holding: 158.7 },
    { modelo: 'ST-100AXL', caudal: 285432, holding: 163 },
    { modelo: 'ST-80AX', caudal: 326208, holding: 140.2 },
    { modelo: 'ST-120AXL', caudal: 342518.4, holding: 210.3 },
    { modelo: 'ST-90AX', caudal: 366984, holding: 158.7 },
    { modelo: 'ST-100AX', caudal: 407760, holding: 163 },
    { modelo: 'ST-150AXL', caudal: 428148, holding: 244.5 },
    { modelo: 'ST-120AX', caudal: 489312, holding: 210.3 },
    { modelo: 'ST-150AX', caudal: 611640, holding: 244.5 }
];


export {datosGranos, modelosSecadoras};
export function calculateDrying(input: Record<string,any>,diagnostics=false) {
 let intermediate:any;
 const output = new OutputBuffer(input);
 const Plot = output.plotClass();
 let chartVitreaInstance:any = null;
 const maquinaSeleccionada=input.machine || 'ax';
function calcularPsicrometria(altitud: any, T_amb: any): any {
    // Ecuaciones exactas del backend provisto
    const P_atm = (101325 / 1000) * Math.pow(1 - (225577 / 10000000000) * altitud, 52559 / 10000);
    const rho_aire = (P_atm * 1000) / (287.05 * (T_amb + 273.15));
    return { P_atm, rho_aire };
}
function calcularHumedadEquilibrio(T_amb: any, HR_percent: any, grano: any): any {
    const rh = Math.min(Math.max(HR_percent / 100, 0.01), 0.99); // bajamos el límite inferior para aire caliente
    const valInside = -1 * (T_amb + grano.C) * Math.log(rh);
    let Me = (valInside > 0) ? (grano.E - grano.F * Math.log(valInside)) : 0.13;
    return Math.max(Me * 100, 1.0); // Permitimos un Me más bajo para aire caliente
}
function calcularHrCalentado(Tamb: any, HRamb: any, Tcalentado: any): any {
    // Ecuación de Tetens para presión de vapor de saturación (kPa)
    const Psat = (T: any) => 0.61078 * Math.exp((17.27 * T) / (T + 237.3));
    const Pv = (HRamb / 100) * Psat(Tamb);
    const Psat_calentado = Psat(Tcalentado);
    return (Pv / Psat_calentado) * 100;
}
function calcularTemperaturaBulboHumedo(T: any, HR: any): any {
    // Fórmula empírica de Stull (1991) para Temperatura de Bulbo Húmedo
    return T * Math.atan(0.151977 * Math.pow(HR + 8.313659, 0.5)) +
        Math.atan(T + HR) -
        Math.atan(HR - 1.676331) +
        0.00391838 * Math.pow(HR, 1.5) * Math.atan(0.023101 * HR) -
        4.686035;
}
function recomendarEquipo(caudalRequerido: any): any {
    let modelosAX = modelosSecadoras.filter((m: any) => m.modelo.endsWith('AX'));
    let modelosAXL = modelosSecadoras.filter((m: any) => m.modelo.endsWith('AXL'));
    let axValidas = modelosAX.filter((m: any) => m.caudal >= caudalRequerido);
    axValidas.sort((a: any, b: any) => a.caudal - b.caudal);
    let recomendadaAX = axValidas.length > 0 ? axValidas[0] : [...modelosAX].sort((a: any, b: any) => b.caudal - a.caudal)[0];
    let axlValidas = modelosAXL.filter((m: any) => m.caudal >= caudalRequerido);
    axlValidas.sort((a: any, b: any) => a.caudal - b.caudal);
    let recomendadaAXL = axlValidas.length > 0 ? axlValidas[0] : [...modelosAXL].sort((a: any, b: any) => b.caudal - a.caudal)[0];
    // Recomendada inferior (por debajo del caudal requerido)
    let menores = modelosSecadoras.filter((m: any) => m.caudal < caudalRequerido);
    menores.sort((a: any, b: any) => b.caudal - a.caudal); // Sort desc to get the highest one below the limit
    let recomendadaMenor = menores.length > 0 ? menores[0] : modelosSecadoras[0];
    return { ax: recomendadaAX, axl: recomendadaAXL, menor: recomendadaMenor };
}
function ejecutarSimulacion(): any {
    const grano = datosGranos[output.cell('tipoGrano').value];
    const T_limite = parseFloat(output.cell('tempLimiteGrano').value);
    const rho_grano = parseFloat(output.cell('densidadAparente').value);
    const M0 = parseFloat(output.cell('humedadInicial').value);
    const Mf = parseFloat(output.cell('humedadObjetivo').value);
    const metaTon = parseFloat(output.cell('metaSecado').value);
    const Tamb = parseFloat(output.cell('tempAmbiente').value);
    const HRamb = parseFloat(output.cell('hrAmbiente').value);
    const altitud = parseFloat(output.cell('altitud').value);
    const eficTermica = parseFloat(output.cell('eficienciaTermica').value);
    const psico = calcularPsicrometria(altitud, Tamb);
    const Me = calcularHumedadEquilibrio(Tamb, HRamb, grano);
    // Ecuación dictada: Grano Húmedo Procesado = Meta
    const granoHumedoDiario = metaTon;
    const aguaPorTon = ((M0 - Mf) / (100 - Mf)) * 1000;
    // Agua total evaporada diaria a partir del grano húmedo
    const aguaTotalDiaria = (granoHumedoDiario * aguaPorTon) / 1000;
    // Ecuación dictada: Grano Seco = Grano Húmedo - Agua Extraída
    const prodSecaDiaria = granoHumedoDiario - aguaTotalDiaria;
    const h_fg_efectivo = grano.h_fg;
    const energiaRealMJ = ((aguaTotalDiaria * 1000 * h_fg_efectivo) / 1000) / eficTermica;
    const litrosDiesel = energiaRealMJ / 38.6;
    const totalDrop = M0 - Mf;
    // Calcular pases: Forzar de 2 a 3 pasos máximo dependiendo de los valores
    let max_remocion = 3.5; // Ajuste para dar más holgura si es necesario
    let numSteps = Math.ceil(totalDrop / max_remocion);
    if (numSteps < 2)
        numSteps = 2;
    // Permitimos hasta 4 pasos si la remoción es muy grande
    if (numSteps > 4)
        numSteps = 4;
    let drops = [];
    if (numSteps === 2) {
        // Primero quita más (60%), luego menos (40%)
        drops.push(totalDrop * 0.60);
        drops.push(totalDrop * 0.40);
    }
    else if (numSteps === 3) {
        // Ej: 45%, 35%, 20%
        drops.push(totalDrop * 0.45);
        drops.push(totalDrop * 0.35);
        drops.push(totalDrop * 0.20);
    }
    else if (numSteps === 4) {
        // Ej: 35%, 30%, 20%, 15%
        drops.push(totalDrop * 0.35);
        drops.push(totalDrop * 0.30);
        drops.push(totalDrop * 0.20);
        drops.push(totalDrop * 0.15);
    }
    else {
        // Fallback genérico descendente
        let sum = (numSteps * (numSteps + 1)) / 2;
        for (let i = 0; i < numSteps; i++) {
            drops.push(totalDrop * ((numSteps - i) / sum));
        }
    }
    let pasos = [], currentM = M0, baseAirTemp = T_limite + 20;
    let caudalTotalCFM = 0;
    let sumaTiemposCalor = 0; // Solo acumulamos tiempos de calor
    let lastTiempoMin = 0;
    for (let i = 1; i <= numSteps; i++) {
        let dropPerStep = drops[i - 1];
        let tempAire = baseAirTemp - (i - 1) * 4;
        let HR_heated = calcularHrCalentado(Tamb, HRamb, tempAire);
        let Me_step = calcularHumedadEquilibrio(tempAire, HR_heated, grano);
        let M_in = currentM, M_out = currentM - dropPerStep;
        currentM = M_out;
        // Calculamos MR real del paso respecto a la humedad inicial del lote (M0)
        // para mantener la validez de la curva del modelo de Page
        let MR_in = Math.max((M_in - Me_step) / (M0 - Me_step), 0.01);
        let MR_out = Math.max((M_out - Me_step) / (M0 - Me_step), 0.01);
        let t_in = Math.pow(-Math.log(MR_in) / grano.k, 1 / grano.n) * 60;
        let t_out = Math.pow(-Math.log(MR_out) / grano.k, 1 / grano.n) * 60;
        let tiempoCalc = Math.round(Math.max(t_out - t_in, 1));
        // Mapeamos el tiempo teórico para que caiga suavemente en la ventana de 50 a 60 minutos.
        // Mientras mayor sea el tiempoCalc, más cerca de 60 estará.
        let incremento = Math.min(Math.round(tiempoCalc / 6), 10);
        let tiempoAjustado = 50 + incremento;
        // Aplicamos la regla: Mínimo 50 min, máximo 60 min.
        let tiempoMin = Math.max(Math.min(tiempoAjustado, 60), 50);
        lastTiempoMin = tiempoMin;
        // Solo sumamos los tiempos de calor para luego multiplicarlos
        sumaTiemposCalor += tiempoMin;
        // Normas ASABE y buenas prácticas de secado FIFO: 
        // El atempero debe durar alrededor de 3.2 veces más que el tiempo de calentamiento
        // para permitir la difusión de humedad sin exceder las capacidades físicas de la secadora.
        let tiempoAtempero = Math.round(tiempoMin * 3.2);
        // Cálculo del caudal requerido para este paso
        // 1. Calcular el agua que se evapora en este paso por hora
        let aguaPasoDiaria = aguaTotalDiaria * (dropPerStep / totalDrop) * 1000; // kg/día
        let aguaPasoHora = aguaPasoDiaria / 24; // kg/h
        // 2. Calor requerido (kj/h)
        let calorRequerido = (aguaPasoHora * grano.h_fg) / eficTermica;
        // 3. Flujo másico de aire necesario (kg/h). Cp aire = 1.006 kJ/kg°C
        let m_aire = calorRequerido / (1.006 * (tempAire - Tamb));
        // 4. Caudal volumétrico (m3/h)
        let caudalM3H = (m_aire / psico.rho_aire);
        caudalTotalCFM += caudalM3H;
        // Cálculo de Temperatura del Grano mediante la aproximación operacional
        let T_bh = calcularTemperaturaBulboHumedo(tempAire, HR_heated);
        let deltaM_max = Math.max(M_in - Me_step, 0.01);
        // La fracción de evaporación nos dice qué tanto enfriamiento evaporativo ocurre.
        // Si evapRatio es 1, Tg = T_bh. Si evapRatio es 0, Tg se acerca al límite térmico del grano.
        let evapRatio = Math.min(Math.max(dropPerStep / deltaM_max, 0), 1);
        // Usamos T_limite como la asíntota térmica del grano (en vez de tempAire) 
        // para que fluctúe de manera realista pero NUNCA exceda la tolerancia del grano.
        let tempGrano = T_bh + (T_limite - T_bh) * (1 - evapRatio);
        // Aseguramos matemáticamente que se mantenga en el rango [T_bh, T_limite]
        tempGrano = Math.min(Math.max(tempGrano, T_bh), T_limite);
        let tempGranoStr = tempGrano.toFixed(1);
        // Temperatura del Aire de Salida fluctuando cerca de la temperatura del grano
        let tempAireSalida = tempGrano + (Math.max(tempAire - tempGrano, 0) * 0.15);
        let tempAireSalidaStr = tempAireSalida.toFixed(1);
        let potencia_kW = calorRequerido / 3600;
        pasos.push({
            etapa: `Paso ${i} (Calor)`,
            tipo: 'Calor',
            tempAire: tempAire.toFixed(1),
            tempGrano: tempGranoStr,
            tempAireSalida: tempAireSalidaStr,
            hrAire: HR_heated.toFixed(1),
            mEnt: M_in.toFixed(1),
            mSal: M_out.toFixed(1),
            deltaM: dropPerStep.toFixed(1),
            tiempo: tiempoMin,
            caudal: caudalM3H.toFixed(0),
            h_efectivo: grano.h_fg.toFixed(0) + ' kJ/kg'
        });
        // Add Atempero step
        pasos.push({
            etapa: `Atempero ${i}`,
            tipo: 'Atempero',
            tempAire: '-',
            tempGrano: tempGranoStr,
            tempAireSalida: '-',
            hrAire: '-',
            mEnt: M_out.toFixed(1),
            mSal: M_out.toFixed(1),
            deltaM: '0.0',
            tiempo: tiempoAtempero,
            caudal: '-',
            h_efectivo: '-'
        });
    }
    pasos.push({
        etapa: 'Enfriamiento Final',
        tipo: 'Enfriamiento',
        tempAire: Tamb.toFixed(1),
        tempGrano: Tamb.toFixed(1),
        tempAireSalida: (Tamb + 1.5).toFixed(1),
        hrAire: HRamb.toFixed(1),
        mEnt: currentM.toFixed(1),
        mSal: currentM.toFixed(1),
        deltaM: '0.0',
        tiempo: 45,
        caudal: '-',
        h_efectivo: '-'
    });
    // Calcular el tiempo total estrictamente como (Suma tiempos calor * 3.5) + enfriamiento
    let tiempoTotalMinutos = Math.round(sumaTiemposCalor * 3.5) + 45;
    let tiempoHoras = Math.floor(tiempoTotalMinutos / 60);
    let tiempoMins = Math.round(tiempoTotalMinutos % 60);
    const metricTiempoTotalE = output.cell('metricTiempoTotal');
    if (metricTiempoTotalE)
        metricTiempoTotalE.innerText = `${tiempoHoras}h ${tiempoMins}m`;
    let lotes24h = tiempoTotalMinutos > 0 ? (1440 / tiempoTotalMinutos) : 0;
    const metricBachesE = output.cell('metricBaches');
    if (metricBachesE)
        metricBachesE.innerText = `${lotes24h.toFixed(1)}`;
    // Fórmula del usuario: (Producción Final Seca / Tiempo Total Estimado) * 24
    let tiempoTotalHorasDecimal = tiempoTotalMinutos / 60;
    let tonHumedasProcesadas = tiempoTotalHorasDecimal > 0 ? (prodSecaDiaria / tiempoTotalHorasDecimal) * 24 : 0;
    const metricTonHumedas = output.cell('metricTonHumedasProcesadas');
    if (metricTonHumedas) {
        metricTonHumedas.innerText = `${tonHumedasProcesadas.toFixed(1)} Ton/día`;
    }
    const energiaKwh = (energiaRealMJ / 3.6) / 24;
    output.cell('metricAgua').innerText = `${aguaPorTon.toFixed(1)} kg/t`;
    output.cell('metricAguaTotal').innerText = `Total: ${aguaTotalDiaria.toFixed(1)} Ton/día`;
    const metricProdHumeda = output.cell('metricProdHumeda');
    if (metricProdHumeda)
        metricProdHumeda.innerText = `${granoHumedoDiario.toFixed(1)} Ton`;
    output.cell('metricProdSeca').innerText = `${prodSecaDiaria.toFixed(1)} Ton`;
    output.cell('metricEnergia').innerText = `${Math.round(energiaKwh).toLocaleString(input.locale || 'en-US')} kWh`;
    output.cell('metricCombustible').innerText = `Diesel: ${Math.round(litrosDiesel).toLocaleString(input.locale || 'en-US')} L/día`;
    output.cell('metricMe').innerText = `${Me.toFixed(1)}%`;
    output.cell('metricPatm').innerText = `${psico.P_atm.toFixed(2)} kPa`;
    output.cell('metricRho').innerText = `${psico.rho_aire.toFixed(3)} kg/m³`;
    output.cell('metricShedd').innerText = `${Math.round((rho_grano / 10) * 1.8 * 15)} Pa`;
    const metricCaudalTotal = output.cell('metricCaudalTotal');
    if (metricCaudalTotal)
        metricCaudalTotal.innerText = `${Math.round(caudalTotalCFM).toLocaleString(input.locale || 'en-US')} m³/h`;
    // Propiedades de la máquina
    const maqReq = recomendarEquipo(caudalTotalCFM);
    if (maqReq) {
        // AX
        const tdAxModelo = output.cell('maqAxModelo');
        const tdAxCaudal = output.cell('maqAxCaudal');
        const tdAxHolding = output.cell('maqAxHolding');
        let holdingAX = maqReq.ax.holding ? maqReq.ax.holding * (rho_grano / 1000) : (maqReq.ax.caudal / 4200);
        let holdingAXL = maqReq.axl.holding ? maqReq.axl.holding * (rho_grano / 1000) : (maqReq.axl.caudal / 4200);
        let holdingMenor = maqReq.menor.holding ? maqReq.menor.holding * (rho_grano / 1000) : (maqReq.menor.caudal / 4200);
        if (tdAxModelo)
            tdAxModelo.innerText = maqReq.ax.modelo;
        if (tdAxCaudal)
            tdAxCaudal.innerText = maqReq.ax.caudal.toLocaleString(input.locale || 'en-US');
        if (tdAxHolding)
            tdAxHolding.innerText = holdingAX.toFixed(1);
        const tdAxlModelo = output.cell('maqAxlModelo');
        const tdAxlCaudal = output.cell('maqAxlCaudal');
        const tdAxlHolding = output.cell('maqAxlHolding');
        if (tdAxlModelo)
            tdAxlModelo.innerText = maqReq.axl.modelo;
        if (tdAxlCaudal)
            tdAxlCaudal.innerText = maqReq.axl.caudal.toLocaleString(input.locale || 'en-US');
        if (tdAxlHolding)
            tdAxlHolding.innerText = holdingAXL.toFixed(1);
        const tdMenorModelo = output.cell('maqMenorModelo');
        const tdMenorCaudal = output.cell('maqMenorCaudal');
        const tdMenorHolding = output.cell('maqMenorHolding');
        if (tdMenorModelo)
            tdMenorModelo.innerText = maqReq.menor.modelo;
        if (tdMenorCaudal)
            tdMenorCaudal.innerText = maqReq.menor.caudal.toLocaleString(input.locale || 'en-US');
        if (tdMenorHolding)
            tdMenorHolding.innerText = holdingMenor.toFixed(1);
        // --- CÁLCULOS REALES (CON SELECCIÓN) ---
        const maqObj = maqReq[maquinaSeleccionada];
        const tituloSimulacionReal = output.cell('tituloSimulacionReal');
        if (tituloSimulacionReal) {
            tituloSimulacionReal.innerText = `Simulación Real de Producción - ${maqObj.modelo}`;
        }
        const factor = caudalTotalCFM > 0 ? (maqObj.caudal / caudalTotalCFM) : 0;
        const tonHumedas = metaTon * factor;
        const aguaTotal = (tonHumedas * aguaPorTon) / 1000;
        const prodSeca = tonHumedas - aguaTotal;
        const energiaKwh = (((aguaTotal * 1000 * h_fg_efectivo) / 1000) / eficTermica) / 3.6 / 24;
        const diesel = (((aguaTotal * 1000 * h_fg_efectivo) / 1000) / eficTermica) / 38.6;
        let lotes = tiempoTotalMinutos > 0 ? (1440 / tiempoTotalMinutos) : 0;
        let tiempoHoras = Math.floor(tiempoTotalMinutos / 60);
        let tiempoMins = Math.round(tiempoTotalMinutos % 60);
        output.cell('realSelTonHumedas').innerText = `${tonHumedas.toFixed(1)} Ton/día`;
        output.cell('realSelHumedasHora').innerText = `${(tonHumedas / 24).toFixed(1)} Ton/h`;
        output.cell('realSelProdSeca').innerText = `${prodSeca.toFixed(1)} Ton/día`;
        output.cell('realSelSecaHora').innerText = `${(prodSeca / 24).toFixed(1)} Ton/h (Base comercializable)`;
        output.cell('realSelEnergia').innerText = `${Math.round(energiaKwh).toLocaleString(input.locale || 'en-US')} kWh`;
        output.cell('realSelDiesel').innerText = `Diesel: ${Math.round(diesel).toLocaleString(input.locale || 'en-US')} L/día`;
        output.cell('realSelBaches').innerText = lotes.toFixed(1);
        output.cell('realSelTiempo').innerText = `${tiempoHoras}h ${tiempoMins}m`;
    }
    // Llamar actualización aislada de números adimensionales
    actualizarNumerosAdimensionales();
    // Convertir el tiempo total a horas y minutos (estrictamente calor x 3.5)
    let horasTotales = Math.floor(tiempoTotalMinutos / 60);
    let minsRestantes = Math.round(tiempoTotalMinutos % 60);
    const metricTiempoTotal = output.cell('metricTiempoTotal');
    if (metricTiempoTotal)
        metricTiempoTotal.innerText = `${horasTotales}h ${minsRestantes}m`;
    const metricBaches = output.cell('metricBaches');
    if (metricBaches) {
        let bachesDia = tiempoTotalMinutos > 0 ? (1440 / tiempoTotalMinutos) : 0;
        metricBaches.innerText = bachesDia.toFixed(1);
    }
    const tbody = output.cell('#tablaPasos tbody');
    if (tbody)
        tbody.innerHTML = '';
    const tbodyReal = output.cell('#tablaPasosReal tbody');
    if (tbodyReal)
        tbodyReal.innerHTML = '';
    const isRecirculacion = input.mode === 'recirculacion';
    pasos.forEach((p: any) => {
        if (isRecirculacion) {
            if (p.tipo !== 'Calor')
                return;
        }
        let bClass = 'badge-cool'; // default
        if (p.tipo === 'Calor')
            bClass = 'badge-heat';
        else if (p.tipo === 'Atempero')
            bClass = 'badge-temper';
        else if (p.tipo === 'Operativo')
            bClass = 'badge-cool'; // o alguna clase distinta para operativo
        const rowHTML = `<tr>
            <td><strong>${p.etapa}</strong></td>
            <td><span class="sim-badge ${bClass}">${p.tipo}</span></td>
            <td>${p.tempAire}</td>
            <td>${p.tempGrano}</td>
            <td>${p.tempAireSalida}</td>
            <td>${p.hrAire}</td>
            <td>${p.mEnt}%</td>
            <td>${p.mSal}%</td>
            <td>-${p.deltaM}%</td>
            <td>${p.tiempo} min</td>
            <td style="display:none;">${p.caudal}</td>
            <td style="display:none;">${p.h_efectivo}</td>
        </tr>`;
        if (tbody)
            tbody.innerHTML += rowHTML;
        let caudalRealStr = p.caudal;
        let tiempoRealStr = p.tiempo;
        let tempGranoReal = p.tempGrano;
        let tempAireSalidaReal = p.tempAireSalida;
        let hrAireReal = p.hrAire;
        const maqReqLocal = recomendarEquipo(caudalTotalCFM);
        const maqObjLocal = maqReqLocal ? maqReqLocal[maquinaSeleccionada] : null;
        if (maqObjLocal && caudalTotalCFM > 0) {
            let factorLocal = maqObjLocal.caudal / caudalTotalCFM;
            if (p.tipo === 'Calor') {
                let prop = parseFloat(p.caudal) / caudalTotalCFM;
                caudalRealStr = Math.round(maqObjLocal.caudal * prop).toLocaleString(input.locale || 'en-US');
                // Variación operacional dinámica
                // Un factor > 1 indica que la máquina es más grande y el aire pasa más rápido.
                let varTermica = (factorLocal - 1) * 0.05; // 5% de variación por factor
                let tg = parseFloat(p.tempGrano);
                if (!isNaN(tg))
                    tempGranoReal = (tg - (tg * varTermica)).toFixed(1);
                let tas = parseFloat(p.tempAireSalida);
                if (!isNaN(tas))
                    tempAireSalidaReal = (tas + (tas * varTermica * 1.5)).toFixed(1);
                if (p.hrAire !== '-') {
                    let hr = parseFloat(p.hrAire);
                    if (!isNaN(hr))
                        hrAireReal = Math.max(hr - (hr * varTermica), hr * 0.6).toFixed(1);
                }
            }
            else if (p.tipo === 'Atempero') {
                let varTermica = (factorLocal - 1) * 0.03;
                let tg = parseFloat(p.tempGrano);
                if (!isNaN(tg))
                    tempGranoReal = (tg - (tg * varTermica)).toFixed(1);
            }
            let tReal = Math.round(p.tiempo / factorLocal);
            if (p.tipo === 'Calor') {
                tReal = Math.max(Math.min(tReal, 60), 50);
            }
            if (!isNaN(tReal) && tReal > 0) {
                tiempoRealStr = tReal;
            }
        }
        const rowHTMLReal = `<tr>
            <td><strong>${p.etapa}</strong></td>
            <td><span class="sim-badge ${bClass}">${p.tipo}</span></td>
            <td>${p.tempAire}</td>
            <td>${tempGranoReal}</td>
            <td>${tempAireSalidaReal}</td>
            <td>${hrAireReal}</td>
            <td>${p.mEnt}%</td>
            <td>${p.mSal}%</td>
            <td>-${p.deltaM}%</td>
            <td>${tiempoRealStr} min</td>
            <td style="display:none;">${caudalRealStr}</td>
            <td style="display:none;">${p.h_efectivo}</td>
        </tr>`;
        if (tbodyReal)
            tbodyReal.innerHTML += rowHTMLReal;
    });
    // Dibujar la gráfica de curva vítrea al final
    dibujarCurvaVitrea(grano, pasos);
    if (diagnostics)
        intermediate = { psico, Me, aguaPorTon, aguaTotalDiaria, prodSecaDiaria, energiaRealMJ, litrosDiesel, numSteps, drops, caudalTotalCFM, sumaTiemposCalor, tiempoTotalMinutos, pasos };
}
function dibujarCurvaVitrea(grano: any, pasos: any): any {
    const ctx = output.cell('chartTransicionVitrea');
    if (!ctx)
        return;
    if (chartVitreaInstance) {
        chartVitreaInstance.destroy();
    }
    // Generar puntos para la curva de transición vítrea (de 10% a 25% de humedad)
    let mValues = [];
    let tgValues = [];
    for (let m = 10; m <= 25; m += 0.5) {
        let Xw = m / 100; // Fracción másica de agua
        let Xs = 1 - Xw; // Fracción másica de sólidos secos
        // Ecuación de Gordon-Taylor
        // Tg = (Xs * Tgs + k * Xw * Tgw) / (Xs + k * Xw)
        let tg = (Xs * grano.Tgs + grano.k_gt * Xw * grano.Tgw) / (Xs + grano.k_gt * Xw);
        mValues.push(m);
        tgValues.push(tg.toFixed(2));
    }
    // Puntos del proceso de secado (Humedad vs Temperatura del Grano)
    let procesoM = [];
    let procesoT = [];
    let labelsProceso = [];
    pasos.forEach((p: any) => {
        if (p.tipo === 'Calor' || p.tipo === 'Enfriamiento') {
            // Promedio entre humedad de entrada y salida del paso
            let mPromedio = (parseFloat(p.mEnt) + parseFloat(p.mSal)) / 2;
            procesoM.push(mPromedio);
            procesoT.push(parseFloat(p.tempGrano));
            labelsProceso.push(p.etapa);
        }
    });
    chartVitreaInstance = new Plot(ctx, {
        type: 'line',
        data: {
            labels: mValues,
            datasets: [
                {
                    label: 'Estado Cauchoso (Blando/Plástico)',
                    data: tgValues,
                    backgroundColor: 'rgba(249, 219, 192, 0.4)', // Naranja claro
                    fill: 'end',
                    borderWidth: 0,
                    pointRadius: 0,
                    pointHoverRadius: 0,
                    tooltip: false
                },
                {
                    label: 'Curva de Transición Vítrea (Tg)',
                    data: tgValues,
                    borderColor: '#2563eb', // Azul
                    backgroundColor: 'rgba(191, 219, 254, 0.4)', // Azul claro para el estado vítreo
                    fill: 'start', // Llena hacia abajo
                    borderWidth: 3,
                    tension: 0.4,
                    pointRadius: 0,
                    pointHoverRadius: 5
                },
                {
                    label: 'Temp. Grano en Proceso',
                    data: procesoM.map((m: any, i: any) => ({ x: m, y: procesoT[i], etapa: labelsProceso[i] })),
                    borderColor: '#ef4444', // Rojo
                    backgroundColor: '#ef4444',
                    borderWidth: 1,
                    pointRadius: 6,
                    pointHoverRadius: 8,
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
                    title: {
                        display: true,
                        text: 'Contenido de Humedad (% b.h.)',
                        font: { weight: 'bold' }
                    },
                    min: 10,
                    max: 25,
                    grid: { color: 'rgba(0,0,0,0.05)' }
                },
                y: {
                    title: {
                        display: true,
                        text: 'Temperatura (°C)',
                        font: { weight: 'bold' }
                    },
                    suggestedMin: 20,
                    suggestedMax: Math.max(80, grano.limitTemp + 5),
                    grid: { color: 'rgba(0,0,0,0.05)' }
                }
            },
            plugins: {
                title: {
                    display: true,
                    text: 'Curva de Transición Vítrea (Tg) para ' + grano.nombre,
                    font: { size: 16 }
                },
                legend: {
                    labels: {
                        filter: function (item: any, chart: any) {
                            return true; // Mostrar todas las leyendas para claridad
                        }
                    }
                },
                tooltip: {
                    callbacks: {
                        label: function (context: any) {
                            if (context.dataset.type === 'scatter') {
                                const pt = context.raw;
                                return `${pt.etapa}: ${pt.y.toFixed(1)}°C @ ${pt.x.toFixed(1)}%`;
                            }
                            return `Tg: ${context.parsed.y}°C @ Humedad: ${context.parsed.x.toFixed(1)}%`;
                        }
                    }
                },
                annotation: {
                // Si se añade un plugin de anotaciones, se podrían colocar textos fijos.
                // Por ahora usamos la leyenda y colores para identificar los estados.
                }
            }
        }
    });
}
function actualizarNumerosAdimensionales(): any {
    const velAire = output.cell('velocidadAire') ? parseFloat(output.cell('velocidadAire').value) : 15.0;
    const Tamb = parseFloat(output.cell('tempAmbiente').value);
    const altitud = parseFloat(output.cell('altitud').value);
    const T_limite = parseFloat(output.cell('tempLimiteGrano').value);
    const M0 = parseFloat(output.cell('humedadInicial').value);
    const Mf = parseFloat(output.cell('humedadObjetivo').value);
    const HRamb = parseFloat(output.cell('hrAmbiente').value);
    const tipo = output.cell('tipoGrano').value;
    const grano = datosGranos[tipo];
    const psico = calcularPsicrometria(altitud, Tamb);
    const Me = calcularHumedadEquilibrio(Tamb, HRamb, grano);
    let T_prom_K = (Tamb + T_limite) / 2 + 273.15;
    let mu_aire = 1.81e-5 * Math.pow(T_prom_K / 293.15, 0.7);
    let nu_aire = mu_aire / psico.rho_aire;
    let k_aire = 0.026;
    let D_v = 2.773e-5; // Ajuste para Sc = 0.59
    let grano_Dp = 0.005; // Diámetro de partícula
    let Sc = nu_aire / D_v;
    let Re_d = (velAire * grano_Dp) / nu_aire;
    // Modelos sin el término 2.0+ (Flujo cruzado/lecho empaquetado asume convección dominante)
    let Nu = 1.1 * Math.pow(Re_d, 0.6) * Math.pow(0.71, 0.33);
    let Sh = 1.1 * Math.pow(Re_d, 0.6) * Math.pow(Sc, 0.33);
    let h_c = (Nu * k_aire) / grano_Dp;
    let L_c = grano_Dp / 2.0; // Longitud característica (radio)
    let Bi = (h_c * L_c) / grano.k;
    // Calcular Humedad de Equilibrio al secado (no ambiente) para el número NT
    let tempAireNT = T_limite + 20;
    let HR_heatedNT = calcularHrCalentado(Tamb, HRamb, tempAireNT);
    let Me_NT = calcularHumedadEquilibrio(tempAireNT, HR_heatedNT, grano);
    // Número NT (Number of Transfer Units)
    let ntNumber = 0;
    if ((M0 - Me_NT) > 0 && (Mf - Me_NT) > 0) {
        let ntBase = Math.log((M0 - Me_NT) / (Mf - Me_NT));
        ntNumber = ntBase * Math.pow((h_c / 40.0), 0.5); // Ajuste dinámico
    }
    // Actualizar UI de los números adimensionales
    const metricBiot = output.cell('metricBiot');
    if (metricBiot)
        metricBiot.innerText = Bi.toFixed(3);
    const metricSchmidt = output.cell('metricSchmidt');
    if (metricSchmidt)
        metricSchmidt.innerText = Sc.toFixed(2);
    const metricSherwood = output.cell('metricSherwood');
    if (metricSherwood)
        metricSherwood.innerText = Sh.toFixed(2);
    const metricNT = output.cell('metricNT');
    if (metricNT)
        metricNT.innerText = ntNumber.toFixed(2);
}

 ejecutarSimulacion();
 return output.result(intermediate);
}
