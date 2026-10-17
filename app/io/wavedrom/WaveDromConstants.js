// WaveDromConstants.js - Constants and color definitions for WaveDrom I/O
console.log('Loading WaveDromConstants.js...');
//
// WaveDrom wave character reference:
// ---------------------------------
// Bit signals:
//   '0' - Low level
//   '1' - High level
//   'x' - Undefined/unknown
//   'z' - High-impedance
//   'u' - Pull-up (weak 1)
//   'd' - Pull-down (weak 0)
//   '.' - Extend previous state
//   '|' - Gap (extends previous with visual break)
//
// Clock signals:
//   'p' - Positive edge clock (starts low, goes high)
//   'n' - Negative edge clock (starts high, goes low)
//   'P' - Positive edge clock with arrow marker
//   'N' - Negative edge clock with arrow marker
//   'h' - High level (for clock patterns)
//   'l' - Low level (for clock patterns)
//   'H' - High level with arrow
//   'L' - Low level with arrow
//
// Vector/bus signals:
//   '=' - Data value (uses default color)
//   '2' - Data value with color 2
//   '3' - Data value with color 3
//   '4' - Data value with color 4
//   '5' - Data value with color 5
//   '6' - Data value with color 6
//   '7' - Data value with color 7
//   '8' - Data value with color 8
//   '9' - Data value with color 9

// WaveDrom color palette (matches WaveDrom skin default)
// These are the default colors - skins can override these
const WAVEDROM_COLORS = {
    '2': '#ffffff',  // White (WaveDrom default/color 2) - s7
    '3': '#ffffb4',  // Yellow (WaveDrom color 3) - s8
    '4': '#ffe0b9',  // Peach/orange (WaveDrom color 4) - s9
    '5': '#b9e0ff',  // Light blue (WaveDrom color 5) - s10
    '6': '#ccfdfe',  // Cyan (WaveDrom color 6) - s11
    '7': '#cdfdc5',  // Green (WaveDrom color 7) - s12
    '8': '#f0c1fb',  // Pink (WaveDrom color 8) - s13
    '9': '#f5c2c0',  // Light red (WaveDrom color 9) - s14
    '=': '#ffffff'   // Default = same as color 2 (per WaveDrom spec)
};

// Internal value constants for WavePaint
const WaveValue = {
    LOW: 0,
    HIGH: 1,
    UNDEFINED: -1,
    HIGHZ: 2,
    PULLUP: 3,
    PULLDOWN: 4,
    GAP: 5
};

// Valid WaveDrom wave characters for validation
const VALID_WAVE_CHARS = {
    bit: ['0', '1', 'x', 'z', 'u', 'd', '.', '|'],
    clock: ['p', 'n', 'P', 'N', 'h', 'l', 'H', 'L', '.'],
    vector: ['=', '2', '3', '4', '5', '6', '7', '8', '9', 'x', 'z', '.', '|']
};

// Edge/arrow styles in WaveDrom
const EDGE_STYLES = {
    SPLINE: '~>',       // Default curved arrow
    STRAIGHT: '->',     // Straight arrow
    SHARP: '-|>',       // Sharp/right angle
    VERTICAL_FIRST: '|->', // Vertical then horizontal
    DOUBLE: '<->',      // Bidirectional
    LINE: '-',          // Plain line (no arrowhead)
    VERTICAL_LINE: '|'  // Vertical line segment
};

/**
 * Get the current WaveDrom color palette (skin-aware)
 * @returns {Object} Color code to hex color mapping
 */
function getWaveDromColorPalette() {
    // Check if skin system is available and has WaveDrom colors
    if (typeof getCurrentSkin === 'function') {
        const skin = getCurrentSkin();
        if (skin && skin.wavedromColors) {
            return skin.wavedromColors;
        }
    }
    return WAVEDROM_COLORS;
}

/**
 * Get the standard WaveDrom colors (not affected by skin)
 * Used for importing WaveDrom files to preserve original colors
 * @returns {Object} Color code to hex color mapping
 */
function getStandardWaveDromColors() {
    return WAVEDROM_COLORS;
}

/**
 * Get WaveDrom color code from hex color
 * Uses skin-aware color palette
 * @param {string} hexColor - Hex color string
 * @returns {string} WaveDrom color code ('2'-'9' or '=')
 */
function getWaveDromColorCode(hexColor) {
    if (!hexColor) return '=';
    
    const hex = hexColor.toLowerCase();
    const palette = getWaveDromColorPalette();
    
    // First check if it matches the default color ('=')
    // This ensures we prefer '=' over '2' when colors are identical
    if (palette['='] && palette['='].toLowerCase() === hex) {
        return '=';
    }
    if (WAVEDROM_COLORS['='] && WAVEDROM_COLORS['='].toLowerCase() === hex) {
        return '=';
    }
    
    // Find match in current skin's palette (excluding '=' which we already checked)
    for (const [code, color] of Object.entries(palette)) {
        if (code !== '=' && color.toLowerCase() === hex) {
            return code;
        }
    }
    
    // Also check default colors as fallback (excluding '=')
    for (const [code, color] of Object.entries(WAVEDROM_COLORS)) {
        if (code !== '=' && color.toLowerCase() === hex) {
            return code;
        }
    }
    
    // Default to '='
    return '=';
}

/**
 * Get hex color from WaveDrom color code
 * @param {string} colorCode - WaveDrom color code ('2'-'9' or '=')
 * @returns {string} Hex color string
 */
function getColorFromWaveDromCode(colorCode) {
    const palette = getStandardWaveDromColors();
    return palette[colorCode] || palette['='];
}

// Export for use in other modules
if (typeof window !== 'undefined') {
    window.WaveDromConstants = {
        WAVEDROM_COLORS,
        WaveValue,
        VALID_WAVE_CHARS,
        EDGE_STYLES,
        getWaveDromColorPalette,
        getStandardWaveDromColors,
        getWaveDromColorCode,
        getColorFromWaveDromCode
    };
}
