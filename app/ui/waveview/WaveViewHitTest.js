// WaveViewHitTest.js - Hit testing functions for interactive elements

/**
 * Checks if a point is near a marker line.
 * Uses fractional positions (position) for markers.
 * @param {number} mouseX - Mouse X coordinate
 * @param {number} mouseY - Mouse Y coordinate
 * @returns {Object|null} The marker object if hit, null otherwise
 */
function hitTestMarker(mouseX, mouseY) {
    if (!document_wave) return null;
    const markers = document_wave.markerList();
    if (!markers || !markers.length) return null;

    const signalStartY = 40;
    const nameWidth = getDynamicNameWidth();

    // Only check if within waveform area (below header)
    if (mouseY < signalStartY) return null;
    if (mouseX < nameWidth) return null;

    const hitThreshold = 6; // pixels on each side of the marker line

    for (const marker of markers) {
        // Use positionToPixelX for fractional position
        const x = positionToPixelX(marker.position);
        if (Math.abs(mouseX - x) <= hitThreshold) {
            return marker;
        }
    }

    return null;
}

/**
 * Checks if a point is near a time jump glyph.
 * Uses fractional positions (position) for time jumps.
 * @param {number} mouseX - Mouse X coordinate
 * @param {number} mouseY - Mouse Y coordinate
 * @returns {Object|null} The time jump object if hit, null otherwise
 */
function hitTestTimeJump(mouseX, mouseY) {
    if (!document_wave) return null;
    const timeJumps = document_wave.timeJumpList();
    if (!timeJumps || !timeJumps.length) return null;

    const signalStartY = 40;
    const nameWidth = getDynamicNameWidth();
    const rowHeight = 40;

    // Only check if within waveform area
    if (mouseY < signalStartY) return null;
    if (mouseX < nameWidth) return null;

    // Time jump glyphs are drawn at a fixed size (see drawTimeJumpGlyph)
    const glyphWidth = 24 + 8 * 2;
    const hitThreshold = glyphWidth / 2 + 4;

    for (const tj of timeJumps) {
        // Use positionToPixelX for fractional position
        const x = positionToPixelX(tj.position);
        if (Math.abs(mouseX - x) <= hitThreshold) {
            return tj;
        }
    }

    return null;
}

/**
 * Hit test for time spans
 * Uses fractional positions (startPosition/endPosition) for time spans.
 */
function hitTestTimeSpan(mouseX, mouseY) {
    if (!document_wave) return null;
    const spans = document_wave.timeSpanMarkerList();
    if (!spans || !spans.length) return null;

    const signals = document_wave.signalList();
    const rowHeight = 40;
    const signalStartY = 40;
    const nameWidth = getDynamicNameWidth();

    const threshold = Math.max(6, waveCellWidth * 0.3);
    const thresholdSq = threshold * threshold;

    let bestId = null;
    let bestDistSq = thresholdSq;

    for (const ts of spans) {
        if (ts.startSignal < 0 || ts.startSignal >= signals.length) continue;
        if (ts.endSignal < 0 || ts.endSignal >= signals.length) continue;

        // Use positionToPixelX for fractional positions
        const p1x = positionToPixelX(ts.startPosition);
        const p1y = signalStartY + ts.startSignal * rowHeight + rowHeight / 2;
        const p2x = positionToPixelX(ts.endPosition);
        const p2y = signalStartY + ts.endSignal * rowHeight + rowHeight / 2;

        const style = ts.style || '-|';
        
        // Get line segments based on style
        const segments = [];
        if (style === '-|-') {
            // Z-Shape
            const midX = p1x + (p2x - p1x) / 2;
            segments.push({ x1: p1x, y1: p1y, x2: midX, y2: p1y });
            segments.push({ x1: midX, y1: p1y, x2: midX, y2: p2y });
            segments.push({ x1: midX, y1: p2y, x2: p2x, y2: p2y });
        } else if (style === '|-') {
            // Corner: vertical first, then horizontal
            segments.push({ x1: p1x, y1: p1y, x2: p1x, y2: p2y });
            segments.push({ x1: p1x, y1: p2y, x2: p2x, y2: p2y });
        } else {
            // L-Shape -|
            segments.push({ x1: p1x, y1: p1y, x2: p2x, y2: p1y });
            segments.push({ x1: p2x, y1: p1y, x2: p2x, y2: p2y });
        }

        let minDistSq = Infinity;
        for (const seg of segments) {
            const dist = pointToSegmentDistSq(mouseX, mouseY, seg.x1, seg.y1, seg.x2, seg.y2);
            if (dist < minDistSq) minDistSq = dist;
        }

        if (minDistSq < bestDistSq) {
            bestDistSq = minDistSq;
            bestId = ts;
        }
    }

    return bestId;
}

/**
 * Hit test for arrow endpoints (start/end head positions).
 * Used by the select-object tool to drag and re-place arrow heads (issue #7).
 * @param {number} mouseX - Mouse X coordinate
 * @param {number} mouseY - Mouse Y coordinate
 * @returns {Object|null} { arrow, endpoint: 'start'|'end' } or null
 */
