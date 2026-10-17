// WaveViewUtils.js - Utility functions for WaveView

/**
 * Get effective substeps for a signal (signal's own or global)
 * If signal has subSteps > 0, use that. Otherwise use global.
 */
function getSignalEffectiveSubSteps(signal) {
    if (!document_wave) return 0;
    const globalSubSteps = document_wave.subStepCount();
    // If signal has its own subSteps defined (> 0), use it; otherwise use global
    if (signal && signal.subSteps > 0) {
        return signal.subSteps;
    }
    return globalSubSteps;
}

/**
 * Convert a fractional position to pixel X coordinate
 * @param {number} position - Fractional position (e.g., 2.5 = mainStep 2, 50% into step)
 * @returns {number} X coordinate in pixels
 */
function positionToPixelX(position) {
    const nameWidth = getDynamicNameWidth();
    return nameWidth + position * waveCellWidth;
}

/**
 * Convert pixel X coordinate to fractional position
 * @param {number} pixelX - X coordinate in pixels
 * @returns {number} Fractional position
 */
function pixelXToPosition(pixelX) {
    const nameWidth = getDynamicNameWidth();
    const relX = pixelX - nameWidth;
    if (relX < 0) return 0;
    return relX / waveCellWidth;
}

/**
 * Snap a fractional position to the nearest edge of a signal's substep grid
 * @param {number} position - Fractional position
 * @param {Object|number} signalOrSubSteps - Signal object or number of substeps
 * @returns {number} Snapped fractional position
 */
function snapPositionToSignalGrid(position, signalOrSubSteps) {
    const subSteps = typeof signalOrSubSteps === 'number' 
        ? signalOrSubSteps 
        : getSignalEffectiveSubSteps(signalOrSubSteps);
    const divisor = subSteps + 1;
    
    const mainStep = Math.floor(position);
    const fraction = position - mainStep;
    
    // Snap fraction to nearest substep edge
    const snappedSubStep = Math.round(fraction * divisor);
    
    // Handle wrap to next main step
    if (snappedSubStep >= divisor) {
        return mainStep + 1;
    }
    
    return mainStep + snappedSubStep / divisor;
}

/**
 * Convert a fractional position to array index for a specific signal
 * @param {number} position - Fractional position
 * @param {Object|number} signalOrSubSteps - Signal object or number of substeps
 * @returns {number} Array index for that signal's data
 */
function positionToSignalIndex(position, signalOrSubSteps) {
    const subSteps = typeof signalOrSubSteps === 'number' 
        ? signalOrSubSteps 
        : getSignalEffectiveSubSteps(signalOrSubSteps);
    const divisor = subSteps + 1;
    
    const mainStep = Math.floor(position);
    const fraction = position - mainStep;
    const subStep = Math.floor(fraction * divisor);
    
    return mainStep * divisor + subStep;
}

/**
 * Convert an array index back to fractional position for a specific signal
 * @param {number} index - Array index
 * @param {Object|number} signalOrSubSteps - Signal object or number of substeps
 * @returns {number} Fractional position
 */
function signalIndexToPosition(index, signalOrSubSteps) {
    const subSteps = typeof signalOrSubSteps === 'number' 
        ? signalOrSubSteps 
        : getSignalEffectiveSubSteps(signalOrSubSteps);
    const divisor = subSteps + 1;
    
    const mainStep = Math.floor(index / divisor);
    const subStep = index % divisor;
    
    return mainStep + subStep / divisor;
}

/**
 * UNIFIED COORDINATE MAPPING FUNCTION
 * 
 * This is the central function for ALL coordinate mapping in the canvas.
 * Every click, hover, or position calculation should use this function.
 * 
 * Returns a comprehensive object with all coordinate information needed
 * by any tool or feature (paint, arrows, markers, time spans, etc.)
 * 
 * @param {number} mouseX - X coordinate relative to canvas
 * @param {number} mouseY - Y coordinate relative to canvas
 * @param {Object} options - Optional configuration
 * @param {boolean} options.snapToEdge - If true, snap to nearest edge (for arrows)
 * @param {boolean} options.useGlobalOnly - If true, always use global substeps
 * @param {boolean} options.useMaxSubSteps - If true, use maxSubSteps for snapping (for overlays like markers, time jumps, arrows)
 * @returns {Object|null} Coordinate information or null if outside valid area
 */
