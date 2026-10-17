#!/usr/bin/env node
/**
 * Regression tests for GitHub issue fixes
 * Covers issues #2 (marker count), #3 (WaveDrom node positions),
 * #7 (cut tool / phase shift) and #11 (signal cloning helpers)
 */

const {
    describe, it,
    assertEqual, assertTrue
} = require('../testFramework.cjs');

const { createTestDocument } = require('../mocks.cjs');

// ============================================================================
// ISSUE #2 - Deleting stacked markers must renumber the remaining ones
// ============================================================================

describe('Issue #2 - Marker renumbering on delete', () => {
    it('Deleting a stacked marker renumbers the remaining one', () => {
        const doc = createTestDocument();
        doc.m_sampleCount = 10;

        const id1 = doc.addMarker(5);
        const id2 = doc.addMarker(5); // Stacked on top of the first one
        assertEqual(id1, 1);
        assertEqual(id2, 2);

        doc.subMarkerById(id1);
        assertEqual(doc.m_markers.length, 1);
        assertEqual(doc.m_markers[0].id, 1, 'Remaining marker should be renumbered to 1');
        assertEqual(doc.m_nextMarkerId, 2);
    });

    it('Deleting a middle marker keeps ids sequential', () => {
        const doc = createTestDocument();
        doc.m_sampleCount = 10;

        doc.addMarker(2);
        const idMid = doc.addMarker(5);
        doc.addMarker(8);

        doc.subMarkerById(idMid);
        assertEqual(doc.m_markers.length, 2);
        assertEqual(doc.m_markers[0].id, 1);
        assertEqual(doc.m_markers[1].id, 2);
        assertEqual(doc.m_nextMarkerId, 3);
    });
});

// ============================================================================
// ISSUE #3 - WaveDrom nodes must not shift when a clock forces substeps
// ============================================================================

describe('Issue #3 - WaveDrom node positions with clocks', () => {
    it('Arrow endpoints stay at their WaveDrom step with a "p..." clock', () => {
        const doc = createTestDocument();
        const input = {
            signal: [
                { name: 'clk', wave: 'p....' },
                { name: 'a', wave: '01...', node: '.a...' },
                { name: 'b', wave: '0.1..', node: '..b..' }
            ],
            edge: ['a~>b']
        };

        const ok = importFromWaveDrom(doc, input);
        assertTrue(ok, 'Import should succeed');
        assertEqual(doc.m_arrows.length, 1);
        assertEqual(doc.m_arrows[0].startPosition, 1, 'Node ".a" is at WaveDrom step 1');
        assertEqual(doc.m_arrows[0].endPosition, 2, 'Node "..b" is at WaveDrom step 2');
    });

    it('Sharp edges (time spans) also keep their WaveDrom steps', () => {
        const doc = createTestDocument();
        const input = {
            signal: [
                { name: 'clk', wave: 'p....' },
                { name: 'a', wave: '01...', node: '.a...' },
                { name: 'b', wave: '0..1.', node: '...b.' }
            ],
            edge: ['a-|>b']
        };

        const ok = importFromWaveDrom(doc, input);
        assertTrue(ok, 'Import should succeed');
        assertEqual(doc.m_timeSpanMarkers.length, 1);
        assertEqual(doc.m_timeSpanMarkers[0].startPosition, 1);
        assertEqual(doc.m_timeSpanMarkers[0].endPosition, 3);
    });
});

// ============================================================================
// ISSUE #7 - Cut tool removes the selected range and keeps the rest
// ============================================================================

