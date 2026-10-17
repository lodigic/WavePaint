// WaveViewSelection.js - Selection management functions

/**
 * Set the currently selected object for visual highlighting.
 * Called from PropertyEditor when an object is selected.
 * @param {string|null} type - SelectableType or null to clear
 * @param {number|null} id - Object ID or null
 */
function setSelectedObject(type, id) {
    selectedObjectType = type;
    selectedObjectId = id;
    // Clear multiple selection when setting single selection
    selectedObjects = [];
    drawWaveform();
}

/**
 * Set multiple selected objects for visual highlighting.
 * Used when multiple elements overlap at a click position.
 * @param {Array} objects - Array of { type, id } objects
 */
function setSelectedObjects(objects) {
    selectedObjects = objects || [];
    // Clear single selection
    selectedObjectType = null;
    selectedObjectId = null;
    drawWaveform();
}

/**
 * Clear all object selections (single and multiple)
 */
function clearAllObjectSelections() {
    selectedObjectType = null;
    selectedObjectId = null;
    selectedObjects = [];
}

/**
 * Check if a specific object is currently selected.
 * Checks both single selection and multiple selection array.
 * @param {string} type - SelectableType
 * @param {number} id - Object ID
 * @returns {boolean}
 */
function isObjectSelected(type, id) {
    // Check single selection
    if (selectedObjectType === type && selectedObjectId === id) {
        return true;
    }
    // Check multiple selection array
    if (selectedObjects && selectedObjects.length > 0) {
        return selectedObjects.some(obj => obj.type === type && obj.id === id);
    }
    return false;
}

/**
 * End signal drag operation
 * @param {boolean} wasClick - True if this was just a click (no drag)
 * @param {number} clickedIndex - Index of clicked signal
 */
function endSignalDrag(wasClick = false, clickedIndex = -1) {
    if (isMovingSignal || pendingMoveSignal) {
        // If it was just a click (no drag), handle selection in name area
        if (wasClick && clickedIndex >= 0) {
            // Simple click without Ctrl/Shift: select only this signal
            selectedSignalIndices = [clickedIndex];
            lastSelectedSignalIndex = clickedIndex;
        }
        
        isMovingSignal = false;
        moveSignalIndex = -1;
        moveSignalTargetIndex = -1;
        pendingMoveSignal = false;
        pendingMoveSignalIndex = -1;
        pendingMoveGroup = null;
        lastRawDragIndex = -1;
        
        if (typeof selectSignal === 'function') {
            selectSignal(-1);
        } else if (typeof selectedSignalIndex !== 'undefined') {
            selectedSignalIndex = -1;
            if (typeof updateColorPicker === 'function') {
                updateColorPicker();
            }
        }
        drawWaveform();
    }
}

// Export for module use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { setSelectedObject, isObjectSelected, endSignalDrag };
}
