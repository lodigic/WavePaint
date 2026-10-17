// WaveViewGrid.js - Grid and axis drawing functions

/**
 * Draw vertical grid lines (main and substep)
 */
function drawVerticalGrid(ctx, sampleCount, mainCellWidth, divisor, subStepWidth, nameWidth, signalStartY, canvasHeight, gridColor) {
    ctx.strokeStyle = gridColor || '#c0c0c0';
    ctx.lineWidth = 1;
    
    for (let t = 0; t <= sampleCount; t++) {
        const x = nameWidth + t * mainCellWidth;
        ctx.globalAlpha = 1;
        ctx.beginPath();
        ctx.moveTo(x, signalStartY);
        ctx.lineTo(x, canvasHeight);
        ctx.stroke();

        if (divisor > 1) {
            ctx.save();
            ctx.strokeStyle = 'rgba(120,120,120,0.35)';
            ctx.lineWidth = 0.7;
            ctx.setLineDash([2, 6]);
            for (let j = 1; j < divisor; j++) {
                const subX = x + j * subStepWidth;
                ctx.beginPath();
                ctx.moveTo(subX, signalStartY);
                ctx.lineTo(subX, canvasHeight);
                ctx.stroke();
            }
            ctx.setLineDash([]);
            ctx.restore();
        }
    }
    ctx.globalAlpha = 1;
}

/**
 * Draw substep grid lines for a single signal row
 * Used when a signal has per-signal substeps
 */
function drawSignalSubstepGrid(ctx, sampleCount, mainCellWidth, divisor, subStepWidth, nameWidth, rowTop, rowBottom) {
    if (divisor <= 1) return;
    
    ctx.save();
    ctx.strokeStyle = 'rgba(120,120,120,0.35)';
    ctx.lineWidth = 0.7;
    ctx.setLineDash([2, 6]);
    
    for (let t = 0; t < sampleCount; t++) {
        const baseX = nameWidth + t * mainCellWidth;
        for (let j = 1; j < divisor; j++) {
            const subX = baseX + j * subStepWidth;
            ctx.beginPath();
            ctx.moveTo(subX, rowTop);
            ctx.lineTo(subX, rowBottom);
            ctx.stroke();
        }
    }
    
    ctx.setLineDash([]);
    ctx.restore();
}

/**
 * Draw time axis (when enabled)
 */
