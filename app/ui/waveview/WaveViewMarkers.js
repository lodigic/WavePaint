// WaveViewMarkers.js - Markers, time jumps, and time spans rendering

/**
 * Draw time jump glyph at specified position
 */
function drawTimeJumpGlyph(ctx, x, centerY, rowH, color, lineWidth, dashed, canvasBg) {
    const glyphH = Math.max(10, Math.floor((rowH * 2) / 3));
    const halfH = glyphH / 2;

    // Fixed pixel sizes so breaks stay consistent at any zoom level, like
    // WaveDrom (issue #7). Values match the previous defaults at 48px cells.
    const span = 24;
    const halfSpan = span / 2;

    const sep = 8;

    const a1 = { x: x - sep - halfSpan, y: centerY + halfH };
    const b1 = { x: x - sep + halfSpan, y: centerY - halfH };
    const a2 = { x: x + sep - halfSpan, y: centerY + halfH };
    const b2 = { x: x + sep + halfSpan, y: centerY - halfH };

    // Gap between slashes
    ctx.save();
    ctx.fillStyle = canvasBg;
    ctx.beginPath();
    ctx.moveTo(a1.x, a1.y);
    ctx.lineTo(b1.x, b1.y);
    ctx.lineTo(b2.x, b2.y);
    ctx.lineTo(a2.x, a2.y);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    const stub = 5;

    const drawSlash = (a, b) => {
        const aStub = { x: a.x - stub, y: a.y };
        const bStub = { x: b.x + stub, y: b.y };
        const vx = b.x - a.x;
        const vy = b.y - a.y;
        const len = Math.hypot(vx, vy) || 1;
        const ux = vx / len;
        const uy = vy / len;
        const r = Math.min(stub, 4);

        const aIn = { x: a.x - r, y: a.y };
        const aOut = { x: a.x + ux * r, y: a.y + uy * r };
        const bOut = { x: b.x - ux * r, y: b.y - uy * r };
        const bIn = { x: b.x + r, y: b.y };

        ctx.beginPath();
        ctx.moveTo(aStub.x, aStub.y);
        ctx.lineTo(aIn.x, aIn.y);
        ctx.quadraticCurveTo(a.x, a.y, aOut.x, aOut.y);
        ctx.lineTo(bOut.x, bOut.y);
        ctx.quadraticCurveTo(b.x, b.y, bIn.x, bIn.y);
        ctx.lineTo(bStub.x, bStub.y);
        ctx.stroke();
    };

    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineWidth = lineWidth;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    if (dashed) ctx.setLineDash([4, 4]);
    drawSlash(a1, b1);
    drawSlash(a2, b2);
    ctx.restore();
}

/**
 * Draw marker preview - uses fractional positions
 */
function drawMarkerPreview(ctx, signalStartY, sampleCount, subStepWidth, nameWidth) {
    if (currentTool !== 'marker' || markerPreviewPosition < 0 || markerPreviewPosition > sampleCount) return;
    
    const x = positionToPixelX(markerPreviewPosition);
    ctx.save();
    ctx.strokeStyle = getThemeDefaultMarkerColor();
    ctx.lineWidth = 2;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(x, signalStartY);
    ctx.lineTo(x, canvas.height - 1);
    ctx.stroke();
    ctx.restore();
}

/**
 * Draw time jump preview - uses fractional positions
 */
function drawTimeJumpPreview(ctx, signals, signalStartY, rowHeight, sampleCount, subStepWidth, nameWidth, canvasBg) {
    if (currentTool !== 'time-jump' || timeJumpPreviewPosition < 0 || timeJumpPreviewPosition > sampleCount) return;
    
    const x = positionToPixelX(timeJumpPreviewPosition);
    const defaultTimeJumpColor = getThemeDefaultTimeJumpColor();
    for (let i = 0; i < signals.length; i++) {
        if (signals[i].type === SignalType.BlankRow) continue;
        const cy = signalStartY + i * rowHeight + rowHeight / 2;
        drawTimeJumpGlyph(ctx, x, cy, rowHeight, defaultTimeJumpColor, 2, true, canvasBg);
    }
}

/**
 * Draw all time jumps - uses fractional positions
 */
