// Core classes for WavePaint Web

const SignalType = {
    Bit: 0,
    Vector: 1,
    BlankRow: 2
};

const Radix = {
    Hexadecimal: 0,
    Decimal: 1,
    Binary: 2
};

// Drive strength types for bit signals (from WaveDrom h, l, H, L characters)
const DriveStrength = {
    Strong: 0,      // Normal 0/1 - default, strong driver
    Weak: 1,        // h/l - weak/gated driver (visually different in some renderers)
    WeakMarker: 2   // H/L - weak driver with edge marker
};

// Export to window for modules
if (typeof window !== 'undefined') {
    window.SignalType = SignalType;
    window.Radix = Radix;
    window.DriveStrength = DriveStrength;
}

class SegmentStyle {
    constructor(color = null, hatched = false, fill = null) {
        this.color = color;
        this.hatched = hatched;
        this.fill = fill; // Fill color for the segment (null = no fill)
    }

    isDefault() {
        return !this.color && !this.hatched && !this.fill;
    }
}

// SignalGroup class eliminada - ahora usamos groupName directamente en Signal

class Signal {
    constructor(name = '', type = SignalType.Bit, samples = 0) {
        this.name = name;
        this.type = type;
        this.values = new Array(samples).fill(-1);
        this.labels = new Array(samples).fill('');
        this.segmentStyles = Array.from({ length: samples }, () => new SegmentStyle());
        this.driveStrengths = new Array(samples).fill(DriveStrength.Strong); // Drive strength per sample
        this.clockMarkers = new Array(samples).fill(false); // Clock edge markers per sample (true = P/N, false = p/n)
        this.showClockMarkers = false; // Whether to show clock markers visually (disabled by default)
        this.waveDromColorCodes = new Array(samples).fill(null); // Original WaveDrom color codes ('=', '2'-'9') per sample
        this.color = null; // Invalid color = use theme default
        this.fill = null; // Fill color for vector signals (null = no fill)
        this.riseTime = 0.0;
        this.fallTime = 0.0;
        this.edgeArrow = 'none'; // 'none', 'positive', 'negative' - for clock edge arrows
        this.radix = Radix.Hexadecimal;
        this.uiRowHeightHint = 0;
        this.isClockPattern = false;
        this.clockHighSamples = 1;
        this.clockLowSamples = 1;
        this.groupName = null;  // Name of the group this signal belongs to (null = no group)
        this.groupColor = null; // Color of the group bracket
        this.groupPath = null;  // Array of group names from root to leaf for nested groups
        this.waveDromChars = new Array(samples).fill(null);  // Original WaveDrom characters per sample
        // WaveDrom-specific metadata for round-trip fidelity
        this.waveDromPeriod = null;  // period attribute from WaveDrom
        this.waveDromPhase = null;   // phase attribute from WaveDrom
        this.waveDromData = undefined;  // Original data array/string from WaveDrom (undefined = no data in original)
        this.waveDromNode = null;    // Original node string from WaveDrom
        this.waveDromWave = null;    // Original wave string from WaveDrom
        this.waveDromWaveLength = null;  // Original wave string length for export sizing
        this.waveDromHadData = false;  // True if original WaveDrom had data array
        this.isNodeOnlyRow = false;  // True if this is a node-only row (no wave, just nodes for arrows)
        this.subSteps = 0;  // Per-signal substeps (0 = use global, > 0 = signal-specific substeps)
    }
}

class Marker {
    constructor(id, position, color = null) {
        this.id = id;
        this.position = position;  // Fractional position (e.g., 2.5 = step 2, 50%)
        this.color = color;
    }
}

class TimeJump {
    constructor(id, position, color = null) {
        this.id = id;
        this.position = position;  // Fractional position
        this.color = color;
    }
}

class TimeSpanMarker {
    constructor(id, startSignal, startPosition, endSignal, endPosition, style = '-|', color = null) {
        this.id = id;
        this.startSignal = startSignal;
        this.startPosition = startPosition;  // Fractional position
        this.endSignal = endSignal;
        this.endPosition = endPosition;      // Fractional position
        this.style = style;  // -|, |-, -|-
        this.color = color;
    }
}

