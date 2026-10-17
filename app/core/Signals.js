// Signals.js - Signal manipulation for WaveDocument
// NOTE: Groups use the simplified model with signal.groupName
// There is no m_signalGroups array; groups are discovered dynamically

/**
 * Removes a signal by index.
 * @param {number} index - Signal index
 */
WaveDocument.prototype.removeSignal = function(index) {
    if (index < 0 || index >= this.m_signals.length) return;
    
    this.pushUndoSnapshot();
    this.m_signals.splice(index, 1);
    
    // No need to update group indices - groups are discovered dynamically from groupName
    
    // Update arrows - remove arrows that reference the deleted signal, update indices for others
    this.m_arrows = this.m_arrows.filter(arrow => {
        return arrow.startSignal !== index && arrow.endSignal !== index;
    });
    for (const arrow of this.m_arrows) {
        if (arrow.startSignal > index) arrow.startSignal--;
        if (arrow.endSignal > index) arrow.endSignal--;
    }
    
    // Update time span markers - remove those that reference the deleted signal, update indices for others
    this.m_timeSpanMarkers = this.m_timeSpanMarkers.filter(ts => {
        return ts.startSignal !== index && ts.endSignal !== index;
    });
    for (const ts of this.m_timeSpanMarkers) {
        if (ts.startSignal > index) ts.startSignal--;
        if (ts.endSignal > index) ts.endSignal--;
    }
    
    // Invalidate WaveDrom preserved data since structure changed
    this.invalidateWaveDromPreservedData();
    
    this.dataChanged();
};

/**
 * Moves a signal to a new position.
 * The signal's groupName moves with it (it's just an attribute).
 * @param {number} fromIndex - Current signal index
 * @param {number} toIndex - Target signal index
 */
WaveDocument.prototype.moveSignal = function(fromIndex, toIndex) {
    if (fromIndex < 0 || fromIndex >= this.m_signals.length) return;
    if (toIndex < 0 || toIndex >= this.m_signals.length) return;
    if (fromIndex === toIndex) return;
    
    this.pushUndoSnapshot();
    
    const signal = this.m_signals[fromIndex];
    
    // Move the signal (groupName stays with it as an attribute)
    this.m_signals.splice(fromIndex, 1);
    this.m_signals.splice(toIndex, 0, signal);
    
    // Helper function to update indices
    const updateIndex = (idx) => {
        if (fromIndex < toIndex) {
            // Moving down
            if (idx === fromIndex) return toIndex;
            if (idx > fromIndex && idx <= toIndex) return idx - 1;
            return idx;
        } else {
            // Moving up
            if (idx === fromIndex) return toIndex;
            if (idx >= toIndex && idx < fromIndex) return idx + 1;
            return idx;
        }
    };
    
    // Update arrow indices
    console.log(`[moveSignal] Moving signal from ${fromIndex} to ${toIndex}`);
    console.log(`[moveSignal] Arrows before update:`, JSON.stringify(this.m_arrows.map(a => ({id: a.id, start: a.startSignal, end: a.endSignal}))));
    for (const arrow of this.m_arrows) {
        const oldStart = arrow.startSignal;
        const oldEnd = arrow.endSignal;
        arrow.startSignal = updateIndex(arrow.startSignal);
        arrow.endSignal = updateIndex(arrow.endSignal);
        console.log(`[moveSignal] Arrow ${arrow.id}: start ${oldStart} -> ${arrow.startSignal}, end ${oldEnd} -> ${arrow.endSignal}`);
    }
    console.log(`[moveSignal] Arrows after update:`, JSON.stringify(this.m_arrows.map(a => ({id: a.id, start: a.startSignal, end: a.endSignal}))));
    
    // Update time span marker indices
    for (const ts of this.m_timeSpanMarkers) {
        ts.startSignal = updateIndex(ts.startSignal);
        ts.endSignal = updateIndex(ts.endSignal);
    }
    
    // Invalidate WaveDrom preserved data since signal order changed
    this.invalidateWaveDromPreservedData();
    
    // No need to update group indices - groups are discovered dynamically from groupName
    
    this.dataChanged();
};

/**
 * Moves multiple signals to a new position (preserving their relative order).
 * If signals move within their group range, they stay in the group.
 * If they move outside the group, they're removed from the group.
 * @param {number[]} indices - Array of signal indices to move
 * @param {number} toIndex - Target position for the first signal after move
 * @returns {number[]} New indices of the moved signals
 */
