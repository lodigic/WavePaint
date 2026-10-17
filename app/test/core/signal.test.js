#!/usr/bin/env node
/**
 * Signal Tests for WavePaint
 * Tests Signal class and signal manipulation
 */

const {
    describe, it,
    assertEqual, assertNotNull, assertTrue, assertFalse, assertGreaterThan
} = require('../testFramework');

const { createTestDocument } = require('../mocks');

// ============================================================================
// SIGNAL CLASS TESTS
// ============================================================================

describe('Signal Class', () => {
    it('Create bit signal', () => {
        const sig = new Signal('clk', SignalType.Bit, 10);
        assertEqual(sig.name, 'clk');
        assertEqual(sig.type, SignalType.Bit);
        assertEqual(sig.values.length, 10);
        assertEqual(sig.labels.length, 10);
    });

    it('Create vector signal', () => {
        const sig = new Signal('data', SignalType.Vector, 8);
        assertEqual(sig.type, SignalType.Vector);
        assertEqual(sig.values.length, 8);
        assertEqual(sig.radix, Radix.Hexadecimal);
    });

    it('Create blank row', () => {
        const sig = new Signal('', SignalType.BlankRow, 4);
        assertEqual(sig.type, SignalType.BlankRow);
    });

    it('Signal default values', () => {
        const sig = new Signal();
        assertEqual(sig.name, '');
        assertEqual(sig.type, SignalType.Bit);
        assertEqual(sig.color, null);
        assertEqual(sig.riseTime, 0.0);
        assertEqual(sig.fallTime, 0.0);
        assertEqual(sig.edgeArrow, 'none');
    });

    it('Signal WaveDrom metadata', () => {
        const sig = new Signal('test', SignalType.Bit, 4);
        sig.waveDromPeriod = 2;
        sig.waveDromPhase = 0.5;
        sig.waveDromWave = '01010101';
        assertEqual(sig.waveDromPeriod, 2);
        assertEqual(sig.waveDromPhase, 0.5);
        assertEqual(sig.waveDromWave, '01010101');
    });

    it('SegmentStyle creation', () => {
        const style = new SegmentStyle('#ff0000', true, '#00ff00');
        assertEqual(style.color, '#ff0000');
        assertEqual(style.hatched, true);
        assertEqual(style.fill, '#00ff00');
        assertFalse(style.isDefault());
    });

    it('SegmentStyle default detection', () => {
        const style = new SegmentStyle();
        assertTrue(style.isDefault());
    });

    it('SignalType enum values', () => {
        assertEqual(SignalType.Bit, 0);
        assertEqual(SignalType.Vector, 1);
        assertEqual(SignalType.BlankRow, 2);
    });

    it('Radix enum values', () => {
        assertEqual(Radix.Hexadecimal, 0);
        assertEqual(Radix.Decimal, 1);
        assertEqual(Radix.Binary, 2);
    });

    // Corner cases
    it('Signal with zero samples', () => {
        const sig = new Signal('empty', SignalType.Bit, 0);
        assertEqual(sig.values.length, 0);
        assertEqual(sig.labels.length, 0);
    });

    it('Signal group properties', () => {
        const sig = new Signal('test', SignalType.Bit, 5);
        assertEqual(sig.groupName, null);
        assertEqual(sig.groupColor, null);
        sig.groupName = 'TestGroup';
        sig.groupColor = '#ff0000';
        assertEqual(sig.groupName, 'TestGroup');
        assertEqual(sig.groupColor, '#ff0000');
    });
});

// ============================================================================
// SIGNAL MANIPULATION TESTS
// ============================================================================

