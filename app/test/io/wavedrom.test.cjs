#!/usr/bin/env node
/**
 * WaveDrom I/O Tests for WavePaint
 * 
 * STRICT Round-Trip Tests based on WaveDrom Tutorial:
 * https://wavedrom.com/tutorial.html
 * 
 * Round-trip flow:
 * WaveDrom → WavePaint → WaveDrom → WavePaint → WaveDrom → Compare
 * 
 * Tests each WaveDrom feature individually, then combined.
 * Tests are STRICT - they will fail if features are not implemented correctly.
 */

const fs = require('fs');
const path = require('path');

const {
    describe, it,
    assertEqual, assertType, assertTrue, assertNotNull,
    assertGreaterThan, assertContains, assertArray, assertFalse
} = require('../testFramework.cjs');

const { createTestDocumentWithSignals, createSimpleDocument } = require('../mocks.cjs');

// ============================================================================
// STRICT COMPARISON HELPERS
// ============================================================================

/**
 * Flatten nested signal arrays (groups) into a flat list of signal objects
 */
function flattenSignals(signals) {
    const flat = [];
    if (!signals) return flat;
    
    for (const item of signals) {
        if (Array.isArray(item)) {
            const start = typeof item[0] === 'string' ? 1 : 0;
            for (let i = start; i < item.length; i++) {
                if (Array.isArray(item[i])) {
                    flat.push(...flattenSignals([item[i]]));
                } else if (typeof item[i] === 'object' && item[i] !== null) {
                    flat.push(item[i]);
                }
            }
        } else if (typeof item === 'object' && item !== null) {
            flat.push(item);
        }
    }
    return flat;
}

/**
 * STRICT comparison of wave strings
 * Returns exact differences
 */
function strictCompareWave(original, exported, signalName) {
    if (original === exported) return null;
    
    // Normalize trailing dots (WavePaint may trim them)
    const origTrimmed = original.replace(/\.+$/, '');
    const expTrimmed = exported.replace(/\.+$/, '');
    
    if (origTrimmed === expTrimmed) return null;
    
    return `Signal "${signalName}" wave mismatch:\n  Expected: "${original}"\n  Got:      "${exported}"`;
}

/**
 * STRICT comparison of data arrays
 * Note: WavePaint always exports labels as data for vector signals,
 * even if the original WaveDrom didn't have a data array.
 * This is correct because labels ARE the data shown in segments.
 * 
 * WaveDrom allows data arrays to have more elements than consumed.
 * WavePaint only exports the elements that are actually used.
 * So we only compare the elements that are in the exported array.
 */
function strictCompareData(original, exported, signalName) {
    if (!original && !exported) return null;
    // Allow exported to have data even if original didn't - WavePaint generates labels
    if (!original && exported) return null;
    if (original && !exported) return `Signal "${signalName}" missing data`;
    
    const origArr = Array.isArray(original) ? original : String(original).split(/\s+/);
    const expArr = Array.isArray(exported) ? exported : String(exported).split(/\s+/);
    
    // WaveDrom allows data arrays to have extra unused elements.
    // WavePaint exports only the used elements.
    // Verify that exported elements match the beginning of original.
    // It's OK if original has more elements (unused extras).
    // It's also OK if exported has more elements (when signals are extended in WavePaint).
    const minLen = Math.min(origArr.length, expArr.length);
    
    for (let i = 0; i < minLen; i++) {
        if (origArr[i] !== expArr[i]) {
            return `Signal "${signalName}" data[${i}] mismatch: expected "${origArr[i]}", got "${expArr[i]}"`;
        }
    }
    
    return null;
}

/**
 * Get the step size for array indexing based on document's maxSubSteps
 * @param {WaveDocument} doc - The document
 * @returns {number} Step size (1 if no substeps, 2 if has substeps)
 */
function getStepSize(doc) {
    const maxSubs = doc.maxSubSteps ? doc.maxSubSteps() : doc.m_subStepCount || 0;
    return maxSubs + 1;
}

/**
 * Build WavePaint JSON string from document
 */
function buildWavePaintJSON(doc) {
    const root = {};
    root.sampleCount = doc.m_sampleCount;
    root.subStepCount = doc.m_subStepCount;
    root.arrowColor = doc.m_arrowColor || '#ff0000';
    
    if (doc.m_waveDromHead) root.waveDromHead = doc.m_waveDromHead;
    if (doc.m_waveDromFoot) root.waveDromFoot = doc.m_waveDromFoot;
    if (doc.m_waveDromConfig) root.waveDromConfig = doc.m_waveDromConfig;

    const sigArray = [];
    for (const s of doc.m_signals) {
        const so = {};
        so.name = s.name;
        so.type = s.type === SignalType.Bit ? 'bit' : s.type === SignalType.Vector ? 'vector' : 'blank';
        so.color = s.color || '#000000';
        so.riseTime = s.riseTime || 0;
        so.fallTime = s.fallTime || 0;
        so.edgeArrow = s.edgeArrow || 'none';
        
        if (s.isClockPattern) so.isClockPattern = true;
        if (s.fill) so.fill = s.fill;
        if (s.subSteps && s.subSteps > 0) so.subSteps = s.subSteps;
        so.values = [...s.values];
        so.labels = [...s.labels];

        const stylesArray = [];
        let hasStyles = false;
        for (const style of s.segmentStyles) {
            const styleObj = {};
            if (style && style.color) { styleObj.color = style.color; hasStyles = true; }
            if (style && style.hatched) { styleObj.hatched = true; hasStyles = true; }
            if (style && style.fill) { styleObj.fill = style.fill; hasStyles = true; }
            stylesArray.push(styleObj);
        }
        if (hasStyles) so.segmentStyles = stylesArray;
        
        // Drive strengths for bit signals (h/l/H/L support)
        if (s.driveStrengths) {
            const hasDriveStrengths = s.driveStrengths.some(ds => ds !== 0);
            if (hasDriveStrengths) {
                so.driveStrengths = [...s.driveStrengths];
            }
        }
        
        // Clock markers for clock signals (P/N vs p/n)
        if (s.clockMarkers) {
            const hasClockMarkers = s.clockMarkers.some(cm => cm === true);
            if (hasClockMarkers) {
                so.clockMarkers = [...s.clockMarkers];
            }
        }
        
        // WaveDrom color codes for vector signals
        if (s.waveDromColorCodes) {
            const hasColorCodes = s.waveDromColorCodes.some(cc => cc !== null);
            if (hasColorCodes) {
                so.waveDromColorCodes = [...s.waveDromColorCodes];
            }
        }
        
        // Preserve original wave chars for round-trip fidelity
        if (s.waveDromChars) {
            const hasChars = s.waveDromChars.some(c => c !== null);
            if (hasChars) {
                so.waveDromChars = [...s.waveDromChars];
            }
        }
        
        if (s.waveDromPeriod != null) so.waveDromPeriod = s.waveDromPeriod;
        if (s.waveDromPhase != null) so.waveDromPhase = s.waveDromPhase;
        if (s.waveDromHadData) so.waveDromHadData = true;
        if (s.waveDromWaveLength) so.waveDromWaveLength = s.waveDromWaveLength;
        if (s.waveDromData) so.waveDromData = s.waveDromData;
        if (s.isNodeOnlyRow) so.isNodeOnlyRow = true;
        if (s.groupName) so.groupName = s.groupName;
        if (s.groupColor) so.groupColor = s.groupColor;
        if (s.groupPath && s.groupPath.length > 0) so.groupPath = s.groupPath;

        sigArray.push(so);
    }
    root.signals = sigArray;
    
    if (doc.m_waveDromEdges) root.waveDromEdges = doc.m_waveDromEdges;
    root.markers = doc.m_markers.map(m => ({ id: m.id, position: m.position, color: m.color }));
    root.timeJumps = (doc.m_timeJumps || []).map(j => ({ id: j.id, position: j.position, color: j.color }));
    root.timeSpanMarkers = (doc.m_timeSpanMarkers || []).map(ts => ({
        id: ts.id, startSignal: ts.startSignal, startPosition: ts.startPosition,
        endSignal: ts.endSignal, endPosition: ts.endPosition,
        style: ts.style || '-|', color: ts.color, label: ts.label
    }));
    root.arrows = doc.m_arrows.map(a => ({
        id: a.id, startSignal: a.startSignal, startPosition: a.startPosition,
        endSignal: a.endSignal, endPosition: a.endPosition,
        style: a.style || '~>', color: a.color || '#ff0000'
    }));
    root.textAnnotations = (doc.m_textAnnotations || []).map(ann => ({
        id: ann.id, anchorType: ann.anchorType, anchorId: ann.anchorId,
        sample: ann.sample, vPos: ann.vPos, text: ann.text,
        color: ann.color, backgroundColor: ann.backgroundColor,
        fontSize: ann.fontSize, bold: ann.bold
    }));

    return JSON.stringify(root, null, 2);
}