function drawTimeJumps(ctx, signals, signalStartY, rowHeight, sampleCount, subStepWidth, nameWidth, canvasBg) {
    const timeJumps = document_wave.timeJumpList();
    if (!timeJumps || !timeJumps.length) return;
    
    const defaultTimeJumpColor = getThemeDefaultTimeJumpColor();
    for (const j of timeJumps) {
        if (j.position < 0 || j.position > sampleCount) continue;
        const x = positionToPixelX(j.position);
        const color = j.color || defaultTimeJumpColor;
        for (let i = 0; i < signals.length; i++) {
            if (signals[i].type === SignalType.BlankRow) continue;
            const cy = signalStartY + i * rowHeight + rowHeight / 2;
            drawTimeJumpGlyph(ctx, x, cy, rowHeight, color, 2, false, canvasBg);
        }
        
        // Draw selection indicator if this time jump is selected (follows the shape)
        if (typeof isObjectSelected === 'function' && 
            typeof SelectableType !== 'undefined' && 
            isObjectSelected(SelectableType.TimeJump, j.id)) {
            ctx.save();
            ctx.strokeStyle = 'rgba(0, 191, 255, 0.5)';
            ctx.lineWidth = 10;
            ctx.lineCap = 'round';
            ctx.setLineDash([]);
            // Draw a thicker line following the time jump position
            ctx.beginPath();
            ctx.moveTo(x, signalStartY);
            ctx.lineTo(x, signalStartY + signals.length * rowHeight);
            ctx.stroke();
            ctx.setLineDash([]);
            ctx.restore();
        }
    }
}

/**
 * Draw all markers - uses fractional positions
 */
function drawMarkers(ctx, sampleCount, subStepWidth, signalStartY, nameWidth) {
    const markers = document_wave.markerList();
    if (!markers || !markers.length) return;
    
    const fontSize = 10;
    const defaultMarkerColor = getThemeDefaultMarkerColor();
    ctx.save();
    ctx.font = `${fontSize}px Arial`;
    const markerLabelY = signalStartY - fontSize - 4;
    
    for (const mk of markers) {
        const position = mk.position;
        if (position < 0 || position > sampleCount) continue;
        const color = mk.color || defaultMarkerColor;
        const x = positionToPixelX(position);
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(x, signalStartY);
        ctx.lineTo(x, canvas.height - 1);
        ctx.stroke();

        const label = String(mk.id);
        const textWidth = ctx.measureText(label).width;
        const labelX = Math.max(0, x - textWidth - 6);
        ctx.fillStyle = color;
        ctx.fillRect(labelX, markerLabelY, textWidth + 6, fontSize + 4);
        ctx.fillStyle = '#fff';
        ctx.fillText(label, labelX + 3, markerLabelY + fontSize + 1);
        
        // Draw selection indicator if this marker is selected (follows the shape)
        if (typeof isObjectSelected === 'function' && 
            typeof SelectableType !== 'undefined' && 
            isObjectSelected(SelectableType.Marker, mk.id)) {
            ctx.strokeStyle = 'rgba(0, 191, 255, 0.5)';
            ctx.lineWidth = 10;
            ctx.lineCap = 'round';
            ctx.setLineDash([]);
            // Draw a thicker line following the marker
            ctx.beginPath();
            ctx.moveTo(x, signalStartY);
            ctx.lineTo(x, canvas.height - 1);
            ctx.stroke();
            ctx.setLineDash([]);
        }
    }
    ctx.restore();
}

/**
 * Draw time span preview - uses fractional positions
 */
