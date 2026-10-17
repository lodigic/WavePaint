// WaveDromExport.js - Export WavePaint documents to WaveDrom format

/**
 * Build node map from arrows and time span markers for WaveDrom edge definitions
 * This is a local copy to ensure it's always available
 * @param {Array} arrows - Array of arrow objects (spline edges)
 * @param {Array} timeSpanMarkers - Array of time span marker objects (sharp edges)
 * @param {Array} textAnnotations - Array of text annotations (for labels)
 * @param {number} globalSubSteps - Global substep count for position conversion
 * @returns {Object} { nodeMap: Map, edges: Array, nodeCharCode: number }
 */
function buildNodeMapFromArrowsLocal(arrows, timeSpanMarkers = [], textAnnotations = [], globalSubSteps = 0) {
    const nodeMap = new Map(); // "signalIndex_effectiveSample" -> nodeChar
    const edges = [];
    let nodeCharCode = 97; // Start with 'a'
    const divisor = globalSubSteps + 1;
    
    // Get text annotations anchored to arrows for labels
    const arrowLabels = new Map(); // arrowId -> label text
    if (textAnnotations) {
        textAnnotations.forEach(ann => {
            // Check for both string 'Arrow' and numeric 0 (legacy format)
            const isArrowAnchor = ann.anchorType === 'Arrow' || ann.anchorType === 0;
            if (isArrowAnchor && ann.text) {
                arrowLabels.set(ann.anchorId, ann.text);
            }
        });
    }
    
    // Helper to get next node char and advance counter
    const getNextNodeChar = () => {
        const char = String.fromCharCode(nodeCharCode++);
        // Wrap: a-z (97-122), then A-Z (65-90), then back to a
        if (nodeCharCode > 122) {
            nodeCharCode = 65; // Switch to uppercase after 'z'
        } else if (nodeCharCode > 90 && nodeCharCode < 97) {
            nodeCharCode = 97; // Wrap back to lowercase after 'Z'
        }
        return char;
    };
    
    // Process spline arrows - convert fractional positions to effective indices
    if (arrows && arrows.length > 0) {
        arrows.forEach((arrow, idx) => {
            // Convert fractional positions to effective sample indices
            const startEffIdx = Math.round(arrow.startPosition * divisor);
            const endEffIdx = Math.round(arrow.endPosition * divisor);
            
            const startKey = `${arrow.startSignal}_${startEffIdx}`;
            const endKey = `${arrow.endSignal}_${endEffIdx}`;
            
            const startExists = nodeMap.has(startKey);
            const endExists = nodeMap.has(endKey);
            
            if (!startExists) {
                nodeMap.set(startKey, getNextNodeChar());
            }
            if (!endExists) {
                nodeMap.set(endKey, getNextNodeChar());
            }
            
            const fromNode = nodeMap.get(startKey);
            const toNode = nodeMap.get(endKey);
            
            // Determine arrow style
            let arrowStyle = arrow.style || '~>';
            
            // Ensure it's a valid WaveDrom spline edge style
            const validStyles = [
                '~>', '->', '-|>', '|->', '-|->', 
                '<~>', '<->', '<-|>', '<-|->',
                '~', '-', '-|', '|-', '-|-',
                '-~>', '~->', '-~', '~-'
            ];
            
            if (!validStyles.includes(arrowStyle)) {
                arrowStyle = '~>';
            }
            
            // Build edge string with optional label
            let edgeStr = `${fromNode}${arrowStyle}${toNode}`;
            const label = arrowLabels.get(arrow.id);
            if (label) {
                edgeStr += ` ${label}`;
            }
            edges.push(edgeStr);
        });
    }
    
    // Process sharp edges (time span markers) - convert fractional positions to effective indices
    if (timeSpanMarkers && timeSpanMarkers.length > 0) {
        timeSpanMarkers.forEach(ts => {
            // Convert fractional positions to effective sample indices
            const startEffIdx = Math.round(ts.startPosition * divisor);
            const endEffIdx = Math.round(ts.endPosition * divisor);
            
            const startKey = `${ts.startSignal}_${startEffIdx}`;
            const endKey = `${ts.endSignal}_${endEffIdx}`;
            
            if (!nodeMap.has(startKey)) {
                nodeMap.set(startKey, getNextNodeChar());
            }
            if (!nodeMap.has(endKey)) {
                nodeMap.set(endKey, getNextNodeChar());
            }
            
            const fromNode = nodeMap.get(startKey);
            const toNode = nodeMap.get(endKey);
            
            // Convert WavePaint style to valid WaveDrom edge style
            let edgeStyle = ts.style || '-|';
            // Ensure style ends with > for arrowhead if no direction indicator
            if (!edgeStyle.includes('>') && !edgeStyle.includes('<')) {
                edgeStyle = edgeStyle + '>';
            }
            
            let edgeStr = `${fromNode}${edgeStyle}${toNode}`;
            // Time span markers can have labels directly on them
            if (ts.label) {
                edgeStr += ` ${ts.label}`;
            }
            edges.push(edgeStr);
        });
    }
    
    return { nodeMap, edges, nodeCharCode };
}

/**
 * Export a single signal to WaveDrom format
 * @param {object} signal - The signal to export
 * @param {number} signalIndex - Index of the signal
 * @param {number} sampleCount - Number of samples
 * @param {number} docSubStepCount - Document's substep count (used for array indexing)
 * @param {Map} nodeMap - Map of node positions for arrows
 * @param {Set} timeJumpSamples - Set of sample positions with time jumps
 * @param {boolean} usePreservedNodes - Whether to use preserved waveDromNode strings
 * @param {number} maxDocSubSteps - Maximum substeps in the document (for array access)
 * @returns {object} WaveLane object
 */