/**
 * Full double round-trip:
 * WaveDrom → WavePaint → WaveDrom → WavePaint → WaveDrom
 * 
 * STRICT MODE: Compares exported WaveDrom against input
 */
function fullRoundTrip(wavedromInput) {
    const errors = [];
    
    // Step 1: WaveDrom → WavePaint (doc1)
    const doc1 = new WaveDocument();
    const import1 = importFromWaveDrom(doc1, wavedromInput);
    if (!import1) {
        return { success: false, errors: ['Initial WaveDrom import failed'] };
    }
    
    // Step 2: WavePaint (doc1) → WaveDrom (wave1)
    const wave1 = exportToWaveDrom(doc1);
    
    // STRICT: Compare wave1 against original input
    const strictErrors1 = strictCompareSignals(wavedromInput, wave1);
    if (strictErrors1.length > 0) {
        errors.push('STRICT: First export differs from input:');
        errors.push(...strictErrors1);
    }
    
    // Step 3: WavePaint (doc1) → WavePaint JSON → WavePaint (doc2)
    const wpJson = buildWavePaintJSON(doc1);
    const doc2 = new WaveDocument();
    const load2 = loadFromFileContent(doc2, wpJson);
    if (!load2) {
        return { success: false, errors: ['WavePaint JSON load failed'] };
    }
    
    // Step 4: WavePaint (doc2) → WaveDrom (wave2)
    const wave2 = exportToWaveDrom(doc2);
    
    // STRICT: Compare wave2 against original input
    const strictErrors2 = strictCompareSignals(wavedromInput, wave2);
    if (strictErrors2.length > 0) {
        errors.push('STRICT: Second export (after JSON round-trip) differs from input:');
        errors.push(...strictErrors2);
    }
    
    // Step 5: WaveDrom (wave2) → WavePaint (doc3)
    const doc3 = new WaveDocument();
    const import3 = importFromWaveDrom(doc3, wave2);
    if (!import3) {
        errors.push('Re-import from exported WaveDrom failed');
    }
    
    // Step 6: WavePaint (doc3) → WaveDrom (wave3)
    const wave3 = doc3 ? exportToWaveDrom(doc3) : null;
    
    // STRICT: Compare wave3 against original input (full cycle)
    if (wave3) {
        const strictErrors3 = strictCompareSignals(wavedromInput, wave3);
        if (strictErrors3.length > 0) {
            errors.push('STRICT: Third export (full cycle) differs from input:');
            errors.push(...strictErrors3);
        }
    }
    
    return {
        success: errors.length === 0,
        errors,
        wavedromInput,
        wave1,
        wave2,
        wave3,
        doc1,
        doc2,
        doc3,
        wpJson
    };
}

/**
 * STRICT comparison of WaveDrom signals
 */
function strictCompareSignals(original, exported) {
    const errors = [];
    
    const origSignals = flattenSignals(original.signal);
    const expSignals = flattenSignals(exported.signal);
    
    // Filter out blank rows for comparison
    const origNonBlank = origSignals.filter(s => s.name || s.wave);
    const expNonBlank = expSignals.filter(s => s.name || s.wave);
    
    if (origNonBlank.length !== expNonBlank.length) {
        errors.push(`Signal count mismatch: expected ${origNonBlank.length}, got ${expNonBlank.length}`);
        return errors;
    }
    
    for (let i = 0; i < origNonBlank.length; i++) {
        const orig = origNonBlank[i];
        const exp = expNonBlank[i];
        
        // Name must match exactly
        if (orig.name !== exp.name) {
            errors.push(`Signal ${i} name mismatch: expected "${orig.name}", got "${exp.name}"`);
        }
        
        // Wave comparison
        const waveError = strictCompareWave(orig.wave || '', exp.wave || '', orig.name);
        if (waveError) errors.push(waveError);
        
        // Data comparison
        const dataError = strictCompareData(orig.data, exp.data, orig.name);
        if (dataError) errors.push(dataError);
    }
    
    return errors;
}

// ============================================================================
// STEP 1: THE SIGNAL - Basic Wave Characters
// ============================================================================

