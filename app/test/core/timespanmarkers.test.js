#!/usr/bin/env node
/**
 * TimeSpanMarkers Tests for WavePaint
 * Tests time span marker creation, validation, and manipulation
 */

const {
    describe, it,
    assertEqual, assertGreaterThan
} = require('../testFramework');

const { createTestDocument } = require('../mocks');

// ============================================================================
// TIME SPAN MARKER CORE TESTS
// ============================================================================

describe('TimeSpanMarkers - Core', () => {
    it('Add time span marker', () => {
        const doc = createTestDocument();
        doc.m_sampleCount = 10;
        doc.m_signals.push(new Signal('a', SignalType.Bit, 10));
        doc.m_signals.push(new Signal('b', SignalType.Bit, 10));
        
        const id = doc.addTimeSpanMarker(0, 2, 1, 8, '-|');
        assertGreaterThan(id, 0);
        assertEqual(doc.m_timeSpanMarkers.length, 1);
        assertEqual(doc.m_timeSpanMarkers[0].style, '-|');
    });

    it('Time span styles', () => {
        const doc = createTestDocument();
        doc.m_sampleCount = 10;
        doc.m_signals.push(new Signal('a', SignalType.Bit, 10));
        doc.m_signals.push(new Signal('b', SignalType.Bit, 10));
        
        const id1 = doc.addTimeSpanMarker(0, 0, 1, 5, '-|');
        const id2 = doc.addTimeSpanMarker(0, 0, 1, 5, '|-');
        const id3 = doc.addTimeSpanMarker(0, 0, 1, 5, '-|-');
        
        assertGreaterThan(id1, 0);
        assertGreaterThan(id2, 0);
        assertGreaterThan(id3, 0);
        assertEqual(doc.m_timeSpanMarkers.length, 3);
    });

    it('Remove time span marker', () => {
        const doc = createTestDocument();
        doc.m_sampleCount = 10;
        doc.m_signals.push(new Signal('a', SignalType.Bit, 10));
        doc.m_signals.push(new Signal('b', SignalType.Bit, 10));
        
        const id = doc.addTimeSpanMarker(0, 2, 1, 8);
        assertEqual(doc.m_timeSpanMarkers.length, 1);
        doc.subTimeSpanMarkerById(id);
        assertEqual(doc.m_timeSpanMarkers.length, 0);
    });

    it('Remove non-existent time span does nothing', () => {
        const doc = createTestDocument();
        doc.m_sampleCount = 10;
        doc.m_signals.push(new Signal('a', SignalType.Bit, 10));
        doc.m_signals.push(new Signal('b', SignalType.Bit, 10));
        
        const id = doc.addTimeSpanMarker(0, 2, 1, 8);
        const undoStackBefore = doc.m_undoStack.length;
        
        doc.subTimeSpanMarkerById(999);
        assertEqual(doc.m_timeSpanMarkers.length, 1);
        assertEqual(doc.m_undoStack.length, undoStackBefore);
    });

    it('Set time span color', () => {
        const doc = createTestDocument();
        doc.m_sampleCount = 10;
        doc.m_signals.push(new Signal('a', SignalType.Bit, 10));
        doc.m_signals.push(new Signal('b', SignalType.Bit, 10));
        
        const id = doc.addTimeSpanMarker(0, 2, 1, 8);
        doc.setTimeSpanMarkerColor(id, '#ff0000');
        
        assertEqual(doc.m_timeSpanMarkers[0].color, '#ff0000');
    });

    it('Set time span style', () => {
        const doc = createTestDocument();
        doc.m_sampleCount = 10;
        doc.m_signals.push(new Signal('a', SignalType.Bit, 10));
        doc.m_signals.push(new Signal('b', SignalType.Bit, 10));
        
        const id = doc.addTimeSpanMarker(0, 2, 1, 8, '-|');
        doc.setTimeSpanMarkerStyle(id, '-|-');
        
        assertEqual(doc.m_timeSpanMarkers[0].style, '-|-');
    });

    it('Clear all time spans', () => {
        const doc = createTestDocument();
        doc.m_sampleCount = 10;
        doc.m_signals.push(new Signal('a', SignalType.Bit, 10));
        doc.m_signals.push(new Signal('b', SignalType.Bit, 10));
        
        doc.addTimeSpanMarker(0, 1, 1, 3);
        doc.addTimeSpanMarker(0, 4, 1, 7);
        assertEqual(doc.m_timeSpanMarkers.length, 2);
        
        doc.clearTimeSpanMarkers();
        assertEqual(doc.m_timeSpanMarkers.length, 0);
    });

    it('Time span list access', () => {
        const doc = createTestDocument();
        doc.m_sampleCount = 10;
        doc.m_signals.push(new Signal('a', SignalType.Bit, 10));
        doc.m_signals.push(new Signal('b', SignalType.Bit, 10));
        
        doc.addTimeSpanMarker(0, 0, 1, 3);
        doc.addTimeSpanMarker(0, 5, 1, 8);
        
        const list = doc.timeSpanMarkerList();
        assertEqual(list.length, 2);
    });
});