class WaveDocument {
    constructor() {
        this.m_sampleCount = 20;
        this.m_subStepCount = 0;
        this.m_signals = [];
        this.m_vcdSignals = [];
        this.m_markers = [];
        this.m_timeJumps = [];
        this.m_timeSpanMarkers = [];
        this.m_arrows = [];
        this.m_textAnnotations = [];
        // m_signalGroups ya no se usa - los grupos se obtienen de signal.groupName
        this.m_hasBlockClipboard = false;
        this.m_nextArrowId = 1;
        this.m_nextMarkerId = 1;
        this.m_nextTimeJumpId = 1;
        this.m_nextTimeSpanMarkerId = 1;
        this.m_nextTextAnnotationId = 1;
        this.m_arrowColor = null;
        this.m_undoStack = [];
        this.m_redoStack = [];
        // Unsaved-changes flag: set on every mutation, cleared on save/load.
        // Used by the beforeunload warning (issue #5)
        this.m_modified = false;
    }

    /**
     * Get the maximum subSteps between global and all signals
     * (Used for some legacy compatibility, but each signal now has independent arrays)
     */
    maxSubSteps() {
        let max = this.m_subStepCount;
        for (const signal of this.m_signals) {
            if (signal.subSteps && signal.subSteps > max) {
                max = signal.subSteps;
            }
        }
        return max;
    }

    /**
     * Get effective sample count based on global substeps
     * (Used when creating new signals without custom substeps)
     */
    effectiveSampleCount() {
        return this.m_sampleCount * (this.m_subStepCount + 1);
    }
    
    /**
     * Get effective sample count for a specific signal
     * @param {Object} signal - The signal to calculate for
     * @returns {number} - The effective sample count for this signal
     */
    getSignalEffectiveSampleCount(signal) {
        const effectiveSubSteps = (signal && signal.subSteps > 0) ? signal.subSteps : this.m_subStepCount;
        return this.m_sampleCount * (effectiveSubSteps + 1);
    }

    sampleCount() {
        return this.m_sampleCount;
    }

    subStepCount() {
        return this.m_subStepCount;
    }

    signalList() {
        return this.m_signals;
    }

    setSampleCount(count) {
        this.pushUndoSnapshot();
        this.m_sampleCount = count;
        // Resize existing signals - each signal uses its own substeps
        for (let signal of this.m_signals) {
            const signalEffective = this.getSignalEffectiveSampleCount(signal);
            signal.values.length = signalEffective;
            signal.labels.length = signalEffective;
            signal.segmentStyles.length = signalEffective;
        }
    }

