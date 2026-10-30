import {jsPDF} from 'jspdf';
import autoTable from 'jspdf-autotable';

export function parseCompany(json?: string, nombreEscenario?: string) {
  let empresa = '';
  let ubicacion = '';
  if (json) {
    try {
      const d = typeof json === 'string' ? JSON.parse(json) : json;
      empresa = d['Nombre de la Empresa'] || d['Company Name'] || '';
      ubicacion = d['Ubicación'] || d['Location'] || '';
    } catch {}
  }
  if (!empresa && nombreEscenario && nombreEscenario.includes('-')) {
    const parts = nombreEscenario.split('-').map(s => s.trim());
    empresa = parts[0] || '';
    ubicacion = parts.slice(1).join(' - ') || '';
  } else if (!empresa && nombreEscenario) {
    empresa = nombreEscenario.trim();
  }
  return { empresa, ubicacion };
}

export function download(content:string,filename:string,type='text/csv'){const url=URL.createObjectURL(new Blob([content],{type}));const a=document.createElement('a');a.href=url;a.download=filename;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}

export function historyCsv(rows:any[]){
  const hasUser=rows.some(r=>r.usuario_nombre);
  if(hasUser){
    let csv='ID,Usuario,Cargo,Empresa,Ubicacion,Nombre,Tipo,Fecha,Estado\n';
    rows.forEach(row=>{
      const estado=row.eliminado_por_usuario?'Borrado por usuario':'Activo';
      const c = parseCompany(row.datos_json, row.nombre_escenario);
      csv+=`${row.id},"${row.usuario_nombre||''}","${row.usuario_cargo||''}","${c.empresa}","${c.ubicacion}","${row.nombre_escenario}",${row.tipo},"${row.creado_en}","${estado}"\n`;
    });
    return csv;
  }
  let csv='ID,Empresa,Ubicacion,Nombre,Tipo,Fecha\n';
  rows.forEach(row=>{
    const c = parseCompany(row.datos_json, row.nombre_escenario);
    csv+=`${row.id},"${c.empresa}","${c.ubicacion}","${row.nombre_escenario}",${row.tipo},"${row.creado_en}"\n`;
  });
  return csv;
}

export function historyPdf(rows:any[]){
  const doc=new jsPDF();
  doc.setFontSize(18);
  doc.text('Historial de Escenarios',14,22);
  const hasUser=rows.some(r=>r.usuario_nombre);
  if(hasUser){
    autoTable(doc,{
      head:[['ID','Usuario','Empresa','Nombre Escenario','Tipo','Fecha','Estado']],
      body:rows.map(r=>{
        const c = parseCompany(r.datos_json, r.nombre_escenario);
        return [
          r.id,
          r.usuario_nombre||`Usuario #${r.usuario_id}`,
          c.empresa ? (c.ubicacion ? `${c.empresa} (${c.ubicacion})` : c.empresa) : '--',
          r.nombre_escenario,
          r.tipo,
          r.creado_en,
          r.eliminado_por_usuario?'Borrado por usuario':'Activo'
        ];
      }),
      startY:30,
      theme:'striped'
    });
  }else{
    autoTable(doc,{
      head:[['ID','Empresa','Nombre Escenario','Tipo','Fecha']],
      body:rows.map(r=>{
        const c = parseCompany(r.datos_json, r.nombre_escenario);
        return [
          r.id,
          c.empresa ? (c.ubicacion ? `${c.empresa} (${c.ubicacion})` : c.empresa) : '--',
          r.nombre_escenario,
          r.tipo,
          r.creado_en
        ];
      }),
      startY:30,
      theme:'striped'
    });
  }
  doc.save('historial_escenarios.pdf');
}

