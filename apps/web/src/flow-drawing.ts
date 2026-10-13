export function drawFlow(canvas:any,animFillLevels:any,step:any,particles:{progress:number}[]){
function getPointsForRoute(route: any, w: any, h: any): any {
    if (route === 'SC_TS') {
        return [{ x: w * 0.12, y: h * 0.83 }, { x: w * 0.05, y: h * 0.83 }, { x: w * 0.05, y: h * 0.12 }, { x: w * 0.35, y: h * 0.12 }, { x: w * 0.35, y: h * 0.28 }];
    }
    else if (route === 'SC_DB') {
        return [{ x: w * 0.12, y: h * 0.83 }, { x: w * 0.05, y: h * 0.83 }, { x: w * 0.05, y: h * 0.12 }, { x: w * 0.58, y: h * 0.12 }, { x: w * 0.58, y: h * 0.38 }];
    }
    else if (route === 'TS_DB') {
        return [{ x: w * 0.37, y: h * 0.82 }, { x: w * 0.37, y: h * 0.84 }, { x: w * 0.45, y: h * 0.84 }, { x: w * 0.45, y: h * 0.36 }, { x: w * 0.58, y: h * 0.36 }, { x: w * 0.58, y: h * 0.38 }];
    }
    else if (route === 'DB_TS') {
        return [{ x: w * 0.58, y: h * 0.83 }, { x: w * 0.58, y: h * 0.86 }, { x: w * 0.25, y: h * 0.86 }, { x: w * 0.25, y: h * 0.28 }, { x: w * 0.32, y: h * 0.28 }, { x: w * 0.32, y: h * 0.30 }];
    }
    else if (route === 'TS_SA') {
        return [{ x: w * 0.35, y: h * 0.83 }, { x: w * 0.35, y: h * 0.88 }, { x: w * 0.90, y: h * 0.88 }, { x: w * 0.90, y: h * 0.43 }, { x: w * 0.805, y: h * 0.43 }, { x: w * 0.805, y: h * 0.45 }];
    }
    return [];
}
function interpolatePolyline(pts: any, t: any): any {
    if (pts.length < 2)
        return { x: 0, y: 0 };
    let lengths = [], totalLength = 0;
    for (let i = 0; i < pts.length - 1; i++) {
        let dx = pts[i + 1].x - pts[i].x;
        let dy = pts[i + 1].y - pts[i].y;
        let len = Math.hypot(dx, dy);
        lengths.push(len);
        totalLength += len;
    }
    let target = t * totalLength, accumulated = 0;
    for (let i = 0; i < lengths.length; i++) {
        if (accumulated + lengths[i] >= target) {
            let segmentT = (target - accumulated) / lengths[i];
            return { x: pts[i].x + segmentT * (pts[i + 1].x - pts[i].x), y: pts[i].y + segmentT * (pts[i + 1].y - pts[i].y) };
        }
        accumulated += lengths[i];
    }
    return pts[pts.length - 1];
}
function drawPipe(ctx: any, pts: any, color: any): any {
    if (pts.length < 2)
        return;
    ctx.strokeStyle = color;
    ctx.lineWidth = 4;
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(pts[0].x, pts[0].y);
    for (let i = 1; i < pts.length; i++)
        ctx.lineTo(pts[i].x, pts[i].y);
    ctx.stroke();
}
function drawHopper(ctx: any, x: any, y: any, width: any, height: any, label: any, fillRatio: any): any {
    ctx.fillStyle = '#334155';
    ctx.strokeStyle = '#64748b';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + width, y);
    ctx.lineTo(x + width * 0.75, y + height);
    ctx.lineTo(x + width * 0.25, y + height);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    if (fillRatio > 0) {
        ctx.fillStyle = '#d97706';
        const hFill = height * fillRatio;
        ctx.beginPath();
        ctx.moveTo(x + width * 0.1, y + height - hFill);
        ctx.lineTo(x + width * 0.9, y + height - hFill);
        ctx.lineTo(x + width * 0.75, y + height);
        ctx.lineTo(x + width * 0.25, y + height);
        ctx.closePath();
        ctx.fill();
    }
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 18px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(label, x + width / 2, y - 18);
}
function drawDryingTower(ctx: any, x: any, y: any, width: any, height: any, label: any, fillRatio: any): any {
    ctx.fillStyle = '#1e293b';
    ctx.strokeStyle = '#64748b';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x, y + 20);
    ctx.lineTo(x + width / 2, y);
    ctx.lineTo(x + width, y + 20);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.fillRect(x, y + 20, width, height - 40);
    ctx.strokeRect(x, y + 20, width, height - 40);
    ctx.beginPath();
    ctx.moveTo(x, y + height - 20);
    ctx.lineTo(x + width, y + height - 20);
    ctx.lineTo(x + width / 2, y + height);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x + 5, y + height - 25);
    ctx.lineTo(x + 5, y + height + 15);
    ctx.moveTo(x + width - 5, y + height - 25);
    ctx.lineTo(x + width - 5, y + height + 15);
    ctx.stroke();
    if (fillRatio > 0) {
        const fillH = (height - 40) * fillRatio;
        const grad = ctx.createLinearGradient(x, y + height - 20, x, y + height - 20 - fillH);
        grad.addColorStop(0, '#ef4444');
        grad.addColorStop(0.5, '#f97316');
        grad.addColorStop(1, '#eab308');
        ctx.fillStyle = grad;
        ctx.fillRect(x + 4, y + height - 20 - fillH, width - 8, fillH);
    }
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
    for (let i = y + 30; i < y + height - 30; i += 12) {
        ctx.beginPath();
        ctx.moveTo(x + 5, i);
        ctx.lineTo(x + width - 5, i);
        ctx.stroke();
    }
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 18px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(label, x + width / 2 + 25, y - 18);
}
function drawSilo(ctx: any, x: any, y: any, width: any, height: any, label: any, fillRatio: any, isAtempero: any = false): any {
    ctx.fillStyle = '#1e293b';
    ctx.strokeStyle = '#64748b';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x, y + 25);
    ctx.lineTo(x + width / 2, y);
    ctx.lineTo(x + width, y + 25);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.fillRect(x, y + 25, width, height - 40);
    ctx.strokeRect(x, y + 25, width, height - 50);
    ctx.beginPath();
    ctx.moveTo(x, y + height - 25);
    ctx.lineTo(x + width, y + height - 25);
    ctx.lineTo(x + width * 0.5, y + height);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x + 5, y + height - 25);
    ctx.lineTo(x + 5, y + height + 15);
    ctx.moveTo(x + width - 5, y + height - 25);
    ctx.lineTo(x + width - 5, y + height + 15);
    ctx.stroke();
    if (fillRatio > 0) {
        const fillH = (height - 50) * fillRatio;
        if (isAtempero) {
            const grad = ctx.createLinearGradient(x, y + height - 25, x, y + height - 25 - fillH);
            grad.addColorStop(0, '#059669');
            grad.addColorStop(0.5, '#10b981');
            grad.addColorStop(1, '#06b6d4');
            ctx.fillStyle = grad;
        }
        else {
            ctx.fillStyle = '#10b981';
        }
        ctx.fillRect(x + 4, y + height - 25 - fillH, width - 8, fillH);
    }
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 18px sans-serif';
    ctx.textAlign = 'center';
    let xOffset = label === 'DB' ? 25 : 0;
    ctx.fillText(label, x + width / 2 + xOffset, y - 18);
}
function drawDiagram(): any {
    if (!canvas)
        return;
    const ctx = canvas.getContext('2d');
    const w = canvas.width;
    const h = canvas.height;
    ctx.clearRect(0, 0, w, h);
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(w * 0.02, h * 0.85);
    ctx.lineTo(w * 0.98, h * 0.85);
    ctx.stroke();
    drawHopper(ctx, w * 0.08, h * 0.65, w * 0.08, h * 0.18, 'SC', animFillLevels.SC);
    drawDryingTower(ctx, w * 0.30, h * 0.28, w * 0.10, h * 0.55, 'TS', animFillLevels.TS);
    drawSilo(ctx, w * 0.52, h * 0.38, w * 0.12, h * 0.45, 'DB', animFillLevels.DB, true);
    drawSilo(ctx, w * 0.74, h * 0.45, w * 0.13, h * 0.38, 'SA', animFillLevels.SA, false);
    drawPipe(ctx, getPointsForRoute('SC_TS', w, h), '#eab308');
    drawPipe(ctx, getPointsForRoute('SC_DB', w, h), '#eab308');
    drawPipe(ctx, getPointsForRoute('TS_DB', w, h), '#10b981');
    drawPipe(ctx, getPointsForRoute('DB_TS', w, h), '#3b82f6');
    drawPipe(ctx, getPointsForRoute('TS_SA', w, h), '#a855f7');
    if (step) {
        const routes = step.route.split(',');
        for (let i = 0; i < 35; i++) {
            const pts = getPointsForRoute(routes[i % routes.length], w, h);
            const pos = interpolatePolyline(pts, particles[i].progress);
            ctx.fillStyle = step.color;
            ctx.beginPath();
            ctx.arc(pos.x, pos.y, 3.5, 0, Math.PI * 2);
            ctx.fill();
        }
    }
}

 drawDiagram();
}
