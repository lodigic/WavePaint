// WaveViewSignals.js - Signal drawing functions (bit and vector signals)

// WaveValue constants for special bit states
const BitWaveValue = {
    LOW: 0,
    HIGH: 1,
    UNDEFINED: -1,  // x
    HIGHZ: 2,       // z
    PULLUP: 3,      // u
    PULLDOWN: 4     // d
};

/**
 * Get Y coordinate for a bit value
 */
function getBitYForValue(v, highY, lowY, centerY) {
    if (v === BitWaveValue.LOW || v === BitWaveValue.PULLDOWN) return lowY;
    if (v === BitWaveValue.HIGH || v === BitWaveValue.PULLUP) return highY;
    return centerY; // UNDEFINED, HIGHZ
}

/**
 * Draw a bit signal waveform
 * Handles: 0 (low), 1 (high), -1 (undefined/x), 2 (high-z), 3 (pull-up), 4 (pull-down)
 * All states use signal color with smooth transitions between them
 * @param {number} maxSubSteps - Maximum substeps in the document (for array step size)
 */
function drawBitSignal(ctx, signal, index, rowHeight, signalStartY, nameWidth, subStepWidth, effectiveCount, maxSubSteps) {
    const y = index * rowHeight + signalStartY;
    const values = signal.values;
    
    const highY = y + rowHeight * 0.25;
    const lowY = y + rowHeight * 0.75;
    const centerY = y + rowHeight * 0.5;

    // Use signal's rise/fall time, respecting edge arrow setting
    const hasEdgeArrow = signal.edgeArrow && signal.edgeArrow !== 'none';
    const risePixels = hasEdgeArrow ? 0 : (signal.riseTime * subStepWidth);
    const fallPixels = hasEdgeArrow ? 0 : (signal.fallTime * subStepWidth);

    const signalColor = signal.color || getThemeDefaultSignalColor();
    const rowEndX = nameWidth + effectiveCount * subStepWidth;
    
    // ALL signals use maxSubSteps - direct mapping from visual position to array index
    const getArrayIndex = (t) => t;

    // === Pass 1: Draw solid lines for LOW (0), HIGH (1), HIGHZ (2) ===
    // Use a single continuous path to avoid line overlap at join points
    ctx.strokeStyle = signalColor;
    ctx.lineWidth = 2;
    ctx.lineCap = 'square';
    ctx.lineJoin = 'miter';
    ctx.setLineDash([]);
    ctx.beginPath();

    let inPath = false;
    let lastX = null;
    let lastY = null;

    for (let t = 0; t < effectiveCount; t++) {
        const arrayIdx = getArrayIndex(t);
        const v = values[arrayIdx];
        
        // Skip undefined (drawn separately with hatching) and pull states (dashed)
        if (v === BitWaveValue.UNDEFINED || v === BitWaveValue.PULLUP || v === BitWaveValue.PULLDOWN) {
            inPath = false;
            lastX = null;
            lastY = null;
            continue;
        }
        if (v !== BitWaveValue.LOW && v !== BitWaveValue.HIGH && v !== BitWaveValue.HIGHZ) {
            inPath = false;
            lastX = null;
            lastY = null;
            continue;
        }

        const x0 = nameWidth + t * subStepWidth;
        const x1 = nameWidth + (t + 1) * subStepWidth;
        const yLevel = getBitYForValue(v, highY, lowY, centerY);
        
        // Get previous value for transition (0, 1, 2, PULLUP, PULLDOWN)
        let prevV = null;
        if (t > 0) {
            const prevArrayIdx = getArrayIndex(t - 1);
            const pv = values[prevArrayIdx];
            if (pv === BitWaveValue.LOW || pv === BitWaveValue.HIGH || pv === BitWaveValue.HIGHZ ||
                pv === BitWaveValue.PULLUP || pv === BitWaveValue.PULLDOWN) {
                prevV = pv;
            }
        }

        // Check if we need to draw a transition (including from pull states)
        const needsTransition = prevV !== null && prevV !== v;
        
        if (needsTransition) {
            // Transition from previous value
            const prevY = getBitYForValue(prevV, highY, lowY, centerY);
            const goingUp = yLevel < prevY;
            const slopeWidth = goingUp ? risePixels : fallPixels;
            const transitionEndX = Math.min(x0 + slopeWidth, x1);

            // Draw the transition line (solid)
            ctx.moveTo(x0, prevY);
            ctx.lineTo(transitionEndX, yLevel);
            lastX = transitionEndX;
            lastY = yLevel;
            inPath = true;

            // Continue horizontal to end of sample
            if (transitionEndX < x1) {
                ctx.lineTo(x1, yLevel);
                lastX = x1;
            }
        } else if (!inPath) {
            // Start a new path segment (no transition)
            ctx.moveTo(x0, yLevel);
            ctx.lineTo(x1, yLevel);
            lastX = x1;
            lastY = yLevel;
            inPath = true;
        } else {
            // No transition, continue horizontal line
            if (lastY !== yLevel) {
                ctx.moveTo(x0, yLevel);
                lastX = x0;
                lastY = yLevel;
            }
            ctx.lineTo(x1, yLevel);
            lastX = x1;
            lastY = yLevel;
        }
    }
    ctx.stroke();

    // === Pass 2: Draw dashed lines for PULLUP (3) and PULLDOWN (4) ===
    // Each sample is drawn individually, accounting for transitions
    ctx.strokeStyle = signalColor;
    ctx.lineWidth = 2;
    ctx.setLineDash([2, 4]); // More pronounced dashing

    for (let t = 0; t < effectiveCount; t++) {
        const arrayIdx = getArrayIndex(t);
        const v = values[arrayIdx];
        if (v !== BitWaveValue.PULLUP && v !== BitWaveValue.PULLDOWN) continue;

        const x0 = nameWidth + t * subStepWidth;
        const x1 = nameWidth + (t + 1) * subStepWidth;
        const yLevel = getBitYForValue(v, highY, lowY, centerY);
        
        // Check previous state for entry transition
        const prevArrayIdx = t > 0 ? getArrayIndex(t - 1) : -1;
        const prevV = (t > 0) ? values[prevArrayIdx] : null;
        // Draw entry transition from any state except UNDEFINED and same state
        const needsEntryTransition = prevV !== null && prevV !== v && prevV !== BitWaveValue.UNDEFINED;
        
        // Calculate entry transition width
        let drawStartX = x0;
        let prevY = centerY;
        if (needsEntryTransition) {
            prevY = getBitYForValue(prevV, highY, lowY, centerY);
            const goingUp = yLevel < prevY;
            const slopeWidth = goingUp ? risePixels : fallPixels;
            const entryTransitionEndX = Math.min(x0 + slopeWidth, x1);
            drawStartX = entryTransitionEndX;
        }

        // Draw dashed path
        ctx.setLineDash([2, 4]);
        ctx.beginPath();

        if (needsEntryTransition) {
            ctx.moveTo(x0, prevY);
            ctx.lineTo(drawStartX, yLevel);
        } else {
            ctx.moveTo(x0, yLevel);
        }

        // Horizontal dashed line to end of sample
        ctx.lineTo(x1, yLevel);

        ctx.stroke();
    }

    ctx.setLineDash([]);

    // === Pass 3: Draw UNDEFINED (-1) as hatched box ===
    // Group consecutive UNDEFINED samples to avoid internal lines
    ctx.strokeStyle = signalColor;
    ctx.lineWidth = 2;
    ctx.setLineDash([]);

    let t = 0;
    while (t < effectiveCount) {
        const arrayIdx = getArrayIndex(t);
        if (values[arrayIdx] !== BitWaveValue.UNDEFINED) {
            t++;
            continue;
        }
        
        // Find the end of consecutive UNDEFINED samples
        let start = t;
        let end = t;
        while (end + 1 < effectiveCount && values[getArrayIndex(end + 1)] === BitWaveValue.UNDEFINED) {
            end++;
        }

        const x0 = nameWidth + start * subStepWidth;
        const x1 = nameWidth + (end + 1) * subStepWidth;
        
        // Check for entry/exit transitions
        const prevArrayIdx = start > 0 ? getArrayIndex(start - 1) : -1;
        const nextArrayIdx = end + 1 < effectiveCount ? getArrayIndex(end + 1) : -1;
        const prevV = (start > 0) ? values[prevArrayIdx] : null;
        const nextV = (end < effectiveCount - 1) ? values[nextArrayIdx] : null;
        const needsEntryTransition = prevV !== null && prevV !== BitWaveValue.UNDEFINED;
        const needsExitTransition = nextV !== null && nextV !== BitWaveValue.UNDEFINED;
        
        // Calculate transition points
        let leftPeakX = x0;
        let leftPeakY = null;
        let rightPeakX = x1;
        let rightPeakY = null;
        let boxStartX = x0;
        let boxEndX = x1;
        
        if (needsEntryTransition) {
            const prevY = getBitYForValue(prevV, highY, lowY, centerY);
            leftPeakY = prevY;
            const goingUp = highY < prevY;
            const slopeWidth = goingUp ? risePixels : fallPixels;
            boxStartX = Math.min(x0 + slopeWidth, x1);
        }
        
        if (needsExitTransition) {
            const nextY = getBitYForValue(nextV, highY, lowY, centerY);
            rightPeakY = nextY;
            const goingDown = nextY > highY;
            const slopeWidth = goingDown ? fallPixels : risePixels;
            boxEndX = Math.max(x1 - slopeWidth, boxStartX);
        }
        
        // Draw the outline
        ctx.beginPath();
        if (leftPeakY !== null) {
            ctx.moveTo(leftPeakX, leftPeakY);
            ctx.lineTo(boxStartX, highY);
        } else {
            ctx.moveTo(boxStartX, highY);
        }
        
        ctx.lineTo(boxEndX, highY);
        
        if (rightPeakY !== null) {
            ctx.lineTo(rightPeakX, rightPeakY);
            ctx.lineTo(boxEndX, lowY);
        } else {
            ctx.lineTo(boxEndX, lowY);
        }
        
        ctx.lineTo(boxStartX, lowY);
        
        if (leftPeakY !== null) {
            ctx.lineTo(leftPeakX, leftPeakY);
        } else {
            ctx.lineTo(boxStartX, highY);
        }
        ctx.stroke();
        
        // Build polygon for hatching (clockwise)
        const polygon = [];
        if (leftPeakY !== null) {
            polygon.push({ x: leftPeakX, y: leftPeakY });
        }
        polygon.push({ x: boxStartX, y: highY });
        polygon.push({ x: boxEndX, y: highY });
        if (rightPeakY !== null) {
            polygon.push({ x: rightPeakX, y: rightPeakY });
        }
        polygon.push({ x: boxEndX, y: lowY });
        polygon.push({ x: boxStartX, y: lowY });
        if (leftPeakY !== null) {
            polygon.push({ x: leftPeakX, y: leftPeakY });
        }
        
        // Draw hatching using polygon clipping (same as vector hatching)
        ctx.lineWidth = 1;
        ctx.strokeStyle = '#000000'; // Always black for hatching
        
        const hatchSpacing = 6;
        const diagSpacing = hatchSpacing * Math.SQRT2;
        
        // Calculate bounding box for the polygon
        const minX = leftPeakY !== null ? leftPeakX : boxStartX;
        const maxX = rightPeakY !== null ? rightPeakX : boxEndX;
        const minY = highY;
        const maxY = lowY;
        
        // Calculate c range (y-intercept for line y = -x + c)
        const cMin = minX + minY;
        const cMax = maxX + maxY;
        const cStart = Math.floor(cMin / diagSpacing) * diagSpacing;
        const cEnd = Math.ceil(cMax / diagSpacing) * diagSpacing;
        
        ctx.beginPath();
        for (let c = cStart; c <= cEnd; c += diagSpacing) {
            // Line equation: y = -x + c
            const lineStart = { x: c - maxY, y: maxY };
            const lineEnd = { x: c - minY, y: minY };
            
            // Clip line against polygon
            const clipped = clipLineToPolygon(lineStart, lineEnd, polygon);
            
            if (clipped) {
                ctx.moveTo(clipped.start.x, clipped.start.y);
                ctx.lineTo(clipped.end.x, clipped.end.y);
            }
        }
        ctx.stroke();
        
        ctx.strokeStyle = signalColor; // Restore signal color
        ctx.lineWidth = 2;
        
        // Move past the grouped UNDEFINED samples
        t = end + 1;
    }

    // Reset
    ctx.setLineDash([]);

    // Draw edge arrows if enabled
    if (signal.edgeArrow && signal.edgeArrow !== 'none') {
        drawBitEdgeArrows(ctx, signal, values, effectiveCount, highY, lowY, nameWidth, subStepWidth, getArrayIndex);
    }
    
    // Draw clock markers (P/N style arrows from WaveDrom) if enabled
    // Clock markers are disabled when edgeArrow is active (rising/falling already shows arrows)
    const hasEdgeArrowActive = signal.edgeArrow && signal.edgeArrow !== 'none';
    if (!hasEdgeArrowActive && signal.showClockMarkers === true && signal.clockMarkers) {
        drawClockMarkers(ctx, signal, values, effectiveCount, highY, lowY, nameWidth, subStepWidth, getArrayIndex);
    }
}