describe('Signal Manipulation', () => {
    it('Add signal to document', () => {
        const doc = createTestDocument();
        const sig = new Signal('test', SignalType.Bit, doc.effectiveSampleCount());
        doc.m_signals.push(sig);
        assertEqual(doc.signalList().length, 1);
        assertEqual(doc.signalList()[0].name, 'test');
    });

    it('Remove signal from document', () => {
        const doc = createTestDocument();
        doc.m_signals.push(new Signal('sig1', SignalType.Bit, 10));
        doc.m_signals.push(new Signal('sig2', SignalType.Bit, 10));
        doc.m_signals.push(new Signal('sig3', SignalType.Bit, 10));
        assertEqual(doc.signalList().length, 3);
        doc.removeSignal(1);
        assertEqual(doc.signalList().length, 2);
        assertEqual(doc.signalList()[0].name, 'sig1');
        assertEqual(doc.signalList()[1].name, 'sig3');
    });

    it('Remove signal - invalid index does nothing', () => {
        const doc = createTestDocument();
        doc.m_signals.push(new Signal('test', SignalType.Bit, 10));
        doc.removeSignal(-1);
        doc.removeSignal(100);
        assertEqual(doc.signalList().length, 1);
    });

    it('Move signal', () => {
        const doc = createTestDocument();
        doc.m_signals.push(new Signal('A', SignalType.Bit, 10));
        doc.m_signals.push(new Signal('B', SignalType.Bit, 10));
        doc.m_signals.push(new Signal('C', SignalType.Bit, 10));
        doc.moveSignal(0, 2);
        assertEqual(doc.signalList()[0].name, 'B');
        assertEqual(doc.signalList()[1].name, 'C');
        assertEqual(doc.signalList()[2].name, 'A');
    });

    it('Add bit signal via method', () => {
        const doc = createTestDocument();
        doc.m_sampleCount = 10;
        
        const idx = doc.addBitSignal('CLK');
        assertEqual(idx, 0);
        assertEqual(doc.m_signals.length, 1);
        assertEqual(doc.m_signals[0].name, 'CLK');
        assertEqual(doc.m_signals[0].type, SignalType.Bit);
    });

    it('Add vector signal via method', () => {
        const doc = createTestDocument();
        doc.m_sampleCount = 10;
        
        const idx = doc.addVectorSignal('DATA');
        assertEqual(idx, 0);
        assertEqual(doc.m_signals[0].type, SignalType.Vector);
    });

    it('Add blank row', () => {
        const doc = createTestDocument();
        doc.m_sampleCount = 10;
        doc.m_signals.push(new Signal('a', SignalType.Bit, 10));
        
        const idx = doc.addBlankRow(20);
        assertEqual(idx, 1);
        assertEqual(doc.m_signals[1].type, SignalType.BlankRow);
        assertEqual(doc.m_signals[1].uiRowHeightHint, 20);
    });

    it('Insert blank row at specific index', () => {
        const doc = createTestDocument();
        doc.m_sampleCount = 10;
        doc.m_signals.push(new Signal('a', SignalType.Bit, 10));
        doc.m_signals.push(new Signal('b', SignalType.Bit, 10));
        
        doc.insertBlankRow(1, 15);
        assertEqual(doc.m_signals.length, 3);
        assertEqual(doc.m_signals[1].type, SignalType.BlankRow);
        assertEqual(doc.m_signals[2].name, 'b');
    });

    it('Add clock signal', () => {
        const doc = createTestDocument();
        doc.m_sampleCount = 10;
        
        const idx = doc.addClockSignal('CLK', 5, 1, 1);
        assertEqual(idx, 0);
        assertTrue(doc.m_signals[0].isClockPattern);
        assertEqual(doc.m_signals[0].values[0], 0);
        assertEqual(doc.m_signals[0].values[1], 1);
    });

    it('Add reset signal active high', () => {
        const doc = createTestDocument();
        doc.m_sampleCount = 10;
        
        doc.addResetSignal('RST', 3, true);
        assertEqual(doc.m_signals[0].values[0], 1);
        assertEqual(doc.m_signals[0].values[2], 1);
        assertEqual(doc.m_signals[0].values[3], 0);
    });

    it('Add reset signal active low', () => {
        const doc = createTestDocument();
        doc.m_sampleCount = 10;
        
        doc.addResetSignal('RST_N', 2, false);
        assertEqual(doc.m_signals[0].values[0], 0);
        assertEqual(doc.m_signals[0].values[1], 0);
        assertEqual(doc.m_signals[0].values[2], 1);
    });

    it('Add pulse signal', () => {
        const doc = createTestDocument();
        doc.m_sampleCount = 10;
        
        doc.addPulseSignal('PULSE', 3, 2);
        assertEqual(doc.m_signals[0].values[2], 0);
        assertEqual(doc.m_signals[0].values[3], 1);
        assertEqual(doc.m_signals[0].values[4], 1);
        assertEqual(doc.m_signals[0].values[5], 0);
    });

    it('Remove signal updates arrow indices', () => {
        const doc = createTestDocument();
        doc.m_sampleCount = 10;
        doc.m_signals.push(new Signal('a', SignalType.Bit, 10));
        doc.m_signals.push(new Signal('b', SignalType.Bit, 10));
        doc.m_signals.push(new Signal('c', SignalType.Bit, 10));
        
        doc.addArrow(1, 0, 2, 5);
        assertEqual(doc.m_arrows[0].startSignal, 1);
        assertEqual(doc.m_arrows[0].endSignal, 2);
        
        doc.removeSignal(0);
        assertEqual(doc.m_arrows[0].startSignal, 0);
        assertEqual(doc.m_arrows[0].endSignal, 1);
    });

    it('Remove signal removes connected arrows', () => {
        const doc = createTestDocument();
        doc.m_sampleCount = 10;
        doc.m_signals.push(new Signal('a', SignalType.Bit, 10));
        doc.m_signals.push(new Signal('b', SignalType.Bit, 10));
        
        doc.addArrow(0, 0, 1, 5);
        assertEqual(doc.m_arrows.length, 1);
        
        doc.removeSignal(0);
        assertEqual(doc.m_arrows.length, 0);
    });

    it('Move signal invalid source returns early', () => {
        const doc = createTestDocument();
        doc.m_sampleCount = 10;
        doc.m_signals.push(new Signal('a', SignalType.Bit, 10));
        
        const undoStackBefore = doc.m_undoStack.length;
        doc.moveSignal(-1, 0);
        doc.moveSignal(99, 0);
        
        assertEqual(doc.m_undoStack.length, undoStackBefore);
    });

    it('Move signal same position returns early', () => {
        const doc = createTestDocument();
        doc.m_sampleCount = 10;
        doc.m_signals.push(new Signal('a', SignalType.Bit, 10));
        
        const undoStackBefore = doc.m_undoStack.length;
        doc.moveSignal(0, 0);
        
        assertEqual(doc.m_undoStack.length, undoStackBefore);
    });

    it('Move multiple signals', () => {
        const doc = createTestDocument();
        doc.m_sampleCount = 10;
        doc.m_signals.push(new Signal('a', SignalType.Bit, 10));
        doc.m_signals.push(new Signal('b', SignalType.Bit, 10));
        doc.m_signals.push(new Signal('c', SignalType.Bit, 10));
        doc.m_signals.push(new Signal('d', SignalType.Bit, 10));
        
        const newIndices = doc.moveSignals([0, 1], 2);
        assertEqual(newIndices.length, 2);
    });

    it('Remove multiple signals', () => {
        const doc = createTestDocument();
        doc.m_sampleCount = 10;
        doc.m_signals.push(new Signal('a', SignalType.Bit, 10));
        doc.m_signals.push(new Signal('b', SignalType.Bit, 10));
        doc.m_signals.push(new Signal('c', SignalType.Bit, 10));
        
        doc.removeSignals([0, 2]);
        assertEqual(doc.m_signals.length, 1);
        assertEqual(doc.m_signals[0].name, 'b');
    });

    it('Set signal color', () => {
        const doc = createTestDocument();
        doc.m_sampleCount = 10;
        doc.m_signals.push(new Signal('a', SignalType.Bit, 10));
        
        doc.setSignalColor(0, '#ff0000');
        assertEqual(doc.m_signals[0].color, '#ff0000');
    });

    it('Set signal name', () => {
        const doc = createTestDocument();
        doc.m_sampleCount = 10;
        doc.m_signals.push(new Signal('a', SignalType.Bit, 10));
        
        doc.setSignalName(0, 'NewName');
        assertEqual(doc.m_signals[0].name, 'NewName');
    });

    it('Set signals color (multiple)', () => {
        const doc = createTestDocument();
        doc.m_sampleCount = 10;
        doc.m_signals.push(new Signal('a', SignalType.Bit, 10));
        doc.m_signals.push(new Signal('b', SignalType.Bit, 10));
        
        doc.setSignalsColor([0, 1], '#00ff00');
        assertEqual(doc.m_signals[0].color, '#00ff00');
        assertEqual(doc.m_signals[1].color, '#00ff00');
    });

    it('Set signal rise fall time', () => {
        const doc = createTestDocument();
        doc.m_sampleCount = 10;
        doc.m_signals.push(new Signal('a', SignalType.Bit, 10));
        
        doc.setSignalRiseFallTime(0, 0.5, 0.3);
        assertEqual(doc.m_signals[0].riseTime, 0.5);
        assertEqual(doc.m_signals[0].fallTime, 0.3);
    });

    it('Set segment style', () => {
        const doc = createTestDocument();
        doc.m_sampleCount = 10;
        doc.m_signals.push(new Signal('a', SignalType.Bit, 10));
        
        doc.setSegmentStyle(0, 3, '#ff0000', true);
        assertEqual(doc.m_signals[0].segmentStyles[3].color, '#ff0000');
        assertTrue(doc.m_signals[0].segmentStyles[3].hatched);
    });

    it('Clear segment style', () => {
        const doc = createTestDocument();
        doc.m_sampleCount = 10;
        doc.m_signals.push(new Signal('a', SignalType.Bit, 10));
        
        doc.setSegmentStyle(0, 3, '#ff0000', true);
        doc.clearSegmentStyle(0, 3);
        assertEqual(doc.m_signals[0].segmentStyles[3].color, null);
        assertFalse(doc.m_signals[0].segmentStyles[3].hatched);
    });

    it('Clear all signals', () => {
        const doc = createTestDocument();
        doc.m_sampleCount = 10;
        doc.m_signals.push(new Signal('a', SignalType.Bit, 10));
        doc.m_signals.push(new Signal('b', SignalType.Bit, 10));
        
        doc.clearAllSignals();
        assertEqual(doc.m_signals.length, 0);
    });

    it('Clear all waveview', () => {
        const doc = createTestDocument();
        doc.m_sampleCount = 10;
        doc.m_signals.push(new Signal('a', SignalType.Bit, 10));
        doc.m_signals.push(new Signal('b', SignalType.Bit, 10));
        doc.addMarker(5);
        doc.addArrow(0, 0, 1, 5);
        
        doc.clearAllWaveView();
        assertEqual(doc.m_signals.length, 0);
        assertEqual(doc.m_markers.length, 0);
        assertEqual(doc.m_arrows.length, 0);
    });
});

