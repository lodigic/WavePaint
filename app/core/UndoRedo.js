// UndoRedo.js - Undo/Redo functionality for WaveDocument

/**
 * Maximum undo stack size
 */
const MAX_UNDO_STACK_SIZE = 100;

/**
 * Pushes current document state to undo stack.
 */
WaveDocument.prototype.pushUndoSnapshot = function() {
    // Create a deep copy of current state
    // Groups now live on signal.groupName and do not need to be stored separately
    const snapshot = {
        signals: JSON.parse(JSON.stringify(this.m_signals)),
        markers: JSON.parse(JSON.stringify(this.m_markers)),
        timeJumps: JSON.parse(JSON.stringify(this.m_timeJumps)),
        timeSpanMarkers: JSON.parse(JSON.stringify(this.m_timeSpanMarkers)),
        arrows: JSON.parse(JSON.stringify(this.m_arrows)),
        textAnnotations: JSON.parse(JSON.stringify(this.m_textAnnotations)),
        sampleCount: this.m_sampleCount,
        subStepCount: this.m_subStepCount
    };
    
    this.m_undoStack.push(snapshot);
    
    // Limit stack size
    if (this.m_undoStack.length > MAX_UNDO_STACK_SIZE) {
        this.m_undoStack.shift();
    }
    
    // Clear redo stack on new action
    this.m_redoStack = [];
};

/**
 * Undoes the last operation.
 * @returns {boolean} true if undo succeeded
 */
WaveDocument.prototype.undo = function() {
    if (this.m_undoStack.length === 0) return false;
    
    // Save current state to redo stack
    const currentState = {
        signals: JSON.parse(JSON.stringify(this.m_signals)),
        markers: JSON.parse(JSON.stringify(this.m_markers)),
        timeJumps: JSON.parse(JSON.stringify(this.m_timeJumps)),
        timeSpanMarkers: JSON.parse(JSON.stringify(this.m_timeSpanMarkers)),
        arrows: JSON.parse(JSON.stringify(this.m_arrows)),
        textAnnotations: JSON.parse(JSON.stringify(this.m_textAnnotations)),
        sampleCount: this.m_sampleCount,
        subStepCount: this.m_subStepCount
    };
    this.m_redoStack.push(currentState);
    
    // Restore previous state
    const snapshot = this.m_undoStack.pop();
    this.m_signals = snapshot.signals;
    this.m_markers = snapshot.markers;
    this.m_timeJumps = snapshot.timeJumps;
    this.m_timeSpanMarkers = snapshot.timeSpanMarkers;
    this.m_arrows = snapshot.arrows;
    this.m_textAnnotations = snapshot.textAnnotations;
    this.m_sampleCount = snapshot.sampleCount;
    this.m_subStepCount = snapshot.subStepCount;
    
    this.dataChanged();
    return true;
};

/**
 * Redoes the last undone operation.
 * @returns {boolean} true if redo succeeded
 */
WaveDocument.prototype.redo = function() {
    if (this.m_redoStack.length === 0) return false;
    
    // Save current state to undo stack
    const currentState = {
        signals: JSON.parse(JSON.stringify(this.m_signals)),
        markers: JSON.parse(JSON.stringify(this.m_markers)),
        timeJumps: JSON.parse(JSON.stringify(this.m_timeJumps)),
        timeSpanMarkers: JSON.parse(JSON.stringify(this.m_timeSpanMarkers)),
        arrows: JSON.parse(JSON.stringify(this.m_arrows)),
        textAnnotations: JSON.parse(JSON.stringify(this.m_textAnnotations)),
        sampleCount: this.m_sampleCount,
        subStepCount: this.m_subStepCount
    };
    this.m_undoStack.push(currentState);
    
    // Restore redo state
    const snapshot = this.m_redoStack.pop();
    this.m_signals = snapshot.signals;
    this.m_markers = snapshot.markers;
    this.m_timeJumps = snapshot.timeJumps;
    this.m_timeSpanMarkers = snapshot.timeSpanMarkers;
    this.m_arrows = snapshot.arrows;
    this.m_textAnnotations = snapshot.textAnnotations;
    this.m_sampleCount = snapshot.sampleCount;
    this.m_subStepCount = snapshot.subStepCount;
    
    this.dataChanged();
    return true;
};

/**
 * Clears undo and redo stacks.
 */
WaveDocument.prototype.clearUndoHistory = function() {
    this.m_undoStack = [];
    this.m_redoStack = [];
};

/**
 * Checks if undo is available.
 * @returns {boolean} true if can undo
 */
WaveDocument.prototype.canUndo = function() {
    return this.m_undoStack.length > 0;
};

/**
 * Checks if redo is available.
 * @returns {boolean} true if can redo
 */
WaveDocument.prototype.canRedo = function() {
    return this.m_redoStack.length > 0;
};
