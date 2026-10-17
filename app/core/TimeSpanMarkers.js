// TimeSpanMarkers.js - Time span marker management for WaveDocument
// Time spans are like arrows but with sharp/angular line styles (L-shape, corner, Z-shape)
// without arrowheads

// Time span styles (sharp lines only - no curves, no arrowheads)
// -|  : L-Shape (horizontal then vertical)
// |-  : Corner (vertical then horizontal)
// -|- : Z-Shape (horizontal, vertical, horizontal)

/**
 * Adds a time span connecting two signal/position points.
 * 
 * COORDINATE SYSTEM: Fractional positions
 * Position is a decimal number where:
 * - Integer part = main step (0, 1, 2, ...)
 * - Decimal part = fraction within step (0.0 to 0.999...)
 * Example: 2.5 means mainStep 2, 50% into the step
 * 
 * @param {number} startSignal - Start signal row index
 * @param {number} startPosition - Start position (fractional)
 * @param {number} endSignal - End signal row index
 * @param {number} endPosition - End position (fractional)
 * @param {string} style - Line style (default: '-|')
 * @returns {number} Time span id on success, -1 on failure
 */
WaveDocument.prototype.addTimeSpanMarker = function(startSignal, startPosition, endSignal, endPosition, style = '-|') {
    const sigCount = this.m_signals.length;
    const sampleCount = this.m_sampleCount;
    
    if (startSignal < 0 || startSignal >= sigCount) return -1;
    if (endSignal < 0 || endSignal >= sigCount) return -1;
    
    // BlankRow is now allowed for time spans
    
    if (startPosition < 0 || startPosition > sampleCount) return -1;
    if (endPosition < 0 || endPosition > sampleCount) return -1;
    
    this.pushUndoSnapshot();
    
    const timeSpan = {
        id: this.m_nextTimeSpanMarkerId++,
        startSignal: startSignal,
        startPosition: startPosition,  // Fractional position
        endSignal: endSignal,
        endPosition: endPosition,      // Fractional position
        style: style,  // Line style: -|, |-, -|-
        color: null    // null = use theme default
    };
    
    this.m_timeSpanMarkers.push(timeSpan);
    this.dataChanged();
    return timeSpan.id;
};

/**
 * Removes a time span by id.
 * @param {number} timeSpanId - Time span identifier
 */
WaveDocument.prototype.subTimeSpanMarkerById = function(timeSpanId) {
    const index = this.m_timeSpanMarkers.findIndex(ts => ts.id === timeSpanId);
    if (index === -1) return;
    
    this.pushUndoSnapshot();
    this.m_timeSpanMarkers.splice(index, 1);
    
    // Reset or update next id
    if (this.m_timeSpanMarkers.length === 0) {
        this.m_nextTimeSpanMarkerId = 1;
    } else {
        let maxId = 0;
        for (const ts of this.m_timeSpanMarkers) {
            if (ts.id > maxId) maxId = ts.id;
        }
        this.m_nextTimeSpanMarkerId = maxId + 1;
    }
    
    this.dataChanged();
};

/**
 * Clears all time spans.
 */
WaveDocument.prototype.clearTimeSpanMarkers = function() {
    this.pushUndoSnapshot();
    this.m_timeSpanMarkers = [];
    this.m_nextTimeSpanMarkerId = 1;
    this.dataChanged();
};

/**
 * Gets all time spans.
 * @returns {Array} Array of time span objects
 */
WaveDocument.prototype.timeSpanMarkerList = function() {
    return this.m_timeSpanMarkers;
};

/**
 * Sets a specific time span color by id.
 * @param {number} timeSpanId - Time span identifier
 * @param {string} color - New color (CSS format)
 */
WaveDocument.prototype.setTimeSpanMarkerColor = function(timeSpanId, color) {
    if (!color) return;
    
    const timeSpan = this.m_timeSpanMarkers.find(ts => ts.id === timeSpanId);
    if (!timeSpan) return;
    
    this.pushUndoSnapshot();
    timeSpan.color = color;
    this.dataChanged();
};

/**
 * Sets a specific time span style by id.
 * @param {number} timeSpanId - Time span identifier
 * @param {string} style - Line style (-|, |-, -|-)
 */
WaveDocument.prototype.setTimeSpanMarkerStyle = function(timeSpanId, style) {
    if (!style) return;
    
    const timeSpan = this.m_timeSpanMarkers.find(ts => ts.id === timeSpanId);
    if (!timeSpan) return;
    
    this.pushUndoSnapshot();
    timeSpan.style = style;
    this.dataChanged();
};