WaveDocument.prototype.moveSignals = function(indices, toIndex) {
    if (!indices || indices.length === 0) return [];
    
    const totalSignals = this.m_signals.length;
    
    // Sort indices in ascending order
    const sortedIndices = [...indices].sort((a, b) => a - b);
    
    // Validate all indices
    for (const idx of sortedIndices) {
        if (idx < 0 || idx >= totalSignals) return [];
    }
    
    // Clamp toIndex
    if (toIndex < 0) toIndex = 0;
    if (toIndex > totalSignals - sortedIndices.length) {
        toIndex = totalSignals - sortedIndices.length;
    }
    
    // Check if the move would result in no change
    const minIdx = sortedIndices[0];
    if (toIndex === minIdx) return [...sortedIndices]; // No change needed
    
    this.pushUndoSnapshot();
    
    // Extract signals in order (preserving their relative order)
    // groupName moves with the signal as an attribute
    const signalsToMove = sortedIndices.map(idx => this.m_signals[idx]);
    
    // Create a new array without the selected signals
    const remainingSignals = this.m_signals.filter((_, idx) => !sortedIndices.includes(idx));
    
    // Helper function to calculate new index after removal and insertion
    const calculateNewIndex = (oldIdx) => {
        // Check if this index was one of the moved signals
        const movedPosition = sortedIndices.indexOf(oldIdx);
        if (movedPosition !== -1) {
            // This signal was moved - return its new position
            return toIndex + movedPosition;
        }
        
        // Calculate offset from removed signals
        let offset = 0;
        for (const removedIdx of sortedIndices) {
            if (removedIdx < oldIdx) offset++;
        }
        let newIdx = oldIdx - offset;
        
        // Adjust for insertion
        if (newIdx >= toIndex) {
            newIdx += signalsToMove.length;
        }
        return newIdx;
    };
    
    // Update arrow indices
    for (const arrow of this.m_arrows) {
        arrow.startSignal = calculateNewIndex(arrow.startSignal);
        arrow.endSignal = calculateNewIndex(arrow.endSignal);
    }
    
    // Update time span marker indices
    for (const ts of this.m_timeSpanMarkers) {
        ts.startSignal = calculateNewIndex(ts.startSignal);
        ts.endSignal = calculateNewIndex(ts.endSignal);
    }
    
    // No need to update group indices - groups are discovered dynamically from groupName
    
    // Insert the signals at the target position
    const newSignals = [
        ...remainingSignals.slice(0, toIndex),
        ...signalsToMove,
        ...remainingSignals.slice(toIndex)
    ];
    
    this.m_signals = newSignals;
    
    // Calculate new indices
    const newIndices = signalsToMove.map((_, i) => toIndex + i);
    
    // Invalidate WaveDrom preserved data since signal order changed
    this.invalidateWaveDromPreservedData();
    
    this.dataChanged();
    return newIndices;
};

/**
 * Removes multiple signals by indices.
 * @param {number[]} indices - Array of signal indices to remove
 */
WaveDocument.prototype.removeSignals = function(indices) {
    if (!indices || indices.length === 0) return;
    
    // Sort indices in descending order to remove from end first
    const sortedIndices = [...indices].sort((a, b) => b - a);
    
    // Validate at least one index is valid
    const hasValidIndex = sortedIndices.some(idx => idx >= 0 && idx < this.m_signals.length);
    if (!hasValidIndex) return;
    
    this.pushUndoSnapshot();
    
    for (const index of sortedIndices) {
        if (index < 0 || index >= this.m_signals.length) continue;
        
        this.m_signals.splice(index, 1);
        
        // No need to update group indices - groups are discovered dynamically from groupName
        
        // Update arrows - remove arrows that reference the deleted signal, update indices for others
        this.m_arrows = this.m_arrows.filter(arrow => {
            return arrow.startSignal !== index && arrow.endSignal !== index;
        });
        for (const arrow of this.m_arrows) {
            if (arrow.startSignal > index) arrow.startSignal--;
            if (arrow.endSignal > index) arrow.endSignal--;
        }
        
        // Update time span markers - remove those that reference the deleted signal, update indices for others
        this.m_timeSpanMarkers = this.m_timeSpanMarkers.filter(ts => {
            return ts.startSignal !== index && ts.endSignal !== index;
        });
        for (const ts of this.m_timeSpanMarkers) {
            if (ts.startSignal > index) ts.startSignal--;
            if (ts.endSignal > index) ts.endSignal--;
        }
    }
    
    // Invalidate WaveDrom preserved data since structure changed
    this.invalidateWaveDromPreservedData();
    
    this.dataChanged();
};

/**
 * Sets color for multiple signals.
 * @param {number[]} indices - Array of signal indices
 * @param {string} color - New color
 */
WaveDocument.prototype.setSignalsColor = function(indices, color) {
    if (!indices || indices.length === 0) return;
    
    // Validate at least one index is valid
    const hasValidIndex = indices.some(idx => idx >= 0 && idx < this.m_signals.length);
    if (!hasValidIndex) return;
    
    this.pushUndoSnapshot();
    
    for (const index of indices) {
        if (index >= 0 && index < this.m_signals.length) {
            this.m_signals[index].color = color;
        }
    }
    
    this.dataChanged();
};

/**
 * Sets signal color.
 * @param {number} index - Signal index
 * @param {string} color - New color
 */
WaveDocument.prototype.setSignalColor = function(index, color) {
    if (index < 0 || index >= this.m_signals.length) return;
    if (color === undefined) return;
    
    this.pushUndoSnapshot();
    this.m_signals[index].color = color;
    this.dataChanged();
};

/**
 * Sets signal name.
 * @param {number} index - Signal index
 * @param {string} name - New name
 */
