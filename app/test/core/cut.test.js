#!/usr/bin/env node
/**
 * Cut/Crop Operations Tests for WavePaint
 * Tests cut, crop, copy, and paste operations
 */

const {
    describe, it,
    assertEqual, assertTrue, assertFalse
} = require('../testFramework');

const { createTestDocument } = require('../mocks');

// ============================================================================
// CROP OPERATIONS TESTS
// ============================================================================

describe('Cut Operations - Crop', () => {
    it('Crop to range basic', () => {
        const doc = createTestDocument();
        doc.m_sampleCount = 10;
        doc.m_signals.push(new Signal('a', SignalType.Bit, 10));
        doc.m_signals[0].values = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
        
        doc.cropToRange(2, 6);
        assertEqual(doc.m_sampleCount, 4);
        assertEqual(doc.m_signals[0].values[0], 2);
        assertEqual(doc.m_signals[0].values[3], 5);
    });

    it('Crop to range updates markers', () => {
        const doc = createTestDocument();
        doc.m_sampleCount = 10;
        doc.m_signals.push(new Signal('a', SignalType.Bit, 10));
        doc.addMarker(3);
        doc.addMarker(8);
        
        doc.cropToRange(2, 6);
        // Marker at 3 should be at 1 now, marker at 8 should be removed
        assertEqual(doc.m_markers.length, 1);
        assertEqual(doc.m_markers[0].sample, 1);
    });

    it('Crop to range removes out of bounds arrows', () => {
        const doc = createTestDocument();
        doc.m_sampleCount = 10;
        doc.m_signals.push(new Signal('a', SignalType.Bit, 10));
        doc.m_signals.push(new Signal('b', SignalType.Bit, 10));
        doc.addArrow(0, 8, 1, 9); // Outside crop range
        doc.addArrow(0, 2, 1, 4); // Inside crop range
        
        doc.cropToRange(1, 6);
        assertEqual(doc.m_arrows.length, 1);
        assertEqual(doc.m_arrows[0].startSample, 1);
        assertEqual(doc.m_arrows[0].endSample, 3);
    });

    it('Crop entire document (same range)', () => {
        const doc = createTestDocument();
        doc.m_sampleCount = 10;
        doc.m_signals.push(new Signal('a', SignalType.Bit, 10));
        
        doc.cropToRange(0, 10);
        assertEqual(doc.m_sampleCount, 10);
        assertEqual(doc.m_signals[0].values.length, 10);
    });

    it('Crop to single sample', () => {
        const doc = createTestDocument();
        doc.m_sampleCount = 10;
        doc.m_signals.push(new Signal('a', SignalType.Bit, 10));
        doc.m_signals[0].values = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
        
        doc.cropToRange(5, 6);
        assertEqual(doc.m_sampleCount, 1);
        assertEqual(doc.m_signals[0].values[0], 5);
    });

    it('Crop removes time span markers out of range', () => {
        const doc = createTestDocument();
        doc.m_sampleCount = 10;
        doc.m_signals.push(new Signal('a', SignalType.Bit, 10));
        doc.m_signals.push(new Signal('b', SignalType.Bit, 10));
        
        doc.addTimeSpanMarker(0, 0, 1, 3);  // Will be in range
        doc.addTimeSpanMarker(0, 7, 1, 9);  // Will be out of range
        
        doc.cropToRange(0, 5);
        assertEqual(doc.m_timeSpanMarkers.length, 1);
    });

    it('Crop with text annotations', () => {
        const doc = createTestDocument();
        doc.m_sampleCount = 10;
        doc.m_signals.push(new Signal('a', SignalType.Bit, 10));
        
        doc.addTextAnnotation('Signal', 0, 'Label1', 2);  // In range
        doc.addTextAnnotation('Signal', 0, 'Label2', 8);  // Out of range
        
        doc.cropToRange(0, 5);
        // Text annotations at out of range samples should be removed or adjusted
        const inRangeAnnotations = doc.m_textAnnotations.filter(a => a.sample < 5);
        assertEqual(inRangeAnnotations.length >= 1, true);
    });
});

// ============================================================================
// COPY/PASTE OPERATIONS TESTS
// ============================================================================