    /**
     * Set global substep count
     * ONLY affects signals that use global (signal.subSteps = 0 or undefined)
     * Signals with their own subSteps are NOT affected
     */
    setSubStepCount(count) {
        if (count < 0) count = 0;
        if (count === this.m_subStepCount) return;

        this.pushUndoSnapshot();

        const oldSubStepCount = this.m_subStepCount;
        const oldDivisor = oldSubStepCount + 1;
        const newDivisor = count + 1;
        const baseSamples = this.m_sampleCount;
        const newEffectiveCount = baseSamples * newDivisor;

        // Only modify signals that use global substeps (subSteps = 0 or undefined)
        for (let signal of this.m_signals) {
            // Skip signals with their own substeps
            if (signal.subSteps && signal.subSteps > 0) {
                continue;
            }
            
            const oldValues = signal.values || [];
            const oldLabels = signal.labels || [];
            const oldStyles = signal.segmentStyles || [];

            const newValues = new Array(newEffectiveCount).fill(-1);
            const newLabels = new Array(newEffectiveCount).fill('');
            const newStyles = Array.from({ length: newEffectiveCount }, () => new SegmentStyle());

            for (let baseSample = 0; baseSample < baseSamples; baseSample++) {
                for (let oldSub = 0; oldSub < oldDivisor; oldSub++) {
                    const oldIdx = baseSample * oldDivisor + oldSub;
                    if (oldIdx >= oldValues.length) continue;

                    const newSub = Math.floor((oldSub * newDivisor) / oldDivisor);
                    const newIdx = baseSample * newDivisor + newSub;
                    if (newIdx >= newEffectiveCount) continue;

                    if (newValues[newIdx] === -1 || oldSub === 0) {
                        newValues[newIdx] = oldValues[oldIdx];
                        if (oldIdx < oldLabels.length) newLabels[newIdx] = oldLabels[oldIdx];
                        if (oldIdx < oldStyles.length) newStyles[newIdx] = oldStyles[oldIdx];
                    }
                }

                if (signal.type === SignalType.Bit) {
                    const baseNewIdx = baseSample * newDivisor;
                    const baseValue = newValues[baseNewIdx];
                    if (baseValue !== -1) {
                        for (let newSub = 0; newSub < newDivisor; newSub++) {
                            const newIdx = baseSample * newDivisor + newSub;
                            if (newValues[newIdx] === -1) {
                                newValues[newIdx] = baseValue;
                            }
                        }
                    }
                } else if (signal.type === SignalType.Vector) {
                    const baseNewIdx = baseSample * newDivisor;
                    const baseValue = newValues[baseNewIdx];
                    const baseLabel = newLabels[baseNewIdx];
                    const baseStyle = newStyles[baseNewIdx];
                    if (baseValue !== -1) {
                        for (let newSub = 0; newSub < newDivisor; newSub++) {
                            const newIdx = baseSample * newDivisor + newSub;
                            if (newValues[newIdx] === -1) {
                                newValues[newIdx] = baseValue;
                                newLabels[newIdx] = baseLabel;
                                newStyles[newIdx] = baseStyle;
                            }
                        }
                    }
                }
            }

            signal.values = newValues;
            signal.labels = newLabels;
            signal.segmentStyles = newStyles;
        }

        // Update markers, arrows, etc. - these use global substeps
        const oldEffectiveCount = baseSamples * oldDivisor;
        const mapIndex = (oldIdx) => {
            if (oldIdx < 0) return -1;
            const baseSample = Math.floor(oldIdx / oldDivisor);
            const oldSub = oldIdx % oldDivisor;
            if (baseSample < 0 || baseSample >= baseSamples) return -1;
            const newSub = Math.floor((oldSub * newDivisor) / oldDivisor);
            let newIdx = baseSample * newDivisor + newSub;
            if (newIdx < 0) return -1;
            if (newIdx >= newEffectiveCount) newIdx = newEffectiveCount - 1;
            return newIdx;
        };

        // Map fractional positions: only the integer part changes, fraction stays
        const mapPosition = (pos) => {
            if (pos === undefined || pos === null || pos < 0) return -1;
            const mainStep = Math.floor(pos);
            const fraction = pos - mainStep;
            if (mainStep < 0 || mainStep >= baseSamples) return -1;
            // Position is just mainStep + fraction, no mapping needed for fractional coords
            // But we need to validate it's still in range
            if (mainStep >= baseSamples) return -1;
            return pos; // Keep the fractional position as-is
        };

        this.m_markers = this.m_markers
            .map(m => ({ ...m, position: mapPosition(m.position) }))
            .filter(m => m.position >= 0 && m.position <= baseSamples);

        this.m_timeJumps = this.m_timeJumps
            .map(tj => ({ ...tj, position: mapPosition(tj.position) }))
            .filter(tj => tj.position >= 0 && tj.position <= baseSamples);

        this.m_arrows = this.m_arrows
            .map(a => ({
                ...a,
                startPosition: mapPosition(a.startPosition),
                endPosition: mapPosition(a.endPosition)
            }))
            .filter(a => a.startPosition >= 0 && a.endPosition >= 0);

        this.m_timeSpanMarkers = this.m_timeSpanMarkers
            .map(m => ({
                ...m,
                startPosition: mapPosition(m.startPosition),
                endPosition: mapPosition(m.endPosition)
            }))
            .filter(m => m.startPosition >= 0 && m.endPosition >= 0);

        this.m_textAnnotations = this.m_textAnnotations
            .map(a => ({
                ...a,
                sample: typeof a.sample === 'number' ? mapIndex(a.sample) : a.sample
            }))
            .filter(a => a.sample === null || a.sample === undefined || a.sample >= 0);

        this.m_subStepCount = count;
        this.dataChanged();
    }

