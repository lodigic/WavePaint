// WaveDromImport.js - Import WaveDrom format to WavePaint documents

/**
 * Pre-scan signals to detect clocks and calculate max substeps needed
 * @param {Array} flatSignals - Flattened signal array
 * @returns {number} Maximum substeps needed (1 for clocks, 0 otherwise)
 */
function prescanForClocks(flatSignals) {
    for (const sig of flatSignals) {
        if (sig.wave) {
            // Check if wave contains clock characters
            if (/[pPnN]/.test(sig.wave)) {
                return 1;  // Clocks need 1 substep
            }
        }
    }
    return 0;  // No clocks, no substeps needed
}

/**
 * Process signal array recursively (handles groups and subgroups)
 * @param {WaveDocument} doc - Target document
 * @param {Array} signals - Signal array
 * @param {Map} nodePositions - Map of node chars to positions
 * @param {number} depth - Recursion depth for groups
 * @param {Array} groupPath - Array of group names from root to current level (for nested groups)
 */
function processSignalArray(doc, signals, nodePositions, depth = 0, groupPath = []) {
    signals.forEach((item, itemIndex) => {
        if (Array.isArray(item)) {
            // This is a group (or subgroup)
            const groupName = typeof item[0] === 'string' ? item[0] : '';
            const groupSignals = typeof item[0] === 'string' ? item.slice(1) : item;
            
            // Build the path to this group (including parent groups)
            const currentGroupPath = groupName ? [...groupPath, groupName] : groupPath;
            
            // Track group start
            const groupStartIndex = doc.m_signals.length;
            
            // Process group signals recursively, passing the current group path
            processSignalArray(doc, groupSignals, nodePositions, depth + 1, currentGroupPath);
            
            // After recursive processing, update group info for signals that don't have deeper nesting
            // The inner groups will have already set their groupPath and groupName
            const groupEndIndex = doc.m_signals.length;
            if (groupName && groupEndIndex > groupStartIndex) {
                // Build hierarchical group name with '/' separator for WavePaint GroupManager
                const hierarchicalGroupName = currentGroupPath.join('/');
                
                for (let i = groupStartIndex; i < groupEndIndex; i++) {
                    // Only set groupName if not already set by a deeper nested group
                    // This ensures the deepest nested group is preserved
                    if (!doc.m_signals[i].groupName) {
                        doc.m_signals[i].groupName = hierarchicalGroupName;
                        doc.m_signals[i].groupColor = '#6496C8';
                    }
                    // Only update groupPath if not already set by a deeper nested group
                    // (deeper groups have longer paths, so we keep those)
                    if (!doc.m_signals[i].groupPath || doc.m_signals[i].groupPath.length === 0) {
                        doc.m_signals[i].groupPath = currentGroupPath;
                    }
                }
            }
        } else if (typeof item === 'object') {
            // This is a signal or blank
            const signalIndex = doc.m_signals.length;
            processWaveLane(doc, item, signalIndex, nodePositions);
            
            // If we're inside a group, assign the group path to this signal
            if (groupPath.length > 0) {
                doc.m_signals[signalIndex].groupPath = groupPath;
                // Build hierarchical group name with '/' separator for WavePaint GroupManager
                const hierarchicalGroupName = groupPath.join('/');
                // Set immediate parent group name if not already set
                if (!doc.m_signals[signalIndex].groupName) {
                    doc.m_signals[signalIndex].groupName = hierarchicalGroupName;
                    doc.m_signals[signalIndex].groupColor = '#6496C8';
                }
            }
        }
    });
}

/**
 * Process a single WaveLane and add it to the document
 * @param {WaveDocument} doc - Target document
 * @param {object} lane - WaveLane object
 * @param {number} signalIndex - Index of this signal
 * @param {Map} nodePositions - Map of node chars to positions
 */