export function singleScenarioPdf(item: any, lang: string = 'es') {
  const doc = new jsPDF();
  const scenarioTitle = item.nombre_escenario || 'Escenario';
  const c = parseCompany(item.datos_json, scenarioTitle);
  let data: Record<string, any> = {};
  try {
    data = typeof item.datos_json === 'string' ? JSON.parse(item.datos_json) : (item.datos_json || {});
  } catch {}

  // Header band
  doc.setFillColor(13, 110, 253);
  doc.rect(0, 0, 210, 22, 'F');
  
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.text(lang === 'en' ? 'GRAIN DRYING SIMULATOR - SCENARIO REPORT' : 'SIMULADOR DE SECADO - REPORTE DE ESCENARIO', 14, 14);

  // Scenario Title
  doc.setTextColor(33, 37, 41);
  doc.setFontSize(15);
  doc.setFont('helvetica', 'bold');
  doc.text(scenarioTitle, 14, 32);

  // Metadata
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(108, 117, 125);
  
  let metaY = 38;
  const creator = item.usuario_nombre ? `${item.usuario_nombre}${item.usuario_cargo ? ` (${item.usuario_cargo})` : ''}` : '';
  if (creator) {
    doc.text(`${lang === 'en' ? 'User / Operator' : 'Usuario / Operador'}: ${creator}`, 14, metaY);
    metaY += 5;
  }
  const typeStr = item.tipo || '';
  const dateStr = item.creado_en || '';
  doc.text(`${lang === 'en' ? 'Simulation Type' : 'Tipo de Simulación'}: ${typeStr}  |  ${lang === 'en' ? 'Date' : 'Fecha'}: ${dateStr}`, 14, metaY);
  metaY += 5;

  if (c.empresa || c.ubicacion) {
    const compText = `${lang === 'en' ? 'Company' : 'Empresa'}: ${c.empresa || '--'}  |  ${lang === 'en' ? 'Location' : 'Ubicación'}: ${c.ubicacion || '--'}`;
    doc.text(compText, 14, metaY);
    metaY += 6;
  } else {
    metaY += 3;
  }

  // Filter out redundant company / location rows from table if present
  const rows: [string, string][] = [];
  for (const [k, v] of Object.entries(data)) {
    if (['Nombre de la Empresa', 'Company Name', 'Ubicación', 'Location'].includes(k)) continue;
    rows.push([k, String(v ?? '--')]);
  }

  autoTable(doc, {
    startY: metaY + 2,
    head: [[lang === 'en' ? 'Parameter / Metric' : 'Parámetro / Métrica', lang === 'en' ? 'Result / Value' : 'Resultado / Valor']],
    body: rows,
    theme: 'striped',
    headStyles: {
      fillColor: [13, 110, 253],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 9.5
    },
    bodyStyles: {
      fontSize: 9,
      textColor: [33, 37, 41]
    },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 95 },
      1: { cellWidth: 85 }
    },
    alternateRowStyles: {
      fillColor: [248, 249, 250]
    }
  });

  const pageCount = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150);
    doc.text(
      `${lang === 'en' ? 'Page' : 'Página'} ${i} / ${pageCount} - Generado por Simulador de Secado`,
      14,
      doc.internal.pageSize.height - 10
    );
  }

  const safeTitle = scenarioTitle.replace(/[^a-zA-Z0-9_\-]/g, '_');
  doc.save(`${safeTitle}_reporte.pdf`);
}

export function harvestCsv(days:any[]){let csv='Dia,Temperatura_Promedio_C,Humedad_Promedio_Pct,Temp_Max_C,Temp_Min_C,HR_Max_Pct,HR_Min_Pct,Condicion\n';days.forEach(d=>csv+=`"${d.etiquetaDia}",${d.t_mean},${d.hr_mean},${d.t_max},${d.t_min},${d.hr_max},${d.hr_min},"${d.condicion}"\n`);return csv;}
export function hourlyCsv(hours:any[],start:number,end:number){let csv='Hora,Franja_Activa,Temp_Media_C,Temp_Min_C,Temp_Max_C,Humedad_Media_Pct,HR_Min_Pct,HR_Max_Pct,Deficit_Psicrometrico_g_kg\n';hours.forEach(h=>{const active=start<=end?h.hora>=start&&h.hora<=end:h.hora>=start||h.hora<=end;csv+=`"${h.etiquetaHora}","${active?'SI':'NO'}",${h.t_mean},${h.t_min},${h.t_max},${h.hr_mean},${h.hr_min},${h.hr_max},${h.deficit}\n`;});return csv;}
