// Skins.js - Visual skin definitions for WavePaint
// Each skin defines colors for signals and arrows ONLY
// Skins do NOT affect canvas background, grid, or interface colors

/**
 * Skin definitions with colors for signals and arrows.
 * These colors are applied to: signals, vectors, arrows, markers, time jumps
 * and are used in both the app and WaveDrom export.
 * 
 * NOTE: Skins do NOT affect canvas or interface colors - those are controlled by Theme.
 * 
 * WaveDrom skin reference: https://github.com/wavedrom/wavedrom/tree/trunk/skins
 */
const WavePaintSkins = {
    // Black - Pure black, 100% negro
    black: {
        id: 'black',
        name: 'Black',
        description: 'Pure black - 100% negro',
        // Signal colors - pure black
        signalColor: '#000000',
        signalColorBit: '#000000',
        // Vector colors (WaveDrom data bus colors) - all black
        vectorColors: ['#000000', '#000000', '#000000', '#000000', '#000000', '#000000', '#000000', '#000000'],
        vectorOutlineColor: '#000000',
        // Arrow color - pure black
        arrowColor: '#000000',
        // Marker color (vertical markers) - pure black
        markerColor: '#000000',
        // Time jump color - pure black
        timeJumpColor: '#000000',
        // Time span marker color - pure black
        timeSpanColor: '#000000',
        // WaveDrom export skin name (for head config)
        wavedromSkin: 'dark',
        // WaveDrom color palette for data buses (maps to WaveDrom =,2,3,4,5,6,7,8,9)
        wavedromColors: {
            '=': '#000000',
            '2': '#000000',
            '3': '#000000',
            '4': '#000000',
            '5': '#000000',
            '6': '#000000',
            '7': '#000000',
            '8': '#000000',
            '9': '#000000'
        }
    },

    // Ocean - Blue/teal inspired, calm and professional
    ocean: {
        id: 'ocean',
        name: 'Ocean',
        description: 'Cool blue and teal palette - calm, professional',
        signalColor: '#3d5a80',
        signalColorBit: '#98c1d9',
        vectorColors: ['#1b4965', '#3d5a80', '#5fa8d3', '#62b6cb', '#89c2d9', '#a9d6e5', '#cae9f5', '#bee9e8'],
        vectorOutlineColor: '#98c1d9',
        arrowColor: '#ff6b35',
        markerColor: '#ee6c4d',
        timeJumpColor: '#ee6c4d',
        timeSpanColor: '#5fa8d3',
        wavedromSkin: 'default',
        wavedromColors: {
            '=': '#3d5a80',
            '2': '#5fa8d3',
            '3': '#62b6cb',
            '4': '#89c2d9',
            '5': '#a9d6e5',
            '6': '#cae9f5',
            '7': '#bee9e8',
            '8': '#1b4965',
            '9': '#98c1d9'
        }
    },

    // Sunset - Warm orange/pink gradient, vibrant and energetic
    sunset: {
        id: 'sunset',
        name: 'Sunset',
        description: 'Warm orange and pink tones - vibrant, energetic',
        signalColor: '#ff6f61',
        signalColorBit: '#ff9a8b',
        vectorColors: ['#ff6b6b', '#f8a978', '#ffc078', '#ffdf91', '#f9cb40', '#ff8c94', '#ffaaa5', '#ffd3b6'],
        vectorOutlineColor: '#ff9a8b',
        arrowColor: '#00d9ff',
        markerColor: '#a855f7',
        timeJumpColor: '#c084fc',
        timeSpanColor: '#fbbf24',
        wavedromSkin: 'default',
        wavedromColors: {
            '=': '#ff6b6b',
            '2': '#f8a978',
            '3': '#ffc078',
            '4': '#ffdf91',
            '5': '#f9cb40',
            '6': '#ff8c94',
            '7': '#ffaaa5',
            '8': '#ffd3b6',
            '9': '#ff9a8b'
        }
    },

    // Forest - Green/earth tones, natural and balanced
    forest: {
        id: 'forest',
        name: 'Forest',
        description: 'Natural green and earth tones - organic, balanced',
        signalColor: '#2d6a4f',
        signalColorBit: '#40916c',
        vectorColors: ['#1b4332', '#2d6a4f', '#40916c', '#52b788', '#74c69d', '#95d5b2', '#b7e4c7', '#d8f3dc'],
        vectorOutlineColor: '#95d5b2',
        arrowColor: '#f4a261',
        markerColor: '#e76f51',
        timeJumpColor: '#e9c46a',
        timeSpanColor: '#74c69d',
        wavedromSkin: 'default',
        wavedromColors: {
            '=': '#2d6a4f',
            '2': '#40916c',
            '3': '#52b788',
            '4': '#74c69d',
            '5': '#95d5b2',
            '6': '#b7e4c7',
            '7': '#d8f3dc',
            '8': '#1b4332',
            '9': '#a7c957'
        }
    },

    // Neon - Cyberpunk inspired, bright contrasts
    neon: {
        id: 'neon',
        name: 'Neon',
        description: 'Cyberpunk neon colors - high contrast, futuristic',
        signalColor: '#00ff88',
        signalColorBit: '#00ff88',
        vectorColors: ['#ff00ff', '#00ffff', '#ff0080', '#80ff00', '#ff8000', '#0080ff', '#ff0040', '#40ff00'],
        vectorOutlineColor: '#00ff88',
        arrowColor: '#ff00ff',
        markerColor: '#00ffff',
        timeJumpColor: '#ff0080',
        timeSpanColor: '#00ffff',
        wavedromSkin: 'dark',
        wavedromColors: {
            '=': '#00ff88',
            '2': '#ff00ff',
            '3': '#00ffff',
            '4': '#ff0080',
            '5': '#80ff00',
            '6': '#ff8000',
            '7': '#0080ff',
            '8': '#ff0040',
            '9': '#40ff00'
        }
    }
};