function exportSignalToWaveDrom(signal, signalIndex, sampleCount, docSubStepCount, nodeMap, timeJumpSamples, usePreservedNodes = false, maxDocSubSteps = null) {
    // Get constants
    const SignalType = window.SignalType || { Bit: 0, Vector: 1, BlankRow: 2 };
    const WaveValue = window.WaveDromConstants?.WaveValue || { LOW: 0, HIGH: 1, UNDEFINED: -1, HIGHZ: 2, PULLUP: 3, PULLDOWN: 4, GAP: 5 };
    const getWaveDromColorCode = window.WaveDromConstants?.getWaveDromColorCode || (() => '=');
    const detectClockPattern = window.WaveDromUtils?.detectClockPattern || (() => null);

    // For array indexing, use the max substeps of the document (how data is actually stored)
    const signalSubSteps = (signal.subSteps && signal.subSteps > 0) ? signal.subSteps : 0;
    const arraySubSteps = maxDocSubSteps !== null ? maxDocSubSteps : Math.max(docSubStepCount, signalSubSteps);
    
    // For clock detection: a signal is a clock if IT has substeps > 0 (not global)
    // Signals with global substeps but no signal.subSteps are NOT clocks
    // This is the key difference: only signals that were imported as clocks have signal.subSteps = 1
    const isClockSignal = signalSubSteps > 0;

    // Blank row - but check if it's a node-only row
    if (signal.type === SignalType.BlankRow) {
        // If this is a node-only row, return just the node string
        if (signal.isNodeOnlyRow && signal.waveDromNode) {
            const waveLane = {};
            waveLane.node = signal.waveDromNode;
            if (signal.waveDromPhase) {
                waveLane.phase = signal.waveDromPhase;
            }
            return waveLane;
        }
        return {};
    }

    const waveLane = {
        name: signal.name
    };

    let waveStr = '';
    let dataArray = [];
    let nodeStr = '';
    let lastValue = null;
    let lastLabel = null;
    let lastWaveChar = null;
    let lastDriveStrength = 0;

    const hasPreservedChars = signal.waveDromChars && signal.waveDromChars.some(c => c !== null);
    
    // Calculate effective sample count based on signal's period
    // A signal with period:2 should generate half as many wave characters
    const signalPeriod = signal.waveDromPeriod || 1;
    let effectiveSampleCount = Math.ceil(sampleCount / signalPeriod);
    
    // If we have the original wave string length, limit to it
    // This prevents generating extra characters for shorter signals in a document
    if (signal.waveDromWaveLength) {
        effectiveSampleCount = Math.min(effectiveSampleCount, signal.waveDromWaveLength);
    } else if (signal.waveDromWave) {
        effectiveSampleCount = Math.min(effectiveSampleCount, signal.waveDromWave.length);
    }
    
    // Check if signal has sloped transitions (riseTime/fallTime > 0)
    // Signals with slopes are NOT clocks
    const hasSlopes = (signal.riseTime > 0) || (signal.fallTime > 0);
    
    // stepSize for array access - based on document's max substeps
    const stepSize = arraySubSteps + 1;
    
    // Helper to detect if a step has clock-like transition across the full period span
    // Returns 'p' if high->low, 'n' if low->high, null if no transition or not bit signal
    const detectStepClockPattern = (stepIndex) => {
        if (signal.type !== SignalType.Bit) return null;
        if (hasSlopes) return null;
        // Only detect clock pattern if this signal has substeps (isClockSignal)
        if (!isClockSignal) return null;
        
        // Account for signal period when calculating base index
        const baseIdx = (stepIndex * signalPeriod) * stepSize;
        const periodSpan = signalPeriod * stepSize;
        const halfSpan = Math.floor(periodSpan / 2);
        if (halfSpan < 1 || baseIdx + halfSpan >= signal.values.length) return null;
        
        const val0 = signal.values[baseIdx];              // Start of period
        const val1 = signal.values[baseIdx + halfSpan];   // Mid-period
        
        // Check for clock transition within the step
        const isHigh0 = (val0 === 1);
        const isLow0 = (val0 === 0);
        const isHigh1 = (val1 === 1);
        const isLow1 = (val1 === 0);
        
        // Check if this position has a clock marker (uses per-position clockMarkers array)
        const hasMarker = signal.clockMarkers ? signal.clockMarkers[baseIdx] : false;
        
        if (isHigh0 && isLow1) {
            // High -> Low = positive edge clock (p/P)
            return hasMarker ? 'P' : 'p';
        } else if (isLow0 && isHigh1) {
            // Low -> High = negative edge clock (n/N)
            return hasMarker ? 'N' : 'n';
        }
        
        return null;
    };

    for (let i = 0; i < effectiveSampleCount; i++) {
        // Adjust effectiveIdx to account for period - each wave character spans 'period' samples
        // Use stepSize (based on arraySubSteps) for correct array indexing
        const effectiveIdx = (i * signalPeriod) * stepSize;
        const value = signal.values[effectiveIdx];
        const label = signal.labels[effectiveIdx] || '';
        const style = signal.segmentStyles ? signal.segmentStyles[effectiveIdx] : null;
        const preservedChar = signal.waveDromChars ? signal.waveDromChars[effectiveIdx] : null;

        // Build node string for arrows - use effectiveIdx to match arrow positions
        // The nodeMap is built from arrow.startSample/endSample which are effectiveIdx values
        const nodeKey = `${signalIndex}_${effectiveIdx}`;
        if (nodeMap && nodeMap.has(nodeKey)) {
            nodeStr += nodeMap.get(nodeKey);
        } else {
            nodeStr += '.';
        }

        // Check for time jump at this sample (only when not using preserved chars)
        if (!hasPreservedChars && timeJumpSamples && timeJumpSamples.has(effectiveIdx)) {
            waveStr += '|';
            // Note: Don't update lastWaveChar - time jump is visual only, 
            // state continues after the gap
            continue;
        }

        // BIT SIGNALS
        if (signal.type === SignalType.Bit) {
            // Get drive strength enum reference (supports both browser and Node.js)
            const DriveStrengthEnum = (typeof DriveStrength !== 'undefined' ? DriveStrength : 
                                      (typeof window !== 'undefined' && window.DriveStrength) || 
                                      { Strong: 0, Weak: 1, WeakMarker: 2 });
            
            // Use preserved character if available
            if (hasPreservedChars) {
                if (preservedChar !== null) {
                    waveStr += preservedChar;
                    lastWaveChar = preservedChar === '.' ? lastWaveChar : preservedChar;
                    lastValue = value;
                    // Infer drive strength from preserved char
                    if (preservedChar === 'h' || preservedChar === 'l') {
                        lastDriveStrength = DriveStrengthEnum.Weak;
                    } else if (preservedChar === 'H' || preservedChar === 'L') {
                        lastDriveStrength = DriveStrengthEnum.WeakMarker;
                    } else if (preservedChar === '0' || preservedChar === '1') {
                        lastDriveStrength = DriveStrengthEnum.Strong;
                    }
                    continue;
                }
                // If preservedChar is null but we have preserved chars elsewhere,
                // this position is beyond the original wave string - skip it
                // (or extend with the last state)
            }
            
            // Check if this step has a clock pattern (transition within substeps)
            const stepClockChar = detectStepClockPattern(i);
            if (stepClockChar) {
                // Check if we can use '.' (same clock pattern AND same marker as previous)
                // Only use '.' if both the clock type (p/n) and marker (P/N vs p/n) are identical
                const isSameAsPrev = lastWaveChar === stepClockChar;
                if (isSameAsPrev) {
                    waveStr += '.';
                } else {
                    waveStr += stepClockChar;
                    lastWaveChar = stepClockChar;
                }
                lastValue = value;
                continue;
            }
            
            // Normal bit signal (no clock transition in this step)
            let waveChar;
            
            // Get drive strength for this sample
            const driveStrength = signal.driveStrengths ? signal.driveStrengths[effectiveIdx] : 0;
            
            // Determine if current value matches the previous state (for using '.')
            const prevIsLow = lastWaveChar === '0' || lastWaveChar === 'l' || lastWaveChar === 'L';
            const prevIsHigh = lastWaveChar === '1' || lastWaveChar === 'h' || lastWaveChar === 'H';
            
            if (value === 0 || value === WaveValue.LOW) {
                // Only use '.' if previous was also low state with same drive strength
                if (i > 0 && prevIsLow && lastValue === 0 && lastDriveStrength === driveStrength) {
                    waveChar = '.';
                } else if (driveStrength === DriveStrengthEnum.Weak) {
                    waveChar = 'l';
                } else if (driveStrength === DriveStrengthEnum.WeakMarker) {
                    waveChar = 'L';
                } else {
                    waveChar = '0';
                }
            } else if (value === 1 || value === WaveValue.HIGH) {
                // Only use '.' if previous was also high state with same drive strength
                if (i > 0 && prevIsHigh && lastValue === 1 && lastDriveStrength === driveStrength) {
                    waveChar = '.';
                } else if (driveStrength === DriveStrengthEnum.Weak) {
                    waveChar = 'h';
                } else if (driveStrength === DriveStrengthEnum.WeakMarker) {
                    waveChar = 'H';
                } else {
                    waveChar = '1';
                }
            } else if (value === 2 || value === WaveValue.HIGHZ) {
                waveChar = i > 0 && lastValue === value && lastWaveChar === 'z' ? '.' : 'z';
            } else if (value === 3 || value === WaveValue.PULLUP) {
                waveChar = i > 0 && lastValue === value && lastWaveChar === 'u' ? '.' : 'u';
            } else if (value === 4 || value === WaveValue.PULLDOWN) {
                waveChar = i > 0 && lastValue === value && lastWaveChar === 'd' ? '.' : 'd';
            } else {
                // Undefined value (x)
                waveChar = i > 0 && lastValue === value && lastWaveChar === 'x' ? '.' : 'x';
            }
            
            waveStr += waveChar;
            lastWaveChar = waveChar === '.' ? lastWaveChar : waveChar;
            lastValue = value;
            lastDriveStrength = driveStrength;
            
        // VECTOR SIGNALS
        } else if (signal.type === SignalType.Vector) {
            if (hasPreservedChars) {
                // Use preserved character if available - this takes priority over hatched detection
                // because the preserved char already encodes the original type (x, z, etc.)
                if (preservedChar !== null) {
                    waveStr += preservedChar;
                    if (/[=23456789]/.test(preservedChar)) {
                        dataArray.push(label || (value >= 0 ? String(value) : ''));
                    }
                    lastWaveChar = preservedChar === '.' ? lastWaveChar : preservedChar;
                    lastValue = value;
                    lastLabel = label;
                    continue;
                }
                // If preservedChar is null, fall through to generate based on values
            }
            
            // Generate wave string for vectors
            const labelLower = label.toLowerCase().trim();
            
            // Check for special labels that map to specific wave characters
            // Note: We DON'T treat numeric labels like '0' or '1' as bit values -
            // those are data labels. Only explicit 'low'/'l' or 'high'/'h' are treated specially.
            // Only when there's NO colorCode at this position (colorCode indicates it's data from =,2-9).
            if ((labelLower === 'l' || labelLower === 'low') && 
                !(signal.waveDromColorCodes && signal.waveDromColorCodes[effectiveIdx])) {
                if (i > 0 && lastLabel === labelLower) {
                    waveStr += '.';
                } else {
                    waveStr += '0';
                }
                lastLabel = labelLower;
                lastValue = value;
            } else if ((labelLower === 'h' || labelLower === 'high') && 
                       !(signal.waveDromColorCodes && signal.waveDromColorCodes[effectiveIdx])) {
                if (i > 0 && lastLabel === labelLower) {
                    waveStr += '.';
                } else {
                    waveStr += '1';
                }
                lastLabel = labelLower;
                lastValue = value;
            } else if ((labelLower === 'z' || labelLower === 'hi-z' || labelLower === 'hiz') && 
                       !(signal.waveDromColorCodes && signal.waveDromColorCodes[effectiveIdx])) {
                // High-impedance for vector signals: 'z' state character
                // Only when there's NO colorCode at this position (colorCode indicates it's data from =,2-9)
                if (i > 0 && lastLabel === labelLower) {
                    waveStr += '.';
                } else {
                    waveStr += 'z';
                }
                lastLabel = labelLower;
                lastValue = value;
            } else if (labelLower === 'u' && !signal.waveDromHadData) {
                // Pull-up for vector signals: label 'u' when NOT from a data array
                // (wave chars u/d in vectors without explicit data)
                // Note: For vectors, value is dataIndex, not WaveValue.PULLUP, so we only check label
                if (i > 0 && lastValue === value && lastLabel === labelLower) {
                    waveStr += '.';
                } else {
                    waveStr += 'u';
                    // Don't add to dataArray for u - it's a special character, not data
                }
                lastLabel = labelLower;
                lastValue = value;
                lastWaveChar = 'u';
            } else if (labelLower === 'd' && !signal.waveDromHadData) {
                // Pull-down for vector signals: label 'd' when NOT from a data array
                // (wave chars u/d in vectors without explicit data)
                // Note: For vectors, value is dataIndex, not WaveValue.PULLDOWN, so we only check label
                if (i > 0 && lastValue === value && lastLabel === labelLower) {
                    waveStr += '.';
                } else {
                    waveStr += 'd';
                    // Don't add to dataArray for d - it's a special character, not data
                }
                lastLabel = labelLower;
                lastValue = value;
                lastWaveChar = 'd';
            } else if ((labelLower === 'x' || labelLower === 'undefined') && 
                       !(signal.waveDromColorCodes && signal.waveDromColorCodes[effectiveIdx])) {
                // Explicit 'x' label for undefined state
                // Only when there's NO colorCode at this position (colorCode indicates it's data from =,2-9)
                if (i > 0 && lastWaveChar === 'x') {
                    waveStr += '.';
                } else {
                    waveStr += 'x';
                    lastWaveChar = 'x';
                }
                lastLabel = labelLower;
                lastValue = value;
            } else if (style && style.hatched) {
                // Hatched segment - always export as 'x' (undefined/error state)
                if (i > 0 && lastWaveChar === 'x') {
                    waveStr += '.';
                } else {
                    waveStr += 'x';
                    lastWaveChar = 'x';
                }
                lastLabel = label;
                lastValue = value;
            } else if (value === -1) {
                // Undefined value without explicit label or hatching
                if (i > 0 && lastValue === -1) {
                    waveStr += '.';
                } else {
                    waveStr += 'x';
                    lastWaveChar = 'x';
                }
                lastLabel = '';
                lastValue = value;
            } else if (label === '' && (value === 0 || value === 1)) {
                // Wire state: value 0 or 1 with empty label = '0' or '1' character (no data box)
                const wireChar = value === 0 ? '0' : '1';
                if (i > 0 && lastValue === value && lastLabel === '') {
                    waveStr += '.';
                } else {
                    waveStr += wireChar;
                    lastWaveChar = wireChar;
                }
                lastLabel = '';
                lastValue = value;
            } else {
                // Normal data segment
                // A segment continues (use '.') if:
                // 1. Same label as previous AND same value
                // 2. OR empty label with same value
                const isSameSegment = i > 0 && 
                    ((label === lastLabel && label !== '') || 
                     (label === '' && lastLabel === '' && value === lastValue));
                
                if (isSameSegment && lastValue === value) {
                    waveStr += '.';
                } else {
                    // Determine color code for this segment
                    let colorCode = '=';
                    // First check if we have an original WaveDrom color code stored
                    // Use effectiveIdx which is the sample index where colorCodes are stored
                    if (signal.waveDromColorCodes && signal.waveDromColorCodes[effectiveIdx]) {
                        colorCode = signal.waveDromColorCodes[effectiveIdx];
                    } else if (style && style.fill) {
                        // Fall back to color lookup if no original code stored
                        colorCode = getWaveDromColorCode(style.fill);
                    }
                    // Use '=' for all data segments unless explicit color is set
                    // WaveDrom uses =,2,3,4,5,6,7,8,9 for different colors
                    // but '=' is the default/first color
                    waveStr += colorCode;
                    // Add label to data array - WaveDrom consumes one label per =,2-9 character
                    dataArray.push(label || (value >= 0 ? String(value) : ''));
                    lastWaveChar = colorCode;
                }
                lastLabel = label;
                lastValue = value;
            }
        }
    }
    
    // Note: We no longer trim trailing dots because:
    // 1. It can cause signal length mismatches after round-trip
    // 2. WaveDrom handles trailing dots fine
    // 3. Length matters for node/edge alignment

    // Check if any segment has hatching that wasn't in the original wave
    let hasModifiedHatching = false;
    if (signal.waveDromWave && signal.type === SignalType.Vector) {
        for (let i = 0; i < sampleCount; i++) {
            const effectiveIdx = i * stepSize;
            const style = signal.segmentStyles ? signal.segmentStyles[effectiveIdx] : null;
            const originalChar = signal.waveDromWave[i] || '';
            // If this segment has hatching but original wasn't 'x', it's been modified
            if (style && style.hatched && originalChar !== 'x' && originalChar !== '.') {
                hasModifiedHatching = true;
                break;
            }
            // Also check if original was 'x' but hatching was removed
            if (originalChar === 'x' && (!style || !style.hatched)) {
                hasModifiedHatching = true;
                break;
            }
        }
    }

    // ALWAYS generate wave from WavePaint values - no preserved strings
    // WavePaint is the canonical format, WaveDrom export is a translation
    waveLane.wave = waveStr;
    
    // Include data array if there are any data elements to show
    // Always export data when we have labels to display - user edits take priority
    if (dataArray.length > 0) {
        waveLane.data = dataArray;
    }
    
    // Add period/phase - these are semantic properties that affect timing
    if (signal.waveDromPeriod !== null && signal.waveDromPeriod !== undefined) {
        waveLane.period = signal.waveDromPeriod;
    }
    if (signal.waveDromPhase !== null && signal.waveDromPhase !== undefined) {
        waveLane.phase = signal.waveDromPhase;
    }

    // Generate node string from arrow positions - no preserved strings
    const trimmedNodeStr = nodeStr.replace(/\.+$/, '');
    if (trimmedNodeStr.replace(/\./g, '').length > 0) {
        waveLane.node = trimmedNodeStr;
    }

    return waveLane;
}