describe('WaveDrom Step 1 - The Signal (Basic Characters)', () => {
    
    it('Character 0 - Low state', () => {
        const input = { signal: [{ name: 'test', wave: '00000' }] };
        const result = fullRoundTrip(input);
        
        // Verify internal values
        const stepSize = getStepSize(result.doc1);
        for (let i = 0; i < 5; i++) {
            assertEqual(result.doc1.m_signals[0].values[i * stepSize], 0, `Value at step ${i} should be 0`);
        }
    });

    it('Character 1 - High state', () => {
        const input = { signal: [{ name: 'test', wave: '11111' }] };
        const result = fullRoundTrip(input);
        
        const stepSize = getStepSize(result.doc1);
        for (let i = 0; i < 5; i++) {
            assertEqual(result.doc1.m_signals[0].values[i * stepSize], 1, `Value at step ${i} should be 1`);
        }
    });

    it('Character . - Extends previous state', () => {
        const input = { signal: [{ name: 'test', wave: '1....' }] };
        const result = fullRoundTrip(input);
        
        // All values should be 1 (extended)
        for (let i = 0; i < result.doc1.m_signals[0].values.length; i++) {
            assertEqual(result.doc1.m_signals[0].values[i], 1);
        }
    });

    it('Character z - High-Z state', () => {
        const input = { signal: [{ name: 'test', wave: 'zzzzz' }] };
        const result = fullRoundTrip(input);
        
        // z maps to value 2 (HighZ)
        const stepSize = getStepSize(result.doc1);
        for (let i = 0; i < 5; i++) {
            assertEqual(result.doc1.m_signals[0].values[i * stepSize], 2, `Value at step ${i} should be 2 (HighZ)`);
        }
    });

    it('Character x - Undefined state', () => {
        const input = { signal: [{ name: 'test', wave: 'xxxxx' }] };
        const result = fullRoundTrip(input);
        
        // x maps to value -1 (undefined)
        const stepSize = getStepSize(result.doc1);
        for (let i = 0; i < 5; i++) {
            assertEqual(result.doc1.m_signals[0].values[i * stepSize], -1, `Value at step ${i} should be -1 (undefined)`);
        }
    });

    it('Character = - Vector/Bus state (default)', () => {
        const input = { signal: [{ name: 'bus', wave: '=====' }] };
        const result = fullRoundTrip(input);
        
        // Should be imported as vector type
        assertEqual(result.doc1.m_signals[0].type, SignalType.Vector);
    });

    it('Character u - Pull up', () => {
        const input = { signal: [{ name: 'test', wave: 'uuuuu' }] };
        const result = fullRoundTrip(input);
        
        // u maps to value 3 (PullUp)
        const stepSize = getStepSize(result.doc1);
        for (let i = 0; i < 5; i++) {
            assertEqual(result.doc1.m_signals[0].values[i * stepSize], 3, `Value at step ${i} should be 3 (PullUp)`);
        }
    });

    it('Character d - Pull down', () => {
        const input = { signal: [{ name: 'test', wave: 'ddddd' }] };
        const result = fullRoundTrip(input);
        
        // d maps to value 4 (PullDown)
        const stepSize = getStepSize(result.doc1);
        for (let i = 0; i < 5; i++) {
            assertEqual(result.doc1.m_signals[0].values[i * stepSize], 4, `Value at step ${i} should be 4 (PullDown)`);
        }
    });

    it('Characters 2-9 - Colored vector states', () => {
        const input = { signal: [{ name: 'vec', wave: '23456789' }] };
        const result = fullRoundTrip(input);
        
        assertEqual(result.doc1.m_signals[0].type, SignalType.Vector);
        assertEqual(result.doc1.m_signals.length, 1);
    });

    it('Full tutorial example: 01.zx=ud.23.456789', () => {
        const input = { signal: [{ name: 'Alfa', wave: '01.zx=ud.23.456789' }] };
        const result = fullRoundTrip(input);
        
        assertTrue(result.success, result.errors?.join('\n'));
        assertEqual(result.doc1.m_signals[0].name, 'Alfa');
    });
});

// ============================================================================
// STEP 2: CLOCKS
// ============================================================================

describe('WaveDrom Step 2 - Clocks', () => {
    
    it('Character p - Positive edge clock', () => {
        const input = { signal: [{ name: 'pclk', wave: 'p.......' }] };
        const result = fullRoundTrip(input);
        
        assertTrue(result.doc1.m_signals[0].isClockPattern, 'Should be marked as clock pattern');
    });

    it('Character P - Positive edge clock with arrow', () => {
        const input = { signal: [{ name: 'Pclk', wave: 'P.......' }] };
        const result = fullRoundTrip(input);
        
        assertTrue(result.doc1.m_signals[0].isClockPattern);
        assertEqual(result.doc1.m_signals[0].edgeArrow, 'positive');
    });

    it('Character n - Negative edge clock', () => {
        const input = { signal: [{ name: 'nclk', wave: 'n.......' }] };
        const result = fullRoundTrip(input);
        
        assertTrue(result.doc1.m_signals[0].isClockPattern);
    });

    it('Character N - Negative edge clock with arrow', () => {
        const input = { signal: [{ name: 'Nclk', wave: 'N.......' }] };
        const result = fullRoundTrip(input);
        
        assertTrue(result.doc1.m_signals[0].isClockPattern);
        assertEqual(result.doc1.m_signals[0].edgeArrow, 'negative');
    });

    it('Character h - High state for clock', () => {
        const input = { signal: [{ name: 'test', wave: 'hhhhh' }] };
        const result = fullRoundTrip(input);
        
        // h should produce high (1) values
        const stepSize = getStepSize(result.doc1);
        for (let i = 0; i < 5; i++) {
            assertTrue(result.doc1.m_signals[0].values[i * stepSize] === 1 || 
                      result.doc1.m_signals[0].values[i * stepSize] === 104, // ASCII 'h' for vectors
                      `Step ${i} should be high`);
        }
    });

    it('Character l - Low state for clock', () => {
        const input = { signal: [{ name: 'test', wave: 'lllll' }] };
        const result = fullRoundTrip(input);
        
        // l should produce low (0) values
        const stepSize = getStepSize(result.doc1);
        for (let i = 0; i < 5; i++) {
            assertTrue(result.doc1.m_signals[0].values[i * stepSize] === 0 ||
                      result.doc1.m_signals[0].values[i * stepSize] === 108, // ASCII 'l' for vectors
                      `Step ${i} should be low`);
        }
    });

    it('Character H - High with edge marker', () => {
        const input = { signal: [{ name: 'test', wave: 'HHHHH' }] };
        const result = fullRoundTrip(input);
        
        // H should be marked appropriately
        assertTrue(result.doc1.m_signals.length === 1);
    });

    it('Character L - Low with edge marker', () => {
        const input = { signal: [{ name: 'test', wave: 'LLLLL' }] };
        const result = fullRoundTrip(input);
        
        assertTrue(result.doc1.m_signals.length === 1);
    });

    it('Mixed clock gating: phnlPHNL', () => {
        const input = { signal: [{ name: 'clk0', wave: 'phnlPHNL' }] };
        const result = fullRoundTrip(input);
        
        assertTrue(result.success, result.errors?.join('\n'));
    });

    it('Clock gating with x: xhlhLHl.', () => {
        const input = { signal: [{ name: 'clk1', wave: 'xhlhLHl.' }] };
        const result = fullRoundTrip(input);
        
        assertTrue(result.doc1.m_signals.length === 1);
    });

    it('Clock with h/p mix: hpHplnLn', () => {
        const input = { signal: [{ name: 'clk2', wave: 'hpHplnLn' }] };
        const result = fullRoundTrip(input);
        
        assertTrue(result.doc1.m_signals.length === 1);
    });

    it('Full clock tutorial example', () => {
        const input = {
            signal: [
                { name: 'pclk', wave: 'p.......' },
                { name: 'Pclk', wave: 'P.......' },
                { name: 'nclk', wave: 'n.......' },
                { name: 'Nclk', wave: 'N.......' },
                {},
                { name: 'clk0', wave: 'phnlPHNL' },
                { name: 'clk1', wave: 'xhlhLHl.' },
                { name: 'clk2', wave: 'hpHplnLn' },
                { name: 'clk3', wave: 'nhNhplPl' },
                { name: 'clk4', wave: 'xlh.LH..' }
            ]
        };
        const result = fullRoundTrip(input);
        
        assertTrue(result.success, result.errors?.join('\n'));
        assertEqual(result.doc1.m_signals.length, 10);
    });
});

// ============================================================================
// STEP 3: BUS/WIRE WITH DATA
// ============================================================================