/**
 * Draw edge arrows for bit signals (clock style)
 */
function drawBitEdgeArrows(ctx, signal, values, effectiveCount, highY, lowY, nameWidth, subStepWidth, getArrayIndex) {
    const arrowColor = signal.color || getThemeDefaultSignalColor();
    const isPositive = signal.edgeArrow === 'positive';
    
    const arrowHalfWidth = WAVEDROM_STYLE.clockArrowSize * 0.6;
    const arrowHeight = WAVEDROM_STYLE.clockArrowSize * 1.2;
    
    const arrowPositions = [];
    
    for (let t = 1; t < effectiveCount; t++) {
        const prevArrayIdx = getArrayIndex(t - 1);
        const currArrayIdx = getArrayIndex(t);
        const prevV = values[prevArrayIdx];
        const currV = values[currArrayIdx];
        
        if (prevV < 0 || prevV > 1 || currV < 0 || currV > 1) continue;
        if (prevV === currV) continue;
        
        const isRisingEdge = prevV === 0 && currV === 1;
        const isFallingEdge = prevV === 1 && currV === 0;
        
        const shouldDrawArrow = (isPositive && isRisingEdge) || (!isPositive && isFallingEdge);
        
        if (shouldDrawArrow) {
            const edgeX = nameWidth + t * subStepWidth;
            arrowPositions.push({ x: edgeX, isRising: isRisingEdge });
        }
    }
    
    ctx.save();
    ctx.fillStyle = arrowColor;
    
    for (const arrow of arrowPositions) {
        const x = arrow.x;
        const centerY = (highY + lowY) / 2;
        
        ctx.beginPath();
        if (arrow.isRising) {
            const tipY = centerY - arrowHeight / 2;
            const baseY = centerY + arrowHeight / 2;
            ctx.moveTo(x, tipY);
            ctx.lineTo(x - arrowHalfWidth, baseY);
            ctx.lineTo(x + arrowHalfWidth, baseY);
        } else {
            const tipY = centerY + arrowHeight / 2;
            const baseY = centerY - arrowHeight / 2;
            ctx.moveTo(x, tipY);
            ctx.lineTo(x - arrowHalfWidth, baseY);
            ctx.lineTo(x + arrowHalfWidth, baseY);
        }
        ctx.closePath();
        ctx.fill();
    }
    
    ctx.restore();
}