    /**
     * Set substeps for an individual signal
     * 
     * IMPORTANT: Each signal has its OWN independent substeps.
     * Changing a signal's substeps only affects THAT signal's array.
     * Other signals are NOT modified.
     * 
     * @param {number} signalIndex - Index of the signal
     * @param {number} newSubSteps - New substeps value (0 = use global)
     */
    setSignalSubSteps(signalIndex, newSubSteps) {
        if (signalIndex < 0 || signalIndex >= this.m_signals.length) return;
        
        newSubSteps = Math.max(0, Math.min(16, newSubSteps));
        const signal = this.m_signals[signalIndex];
        const oldSubSteps = signal.subSteps || 0;
        
        if (newSubSteps === oldSubSteps) return;
        
        this.pushUndoSnapshot();
        
        // Calculate the effective old and new substeps for this signal
        const globalSubSteps = this.m_subStepCount;
        const oldEffectiveSubSteps = oldSubSteps > 0 ? oldSubSteps : globalSubSteps;
        const newEffectiveSubSteps = newSubSteps > 0 ? newSubSteps : globalSubSteps;
        
        // If effective substeps haven't changed, just update the property
        if (oldEffectiveSubSteps === newEffectiveSubSteps) {
            signal.subSteps = newSubSteps;
            this.dataChanged();
            return;
        }
        
        const baseSamples = this.m_sampleCount;
        const oldDivisor = oldEffectiveSubSteps + 1;
        const newDivisor = newEffectiveSubSteps + 1;
        const oldEffectiveCount = baseSamples * oldDivisor;
        const newEffectiveCount = baseSamples * newDivisor;
        
        const oldValues = signal.values || [];
        const oldLabels = signal.labels || [];
        const oldStyles = signal.segmentStyles || [];
        
        // Create new arrays for this signal only
        const newValues = new Array(newEffectiveCount).fill(-1);
        const newLabels = new Array(newEffectiveCount).fill('');
        const newStyles = Array.from({ length: newEffectiveCount }, () => new SegmentStyle());
        
        // Remap values from old grid to new grid for THIS signal only
        for (let baseSample = 0; baseSample < baseSamples; baseSample++) {
            // Copy the base value (position 0 of each step)
            const oldBaseIdx = baseSample * oldDivisor;
            const newBaseIdx = baseSample * newDivisor;
            
            if (oldBaseIdx < oldValues.length) {
                newValues[newBaseIdx] = oldValues[oldBaseIdx];
                if (oldBaseIdx < oldLabels.length) newLabels[newBaseIdx] = oldLabels[oldBaseIdx];
                if (oldBaseIdx < oldStyles.length) newStyles[newBaseIdx] = oldStyles[oldBaseIdx];
            }
            
            // Map intermediate substeps
            for (let oldSub = 1; oldSub < oldDivisor; oldSub++) {
                const oldIdx = baseSample * oldDivisor + oldSub;
                if (oldIdx >= oldValues.length) continue;
                
                // Map old substep position to new substep position
                const oldFraction = oldSub / oldDivisor;
                const newSub = Math.floor(oldFraction * newDivisor);
                if (newSub === 0) continue; // Already handled base
                
                const newIdx = baseSample * newDivisor + newSub;
                if (newIdx >= newEffectiveCount) continue;
                
                // Only copy if target is still empty
                if (newValues[newIdx] === -1) {
                    newValues[newIdx] = oldValues[oldIdx];
                    if (oldIdx < oldLabels.length) newLabels[newIdx] = oldLabels[oldIdx];
                    if (oldIdx < oldStyles.length) newStyles[newIdx] = oldStyles[oldIdx];
                }
            }
            
            // Fill in gaps by extending the base value
            if (signal.type === SignalType.Bit) {
                const baseValue = newValues[newBaseIdx];
                if (baseValue !== -1) {
                    for (let newSub = 1; newSub < newDivisor; newSub++) {
                        const newIdx = baseSample * newDivisor + newSub;
                        if (newValues[newIdx] === -1) {
                            newValues[newIdx] = baseValue;
                        }
                    }
                }
            } else if (signal.type === SignalType.Vector) {
                const baseValue = newValues[newBaseIdx];
                const baseLabel = newLabels[newBaseIdx];
                const baseStyle = newStyles[newBaseIdx];
                if (baseValue !== -1) {
                    for (let newSub = 1; newSub < newDivisor; newSub++) {
                        const newIdx = baseSample * newDivisor + newSub;
                        if (newValues[newIdx] === -1) {
                            newValues[newIdx] = baseValue;
                            newLabels[newIdx] = baseLabel;
                            newStyles[newIdx] = baseStyle;
                        }
                    }
                }
            }
        }
        
        // Update ONLY this signal's arrays - other signals remain unchanged
        signal.values = newValues;
        signal.labels = newLabels;
        signal.segmentStyles = newStyles;
        signal.subSteps = newSubSteps;
        
        this.dataChanged();
    }