/**
 * Build nested group structure from signals with groupPath
 * @param {Array} signals - Array of WavePaint signals
 * @param {number} sampleCount - Number of samples
 * @param {number} subStepCount - Number of substeps
 * @param {Map} nodeMap - Node map for arrows
 * @param {Set} timeJumpSamples - Set of time jump positions
 * @param {boolean} usePreservedNodes - Whether to use preserved node strings
 * @param {number} maxSubSteps - Maximum substeps in the document
 * @returns {Array} WaveDrom signal array with nested groups
 */
function buildNestedGroupStructure(signals, sampleCount, subStepCount, nodeMap, timeJumpSamples, usePreservedNodes, maxSubSteps) {
    const result = [];
    let i = 0;
    
    while (i < signals.length) {
        const signal = signals[i];
        const groupPath = signal.groupPath;
        
        if (groupPath && groupPath.length > 0) {
            // This signal belongs to a group - find all signals with the same root group
            const rootGroup = groupPath[0];
            
            // Collect all consecutive signals that share this root group
            const groupSignals = [];
            let j = i;
            while (j < signals.length && 
                   signals[j].groupPath && 
                   signals[j].groupPath.length > 0 && 
                   signals[j].groupPath[0] === rootGroup) {
                groupSignals.push({ signal: signals[j], index: j });
                j++;
            }
            
            // Build the nested structure for this group
            const groupArray = buildGroupArray(rootGroup, groupSignals, 0, sampleCount, subStepCount, nodeMap, timeJumpSamples, usePreservedNodes, maxSubSteps);
            result.push(groupArray);
            
            i = j;
        } else {
            // Signal not in any group
            result.push(exportSignalToWaveDrom(signal, i, sampleCount, subStepCount, nodeMap, timeJumpSamples, usePreservedNodes, maxSubSteps));
            i++;
        }
    }
    
    return result;
}

