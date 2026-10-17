// WaveViewArrows.js - Arrow computation and rendering

/**
 * Compute arrow curve control points
 * Uses fractional positions (startPosition/endPosition) and converts to pixels
 */
function computeArrowCurve(arrow, signals, subStepWidth, rowHeight, signalStartY, nameWidth) {
    if (!arrow || arrow.startSignal < 0 || arrow.endSignal < 0) return null;
    if (arrow.startSignal >= signals.length || arrow.endSignal >= signals.length) return null;

    // Use fractional positions - positionToPixelX handles the conversion
    const p1x = positionToPixelX(arrow.startPosition);
    const p1y = signalStartY + arrow.startSignal * rowHeight + rowHeight / 2;
    const p2x = positionToPixelX(arrow.endPosition);
    const p2y = signalStartY + arrow.endSignal * rowHeight + rowHeight / 2;

    const dx = p2x - p1x;
    const dy = p2y - p1y;
    
    const style = arrow.style || '~>';
    
    // Calculate midpoint based on arrow style for label positioning
    let midX, midY;
    let ctrl1x, ctrl1y, ctrl2x, ctrl2y;
    
    if (style.includes('|') && !style.includes('~')) {
        // Sharp lines - midpoint is on the path
        if (style.includes('-|-') || style === '<-|->') {
            // Zigzag: horizontal, vertical, horizontal - midpoint on vertical segment
            midX = p1x + dx / 2;
            midY = (p1y + p2y) / 2;
        } else if (style.startsWith('-|') || style === '<-|>') {
            // Right angle: horizontal first - midpoint at corner or on vertical
            midX = p2x;
            midY = (p1y + p2y) / 2;
        } else if (style.startsWith('|-')) {
            // Left angle: vertical first - midpoint at corner or on horizontal
            midX = (p1x + p2x) / 2;
            midY = p2y;
        } else {
            midX = p2x;
            midY = (p1y + p2y) / 2;
        }
        // For sharp lines, control points are not used for curves
        ctrl1x = midX;
        ctrl1y = midY;
        ctrl2x = midX;
        ctrl2y = midY;
    } else {
        // Spline curves - WaveDrom style cubic bezier
        ctrl1x = p1x + 0.7 * dx;
        ctrl1y = p1y;
        ctrl2x = p1x + 0.3 * dx;
        ctrl2y = p2y;
        
        // Midpoint using cubic bezier at t=0.5
        const t = 0.5;
        const inv = 1 - t;
        const inv2 = inv * inv;
        const inv3 = inv2 * inv;
        const t2 = t * t;
        const t3 = t2 * t;
        midX = inv3 * p1x + 3 * inv2 * t * ctrl1x + 3 * inv * t2 * ctrl2x + t3 * p2x;
        midY = inv3 * p1y + 3 * inv2 * t * ctrl1y + 3 * inv * t2 * ctrl2y + t3 * p2y;
    }
    
    // Return control point for quadratic approximation (midpoint of cubic controls)
    const ctrlX = midX;
    const ctrlY = midY;

    return { p1x, p1y, p2x, p2y, ctrlX, ctrlY, ctrl1x, ctrl1y, ctrl2x, ctrl2y, style };
}

/**
 * Find arrow near a given point
 */
function findArrowNearPoint(mouseX, mouseY) {
    if (!document_wave) return -1;
    const arrows = document_wave.arrowList();
    const signals = document_wave.signalList();
    if (!arrows || !arrows.length) return -1;

    // Use globalSubSteps for hit testing (arrows use global coordinates)
    const globalSubSteps = document_wave.subStepCount();
    const divisor = globalSubSteps + 1;
    const subStepWidth = waveCellWidth / divisor;
    const rowHeight = 40;
    const signalStartY = 40;
    const nameWidth = getDynamicNameWidth();

    const threshold = Math.max(6, waveCellWidth * 0.3);
    const thresholdSq = threshold * threshold;

    let bestId = -1;
    let bestDistSq = thresholdSq;

    for (const arrow of arrows) {
        const curve = computeArrowCurve(arrow, signals, subStepWidth, rowHeight, signalStartY, nameWidth);
        if (!curve) continue;

        const style = curve.style || '~>';
        let minDistSq = Infinity;
        
        if (style.includes('|') && !style.includes('~')) {
            // Sharp lines - sample line segments
            const segments = getSharpLineSegments(curve.p1x, curve.p1y, curve.p2x, curve.p2y, style);
            for (const seg of segments) {
                const dist = pointToSegmentDistSq(mouseX, mouseY, seg.x1, seg.y1, seg.x2, seg.y2);
                if (dist < minDistSq) minDistSq = dist;
            }
        } else {
            // Sample the cubic bezier curve to approximate distance
            const steps = 16;
            for (let i = 0; i <= steps; i++) {
                const t = i / steps;
                const pt = cubicPoint(curve.p1x, curve.p1y, curve.ctrl1x, curve.ctrl1y, curve.ctrl2x, curve.ctrl2y, curve.p2x, curve.p2y, t);
                const dx = mouseX - pt.x;
                const dy = mouseY - pt.y;
                const d2 = dx * dx + dy * dy;
                if (d2 < minDistSq) minDistSq = d2;
            }
        }

        if (minDistSq < bestDistSq) {
            bestDistSq = minDistSq;
            bestId = arrow.id;
        }
    }

    return bestId;
}

