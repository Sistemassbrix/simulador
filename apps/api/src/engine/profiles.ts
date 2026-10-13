export function procesarYRenderizarPerfiles(dataForecast: any, dataArchive: any): any {
    let perfiles = [];
    // 1. Tiempo Real (Actual)
    if (dataForecast.current) {
        perfiles.push({
            id: 'realtime',
            title: 'Tiempo Real',
            icon: 'fa-bolt text-warning',
            temp: parseFloat(dataForecast.current.temperature_2m).toFixed(1),
            hr: Math.round(dataForecast.current.relative_humidity_2m),
            sub: 'Momento actual'
        });
    }
    // 2. Horarios del día (Madrugada 05h, Mañana 10h, Tarde 15h, Noche 21h)
    if (dataForecast.hourly && dataForecast.hourly.temperature_2m) {
        // Madrugada: 05:00
        if (dataForecast.hourly.temperature_2m[5] !== undefined) {
            perfiles.push({
                id: 'madrugada',
                title: 'Madrugada (05h)',
                icon: 'fa-moon text-primary',
                temp: parseFloat(dataForecast.hourly.temperature_2m[5]).toFixed(1),
                hr: Math.round(dataForecast.hourly.relative_humidity_2m[5]),
                sub: 'Mínimo térmico'
            });
        }
        // Mañana: 10:00
        if (dataForecast.hourly.temperature_2m[10] !== undefined) {
            perfiles.push({
                id: 'manana',
                title: 'Mañana (10h)',
                icon: 'fa-cloud-sun text-info',
                temp: parseFloat(dataForecast.hourly.temperature_2m[10]).toFixed(1),
                hr: Math.round(dataForecast.hourly.relative_humidity_2m[10]),
                sub: 'Calentamiento'
            });
        }
        // Tarde: 15:00
        if (dataForecast.hourly.temperature_2m[15] !== undefined) {
            perfiles.push({
                id: 'tarde',
                title: 'Tarde (15h)',
                icon: 'fa-sun text-danger',
                temp: parseFloat(dataForecast.hourly.temperature_2m[15]).toFixed(1),
                hr: Math.round(dataForecast.hourly.relative_humidity_2m[15]),
                sub: 'Máximo térmico'
            });
        }
        // Noche: 21:00
        if (dataForecast.hourly.temperature_2m[21] !== undefined) {
            perfiles.push({
                id: 'noche',
                title: 'Noche (21h)',
                icon: 'fa-cloud-moon text-secondary',
                temp: parseFloat(dataForecast.hourly.temperature_2m[21]).toFixed(1),
                hr: Math.round(dataForecast.hourly.relative_humidity_2m[21]),
                sub: 'Enfriamiento'
            });
        }
    }
    // 3. Histórico Anual (Promedio 2025)
    if (dataArchive && dataArchive.daily && dataArchive.daily.temperature_2m_mean) {
        let temps = dataArchive.daily.temperature_2m_mean.filter((v: any) => v !== null && !isNaN(v));
        let hrs = dataArchive.daily.relative_humidity_2m_mean.filter((v: any) => v !== null && !isNaN(v));
        if (temps.length > 0) {
            let avgTemp = (temps.reduce((a: any, b: any) => a + b, 0) / temps.length).toFixed(1);
            let avgHr = Math.round(hrs.reduce((a: any, b: any) => a + b, 0) / hrs.length);
            perfiles.push({
                id: 'historico',
                title: 'Histórico 2025',
                icon: 'fa-calendar-alt text-success',
                temp: avgTemp,
                hr: avgHr,
                sub: 'Promedio anual'
            });
        }
    }
    return perfiles;
}