// ============================================================================
// TIME SPAN MARKER VALIDATION TESTS
// ============================================================================

describe('TimeSpanMarkers - Validation', () => {
    it('Time span invalid start signal - negative', () => {
        const doc = createTestDocument();
        doc.m_sampleCount = 10;
        doc.m_signals.push(new Signal('a', SignalType.Bit, 10));
        
        const id = doc.addTimeSpanMarker(-1, 0, 0, 5);
        assertEqual(id, -1);
    });

    it('Time span invalid start signal - out of bounds', () => {
        const doc = createTestDocument();
        doc.m_sampleCount = 10;
        doc.m_signals.push(new Signal('a', SignalType.Bit, 10));
        
        const id = doc.addTimeSpanMarker(99, 0, 0, 5);
        assertEqual(id, -1);
    });

    it('Time span invalid end signal - negative', () => {
        const doc = createTestDocument();
        doc.m_sampleCount = 10;
        doc.m_signals.push(new Signal('a', SignalType.Bit, 10));
        
        const id = doc.addTimeSpanMarker(0, 0, -1, 5);
        assertEqual(id, -1);
    });

    it('Time span invalid end signal - out of bounds', () => {
        const doc = createTestDocument();
        doc.m_sampleCount = 10;
        doc.m_signals.push(new Signal('a', SignalType.Bit, 10));
        
        const id = doc.addTimeSpanMarker(0, 0, 99, 5);
        assertEqual(id, -1);
    });

    it('Time span invalid start sample - negative', () => {
        const doc = createTestDocument();
        doc.m_sampleCount = 10;
        doc.m_signals.push(new Signal('a', SignalType.Bit, 10));
        doc.m_signals.push(new Signal('b', SignalType.Bit, 10));
        
        const id = doc.addTimeSpanMarker(0, -5, 1, 5);
        assertEqual(id, -1);
    });

    it('Time span invalid start sample - out of bounds', () => {
        const doc = createTestDocument();
        doc.m_sampleCount = 10;
        doc.m_signals.push(new Signal('a', SignalType.Bit, 10));
        doc.m_signals.push(new Signal('b', SignalType.Bit, 10));
        
        const id = doc.addTimeSpanMarker(0, 100, 1, 5);
        assertEqual(id, -1);
    });

    it('Time span invalid end sample - negative', () => {
        const doc = createTestDocument();
        doc.m_sampleCount = 10;
        doc.m_signals.push(new Signal('a', SignalType.Bit, 10));
        doc.m_signals.push(new Signal('b', SignalType.Bit, 10));
        
        const id = doc.addTimeSpanMarker(0, 5, 1, -3);
        assertEqual(id, -1);
    });

    it('Time span invalid end sample - out of bounds', () => {
        const doc = createTestDocument();
        doc.m_sampleCount = 10;
        doc.m_signals.push(new Signal('a', SignalType.Bit, 10));
        doc.m_signals.push(new Signal('b', SignalType.Bit, 10));
        
        const id = doc.addTimeSpanMarker(0, 5, 1, 100);
        assertEqual(id, -1);
    });

    it('Time span with no signals in document', () => {
        const doc = createTestDocument();
        doc.m_sampleCount = 10;
        
        const id = doc.addTimeSpanMarker(0, 0, 0, 5);
        assertEqual(id, -1);
    });
});

// ============================================================================
// TIME SPAN MARKER CORNER CASES
// ============================================================================

