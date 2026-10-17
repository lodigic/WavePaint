#!/usr/bin/env node
/**
 * Arrow Tests for WavePaint
 * Tests arrow creation, styles, and manipulation
 */

const {
    describe, it,
    assertEqual, assertGreaterThan
} = require('../testFramework');

const { createTestDocument } = require('../mocks');

// ============================================================================
// ARROW TESTS
// ============================================================================

describe('Arrows', () => {
    it('Add arrow', () => {
        const doc = createTestDocument();
        doc.m_sampleCount = 10;
        doc.m_signals.push(new Signal('sig1', SignalType.Bit, 10));
        doc.m_signals.push(new Signal('sig2', SignalType.Bit, 10));
        
        const id = doc.addArrow(0, 2, 1, 5, '~>');
        assertGreaterThan(id, 0, 'Arrow id should be positive');
        assertEqual(doc.m_arrows.length, 1);
        assertEqual(doc.m_arrows[0].style, '~>');
    });

    it('Arrow styles - spline', () => {
        const doc = createTestDocument();
        doc.m_sampleCount = 10;
        doc.m_signals.push(new Signal('a', SignalType.Bit, 10));
        doc.m_signals.push(new Signal('b', SignalType.Bit, 10));
        
        const styles = ['~', '~>', '<~>', '-~', '~-', '-~>'];
        for (const style of styles) {
            const id = doc.addArrow(0, 0, 1, 5, style);
            assertGreaterThan(id, 0, `Failed for style ${style}`);
        }
        assertEqual(doc.m_arrows.length, styles.length);
    });

    it('Arrow styles - sharp', () => {
        const doc = createTestDocument();
        doc.m_sampleCount = 10;
        doc.m_signals.push(new Signal('a', SignalType.Bit, 10));
        doc.m_signals.push(new Signal('b', SignalType.Bit, 10));
        
        const styles = ['-|', '|-', '-|-', '-|>', '|->', '-|->'];
        for (const style of styles) {
            const id = doc.addArrow(0, 0, 1, 5, style);
            assertGreaterThan(id, 0, `Failed for style ${style}`);
        }
    });

    it('Arrow styles - straight', () => {
        const doc = createTestDocument();
        doc.m_sampleCount = 10;
        doc.m_signals.push(new Signal('a', SignalType.Bit, 10));
        doc.m_signals.push(new Signal('b', SignalType.Bit, 10));
        
        const id1 = doc.addArrow(0, 0, 1, 5, '-');
        const id2 = doc.addArrow(0, 0, 1, 5, '->');
        const id3 = doc.addArrow(0, 0, 1, 5, '<->');
        assertGreaterThan(id1, 0);
        assertGreaterThan(id2, 0);
        assertGreaterThan(id3, 0);
    });

    it('Remove arrow', () => {
        const doc = createTestDocument();
        doc.updateTextAnnotationsAfterArrowRemove = () => {};
        doc.m_sampleCount = 10;
        doc.m_signals.push(new Signal('a', SignalType.Bit, 10));
        doc.m_signals.push(new Signal('b', SignalType.Bit, 10));
        
        const id = doc.addArrow(0, 0, 1, 5);
        assertEqual(doc.m_arrows.length, 1);
        doc.subArrowById(id);
        assertEqual(doc.m_arrows.length, 0);
    });

    it('Arrow invalid signal index - negative', () => {
        const doc = createTestDocument();
        doc.m_sampleCount = 10;
        doc.m_signals.push(new Signal('a', SignalType.Bit, 10));
        
        const id = doc.addArrow(-1, 0, 0, 5);
        assertEqual(id, -1, 'Should reject negative signal index');
    });

    it('Arrow invalid signal index - out of bounds', () => {
        const doc = createTestDocument();
        doc.m_sampleCount = 10;
        doc.m_signals.push(new Signal('a', SignalType.Bit, 10));
        
        const id = doc.addArrow(0, 0, 99, 5);
        assertEqual(id, -1, 'Should reject out of bounds signal index');
    });

    it('Arrow to blank row allowed', () => {
        const doc = createTestDocument();
        doc.m_sampleCount = 10;
        doc.m_signals.push(new Signal('a', SignalType.Bit, 10));
        doc.m_signals.push(new Signal('', SignalType.BlankRow, 10));
        
        const id = doc.addArrow(0, 0, 1, 5);
        assertGreaterThan(id, 0, 'Should allow arrow to blank row');
    });

    it('Arrow invalid sample - negative', () => {
        const doc = createTestDocument();
        doc.m_sampleCount = 10;
        doc.m_signals.push(new Signal('a', SignalType.Bit, 10));
        doc.m_signals.push(new Signal('b', SignalType.Bit, 10));
        
        const id = doc.addArrow(0, -5, 1, 5);
        assertEqual(id, -1);
    });

    it('Arrow invalid sample - out of bounds', () => {
        const doc = createTestDocument();
        doc.m_sampleCount = 10;
        doc.m_signals.push(new Signal('a', SignalType.Bit, 10));
        doc.m_signals.push(new Signal('b', SignalType.Bit, 10));
        
        const id = doc.addArrow(0, 0, 1, 100);
        assertEqual(id, -1);
    });

    it('Arrow color setting', () => {
        const doc = createTestDocument();
        doc.m_sampleCount = 10;
        doc.m_signals.push(new Signal('a', SignalType.Bit, 10));
        doc.m_signals.push(new Signal('b', SignalType.Bit, 10));
        
        const id = doc.addArrow(0, 0, 1, 5);
        doc.setArrowColorById(id, '#ff0000');
        assertEqual(doc.m_arrows[0].color, '#ff0000');
    });

    it('Arrow style setting', () => {
        const doc = createTestDocument();
        doc.m_sampleCount = 10;
        doc.m_signals.push(new Signal('a', SignalType.Bit, 10));
        doc.m_signals.push(new Signal('b', SignalType.Bit, 10));
        
        const id = doc.addArrow(0, 0, 1, 5, '~>');
        doc.setArrowStyleById(id, '->');
        assertEqual(doc.m_arrows[0].style, '->');
    });

    it('Clear all arrows', () => {
        const doc = createTestDocument();
        doc.m_sampleCount = 10;
        doc.m_signals.push(new Signal('a', SignalType.Bit, 10));
        doc.m_signals.push(new Signal('b', SignalType.Bit, 10));
        
        doc.addArrow(0, 0, 1, 3);
        doc.addArrow(0, 2, 1, 5);
        doc.addArrow(0, 4, 1, 7);
        assertEqual(doc.m_arrows.length, 3);
        
        doc.clearArrows();
        assertEqual(doc.m_arrows.length, 0);
    });

    it('Arrow list access', () => {
        const doc = createTestDocument();
        doc.m_sampleCount = 10;
        doc.m_signals.push(new Signal('a', SignalType.Bit, 10));
        doc.m_signals.push(new Signal('b', SignalType.Bit, 10));
        
        doc.addArrow(0, 0, 1, 5);
        doc.addArrow(0, 2, 1, 7);
        
        const list = doc.arrowList();
        assertEqual(list.length, 2);
    });

    it('Arrow between same signal (self-reference)', () => {
        const doc = createTestDocument();
        doc.m_sampleCount = 10;
        doc.m_signals.push(new Signal('a', SignalType.Bit, 10));
        
        const id = doc.addArrow(0, 0, 0, 5);
        assertGreaterThan(id, 0, 'Should allow arrow on same signal');
    });

    it('Arrow with same start and end sample', () => {
        const doc = createTestDocument();
        doc.m_sampleCount = 10;
        doc.m_signals.push(new Signal('a', SignalType.Bit, 10));
        doc.m_signals.push(new Signal('b', SignalType.Bit, 10));
        
        const id = doc.addArrow(0, 5, 1, 5);
        assertGreaterThan(id, 0, 'Should allow vertical arrow');
    });
});

module.exports = {};