/**
 * Draw clock markers (P/N style arrows from WaveDrom)
 * These are arrows on clock edges where clockMarkers[idx] is true
 */
function drawClockMarkers(ctx, signal, values, effectiveCount, highY, lowY, nameWidth, subStepWidth, getArrayIndex) {
    const arrowColor = signal.color || getThemeDefaultSignalColor();
    
    // Slightly smaller arrows than regular edge arrows for clock markers
    const arrowHalfWidth = WAVEDROM_STYLE.clockArrowSize * 0.5;
    const arrowHeight = WAVEDROM_STYLE.clockArrowSize * 1.0;
    
    const clockMarkers = signal.clockMarkers;
    if (!clockMarkers) return;
    
    const arrowPositions = [];
    
    for (let t = 1; t < effectiveCount; t++) {
        const prevArrayIdx = getArrayIndex(t - 1);
        const currArrayIdx = getArrayIndex(t);
        const prevV = values[prevArrayIdx];
        const currV = values[currArrayIdx];
        
        // Skip if no transition or not valid bit values
        if (prevV < 0 || prevV > 1 || currV < 0 || currV > 1) continue;
        if (prevV === currV) continue;
        
        // Only draw if this specific edge has a marker enabled
        if (!clockMarkers[currArrayIdx]) continue;
        
        const isRisingEdge = prevV === 0 && currV === 1;
        const edgeX = nameWidth + t * subStepWidth;
        arrowPositions.push({ x: edgeX, isRising: isRisingEdge });
    }
    
    ctx.save();
    ctx.fillStyle = arrowColor;
    
    for (const arrow of arrowPositions) {
        const x = arrow.x;
        const centerY = (highY + lowY) / 2;
        
        ctx.beginPath();
        if (arrow.isRising) {
            // Rising edge: arrow pointing up
            const tipY = centerY - arrowHeight / 2;
            const baseY = centerY + arrowHeight / 2;
            ctx.moveTo(x, tipY);
            ctx.lineTo(x - arrowHalfWidth, baseY);
            ctx.lineTo(x + arrowHalfWidth, baseY);
        } else {
            // Falling edge: arrow pointing down
            const tipY = centerY + arrowHeight / 2;
            const baseY = centerY - arrowHeight / 2;
            ctx.moveTo(x, tipY);
            ctx.lineTo(x - arrowHalfWidth, baseY);
            ctx.lineTo(x + arrowHalfWidth, baseY);
        }
        ctx.closePath();
        ctx.fill();
    }
    
    ctx.restore();
}