function drawTimeSpanPreview(ctx, signalStartY, rowHeight, subStepWidth, nameWidth) {
    if (currentTool !== 'time-span' || !timeSpanHasStart || timeSpanPreviewPosition < 0 || timeSpanStartSignal < 0) return;
    
    const p1x = positionToPixelX(timeSpanStartPosition);
    const p1y = signalStartY + timeSpanStartSignal * rowHeight + rowHeight / 2;
    const endSignal = timeSpanPreviewSignal >= 0 ? timeSpanPreviewSignal : timeSpanStartSignal;
    const p2x = positionToPixelX(timeSpanPreviewPosition);
    const p2y = signalStartY + endSignal * rowHeight + rowHeight / 2;
    
    const baseColor = getThemeDefaultTimeSpanColor();
    const previewColor = baseColor + '99'; // Add alpha for preview

    ctx.save();
    ctx.strokeStyle = previewColor;
    ctx.lineWidth = WAVEDROM_STYLE.arrowLineWidth;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.setLineDash([5, 5]);
    
    // Draw L-shape: horizontal first, then vertical (default -| style)
    ctx.beginPath();
    ctx.moveTo(p1x, p1y);
    ctx.lineTo(p2x, p1y);
    ctx.lineTo(p2x, p2y);
    ctx.stroke();
    
    // Draw circles at endpoints
    ctx.setLineDash([]);
    ctx.fillStyle = previewColor;
    ctx.beginPath();
    ctx.arc(p1x, p1y, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(p2x, p2y, 3, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.restore();
}

/**
 * Draw all time spans - uses fractional positions
 */
function drawTimeSpans(ctx, signals, signalStartY, rowHeight, subStepWidth, nameWidth) {
    const timeSpans = document_wave.timeSpanMarkerList();
    if (!timeSpans || timeSpans.length === 0) return;
    
    const defaultTimeSpanColor = getThemeDefaultTimeSpanColor();
    const lineWidth = WAVEDROM_STYLE.arrowLineWidth;
    
    for (const ts of timeSpans) {
        // Skip invalid time spans
        if (ts.startSignal < 0 || ts.startSignal >= signals.length) continue;
        if (ts.endSignal < 0 || ts.endSignal >= signals.length) continue;
        
        const color = ts.color || defaultTimeSpanColor;
        
        // Calculate endpoints using fractional positions
        const p1x = positionToPixelX(ts.startPosition);
        const p1y = signalStartY + ts.startSignal * rowHeight + rowHeight / 2;
        const p2x = positionToPixelX(ts.endPosition);
        const p2y = signalStartY + ts.endSignal * rowHeight + rowHeight / 2;
        
        const dx = p2x - p1x;
        const dy = p2y - p1y;
        
        const style = ts.style || '-|';
        
        ctx.save();
        ctx.strokeStyle = color;
        ctx.lineWidth = lineWidth;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.fillStyle = color;
        
        // Draw the path based on style (sharp lines only)
        ctx.beginPath();
        ctx.moveTo(p1x, p1y);
        
        if (style === '-|-') {
            // Z-Shape
            const midX = p1x + dx / 2;
            ctx.lineTo(midX, p1y);
            ctx.lineTo(midX, p2y);
            ctx.lineTo(p2x, p2y);
        } else if (style === '|-') {
            // Corner: vertical first, then horizontal
            ctx.lineTo(p1x, p2y);
            ctx.lineTo(p2x, p2y);
        } else {
            // Default -| : L-Shape
            ctx.lineTo(p2x, p1y);
            ctx.lineTo(p2x, p2y);
        }
        ctx.stroke();
        
        // Draw circles at endpoints
        ctx.beginPath();
        ctx.arc(p1x, p1y, 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(p2x, p2y, 3, 0, Math.PI * 2);
        ctx.fill();
        
        // Draw selection indicator if this time span is selected (follows the shape)
        if (typeof isObjectSelected === 'function' && 
            typeof SelectableType !== 'undefined' && 
            isObjectSelected(SelectableType.TimeSpan, ts.id)) {
            ctx.strokeStyle = 'rgba(0, 191, 255, 0.5)';
            ctx.lineWidth = lineWidth + 8;
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            ctx.setLineDash([]);
            
            // Redraw the path for selection highlight
            ctx.beginPath();
            ctx.moveTo(p1x, p1y);
            
            if (style === '-|-') {
                const midX = p1x + dx / 2;
                ctx.lineTo(midX, p1y);
                ctx.lineTo(midX, p2y);
                ctx.lineTo(p2x, p2y);
            } else if (style === '|-') {
                ctx.lineTo(p1x, p2y);
                ctx.lineTo(p2x, p2y);
            } else {
                ctx.lineTo(p2x, p1y);
                ctx.lineTo(p2x, p2y);
            }
            ctx.stroke();
            ctx.setLineDash([]);
        }
        
        ctx.restore();
    }
}

// Export for module use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        drawTimeJumpGlyph,
        drawMarkerPreview,
        drawTimeJumpPreview,
        drawTimeJumps,
        drawMarkers,
        drawTimeSpanPreview,
        drawTimeSpans
    };
}
