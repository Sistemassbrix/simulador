import {jsPDF} from 'jspdf';
import autoTable from 'jspdf-autotable';
import {PDF_ASSETS} from './pdfAssets';

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
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });
  const isEn = lang === 'en';
  const scenarioTitle = item.nombre_escenario || 'Escenario';
  const c = parseCompany(item.datos_json, scenarioTitle);
  let data: Record<string, any> = {};
  try {
    data = typeof item.datos_json === 'string' ? JSON.parse(item.datos_json) : (item.datos_json || {});
  } catch {}

  // 1. Barra superior: Logos corporativos SuperBrix y Simulador LSU
  try {
    if (PDF_ASSETS.superbrixLogo) {
      doc.addImage(PDF_ASSETS.superbrixLogo, 'PNG', 14, 8, 38, 9, undefined, 'FAST');
    }
    if (PDF_ASSETS.appLogo) {
      doc.addImage(PDF_ASSETS.appLogo, 'PNG', 56, 7, 28, 11, undefined, 'FAST');
    }
  } catch (e) {
    console.warn('Error loading header logos in PDF:', e);
  }

  // Subtítulo derecho en el header
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(15, 23, 42); // slate-900
  doc.text('MEGA LSU INDUSTRIAL', 196, 11, { align: 'right' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139); // slate-500
  doc.text('SuperBrix Drying Technology', 196, 15, { align: 'right' });

  // 2. Banner con imagen de fondo y títulos corporativos
  const bannerY = 20;
  const bannerH = 26;
  try {
    if (PDF_ASSETS.bannerBg) {
      doc.addImage(PDF_ASSETS.bannerBg, 'JPEG', 14, bannerY, 182, bannerH, undefined, 'FAST');
      // Overlay semitransparente oscuro/naranja para legibilidad del texto
      doc.setFillColor(15, 23, 42);
      // @ts-ignore
      if (doc.GState) {
        // @ts-ignore
        doc.setGState(new doc.GState({ opacity: 0.62 }));
        doc.rect(14, bannerY, 182, bannerH, 'F');
        // @ts-ignore
        doc.setGState(new doc.GState({ opacity: 1.0 }));
      }
    } else {
      doc.setFillColor(243, 145, 45); // #F3912D
      doc.rect(14, bannerY, 182, bannerH, 'F');
    }
  } catch (e) {
    doc.setFillColor(243, 145, 45);
    doc.rect(14, bannerY, 182, bannerH, 'F');
  }

  // Borde inferior naranja corporativo #F3912D
  doc.setFillColor(243, 145, 45);
  doc.rect(14, bannerY + bannerH - 1.5, 182, 1.5, 'F');

  // Textos dentro del Banner
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(255, 255, 255);
  doc.text(isEn ? 'SCENARIO REPORT' : 'REPORTE DEL ESCENARIO', 20, bannerY + 11);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(254, 215, 170); // #fed7aa
  doc.text(
    isEn
      ? 'Drying Simulation & Industrial Evaluation Record'
      : 'Registro de Simulación de Secado y Evaluación Industrial',
    20,
    bannerY + 18
  );

  // Metadatos en el lado derecho del banner
  const typeStr = item.tipo || 'Tempero';
  const dateStr = item.creado_en || '';
  const creator = item.usuario_nombre ? `${item.usuario_nombre}${item.usuario_cargo ? ` (${item.usuario_cargo})` : ''}` : '';

  doc.setFontSize(7.5);
  doc.setTextColor(255, 255, 255);
  doc.text(`${isEn ? 'Type' : 'Tipo'}: ${typeStr}  |  ${isEn ? 'Date' : 'Fecha'}: ${dateStr}`, 190, bannerY + 10, { align: 'right' });
  if (creator) {
    doc.text(`${isEn ? 'User' : 'Usuario'}: ${creator}`, 190, bannerY + 16, { align: 'right' });
  }

  // 3. Tarjeta de Información General / Empresa (Sin contacto)
  let cardY = bannerY + bannerH + 5;
  doc.setFillColor(255, 247, 237); // #fff7ed
  doc.setDrawColor(254, 215, 170); // #fed7aa
  doc.setLineWidth(0.4);
  doc.roundedRect(14, cardY, 182, 16, 2, 2, 'FD');

  // Borde izquierdo naranja #F3912D
  doc.setFillColor(243, 145, 45);
  doc.rect(14, cardY, 2.5, 16, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(194, 65, 12); // #c2410c
  doc.text(isEn ? 'SCENARIO IDENTIFICATION' : 'IDENTIFICACIÓN DEL ESCENARIO', 20, cardY + 6);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(51, 65, 85); // slate-700
  const infoEmpresa = `${isEn ? 'Scenario Name' : 'Nombre'}: ${scenarioTitle}   |   ${isEn ? 'Company' : 'Empresa'}: ${c.empresa || '--'}${c.ubicacion ? ` (${c.ubicacion})` : ''}`;
  doc.text(infoEmpresa, 20, cardY + 11.5);

  // 4. Tabla estructurada del escenario: SIN opciones de empresa ni contacto
  const excludedKeys = [
    'Nombre de la Empresa',
    'Company Name',
    'Ubicación',
    'Location',
    'Contacto',
    'Contact'
  ];

  const rows: [string, string][] = [];
  for (const [k, v] of Object.entries(data)) {
    if (excludedKeys.includes(k)) continue;
    rows.push([k, String(v ?? '--')]);
  }

  autoTable(doc, {
    startY: cardY + 20,
    head: [[isEn ? 'Parameter / Operating Variable' : 'Parámetro / Variable Operativa', isEn ? 'Value / Simulated Result' : 'Valor / Resultado Simulado']],
    body: rows,
    theme: 'grid',
    headStyles: {
      fillColor: [243, 145, 45], // #F3912D Naranja corporativo
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 8.5,
      halign: 'left',
      cellPadding: 3.5
    },
    bodyStyles: {
      fontSize: 8,
      textColor: [15, 23, 42],
      cellPadding: 3
    },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 105, textColor: [30, 41, 59] },
      1: { cellWidth: 77, fontStyle: 'normal' }
    },
    alternateRowStyles: {
      fillColor: [255, 250, 245] // Tono sutil cálido corporativo
    },
    styles: {
      lineColor: [254, 215, 170], // #fed7aa
      lineWidth: 0.2
    }
  });

  // Pie de página en todas las páginas
  const pageCount = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(7.5);
    doc.setTextColor(148, 163, 184); // slate-400
    doc.text(
      `${isEn ? 'Page' : 'Página'} ${i} / ${pageCount} — ${isEn ? 'Generated by LSU Industrial Drying Simulator (SuperBrix)' : 'Generado por Simulador Industrial de Secado LSU (SuperBrix)'}`,
      14,
      doc.internal.pageSize.height - 8
    );
  }

  const safeTitle = scenarioTitle.replace(/[^a-zA-Z0-9_\-]/g, '_');
  doc.save(`${safeTitle}_reporte.pdf`);
}

export function harvestCsv(days:any[]){let csv='Dia,Temperatura_Promedio_C,Humedad_Promedio_Pct,Temp_Max_C,Temp_Min_C,HR_Max_Pct,HR_Min_Pct,Condicion\n';days.forEach(d=>csv+=`"${d.etiquetaDia}",${d.t_mean},${d.hr_mean},${d.t_max},${d.t_min},${d.hr_max},${d.hr_min},"${d.condicion}"\n`);return csv;}
export function hourlyCsv(hours:any[],start:number,end:number){let csv='Hora,Franja_Activa,Temp_Media_C,Temp_Min_C,Temp_Max_C,Humedad_Media_Pct,HR_Min_Pct,HR_Max_Pct,Deficit_Psicrometrico_g_kg\n';hours.forEach(h=>{const active=start<=end?h.hora>=start&&h.hora<=end:h.hora>=start||h.hora<=end;csv+=`"${h.etiquetaHora}","${active?'SI':'NO'}",${h.t_mean},${h.t_min},${h.t_max},${h.hr_mean},${h.hr_min},${h.hr_max},${h.deficit}\n`;});return csv;}