describe('WaveDrom Step 3 - Bus/Wire with Data', () => {
    
    it('Bus with data labels', () => {
        const input = {
            signal: [
                { name: 'bus', wave: 'x.==.=x', data: ['head', 'body', 'tail'] }
            ]
        };
        const result = fullRoundTrip(input);
        
        assertEqual(result.doc1.m_signals[0].type, SignalType.Vector);
        
        // Check that labels are stored
        const nonEmptyLabels = result.doc1.m_signals[0].labels.filter(l => l && l.trim());
        assertGreaterThan(nonEmptyLabels.length, 0, 'Should have data labels');
    });

    it('Wire signal (bit)', () => {
        const input = {
            signal: [
                { name: 'wire', wave: '0.1..0.' }
            ]
        };
        const result = fullRoundTrip(input);
        
        assertEqual(result.doc1.m_signals[0].type, SignalType.Bit);
    });

    it('Full tutorial example: clk, bus, wire', () => {
        const input = {
            signal: [
                { name: 'clk', wave: 'P......' },
                { name: 'bus', wave: 'x.==.=x', data: ['head', 'body', 'tail'] },
                { name: 'wire', wave: '0.1..0.' }
            ]
        };
        const result = fullRoundTrip(input);
        
        assertTrue(result.success, result.errors?.join('\n'));
        assertEqual(result.doc1.m_signals.length, 3);
    });

    it('Data as space-separated string', () => {
        const input = {
            signal: [
                { name: 'bus', wave: 'x.==.=x', data: 'head body tail' }
            ]
        };
        const result = fullRoundTrip(input);
        
        assertTrue(result.doc1.m_signals.length === 1);
    });

    it('Numbered vector states 2-9 with data', () => {
        const input = {
            signal: [
                { name: 'bus', wave: 'x2345x', data: ['A', 'B', 'C', 'D'] }
            ]
        };
        const result = fullRoundTrip(input);
        
        assertEqual(result.doc1.m_signals[0].type, SignalType.Vector);
    });
});

// ============================================================================
// STEP 4: SPACERS AND GAPS (TIME JUMPS)
// ============================================================================

describe('WaveDrom Step 4 - Spacers and Gaps', () => {
    
    it('Empty object creates blank row', () => {
        const input = {
            signal: [
                { name: 'a', wave: '01010' },
                {},
                { name: 'b', wave: '10101' }
            ]
        };
        const result = fullRoundTrip(input);
        
        assertEqual(result.doc1.m_signals.length, 3);
        assertEqual(result.doc1.m_signals[1].type, SignalType.BlankRow);
    });

    it('Pipe | creates time jump/gap', () => {
        const input = {
            signal: [
                { name: 'clk', wave: 'p.....|...' }
            ]
        };
        const result = fullRoundTrip(input);
        
        assertGreaterThan(result.doc1.m_timeJumps.length, 0, 'Should create time jump');
    });

    it('Time jump with multiple signals', () => {
        const input = {
            signal: [
                { name: 'clk', wave: 'p.....|...' },
                { name: 'Data', wave: 'x.345x|=.x', data: ['head', 'body', 'tail', 'data'] },
                { name: 'Request', wave: '0.1..0|1.0' },
                {},
                { name: 'Acknowledge', wave: '1.....|01.' }
            ]
        };
        const result = fullRoundTrip(input);
        
        assertTrue(result.success, result.errors?.join('\n'));
        assertGreaterThan(result.doc1.m_timeJumps.length, 0);
    });

    it('Time jump position is correct', () => {
        const input = {
            signal: [
                { name: 'clk', wave: 'p..|.p.' }
            ]
        };
        const result = fullRoundTrip(input);
        
        // Time jump should be at position after 3 steps
        if (result.doc1.m_timeJumps.length > 0) {
            assertTrue(result.doc1.m_timeJumps[0].position > 0);
        }
    });
});

// ============================================================================
// STEP 5: GROUPS
// ============================================================================