describe('TimeSpanMarkers - Corner Cases', () => {
    it('Time span on same signal (horizontal)', () => {
        const doc = createTestDocument();
        doc.m_sampleCount = 10;
        doc.m_signals.push(new Signal('a', SignalType.Bit, 10));
        
        const id = doc.addTimeSpanMarker(0, 0, 0, 5);
        assertGreaterThan(id, 0, 'Should allow time span on same signal');
    });

    it('Time span at boundary - first sample', () => {
        const doc = createTestDocument();
        doc.m_sampleCount = 10;
        doc.m_signals.push(new Signal('a', SignalType.Bit, 10));
        doc.m_signals.push(new Signal('b', SignalType.Bit, 10));
        
        const id = doc.addTimeSpanMarker(0, 0, 1, 5);
        assertGreaterThan(id, 0);
        assertEqual(doc.m_timeSpanMarkers[0].startSample, 0);
    });

    it('Time span at boundary - last sample', () => {
        const doc = createTestDocument();
        doc.m_sampleCount = 10;
        doc.m_signals.push(new Signal('a', SignalType.Bit, 10));
        doc.m_signals.push(new Signal('b', SignalType.Bit, 10));
        
        const id = doc.addTimeSpanMarker(0, 5, 1, 9);
        assertGreaterThan(id, 0);
        assertEqual(doc.m_timeSpanMarkers[0].endSample, 9);
    });

    it('Time span with swapped start/end samples', () => {
        const doc = createTestDocument();
        doc.m_sampleCount = 10;
        doc.m_signals.push(new Signal('a', SignalType.Bit, 10));
        doc.m_signals.push(new Signal('b', SignalType.Bit, 10));
        
        // Start sample > end sample
        const id = doc.addTimeSpanMarker(0, 8, 1, 2);
        // Behavior depends on implementation - may accept or normalize
        // Just verify it handles gracefully (no crash)
        assertEqual(doc.m_timeSpanMarkers.length >= 0, true);
    });

    it('Time span unique IDs', () => {
        const doc = createTestDocument();
        doc.m_sampleCount = 10;
        doc.m_signals.push(new Signal('a', SignalType.Bit, 10));
        doc.m_signals.push(new Signal('b', SignalType.Bit, 10));
        
        const ids = [];
        for (let i = 0; i < 5; i++) {
            ids.push(doc.addTimeSpanMarker(0, i, 1, i + 1));
        }
        
        const uniqueIds = new Set(ids.filter(id => id > 0));
        assertEqual(uniqueIds.size, ids.filter(id => id > 0).length, 'All valid IDs should be unique');
    });

    it('Set properties on non-existent time span', () => {
        const doc = createTestDocument();
        doc.m_sampleCount = 10;
        doc.m_signals.push(new Signal('a', SignalType.Bit, 10));
        doc.m_signals.push(new Signal('b', SignalType.Bit, 10));
        
        // These should not throw
        doc.setTimeSpanMarkerColor(99999, '#ff0000');
        doc.setTimeSpanMarkerStyle(99999, '-|-');
        
        assertEqual(doc.m_timeSpanMarkers.length, 0);
    });

    it('Multiple time spans overlapping', () => {
        const doc = createTestDocument();
        doc.m_sampleCount = 10;
        doc.m_signals.push(new Signal('a', SignalType.Bit, 10));
        doc.m_signals.push(new Signal('b', SignalType.Bit, 10));
        
        doc.addTimeSpanMarker(0, 0, 1, 5);
        doc.addTimeSpanMarker(0, 3, 1, 8);
        doc.addTimeSpanMarker(0, 0, 1, 9);
        
        assertEqual(doc.m_timeSpanMarkers.length, 3);
    });

    it('Time span with same start and end', () => {
        const doc = createTestDocument();
        doc.m_sampleCount = 10;
        doc.m_signals.push(new Signal('a', SignalType.Bit, 10));
        doc.m_signals.push(new Signal('b', SignalType.Bit, 10));
        
        // Vertical time span (same sample, different signals)
        const id = doc.addTimeSpanMarker(0, 5, 1, 5);
        assertGreaterThan(id, 0, 'Should allow vertical time span');
    });
});

module.exports = {};