describe('Issue #7 - deleteRange (scissor tool)', () => {
    it('Removes the middle range and stitches the remainder', () => {
        const doc = createTestDocument();
        doc.m_sampleCount = 10;
        doc.m_subStepCount = 0;

        const idx = doc.addBitSignal('sig');
        const sig = doc.m_signals[idx];
        for (let i = 0; i < 10; i++) sig.values[i] = i;

        doc.deleteRange(2, 5); // Remove samples 2, 3, 4

        assertEqual(doc.m_sampleCount, 7);
        assertEqual(sig.values.length, 7);
        assertEqual(sig.values[0], 0);
        assertEqual(sig.values[1], 1);
        assertEqual(sig.values[2], 5, 'Sample 5 should now be at index 2');
        assertEqual(sig.values[6], 9);
    });

    it('Removes markers inside the range and shifts the ones after it', () => {
        const doc = createTestDocument();
        doc.m_sampleCount = 10;
        doc.m_subStepCount = 0;
        doc.addBitSignal('sig');

        doc.addMarker(1);
        doc.addMarker(3); // Inside the removed range
        doc.addMarker(8);

        doc.deleteRange(2, 5);

        assertEqual(doc.m_markers.length, 2);
        assertEqual(doc.m_markers[0].position, 1, 'Marker before the range is untouched');
        assertEqual(doc.m_markers[1].position, 5, 'Marker after the range shifts left by 3');
    });

    it('Removes arrows with an endpoint inside the range', () => {
        const doc = createTestDocument();
        doc.m_sampleCount = 10;
        doc.m_subStepCount = 0;
        doc.addBitSignal('a');
        doc.addBitSignal('b');

        doc.m_arrows.push({ id: 1, startSignal: 0, startPosition: 1, endSignal: 1, endPosition: 3, style: '~>', color: null });
        doc.m_arrows.push({ id: 2, startSignal: 0, startPosition: 6, endSignal: 1, endPosition: 8, style: '~>', color: null });

        doc.deleteRange(2, 5);

        assertEqual(doc.m_arrows.length, 1, 'Arrow ending inside the range is removed');
        assertEqual(doc.m_arrows[0].startPosition, 3, 'Surviving arrow shifts left by 3');
        assertEqual(doc.m_arrows[0].endPosition, 5);
    });
});

// ============================================================================
// ISSUE #7 - Phase shift (shift signal left/right)
// ============================================================================

describe('Issue #7 - shiftSignalValues (phase shift)', () => {
    it('Shift right moves values and repeats the first sample', () => {
        const doc = createTestDocument();
        doc.m_sampleCount = 5;
        const idx = doc.addBitSignal('sig');
        const sig = doc.m_signals[idx];
        sig.values = [0, 1, 0, 1, 0];

        doc.shiftSignalValues(idx, 1);
        assertEqual(sig.values.join(','), '0,0,1,0,1');
        assertEqual(sig.values.length, 5, 'Length is preserved');
    });

    it('Shift left moves values and repeats the last sample', () => {
        const doc = createTestDocument();
        doc.m_sampleCount = 5;
        const idx = doc.addBitSignal('sig');
        const sig = doc.m_signals[idx];
        sig.values = [0, 1, 0, 1, 0];

        doc.shiftSignalValues(idx, -1);
        assertEqual(sig.values.join(','), '1,0,1,0,0');
        assertEqual(sig.values.length, 5, 'Length is preserved');
    });

    it('Shift is undoable', () => {
        // Raw document: createTestDocument stubs pushUndoSnapshot/dataChanged
        const doc = new WaveDocument();
        doc.m_sampleCount = 5;
        const idx = doc.addBitSignal('sig');
        const sig = doc.m_signals[idx];
        sig.values = [0, 1, 0, 1, 0];

        doc.shiftSignalValues(idx, 1);
        doc.undo();
        assertEqual(doc.m_signals[idx].values.join(','), '0,1,0,1,0');
    });
});

// ============================================================================
// ISSUE #5 - Unsaved-changes flag
// ============================================================================

describe('Issue #5 - Unsaved changes flag', () => {
    it('Mutations mark the document as modified', () => {
        // Raw document: createTestDocument stubs dataChanged
        const doc = new WaveDocument();
        doc.m_sampleCount = 10;
        doc.m_modified = false;
        doc.addMarker(3);
        assertTrue(doc.m_modified === true, 'addMarker should set m_modified');
    });

    it('Loading a file clears the modified flag', () => {
        const doc = createTestDocument();
        doc.m_sampleCount = 4;
        doc.addBitSignal('sig');
        const ok = loadFromFileContent(doc, JSON.stringify({ sampleCount: 4, signals: [] }));
        assertTrue(ok, 'Load should succeed');
        assertTrue(doc.m_modified === false, 'Loaded document is not dirty');
    });
});