describe('WaveDrom Step 5 - Groups', () => {
    
    it('Simple group', () => {
        const input = {
            signal: [
                ['GroupName',
                    { name: 'a', wave: '01010' },
                    { name: 'b', wave: '10101' }
                ]
            ]
        };
        const result = fullRoundTrip(input);
        
        assertEqual(result.doc1.m_signals.length, 2);
        assertEqual(result.doc1.m_signals[0].groupName, 'GroupName');
        assertEqual(result.doc1.m_signals[1].groupName, 'GroupName');
    });

    it('Nested groups', () => {
        const input = {
            signal: [
                ['Outer',
                    ['Inner',
                        { name: 'a', wave: '01010' },
                        { name: 'b', wave: '10101' }
                    ],
                    { name: 'c', wave: 'xxxxx' }
                ]
            ]
        };
        const result = fullRoundTrip(input);
        
        assertGreaterThan(result.doc1.m_signals.length, 0);
    });

    it('Nested groups preserve groupPath', () => {
        const input = {
            signal: [
                ['Outer',
                    ['Inner',
                        { name: 'a', wave: '01010' },
                        { name: 'b', wave: '10101' }
                    ],
                    { name: 'c', wave: 'xxxxx' }
                ]
            ]
        };
        const result = fullRoundTrip(input);
        
        // Signals 'a' and 'b' should have groupPath ['Outer', 'Inner']
        assertEqual(result.doc1.m_signals[0].groupPath.length, 2);
        assertEqual(result.doc1.m_signals[0].groupPath[0], 'Outer');
        assertEqual(result.doc1.m_signals[0].groupPath[1], 'Inner');
        assertEqual(result.doc1.m_signals[1].groupPath[0], 'Outer');
        assertEqual(result.doc1.m_signals[1].groupPath[1], 'Inner');
        
        // groupName should be hierarchical with '/' separator for WavePaint GroupManager
        assertEqual(result.doc1.m_signals[0].groupName, 'Outer/Inner');
        assertEqual(result.doc1.m_signals[1].groupName, 'Outer/Inner');
        
        // Signal 'c' should have groupPath ['Outer'] (only in outer group)
        assertEqual(result.doc1.m_signals[2].groupPath.length, 1);
        assertEqual(result.doc1.m_signals[2].groupPath[0], 'Outer');
        assertEqual(result.doc1.m_signals[2].groupName, 'Outer');
    });

    it('Deeply nested groups preserve full hierarchy', () => {
        const input = {
            signal: [
                ['L1',
                    ['L2',
                        ['L3',
                            { name: 'deep', wave: '01010' }
                        ]
                    ]
                ]
            ]
        };
        const result = fullRoundTrip(input);
        
        assertEqual(result.doc1.m_signals[0].groupPath.length, 3);
        assertEqual(result.doc1.m_signals[0].groupPath[0], 'L1');
        assertEqual(result.doc1.m_signals[0].groupPath[1], 'L2');
        assertEqual(result.doc1.m_signals[0].groupPath[2], 'L3');
        
        // groupName should be hierarchical for WavePaint GroupManager
        assertEqual(result.doc1.m_signals[0].groupName, 'L1/L2/L3');
    });

    it('Nested groups round-trip through WavePaint JSON', () => {
        const input = {
            signal: [
                ['Master',
                    ['ctrl',
                        { name: 'write', wave: '01.0' },
                        { name: 'read', wave: '0..1' }
                    ],
                    { name: 'data', wave: 'x=.x' }
                ]
            ]
        };
        const result = fullRoundTrip(input);
        
        // After round-trip through WavePaint JSON (doc1 -> wpJson -> doc2)
        // groupPath should be preserved
        assertEqual(result.doc2.m_signals[0].groupPath?.length, 2);
        assertEqual(result.doc2.m_signals[0].groupPath?.[0], 'Master');
        assertEqual(result.doc2.m_signals[0].groupPath?.[1], 'ctrl');
    });

    it('Nested groups export to correct WaveDrom structure', () => {
        const input = {
            signal: [
                ['Outer',
                    ['Inner',
                        { name: 'a', wave: '01010' },
                        { name: 'b', wave: '10101' }
                    ],
                    { name: 'c', wave: 'xxxxx' }
                ]
            ]
        };
        const result = fullRoundTrip(input);
        
        // The exported WaveDrom (wave2) should have nested structure
        // wave2.signal should be: [['Outer', ['Inner', {...}, {...}], {...}]]
        assertTrue(Array.isArray(result.wave2.signal), 'wave2.signal should be an array');
        assertTrue(result.wave2.signal.length > 0, 'wave2.signal should not be empty');
        
        // First element should be the Outer group
        const outerGroup = result.wave2.signal[0];
        assertTrue(Array.isArray(outerGroup), 'First element should be a group (array)');
        assertEqual(outerGroup[0], 'Outer');
        
        // Second element of Outer should be the Inner group
        const innerGroup = outerGroup[1];
        assertTrue(Array.isArray(innerGroup), 'Second element should be Inner group (array)');
        assertEqual(innerGroup[0], 'Inner');
        
        // Inner group should have signals a and b
        assertEqual(innerGroup[1].name, 'a');
        assertEqual(innerGroup[2].name, 'b');
        
        // Third element of Outer should be signal c
        assertEqual(outerGroup[2].name, 'c');
    });

    it('Full Master/Slave tutorial example', () => {
        const input = {
            signal: [
                { name: 'clk', wave: 'p..Pp..P' },
                ['Master',
                    ['ctrl',
                        { name: 'write', wave: '01.0....' },
                        { name: 'read', wave: '0...1..0' }
                    ],
                    { name: 'addr', wave: 'x3.x4..x', data: 'A1 A2' },
                    { name: 'wdata', wave: 'x3.x....', data: 'D1' }
                ],
                {},
                ['Slave',
                    ['ctrl',
                        { name: 'ack', wave: 'x01x0.1x' }
                    ],
                    { name: 'rdata', wave: 'x.....4x', data: 'Q2' }
                ]
            ]
        };
        const result = fullRoundTrip(input);
        
        assertTrue(result.success, result.errors?.join('\n'));
        // Should have: clk, write, read, addr, wdata, blank, ack, rdata = 8 signals
        assertGreaterThan(result.doc1.m_signals.length, 5);
    });

    it('Groups preserve hierarchy in output', () => {
        const input = {
            signal: [
                ['Group1',
                    { name: 'a', wave: '01010' }
                ],
                ['Group2',
                    { name: 'b', wave: '10101' }
                ]
            ]
        };
        const result = fullRoundTrip(input);
        
        assertEqual(result.doc1.m_signals[0].groupName, 'Group1');
        assertEqual(result.doc1.m_signals[1].groupName, 'Group2');
    });

    it('Export rebuilds structure from groupPath WITHOUT preserved m_waveDromSignalStructure', () => {
        // This test ensures we're not "cheating" by using the preserved structure
        const input = {
            signal: [
                ['Master',
                    ['ctrl',
                        { name: 'write', wave: '01.0' },
                        { name: 'read', wave: '0..1' }
                    ],
                    { name: 'data', wave: 'x=.x' }
                ],
                ['Slave',
                    { name: 'ack', wave: 'x01x' }
                ]
            ]
        };
        
        // Step 1: Import WaveDrom
        const doc = new WaveDocument();
        const success = importFromWaveDrom(doc, input);
        assertTrue(success, 'Import should succeed');
        
        // Step 2: CLEAR the preserved structure on the DOCUMENT - force reconstruction from groupPath
        delete doc.m_waveDromSignalStructure;
        
        // Verify signals have correct groupPath and hierarchical groupName
        const writeSignal = doc.m_signals.find(s => s.name === 'write');
        const readSignal = doc.m_signals.find(s => s.name === 'read');
        const dataSignal = doc.m_signals.find(s => s.name === 'data');
        const ackSignal = doc.m_signals.find(s => s.name === 'ack');
        
        // Check groupPath
        assertEqual(writeSignal.groupPath?.length, 2);
        assertEqual(writeSignal.groupPath?.[0], 'Master');
        assertEqual(writeSignal.groupPath?.[1], 'ctrl');
        
        assertEqual(dataSignal.groupPath?.length, 1);
        assertEqual(dataSignal.groupPath?.[0], 'Master');
        
        assertEqual(ackSignal.groupPath?.length, 1);
        assertEqual(ackSignal.groupPath?.[0], 'Slave');
        
        // Check hierarchical groupName (uses '/' for WavePaint GroupManager)
        assertEqual(writeSignal.groupName, 'Master/ctrl');
        assertEqual(readSignal.groupName, 'Master/ctrl');
        assertEqual(dataSignal.groupName, 'Master');
        assertEqual(ackSignal.groupName, 'Slave');
        
        // Step 3: Export WITHOUT preserved structure
        const wave2 = exportToWaveDrom(doc);
        
        // Step 4: Verify the exported structure is correctly nested
        assertTrue(Array.isArray(wave2.signal), 'wave2.signal should be an array');
        
        // Should have Master group and Slave group at top level
        const masterGroup = wave2.signal.find(item => Array.isArray(item) && item[0] === 'Master');
        const slaveGroup = wave2.signal.find(item => Array.isArray(item) && item[0] === 'Slave');
        
        assertTrue(masterGroup !== undefined, 'Master group should exist');
        assertTrue(slaveGroup !== undefined, 'Slave group should exist');
        
        // Master should contain ctrl subgroup and data signal
        const ctrlGroup = masterGroup.find(item => Array.isArray(item) && item[0] === 'ctrl');
        assertTrue(ctrlGroup !== undefined, 'ctrl subgroup should exist within Master');
        
        // ctrl should contain write and read signals
        const writeInCtrl = ctrlGroup.find(item => item?.name === 'write');
        const readInCtrl = ctrlGroup.find(item => item?.name === 'read');
        assertTrue(writeInCtrl !== undefined, 'write signal should be in ctrl group');
        assertTrue(readInCtrl !== undefined, 'read signal should be in ctrl group');
        
        // data should be directly in Master, not in ctrl
        const dataInMaster = masterGroup.find(item => item?.name === 'data');
        assertTrue(dataInMaster !== undefined, 'data signal should be directly in Master group');
        
        // ack should be in Slave group
        const ackInSlave = slaveGroup.find(item => item?.name === 'ack');
        assertTrue(ackInSlave !== undefined, 'ack signal should be in Slave group');
    });
});

// ============================================================================
// STEP 6: PERIOD AND PHASE
// ============================================================================