/**
 * Recursively build a group array with nested subgroups
 * @param {string} groupName - Name of this group
 * @param {Array} groupSignals - Array of {signal, index} objects belonging to this group or its subgroups
 * @param {number} depth - Current depth in the group hierarchy
 * @param {number} sampleCount - Number of samples
 * @param {number} subStepCount - Number of substeps
 * @param {Map} nodeMap - Node map for arrows
 * @param {Set} timeJumpSamples - Set of time jump positions
 * @param {boolean} usePreservedNodes - Whether to use preserved node strings
 * @param {number} maxSubSteps - Maximum substeps in the document
 * @returns {Array} WaveDrom group array [groupName, ...contents]
 */
function buildGroupArray(groupName, groupSignals, depth, sampleCount, subStepCount, nodeMap, timeJumpSamples, usePreservedNodes, maxSubSteps) {
    const result = [groupName];
    let i = 0;
    
    while (i < groupSignals.length) {
        const { signal, index } = groupSignals[i];
        const groupPath = signal.groupPath || [];
        
        // Check if this signal has a subgroup at depth+1
        if (groupPath.length > depth + 1) {
            // This signal belongs to a subgroup
            const subGroupName = groupPath[depth + 1];
            
            // Collect all consecutive signals that share this subgroup
            const subGroupSignals = [];
            let j = i;
            while (j < groupSignals.length) {
                const { signal: sig } = groupSignals[j];
                const path = sig.groupPath || [];
                if (path.length > depth + 1 && path[depth + 1] === subGroupName) {
                    subGroupSignals.push(groupSignals[j]);
                    j++;
                } else {
                    break;
                }
            }
            
            // Recursively build the subgroup
            const subGroupArray = buildGroupArray(subGroupName, subGroupSignals, depth + 1, sampleCount, subStepCount, nodeMap, timeJumpSamples, usePreservedNodes, maxSubSteps);
            result.push(subGroupArray);
            
            i = j;
        } else {
            // This signal is directly in this group (not in a subgroup)
            result.push(exportSignalToWaveDrom(signal, index, sampleCount, subStepCount, nodeMap, timeJumpSamples, usePreservedNodes, maxSubSteps));
            i++;
        }
    }
    
    return result;
}