function mapCanvasPosition(mouseX, mouseY, options = {}) {
    if (!document_wave || !canvas) return null;
    
    const { snapToEdge = false, useGlobalOnly = false, useMaxSubSteps = false } = options;
    
    const signals = document_wave.signalList();
    const rowHeight = 40;
    const signalStartY = 40;
    const nameWidth = getDynamicNameWidth();
    const sampleCount = document_wave.m_sampleCount;
    const globalSubSteps = document_wave.subStepCount();
    const globalDivisor = globalSubSteps + 1;
    
    // Get maxSubSteps (maximum substep resolution across all signals)
    const maxSubSteps = document_wave.maxSubSteps ? document_wave.maxSubSteps() : globalSubSteps;
    
    // Calculate signal index (can be -1 if above signals or >= signals.length if below)
    const signalIndex = Math.floor((mouseY - signalStartY) / rowHeight);
    const signal = (signalIndex >= 0 && signalIndex < signals.length) ? signals[signalIndex] : null;
    
    // Check if click is on the name area
    const clickedOnName = mouseX < nameWidth;
    
    const relX = mouseX - nameWidth;
    
    // If in name area, return limited info
    if (relX < 0) {
        return {
            signalIndex: signalIndex >= 0 && signalIndex < signals.length ? signalIndex : -1,
            signal,
            clickedOnName: true,
            // No sample information when clicking on name
            mainStep: -1,
            subStepFraction: 0,
            globalSampleIndex: -1,
            signalSampleIndex: -1,
            signalSubSteps: signal ? getSignalEffectiveSubSteps(signal) : globalSubSteps,
            globalSubSteps
        };
    }
    
    // Calculate main step position
    const posInSteps = relX / waveCellWidth;
    let mainStep = Math.floor(posInSteps);
    
    // Calculate position within the main step (0 to 1)
    let posInStep = posInSteps - mainStep;
    
    // Clamp main step
    if (mainStep < 0) {
        mainStep = 0;
        posInStep = 0;
    }
    if (mainStep >= sampleCount) {
        mainStep = sampleCount - 1;
        posInStep = 0.999; // Just before the end
    }
    
    // Signal-specific substeps (each signal can have its own)
    const signalSubSteps = useGlobalOnly ? globalSubSteps : (signal ? getSignalEffectiveSubSteps(signal) : globalSubSteps);
    const signalDivisor = signalSubSteps + 1;
    
    // Substeps for position snapping (use maxSubSteps for overlays to ensure consistent grid)
    const snapSubSteps = useMaxSubSteps ? maxSubSteps : signalSubSteps;
    const snapDivisor = snapSubSteps + 1;
    
    // Calculate substep indices
    let globalSubStep, signalSubStep, snapSubStep;
    
    if (snapToEdge) {
        // Snap to nearest edge
        globalSubStep = Math.round(posInStep * globalDivisor);
        signalSubStep = Math.round(posInStep * signalDivisor);
        snapSubStep = Math.round(posInStep * snapDivisor);
        
        // Handle wrap to next main step (based on snap substeps)
        if (snapSubStep >= snapDivisor) {
            if (mainStep < sampleCount - 1) {
                mainStep++;
                globalSubStep = 0;
                signalSubStep = 0;
                snapSubStep = 0;
                posInStep = 0;
            } else {
                globalSubStep = globalDivisor - 1;
                signalSubStep = signalDivisor - 1;
                snapSubStep = snapDivisor - 1;
            }
        }
        if (globalSubStep >= globalDivisor) {
            globalSubStep = globalDivisor - 1;
        }
        if (signalSubStep >= signalDivisor) {
            signalSubStep = signalDivisor - 1;
        }
    } else {
        // Floor to current position
        globalSubStep = Math.floor(posInStep * globalDivisor);
        signalSubStep = Math.floor(posInStep * signalDivisor);
        snapSubStep = Math.floor(posInStep * snapDivisor);
    }
    
    // Calculate array indices
    const globalSampleIndex = mainStep * globalDivisor + globalSubStep;
    const signalSampleIndex = mainStep * signalDivisor + signalSubStep;
    
    // Calculate effective counts for bounds checking
    const globalEffectiveCount = sampleCount * globalDivisor;
    const signalEffectiveCount = sampleCount * signalDivisor;
    
    // Validate indices
    const validGlobalIndex = globalSampleIndex >= 0 && globalSampleIndex < globalEffectiveCount;
    const validSignalIndex = signalSampleIndex >= 0 && signalSampleIndex < signalEffectiveCount;
    
    // Calculate fractional position (UNIVERSAL COORDINATE)
    // This is the primary coordinate for overlays (arrows, markers, etc.)
    // Format: mainStep + fraction (e.g., 2.5 = mainStep 2, 50% into step)
    let position;
    if (snapToEdge) {
        // Snapped position based on snapSubSteps (maxSubSteps when useMaxSubSteps is true)
        // This ensures overlays can be placed at any visible grid position
        position = mainStep + snapSubStep / snapDivisor;
    } else {
        // Raw position
        position = mainStep + posInStep;
    }
    
    return {
        // Signal information
        signalIndex: signalIndex >= 0 && signalIndex < signals.length ? signalIndex : -1,
        signal,
        clickedOnName: false,
        
        // UNIVERSAL FRACTIONAL POSITION (for overlays)
        // This is the recommended coordinate for arrows, markers, time spans, etc.
        // It's independent of any signal's substeps and represents exact visual position
        position,
        
        // Main step (always the same regardless of substeps)
        mainStep,
        
        // Fractional position within main step (0 to 1)
        subStepFraction: posInStep,
        
        // Global grid index (for markers, arrows, time spans, annotations, etc.)
        globalSampleIndex: validGlobalIndex ? globalSampleIndex : -1,
        globalSubStep,
        globalSubSteps,
        globalDivisor,
        globalEffectiveCount,
        
        // Signal-specific grid index (for painting bits/vectors)
        signalSampleIndex: validSignalIndex ? signalSampleIndex : -1,
        signalSubStep,
        signalSubSteps,
        signalDivisor,
        signalEffectiveCount,
        
        // Pixel coordinates for rendering
        nameWidth,
        relX,
        stepWidth: waveCellWidth,
        globalStepWidth: waveCellWidth / globalDivisor,
        signalStepWidth: waveCellWidth / signalDivisor
    };
}