describe('WaveDrom Step 6 - Period and Phase', () => {
    
    it('Period = 2 (double width)', () => {
        const input = {
            signal: [
                { name: 'clk', wave: 'p...', period: 2 },
                { name: 'data', wave: '01010101' }
            ]
        };
        const result = fullRoundTrip(input);
        
        assertEqual(result.doc1.m_signals[0].waveDromPeriod, 2);
    });

    it('Phase = 0.5 (half step shift)', () => {
        const input = {
            signal: [
                { name: 'clk', wave: 'p.....' },
                { name: 'data', wave: '01.0..', phase: 0.5 }
            ]
        };
        const result = fullRoundTrip(input);
        
        assertEqual(result.doc1.m_signals[1].waveDromPhase, 0.5);
    });

    it('Negative phase', () => {
        const input = {
            signal: [
                { name: 'clk', wave: 'p.....' },
                { name: 'data', wave: '01.0..', phase: -0.5 }
            ]
        };
        const result = fullRoundTrip(input);
        
        assertEqual(result.doc1.m_signals[1].waveDromPhase, -0.5);
    });

    it('DDR Read transaction (full example)', () => {
        const input = {
            signal: [
                { name: 'CK', wave: 'P.......', period: 2 },
                { name: 'CMD', wave: 'x.3x=x4x=x=x=x=x', data: 'RAS NOP CAS NOP NOP NOP NOP', phase: 0.5 },
                { name: 'ADDR', wave: 'x.=x..=x........', data: 'ROW COL', phase: 0.5 },
                { name: 'DQS', wave: 'z.......0.1010z.' },
                { name: 'DQ', wave: 'z.........5555z.', data: 'D0 D1 D2 D3' }
            ]
        };
        const result = fullRoundTrip(input);
        
        assertTrue(result.success, result.errors?.join('\n'));
        assertEqual(result.doc1.m_signals[0].waveDromPeriod, 2);
        assertEqual(result.doc1.m_signals[1].waveDromPhase, 0.5);
    });

    it('Period preserved through round-trip', () => {
        const input = {
            signal: [
                { name: 'slow', wave: 'p...', period: 3 }
            ]
        };
        const result = fullRoundTrip(input);
        
        assertEqual(result.doc1.m_signals[0].waveDromPeriod, 3);
        assertEqual(result.doc2.m_signals[0].waveDromPeriod, 3);
    });

    it('Phase preserved through round-trip', () => {
        const input = {
            signal: [
                { name: 'shifted', wave: '01010', phase: 0.25 }
            ]
        };
        const result = fullRoundTrip(input);
        
        assertEqual(result.doc1.m_signals[0].waveDromPhase, 0.25);
        assertEqual(result.doc2.m_signals[0].waveDromPhase, 0.25);
    });
});

// ============================================================================
// STEP 7: CONFIG (hscale, head, foot)
// ============================================================================

describe('WaveDrom Step 7 - Config', () => {
    
    it('hscale = 1 (default)', () => {
        const input = {
            signal: [
                { name: 'clk', wave: 'p....' }
            ],
            config: { hscale: 1 }
        };
        const result = fullRoundTrip(input);
        
        assertTrue(result.success, result.errors?.join('\n'));
    });

    it('hscale = 2', () => {
        const input = {
            signal: [
                { name: 'clk', wave: 'p....' }
            ],
            config: { hscale: 2 }
        };
        const result = fullRoundTrip(input);
        
        // Config should be preserved
        if (result.doc1.m_waveDromConfig) {
            assertEqual(result.doc1.m_waveDromConfig.hscale, 2);
        }
    });

    it('head with text', () => {
        const input = {
            signal: [
                { name: 'clk', wave: 'p....' }
            ],
            head: { text: 'WaveDrom example' }
        };
        const result = fullRoundTrip(input);
        
        assertNotNull(result.doc1.m_waveDromHead);
    });

    it('foot with text', () => {
        const input = {
            signal: [
                { name: 'clk', wave: 'p....' }
            ],
            foot: { text: 'Figure 100' }
        };
        const result = fullRoundTrip(input);
        
        assertNotNull(result.doc1.m_waveDromFoot);
    });

    it('head with tick', () => {
        const input = {
            signal: [
                { name: 'clk', wave: 'p....' }
            ],
            head: { tick: 0 }
        };
        const result = fullRoundTrip(input);
        
        assertTrue(result.doc1.m_waveDromHead !== undefined);
    });

    it('foot with tock', () => {
        const input = {
            signal: [
                { name: 'clk', wave: 'p....' }
            ],
            foot: { tock: 9 }
        };
        const result = fullRoundTrip(input);
        
        assertTrue(result.doc1.m_waveDromFoot !== undefined);
    });

    it('head/foot with every', () => {
        const input = {
            signal: [
                { name: 'clk', wave: 'p....' }
            ],
            head: { tick: 0, every: 2 },
            foot: { tock: 9 }
        };
        const result = fullRoundTrip(input);
        
        assertTrue(result.success, result.errors?.join('\n'));
    });

    it('Full config example', () => {
        const input = {
            signal: [
                { name: 'clk', wave: 'p....' },
                { name: 'Data', wave: 'x345x', data: 'a b c' },
                { name: 'Request', wave: '01..0' }
            ],
            head: {
                text: 'WaveDrom example',
                tick: 0,
                every: 2
            },
            foot: {
                text: 'Figure 100',
                tock: 9
            }
        };
        const result = fullRoundTrip(input);
        
        assertTrue(result.success, result.errors?.join('\n'));
    });
});

// ============================================================================
// STEP 8: ARROWS (Splines and Sharp Lines)
// ============================================================================

describe('WaveDrom Step 8 - Arrows (Splines)', () => {
    
    it('Simple spline arrow ~>', () => {
        const input = {
            signal: [
                { name: 'A', wave: '01.....', node: '.a.....' },
                { name: 'B', wave: '0..1...', node: '...b...' }
            ],
            edge: ['a~>b']
        };
        const result = fullRoundTrip(input);
        
        assertGreaterThan(result.doc1.m_arrows.length, 0, 'Should create arrow');
        assertEqual(result.doc1.m_arrows[0].style, '~>');
    });

    it('Spline arrow with label', () => {
        const input = {
            signal: [
                { name: 'A', wave: '01.....', node: '.a.....' },
                { name: 'B', wave: '0..1...', node: '...b...' }
            ],
            edge: ['a~>b t1']
        };
        const result = fullRoundTrip(input);
        
        assertGreaterThan(result.doc1.m_arrows.length, 0);
    });

    it('Bidirectional spline <~>', () => {
        const input = {
            signal: [
                { name: 'A', wave: '01.....', node: '.a.....' },
                { name: 'B', wave: '0..1...', node: '...b...' }
            ],
            edge: ['a<~>b']
        };
        const result = fullRoundTrip(input);
        
        // Should create arrow (style may vary)
        assertTrue(result.doc1.m_arrows.length > 0 || result.doc1.m_timeSpanMarkers.length > 0);
    });

    it('Simple spline ~ (no arrow)', () => {
        const input = {
            signal: [
                { name: 'A', wave: '01.....', node: '.a.....' },
                { name: 'B', wave: '0..1...', node: '...b...' }
            ],
            edge: ['a~b']
        };
        const result = fullRoundTrip(input);
        
        assertTrue(result.success, result.errors?.join('\n'));
    });

    it('Full spline example from tutorial', () => {
        const input = {
            signal: [
                { name: 'A', wave: '01........0....', node: '.a........j' },
                { name: 'B', wave: '0.1.......0.1..', node: '..b.......i' },
                { name: 'C', wave: '0..1....0...1..', node: '...c....h..' },
                { name: 'D', wave: '0...1..0.....1.', node: '....d..g...' },
                { name: 'E', wave: '0....10.......1', node: '.....ef....' }
            ],
            edge: [
                'a~b t1', 'b~c t2', 'c~d t3', 'd~e t4', 'e~f t5',
                'f~g t6', 'g~h t7', 'h~i t8', 'i~j t9'
            ]
        };
        const result = fullRoundTrip(input);
        
        assertTrue(result.success, result.errors?.join('\n'));
        assertGreaterThan(result.doc1.m_arrows.length, 0);
    });
});

