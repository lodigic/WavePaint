// Markers.js - Marker management for WaveDocument

/**
 * Text anchor types for annotations
 */
const TextAnchorType = {
    Arrow: 'Arrow',
    Signal: 'Signal',
    BlankRow: 'BlankRow',
    FreeForm: 'FreeForm'
};

/**
 * Adds a marker at a specific position.
 * 
 * COORDINATE SYSTEM: Fractional positions
 * Position is a decimal number where:
 * - Integer part = main step (0, 1, 2, ...)
 * - Decimal part = fraction within step (0.0 to 0.999...)
 * Example: 2.5 means mainStep 2, 50% into the step
 * 
 * @param {number} position - Fractional position (mainStep + fraction)
 * @param {string} color - Marker color (CSS format), null for default
 * @returns {number} Marker id on success, -1 on failure
 */
WaveDocument.prototype.addMarker = function(position, color = null) {
    const sampleCount = this.m_sampleCount;
    if (position < 0 || position > sampleCount) return -1;
    
    this.pushUndoSnapshot();
    const marker = {
        id: this.m_nextMarkerId++,
        position: position,  // Fractional position (e.g., 2.5 = step 2, 50%)
        color: color
    };
    
    this.m_markers.push(marker);
    this.dataChanged();
    return marker.id;
};

/**
 * Removes a marker by id.
 * @param {number} markerId - Marker identifier
 */
WaveDocument.prototype.subMarkerById = function(markerId) {
    const index = this.m_markers.findIndex(m => m.id === markerId);
    if (index === -1) return;
    
    this.pushUndoSnapshot();
    this.m_markers.splice(index, 1);

    // Renumber remaining markers sequentially: ids are shown as labels on the
    // canvas, so stacked markers must not keep a stale higher number after a
    // deletion (issue #2)
    for (let i = 0; i < this.m_markers.length; i++) {
        this.m_markers[i].id = i + 1;
    }
    this.m_nextMarkerId = this.m_markers.length + 1;

    this.dataChanged();
};

/**
 * Clears all markers.
 */
WaveDocument.prototype.clearMarkers = function() {
    this.pushUndoSnapshot();
    this.m_markers = [];
    this.m_nextMarkerId = 1;
    this.dataChanged();
};

/**
 * Gets all markers.
 * @returns {Array} Array of marker objects
 */
WaveDocument.prototype.markerList = function() {
    return this.m_markers;
};

/**
 * Adds a time jump at a specific position.
 * 
 * COORDINATE SYSTEM: Fractional positions
 * Position is a decimal number where:
 * - Integer part = main step (0, 1, 2, ...)
 * - Decimal part = fraction within step (0.0 to 0.999...)
 * Example: 2.5 means mainStep 2, 50% into the step
 * 
 * @param {number} position - Fractional position (mainStep + fraction)
 * @param {string} color - Time jump color, null for default
 * @returns {number} Time jump id on success, -1 on failure
 */
WaveDocument.prototype.addTimeJump = function(position, color = null) {
    const sampleCount = this.m_sampleCount;
    if (position < 0 || position > sampleCount) return -1;
    
    this.pushUndoSnapshot();
    const timeJump = {
        id: this.m_nextTimeJumpId++,
        position: position,  // Fractional position
        color: color
    };
    
    this.m_timeJumps.push(timeJump);
    this.dataChanged();
    return timeJump.id;
};

/**
 * Removes a time jump by id.
 * @param {number} timeJumpId - Time jump identifier
 */
WaveDocument.prototype.subTimeJumpById = function(timeJumpId) {
    const index = this.m_timeJumps.findIndex(tj => tj.id === timeJumpId);
    if (index === -1) return;
    
    this.pushUndoSnapshot();
    this.m_timeJumps.splice(index, 1);
    
    if (this.m_timeJumps.length === 0) {
        this.m_nextTimeJumpId = 1;
    } else {
        let maxId = 0;
        for (const tj of this.m_timeJumps) {
            if (tj.id > maxId) maxId = tj.id;
        }
        this.m_nextTimeJumpId = maxId + 1;
    }
    
    this.dataChanged();
};

/**
 * Clears all time jumps.
 */
WaveDocument.prototype.clearTimeJumps = function() {
    this.pushUndoSnapshot();
    this.m_timeJumps = [];
    this.m_nextTimeJumpId = 1;
    this.dataChanged();
};

/**
 * Gets all time jumps.
 * @returns {Array} Array of time jump objects
 */
WaveDocument.prototype.timeJumpList = function() {
    return this.m_timeJumps;
};

/**
 * Sets marker color by id.
 * @param {number} markerId - Marker identifier
 * @param {string} color - New color
 */
WaveDocument.prototype.setMarkerColorById = function(markerId, color) {
    if (!color) return;
    
    const marker = this.m_markers.find(m => m.id === markerId);
    if (!marker) return;
    
    this.pushUndoSnapshot();
    marker.color = color;
    this.dataChanged();
};

/**
 * Sets time jump color by id.
 * @param {number} timeJumpId - Time jump identifier
 * @param {string} color - New color
 */
WaveDocument.prototype.setTimeJumpColorById = function(timeJumpId, color) {
    if (!color) return;
    
    const timeJump = this.m_timeJumps.find(tj => tj.id === timeJumpId);
    if (!timeJump) return;
    
    this.pushUndoSnapshot();
    timeJump.color = color;
    this.dataChanged();
};

/**
 * Sets marker sample position by id.
 * @param {number} markerId - Marker identifier
 * @param {number} position - New fractional position
 * @param {boolean} saveUndo - Whether to save undo snapshot (default: true)
 */
WaveDocument.prototype.setMarkerPosition = function(markerId, position, saveUndo = true) {
    const marker = this.m_markers.find(m => m.id === markerId);
    if (!marker) return;
    
    const sampleCount = this.m_sampleCount;
    if (position < 0 || position > sampleCount) return;
    
    if (saveUndo) this.pushUndoSnapshot();
    marker.position = position;
    this.dataChanged();
};

/**
 * Sets time jump position by id.
 * @param {number} timeJumpId - Time jump identifier
 * @param {number} position - New fractional position
 * @param {boolean} saveUndo - Whether to save undo snapshot (default: true)
 */
WaveDocument.prototype.setTimeJumpPosition = function(timeJumpId, position, saveUndo = true) {
    const timeJump = this.m_timeJumps.find(tj => tj.id === timeJumpId);
    if (!timeJump) return;
    
    const sampleCount = this.m_sampleCount;
    if (position < 0 || position > sampleCount) return;
    
    if (saveUndo) this.pushUndoSnapshot();
    timeJump.position = position;
    this.dataChanged();
};