    addBitSignal(name) {
        this.pushUndoSnapshot();
        const effective = this.effectiveSampleCount();
        const signal = new Signal(name, SignalType.Bit, effective);
        signal.values.fill(0); // Default to low level
        this.m_signals.push(signal);
        return this.m_signals.length - 1;
    }

    valueToLabel(value, radix) {
        if (value === -1) { // UNDEFINED_VALUE
            return 'X';
        }
        switch (radix) {
            case Radix.Binary:
                return '0b' + value.toString(2);
            case Radix.Decimal:
                return value.toString(10);
            case Radix.Hexadecimal:
            default:
                return '0x' + value.toString(16).toUpperCase();
        }
    }

    addVectorSignal(name) {
        this.pushUndoSnapshot();
        const effective = this.effectiveSampleCount();
        const signal = new Signal(name, SignalType.Vector, effective);
        signal.values.fill(-1); // UNDEFINED_VALUE
        // Generate labels based on radix
        for (let i = 0; i < signal.values.length; i++) {
            signal.labels[i] = this.valueToLabel(signal.values[i], signal.radix);
        }
        this.m_signals.push(signal);
        return this.m_signals.length - 1;
    }

    insertBlankRow(insertIndex, uiRowHeightHint = 0) {
        this.pushUndoSnapshot();
        const effective = this.effectiveSampleCount();
        const signal = new Signal('', SignalType.BlankRow, effective);
        signal.uiRowHeightHint = uiRowHeightHint;
        this.m_signals.splice(insertIndex, 0, signal);
        return insertIndex;
    }

    addBlankRow(uiRowHeightHint = 0) {
        this.pushUndoSnapshot();
        const effective = this.effectiveSampleCount();
        const signal = new Signal('', SignalType.BlankRow, effective);
        signal.uiRowHeightHint = uiRowHeightHint;
        this.m_signals.push(signal);
        return this.m_signals.length - 1;
    }

    addClockSignal(name, pulses, highSamples, lowSamples) {
        this.pushUndoSnapshot();
        const effective = this.effectiveSampleCount();
        const signal = new Signal(name, SignalType.Bit, effective);
        signal.isClockPattern = true;
        signal.clockHighSamples = highSamples;
        signal.clockLowSamples = lowSamples;
        // Generate clock pattern
        let value = 0;
        for (let i = 0; i < effective; i++) {
            signal.values[i] = value;
            if (value === 1) {
                if (--highSamples <= 0) {
                    value = 0;
                    highSamples = signal.clockHighSamples;
                }
            } else {
                if (--lowSamples <= 0) {
                    value = 1;
                    lowSamples = signal.clockLowSamples;
                }
            }
        }
        this.m_signals.push(signal);
        return this.m_signals.length - 1;
    }

    addCounterSignal(name, timeStep, fromValue, toValue) {
        this.pushUndoSnapshot();
        if (timeStep < 0) return -1;

        const samples = Math.abs(fromValue) + Math.abs(toValue) + timeStep;
        if (samples > this.m_sampleCount) {
            this.setSampleCount(samples);
        }

        const effective = this.effectiveSampleCount();
        const divisor = this.m_subStepCount + 1;
        const signal = new Signal(name, SignalType.Vector, effective);
        signal.values.fill(0);
        signal.labels.fill('');

        for (let i = 0; i < effective; i++) {
            const mainStep = Math.floor(i / divisor);
            if (mainStep < timeStep) {
                signal.values[i] = 0;
                signal.labels[i] = '';
            } else {
                const counterPos = mainStep - timeStep;
                let value = fromValue + counterPos;
                if (value > toValue) value = toValue;
                signal.values[i] = value;
                signal.labels[i] = String(value);
            }
        }

        this.m_signals.push(signal);
        return this.m_signals.length - 1;
    }

    addResetSignal(name, activeCycles, activeHigh) {
        this.pushUndoSnapshot();
        const effective = this.effectiveSampleCount();
        const signal = new Signal(name, SignalType.Bit, effective);
        const activeValue = activeHigh ? 1 : 0;
        const inactiveValue = activeHigh ? 0 : 1;
        for (let i = 0; i < effective; i++) {
            signal.values[i] = i < activeCycles ? activeValue : inactiveValue;
        }
        this.m_signals.push(signal);
        return this.m_signals.length - 1;
    }