function drawTimeAxis(ctx, sampleCount, mainCellWidth, divisor, nameWidth, canvasWidth, timePerStep, timeUnitString) {
    const style = getComputedStyle(document.body);
    // On export the axis band must blend with the canvas background instead of
    // using the UI theme band, which showed up as a dark strip in saved images
    // (issue #4)
    const exportMode = typeof window !== 'undefined' && window._wpExportMode === true;
    const timeAxisBg = style.getPropertyValue('--timeaxis-bg').trim() || '#2a2a2e';
    const timeAxisText = exportMode
        ? (style.getPropertyValue('--canvas-text').trim() || '#333333')
        : (style.getPropertyValue('--timeaxis-text').trim() || '#e0e0e0');
    const timeAxisTick = style.getPropertyValue('--timeaxis-tick').trim() || '#888888';

    const fmHeight = 14;
    const timeAxisHeight = fmHeight + 8;

    // Draw background
    ctx.save();
    if (!exportMode) {
        ctx.fillStyle = timeAxisBg;
        ctx.fillRect(0, 0, canvasWidth, timeAxisHeight);
    }

    // Draw bottom border
    ctx.strokeStyle = exportMode
        ? (style.getPropertyValue('--canvas-grid').trim() || '#e0e0e0')
        : (style.getPropertyValue('--border-color').trim() || '#3a3a3f');
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, timeAxisHeight);
    ctx.lineTo(canvasWidth, timeAxisHeight);
    ctx.stroke();
    ctx.restore();

    ctx.fillStyle = timeAxisText;
    ctx.font = '12px Arial';

    // Calculate time label step to avoid overlap
    const maxTime = (sampleCount - 1) * timePerStep;
    const maxTimeLabel = (Number.isInteger(maxTime) ? String(maxTime) : maxTime.toPrecision(4)) + ' ' + timeUnitString;
    const maxTimeLabelWidth = ctx.measureText(maxTimeLabel).width + 20;

    let timeLabelStep = 1;
    if (mainCellWidth > 0 && mainCellWidth < maxTimeLabelWidth) {
        const minStep = Math.ceil(maxTimeLabelWidth / mainCellWidth);
        const niceSteps = [1,2,5,10,20,25,50,100,200,250,500,1000,2000,2500,5000,10000];
        timeLabelStep = niceSteps.find(ns => ns >= minStep) || Math.ceil(minStep/10000)*10000;
    }

    // Draw time labels and record ranges
    const labelRanges = [];
    ctx.fillStyle = timeAxisText;
    for (let t = 0; t < sampleCount; t += timeLabelStep) {
        const x = nameWidth + t * mainCellWidth;
        const timeValue = t * timePerStep;
        const label = Number.isInteger(timeValue) ? String(timeValue) + ' ' + timeUnitString
                                               : String(Number.parseFloat(timeValue.toPrecision(4))) + ' ' + timeUnitString;
        const labelW = ctx.measureText(label).width;
        let textX = x - labelW / 2;
        textX = Math.max(nameWidth, textX);
        textX = Math.min(canvasWidth - labelW - 2, textX);
        const textY = Math.floor(timeAxisHeight / 2) + 4;
        ctx.fillText(label, textX, textY);
        labelRanges.push([textX - 3, textX + labelW + 3]);
    }

    // Draw main ticks
    ctx.strokeStyle = timeAxisTick;
    ctx.lineWidth = 1;
    for (let t = 0; t <= sampleCount; ++t) {
        const x = nameWidth + t * mainCellWidth;
        let overlaps = false;
        for (const r of labelRanges) {
            if (x >= r[0] && x <= r[1]) { overlaps = true; break; }
        }
        if (!overlaps) {
            ctx.beginPath(); 
            ctx.moveTo(x, timeAxisHeight - 10); 
            ctx.lineTo(x, timeAxisHeight); 
            ctx.stroke();
        }
    }

    // Draw substep ticks
    if (divisor > 1) {
        ctx.save();
        ctx.strokeStyle = timeAxisTick;
        ctx.globalAlpha = 0.6;
        ctx.lineWidth = 0.7;
        ctx.setLineDash([2,6]);
        const subStepWidth = mainCellWidth / divisor;
        for (let t = 0; t < sampleCount; ++t) {
            const baseX = nameWidth + t * mainCellWidth;
            for (let sub = 1; sub < divisor; ++sub) {
                const x = baseX + Math.round(sub * subStepWidth);
                let overlaps = false;
                for (const r of labelRanges) {
                    if (x >= r[0] && x <= r[1]) { overlaps = true; break; }
                }
                if (!overlaps) {
                    ctx.beginPath(); 
                    ctx.moveTo(x, timeAxisHeight - 5); 
                    ctx.lineTo(x, timeAxisHeight); 
                    ctx.stroke();
                }
            }
        }
        ctx.setLineDash([]);
        ctx.restore();
    }
    
    return timeAxisHeight;
}

/**
 * Draw step numbers (when time axis is not enabled)
 */
