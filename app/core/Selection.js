// Selection.js - Selection management for WaveDocument

// Selection state is typically managed in the UI layer
// This file provides helper functions for selection operations

/**
 * Selection structure
 */
const Selection = {
    startSignal: -1,
    endSignal: -1,
    startSample: -1,
    endSample: -1,
    active: false
};

/**
 * Checks if a point is within the selection.
 * @param {number} signal - Signal index
 * @param {number} sample - Sample index
 * @returns {boolean} true if in selection
 */
function isInSelection(signal, sample) {
    if (!Selection.active) return false;
    
    const minSig = Math.min(Selection.startSignal, Selection.endSignal);
    const maxSig = Math.max(Selection.startSignal, Selection.endSignal);
    const minSamp = Math.min(Selection.startSample, Selection.endSample);
    const maxSamp = Math.max(Selection.startSample, Selection.endSample);
    
    return signal >= minSig && signal <= maxSig && 
           sample >= minSamp && sample <= maxSamp;
}

/**
 * Clears the current selection.
 */
function clearSelection() {
    Selection.startSignal = -1;
    Selection.endSignal = -1;
    Selection.startSample = -1;
    Selection.endSample = -1;
    Selection.active = false;
}