/**
 * LEGACY WRAPPER: Map mouse coordinates to signal and sample indices
 * Use mapCanvasPosition() for new code.
 */
function mapToSignalSample(mouseX, mouseY) {
    const pos = mapCanvasPosition(mouseX, mouseY);
    if (!pos || pos.clickedOnName || pos.signalIndex < 0 || pos.signalSampleIndex < 0) {
        return null;
    }
    return { signalIndex: pos.signalIndex, sampleIndex: pos.signalSampleIndex };
}

/**
 * LEGACY WRAPPER: Map mouse coordinates to nearest edge (for arrow placement)
 * Use mapCanvasPosition(mouseX, mouseY, { snapToEdge: true }) for new code.
 * 
 * NOTE: Returns globalSampleIndex because arrows/time-spans use global coordinates
 */
function mapToNearestEdge(mouseX, mouseY) {
    const pos = mapCanvasPosition(mouseX, mouseY, { snapToEdge: true });
    if (!pos || pos.clickedOnName || pos.signalIndex < 0 || pos.globalSampleIndex < 0) {
        return null;
    }
    return { signalIndex: pos.signalIndex, sampleIndex: pos.globalSampleIndex };
}

/**
 * LEGACY WRAPPER: Map X coordinate to global sample index
 * Use mapCanvasPosition(mouseX, mouseY, { useGlobalOnly: true }) for new code.
 */