    addPulseSignal(name, pulseStart, pulseWidth) {
        this.pushUndoSnapshot();
        const effective = this.effectiveSampleCount();
        const signal = new Signal(name, SignalType.Bit, effective);
        for (let i = 0; i < effective; i++) {
            signal.values[i] = (i >= pulseStart && i < pulseStart + pulseWidth) ? 1 : 0;
        }
        this.m_signals.push(signal);
        return this.m_signals.length - 1;
    }

    addStrobeSignal(name, period, pulseWidth) {
        this.pushUndoSnapshot();
        const effective = this.effectiveSampleCount();
        const signal = new Signal(name, SignalType.Bit, effective);
        for (let i = 0; i < effective; i++) {
            signal.values[i] = (i % period < pulseWidth) ? 1 : 0;
        }
        this.m_signals.push(signal);
        return this.m_signals.length - 1;
    }

    addRampSignal(name, startValue, endValue, stepSize) {
        this.pushUndoSnapshot();
        const effective = this.effectiveSampleCount();
        const signal = new Signal(name, SignalType.Vector, effective);
        let value = startValue;
        for (let i = 0; i < effective; i++) {
            signal.values[i] = value;
            signal.labels[i] = value.toString();
            value += stepSize;
            if (value > endValue) value = startValue;
        }
        this.m_signals.push(signal);
        return this.m_signals.length - 1;
    }

    addPWMSignal(name, period, dutyCyclePercent) {
        this.pushUndoSnapshot();
        const effective = this.effectiveSampleCount();
        const signal = new Signal(name, SignalType.Bit, effective);
        const onSamples = Math.floor(period * dutyCyclePercent / 100);
        for (let i = 0; i < effective; i++) {
            signal.values[i] = (i % period < onSamples) ? 1 : 0;
        }
        this.m_signals.push(signal);
        return this.m_signals.length - 1;
    }

    addWalkingOneSignal(name, bitWidth) {
        this.pushUndoSnapshot();
        const effective = this.effectiveSampleCount();
        const signal = new Signal(name, SignalType.Vector, effective);
        for (let i = 0; i < effective; i++) {
            const value = 1 << (i % bitWidth);
            signal.values[i] = value;
            signal.labels[i] = value.toString(2).padStart(bitWidth, '0');
        }
        this.m_signals.push(signal);
        return this.m_signals.length - 1;
    }

    addWalkingZeroSignal(name, bitWidth) {
        this.pushUndoSnapshot();
        const effective = this.effectiveSampleCount();
        const signal = new Signal(name, SignalType.Vector, effective);
        for (let i = 0; i < effective; i++) {
            const value = ~(1 << (i % bitWidth)) & ((1 << bitWidth) - 1);
            signal.values[i] = value;
            signal.labels[i] = value.toString(2).padStart(bitWidth, '0');
        }
        this.m_signals.push(signal);
        return this.m_signals.length - 1;
    }

    addBusIdleSignal(name, value) {
        this.pushUndoSnapshot();
        const effective = this.effectiveSampleCount();
        const signal = new Signal(name, SignalType.Vector, effective);
        for (let i = 0; i < effective; i++) {
            signal.values[i] = value;
            signal.labels[i] = this.valueToLabel(value, signal.radix);
        }
        this.m_signals.push(signal);
        return this.m_signals.length - 1;
    }

    addAlternatingSignal(name, value1, value2, samplesPerValue) {
        this.pushUndoSnapshot();
        const effective = this.effectiveSampleCount();
        const signal = new Signal(name, SignalType.Vector, effective);
        for (let i = 0; i < effective; i++) {
            const value = (Math.floor(i / samplesPerValue) % 2 === 0) ? value1 : value2;
            signal.values[i] = value;
            signal.labels[i] = this.valueToLabel(value, signal.radix);
        }
        this.m_signals.push(signal);
        return this.m_signals.length - 1;
    }