/**
 * Get display level for vector signal sample
 * Levels: 0=low, 1=high, 2=bar/rectangle, 3=center (undefined/z), 4=pull-up (high dotted), 5=pull-down (low dotted)
 */
function getVectorDisplayLevel(signal, sampleIdx) {
    if (sampleIdx < 0 || sampleIdx >= signal.values.length) return 3;
    const v = signal.values[sampleIdx];
    const label = signal.labels[sampleIdx] ? signal.labels[sampleIdx].toLowerCase().trim() : '';
    
    const segStyle = (signal.segmentStyles && sampleIdx < signal.segmentStyles.length) 
        ? signal.segmentStyles[sampleIdx] 
        : null;
    if (v === -1 && segStyle && segStyle.hatched) {
        return 2;
    }
    
    if (v === -1) return 3; // UNDEFINED_VALUE
    if (label === 'l') return 0; // low
    if (label === 'h') return 1; // high
    if (label === 'u') return 4; // pull-up (high dotted)
    if (label === 'd') return 5; // pull-down (low dotted)
    if (label === 'z') return 3; // center line
    return 2; // bar/rectangle
}

/**
 * Get Y coordinate for display level
 * Levels 4 (pull-up) and 5 (pull-down) use same Y as high/low respectively
 */
function getYForLevel(level, highY, lowY, centerY) {
    if (level === 0 || level === 5) return lowY;  // low or pull-down
    if (level === 1 || level === 4) return highY; // high or pull-up
    return centerY;
}

/**
 * Draw a vector signal waveform
 * @param {number} effectiveCount - Number of visual positions to draw (sampleCount * signalDivisor)
 * @param {number} maxSubSteps - Maximum substeps in the document (for array step size)
 */