function mapXToSample(mouseX) {
    // Use a dummy Y in the middle of signals area
    const pos = mapCanvasPosition(mouseX, 60, { snapToEdge: true, useGlobalOnly: true });
    if (!pos || pos.globalSampleIndex < 0) {
        return -1;
    }
    return pos.globalSampleIndex;
}

/**
 * Quadratic bezier point calculation
 */
function quadraticPoint(p0x, p0y, p1x, p1y, p2x, p2y, t) {
    const inv = 1 - t;
    const x = inv * inv * p0x + 2 * inv * t * p1x + t * t * p2x;
    const y = inv * inv * p0y + 2 * inv * t * p1y + t * t * p2y;
    return { x, y };
}

/**
 * Cubic bezier point calculation (WaveDrom style)
 */
function cubicPoint(p0x, p0y, c1x, c1y, c2x, c2y, p1x, p1y, t) {
    const inv = 1 - t;
    const inv2 = inv * inv;
    const inv3 = inv2 * inv;
    const t2 = t * t;
    const t3 = t2 * t;
    const x = inv3 * p0x + 3 * inv2 * t * c1x + 3 * inv * t2 * c2x + t3 * p1x;
    const y = inv3 * p0y + 3 * inv2 * t * c1y + 3 * inv * t2 * c2y + t3 * p1y;
    return { x, y };
}

/**
 * Calculate squared distance from point to line segment
 */
function pointToSegmentDistSq(px, py, x1, y1, x2, y2) {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const lenSq = dx * dx + dy * dy;
    
    if (lenSq === 0) {
        // Segment is a point
        const dpx = px - x1;
        const dpy = py - y1;
        return dpx * dpx + dpy * dpy;
    }
    
    // Project point onto line segment
    let t = ((px - x1) * dx + (py - y1) * dy) / lenSq;
    t = Math.max(0, Math.min(1, t));
    
    const projX = x1 + t * dx;
    const projY = y1 + t * dy;
    const dpx = px - projX;
    const dpy = py - projY;
    
    return dpx * dpx + dpy * dpy;
}

/**
 * Get line segments for sharp line styles
 */
function getSharpLineSegments(p1x, p1y, p2x, p2y, style) {
    const segments = [];
    const dx = p2x - p1x;
    const dy = p2y - p1y;
    
    if (style.includes('-|-') || style === '<-|->') {
        // Zigzag: horizontal, vertical, horizontal
        const midX = p1x + dx / 2;
        segments.push({ x1: p1x, y1: p1y, x2: midX, y2: p1y });
        segments.push({ x1: midX, y1: p1y, x2: midX, y2: p2y });
        segments.push({ x1: midX, y1: p2y, x2: p2x, y2: p2y });
    } else if (style.startsWith('-|') || style === '<-|>') {
        // Right angle: horizontal first, then vertical
        segments.push({ x1: p1x, y1: p1y, x2: p2x, y2: p1y });
        segments.push({ x1: p2x, y1: p1y, x2: p2x, y2: p2y });
    } else if (style.startsWith('|-')) {
        // Left angle: vertical first, then horizontal
        segments.push({ x1: p1x, y1: p1y, x2: p1x, y2: p2y });
        segments.push({ x1: p1x, y1: p2y, x2: p2x, y2: p2y });
    } else {
        // Default: straight line
        segments.push({ x1: p1x, y1: p1y, x2: p2x, y2: p2y });
    }
    
    return segments;
}

// Export for module use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        getSignalEffectiveSubSteps,
        positionToPixelX,
        pixelXToPosition,
        snapPositionToSignalGrid,
        positionToSignalIndex,
        signalIndexToPosition,
        mapCanvasPosition,
        mapToSignalSample,
        mapToNearestEdge,
        mapXToSample,
        quadraticPoint,
        cubicPoint,
        pointToSegmentDistSq,
        getSharpLineSegments
    };
}