/**
 * Check if any signal has a groupPath (nested group structure)
 * @param {Array} signals - Array of signals
 * @returns {boolean} True if any signal has groupPath
 */
function hasNestedGroups(signals) {
    return signals.some(s => s.groupPath && s.groupPath.length > 0);
}

/**
 * Reconstruct signal structure from preserved WaveDrom structure
 * @param {Array} structure - Preserved WaveDrom signal structure
 * @param {Array} signals - Array of WavePaint signals
 * @param {number} sampleCount - Number of samples
 * @param {number} subStepCount - Number of substeps
 * @param {Map} nodeMap - Node map for arrows
 * @param {Set} timeJumpSamples - Set of time jump positions
 * @param {boolean} usePreservedNodes - Whether to use preserved node strings
 * @param {number} maxSubSteps - Maximum substeps in the document
 * @returns {Array} Reconstructed WaveDrom signal array
 */
function reconstructSignalStructure(structure, signals, sampleCount, subStepCount, nodeMap, timeJumpSamples, usePreservedNodes = false, maxSubSteps = null) {
    let signalIndex = 0;
    
    function processStructure(struct) {
        return struct.map(item => {
            if (Array.isArray(item)) {
                // Group: could be [groupName, sig1, sig2] or [sig1, sig2] (no name)
                const hasGroupName = typeof item[0] === 'string';
                if (hasGroupName) {
                    const groupName = item[0];
                    const groupContent = item.slice(1);
                    return [groupName, ...processStructure(groupContent)];
                } else {
                    // No group name, just nested array
                    return processStructure(item);
                }
            } else if (typeof item === 'object' && item !== null && (item.name !== undefined || item.wave !== undefined)) {
                // Signal object
                const signal = signals[signalIndex++];
                if (signal) {
                    return exportSignalToWaveDrom(signal, signalIndex - 1, sampleCount, subStepCount, nodeMap, timeJumpSamples, usePreservedNodes, maxSubSteps);
                } else {
                    // Signal not found, return original
                    return item;
                }
            } else if (typeof item === 'object' && item !== null && Object.keys(item).length === 0) {
                // Blank row
                const signal = signals[signalIndex++];
                // Check if it's a node-only row
                if (signal && signal.isNodeOnlyRow && signal.waveDromNode) {
                    return exportSignalToWaveDrom(signal, signalIndex - 1, sampleCount, subStepCount, nodeMap, timeJumpSamples, usePreservedNodes, maxSubSteps);
                }
                return {};
            } else if (typeof item === 'object' && item !== null && item.node !== undefined) {
                // Node-only row (has node but no name/wave)
                const signal = signals[signalIndex++];
                if (signal && signal.waveDromNode) {
                    return exportSignalToWaveDrom(signal, signalIndex - 1, sampleCount, subStepCount, nodeMap, timeJumpSamples, usePreservedNodes, maxSubSteps);
                }
                return item;
            } else if (typeof item === 'string') {
                // Standalone string (group separator or label)
                return item;
            } else {
                // Unknown, pass through
                return item;
            }
        });
    }
    
    return processStructure(structure);
}