function drawVectorSignal(ctx, signal, index, rowHeight, signalStartY, nameWidth, subStepWidth, effectiveCount, maxSubSteps) {
    const y = index * rowHeight + signalStartY;
    const leftMargin = nameWidth;
    
    const rh = rowHeight;
    const highY = y + rh * 0.25;
    const lowY = y + rh * 0.75;
    const centerY = y + rh / 2;
    const barTop = y + rh * 0.25;
    const barHeight = rh * 0.5;
    
    const triW = Math.min(8, Math.max(4, subStepWidth / 3));
    
    // Clamp effectiveCount to signal array size to avoid out-of-bounds access
    const maxVisualCount = Math.min(effectiveCount, signal.values.length);
    
    // Direct mapping - visual position equals array index
    const getArrayIndex = (t) => t;
    
    // First pass: draw UNDEFINED and "Z" as center line
    ctx.strokeStyle = signal.color || getThemeDefaultSignalColor();
    ctx.lineWidth = 2;
    
    for (let t = 0; t < maxVisualCount; t++) {
        const arrayIdx = getArrayIndex(t);
        const level = getVectorDisplayLevel(signal, arrayIdx);
        if (level === 3) {
            const x0 = leftMargin + t * subStepWidth;
            const x1 = leftMargin + (t + 1) * subStepWidth;
            
            const prevArrayIdx = t > 0 ? getArrayIndex(t - 1) : -1;
            const prevLevel = t > 0 ? getVectorDisplayLevel(signal, prevArrayIdx) : -1;
            const prevY = getYForLevel(prevLevel, highY, lowY, centerY);
            
            if (prevLevel !== 3 && prevLevel !== 2) {
                const transitionEndX = Math.min(x0 + triW, x1);
                ctx.beginPath();
                ctx.moveTo(x0, prevY);
                ctx.lineTo(transitionEndX, centerY);
                ctx.stroke();
                ctx.beginPath();
                ctx.moveTo(transitionEndX, centerY);
                ctx.lineTo(x1, centerY);
                ctx.stroke();
            } else {
                ctx.beginPath();
                ctx.moveTo(x0, centerY);
                ctx.lineTo(x1, centerY);
                ctx.stroke();
            }
        }
    }
    
    // Second pass: draw 0/1/u/d labels like bit signals
    // Levels 0,1 = solid line (low/high), levels 4,5 = dotted line (pull-up/pull-down)
    for (let t = 0; t < maxVisualCount; t++) {
        const arrayIdx = getArrayIndex(t);
        const level = getVectorDisplayLevel(signal, arrayIdx);
        if (level !== 0 && level !== 1 && level !== 4 && level !== 5) continue;
        
        // Set line style: dotted for pull-up (4) and pull-down (5)
        const isPullState = (level === 4 || level === 5);
        if (isPullState) {
            ctx.setLineDash([2, 4]);
        } else {
            ctx.setLineDash([]);
        }
        
        const x0 = leftMargin + t * subStepWidth;
        const x1 = leftMargin + (t + 1) * subStepWidth;
        const drawY = getYForLevel(level, highY, lowY, centerY);
        
        const prevArrayIdx = t > 0 ? getArrayIndex(t - 1) : -1;
        const nextArrayIdx = t + 1 < maxVisualCount ? getArrayIndex(t + 1) : -1;
        const prevLevel = t > 0 ? getVectorDisplayLevel(signal, prevArrayIdx) : -1;
        const nextLevel = t + 1 < maxVisualCount ? getVectorDisplayLevel(signal, nextArrayIdx) : -1;
        const prevIsVector = (prevLevel === 2);
        const nextIsVector = (nextLevel === 2);
        
        let drawStartX = x0;
        let drawEndX = x1;
        
        if (prevIsVector) {
            const transitionEndX = Math.min(x0 + triW, x1);
            ctx.beginPath();
            ctx.moveTo(x0, centerY);
            ctx.lineTo(transitionEndX, drawY);
            ctx.stroke();
            drawStartX = transitionEndX;
        } else if (prevLevel !== level && prevLevel !== 2) {
            const prevY = getYForLevel(prevLevel, highY, lowY, centerY);
            const transitionEndX = Math.min(x0 + triW, x1);
            ctx.beginPath();
            ctx.moveTo(x0, prevY);
            ctx.lineTo(transitionEndX, drawY);
            ctx.stroke();
            drawStartX = transitionEndX;
        }
        
        if (nextIsVector) {
            const transitionStartX = Math.max(x1 - triW, drawStartX);
            if (transitionStartX > drawStartX) {
                ctx.beginPath();
                ctx.moveTo(drawStartX, drawY);
                ctx.lineTo(transitionStartX, drawY);
                ctx.stroke();
            }
            ctx.beginPath();
            ctx.moveTo(transitionStartX, drawY);
            ctx.lineTo(x1, centerY);
            ctx.stroke();
        } else {
            if (drawEndX > drawStartX) {
                ctx.beginPath();
                ctx.moveTo(drawStartX, drawY);
                ctx.lineTo(drawEndX, drawY);
                ctx.stroke();
            }
        }
    }
    
    // Reset line dash after second pass
    ctx.setLineDash([]);
    
    // Third pass: draw bars for level 2
    drawVectorBars(ctx, signal, leftMargin, subStepWidth, barTop, barHeight, centerY, triW, maxVisualCount, getArrayIndex);
}

/**
 * Draw vector signal bars (level 2 segments)
 * @param {number} effectiveCount - Number of visual positions to iterate
 * @param {Function} getArrayIndex - Function to convert visual position to array index
 */
function drawVectorBars(ctx, signal, leftMargin, subStepWidth, barTop, barHeight, centerY, triW, effectiveCount, getArrayIndex) {
    let t = 0;
    while (t < effectiveCount) {
        const arrayIdx = getArrayIndex(t);
        const v = signal.values[arrayIdx];
        const level = getVectorDisplayLevel(signal, arrayIdx);
        // Skip levels 0,1 (low/high), 3 (center/undefined), 4,5 (pull-up/pull-down)
        if (level === 3 || level === 0 || level === 1 || level === 4 || level === 5) {
            t++;
            continue;
        }
        
        let start = t;
        let end = t;
        const startArrayIdx = getArrayIndex(start);
        const startLabel = signal.labels[startArrayIdx];
        
        for (let k = t + 1; k < effectiveCount; k++) {
            const kArrayIdx = getArrayIndex(k);
            if (signal.values[kArrayIdx] !== v || signal.labels[kArrayIdx] !== startLabel) break;
            end = k;
        }
        
        const leftEdge = leftMargin + start * subStepWidth;
        const rightEdge = leftMargin + (end + 1) * subStepWidth;
        
        const prevIndex = start - 1;
        const prevArrayIdx = prevIndex >= 0 ? getArrayIndex(prevIndex) : -1;
        const prevLevel = prevIndex >= 0 ? getVectorDisplayLevel(signal, prevArrayIdx) : -1;
        const hasLeftPeak = (prevIndex >= 0) && (
            signal.values[prevArrayIdx] !== v || 
            signal.labels[prevArrayIdx] !== startLabel ||
            prevLevel !== 2
        );
        
        const nextIndex = end + 1;
        const nextArrayIdx = nextIndex < effectiveCount ? getArrayIndex(nextIndex) : -1;
        const nextLevel = nextIndex < effectiveCount ? getVectorDisplayLevel(signal, nextArrayIdx) : -1;
        const hasRightPeak = (nextIndex < effectiveCount) && (
            signal.values[nextArrayIdx] !== v || 
            signal.labels[nextArrayIdx] !== startLabel ||
            nextLevel !== 2
        );
        
        let barLeft = leftEdge + (hasLeftPeak ? triW : 0);
        let barRight = rightEdge - (hasRightPeak ? triW : 0);
        if (barRight < barLeft) barRight = barLeft;
        
        const segStyle = (signal.segmentStyles && startArrayIdx < signal.segmentStyles.length) 
            ? signal.segmentStyles[startArrayIdx] 
            : null;
        
        const baseColor = signal.color || getThemeDefaultSignalColor();
        const segmentColor = (segStyle && segStyle.color) ? segStyle.color : baseColor;
        const lineColor = segmentColor;
        
        // Draw fill if segment or signal has a fill color
        const effectiveFill = (segStyle && segStyle.fill) ? segStyle.fill : signal.fill;
        if (effectiveFill) {
            drawVectorBarFill(ctx, effectiveFill, leftEdge, rightEdge, barLeft, barRight, barTop, barHeight, centerY, hasLeftPeak, hasRightPeak);
        }
        
        // Draw hatching if enabled
        if (segStyle && segStyle.hatched === true) {
            drawVectorBarHatching(ctx, leftEdge, rightEdge, barLeft, barRight, barTop, barHeight, centerY, hasLeftPeak, hasRightPeak);
        }
        
        // Draw borders
        drawVectorBarBorders(ctx, lineColor, leftEdge, rightEdge, barLeft, barRight, barTop, barHeight, centerY, hasLeftPeak, hasRightPeak);
        
        // Draw label
        const label = signal.labels[startArrayIdx] || '';
        if (label) {
            drawVectorBarLabel(ctx, label, barLeft, barRight, barTop, barHeight);
        }
        
        t = end + 1;
    }
}