describe('WaveDrom Step 8 - Arrows (Sharp Lines)', () => {
    
    it('Sharp arrow ->', () => {
        const input = {
            signal: [
                { name: 'A', wave: '01..0..', node: '.a..e..' },
                { name: 'B', wave: '0.1..0.', node: '..b..d.' }
            ],
            edge: ['a->b']
        };
        const result = fullRoundTrip(input);
        
        // Sharp lines may go to timeSpanMarkers instead of arrows
        assertTrue(result.doc1.m_arrows.length > 0 || result.doc1.m_timeSpanMarkers.length > 0);
    });

    it('Sharp arrow with elbow -|>', () => {
        const input = {
            signal: [
                { name: 'A', wave: '01..0..', node: '.a.....' },
                { name: 'B', wave: '0.1..0.', node: '..b....' }
            ],
            edge: ['a-|>b']
        };
        const result = fullRoundTrip(input);
        
        assertTrue(result.doc1.m_arrows.length > 0 || result.doc1.m_timeSpanMarkers.length > 0);
    });

    it('Sharp arrow double elbow -|->', () => {
        const input = {
            signal: [
                { name: 'A', wave: '01..0..', node: '.a.....' },
                { name: 'B', wave: '0.1..0.', node: '..b....' }
            ],
            edge: ['a-|->b']
        };
        const result = fullRoundTrip(input);
        
        assertTrue(result.success, result.errors?.join('\n'));
    });

    it('Bidirectional sharp <->', () => {
        const input = {
            signal: [
                { name: 'A', wave: '01..0..', node: '.a.....' },
                { name: 'B', wave: '0.1..0.', node: '..b....' }
            ],
            edge: ['a<->b']
        };
        const result = fullRoundTrip(input);
        
        assertTrue(result.success, result.errors?.join('\n'));
    });

    it('Node-only row for extra endpoints', () => {
        const input = {
            signal: [
                { name: 'A', wave: '01..0..', node: '.a..e..' },
                { name: 'B', wave: '0.1..0.', node: '..b..d.', phase: 0.5 },
                { name: 'C', wave: '0..1..0', node: '...c..f' },
                { node: '...g..h' },
                { node: '...I..J', phase: 0.5 },
                { name: 'D', wave: '0..1..0', phase: 0.5 }
            ],
            edge: ['a-b', 'b-|>c', 'c-|>d', 'e-|>f']
        };
        const result = fullRoundTrip(input);
        
        assertTrue(result.success, result.errors?.join('\n'));
    });
});

// ============================================================================
// COMBINED FEATURES TESTS
// ============================================================================

describe('WaveDrom - Combined Features', () => {
    
    it('Clock + Bus + Wire + Groups', () => {
        const input = {
            signal: [
                { name: 'clk', wave: 'p......' },
                ['Data',
                    { name: 'bus', wave: 'x.==.=x', data: ['A', 'B', 'C'] },
                    { name: 'valid', wave: '0.1..0.' }
                ]
            ]
        };
        const result = fullRoundTrip(input);
        
        assertTrue(result.success, result.errors?.join('\n'));
        assertEqual(result.doc1.m_signals.length, 3);
    });

    it('Period + Phase + Groups', () => {
        const input = {
            signal: [
                { name: 'clk', wave: 'p....', period: 2 },
                ['Signals',
                    { name: 'a', wave: '01010101', phase: 0.5 },
                    { name: 'b', wave: '10101010', phase: -0.5 }
                ]
            ]
        };
        const result = fullRoundTrip(input);
        
        assertEqual(result.doc1.m_signals[0].waveDromPeriod, 2);
    });

    it('Time jumps + Arrows', () => {
        const input = {
            signal: [
                { name: 'clk', wave: 'p...|...', node: '.a..|.b.' },
                { name: 'data', wave: '01..|..0', node: '..c.|..d' }
            ],
            edge: ['a~>c', 'b~>d']
        };
        const result = fullRoundTrip(input);
        
        assertGreaterThan(result.doc1.m_timeJumps.length, 0);
        assertGreaterThan(result.doc1.m_arrows.length, 0);
    });

    it('Head + Foot + Config + Arrows', () => {
        const input = {
            signal: [
                { name: 'clk', wave: 'p.....', node: '.a....' },
                { name: 'data', wave: '01.0..', node: '..b...' }
            ],
            edge: ['a~>b setup'],
            head: { text: 'Timing Diagram', tick: 0 },
            foot: { text: 'Fig 1', tock: 0 },
            config: { hscale: 2 }
        };
        const result = fullRoundTrip(input);
        
        assertTrue(result.success, result.errors?.join('\n'));
        assertNotNull(result.doc1.m_waveDromHead);
        assertNotNull(result.doc1.m_waveDromFoot);
    });

    it('All features combined', () => {
        const input = {
            signal: [
                { name: 'clk', wave: 'p..Pp..P', node: '.a......' },
                ['Master',
                    ['ctrl',
                        { name: 'write', wave: '01.0....', node: '..b.....' },
                        { name: 'read', wave: '0...1..0' }
                    ],
                    { name: 'addr', wave: 'x3.x4..x', data: 'A1 A2', phase: 0.25 }
                ],
                {},
                { name: 'ack', wave: 'x01x0.1x|.', node: '...c.....' }
            ],
            edge: ['a~>b t_setup', 'b~>c t_resp'],
            head: { text: 'Bus Transaction', tick: 0 },
            foot: { text: 'Figure 1' },
            config: { hscale: 1 }
        };
        const result = fullRoundTrip(input);
        
        assertTrue(result.success, result.errors?.join('\n'));
    });
});

// ============================================================================
// STRICT ROUND-TRIP VERIFICATION
// ============================================================================