/**
 * Draw arrow preview (during arrow creation)
 * Uses fractional positions (arrowStartPosition/arrowPreviewPosition)
 */
function drawArrowPreview(ctx, signals, subStepWidth, rowHeight, signalStartY, nameWidth) {
    if (!arrowHasStart || arrowPreviewSignal < 0 || arrowPreviewPosition < 0) return;
    
    console.log('Drawing arrow preview from', arrowStartSignal, arrowStartPosition, 'to', arrowPreviewSignal, arrowPreviewPosition);
    
    // Use skin arrow color with transparency for preview
    const baseColor = getThemeDefaultArrowColor();
    const previewColor = baseColor + '99'; // Add alpha to hex color (60% opacity)
    const arrowWidth = WAVEDROM_STYLE.arrowLineWidth;
    const arrowHeadSize = WAVEDROM_STYLE.arrowHeadSize;
    
    // Calculate preview arrow endpoints using fractional positions
    const p1x = positionToPixelX(arrowStartPosition);
    const p1y = signalStartY + arrowStartSignal * rowHeight + rowHeight / 2;
    const p2x = positionToPixelX(arrowPreviewPosition);
    const p2y = signalStartY + arrowPreviewSignal * rowHeight + rowHeight / 2;
    
    const dx = p2x - p1x;
    const dy = p2y - p1y;
    
    // WaveDrom style cubic bezier control points (~ spline)
    const ctrl1x = p1x + 0.7 * dx;
    const ctrl1y = p1y;
    const ctrl2x = p1x + 0.3 * dx;
    const ctrl2y = p2y;
    
    ctx.save();
    ctx.strokeStyle = previewColor;
    ctx.fillStyle = previewColor;
    ctx.lineWidth = arrowWidth;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.setLineDash([5, 5]);
    
    // Draw cubic bezier curve (WaveDrom ~ style)
    ctx.beginPath();
    ctx.moveTo(p1x, p1y);
    ctx.bezierCurveTo(ctrl1x, ctrl1y, ctrl2x, ctrl2y, p2x, p2y);
    ctx.stroke();
    ctx.setLineDash([]);
    
    // Calculate tangent at endpoint for arrowhead
    const tangentX = p2x - ctrl2x;
    const tangentY = p2y - ctrl2y;
    const len = Math.sqrt(tangentX * tangentX + tangentY * tangentY);
    const angle = Math.atan2(tangentY / len, tangentX / len);
    
    // Draw arrowhead
    const arrowP1x = p2x - Math.cos(angle - 0.4) * arrowHeadSize;
    const arrowP1y = p2y - Math.sin(angle - 0.4) * arrowHeadSize;
    const arrowP2x = p2x - Math.cos(angle + 0.4) * arrowHeadSize;
    const arrowP2y = p2y - Math.sin(angle + 0.4) * arrowHeadSize;
    
    ctx.beginPath();
    ctx.moveTo(p2x, p2y);
    ctx.lineTo(arrowP1x, arrowP1y);
    ctx.lineTo(arrowP2x, arrowP2y);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
}

/**
 * Draw all arrows
 */
