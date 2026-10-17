// WaveViewTextExclusion.js - Text exclusion zone management

/**
 * Calculate text exclusion zones for all text annotations
 * These zones mark areas where signals/vectors should not be drawn
 * @returns {Array} Array of exclusion zone rectangles {x, y, width, height}
 */
function calculateTextExclusionZones(signals, subStepWidth, rowHeight, signalStartY, nameWidth) {
    const zones = [];
    if (!document_wave) return zones;
    
    const annotations = document_wave.textAnnotationList();
    if (!annotations || annotations.length === 0) return zones;
    
    const arrows = document_wave.arrowList();
    
    // Create a temporary canvas context for text measurement
    const tempCanvas = document.createElement('canvas');
    const tempCtx = tempCanvas.getContext('2d');
    
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
                x = nameWidth + (ann.sample + 0.5) * subStepWidth;
                
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
        tempCtx.font = `${ann.bold ? 'bold ' : ''}${fontSize}px Arial`;
        const metrics = tempCtx.measureText(ann.text || '');
        const textWidth = metrics.width;
        const textHeight = fontSize;
        
        // Calculate text Y position
        let textY = y;
        if (ann.anchorType !== 'Arrow') {
            const vPos = ann.anchorType === 'BlankRow' ? 'Center' : (ann.vPos || 'Above');
            if (vPos === 'Above') {
                textY = y + fontSize / 2;
            } else if (vPos === 'Below') {
                textY = y - fontSize / 2;
            }
        }
        
        // Add padding around the text
        const padding = 3;
        zones.push({
            x: x - textWidth / 2 - padding,
            y: textY - textHeight / 2 - padding,
            width: textWidth + padding * 2,
            height: textHeight + padding * 2
        });
    }
    
    return zones;
}

/**
 * Check if a point or line segment intersects with any text exclusion zone
 * @param {number} x1 - Start X
 * @param {number} y1 - Start Y  
 * @param {number} x2 - End X (optional, if checking a line)
 * @param {number} y2 - End Y (optional, if checking a line)
 * @returns {boolean} True if intersects with any exclusion zone
 */
function isInTextExclusionZone(x1, y1, x2 = null, y2 = null) {
    for (const zone of textExclusionZones) {
        // Check if point is in zone
        if (x1 >= zone.x && x1 <= zone.x + zone.width &&
            y1 >= zone.y && y1 <= zone.y + zone.height) {
            return true;
        }
        
        // If checking a line segment, also check end point and line intersection
        if (x2 !== null && y2 !== null) {
            if (x2 >= zone.x && x2 <= zone.x + zone.width &&
                y2 >= zone.y && y2 <= zone.y + zone.height) {
                return true;
            }
            
            // Check if line segment intersects the zone rectangle
            if (lineIntersectsRect(x1, y1, x2, y2, zone.x, zone.y, zone.width, zone.height)) {
                return true;
            }
        }
    }
    return false;
}

/**
 * Check if a line segment intersects a rectangle
 */
function lineIntersectsRect(x1, y1, x2, y2, rx, ry, rw, rh) {
    // Check if line segment intersects any edge of the rectangle
    const left = rx;
    const right = rx + rw;
    const top = ry;
    const bottom = ry + rh;
    
    // Check if both points are on same side of rectangle
    if ((x1 < left && x2 < left) || (x1 > right && x2 > right)) return false;
    if ((y1 < top && y2 < top) || (y1 > bottom && y2 > bottom)) return false;
    
    // If line is within rectangle bounds, it likely intersects
    return true;
}

// Export for module use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { calculateTextExclusionZones, isInTextExclusionZone, lineIntersectsRect };
}