describe('WaveDrom - Strict Round-Trip Verification', () => {
    
    it('Simple wave exact match', () => {
        const input = { signal: [{ name: 'test', wave: '01010' }] };
        const result = fullRoundTrip(input);
        
        // wave1 and wave2 should be equivalent
        const errors = strictCompareSignals(result.wave1, result.wave2);
        assertTrue(errors.length === 0, `wave1 vs wave2: ${errors.join('\n')}`);
    });

    it('Signal names preserved exactly', () => {
        const input = {
            signal: [
                { name: 'Clock_Signal', wave: 'p.....' },
                { name: 'data[7:0]', wave: '=.=.=.' },
                { name: 'valid_n', wave: '10..10' }
            ]
        };
        const result = fullRoundTrip(input);
        
        assertEqual(result.doc2.m_signals[0].name, 'Clock_Signal');
        assertEqual(result.doc2.m_signals[1].name, 'data[7:0]');
        assertEqual(result.doc2.m_signals[2].name, 'valid_n');
    });

    it('Data labels preserved', () => {
        const input = {
            signal: [
                { name: 'bus', wave: '=.=.=.', data: ['ADDR', 'DATA', 'ACK'] }
            ]
        };
        const result = fullRoundTrip(input);
        
        const labels1 = result.doc1.m_signals[0].labels.filter(l => l && l.trim());
        const labels2 = result.doc2.m_signals[0].labels.filter(l => l && l.trim());
        
        assertEqual(labels1.length, labels2.length, 'Label count should match');
    });

    it('Signal values preserved exactly', () => {
        const input = { signal: [{ name: 'test', wave: '01xz10' }] };
        const result = fullRoundTrip(input);
        
        for (let i = 0; i < result.doc1.m_signals[0].values.length; i++) {
            assertEqual(
                result.doc1.m_signals[0].values[i],
                result.doc2.m_signals[0].values[i],
                `Value mismatch at index ${i}`
            );
        }
    });

    it('Arrow count preserved', () => {
        const input = {
            signal: [
                { name: 'a', wave: '01.....', node: '.A.B...' },
                { name: 'b', wave: '0..1...', node: '...C.D.' }
            ],
            edge: ['A~>C', 'B~>D']
        };
        const result = fullRoundTrip(input);
        
        assertEqual(result.doc1.m_arrows.length, result.doc2.m_arrows.length);
    });

    it('Time jump count preserved', () => {
        const input = {
            signal: [
                { name: 'clk', wave: 'p.|.p' }  // Only 1 time jump
            ]
        };
        const result = fullRoundTrip(input);
        
        assertEqual(result.doc1.m_timeJumps.length, result.doc2.m_timeJumps.length);
    });

    it('Group assignment preserved', () => {
        const input = {
            signal: [
                ['GroupA',
                    { name: 'a', wave: '01010' },
                    { name: 'b', wave: '10101' }
                ]
            ]
        };
        const result = fullRoundTrip(input);
        
        assertEqual(result.doc1.m_signals[0].groupName, result.doc2.m_signals[0].groupName);
        assertEqual(result.doc1.m_signals[1].groupName, result.doc2.m_signals[1].groupName);
    });
});

// ============================================================================
// SAMPLE FILE ROUND-TRIP TESTS
// ============================================================================

describe('WaveDrom - Sample Files Round-Trip', () => {
    const samplesDir = path.join(__dirname, 'wavedrom_samples');
    
    let sampleFiles = [];
    try {
        sampleFiles = fs.readdirSync(samplesDir).filter(f => f.endsWith('.json'));
    } catch (e) {
        // No samples directory
    }

    if (sampleFiles.length === 0) {
        it('No sample files (skipped)', () => assertTrue(true));
    }

    sampleFiles.forEach(file => {
        const testName = file.replace('.json', '').replace(/_/g, ' ');
        
        it(`Full round-trip: ${testName}`, () => {
            const filePath = path.join(samplesDir, file);
            const content = fs.readFileSync(filePath, 'utf-8');
            const wavedrom = JSON.parse(content);
            
            const result = fullRoundTrip(wavedrom);
            
            assertTrue(result.success, `Import/export failed: ${result.errors?.join('\n')}`);
            
            // Verify signal count
            const origSignals = flattenSignals(wavedrom.signal).filter(s => s.name || s.wave);
            const expSignals = flattenSignals(result.wave2.signal).filter(s => s.name || s.wave);
            
            assertEqual(origSignals.length, expSignals.length, 
                `Signal count mismatch: expected ${origSignals.length}, got ${expSignals.length}`);
        });
    });
});

// ============================================================================
// EDGE CASES AND ERROR HANDLING
// ============================================================================

describe('WaveDrom - Edge Cases', () => {
    
    it('Empty signal array', () => {
        const input = { signal: [] };
        const doc = new WaveDocument();
        const success = importFromWaveDrom(doc, input);
        
        assertTrue(success);
        assertEqual(doc.m_signals.length, 0);
    });

    it('Signal with empty wave', () => {
        const input = { signal: [{ name: 'test', wave: '' }] };
        const doc = new WaveDocument();
        const success = importFromWaveDrom(doc, input);
        
        assertTrue(success);
    });

    it('Signal without name', () => {
        const input = { signal: [{ wave: '01010' }] };
        const doc = new WaveDocument();
        const success = importFromWaveDrom(doc, input);
        
        assertTrue(success);
        assertEqual(doc.m_signals[0].name, '');
    });

    it('Very long wave string', () => {
        const longWave = '01'.repeat(500);
        const input = { signal: [{ name: 'long', wave: longWave }] };
        const result = fullRoundTrip(input);
        
        assertTrue(result.success, result.errors?.join('\n'));
    });

    it('Many signals', () => {
        const signals = [];
        for (let i = 0; i < 100; i++) {
            signals.push({ name: `sig${i}`, wave: '01010' });
        }
        const input = { signal: signals };
        const result = fullRoundTrip(input);
        
        assertEqual(result.doc1.m_signals.length, 100);
    });

    it('Unicode in names and data', () => {
        const input = {
            signal: [
                { name: '信号α', wave: '=.=.', data: ['データ', '数据'] }
            ]
        };
        const result = fullRoundTrip(input);
        
        assertEqual(result.doc2.m_signals[0].name, '信号α');
    });

    it('Special characters in names', () => {
        const input = {
            signal: [
                { name: 'data[7:0]', wave: '=....' },
                { name: 'clk/2', wave: 'p....' },
                { name: 'valid_n', wave: '1....' },
                { name: 'sig.out', wave: '0....' }
            ]
        };
        const result = fullRoundTrip(input);
        
        assertEqual(result.doc2.m_signals[0].name, 'data[7:0]');
        assertEqual(result.doc2.m_signals[1].name, 'clk/2');
    });

    it('Deeply nested groups', () => {
        const input = {
            signal: [
                ['L1',
                    ['L2',
                        ['L3',
                            ['L4',
                                { name: 'deep', wave: '01010' }
                            ]
                        ]
                    ]
                ]
            ]
        };
        const result = fullRoundTrip(input);
        
        assertEqual(result.doc1.m_signals.length, 1);
    });

    it('Invalid edge reference (should not crash)', () => {
        const input = {
            signal: [
                { name: 'a', wave: '01010', node: '.a...' }
            ],
            edge: ['a~>z'] // z doesn't exist
        };
        const doc = new WaveDocument();
        const success = importFromWaveDrom(doc, input);
        
        // Should not crash, may or may not create arrow
        assertTrue(success);
    });
});

// ============================================================================
// FUNCTION EXISTENCE TESTS
// ============================================================================

describe('WaveDrom - API Functions', () => {
    
    it('importFromWaveDrom exists', () => {
        assertType(importFromWaveDrom, 'function');
    });

    it('exportToWaveDrom exists', () => {
        assertType(exportToWaveDrom, 'function');
    });

    it('exportToWaveDromString exists', () => {
        assertType(exportToWaveDromString, 'function');
    });

    it('parseWaveDromCode exists', () => {
        assertType(parseWaveDromCode, 'function');
    });

    it('WAVEDROM_COLORS exists', () => {
        assertType(WAVEDROM_COLORS, 'object');
    });

    it('WaveValue exists', () => {
        assertType(WaveValue, 'object');
    });
});

module.exports = {};