/**
 * Check if an edge style is a "sharp" style (straight lines) vs "spline" (curved)
 * Sharp styles go to TimeSpanMarkers, splines go to Arrows
 * @param {string} style - The edge style string
 * @returns {boolean} True if this is a sharp/straight edge style
 */
function isSharpEdgeStyle(style) {
    // Spline styles contain '~' character
    if (style.includes('~')) {
        return false;
    }
    // Sharp styles use '-', '|', '>' combinations without '~'
    // Examples: -, ->, -|, -|>, |-, |->, -|->
    return true;
}

/**
 * Check if arrows and time span markers match preserved edges (for round-trip fidelity)
 * @param {WaveDocument} doc - The document
 * @returns {boolean} True if we should use preserved edges
 */
function shouldUsePreservedEdges(doc) {
    // If no preserved edges, we can't use them
    if (!doc.m_waveDromEdges || doc.m_waveDromEdges.length === 0) {
        return false;
    }
    
    // Special case: if we have preserved edges but no arrows/timespans,
    // the edges reference nodes that don't exist. Use preserved edges for round-trip.
    const actualArrowCount = (doc.m_arrows || []).length;
    const actualTimeSpanCount = (doc.m_timeSpanMarkers || []).length;
    
    if (actualArrowCount === 0 && actualTimeSpanCount === 0) {
        // No arrows or timespans were created - use preserved edges directly
        return true;
    }
    
    // Count expected spline edges (-> m_arrows) and sharp edges (-> m_timeSpanMarkers)
    let expectedArrowCount = 0;
    let expectedTimeSpanCount = 0;
    
    doc.m_waveDromEdges.forEach(edgeStr => {
        const match = edgeStr.match(/^(\w)([-~|<>/]+)(\w)(?:\s+(.*))?$/);
        if (match) {
            const edgeStyle = match[2];
            if (isSharpEdgeStyle(edgeStyle)) {
                expectedTimeSpanCount++;
            } else {
                expectedArrowCount++;
            }
        } else {
            // Simple edges without style default to spline
            expectedArrowCount++;
        }
    });
    
    // Check counts match
    if (actualArrowCount !== expectedArrowCount || actualTimeSpanCount !== expectedTimeSpanCount) {
        return false;
    }
    
    // Check if all non-blank signals have preserved node strings
    // (blank rows that are not node-only rows don't have nodes)
    const SignalType = window.SignalType || { Bit: 0, Vector: 1, BlankRow: 2 };
    const hasPreservedNodes = doc.m_signals.every(sig => {
        // Regular blank rows (not node-only) don't need nodes
        if (sig.type === SignalType.BlankRow && !sig.isNodeOnlyRow) {
            return true;
        }
        // Node-only rows must have waveDromNode
        if (sig.isNodeOnlyRow) {
            return sig.waveDromNode !== null && sig.waveDromNode !== undefined;
        }
        // Regular signals may or may not have nodes (only if they have arrows)
        // We'll check during arrow verification
        return true;
    });
    
    if (!hasPreservedNodes) {
        return false;
    }
    
    // Build a map of original node positions from preserved waveDromNode strings
    const originalNodePositions = new Map();
    doc.m_signals.forEach((sig, sigIdx) => {
        const nodeStr = sig.waveDromNode;
        if (nodeStr) {
            const period = sig.waveDromPeriod || 1;
            for (let i = 0; i < nodeStr.length; i++) {
                const nodeChar = nodeStr[i];
                if (nodeChar !== '.') {
                    const samplePos = i * period;
                    originalNodePositions.set(nodeChar, { signalIndex: sigIdx, sample: samplePos });
                }
            }
        }
    });
    
    // Check if current arrows and time spans match the original edges
    let arrowIdx = 0;
    let timeSpanIdx = 0;
    
    for (const edgeStr of doc.m_waveDromEdges) {
        const match = edgeStr.match(/^(\w)([-~|<>/]+)(\w)(?:\s+(.*))?$/);
        if (!match) continue;
        
        const fromNode = match[1];
        const edgeStyle = match[2];
        const toNode = match[3];
        
        const fromPos = originalNodePositions.get(fromNode);
        const toPos = originalNodePositions.get(toNode);
        
        if (!fromPos || !toPos) return false;
        
        if (isSharpEdgeStyle(edgeStyle)) {
            // Should match a time span marker
            if (timeSpanIdx >= (doc.m_timeSpanMarkers || []).length) return false;
            const ts = doc.m_timeSpanMarkers[timeSpanIdx++];
            // Convert fractional positions to effective sample indices for comparison
            const divisor = (doc.m_subStepCount || 0) + 1;
            const tsStartSample = Math.round(ts.startPosition * divisor);
            const tsEndSample = Math.round(ts.endPosition * divisor);
            if (fromPos.signalIndex !== ts.startSignal || fromPos.sample !== tsStartSample) return false;
            if (toPos.signalIndex !== ts.endSignal || toPos.sample !== tsEndSample) return false;
        } else {
            // Should match an arrow
            if (arrowIdx >= (doc.m_arrows || []).length) return false;
            const arrow = doc.m_arrows[arrowIdx++];
            // Convert fractional positions to effective sample indices for comparison
            const divisor = (doc.m_subStepCount || 0) + 1;
            const arrowStartSample = Math.round(arrow.startPosition * divisor);
            const arrowEndSample = Math.round(arrow.endPosition * divisor);
            if (fromPos.signalIndex !== arrow.startSignal || fromPos.sample !== arrowStartSample) return false;
            if (toPos.signalIndex !== arrow.endSignal || toPos.sample !== arrowEndSample) return false;
        }
    }
    
    return true;
}

