/**
 * Global State - Shared variables across all modules
 * 
 * This module contains all global state variables that are shared
 * between different components of the application.
 */

// Global variables - will be initialized after DOM loads
let document_wave;
let canvas;
let ctx;
let selectedSignalIndex = -1;
let isMouseDown = false;
let lastSampleIndex = -1;
let lastSignalIndex = -1;
let currentTool = 'none'; // Default: no tool selected

// Global paint color - used when creating new signals, arrows, etc.
let selectedPaintColor = null; // null means use theme default

// Time axis display flag (controlled from menu)
let timeAxisEnabled = false;
// Hide the axis header entirely (no step numbers, no time axis) - issue #4
let axisNumbersHidden = false;
// Time axis unit and time-per-step (defaults match C++ WaveView defaults)
let timeUnit = 'ns'; // one of: 'ps','ns','μs','ms','s'
let timePerStep = 10.0; // numeric value in current unit

// Vector selection state
let vectorSelecting = false;
let vectorSelSignal = -1;
let vectorSelStartSample = -1;
let vectorSelCurrentSample = -1;

// Arrow creation state
// Position is a fractional coordinate: mainStep + fraction (e.g., 2.5 = step 2, 50% into step)
let arrowHasStart = false;
let arrowStartSignal = -1;
let arrowStartPosition = -1;  // Fractional position
let arrowPreviewSignal = -1;
let arrowPreviewPosition = -1;  // Fractional position

// Signal move state
let isMovingSignal = false;
let moveSignalIndex = -1;
let moveSignalTargetIndex = -1;
let pendingMoveSignal = false;
let pendingMoveSignalIndex = -1;
let pendingDragStartPos = { x: 0, y: 0 };

// Multi-selection state for signals
let selectedSignalIndices = [];
let lastSelectedSignalIndex = -1;

// Signal clipboard for copy/paste
let signalClipboard = null; // { signals: [...], count: n }

// Object dragging state (for select-object tool)
let isDraggingObject = false;
let draggingObjectType = null; // SelectableType
let draggingObjectId = -1;
let draggingArrowEndpoint = null; // 'start' | 'end' when dragging an arrow head
let dragObjectStartPos = { x: 0, y: 0 };
let dragObjectStartSample = -1;
let dragObjectStartSignal = -1; // For text annotations
let dragObjectUndoSaved = false; // Track if undo was saved for this drag

// Modal dialog state
let wpModalState = {
    isOpen: false,
    resolve: null,
    options: null,
    dragActive: false,
    dragOffsetX: 0,
    dragOffsetY: 0
};

/**
 * Clears all signal selection state.
 * Should be called after removing signals to prevent invalid indices.
 */
function clearSignalSelection() {
    selectedSignalIndex = -1;
    selectedSignalIndices = [];
    lastSelectedSignalIndex = -1;
}

/**
 * Updates signal selection after a signal is removed.
 * Adjusts indices that are higher than the removed index.
 * @param {number} removedIndex - The index of the removed signal
 */
function updateSelectionAfterRemove(removedIndex) {
    // Update selectedSignalIndex
    if (selectedSignalIndex === removedIndex) {
        selectedSignalIndex = -1;
    } else if (selectedSignalIndex > removedIndex) {
        selectedSignalIndex--;
    }
    
    // Update selectedSignalIndices
    selectedSignalIndices = selectedSignalIndices
        .filter(idx => idx !== removedIndex)
        .map(idx => idx > removedIndex ? idx - 1 : idx);
    
    // Update lastSelectedSignalIndex
    if (lastSelectedSignalIndex === removedIndex) {
        lastSelectedSignalIndex = -1;
    } else if (lastSelectedSignalIndex > removedIndex) {
        lastSelectedSignalIndex--;
    }
}

/**
 * Returns the time unit string for display.
 * @returns {string} The current time unit
 */
function timeUnitString() {
    return timeUnit;
}