WaveDocument.prototype.setSignalName = function(index, name) {
    if (index < 0 || index >= this.m_signals.length) return;
    if (name === undefined) return;
    
    this.pushUndoSnapshot();
    this.m_signals[index].name = name;
    this.dataChanged();
};

/**
 * Sets signal rise and fall times.
 * @param {number} index - Signal index
 * @param {number} riseTime - Rise time in sub-steps
 * @param {number} fallTime - Fall time in sub-steps
 */
WaveDocument.prototype.setSignalRiseFallTime = function(index, riseTime, fallTime) {
    if (index < 0 || index >= this.m_signals.length) return;
    if (riseTime === undefined || fallTime === undefined) return;
    
    this.pushUndoSnapshot();
    this.m_signals[index].riseTime = riseTime;
    this.m_signals[index].fallTime = fallTime;
    this.dataChanged();
};

/**
 * Clears all signals.
 */
WaveDocument.prototype.clearAllSignals = function() {
    this.pushUndoSnapshot();
    // Remove text annotations anchored to signals or blank rows
    if (Array.isArray(this.m_textAnnotations)) {
        this.m_textAnnotations = this.m_textAnnotations.filter(ta =>
            ta.anchorType !== TextAnchorType.Signal &&
            ta.anchorType !== TextAnchorType.BlankRow
        );
    }

    this.m_signals = [];
    // m_signalGroups no longer used - groups are derived from signal.groupName
    this.dataChanged();
};

/**
 * Clears all waveview content (signals, arrows, markers, time jumps, time spans, text annotations).
 */
WaveDocument.prototype.clearAllWaveView = function() {
    this.pushUndoSnapshot();

    // Clear all annotations
    this.m_textAnnotations = [];
    this.m_nextTextAnnotationId = 1;

    // Clear arrows
    this.m_arrows = [];
    this.m_nextArrowId = 1;

    // Clear markers and time jumps
    this.m_markers = [];
    this.m_nextMarkerId = 1;
    this.m_timeJumps = [];
    this.m_nextTimeJumpId = 1;

    // Clear time span markers
    this.m_timeSpanMarkers = [];
    this.m_nextTimeSpanMarkerId = 1;

    // Clear signals (groups are derived from signal.groupName)
    this.m_signals = [];
    // m_signalGroups no longer used

    this.dataChanged();
};

/**
 * Sets segment style (color and/or hatching) for a specific sample in a signal.
 * @param {number} signalIndex - Signal index
 * @param {number} sampleIndex - Sample index
 * @param {string} color - Segment color, null to use default
 * @param {boolean} hatched - true to apply hatching pattern
 */
WaveDocument.prototype.setSegmentStyle = function(signalIndex, sampleIndex, color = null, hatched = false) {
    if (signalIndex < 0 || signalIndex >= this.m_signals.length) return;
    const signal = this.m_signals[signalIndex];
    if (sampleIndex < 0 || sampleIndex >= signal.values.length) return;
    
    this.pushUndoSnapshot();
    signal.segmentStyles[sampleIndex] = new SegmentStyle(color, hatched);
    this.dataChanged();
};

/**
 * Shifts a signal's waveform one sample slot to the left or right (phase
 * shift, issue #7). The vacated boundary slot repeats the edge value.
 * @param {number} signalIndex - Signal index
 * @param {number} direction - Negative shifts left, positive shifts right
 */
WaveDocument.prototype.shiftSignalValues = function(signalIndex, direction) {
    if (signalIndex < 0 || signalIndex >= this.m_signals.length) return;
    const signal = this.m_signals[signalIndex];
    if (!signal || signal.type === SignalType.BlankRow) return;
    if (!signal.values || signal.values.length === 0) return;

    this.pushUndoSnapshot();

    const shiftOne = (arr, clone) => {
        if (!arr || arr.length === 0) return;
        if (direction > 0) {
            const first = clone ? clone(arr[0]) : arr[0];
            arr.pop();
            arr.unshift(first);
        } else {
            const last = clone ? clone(arr[arr.length - 1]) : arr[arr.length - 1];
            arr.shift();
            arr.push(last);
        }
    };

    shiftOne(signal.values);
    shiftOne(signal.labels);
    shiftOne(signal.segmentStyles, s => (s ? { ...s } : s));
    shiftOne(signal.driveStrengths);
    shiftOne(signal.clockMarkers);
    shiftOne(signal.waveDromColorCodes);

    this.dataChanged();
};

/**
 * Clears segment style for a specific sample.
 * @param {number} signalIndex - Signal index
 * @param {number} sampleIndex - Sample index
 */
WaveDocument.prototype.clearSegmentStyle = function(signalIndex, sampleIndex) {
    if (signalIndex < 0 || signalIndex >= this.m_signals.length) return;
    const signal = this.m_signals[signalIndex];
    if (sampleIndex < 0 || sampleIndex >= signal.values.length) return;
    
    this.pushUndoSnapshot();
    signal.segmentStyles[sampleIndex] = new SegmentStyle();
    this.dataChanged();
};