function processWaveLane(doc, lane, signalIndex, nodePositions) {
    const SignalType = window.SignalType || { Bit: 0, Vector: 1, BlankRow: 2 };
    const Signal = window.Signal;
    const WaveValue = window.WaveDromConstants?.WaveValue || { LOW: 0, HIGH: 1, UNDEFINED: -1, HIGHZ: 2, PULLUP: 3, PULLDOWN: 4, GAP: 5 };
    const getStandardWaveDromColors = window.WaveDromConstants?.getStandardWaveDromColors || (() => ({}));
    
    // Calculate effective count using max substeps from pre-scan
    const maxSignalSubSteps = doc._maxSignalSubSteps || 0;
    const stepSize = maxSignalSubSteps + 1;  // How many internal positions per WaveDrom step
    const effectiveCount = doc.m_sampleCount * stepSize;
    
    // Check for node-only row (has node but no name/wave) - used for extra arrow endpoints
    const nodeStr = lane.node || '';
    const hasNodeOnly = !lane.name && !lane.wave && nodeStr;
    
    // Empty object = blank row (but not if it has nodes)
    if (!lane.name && !lane.wave && !hasNodeOnly) {
        const signal = new Signal('', SignalType.BlankRow, effectiveCount);
        doc.m_signals.push(signal);
        return;
    }
    
    // Handle node-only rows - these are rows that only define arrow endpoints
    // They don't create signals but we still need to process their nodes
    if (hasNodeOnly) {
        // Process node string for arrow endpoints without creating a signal
        const period = lane.period || 1;
        for (let i = 0; i < nodeStr.length; i++) {
            const nodeChar = nodeStr[i];
            if (nodeChar !== '.') {
                // Node positions feed arrow/timespan start/end positions, which are
                // fractional (WaveDrom steps), NOT internal indices. Multiplying by
                // stepSize doubled every node when a clock forced substeps (issue #3)
                const waveDromStep = i * period;
                const samplePos = waveDromStep;
                nodePositions.set(nodeChar, {
                    signalIndex: signalIndex,  // Use current signal index (will be the next signal)
                    sample: samplePos,
                    isNodeOnlyRow: true,  // Mark that this is from a node-only row
                    nodeOnlyRowIndex: signalIndex,  // Store the row index for reconstruction
                    phase: lane.phase || 0
                });
            }
        }
        // Create a blank row to preserve the structure, storing the node string
        const signal = new Signal('', SignalType.BlankRow, effectiveCount);
        signal.waveDromNode = nodeStr;
        signal.waveDromPhase = lane.phase;
        signal.isNodeOnlyRow = true;  // Mark this signal as a node-only row
        doc.m_signals.push(signal);
        return;
    }

    const name = lane.name || '';
    const waveStr = lane.wave || '';
    const period = lane.period || 1;
    const phase = lane.phase || 0;
    
    // Handle data - can be array or space-separated string
    let dataArray = lane.data || [];
    if (typeof dataArray === 'string') {
        dataArray = dataArray.split(/\s+/).filter(s => s.length > 0);
    }

    // Determine signal type based on wave characters
    let signalType = SignalType.Bit;
    const hasVectorChars = /[=23456789]/.test(waveStr);
    if (hasVectorChars) {
        signalType = SignalType.Vector;
    }

    const signal = new Signal(name, signalType, effectiveCount);
    signal.values.fill(-1);
    signal.labels.fill('');
    
    // IMPORTANT: All signals in a WaveDrom import use the same substeps
    // This ensures arrays align correctly with the visual grid
    // Clocks may override this to 1 later if they detect clock patterns
    if (maxSignalSubSteps > 0) {
        signal.subSteps = maxSignalSubSteps;
    }
    
    // Save WaveDrom-specific metadata for round-trip fidelity
    if (period !== 1) signal.waveDromPeriod = period;
    if (phase !== 0) signal.waveDromPhase = phase;
    if (waveStr) {
        signal.waveDromWave = waveStr;
        signal.waveDromWaveLength = waveStr.length;  // Preserve original length for export
    }
    if (lane.data !== undefined) {
        signal.waveDromData = lane.data;
        signal.waveDromHadData = true;  // Track that original had data array
    } else {
        signal.waveDromHadData = false;  // Track that original did NOT have data array
    }

    let dataIndex = 0;
    let lastValue = -1;
    let lastLabel = '';
    let lastColor = null;
    let lastColorCode = null;  // Track last WaveDrom color code ('=', '2'-'9') for '.' extension
    let lastDriveStrength = 0;  // Track last drive strength for '.' extension
    let lastClockMarker = false;  // Track last clock marker for '.' extension
    let lastHatched = false;  // Track last hatched state for '.' extension
    let lastFill = null;  // Track last fill color for '.' extension
    let isClockMode = false;
    let clockStartsLow = true;
    let prevClockChar = null;
    let clockCycleCount = 0;

    // Parse wave string with period/phase support
    // Each WaveDrom step expands to stepSize internal positions (for substeps)
    
    for (let i = 0; i < waveStr.length; i++) {
        const char = waveStr[i];

        // Determine if this WaveDrom character represents a clock cycle
        // (including '.' extension when in clock mode)
        const isClockWaveChar = (char === 'p' || char === 'P' || char === 'n' || char === 'N') ||
            (char === '.' && isClockMode && (prevClockChar === 'p' || prevClockChar === 'P' || prevClockChar === 'n' || prevClockChar === 'N'));
        const clockCharType = (char === '.') ? prevClockChar : char;
        const clockCyclePhase = isClockWaveChar ? (clockCycleCount % 2 === 0) : false;
        const periodSpan = period * stepSize;

        for (let p = 0; p < period; p++) {
            // Calculate the WaveDrom step index
            const waveDromStep = (i * period) + p;
            if (waveDromStep >= doc.m_sampleCount) break;
            
            // Calculate base internal index (start of this step's substeps)
            const baseIdx = waveDromStep * stepSize;
            if (baseIdx >= effectiveCount) break;

            let value = -1;
            let label = '';
            let color = null;
            let colorCode = null;  // WaveDrom color code ('=', '2'-'9')
            let driveStrength = typeof DriveStrength !== 'undefined' ? DriveStrength.Strong : 0;
            let clockMarker = false;  // true if this position has clock marker (P/N/H/L)
            let isClockChar = false;
            let clockLowValue = 0;
            let clockHighValue = 1;

            switch (char) {
                // Clock patterns - p/P start low, transition to high at mid-period
                case 'p':
                case 'P':
                    isClockMode = true;
                    isClockChar = true;
                    clockStartsLow = true;
                    signal.isClockPattern = true;
                    signal.subSteps = 1;  // Clocks need 1 substep per signal
                    // For clocks, we'll handle substeps specially below
                    {
                        const cyclePhase = clockCyclePhase;
                        clockLowValue = cyclePhase ? 0 : 1;
                        clockHighValue = cyclePhase ? 1 : 0;
                    }
                    if (char === 'P') {
                        signal.edgeArrow = 'positive';
                        clockMarker = true;  // P has edge marker
                    }
                    break;
                    
                // Clock patterns - n/N start high, transition to low at mid-period
                case 'n':
                case 'N':
                    isClockMode = true;
                    isClockChar = true;
                    clockStartsLow = false;
                    signal.isClockPattern = true;
                    signal.subSteps = 1;  // Clocks need 1 substep per signal
                    {
                        const cyclePhase = clockCyclePhase;
                        clockLowValue = cyclePhase ? 0 : 1;
                        clockHighValue = cyclePhase ? 1 : 0;
                    }
                    if (char === 'N') {
                        signal.edgeArrow = 'negative';
                        clockMarker = true;  // N has edge marker
                    }
                    break;

                // High/Low states for clock gating/mixing
                case 'h':
                    if (signalType === SignalType.Vector) {
                        // For vector signals, use ASCII value with label
                        value = 104; // ASCII 'h'
                        label = 'h';
                    } else {
                        value = 1;
                        driveStrength = typeof DriveStrength !== 'undefined' ? DriveStrength.Weak : 1;
                    }
                    prevClockChar = char;
                    break;
                    
                case 'H':
                    if (signalType === SignalType.Vector) {
                        value = 104; // ASCII 'h'
                        label = 'h';
                    } else {
                        value = 1;
                        driveStrength = typeof DriveStrength !== 'undefined' ? DriveStrength.WeakMarker : 2;
                        if (lastValue === 0) {
                            signal.edgeArrow = 'positive';
                        }
                    }
                    prevClockChar = char;
                    break;

                case 'l':
                    if (signalType === SignalType.Vector) {
                        // For vector signals, use ASCII value with label
                        value = 108; // ASCII 'l'
                        label = 'l';
                    } else {
                        value = 0;
                        driveStrength = typeof DriveStrength !== 'undefined' ? DriveStrength.Weak : 1;
                    }
                    prevClockChar = char;
                    break;
                    
                case 'L':
                    if (signalType === SignalType.Vector) {
                        value = 108; // ASCII 'l'
                        label = 'l';
                    } else {
                        value = 0;
                        driveStrength = typeof DriveStrength !== 'undefined' ? DriveStrength.WeakMarker : 2;
                        if (lastValue === 1) {
                            signal.edgeArrow = 'negative';
                        }
                    }
                    prevClockChar = char;
                    break;

                // Bit values
                case '0':
                    if (signalType === SignalType.Vector) {
                        // For vector signals, '0' is low wire state (no data box)
                        value = 0;
                        label = 'l';  // 'l' label for low wire state - matches export logic
                    } else {
                        value = 0;
                    }
                    break;
                    
                case '1':
                    if (signalType === SignalType.Vector) {
                        // For vector signals, '1' is high wire state (no data box)
                        value = 1;
                        label = 'h';  // 'h' label for high wire state - matches export logic
                    } else {
                        value = 1;
                    }
                    break;
                    
                case 'x':
                    if (signalType === SignalType.Vector) {
                        // For vector signals, x is undefined state
                        value = -1;
                        label = '';
                    } else {
                        value = -1;
                    }
                    break;
                    
                case 'z':
                    value = 2; // HighZ
                    if (signalType === SignalType.Vector) {
                        label = 'Z';
                    }
                    break;
                    
                case 'u':
                    if (signalType === SignalType.Vector) {
                        // For vector signals, 'u' is a data value with label 'u'
                        value = dataIndex;
                        label = 'u';
                        dataIndex++;
                    } else {
                        value = 3; // PullUp
                    }
                    break;
                    
                case 'd':
                    if (signalType === SignalType.Vector) {
                        // For vector signals, 'd' is a data value with label 'd'
                        value = dataIndex;
                        label = 'd';
                        dataIndex++;
                    } else {
                        value = 4; // PullDown
                    }
                    break;

                case '|': // Gap / Time Jump
                    // Time jump does NOT change the value - it's a visual overlay
                    // Continue with the previous value, just add the time jump marker
                    value = lastValue;
                    label = lastLabel || '';
                    color = lastColor;
                    // Register time jump position for later creation in m_timeJumps
                    // baseIdx is the internal position corresponding to this step
                    if (doc._pendingTimeJumpPositions) {
                        doc._pendingTimeJumpPositions.add(baseIdx);
                    }
                    break;

                // Vector values
                case '=':
                case '2':
                case '3':
                case '4':
                case '5':
                case '6':
                case '7':
                case '8':
                case '9':
                    value = dataIndex;
                    label = dataArray[dataIndex] !== undefined ? String(dataArray[dataIndex]) : String(dataIndex);
                    color = getStandardWaveDromColors()[char] || null;
                    colorCode = char;  // Store the original WaveDrom color code
                    dataIndex++;
                    break;

                case '.': // Extend previous
                    if (isClockMode && (prevClockChar === 'p' || prevClockChar === 'P' || 
                                        prevClockChar === 'n' || prevClockChar === 'N')) {
                        isClockChar = true;
                        const cyclePhase = clockCyclePhase;
                        if (prevClockChar === 'p' || prevClockChar === 'P') {
                            clockLowValue = cyclePhase ? 0 : 1;
                            clockHighValue = cyclePhase ? 1 : 0;
                        } else {
                            clockLowValue = cyclePhase ? 1 : 0;
                            clockHighValue = cyclePhase ? 0 : 1;
                        }
                        // Copy clock marker from previous position
                        clockMarker = lastClockMarker;
                    } else {
                        value = lastValue;
                        label = lastLabel;
                        color = lastColor;
                        // Note: We do NOT copy colorCode for '.' because '.' extends
                        // the visual state but doesn't define a new color code.
                        // The export will generate '.' based on matching values, not colorCode.
                        // Copy drive strength from previous position
                        driveStrength = lastDriveStrength;
                    }
                    break;

                default:
                    value = -1;
                    break;
            }

            // Now fill in the internal positions (including substeps)
            for (let s = 0; s < stepSize; s++) {
                const actualIdx = baseIdx + s;
                if (actualIdx >= effectiveCount) break;
                
                let actualValue = value;
                let actualLabel = label;
                
                if (isClockChar) {
                    // For clock signals, stretch the cycle across the entire period span
                    // p/P: positive edge clock -> first half high, second half low
                    // n/N: negative edge clock -> first half low, second half high
                    const posInPeriod = (p * stepSize) + s;
                    const isFirstHalf = posInPeriod < (periodSpan / 2);
                    if (clockCharType === 'p' || clockCharType === 'P') {
                        actualValue = isFirstHalf ? 1 : 0;
                    } else if (clockCharType === 'n' || clockCharType === 'N') {
                        actualValue = isFirstHalf ? 0 : 1;
                    }
                }
                
                signal.values[actualIdx] = actualValue;
                signal.labels[actualIdx] = actualLabel;
                
                // Store drive strength for bit signals (for h/l/H/L)
                // Only store at the base index (s === 0) since export reads from base
                if (signal.driveStrengths && signal.type === SignalType.Bit && s === 0) {
                    signal.driveStrengths[actualIdx] = driveStrength;
                }
                
                // Store clock marker for clock signals (P/N have markers, p/n don't)
                // Only store at the base index (s === 0) since export reads from base
                if (signal.clockMarkers && isClockChar && s === 0 && p === 0) {
                    signal.clockMarkers[actualIdx] = clockMarker;
                }
                
                // Store the original WaveDrom color code for vector signals
                // Only store at the base index (s === 0) since export reads from base
                if (signal.waveDromColorCodes && colorCode && s === 0) {
                    signal.waveDromColorCodes[actualIdx] = colorCode;
                }
                
                // Apply styles
                if (signal.segmentStyles && signal.segmentStyles[actualIdx]) {
                    if (char === 'x') {
                        signal.segmentStyles[actualIdx].hatched = true;
                    } else if (char === 'z') {
                        signal.segmentStyles[actualIdx].fill = '#ffffff';
                        signal.segmentStyles[actualIdx].hatched = true;
                    } else if (char === '.' || char === '|') {
                        // Extend previous style for both . and | (time jump)
                        signal.segmentStyles[actualIdx].hatched = lastHatched;
                        signal.segmentStyles[actualIdx].fill = lastFill;
                    } else if (color) {
                        signal.segmentStyles[actualIdx].fill = color;
                    }
                }
                
                // Store the original WaveDrom character for round-trip fidelity
                // Only store at the main sample position (s === 0)
                if (signal.waveDromChars && s === 0) {
                    signal.waveDromChars[actualIdx] = (p === 0) ? char : '.';
                }
            }

            lastValue = isClockChar ? (clockStartsLow ? clockHighValue : clockLowValue) : value;
            lastLabel = label;
            lastColor = color;
            lastColorCode = colorCode;
            lastDriveStrength = driveStrength;
            lastClockMarker = clockMarker;
            // Track the style of this character for '.' extension (but not for modifiers like '|')
            if (char !== '.' && char !== '|') {
                lastHatched = (char === 'x' || char === 'z');
                lastFill = (char === 'z') ? '#ffffff' : (color || null);
            }
        }

        // Advance clock cycle count once per WaveDrom character
        if (isClockWaveChar) {
            prevClockChar = clockCharType;
            clockCycleCount++;
        }
    }
    
    // Detect if wave uses sloped characters vs square characters
    const hasSlopedChars = /[01hlHL]/.test(waveStr);
    const hasSquareChars = /[pnPN]/.test(waveStr);
    
    if (hasSlopedChars && !hasSquareChars) {
        signal.riseTime = 0.2;
        signal.fallTime = 0.2;
    } else if (hasSquareChars) {
        signal.riseTime = 0;
        signal.fallTime = 0;
    }

    // Process node string for arrow endpoints
    if (nodeStr) {
        signal.waveDromNode = nodeStr;
        for (let i = 0; i < nodeStr.length; i++) {
            const nodeChar = nodeStr[i];
            if (nodeChar !== '.') {
                // Node positions feed arrow/timespan start/end positions, which are
                // fractional (WaveDrom steps), NOT internal indices. Multiplying by
                // stepSize doubled every node when a clock forced substeps (issue #3)
                const waveDromStep = i * (period || 1);
                const samplePos = waveDromStep;
                nodePositions.set(nodeChar, {
                    signalIndex: signalIndex,
                    sample: samplePos
                });
            }
        }
    }

    doc.m_signals.push(signal);
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
 * Process edge definitions and create arrows or time span markers
 * @param {WaveDocument} doc - Target document
 * @param {Array} edges - Edge array
 * @param {Map} nodePositions - Map of node chars to positions
 */
function processEdges(doc, edges, nodePositions) {
    doc.m_nextTextAnnotationId = doc.m_nextTextAnnotationId || 1;
    doc.m_nextTimeSpanMarkerId = doc.m_nextTimeSpanMarkerId || 1;
    
    edges.forEach(edgeStr => {
        // Parse edge string: "a->b label", "a~>b label", "a-|>b", etc.
        const match = edgeStr.match(/^(\w)([-~|<>/]+)(\w)(?:\s+(.*))?$/);
        
        if (!match) {
            // Try simpler pattern for edge without style
            const simpleMatch = edgeStr.match(/^(\w)\s*(\w)(?:\s+(.*))?$/);
            if (simpleMatch) {
                const fromNode = simpleMatch[1];
                const toNode = simpleMatch[2];
                const label = simpleMatch[3] ? simpleMatch[3].trim() : null;
                
                const fromPos = nodePositions.get(fromNode);
                const toPos = nodePositions.get(toNode);
                
                if (fromPos && toPos) {
                    // Default to spline arrow when no style specified
                    const arrowId = doc.m_nextArrowId++;
                    doc.m_arrows.push({
                        id: arrowId,
                        startSignal: fromPos.signalIndex,
                        startPosition: fromPos.sample,  // Fractional position
                        endSignal: toPos.signalIndex,
                        endPosition: toPos.sample,      // Fractional position
                        style: '~>',
                        color: null
                    });
                    
                    if (label) {
                        doc.m_textAnnotations.push({
                            id: doc.m_nextTextAnnotationId++,
                            anchorType: 'Arrow',
                            anchorId: arrowId,
                            text: label,
                            sample: 0,
                            vPos: 'Center',
                            yOffset: 0,
                            color: null,
                            backgroundColor: null,
                            fontSize: 11,
                            bold: false
                        });
                    }
                }
            }
            return;
        }

        const fromNode = match[1];
        const edgeStyle = match[2];
        const toNode = match[3];
        const label = match[4] ? match[4].trim() : null;
        
        const fromPos = nodePositions.get(fromNode);
        const toPos = nodePositions.get(toNode);
        
        if (fromPos && toPos) {
            // Determine if this is a sharp (TimeSpan) or spline (Arrow) edge
            if (isSharpEdgeStyle(edgeStyle)) {
                // Sharp edges become TimeSpanMarkers
                const tsId = doc.m_nextTimeSpanMarkerId++;
                doc.m_timeSpanMarkers.push({
                    id: tsId,
                    startSignal: fromPos.signalIndex,
                    startPosition: fromPos.sample,  // Fractional position
                    endSignal: toPos.signalIndex,
                    endPosition: toPos.sample,      // Fractional position
                    style: edgeStyle,
                    color: null,
                    label: label  // Store label directly on the time span marker
                });
            } else {
                // Spline edges become Arrows
                const arrowId = doc.m_nextArrowId++;
                doc.m_arrows.push({
                    id: arrowId,
                    startSignal: fromPos.signalIndex,
                    startPosition: fromPos.sample,  // Fractional position
                    endSignal: toPos.signalIndex,
                    endPosition: toPos.sample,      // Fractional position
                    style: edgeStyle,
                    color: null
                });
                
                if (label) {
                    doc.m_textAnnotations.push({
                        id: doc.m_nextTextAnnotationId++,
                        anchorType: 'Arrow',
                        anchorId: arrowId,
                        text: label,
                        sample: 0,
                        vPos: 'Center',
                        yOffset: 0,
                        color: null,
                        backgroundColor: null,
                        fontSize: 11,
                        bold: false
                    });
                }
            }
        }
    });
}

/**
 * Import WaveDrom JSON to WaveDocument
 * @param {WaveDocument} doc - Target document
 * @param {object|string} waveJson - WaveJSON object or string
 * @returns {boolean} Success
 */
function importFromWaveDrom(doc, waveJson) {
    try {
        const data = typeof waveJson === 'string' ? JSON.parse(waveJson) : waveJson;
        
        if (!data.signal || !Array.isArray(data.signal)) {
            console.error('Invalid WaveJSON: missing signal array');
            return false;
        }

        // Calculate sample count from longest wave string
        const flattenSignalGroups = window.WaveDromUtils?.flattenSignalGroups || 
            ((signals) => signals.filter(s => typeof s === 'object' && !Array.isArray(s)));
        const extractTextFromJsonML = window.WaveDromUtils?.extractTextFromJsonML || 
            ((text) => typeof text === 'string' ? text : '');
        
        let maxSamples = 1;
        const flatSignals = flattenSignalGroups(data.signal);
        
        flatSignals.forEach(sig => {
            if (sig.wave) {
                const period = sig.period || 1;
                maxSamples = Math.max(maxSamples, sig.wave.length * period);
            }
        });

        // Clear and setup document
        doc.m_sampleCount = maxSamples;
        // Don't set global subStepCount - clocks will have per-signal substeps
        // doc.m_subStepCount = 1; // Removed - use per-signal substeps instead
        doc.m_subStepCount = 0;  // No global substeps
        doc.m_signals = [];
        doc.m_arrows = [];
        doc.m_markers = [];
        doc.m_timeJumps = [];
        doc.m_timeSpanMarkers = [];
        doc.m_textAnnotations = [];
        doc.m_nextArrowId = 1;
        doc.m_nextMarkerId = 1;
        doc.m_nextTimeSpanMarkerId = 1;
        doc.m_nextTimeJumpId = 1;
        doc.m_nextTextAnnotationId = 1;
        
        // Temporary Set to collect time jump positions during signal processing
        doc._pendingTimeJumpPositions = new Set();
        
        // Pre-scan signals to detect clocks and calculate max substeps needed
        const maxSignalSubSteps = prescanForClocks(flatSignals);
        doc._maxSignalSubSteps = maxSignalSubSteps;  // Store for use in processWaveLane

        // Build node position map for edges
        const nodePositions = new Map();

        // Process signals (including groups)
        processSignalArray(doc, data.signal, nodePositions, 0);

        // Process edges (arrows)
        if (data.edge && Array.isArray(data.edge)) {
            doc.m_waveDromEdges = data.edge;
            processEdges(doc, data.edge, nodePositions);
        }

        // Process head/foot for title
        if (data.head && data.head.text) {
            doc.m_title = typeof data.head.text === 'string' 
                ? data.head.text 
                : extractTextFromJsonML(data.head.text);
        }

        if (data.foot && data.foot.text) {
            doc.m_footer = typeof data.foot.text === 'string' 
                ? data.foot.text 
                : extractTextFromJsonML(data.foot.text);
        }
        
        // Save full head/foot for round-trip fidelity
        if (data.head) {
            doc.m_waveDromHead = data.head;
        }
        if (data.foot) {
            doc.m_waveDromFoot = data.foot;
        }
        
        // Save config for round-trip fidelity
        if (data.config) {
            doc.m_waveDromConfig = data.config;
        }
        
        // Save original signal structure for round-trip fidelity
        doc.m_waveDromSignalStructure = data.signal;
        
        // Import WavePaint-specific metadata from config
        // Support both new format (config.wavepaint.*) and legacy format (config._wavepaint_*)
        const wavepaintMeta = data.config?.wavepaint || {};
        const legacyAnnotations = data.config?._wavepaint_annotations;
        const legacyTimeSpans = data.config?._wavepaint_timeSpans;
        
        // Import annotations
        const annotations = wavepaintMeta.annotations || legacyAnnotations;
        if (annotations && Array.isArray(annotations)) {
            doc.m_nextTextAnnotationId = doc.m_nextTextAnnotationId || 1;
            annotations.forEach(ann => {
                if (ann.type === 'Signal' && ann.signalIndex >= 0 && ann.signalIndex < doc.m_signals.length) {
                    doc.m_textAnnotations.push({
                        id: doc.m_nextTextAnnotationId++,
                        anchorType: 'Signal',
                        anchorId: ann.signalIndex,
                        text: ann.text,
                        sample: ann.sample || 0,
                        vPos: ann.vPos || 'Above',
                        yOffset: 0,
                        color: null,
                        backgroundColor: null,
                        fontSize: 12,
                        bold: false
                    });
                }
            });
        }
        
        // Apply per-signal edge shapes exported by WavePaint, overriding the
        // sloped-edge heuristic so round-trips keep the original look (issue #7)
        const signalStyles = wavepaintMeta.signalStyles;
        if (signalStyles && Array.isArray(signalStyles)) {
            signalStyles.forEach((st, i) => {
                if (st && i < doc.m_signals.length) {
                    if (typeof st.riseTime === 'number') doc.m_signals[i].riseTime = st.riseTime;
                    if (typeof st.fallTime === 'number') doc.m_signals[i].fallTime = st.fallTime;
                }
            });
        }

        // Import time span markers
        const timeSpans = wavepaintMeta.timeSpans || legacyTimeSpans;
        if (timeSpans && Array.isArray(timeSpans)) {
            doc.m_nextTimeSpanMarkerId = doc.m_nextTimeSpanMarkerId || 1;
            timeSpans.forEach(tsData => {
                const startSignal = tsData.startSignal !== undefined ? tsData.startSignal : (tsData.anchorRow || 0);
                const endSignal = tsData.endSignal !== undefined ? tsData.endSignal : (tsData.endAnchorRow || startSignal);
                const style = tsData.style || '-|';
                
                const ts = {
                    id: doc.m_nextTimeSpanMarkerId++,
                    startSignal: startSignal,
                    startSample: tsData.startSample,
                    endSignal: endSignal,
                    endSample: tsData.endSample,
                    style: style,
                    color: tsData.color || null
                };
                doc.m_timeSpanMarkers.push(ts);
            });
        }
        
        // Create time jumps from pending positions collected during signal processing
        // pendingTimeJumpPositions contains baseIdx values (internal indices with substeps)
        // We need to convert them to fractional positions
        if (doc._pendingTimeJumpPositions && doc._pendingTimeJumpPositions.size > 0) {
            // Sort positions for consistent ordering
            const sortedPositions = Array.from(doc._pendingTimeJumpPositions).sort((a, b) => a - b);
            
            // Calculate stepSize used during import
            const importStepSize = (maxSignalSubSteps || 0) + 1;
            
            for (const baseIdx of sortedPositions) {
                // Convert internal index to fractional position
                // baseIdx = waveDromStep * stepSize, so waveDromStep = baseIdx / stepSize
                const fractionalPosition = baseIdx / importStepSize;
                
                doc.m_timeJumps.push({
                    id: doc.m_nextTimeJumpId++,
                    position: fractionalPosition,
                    color: null
                });
            }
            // Clean up temporary property
            delete doc._pendingTimeJumpPositions;
        }

        // Imported content is not saved as .wp yet (issue #5)
        doc.m_modified = true;

        return true;
    } catch (error) {
        console.error('Error importing WaveDrom:', error);
        return false;
    }
}

// Export for use in other modules
if (typeof window !== 'undefined') {
    window.WaveDromImport = {
        processSignalArray,
        processWaveLane,
        processEdges,
        importFromWaveDrom
    };
}
