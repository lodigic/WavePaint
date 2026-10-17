// WaveDromUtils.js - Utility functions for WaveDrom I/O

/**
 * Clear preserved WaveDrom data from a signal
 * Call this when the signal is modified so that export generates fresh code
 * @param {object} signal - The signal to clear preserved data from
 */
function clearSignalWaveDromPreserved(signal) {
    if (!signal) return;
    delete signal.waveDromWave;
    delete signal.waveDromData;
    delete signal.waveDromChars;
    delete signal.waveDromNode;
    delete signal.waveDromPeriod;
    delete signal.waveDromPhase;
    // Mark signal as manually edited - don't auto-detect as clock
    signal.isManuallyEdited = true;
    signal.isClockPattern = false;
}

/**
 * Clear preserved WaveDrom data from entire document
 * Call this when the document structure changes (add/remove signals)
 * @param {WaveDocument} doc - The document to clear preserved data from
 */
function clearDocumentWaveDromPreserved(doc) {
    if (!doc) return;
    delete doc.m_waveDromSignalStructure;
    delete doc.m_waveDromEdges;
    delete doc.m_waveDromConfig;
    // Clear from all signals
    if (doc.m_signals) {
        doc.m_signals.forEach(signal => clearSignalWaveDromPreserved(signal));
    }
}

/**
 * Flatten signal groups recursively
 * @param {Array} signals - Signal array (may contain groups)
 * @returns {Array} Flat array of signal objects
 */
function flattenSignalGroups(signals) {
    const result = [];
    
    signals.forEach(item => {
        if (Array.isArray(item)) {
            // Group: first element might be name, rest are signals
            // Check if first element is a string (group name)
            const startIndex = typeof item[0] === 'string' ? 1 : 0;
            const groupSignals = item.slice(startIndex);
            result.push(...flattenSignalGroups(groupSignals));
        } else if (typeof item === 'object' && item !== null) {
            result.push(item);
        }
    });
    
    return result;
}

/**
 * Extract plain text from WaveDrom JsonML text format
 * @param {Array|string} jsonml - JsonML text array or string
 * @returns {string} Plain text
 */
function extractTextFromJsonML(jsonml) {
    if (typeof jsonml === 'string') return jsonml;
    if (!Array.isArray(jsonml)) return '';
    
    let result = '';
    jsonml.forEach(item => {
        if (typeof item === 'string') {
            result += item;
        } else if (Array.isArray(item)) {
            result += extractTextFromJsonML(item);
        }
    });
    return result;
}

/**
 * Parse WaveDrom code string (for editor/live preview)
 * Handles JSON5-like syntax with comments, single quotes, trailing commas
 * @param {string} code - WaveDrom JSON/JSON5 code
 * @returns {object|null} Parsed WaveJSON or null on error
 */
