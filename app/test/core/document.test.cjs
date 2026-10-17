#!/usr/bin/env node
/**
 * Document Tests for WavePaint
 * Tests WaveDocument core functionality
 */

const {
    describe, it,
    assertEqual, assertNotNull, assertArray, assertGreaterThan
} = require('../testFramework.cjs');

const { createTestDocument } = require('../mocks.cjs');

// ============================================================================
// DOCUMENT TESTS
// ============================================================================

describe('WaveDocument', () => {
    it('Create empty WaveDocument', () => {
        const doc = new WaveDocument();
        assertNotNull(doc);
        assertEqual(doc.sampleCount(), 20, 'Default sample count should be 20');
        assertEqual(doc.subStepCount(), 0, 'Default substep count should be 0');
        assertArray(doc.signalList());
        assertEqual(doc.signalList().length, 0, 'Should start with no signals');
    });

    it('Set sample count', () => {
        const doc = createTestDocument();
        doc.setSampleCount(50);
        assertEqual(doc.sampleCount(), 50);
        assertEqual(doc.effectiveSampleCount(), 50);
    });

    it('Set substep count', () => {
        const doc = createTestDocument();
        doc.setSampleCount(10);
        doc.setSubStepCount(2);
        assertEqual(doc.subStepCount(), 2);
        assertEqual(doc.effectiveSampleCount(), 30); // 10 * (2+1)
    });

    it('Effective sample count calculation', () => {
        const doc = createTestDocument();
        doc.m_sampleCount = 8;
        doc.m_subStepCount = 3;
        assertEqual(doc.effectiveSampleCount(), 32); // 8 * 4
    });

    it('Full document workflow', () => {
        const doc = createTestDocument();
        
        doc.setSampleCount(16);
        
        doc.m_signals.push(new Signal('clk', SignalType.Bit, 16));
        doc.m_signals.push(new Signal('data', SignalType.Vector, 16));
        doc.m_signals.push(new Signal('valid', SignalType.Bit, 16));
        
        assertEqual(doc.signalList().length, 3);
        
        const arrowId = doc.addArrow(0, 4, 1, 6, '~>');
        assertGreaterThan(arrowId, 0);
        
        const markerId = doc.addMarker(8);
        assertGreaterThan(markerId, 0);
        
        assertEqual(doc.m_arrows.length, 1);
        assertEqual(doc.m_markers.length, 1);
        
        doc.removeSignal(1);
        assertEqual(doc.signalList().length, 2);
        assertEqual(doc.signalList()[0].name, 'clk');
        assertEqual(doc.signalList()[1].name, 'valid');
    });

    // Corner cases
    it('Set sample count to zero', () => {
        const doc = createTestDocument();
        doc.setSampleCount(0);
        assertEqual(doc.sampleCount(), 0);
        assertEqual(doc.effectiveSampleCount(), 0);
    });

    it('Set sample count with signals - resizes arrays', () => {
        const doc = createTestDocument();
        doc.m_sampleCount = 5;
        doc.m_signals.push(new Signal('test', SignalType.Bit, 5));
        assertEqual(doc.m_signals[0].values.length, 5);
        
        doc.setSampleCount(10);
        assertEqual(doc.m_signals[0].values.length, 10);
    });

    it('Set substep count negative clamped to zero', () => {
        const doc = createTestDocument();
        doc.setSubStepCount(-5);
        assertEqual(doc.subStepCount(), 0);
    });

    it('Set substep count updates markers positions', () => {
        const doc = createTestDocument();
        doc.m_sampleCount = 5;
        doc.m_subStepCount = 0;
        doc.addMarker(2);
        
        doc.setSubStepCount(1);
        assertGreaterThan(doc.m_markers.length, 0);
    });

    it('Value to label hex', () => {
        const doc = createTestDocument();
        assertEqual(doc.valueToLabel(255, Radix.Hexadecimal), '0xFF');
        assertEqual(doc.valueToLabel(0, Radix.Hexadecimal), '0x0');
    });

    it('Value to label decimal', () => {
        const doc = createTestDocument();
        assertEqual(doc.valueToLabel(255, Radix.Decimal), '255');
        assertEqual(doc.valueToLabel(0, Radix.Decimal), '0');
    });

    it('Value to label binary', () => {
        const doc = createTestDocument();
        assertEqual(doc.valueToLabel(5, Radix.Binary), '0b101');
        assertEqual(doc.valueToLabel(0, Radix.Binary), '0b0');
    });

    it('Value to label undefined returns X', () => {
        const doc = createTestDocument();
        assertEqual(doc.valueToLabel(-1, Radix.Hexadecimal), 'X');
    });
});

module.exports = {};