/**
 * Draw vector bar fill
 */
function drawVectorBarFill(ctx, fillColor, leftEdge, rightEdge, barLeft, barRight, barTop, barHeight, centerY, hasLeftPeak, hasRightPeak) {
    ctx.fillStyle = fillColor;
    ctx.beginPath();
    
    if (hasLeftPeak) {
        ctx.moveTo(leftEdge, centerY);
        ctx.lineTo(barLeft, barTop);
    } else {
        ctx.moveTo(barLeft, barTop);
    }
    
    ctx.lineTo(barRight, barTop);
    
    if (hasRightPeak) {
        ctx.lineTo(rightEdge, centerY);
        ctx.lineTo(barRight, barTop + barHeight);
    } else {
        ctx.lineTo(barRight, barTop + barHeight);
    }
    
    ctx.lineTo(barLeft, barTop + barHeight);
    
    if (hasLeftPeak) {
        ctx.lineTo(leftEdge, centerY);
    }
    
    ctx.closePath();
    ctx.fill();
}

/**
 * Draw vector bar hatching
 * Uses mathematical line clipping instead of ctx.clip() for reliability
 */
function drawVectorBarHatching(ctx, leftEdge, rightEdge, barLeft, barRight, barTop, barHeight, centerY, hasLeftPeak, hasRightPeak) {
    ctx.save();
    
    // Build polygon vertices clockwise
    const polygon = [];
    
    if (hasLeftPeak) {
        polygon.push({ x: leftEdge, y: centerY });      // Left peak
        polygon.push({ x: barLeft, y: barTop });        // Top-left
    } else {
        polygon.push({ x: barLeft, y: barTop });        // Top-left
    }
    
    polygon.push({ x: barRight, y: barTop });           // Top-right
    
    if (hasRightPeak) {
        polygon.push({ x: rightEdge, y: centerY });     // Right peak
        polygon.push({ x: barRight, y: barTop + barHeight }); // Bottom-right
    } else {
        polygon.push({ x: barRight, y: barTop + barHeight }); // Bottom-right
    }
    
    polygon.push({ x: barLeft, y: barTop + barHeight }); // Bottom-left
    
    if (hasLeftPeak) {
        polygon.push({ x: leftEdge, y: centerY });      // Back to left peak (close)
    }
    
    // Draw diagonal lines - always black
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 1;
    ctx.lineCap = 'butt';  // Butt caps for precise alignment
    ctx.lineJoin = 'miter';
    
    const hatchSpacing = 6;
    
    // Calculate bounding box
    const minX = hasLeftPeak ? leftEdge : barLeft;
    const maxX = hasRightPeak ? rightEdge : barRight;
    const minY = barTop;
    const maxY = barTop + barHeight;
    const height = maxY - minY;
    
    // Align to a global grid so lines connect perfectly across segments
    // Use origin (0, 0) as reference point for the 45-degree grid
    // For a 45° line through origin: y = -x + c, where c is the y-intercept
    // Lines are spaced by hatchSpacing along the diagonal (which is hatchSpacing * sqrt(2) in c value)
    const diagSpacing = hatchSpacing * Math.SQRT2;
    
    // Find the range of c values (y-intercepts) that cover our bounding box
    // A line y = -x + c passes through point (x,y) when c = x + y
    const cMin = minX + minY;  // Top-left corner
    const cMax = maxX + maxY;  // Bottom-right corner
    
    // Align to grid
    const cStart = Math.floor(cMin / diagSpacing) * diagSpacing;
    const cEnd = Math.ceil(cMax / diagSpacing) * diagSpacing;
    
    // Draw all hatch lines in a single path
    ctx.beginPath();
    
    for (let c = cStart; c <= cEnd; c += diagSpacing) {
        // Line equation: y = -x + c, or x + y = c
        // At y = maxY (bottom): x = c - maxY
        // At y = minY (top): x = c - minY
        const lineStart = { x: c - maxY, y: maxY };
        const lineEnd = { x: c - minY, y: minY };
        
        // Clip line against polygon
        const clipped = clipLineToPolygon(lineStart, lineEnd, polygon);
        
        if (clipped) {
            ctx.moveTo(clipped.start.x, clipped.start.y);
            ctx.lineTo(clipped.end.x, clipped.end.y);
        }
    }
    
    ctx.stroke();
    ctx.restore();
}