    addGrayCodeSignal(name, startValue, endValue) {
        this.pushUndoSnapshot();
        if (startValue < 0 || endValue < 0) return -1;
        
        const effective = this.effectiveSampleCount();
        const signal = new Signal(name, SignalType.Vector, effective);
        const range = Math.abs(endValue - startValue) + 1;
        const step = (endValue >= startValue) ? 1 : -1;
        const divisor = this.m_subStepCount + 1;
        
        for (let i = 0; i < effective; i++) {
            const mainStep = Math.floor(i / divisor);
            const binaryValue = startValue + (mainStep % range) * step;
            // Convert to Gray code: gray = binary ^ (binary >> 1)
            const grayValue = binaryValue ^ (binaryValue >> 1);
            signal.values[i] = grayValue;
            signal.labels[i] = 'G' + grayValue.toString(16).toUpperCase().padStart(2, '0');
        }
        
        this.m_signals.push(signal);
        return this.m_signals.length - 1;
    }

    setSignalRadix(signalIndex, radix) {
        if (signalIndex < 0 || signalIndex >= this.m_signals.length) return;
        const signal = this.m_signals[signalIndex];
        if (signal.type !== SignalType.Vector) return;
        this.pushUndoSnapshot();
        signal.radix = radix;
        // Regenerate labels based on new radix
        for (let i = 0; i < signal.values.length; i++) {
            signal.labels[i] = this.valueToLabel(signal.values[i], signal.radix);
        }
        this.dataChanged();
    }

    // ========================================
    // Signal Group Management (Simplificado)
    // Los grupos ahora se manejan a través de GroupManager
    // usando signal.groupName directamente
    // ========================================
    
    /**
     * Get all unique group names in the document
     * @returns {Array<string>} List of group names
     */
    getGroupNames() {
        if (typeof GroupManager !== 'undefined') {
            return GroupManager.getGroupNames(this);
        }
        const names = new Set();
        for (const signal of this.m_signals) {
            if (signal.groupName) names.add(signal.groupName);
        }
        return Array.from(names);
    }

    // Helper methods for undo/redo and notifications
    pushUndoSnapshot() {
        // TODO: Implement undo/redo functionality
        // For now this is a no-op
    }
    
    /**
     * Invalidate WaveDrom preserved data when document structure changes.
     * This ensures that on next export, fresh WaveDrom code is generated
     * instead of using potentially stale preserved data.
     */
    invalidateWaveDromPreservedData() {
        console.log('[invalidateWaveDromPreservedData] CALLED - clearing preserved WaveDrom data');
        console.log('[invalidateWaveDromPreservedData] Before: m_waveDromEdges =', this.m_waveDromEdges);
        console.log('[invalidateWaveDromPreservedData] Before: m_waveDromSignalStructure =', this.m_waveDromSignalStructure);
        
        // Clear document-level WaveDrom metadata
        this.m_waveDromEdges = null;
        this.m_waveDromSignalStructure = null;
        
        // Clear signal-level WaveDrom metadata
        for (const signal of this.m_signals) {
            signal.waveDromNode = null;
            signal.waveDromWave = null;
            signal.waveDromChars = null;
            // Keep waveDromData, waveDromPeriod, waveDromPhase as they describe signal properties
            // not structure
        }
        
        console.log('[invalidateWaveDromPreservedData] After: m_waveDromEdges =', this.m_waveDromEdges);
        console.log('[invalidateWaveDromPreservedData] After: m_waveDromSignalStructure =', this.m_waveDromSignalStructure);
    }

    dataChanged() {
        // Document has unsaved changes (issue #5)
        this.m_modified = true;

        // Clear preserved WaveDrom structure when document changes
        // This ensures export generates fresh code reflecting current state
        if (typeof WaveDromIO !== 'undefined' && WaveDromIO.clearDocumentWaveDromPreserved) {
            WaveDromIO.clearDocumentWaveDromPreserved(this);
        }
        
        // Invalidate dynamic name width cache when signals change
        if (typeof invalidateDynamicNameWidthCache === 'function') {
            invalidateDynamicNameWidthCache();
        }
        
        // Trigger UI update
        if (typeof drawWaveform === "function") {
            drawWaveform();
        }
    }

    updateTextAnnotationsAfterArrowRemove(arrowId) {
        // Remove text annotations anchored to this arrow
        this.m_textAnnotations = this.m_textAnnotations.filter(ta => 
            !(ta.anchorType === "Arrow" && ta.anchorId === arrowId)
        );
    }
}

// Export classes to window for modules
if (typeof window !== 'undefined') {
    window.Signal = Signal;
    window.SegmentStyle = SegmentStyle;
    window.WaveDocument = WaveDocument;
}
