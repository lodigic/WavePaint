// Cut.js - Cut/Copy/Paste operations for WaveDocument

/**
 * Cuts the selected region to clipboard.
 * @param {WaveDocument} doc - Wave document
 * @returns {boolean} true if cut succeeded
 */
WaveDocument.prototype.cutSelection = function() {
    if (!this.copySelection()) return false;
    this.deleteSelection();
    return true;
};

/**
 * Copies the selected region to clipboard.
 * @returns {boolean} true if copy succeeded
 */
WaveDocument.prototype.copySelection = function() {
    // TODO: Implement clipboard copy
    this.m_hasBlockClipboard = true;
    return true;
};

/**
 * Pastes clipboard content at current position.
 * @returns {boolean} true if paste succeeded
 */
WaveDocument.prototype.paste = function() {
    if (!this.m_hasBlockClipboard) return false;
    // TODO: Implement clipboard paste
    this.pushUndoSnapshot();
    this.dataChanged();
    return true;
};

/**
 * Deletes the selected region.
 */
WaveDocument.prototype.deleteSelection = function() {
    this.pushUndoSnapshot();
    // TODO: Implement selection deletion
    this.dataChanged();
};

/**
 * Removes the samples in the given range and stitches the remainder together.
 * This is the scissor-tool behavior requested in issue #7: cut out the
 * selected part and keep the rest (cropToRange does the opposite).
 * @param {number} startEff - Start effective sample index (inclusive)
 * @param {number} endEff - End effective sample index (exclusive)
 */
WaveDocument.prototype.deleteRange = function(startEff, endEff) {
    const divisor = this.m_subStepCount + 1;
    const effCount = this.effectiveSampleCount();

    if (startEff < 0) startEff = 0;
    if (endEff > effCount) endEff = effCount;
    if (startEff >= endEff) {
        console.warn('Invalid delete range:', startEff, endEff);
        return;
    }

    this.pushUndoSnapshot();

    // Range expressed in fractional main steps (shared coordinate system)
    const startPos = startEff / divisor;
    const endPos = endEff / divisor;
    const removedMain = endPos - startPos;
    const newMainSampleCount = Math.max(1, Math.ceil(this.m_sampleCount - removedMain));

    for (const signal of this.m_signals) {
        if (signal.type === SignalType.BlankRow) continue;

        // Each signal can have its own substeps; convert the range to its space
        const sigDivisor = (signal.subSteps && signal.subSteps > 0 ? signal.subSteps : this.m_subStepCount) + 1;
        const sigStart = Math.round(startPos * sigDivisor);
        const sigEnd = Math.round(endPos * sigDivisor);
        const targetLength = newMainSampleCount * sigDivisor;

        const removeAndPad = (arr, padValue) => {
            if (!arr) return arr;
            const out = arr.slice(0, sigStart).concat(arr.slice(sigEnd));
            while (out.length < targetLength) {
                out.push(typeof padValue === 'function' ? padValue() : padValue);
            }
            return out.slice(0, targetLength);
        };

        signal.values = removeAndPad(signal.values, -1);
        signal.labels = removeAndPad(signal.labels, '');
        signal.segmentStyles = removeAndPad(signal.segmentStyles, () => new SegmentStyle());
        signal.driveStrengths = removeAndPad(signal.driveStrengths, 0);
        signal.clockMarkers = removeAndPad(signal.clockMarkers, false);
        signal.waveDromColorCodes = removeAndPad(signal.waveDromColorCodes, null);
    }

    // Markers/time jumps inside the range disappear; the ones after shift left
    this.m_markers = this.m_markers.filter(mk => {
        if (mk.position >= startPos && mk.position < endPos) return false;
        if (mk.position >= endPos) mk.position -= removedMain;
        return true;
    });

    this.m_timeJumps = this.m_timeJumps.filter(tj => {
        if (tj.position >= startPos && tj.position < endPos) return false;
        if (tj.position >= endPos) tj.position -= removedMain;
        return true;
    });

    const collapsePosition = (pos) => {
        if (pos >= endPos) return pos - removedMain;
        if (pos > startPos) return startPos;
        return pos;
    };

    this.m_timeSpanMarkers = this.m_timeSpanMarkers.filter(ts => {
        ts.startPosition = collapsePosition(ts.startPosition);
        ts.endPosition = collapsePosition(ts.endPosition);
        return ts.startPosition < ts.endPosition;
    });

    this.m_arrows = this.m_arrows.filter(arrow => {
        const startInside = arrow.startPosition >= startPos && arrow.startPosition < endPos;
        const endInside = arrow.endPosition >= startPos && arrow.endPosition < endPos;
        if (startInside || endInside) {
            this.updateTextAnnotationsAfterArrowRemove(arrow.id);
            return false;
        }
        if (arrow.startPosition >= endPos) arrow.startPosition -= removedMain;
        if (arrow.endPosition >= endPos) arrow.endPosition -= removedMain;
        return true;
    });

    // Text annotations use signal-specific effective indices
    this.m_textAnnotations = this.m_textAnnotations.filter(ta => {
        if (ta.anchorType === 'Arrow') return true; // Already handled
        const sigSubSteps = this.m_signals[ta.anchorId]?.subSteps || this.m_subStepCount;
        const sigDivisor = sigSubSteps + 1;
        const sigStart = Math.round(startPos * sigDivisor);
        const sigEnd = Math.round(endPos * sigDivisor);
        if (ta.sample >= sigStart && ta.sample < sigEnd) return false;
        if (ta.sample >= sigEnd) ta.sample -= (sigEnd - sigStart);
        return true;
    });

    this.m_sampleCount = newMainSampleCount;

    // Update UI spinner if available
    const sampleSpin = document.getElementById('sample-spin');
    if (sampleSpin) {
        sampleSpin.value = this.m_sampleCount;
    }

    this.dataChanged();
    console.log('Deleted range', startEff, '-', endEff, '- new sample count:', this.m_sampleCount);
};