// Current active skin (default to black)
let currentSkin = 'black';

/**
 * Get the current active skin object
 * @returns {Object} The current skin definition
 */
function getCurrentSkin() {
    return WavePaintSkins[currentSkin] || WavePaintSkins.black;
}

/**
 * Get skin by ID
 * @param {string} skinId - Skin identifier
 * @returns {Object} The skin definition
 */
function getSkin(skinId) {
    return WavePaintSkins[skinId] || WavePaintSkins.black;
}

/**
 * Get all available skins
 * @returns {Object} All skin definitions
 */
function getAllSkins() {
    return WavePaintSkins;
}

/**
 * Set the active skin and apply it
 * @param {string} skinId - Skin identifier
 */
function setCurrentSkin(skinId) {
    if (!WavePaintSkins[skinId]) {
        console.warn(`Skin '${skinId}' not found, using 'black'`);
        skinId = 'black';
    }
    
    currentSkin = skinId;
    localStorage.setItem('wavepaintSkin', skinId);
    
    applySkinToDocument();
    
    // Update paint color box to reflect new skin color
    if (typeof updatePaintColorBox === 'function') {
        updatePaintColorBox();
    }
    
    // Trigger redraw if document and canvas are ready
    if (typeof drawWaveform === 'function') {
        drawWaveform();
    }
}

/**
 * Apply current skin colors to CSS custom properties
 * NOTE: Skins only affect signal/arrow colors, NOT canvas or interface
 */
