// WaveViewConstants.js - Constants and configuration for WaveView

let waveCellWidth = 48; // matches C++ default (20 + 7 * 4)
const WAVE_CELL_MIN = 4;
const WAVE_CELL_MAX = 200;
const SIGNAL_NAME_WIDTH_MIN = 80;  // Minimum width for signal name column
const SIGNAL_NAME_WIDTH_MAX = 400; // Maximum width for signal name column
const SIGNAL_NAME_PADDING = 24;    // Padding after the longest name (includes group brackets area)

// Legacy constant for backward compatibility (used as fallback)
const SIGNAL_NAME_WIDTH = SIGNAL_NAME_WIDTH_MIN;

// Cached dynamic name width (calculated once per draw cycle)
let _cachedDynamicNameWidth = null;
let _cachedSignalNamesHash = null;

/**
 * Calculate the dynamic width for signal names based on actual signal names
 * @param {CanvasRenderingContext2D} ctx - Canvas context for text measurement
 * @param {Array} signals - Array of signals
 * @returns {number} - Calculated width for signal name column
 */
function calculateDynamicNameWidth(ctx, signals) {
    if (!signals || signals.length === 0) {
        return SIGNAL_NAME_WIDTH_MIN;
    }
    
    // Create a hash of signal names AND group info to detect changes
    const groupNames = signals.map(s => s.groupName || '').join('|');
    const namesHash = signals.map(s => s.name).join('|') + '::' + groupNames;
    
    // Return cached value if signals haven't changed
    if (_cachedSignalNamesHash === namesHash && _cachedDynamicNameWidth !== null) {
        return _cachedDynamicNameWidth;
    }
    
    // Calculate group bracket area width
    // Each group level needs space for the bracket
    let maxGroupDepth = 0;
    if (typeof document_wave !== 'undefined' && typeof GroupManager !== 'undefined') {
        const groups = GroupManager.getGroups(document_wave);
        maxGroupDepth = groups.reduce((max, g) => Math.max(max, (g.depth || 0) + 1), 0);
    }
    // bracketPadding (32) + levels * subgroupIndent (18) + extra space for bracket arm (10)
    const bracketAreaWidth = maxGroupDepth > 0 ? (32 + maxGroupDepth * 18 + 10) : 0;
    
    // Measure the width of each signal name
    ctx.save();
    ctx.font = '12px Arial';
    
    let maxTextWidth = 0;
    for (const signal of signals) {
        const textWidth = ctx.measureText(signal.name).width;
        if (textWidth > maxTextWidth) {
            maxTextWidth = textWidth;
        }
    }
    
    ctx.restore();
    
    // Calculate total width: bracket area + text + padding
    const calculatedWidth = bracketAreaWidth + maxTextWidth + SIGNAL_NAME_PADDING;
    
    // Clamp to min/max bounds
    const finalWidth = Math.max(SIGNAL_NAME_WIDTH_MIN, Math.min(SIGNAL_NAME_WIDTH_MAX, calculatedWidth));
    
    // Cache the result
    _cachedDynamicNameWidth = finalWidth;
    _cachedSignalNamesHash = namesHash;
    
    return finalWidth;
}

/**
 * Invalidate the cached dynamic name width (call when signals change)
 */
function invalidateDynamicNameWidthCache() {
    _cachedDynamicNameWidth = null;
    _cachedSignalNamesHash = null;
}

/**
 * Get the current dynamic name width (uses cache or calculates)
 * This is a convenience function that uses the global ctx and document_wave
 * @returns {number} - Current dynamic name width
 */
function getDynamicNameWidth() {
    if (typeof ctx !== 'undefined' && typeof document_wave !== 'undefined') {
        return calculateDynamicNameWidth(ctx, document_wave.signalList());
    }
    return SIGNAL_NAME_WIDTH_MIN;
}

// WaveDrom-style rendering constants
const WAVEDROM_STYLE = {
    // Arrow/edge colors (WaveDrom default)
    arrowColor: '#0041c4',
    
    // Arrow rendering
    arrowLineWidth: 2,
    arrowHeadSize: 8,
    arrowHeadMarkerWidth: 10,
    arrowHeadMarkerHeight: 7,
    
    // Edge indicator (polarity arrow on clock signals)
    edgeIndicatorColor: '#000000',
    edgeIndicatorFill: '#000000',
    
    // Text labels
    labelFontSize: 11,
    labelBackgroundColor: '#FFFFFF',
    labelTextColor: '#000000',
    
    // Signal wave
    waveLineWidth: 1,
    waveFillOpacity: 1,
    
    // Clock arrow (Pclk/Nclk style)
    clockArrowSize: 8
};

// Export for module use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { 
        waveCellWidth, WAVE_CELL_MIN, WAVE_CELL_MAX, 
        SIGNAL_NAME_WIDTH, SIGNAL_NAME_WIDTH_MIN, SIGNAL_NAME_WIDTH_MAX, SIGNAL_NAME_PADDING,
        calculateDynamicNameWidth, invalidateDynamicNameWidthCache, getDynamicNameWidth,
        WAVEDROM_STYLE 
    };
}