/**
 * Clip a line segment to a convex polygon using Sutherland-Hodgman style clipping
 */
function clipLineToPolygon(lineStart, lineEnd, polygon) {
    let p1 = { ...lineStart };
    let p2 = { ...lineEnd };
    
    const n = polygon.length;
    
    for (let i = 0; i < n; i++) {
        const edgeStart = polygon[i];
        const edgeEnd = polygon[(i + 1) % n];
        
        // Calculate which side of the edge each point is on
        const d1 = crossProduct(edgeStart, edgeEnd, p1);
        const d2 = crossProduct(edgeStart, edgeEnd, p2);
        
        if (d1 < 0 && d2 < 0) {
            // Both points outside this edge - line is completely outside
            return null;
        }
        
        if (d1 >= 0 && d2 >= 0) {
            // Both points inside this edge - continue to next edge
            continue;
        }
        
        // Line crosses this edge - find intersection
        const intersection = lineIntersection(p1, p2, edgeStart, edgeEnd);
        
        if (intersection) {
            if (d1 < 0) {
                // p1 is outside, move it to intersection
                p1 = intersection;
            } else {
                // p2 is outside, move it to intersection
                p2 = intersection;
            }
        }
    }
    
    return { start: p1, end: p2 };
}

/**
 * Cross product to determine which side of a line a point is on
 * Returns positive if point is on the left side (inside for clockwise polygon)
 */
function crossProduct(lineStart, lineEnd, point) {
    return (lineEnd.x - lineStart.x) * (point.y - lineStart.y) - 
           (lineEnd.y - lineStart.y) * (point.x - lineStart.x);
}

/**
 * Find intersection point of two line segments
 */
function lineIntersection(p1, p2, p3, p4) {
    const denom = (p1.x - p2.x) * (p3.y - p4.y) - (p1.y - p2.y) * (p3.x - p4.x);
    
    if (Math.abs(denom) < 0.0001) {
        return null; // Lines are parallel
    }
    
    const t = ((p1.x - p3.x) * (p3.y - p4.y) - (p1.y - p3.y) * (p3.x - p4.x)) / denom;
    
    return {
        x: p1.x + t * (p2.x - p1.x),
        y: p1.y + t * (p2.y - p1.y)
    };
}

/**
 * Draw vector bar borders
 */
function drawVectorBarBorders(ctx, lineColor, leftEdge, rightEdge, barLeft, barRight, barTop, barHeight, centerY, hasLeftPeak, hasRightPeak) {
    ctx.strokeStyle = lineColor;
    ctx.lineWidth = 2;
    ctx.lineCap = 'square';   // Square caps for perfect corner connections
    ctx.lineJoin = 'miter';   // Sharp mitered corners
    
    // Draw the entire shape as a single continuous path for perfect connections
    ctx.beginPath();
    
    // Start from top-left corner or left peak
    if (hasLeftPeak) {
        ctx.moveTo(leftEdge, centerY);         // Left peak point
        ctx.lineTo(barLeft, barTop);           // To top-left corner
    } else {
        ctx.moveTo(barLeft, barTop);           // Start at top-left corner
    }
    
    // Top edge to top-right corner
    ctx.lineTo(barRight, barTop);
    
    // Right side
    if (hasRightPeak) {
        ctx.lineTo(rightEdge, centerY);        // To right peak point
        ctx.lineTo(barRight, barTop + barHeight); // To bottom-right corner
    } else {
        ctx.lineTo(barRight, barTop + barHeight); // To bottom-right corner
    }
    
    // Bottom edge to bottom-left corner
    ctx.lineTo(barLeft, barTop + barHeight);
    
    // Left side back to start
    if (hasLeftPeak) {
        ctx.lineTo(leftEdge, centerY);         // Back to left peak
    } else {
        ctx.lineTo(barLeft, barTop);           // Back to top-left corner
    }
    
    ctx.closePath();
    ctx.stroke();
}

/**
 * Draw vector bar label
 */
function drawVectorBarLabel(ctx, label, barLeft, barRight, barTop, barHeight) {
    ctx.save();
    const fontSize = WAVEDROM_STYLE.labelFontSize;
    ctx.font = `${fontSize}px Arial`;
    const textX = barLeft + (barRight - barLeft) / 2;
    const textY = barTop + barHeight / 2;
    
    ctx.fillStyle = getComputedStyle(document.body).getPropertyValue('--canvas-text').trim() || '#000000';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, textX, textY);
    ctx.restore();
}

/**
 * Hit test for clock edges - detects if a point is near a clock transition
 * Uses maxSubSteps for consistent coordinates across all signals
 * @param {number} mouseX - Mouse X coordinate
 * @param {number} mouseY - Mouse Y coordinate
 * @returns {object|null} Edge info { signalIndex, sampleIndex, edgeType, hasMarker } or null
 */