// ============================================================================
// SIGNAL TYPE UTILITIES TESTS
// ============================================================================

describe('Signal Type Utilities', () => {
    it('isDrawableSignalType - Bit', () => {
        if (typeof isDrawableSignalType === 'function') {
            assertTrue(isDrawableSignalType(SignalType.Bit));
        }
    });

    it('isDrawableSignalType - Vector', () => {
        if (typeof isDrawableSignalType === 'function') {
            assertTrue(isDrawableSignalType(SignalType.Vector));
        }
    });

    it('isDrawableSignalType - BlankRow', () => {
        if (typeof isDrawableSignalType === 'function') {
            assertFalse(isDrawableSignalType(SignalType.BlankRow));
        }
    });

    it('getSignalTypeName', () => {
        if (typeof getSignalTypeName === 'function') {
            assertEqual(getSignalTypeName(SignalType.Bit), 'Bit');
            assertEqual(getSignalTypeName(SignalType.Vector), 'Vector');
            assertEqual(getSignalTypeName(SignalType.BlankRow), 'Blank Row');
        }
    });

    it('getRadixName', () => {
        if (typeof getRadixName === 'function') {
            assertEqual(getRadixName(Radix.Hexadecimal), 'Hex');
            assertEqual(getRadixName(Radix.Decimal), 'Dec');
            assertEqual(getRadixName(Radix.Binary), 'Bin');
        }
    });
});

module.exports = {};