function drawStepNumbers(ctx, signals, sampleCount, mainCellWidth, divisor, nameWidth, signalStartY, canvasWidth, rowHeight) {
    ctx.fillStyle = getComputedStyle(document.body).getPropertyValue('--canvas-text').trim() || '#000';
    ctx.font = '12px Arial';
    const fmHeight = 14;

    const maxLabel = String(sampleCount - 1);
    const maxLabelWidth = ctx.measureText(maxLabel).width + 10;

    let labelStep = 1;
    if (mainCellWidth > 0 && mainCellWidth < maxLabelWidth) {
        const minStep = Math.ceil(maxLabelWidth / mainCellWidth);
        const niceSteps = [1,2,5,10,20,25,50,100,200,250,500,1000,2000,2500,5000,10000];
        labelStep = niceSteps.find(ns => ns >= minStep) || Math.ceil(minStep/10000)*10000;
    }

    // Helper functions for collision detection
    function rectLineOverlap(rect, x1, y1, x2, y2) {
        const left = Math.min(x1, x2), right = Math.max(x1, x2);
        const top = Math.min(y1, y2), bottom = Math.max(y1, y2);
        if (rect.x > right || rect.x + rect.w < left) return false;
        if (rect.y > bottom || rect.y + rect.h < top) return false;
        return true;
    }

    function textOverlapsAnySignal(textRect, t, signals, rowHeight, signalStartY, nameWidth, mainCellWidth, divisor) {
        for (let sigIdx = 0; sigIdx < signals.length; ++sigIdx) {
            const sig = signals[sigIdx];
            const top = sigIdx * rowHeight + signalStartY;
            const rh = rowHeight;
            const highY = top + rh * 0.25;
            const lowY = top + rh * 0.75;
            const centerY = top + rh / 2;

            if (sig.type === SignalType.Bit) {
                const idx = t * divisor;
                if (idx < 0 || idx >= sig.values.length) continue;
                const v = sig.values[idx];
                if (v >= 0 && v <= 1) {
                    const x0 = nameWidth + t * mainCellWidth;
                    const x1 = nameWidth + (t+1) * mainCellWidth;
                    if (rectLineOverlap(textRect, x0, v===1?highY:lowY, x1, v===1?highY:lowY)) return true;
                    const prevIdx = idx - divisor;
                    if (prevIdx >= 0 && prevIdx < sig.values.length) {
                        const pv = sig.values[prevIdx];
                        if (pv >=0 && pv <=1 && pv !== v) {
                            const prevY = pv===1?highY:lowY;
                            if (rectLineOverlap(textRect, x0, prevY, x0, v===1?highY:lowY)) return true;
                        }
                    }
                }
            }

            if (sig.type === SignalType.Vector) {
                const x0 = nameWidth + t * mainCellWidth;
                const x1 = nameWidth + (t+1) * mainCellWidth;
                if (rectLineOverlap(textRect, x0, centerY, x1, centerY)) return true;
            }
        }
        return false;
    }

    for (let t = 0; t < sampleCount; t += labelStep) {
        const x = nameWidth + t * mainCellWidth;
        const label = String(t);
        const labelW = ctx.measureText(label).width;
        const labelH = fmHeight;
        let textX = x - labelW / 2;
        textX = Math.max(2, textX);
        textX = Math.min(canvasWidth - labelW - 2, textX);
        let yText = signalStartY - fmHeight;
        const textRect = { x: textX, y: yText - 12, w: labelW, h: labelH };

        let maxTries = 3, tryCount = 0;
        while (textOverlapsAnySignal(textRect, t, signals, rowHeight, signalStartY, nameWidth, mainCellWidth, divisor) && tryCount < maxTries) {
            yText -= (labelH + 2);
            textRect.y = yText - 12;
            ++tryCount;
        }
        if (textOverlapsAnySignal(textRect, t, signals, rowHeight, signalStartY, nameWidth, mainCellWidth, divisor)) {
            yText = signalStartY - fmHeight;
            textRect.y = yText - 12;
            tryCount = 0;
            while (textOverlapsAnySignal(textRect, t, signals, rowHeight, signalStartY, nameWidth, mainCellWidth, divisor) && tryCount < maxTries) {
                yText += (labelH + 2);
                textRect.y = yText - 12;
                ++tryCount;
            }
        }
        ctx.fillStyle = getComputedStyle(document.body).getPropertyValue('--canvas-text').trim() || '#000';
        ctx.fillText(label, textX, yText);
    }
}

// Export for module use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { drawVerticalGrid, drawTimeAxis, drawStepNumbers };
}
