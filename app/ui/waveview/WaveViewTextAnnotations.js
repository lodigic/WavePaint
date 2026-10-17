// WaveViewTextAnnotations.js - Text annotation drawing

/**
 * Draw all text annotations
 * Text annotations use fractional positions (like markers/time jumps)
 */
function drawTextAnnotations(ctx, signals, subStepWidth, rowHeight, signalStartY, nameWidth) {
    if (!document_wave) return;
    const annotations = document_wave.textAnnotationList();
    if (!annotations || !annotations.length) return;

    const arrows = document_wave.arrowList();
    const defaultColor = getComputedStyle(document.body).getPropertyValue('--canvas-text').trim() || '#000000';

    for (const ann of annotations) {
        let x = 0;
        let y = 0;
        let valid = false;

        if (ann.anchorType === 'Arrow') {
            const arrow = arrows.find(a => a.id === ann.anchorId);
            if (arrow) {
                const curve = computeArrowCurve(arrow, signals, subStepWidth, rowHeight, signalStartY, nameWidth);
                if (curve) {
                    const mid = cubicPoint(curve.p1x, curve.p1y, curve.ctrl1x, curve.ctrl1y, curve.ctrl2x, curve.ctrl2y, curve.p2x, curve.p2y, 0.5);
                    x = mid.x;
                    y = mid.y;
                    valid = true;
                }
            }
        } else if (ann.anchorType === 'Signal' || ann.anchorType === 'BlankRow') {
            if (ann.anchorId >= 0 && ann.anchorId < signals.length) {
                const rowTop = signalStartY + ann.anchorId * rowHeight;
                const rowCenter = rowTop + rowHeight / 2;
                const vPos = ann.anchorType === 'BlankRow' ? 'Center' : (ann.vPos || 'Above');
                
                // Use positionToPixelX for fractional position
                x = positionToPixelX(ann.position);

                if (vPos === 'Above') {
                    y = rowTop + 2;
                } else if (vPos === 'Below') {
                    y = rowTop + rowHeight - 2;
                } else {
                    y = rowCenter;
                }
                valid = true;
            }
        }

        if (!valid) continue;

        const fontSize = ann.fontSize && ann.fontSize > 0 ? ann.fontSize : WAVEDROM_STYLE.labelFontSize;
        ctx.save();
        ctx.font = `${ann.bold ? 'bold ' : ''}${fontSize}px Arial`;
        const metrics = ctx.measureText(ann.text || '');
        const textWidth = metrics.width;
        const textHeight = fontSize;

        // Calculate text position - centered like WaveDrom
        const textX = x;
        let textY = y;

        if (ann.anchorType === 'Arrow') {
            // Centered on arrow midpoint
        } else {
            const vPos = ann.anchorType === 'BlankRow' ? 'Center' : (ann.vPos || 'Above');
            if (vPos === 'Above') {
                textY = y + fontSize / 2;
            } else if (vPos === 'Below') {
                textY = y - fontSize / 2;
            }
        }

        // Draw background if set
        if (ann.backgroundColor) {
            const padding = 3;
            const bgX = textX - textWidth / 2 - padding;
            const bgY = textY - textHeight / 2 - padding;
            const bgW = textWidth + padding * 2;
            const bgH = textHeight + padding * 2;
            ctx.fillStyle = ann.backgroundColor;
            ctx.fillRect(bgX, bgY, bgW, bgH);
        }

        // Draw text centered
        ctx.fillStyle = ann.color || defaultColor;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(ann.text || '', textX, textY);
        
        // Draw selection indicator if this text annotation is selected (rounded rectangle around text)
        if (typeof isObjectSelected === 'function' && 
            typeof SelectableType !== 'undefined' && 
            isObjectSelected(SelectableType.TextAnnotation, ann.id)) {
            ctx.fillStyle = 'rgba(0, 191, 255, 0.25)';
            ctx.strokeStyle = 'rgba(0, 191, 255, 0.6)';
            ctx.lineWidth = 2;
            ctx.setLineDash([]);
            const halfWidth = textWidth / 2 + 6;
            const halfHeight = textHeight / 2 + 4;
            const rx = textX - halfWidth;
            const ry = textY - halfHeight;
            const rw = halfWidth * 2;
            const rh = halfHeight * 2;
            const radius = 4;
            
            // Draw rounded rectangle with fill
            ctx.beginPath();
            ctx.moveTo(rx + radius, ry);
            ctx.lineTo(rx + rw - radius, ry);
            ctx.quadraticCurveTo(rx + rw, ry, rx + rw, ry + radius);
            ctx.lineTo(rx + rw, ry + rh - radius);
            ctx.quadraticCurveTo(rx + rw, ry + rh, rx + rw - radius, ry + rh);
            ctx.lineTo(rx + radius, ry + rh);
            ctx.quadraticCurveTo(rx, ry + rh, rx, ry + rh - radius);
            ctx.lineTo(rx, ry + radius);
            ctx.quadraticCurveTo(rx, ry, rx + radius, ry);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
            ctx.setLineDash([]);
        }
        
        ctx.restore();
    }
}