/**
 * Crops the waveform to keep only the samples in the given range.
 * @param {number} startEff - Start effective sample index (inclusive)
 * @param {number} endEff - End effective sample index (exclusive)
 */
WaveDocument.prototype.cropToRange = function(startEff, endEff) {
    const divisor = this.m_subStepCount + 1;
    const effCount = this.effectiveSampleCount();
    
    if (startEff < 0) startEff = 0;
    if (endEff > effCount) endEff = effCount;
    if (startEff >= endEff) {
        console.warn('Invalid crop range:', startEff, endEff);
        return;
    }
    
    this.pushUndoSnapshot();
    
    const keepCount = endEff - startEff;
    
    // Calculate new main sample count (round up to include partial main steps)
    const newMainSampleCount = Math.ceil(keepCount / divisor);
    
    // Update signals: keep only the selected range
    for (const signal of this.m_signals) {
        if (signal.type === SignalType.BlankRow) continue;
        
        // Extract the range we want to keep
        const newValues = signal.values.slice(startEff, endEff);
        const newLabels = signal.labels.slice(startEff, endEff);
        const newStyles = signal.segmentStyles.slice(startEff, endEff);
        
        // Pad to fill complete main samples if needed
        const targetLength = newMainSampleCount * divisor;
        while (newValues.length < targetLength) {
            newValues.push(-1);
            newLabels.push('');
            newStyles.push(new SegmentStyle());
        }
        
        signal.values = newValues;
        signal.labels = newLabels;
        signal.segmentStyles = newStyles;
    }
    
    // Update markers: shift and filter (using fractional positions)
    // Convert effective indices to fractional positions for comparison
    const startPos = startEff / divisor;
    const endPos = endEff / divisor;
    const posShift = startPos;  // How much to shift positions left
    
    this.m_markers = this.m_markers.filter(mk => {
        if (mk.position < startPos || mk.position >= endPos) {
            return false; // Remove markers outside the range
        }
        mk.position -= posShift; // Shift to new position
        return true;
    });
    
    // Update time jumps: shift and filter (using fractional positions)
    this.m_timeJumps = this.m_timeJumps.filter(tj => {
        if (tj.position < startPos || tj.position >= endPos) {
            return false;
        }
        tj.position -= posShift;
        return true;
    });
    
    // Update time span markers (using fractional positions)
    this.m_timeSpanMarkers = this.m_timeSpanMarkers.filter(ts => {
        // Remove if completely outside the range
        if (ts.endPosition <= startPos || ts.startPosition >= endPos) {
            return false;
        }
        // Clamp and shift positions
        ts.startPosition = Math.max(0, ts.startPosition - posShift);
        ts.endPosition = Math.min(newMainSampleCount, ts.endPosition - posShift);
        
        // Remove if collapsed to zero width
        if (ts.startPosition >= ts.endPosition) {
            return false;
        }
        return true;
    });
    
    // Update arrows (using fractional positions)
    this.m_arrows = this.m_arrows.filter(arrow => {
        // Remove if any endpoint is outside the range
        if (arrow.startPosition < startPos || arrow.startPosition >= endPos ||
            arrow.endPosition < startPos || arrow.endPosition >= endPos) {
            this.updateTextAnnotationsAfterArrowRemove(arrow.id);
            return false;
        }
        // Shift positions
        arrow.startPosition -= posShift;
        arrow.endPosition -= posShift;
        return true;
    });
    
    // Update text annotations (non-arrow ones)
    // Text annotations use signal-specific sample indices which need conversion
    const effectiveShift = startEff;  // Shift in effective indices
    this.m_textAnnotations = this.m_textAnnotations.filter(ta => {
        if (ta.anchorType === 'Arrow') return true; // Already handled
        // For signal/blankrow annotations, sample is signal-specific
        // Convert to effective index, check range, then shift
        const signalSubSteps = this.m_signals[ta.anchorId]?.subSteps || this.m_subStepCount;
        const signalDivisor = signalSubSteps + 1;
        const effSample = ta.sample;  // Already in effective index for signal
        if (effSample < startEff || effSample >= endEff) {
            return false;
        }
        ta.sample -= effectiveShift;
        return true;
    });
    
    // Update sample count
    this.m_sampleCount = newMainSampleCount;
    
    // Update UI spinners if available
    const sampleSpin = document.getElementById('sample-spin');
    if (sampleSpin) {
        sampleSpin.value = this.m_sampleCount;
    }
    
    this.dataChanged();
    console.log('Cropped to range', startEff, '-', endEff, '- new sample count:', this.m_sampleCount);
};
