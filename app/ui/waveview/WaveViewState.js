// WaveViewState.js - WaveView-specific state variables
// NOTE: Common state variables are defined in js/GlobalState.js
// This file only contains WaveView-specific state that is NOT in GlobalState.js

// Text exclusion zones - areas where signals/vectors should not be drawn
let textExclusionZones = [];

// Preview states for tools - using fractional positions
// Position = mainStep + fraction (e.g., 2.5 = step 2, 50% into step)
let markerPreviewPosition = -1;
let timeJumpPreviewPosition = -1;
let timeSpanHasStart = false;
let timeSpanStartSignal = -1;
let timeSpanStartPosition = -1;
let timeSpanPreviewSignal = -1;
let timeSpanPreviewPosition = -1;
let textAnnotationPreviewSignal = -1;
let textAnnotationPreviewPosition = -1;  // Text uses fractional positions
let textAnnotationPreviewArrow = -1;
let textAnnotationPreviewVPos = 'Above';
let paintUndoActive = false;

// Cut tool state
let cutHasStart = false;
let cutStartSample = -1;
let cutPreviewSample = -1;

// Range selection state (for select tool with copy/paste)
let rangeSelecting = false;
let rangeSelStartSignal = -1;
let rangeSelStartSample = -1;
let rangeSelEndSignal = -1;
let rangeSelEndSample = -1;
let rangeSelActive = false; // true when we have a confirmed selection

// Clipboard state for copy/paste
let clipboard = null; // { signals: [...], startSignal: n, startSample: n, width: n, height: n }
let pastePreviewSample = -1; // sample where paste will occur
let pastePreviewSignal = -1; // signal where paste will occur

// Group drag state
let pendingMoveGroup = null; // Group being dragged (or null)
let lastRawDragIndex = -1; // Last raw (visual) index during drag to prevent wobbling

// Selected object state (for property editor)
let selectedObjectType = null;
let selectedObjectId = null;

// Multiple selected objects for context menu highlighting
let selectedObjects = []; // Array of { type, id } for multiple selection highlighting

// State accessor functions
function getTextExclusionZones() {
    return textExclusionZones;
}

function setTextExclusionZones(zones) {
    textExclusionZones = zones;
}

function clearTextExclusionZones() {
    textExclusionZones = [];
}

// Export for module use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        getTextExclusionZones,
        setTextExclusionZones,
        clearTextExclusionZones
    };
}