/**
 * Draw text annotation preview (during text placement)
 */
function drawTextAnnotationPreview(ctx, signals, subStepWidth, rowHeight, signalStartY, nameWidth) {
    if (currentTool !== 'text') return;

    const previewText = 'Text';
    const previewColor = getThemeDefaultArrowColor();

    let x = 0;
    let y = 0;
    let valid = false;

    if (textAnnotationPreviewArrow >= 0) {
        const arrows = document_wave ? document_wave.arrowList() : [];
        const arrow = arrows.find(a => a.id === textAnnotationPreviewArrow);
        if (arrow) {
            const curve = computeArrowCurve(arrow, signals, subStepWidth, rowHeight, signalStartY, nameWidth);
            if (curve) {
                const mid = cubicPoint(curve.p1x, curve.p1y, curve.ctrl1x, curve.ctrl1y, curve.ctrl2x, curve.ctrl2y, curve.p2x, curve.p2y, 0.5);
                x = mid.x;
                y = mid.y;
                valid = true;
            }
        }
    } else if (textAnnotationPreviewSignal >= 0 && textAnnotationPreviewPosition >= 0) {
        if (textAnnotationPreviewSignal < signals.length) {
            const rowTop = signalStartY + textAnnotationPreviewSignal * rowHeight;
            const rowCenter = rowTop + rowHeight / 2;
            const vPos = (signals[textAnnotationPreviewSignal].type === SignalType.BlankRow) ? 'Center' : textAnnotationPreviewVPos;
            x = positionToPixelX(textAnnotationPreviewPosition);
            if (vPos === 'Above') {
                y = rowTop + 2;
            } else if (vPos === 'Below') {
                y = rowTop + rowHeight - 2;
            } else {
                y = rowCenter;
            }
            valid = true;
        }
    }

    if (!valid) return;

    ctx.save();
    ctx.globalAlpha = 0.7;
    ctx.font = '12px Arial';
    const metrics = ctx.measureText(previewText);
    const ascent = metrics.actualBoundingBoxAscent || 12;
    const descent = metrics.actualBoundingBoxDescent || 3;
    const textWidth = metrics.width;
    const textHeight = ascent + descent;

    let textX = x - textWidth / 2;
    let textY = y;

    if (textAnnotationPreviewArrow >= 0) {
        textY = y + ascent / 2;
    } else {
        const vPos = (textAnnotationPreviewSignal >= 0 && signals[textAnnotationPreviewSignal].type === SignalType.BlankRow)
            ? 'Center'
            : textAnnotationPreviewVPos;
        if (vPos === 'Above') {
            textY = y + ascent;
        } else if (vPos === 'Center') {
            textY = y + ascent / 2;
        } else {
            textY = y - descent;
        }
    }

    // Draw subtle background and anchor marker
    ctx.fillStyle = 'rgba(0,0,0,0.15)';
    ctx.fillRect(textX - 3, textY - ascent - 2, textWidth + 6, textHeight + 4);

    ctx.strokeStyle = previewColor;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(x, y, 3, 0, Math.PI * 2);
    ctx.stroke();

    ctx.fillStyle = previewColor;
    ctx.fillText(previewText, textX, textY);
    ctx.restore();
}

// Export for module use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { drawTextAnnotations, drawTextAnnotationPreview };
}
