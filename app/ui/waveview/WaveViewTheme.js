// WaveViewTheme.js - Theme and skin helper functions

// Helper function to get skin-aware default signal color
function getThemeDefaultSignalColor() {
    // Check for skin color first, then fall back to theme CSS variable
    if (typeof getCurrentSkin === 'function') {
        return getCurrentSkin().signalColor;
    }
    return getComputedStyle(document.body).getPropertyValue('--signal-color').trim() || '#000000';
}

// Helper function to get skin-aware default arrow color
function getThemeDefaultArrowColor() {
    if (typeof getCurrentSkin === 'function') {
        return getCurrentSkin().arrowColor;
    }
    return WAVEDROM_STYLE.arrowColor;
}

// Helper function to get skin-aware default marker color
function getThemeDefaultMarkerColor() {
    if (typeof getCurrentSkin === 'function') {
        return getCurrentSkin().markerColor;
    }
    return '#00a0ff';
}

// Helper function to get skin-aware time jump color
function getThemeDefaultTimeJumpColor() {
    if (typeof getCurrentSkin === 'function') {
        return getCurrentSkin().timeJumpColor;
    }
    return '#808080';
}

// Helper function to get skin-aware time span color
function getThemeDefaultTimeSpanColor() {
    if (typeof getCurrentSkin === 'function') {
        return getCurrentSkin().timeSpanColor;
    }
    return '#00a0ff';
}

// Export for module use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        getThemeDefaultSignalColor,
        getThemeDefaultArrowColor,
        getThemeDefaultMarkerColor,
        getThemeDefaultTimeJumpColor,
        getThemeDefaultTimeSpanColor
    };
}