/**
 * Export WaveDocument to WaveDrom JSON format
 * @param {WaveDocument} doc - The document to export
 * @returns {object} WaveJSON object
 */
function exportToWaveDrom(doc) {
    const waveJson = {
        signal: [],
        config: {}
    };

    const signals = doc.m_signals;
    const sampleCount = doc.m_sampleCount;
    const subStepCount = doc.m_subStepCount || 0;
    
    // Calculate max substeps across all signals (for correct array indexing)
    const maxSubSteps = doc.maxSubSteps ? doc.maxSubSteps() : subStepCount;
    
    // Build set of time jump sample positions
    const timeJumpSamples = new Set();
    if (doc.m_timeJumps) {
        doc.m_timeJumps.forEach(tj => {
            timeJumpSamples.add(tj.sample);
        });
    }

    // Determine if we should use preserved edges and nodes for round-trip fidelity
    const usePreservedEdges = shouldUsePreservedEdges(doc);
    
    // Build node map from arrows and time span markers - use local function to ensure availability
    // Only used when NOT using preserved edges
    let nodeMap, edges, nodeCharCode;
    if (usePreservedEdges) {
        // Use preserved edges directly - no need to build nodeMap
        nodeMap = new Map(); // Empty map - will use waveDromNode strings directly
        edges = doc.m_waveDromEdges;
        nodeCharCode = 97;
    } else {
        const result = buildNodeMapFromArrowsLocal(
            doc.m_arrows || [], 
            doc.m_timeSpanMarkers || [], 
            doc.m_textAnnotations || [],
            doc.m_subStepCount || 0  // Pass globalSubSteps for position conversion
        );
        nodeMap = result.nodeMap;
        edges = result.edges;
        nodeCharCode = result.nodeCharCode;
    }

    // Obtener grupos del nuevo modelo simplificado
    const groups = typeof GroupManager !== 'undefined' ? GroupManager.getGroups(doc) : [];

    // If we have preserved signal structure (for groups), use it
    if (doc.m_waveDromSignalStructure) {
        waveJson.signal = reconstructSignalStructure(
            doc.m_waveDromSignalStructure, 
            signals, 
            sampleCount, 
            subStepCount, 
            nodeMap, 
            timeJumpSamples,
            usePreservedEdges,
            maxSubSteps
        );
    } else if (hasNestedGroups(signals)) {
        // Build structure from groupPath (supports nested subgroups)
        waveJson.signal = buildNestedGroupStructure(
            signals, 
            sampleCount, 
            subStepCount, 
            nodeMap, 
            timeJumpSamples,
            usePreservedEdges,
            maxSubSteps
        );
    } else if (groups && groups.length > 0) {
        // Build structure from WavePaint groups (nuevo modelo simplificado)
        // Los grupos ahora son: { name, color, startIndex, endIndex }
        const processedSignals = new Set();
        
        // Procesar señales en orden, agrupando las que pertenecen a grupos
        let i = 0;
        while (i < signals.length) {
            const signal = signals[i];
            
            // Buscar si esta señal pertenece a un grupo
            const group = groups.find(g => i >= g.startIndex && i <= g.endIndex);
            
            if (group && !processedSignals.has(group.name)) {
                // Crear array de grupo con todas las señales del grupo
                const groupArray = [group.name];
                for (let j = group.startIndex; j <= group.endIndex; j++) {
                    groupArray.push(
                        exportSignalToWaveDrom(signals[j], j, sampleCount, subStepCount, nodeMap, timeJumpSamples, usePreservedEdges, maxSubSteps)
                    );
                    processedSignals.add(j);
                }
                waveJson.signal.push(groupArray);
                processedSignals.add(group.name);
                i = group.endIndex + 1;
            } else if (!processedSignals.has(i)) {
                waveJson.signal.push(
                    exportSignalToWaveDrom(signal, i, sampleCount, subStepCount, nodeMap, timeJumpSamples, usePreservedEdges, maxSubSteps)
                );
                processedSignals.add(i);
                i++;
            } else {
                i++;
            }
        }
    } else {
        // No preserved structure and no groups, export flat
        signals.forEach((signal, signalIndex) => {
            waveJson.signal.push(
                exportSignalToWaveDrom(signal, signalIndex, sampleCount, subStepCount, nodeMap, timeJumpSamples, usePreservedEdges, maxSubSteps)
            );
        });
    }
    
    // Add edges (arrows and time span markers combined)
    // When using preserved edges, we use them directly
    // When not using preserved edges, buildNodeMapFromArrowsLocal already combined arrows and time span markers
    if (edges.length > 0) {
        waveJson.edge = edges;
    }

    // Add head/foot for markers, timeline, and document annotations
    if (doc.m_markers && doc.m_markers.length > 0) {
        waveJson.head = waveJson.head || {};
        waveJson.head.tick = 0;
    }
    
    // Note: Signal-anchored text annotations and time span markers are WavePaint-specific
    // features that don't have direct WaveDrom equivalents. We store them in a separate
    // metadata object that WaveDrom will ignore but WavePaint can read back.
    // This preserves WaveDrom compatibility while enabling round-trip fidelity.
    
    // Build WavePaint metadata (stored separately, not in main WaveDrom properties)
    // Only add metadata when NOT doing a pure round-trip (usePreservedEdges indicates round-trip mode)
    const wavepaintMeta = {};
    
    // Export signal-anchored text annotations (only when not in round-trip mode)
    if (!usePreservedEdges) {
        const signalAnnotations = (doc.m_textAnnotations || []).filter(
            ann => ann.anchorType === 'Signal' && ann.text
        );
        if (signalAnnotations.length > 0) {
            wavepaintMeta.annotations = signalAnnotations.map(ann => ({
                type: ann.anchorType,
                signalIndex: ann.anchorId,
                sample: ann.sample,
                text: ann.text,
                vPos: ann.vPos
            }));
        }
    }
    
    // Export time span markers metadata for round-trip ONLY if NOT using preserved edges
    // (When usePreservedEdges is true, the edges already contain the time span info)
    if (!usePreservedEdges && doc.m_timeSpanMarkers && doc.m_timeSpanMarkers.length > 0) {
        // Convert fractional positions to effective sample indices for WaveDrom compatibility
        const divisor = (doc.m_subStepCount || 0) + 1;
        wavepaintMeta.timeSpans = doc.m_timeSpanMarkers.map(ts => ({
            startSignal: ts.startSignal,
            startSample: Math.round(ts.startPosition * divisor),
            endSignal: ts.endSignal,
            endSample: Math.round(ts.endPosition * divisor),
            style: ts.style || '-|',
            color: ts.color
        }));
    }
    
    // Export per-signal edge shapes (rise/fall time) so a round-trip through
    // the WaveDrom panel keeps WavePaint rendering, e.g. straight clock edges
    // instead of the sloped default that 0/1 chars would imply (issue #7)
    if (!usePreservedEdges && doc.m_signals && doc.m_signals.length > 0) {
        const styles = doc.m_signals.map(s => ({
            riseTime: s.riseTime || 0,
            fallTime: s.fallTime || 0
        }));
        wavepaintMeta.signalStyles = styles;
    }

    // Add skin info to wavepaint metadata ONLY if not doing a pure round-trip
    // (during round-trip, we want to preserve the original exactly)
    if (!usePreservedEdges && typeof getCurrentSkin === 'function') {
        const skin = getCurrentSkin();
        if (skin && skin.id) {
            wavepaintMeta.skin = skin.id;
        }
    }
    
    // Only add wavepaint metadata if there's something to store
    if (Object.keys(wavepaintMeta).length > 0) {
        waveJson.config = waveJson.config || {};
        waveJson.config.wavepaint = wavepaintMeta;
    }

    // Export saved WaveDrom head/foot for round-trip fidelity
    if (doc.m_waveDromHead) {
        waveJson.head = doc.m_waveDromHead;
    } else if (doc.m_title) {
        waveJson.head = waveJson.head || {};
        waveJson.head.text = doc.m_title;
    }
    
    if (doc.m_waveDromFoot) {
        waveJson.foot = doc.m_waveDromFoot;
    } else if (doc.m_footer) {
        waveJson.foot = { text: doc.m_footer };
    }
    
    // Export saved WaveDrom config for round-trip fidelity (merge with our config)
    if (doc.m_waveDromConfig) {
        // Merge preserved config but keep our wavepaint metadata
        const wavepaintData = waveJson.config?.wavepaint;
        waveJson.config = { ...doc.m_waveDromConfig };
        if (wavepaintData) {
            waveJson.config.wavepaint = wavepaintData;
        }
    }
    
    // Clean up: remove empty config, remove any underscore-prefixed properties 
    // that might cause issues with WaveDrom
    if (waveJson.config) {
        // Remove old _wavepaint_* keys if they exist from old exports
        Object.keys(waveJson.config).forEach(key => {
            if (key.startsWith('_wavepaint_')) {
                delete waveJson.config[key];
            }
        });
        
        // Remove empty config
        if (Object.keys(waveJson.config).length === 0) {
            delete waveJson.config;
        }
    }

    return waveJson;
}