function applySkinToDocument() {
    const skin = getCurrentSkin();
    const root = document.documentElement;
    
    // Apply skin colors as CSS custom properties (signals and arrows only)
    root.style.setProperty('--skin-signal-color', skin.signalColor);
    root.style.setProperty('--skin-signal-color-bit', skin.signalColorBit);
    root.style.setProperty('--skin-vector-outline', skin.vectorOutlineColor);
    root.style.setProperty('--skin-arrow-color', skin.arrowColor);
    root.style.setProperty('--skin-marker-color', skin.markerColor);
    root.style.setProperty('--skin-timejump-color', skin.timeJumpColor);
    root.style.setProperty('--skin-timespan-color', skin.timeSpanColor);
    
    // Set vector colors array
    skin.vectorColors.forEach((color, index) => {
        root.style.setProperty(`--skin-vector-color-${index}`, color);
    });
    
    // Add skin class to body for CSS hooks
    document.body.classList.remove(...Object.keys(WavePaintSkins).map(s => `skin-${s}`));
    document.body.classList.add(`skin-${skin.id}`);
}

/**
 * Get the signal color from current skin (or custom if set)
 * @param {string|null} customColor - Custom override color
 * @returns {string} Color hex value
 */
function getSkinSignalColor(customColor = null) {
    if (customColor) return customColor;
    return getCurrentSkin().signalColor;
}

/**
 * Get the arrow color from current skin (or custom if set)
 * @param {string|null} customColor - Custom override color  
 * @returns {string} Color hex value
 */
function getSkinArrowColor(customColor = null) {
    if (customColor) return customColor;
    return getCurrentSkin().arrowColor;
}

/**
 * Get the marker color from current skin (or custom if set)
 * @param {string|null} customColor - Custom override color
 * @returns {string} Color hex value
 */
function getSkinMarkerColor(customColor = null) {
    if (customColor) return customColor;
    return getCurrentSkin().markerColor;
}

/**
 * Get the time jump color from current skin (or custom if set)
 * @param {string|null} customColor - Custom override color
 * @returns {string} Color hex value
 */
function getSkinTimeJumpColor(customColor = null) {
    if (customColor) return customColor;
    return getCurrentSkin().timeJumpColor;
}

/**
 * Get a vector color from the skin palette by index
 * @param {number} index - Color index (0-7)
 * @param {string|null} customColor - Custom override color
 * @returns {string} Color hex value
 */
function getSkinVectorColor(index, customColor = null) {
    if (customColor) return customColor;
    const skin = getCurrentSkin();
    const safeIndex = Math.abs(index) % skin.vectorColors.length;
    return skin.vectorColors[safeIndex];
}

/**
 * Get WaveDrom config object for current skin
 * Includes skin name and color overrides for export
 * @returns {Object} WaveDrom config object
 */
function getWaveDromSkinConfig() {
    const skin = getCurrentSkin();
    return {
        skin: skin.wavedromSkin,
        // Custom head config for styling
        head: {
            tick: 0
        },
        // Store WavePaint skin info for reference
        _wavepaint: {
            skin: skin.id,
            colors: skin.wavedromColors
        }
    };
}

/**
 * Get WaveDrom color code from skin colors
 * Maps hex color to WaveDrom character (=,2,3,4,5,6,7,8,9)
 * @param {string} hexColor - Hex color to match
 * @returns {string} WaveDrom color code
 */
function getWaveDromColorCodeFromSkin(hexColor) {
    if (!hexColor) return '=';
    
    const skin = getCurrentSkin();
    const hex = hexColor.toLowerCase();
    
    // Find match in skin's WaveDrom colors
    for (const [code, color] of Object.entries(skin.wavedromColors)) {
        if (color.toLowerCase() === hex) {
            return code;
        }
    }
    
    // Try to find closest by index in vector colors
    const vectorIndex = skin.vectorColors.findIndex(c => c.toLowerCase() === hex);
    if (vectorIndex >= 0) {
        const codes = ['=', '2', '3', '4', '5', '6', '7', '8', '9'];
        return codes[vectorIndex % codes.length];
    }
    
    return '=';
}

/**
 * Initialize skin system - load from storage and apply
 */
function initSkins() {
    const savedSkin = localStorage.getItem('wavepaintSkin');
    if (savedSkin && WavePaintSkins[savedSkin]) {
        currentSkin = savedSkin;
    }
    applySkinToDocument();
}

// Initialize on load if document is ready, otherwise defer
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initSkins);
} else {
    initSkins();
}