function hitTestArrowEndpoint(mouseX, mouseY) {
    if (!document_wave) return null;
    const arrows = document_wave.arrowList();
    if (!arrows || !arrows.length) return null;

    const rowHeight = 40;
    const signalStartY = 40;
    const hitRadius = 10;

    let best = null;
    let bestDistSq = hitRadius * hitRadius;

    for (const arrow of arrows) {
        const points = [
            {
                endpoint: 'start',
                x: positionToPixelX(arrow.startPosition),
                y: signalStartY + arrow.startSignal * rowHeight + rowHeight / 2
            },
            {
                endpoint: 'end',
                x: positionToPixelX(arrow.endPosition),
                y: signalStartY + arrow.endSignal * rowHeight + rowHeight / 2
            }
        ];
        for (const pt of points) {
            const dx = mouseX - pt.x;
            const dy = mouseY - pt.y;
            const distSq = dx * dx + dy * dy;
            if (distSq < bestDistSq) {
                bestDistSq = distSq;
                best = { arrow, endpoint: pt.endpoint };
            }
        }
    }

    return best;
}

/**
 * Hit test for text annotations.
 * Returns the text annotation object if the point is inside it, or null otherwise.
 * Text annotations use maxSubSteps for positioning (canvas maximum resolution).
 */
function hitTestTextAnnotation(mouseX, mouseY) {
    if (!document_wave) return null;
    const annotations = document_wave.textAnnotationList();
    if (!annotations || !annotations.length) return null;

    const signals = document_wave.signalList();
    // Use maxSubSteps for text annotations (they can be placed at any visible grid position)
    const globalSubSteps = document_wave.subStepCount();
    const maxSubSteps = document_wave.maxSubSteps ? document_wave.maxSubSteps() : globalSubSteps;
    const maxDivisor = maxSubSteps + 1;
    const maxSubStepWidth = waveCellWidth / maxDivisor;
    const rowHeight = 40;
    const signalStartY = 40;
    const nameWidth = getDynamicNameWidth();

    for (const ann of annotations) {
        let x, y;
        let valid = false;
        
        if (ann.anchorType === 'Arrow') {
            // Find the arrow and position at its center (same as drawing code)
            const arrow = document_wave.arrowList().find(a => a.id === ann.anchorId);
            if (!arrow) continue;
            
            // Use computeArrowCurve if available for accurate positioning
            if (typeof computeArrowCurve === 'function' && typeof cubicPoint === 'function') {
                const curve = computeArrowCurve(arrow, signals, maxSubStepWidth, rowHeight, signalStartY, nameWidth);
                if (curve) {
                    const mid = cubicPoint(curve.p1x, curve.p1y, curve.ctrl1x, curve.ctrl1y, curve.ctrl2x, curve.ctrl2y, curve.p2x, curve.p2y, 0.5);
                    x = mid.x;
                    y = mid.y;
                    valid = true;
                }
            } else {
                // Fallback to simple midpoint calculation using positionToPixelX
                const p1x = positionToPixelX(arrow.startPosition);
                const p1y = signalStartY + arrow.startSignal * rowHeight + rowHeight / 2;
                const p2x = positionToPixelX(arrow.endPosition);
                const p2y = signalStartY + arrow.endSignal * rowHeight + rowHeight / 2;
                x = (p1x + p2x) / 2;
                y = (p1y + p2y) / 2;
                valid = true;
            }
        } else if (ann.anchorType === 'Signal' || ann.anchorType === 'BlankRow') {
            if (ann.anchorId < 0 || ann.anchorId >= signals.length) continue;
            
            const rowTop = signalStartY + ann.anchorId * rowHeight;
            const rowCenter = rowTop + rowHeight / 2;
            const vPos = ann.anchorType === 'BlankRow' ? 'Center' : (ann.vPos || 'Above');
            
            // Use positionToPixelX for fractional position (same as drawing)
            x = positionToPixelX(ann.position);
            
            const fontSize = ann.fontSize || 12;
            
            if (vPos === 'Above') {
                y = rowTop + 2 + fontSize / 2;
            } else if (vPos === 'Below') {
                y = rowTop + rowHeight - 2 - fontSize / 2;
            } else {
                y = rowCenter;
            }
            valid = true;
        }
        
        if (!valid) continue;

        // Estimate text bounding box
        const fontSize = ann.fontSize || 12;
        const text = ann.text || '';
        const textWidth = Math.max(text.length * fontSize * 0.6, 20); // Minimum width for easier clicking
        const textHeight = fontSize + 8; // Add padding for easier clicking

        const left = x - textWidth / 2;
        const right = x + textWidth / 2;
        const top = y - textHeight / 2;
        const bottom = y + textHeight / 2;

        if (mouseX >= left && mouseX <= right && mouseY >= top && mouseY <= bottom) {
            return ann;
        }
    }

    return null;
}

// Export for module use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { hitTestMarker, hitTestTimeJump, hitTestTimeSpan, hitTestTextAnnotation, hitTestArrowEndpoint };
}