function parseWaveDromCode(code) {
    try {
        // Try standard JSON first
        return JSON.parse(code);
    } catch (e) {
        try {
            // Clean up JSON5-like syntax
            const cleaned = code
                .replace(/\/\/.*$/gm, '')  // Remove single-line comments
                .replace(/\/\*[\s\S]*?\*\//g, '')  // Remove multi-line comments
                .replace(/'/g, '"')  // Single quotes to double
                .replace(/,(\s*[}\]])/g, '$1')  // Remove trailing commas
                .replace(/([{,]\s*)(\w+)\s*:/g, '$1"$2":');  // Unquoted keys
            return JSON.parse(cleaned);
        } catch (err) {
            console.error('Failed to parse WaveDrom code:', err);
            return null;
        }
    }
}

/**
 * Escape HTML entities
 * @param {string} str - Input string
 * @returns {string} Escaped string
 */
function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

/**
 * Detect if a bit signal should use clock characters (p/n)
 * 
 * For WaveDrom export:
 * - Signals explicitly marked as clock patterns (isClockPattern) are always treated as clocks
 * - Signals without riseTime/fallTime are treated as potential clocks by default
 * - When there are substeps, we check if each step contains a transition (high+low)
 * - 'p' = positive edge clock (starts low, goes high)
 * - 'n' = negative edge clock (starts high, goes low)
 * 
 * @param {object} signal - The signal to analyze
 * @param {number} sampleCount - Number of samples (WaveDrom steps)
 * @param {number} subStepCount - Number of substeps per sample
 * @returns {string|null} Clock character ('p', 'P', 'n', 'N') or null if not a clock
 */
function detectClockPattern(signal, sampleCount, subStepCount) {
    // Need access to SignalType and WaveValue
    const SignalType = window.SignalType || { Bit: 0, Vector: 1, BlankRow: 2 };
    const WaveValue = window.WaveDromConstants?.WaveValue || { LOW: 0, HIGH: 1 };
    
    if (signal.type !== SignalType.Bit) return null;
    
    // Don't auto-detect clock pattern if signal was manually edited
    if (signal.isManuallyEdited) return null;
    
    // If explicitly marked as clock pattern (set during import), use that
    if (signal.isClockPattern) {
        const hasArrow = signal.edgeArrow && signal.edgeArrow !== 'none';
        // Check the first value (at substep 0 of step 0)
        const firstValue = signal.values[0];
        if (hasArrow) {
            return (firstValue === 0 || firstValue === WaveValue.LOW) ? 'P' : 'N';
        }
        return (firstValue === 0 || firstValue === WaveValue.LOW) ? 'p' : 'n';
    }
    
    // Signals WITH riseTime/fallTime are NOT clocks - they have sloped transitions
    const hasRiseFall = (signal.riseTime > 0) || (signal.fallTime > 0);
    if (hasRiseFall) return null;
    
    const stepSize = subStepCount + 1;
    
    // With substeps, check if each step contains a clock cycle (transition from low->high or high->low)
    if (subStepCount > 0) {
        let allStepsHaveTransition = true;
        let startsLow = null;
        
        for (let i = 0; i < sampleCount && allStepsHaveTransition; i++) {
            const stepStart = i * stepSize;
            if (stepStart >= signal.values.length) break;
            
            const startVal = signal.values[stepStart];
            let hasOpposite = false;
            
            // Check if first step determines the clock polarity
            if (i === 0) {
                startsLow = (startVal === 0 || startVal === WaveValue.LOW);
            }
            
            // Check substeps for the opposite value (transition)
            for (let j = 1; j <= subStepCount && stepStart + j < signal.values.length; j++) {
                const subVal = signal.values[stepStart + j];
                const startIsLow = (startVal === 0 || startVal === WaveValue.LOW);
                const subIsHigh = (subVal === 1 || subVal === WaveValue.HIGH);
                const startIsHigh = (startVal === 1 || startVal === WaveValue.HIGH);
                const subIsLow = (subVal === 0 || subVal === WaveValue.LOW);
                
                if ((startIsLow && subIsHigh) || (startIsHigh && subIsLow)) {
                    hasOpposite = true;
                    break;
                }
            }
            
            if (!hasOpposite) {
                allStepsHaveTransition = false;
            }
        }
        
        if (allStepsHaveTransition && sampleCount >= 2 && startsLow !== null) {
            const hasArrow = signal.edgeArrow && signal.edgeArrow !== 'none';
            if (startsLow) {
                return hasArrow ? 'P' : 'p';
            } else {
                return hasArrow ? 'N' : 'n';
            }
        }
        
        return null;
    }
    
    // Without substeps, check for alternating pattern at each step
    const values = [];
    for (let i = 0; i < sampleCount; i++) {
        const effectiveIdx = i * stepSize;
        if (effectiveIdx < signal.values.length) {
            values.push(signal.values[effectiveIdx]);
        }
    }
    
    if (values.length < 2) return null;
    
    // Check if this looks like a clock: alternating high/low pattern
    let isAlternating = true;
    let startsLow = values[0] === 0 || values[0] === WaveValue.LOW;
    let startsHigh = values[0] === 1 || values[0] === WaveValue.HIGH;
    
    if (!startsLow && !startsHigh) return null;
    
    for (let i = 1; i < values.length; i++) {
        const expected = startsLow ? (i % 2 === 0 ? 0 : 1) : (i % 2 === 0 ? 1 : 0);
        const actual = values[i];
        if (actual !== expected && actual !== (expected === 0 ? WaveValue.LOW : WaveValue.HIGH)) {
            isAlternating = false;
            break;
        }
    }
    
    // Require at least 4 values for alternating pattern detection
    if (isAlternating && values.length >= 4) {
        const hasArrow = signal.edgeArrow && signal.edgeArrow !== 'none';
        if (startsLow) {
            return hasArrow ? 'P' : 'p';
        } else {
            return hasArrow ? 'N' : 'n';
        }
    }
    
    return null;
}

/**
 * Build node map from arrows for WaveDrom edge definitions
 * @param {Array} arrows - Array of arrow objects
 * @param {Array} textAnnotations - Array of text annotations (for labels)
 * @param {number} globalSubSteps - Global substep count for position conversion
 * @returns {Object} { nodeMap: Map, edges: Array, nodeCharCode: number }
 */
function buildNodeMapFromArrows(arrows, textAnnotations = [], globalSubSteps = 0) {
    const nodeMap = new Map(); // "signalIndex_sample" -> nodeChar
    const edges = [];
    let nodeCharCode = 97; // Start with 'a'
    
    // Get text annotations anchored to arrows for labels
    // Handle both string ('Arrow') and numeric (0) anchor types for backwards compatibility
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
    
    arrows.forEach(arrow => {
        // Convert fractional positions to effective sample indices for WaveDrom nodeMap
        // Fractional position * divisor = effective sample index
        const divisor = globalSubSteps + 1;
        const startEffIdx = Math.round(arrow.startPosition * divisor);
        const endEffIdx = Math.round(arrow.endPosition * divisor);
        
        const startKey = `${arrow.startSignal}_${startEffIdx}`;
        const endKey = `${arrow.endSignal}_${endEffIdx}`;
        
        if (!nodeMap.has(startKey)) {
            nodeMap.set(startKey, String.fromCharCode(nodeCharCode++));
            if (nodeCharCode > 122) nodeCharCode = 65; // Switch to uppercase
        }
        if (!nodeMap.has(endKey)) {
            nodeMap.set(endKey, String.fromCharCode(nodeCharCode++));
            if (nodeCharCode > 90) nodeCharCode = 97; // Wrap around
        }
        
        const fromNode = nodeMap.get(startKey);
        const toNode = nodeMap.get(endKey);
        
        // Determine arrow style based on arrow properties
        // WaveDrom valid arrow styles:
        //   ~> (spline/curved), -> (straight), -|> (sharp/right-angle), 
        //   |-> (vertical first), -|-> (step pattern)
        //   <-> (double-headed), <~> (double-headed curved)
        //   ~ (curved line, no head), - (straight line, no head)
        let arrowStyle = arrow.style || '~>';
        
        // Normalize arrow style to valid WaveDrom format
        // Ensure it's a valid WaveDrom edge style
        const validStyles = [
            '~>', '->', '-|>', '|->', '-|->', 
            '<~>', '<->', '<-|>', '<-|->',
            '~', '-', '-|', '|-', '-|-',
            '-~>', '~->', '-~', '~-'
        ];
        
        if (!validStyles.includes(arrowStyle)) {
            // Default to spline arrow for unrecognized styles
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
    
    return { nodeMap, edges, nodeCharCode };
}

// Export for use in other modules
if (typeof window !== 'undefined') {
    window.WaveDromUtils = {
        clearSignalWaveDromPreserved,
        clearDocumentWaveDromPreserved,
        flattenSignalGroups,
        extractTextFromJsonML,
        parseWaveDromCode,
        escapeHtml,
        detectClockPattern,
        buildNodeMapFromArrows
    };
}