/**
 * Export WaveDocument to WaveDrom JSON string
 * @param {WaveDocument} doc - The document to export
 * @param {boolean} pretty - Pretty print JSON
 * @returns {string} JSON string
 */
function exportToWaveDromString(doc, pretty = true) {
    const waveJson = exportToWaveDrom(doc);
    return pretty ? JSON.stringify(waveJson, null, 2) : JSON.stringify(waveJson);
}

/**
 * Generate HTML preview with embedded WaveDrom
 * @param {WaveDocument} doc - Source document
 * @returns {string} HTML string
 */
function generateWaveDromPreview(doc) {
    const waveJson = exportToWaveDrom(doc);
    
    return `<!DOCTYPE html>
<html>
<head>
    <title>WaveDrom Preview</title>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/wavedrom/3.1.0/skins/default.js"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/wavedrom/3.1.0/wavedrom.min.js"></script>
</head>
<body onload="WaveDrom.ProcessAll()">
    <script type="WaveDrom">
${JSON.stringify(waveJson, null, 2)}
    </script>
</body>
</html>`;
}

// Export for use in other modules
if (typeof window !== 'undefined') {
    window.WaveDromExport = {
        exportSignalToWaveDrom,
        reconstructSignalStructure,
        exportToWaveDrom,
        exportToWaveDromString,
        generateWaveDromPreview
    };
}