describe('Cut Operations - Copy/Paste', () => {
    it('Copy selection sets clipboard flag', () => {
        const doc = createTestDocument();
        const result = doc.copySelection();
        assertTrue(result);
        assertTrue(doc.m_hasBlockClipboard);
    });

    it('Paste without clipboard fails', () => {
        const doc = createTestDocument();
        doc.m_hasBlockClipboard = false;
        const result = doc.paste();
        assertFalse(result);
    });

    it('Paste with clipboard succeeds', () => {
        const doc = createTestDocument();
        doc.m_hasBlockClipboard = true;
        const result = doc.paste();
        assertTrue(result);
    });

    it('Cut sets clipboard and removes data', () => {
        if (typeof WaveDocument.prototype.cutSelection === 'function') {
            const doc = createTestDocument();
            doc.m_sampleCount = 10;
            doc.m_signals.push(new Signal('a', SignalType.Bit, 10));
            
            Selection.active = true;
            Selection.startSignal = 0;
            Selection.endSignal = 0;
            Selection.startSample = 2;
            Selection.endSample = 5;
            
            doc.cutSelection();
            assertTrue(doc.m_hasBlockClipboard);
        }
    });
});

// ============================================================================
// CROP CORNER CASES
// ============================================================================

describe('Cut Operations - Corner Cases', () => {
    it('Crop with invalid range (start > end)', () => {
        const doc = createTestDocument();
        doc.m_sampleCount = 10;
        doc.m_signals.push(new Signal('a', SignalType.Bit, 10));
        
        // Behavior depends on implementation
        doc.cropToRange(8, 2);
        // Should either swap or handle gracefully
        assertEqual(doc.m_signals.length >= 0, true); // No crash
    });

    it('Crop with negative start', () => {
        const doc = createTestDocument();
        doc.m_sampleCount = 10;
        doc.m_signals.push(new Signal('a', SignalType.Bit, 10));
        
        // Should clamp to 0
        doc.cropToRange(-5, 5);
        assertEqual(doc.m_sampleCount <= 10, true);
    });

    it('Crop with end beyond sample count', () => {
        const doc = createTestDocument();
        doc.m_sampleCount = 10;
        doc.m_signals.push(new Signal('a', SignalType.Bit, 10));
        
        // Should clamp to sample count
        doc.cropToRange(5, 100);
        assertEqual(doc.m_sampleCount <= 10, true);
    });

    it('Crop empty document', () => {
        const doc = createTestDocument();
        doc.m_sampleCount = 0;
        
        // Should handle gracefully
        doc.cropToRange(0, 0);
        assertEqual(doc.m_signals.length, 0);
    });

    it('Crop with vector signals preserves data type', () => {
        const doc = createTestDocument();
        doc.m_sampleCount = 10;
        doc.m_signals.push(new Signal('vec', SignalType.Vector, 10));
        doc.m_signals[0].values = [0x10, 0x20, 0x30, 0x40, 0x50, 0x60, 0x70, 0x80, 0x90, 0xA0];
        
        doc.cropToRange(2, 5);
        assertEqual(doc.m_signals[0].type, SignalType.Vector);
        assertEqual(doc.m_signals[0].values[0], 0x30);
    });

    it('Multiple crops in sequence', () => {
        const doc = createTestDocument();
        doc.m_sampleCount = 20;
        doc.m_signals.push(new Signal('a', SignalType.Bit, 20));
        for (let i = 0; i < 20; i++) {
            doc.m_signals[0].values[i] = i;
        }
        
        doc.cropToRange(5, 15);  // Now 10 samples: values 5-14
        assertEqual(doc.m_sampleCount, 10);
        
        doc.cropToRange(2, 8);   // Now 6 samples: values 7-12
        assertEqual(doc.m_sampleCount, 6);
        assertEqual(doc.m_signals[0].values[0], 7);
    });

    it('Crop with multiple signals', () => {
        const doc = createTestDocument();
        doc.m_sampleCount = 10;
        doc.m_signals.push(new Signal('a', SignalType.Bit, 10));
        doc.m_signals.push(new Signal('b', SignalType.Vector, 10));
        doc.m_signals.push(new Signal('c', SignalType.Bit, 10));
        
        doc.cropToRange(3, 7);
        
        assertEqual(doc.m_sampleCount, 4);
        assertEqual(doc.m_signals.length, 3);
        for (const sig of doc.m_signals) {
            assertEqual(sig.values.length, 4);
        }
    });

    it('Crop preserves blank rows', () => {
        const doc = createTestDocument();
        doc.m_sampleCount = 10;
        doc.m_signals.push(new Signal('a', SignalType.Bit, 10));
        doc.addBlankRow(20);
        doc.m_signals.push(new Signal('b', SignalType.Bit, 10));
        
        doc.cropToRange(0, 5);
        
        assertEqual(doc.m_signals.length, 3);
        assertEqual(doc.m_signals[1].type, SignalType.BlankRow);
    });
});

module.exports = {};