function drawArrows(ctx, signals, subStepWidth, rowHeight, signalStartY, nameWidth) {
    const arrows = document_wave.arrowList();
    if (!arrows || arrows.length === 0) return;
    
    const defaultArrowColor = getThemeDefaultArrowColor();
    const arrowWidth = WAVEDROM_STYLE.arrowLineWidth;
    const arrowHeadSize = WAVEDROM_STYLE.arrowHeadSize;
    
    for (const arrow of arrows) {
        // Skip invalid arrows
        if (arrow.startSignal < 0 || arrow.startSignal >= signals.length) continue;
        if (arrow.endSignal < 0 || arrow.endSignal >= signals.length) continue;
        
        // Use custom color if set, otherwise use skin default
        const color = arrow.color || defaultArrowColor;
        
        // Calculate arrow endpoints using fractional positions
        const p1x = positionToPixelX(arrow.startPosition);
        const p1y = signalStartY + arrow.startSignal * rowHeight + rowHeight / 2;
        const p2x = positionToPixelX(arrow.endPosition);
        const p2y = signalStartY + arrow.endSignal * rowHeight + rowHeight / 2;
        
        const dx = p2x - p1x;
        const dy = p2y - p1y;
        
        // Get arrow style (WaveDrom edge shape)
        const style = arrow.style || '~>';
        
        ctx.save();
        ctx.strokeStyle = color;
        ctx.lineWidth = arrowWidth;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.fillStyle = color;
        
        // Draw the path based on style
        ctx.beginPath();
        ctx.moveTo(p1x, p1y);
        
        // Determine path shape based on WaveDrom style
        if (style.includes('~') && !style.includes('|')) {
            // Spline curve
            if (style === '-~' || style === '-~>') {
                const c1x = p1x + 0.7 * dx;
                const c1y = p1y;
                const c2x = p1x + dx;
                const c2y = p2y;
                ctx.bezierCurveTo(c1x, c1y, c2x, c2y, p2x, p2y);
            } else if (style === '~-' || style === '~->') {
                const c1x = p1x;
                const c1y = p1y;
                const c2x = p1x + 0.3 * dx;
                const c2y = p2y;
                ctx.bezierCurveTo(c1x, c1y, c2x, c2y, p2x, p2y);
            } else {
                const c1x = p1x + 0.7 * dx;
                const c1y = p1y;
                const c2x = p1x + 0.3 * dx;
                const c2y = p2y;
                ctx.bezierCurveTo(c1x, c1y, c2x, c2y, p2x, p2y);
            }
        } else if (style.includes('|')) {
            // Sharp lines
            if (style.includes('-|-') || style === '<-|->') {
                const midX = p1x + dx / 2;
                ctx.lineTo(midX, p1y);
                ctx.lineTo(midX, p2y);
                ctx.lineTo(p2x, p2y);
            } else if (style.startsWith('-|') || style === '<-|>') {
                ctx.lineTo(p2x, p1y);
                ctx.lineTo(p2x, p2y);
            } else if (style.startsWith('|-') || style.startsWith('|>')) {
                ctx.lineTo(p1x, p2y);
                ctx.lineTo(p2x, p2y);
            } else {
                ctx.lineTo(p2x, p1y);
                ctx.lineTo(p2x, p2y);
            }
        } else {
            // Straight line
            ctx.lineTo(p2x, p2y);
        }
        ctx.stroke();
        
        // Draw arrowheads based on style
        const hasEndArrow = style.includes('>') && !style.startsWith('<') || style.endsWith('>');
        const hasStartArrow = style.startsWith('<');
        
        if (hasEndArrow) {
            let endAngle;
            if (style.includes('|') && !style.includes('~')) {
                if (style.includes('-|-') || style === '<-|->') {
                    endAngle = 0;
                } else if (style.startsWith('-|') || style === '<-|>') {
                    endAngle = dy >= 0 ? Math.PI / 2 : -Math.PI / 2;
                } else {
                    endAngle = 0;
                }
            } else if (style.includes('~')) {
                const ctrl2x = style === '~-' || style === '~->' ? p1x + 0.3 * dx : p1x + 0.3 * dx;
                const ctrl2y = p2y;
                const tangentX = p2x - ctrl2x;
                const tangentY = p2y - ctrl2y;
                endAngle = Math.atan2(tangentY, tangentX);
            } else {
                endAngle = Math.atan2(dy, dx);
            }
            
            const arrowP1x = p2x - Math.cos(endAngle - 0.4) * arrowHeadSize;
            const arrowP1y = p2y - Math.sin(endAngle - 0.4) * arrowHeadSize;
            const arrowP2x = p2x - Math.cos(endAngle + 0.4) * arrowHeadSize;
            const arrowP2y = p2y - Math.sin(endAngle + 0.4) * arrowHeadSize;
            
            ctx.beginPath();
            ctx.moveTo(p2x, p2y);
            ctx.lineTo(arrowP1x, arrowP1y);
            ctx.lineTo(arrowP2x, arrowP2y);
            ctx.closePath();
            ctx.fill();
        }
        
        if (hasStartArrow) {
            let startAngle;
            if (style.includes('|') && !style.includes('~')) {
                if (style.includes('-|-') || style === '<-|->') {
                    startAngle = Math.PI;
                } else if (style.startsWith('<-|')) {
                    startAngle = Math.PI;
                } else if (style.startsWith('<|')) {
                    startAngle = dy >= 0 ? -Math.PI / 2 : Math.PI / 2;
                } else {
                    startAngle = Math.PI;
                }
            } else if (style.includes('~')) {
                const ctrl1x = p1x + 0.7 * dx;
                const ctrl1y = p1y;
                const tangentX = ctrl1x - p1x;
                const tangentY = ctrl1y - p1y;
                startAngle = Math.atan2(tangentY, tangentX);
            } else {
                startAngle = Math.atan2(dy, dx);
            }
            
            const arrowP1x = p1x + Math.cos(startAngle - 0.4) * arrowHeadSize;
            const arrowP1y = p1y + Math.sin(startAngle - 0.4) * arrowHeadSize;
            const arrowP2x = p1x + Math.cos(startAngle + 0.4) * arrowHeadSize;
            const arrowP2y = p1y + Math.sin(startAngle + 0.4) * arrowHeadSize;
            
            ctx.beginPath();
            ctx.moveTo(p1x, p1y);
            ctx.lineTo(arrowP1x, arrowP1y);
            ctx.lineTo(arrowP2x, arrowP2y);
            ctx.closePath();
            ctx.fill();
        }
        
        // Draw selection indicator if this arrow is selected
        if (typeof isObjectSelected === 'function' && 
            typeof SelectableType !== 'undefined' && 
            isObjectSelected(SelectableType.Arrow, arrow.id)) {
            ctx.strokeStyle = 'rgba(0, 191, 255, 0.5)';
            ctx.lineWidth = arrowWidth + 8;
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            ctx.setLineDash([]);
            
            // Redraw the path for selection highlight (follows the arrow shape)
            ctx.beginPath();
            ctx.moveTo(p1x, p1y);
            
            if (style.includes('~') && !style.includes('|')) {
                if (style === '-~' || style === '-~>') {
                    const c1x = p1x + 0.7 * dx;
                    const c1y = p1y;
                    const c2x = p1x + dx;
                    const c2y = p2y;
                    ctx.bezierCurveTo(c1x, c1y, c2x, c2y, p2x, p2y);
                } else if (style === '~-' || style === '~->') {
                    const c1x = p1x;
                    const c1y = p1y;
                    const c2x = p1x + 0.3 * dx;
                    const c2y = p2y;
                    ctx.bezierCurveTo(c1x, c1y, c2x, c2y, p2x, p2y);
                } else {
                    const c1x = p1x + 0.7 * dx;
                    const c1y = p1y;
                    const c2x = p1x + 0.3 * dx;
                    const c2y = p2y;
                    ctx.bezierCurveTo(c1x, c1y, c2x, c2y, p2x, p2y);
                }
            } else if (style.includes('|')) {
                if (style.includes('-|-') || style === '<-|->') {
                    const midX = p1x + dx / 2;
                    ctx.lineTo(midX, p1y);
                    ctx.lineTo(midX, p2y);
                    ctx.lineTo(p2x, p2y);
                } else if (style.startsWith('-|') || style === '<-|>') {
                    ctx.lineTo(p2x, p1y);
                    ctx.lineTo(p2x, p2y);
                } else if (style.startsWith('|-') || style.startsWith('|>')) {
                    ctx.lineTo(p1x, p2y);
                    ctx.lineTo(p2x, p2y);
                } else {
                    ctx.lineTo(p2x, p1y);
                    ctx.lineTo(p2x, p2y);
                }
            } else {
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
    module.exports = { computeArrowCurve, findArrowNearPoint, drawArrowPreview, drawArrows };
}