function hitTestClockEdge(mouseX, mouseY) {
    if (typeof document_wave === 'undefined') return null;
    
    const signals = document_wave.signalList();
    const rowHeight = 40;
    const signalStartY = 40;
    const nameWidth = getDynamicNameWidth();
    
    // Only check clicks in the waveform area (not name area)
    if (mouseX < nameWidth) return null;
    if (mouseY < signalStartY) return null;
    
    // Determine which signal row
    const signalIndex = Math.floor((mouseY - signalStartY) / rowHeight);
    if (signalIndex < 0 || signalIndex >= signals.length) return null;
    
    const signal = signals[signalIndex];
    
    // Only bit signals have clock edges
    if (!signal || signal.type !== SignalType.Bit) return null;
    
    const values = signal.values;
    const hitRadius = 10; // Pixels tolerance for edge detection
    
    // ALWAYS use maxSubSteps for consistent coordinates
    const globalSubSteps = document_wave.subStepCount();
    const maxSubSteps = document_wave.maxSubSteps ? document_wave.maxSubSteps() : globalSubSteps;
    const divisor = maxSubSteps + 1;
    const stepWidth = waveCellWidth / divisor;
    
    const relX = mouseX - nameWidth;
    if (relX < 0) return null;
    
    // Calculate array position
    const arrayPos = Math.floor(relX / stepWidth);
    const sampleCount = document_wave.m_sampleCount;
    const effectiveCount = sampleCount * divisor;
    
    if (arrayPos < 0 || arrayPos >= effectiveCount) return null;
    
    // Check transitions around the clicked position
    for (let offset = 0; offset <= 1; offset++) {
        const currArrayIdx = arrayPos + offset;
        if (currArrayIdx <= 0 || currArrayIdx >= effectiveCount) continue;
        
        const prevArrayIdx = currArrayIdx - 1;
        
        if (currArrayIdx >= values.length || prevArrayIdx >= values.length) continue;
        
        const prevV = values[prevArrayIdx];
        const currV = values[currArrayIdx];
        
        // Skip invalid values
        if (prevV < 0 || prevV > 1 || currV < 0 || currV > 1) continue;
        if (prevV === currV) continue;
        
        // Found a transition - calculate X position
        const edgeX = nameWidth + currArrayIdx * stepWidth;
        
        // Check if mouse is near this edge
        const dx = Math.abs(mouseX - edgeX);
        if (dx <= hitRadius) {
            const isRisingEdge = prevV === 0 && currV === 1;
            const hasMarker = signal.clockMarkers ? signal.clockMarkers[currArrayIdx] : false;
            
            return {
                signalIndex: signalIndex,
                sampleIndex: currArrayIdx,
                edgeType: isRisingEdge ? 'rising' : 'falling',
                hasMarker: hasMarker,
                edgeX: edgeX
            };
        }
    }
    
    return null;
}

/**
 * Draw selection highlight for a clock edge
 * @param {CanvasRenderingContext2D} ctx - Canvas context
 * @param {object} edgeInfo - Edge info from hitTestClockEdge
 */
function drawClockEdgeSelection(ctx, edgeInfo) {
    if (!edgeInfo) return;
    
    const { signalIndex, sampleIndex, edgeType, hasMarker } = edgeInfo;
    const rowHeight = 40;
    const signalStartY = 40;
    
    // Recalculate edge X position
    const signals = document_wave.signalList();
    const signal = signals[signalIndex];
    if (!signal) return;
    
    const nameWidth = getDynamicNameWidth();
    
    // ALWAYS use maxSubSteps for consistent coordinates
    const globalSubSteps = document_wave.subStepCount();
    const maxSubSteps = document_wave.maxSubSteps ? document_wave.maxSubSteps() : globalSubSteps;
    const divisor = maxSubSteps + 1;
    const stepWidth = waveCellWidth / divisor;
    
    // Calculate X position from array index
    const edgeX = nameWidth + sampleIndex * stepWidth;
    
    const y = signalIndex * rowHeight + signalStartY;
    const highY = y + rowHeight * 0.25;
    const lowY = y + rowHeight * 0.75;
    
    ctx.save();
    
    // Draw selection highlight circle at the edge (blue like other selections)
    const centerY = (highY + lowY) / 2;
    const radius = 10;
    
    // Highlight background
    ctx.beginPath();
    ctx.arc(edgeX, centerY, radius, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(0, 191, 255, 0.3)';  // Selection blue with alpha
    ctx.fill();
    
    // Highlight border
    ctx.beginPath();
    ctx.arc(edgeX, centerY, radius, 0, Math.PI * 2);
    ctx.strokeStyle = '#00bfff';  // Selection blue (DeepSkyBlue)
    ctx.lineWidth = 2;
    ctx.stroke();
    
    // Draw small arrow indicator
    const arrowSize = 6;
    ctx.fillStyle = '#00bfff';
    ctx.beginPath();
    if (edgeType === 'rising') {
        // Up arrow
        ctx.moveTo(edgeX, centerY - arrowSize);
        ctx.lineTo(edgeX - arrowSize/2, centerY);
        ctx.lineTo(edgeX + arrowSize/2, centerY);
    } else {
        // Down arrow
        ctx.moveTo(edgeX, centerY + arrowSize);
        ctx.lineTo(edgeX - arrowSize/2, centerY);
        ctx.lineTo(edgeX + arrowSize/2, centerY);
    }
    ctx.closePath();
    ctx.fill();
    
    ctx.restore();
}

// Export for module use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        drawBitSignal,
        drawBitEdgeArrows,
        drawClockMarkers,
        drawVectorSignal,
        drawVectorBars,
        getVectorDisplayLevel,
        getYForLevel,
        hitTestClockEdge,
        drawClockEdgeSelection
    };
}
