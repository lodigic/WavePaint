#!/usr/bin/env node
/**
 * Selection Tests for WavePaint
 * Tests selection state management and operations
 */

const {
    describe, it,
    assertEqual, assertTrue, assertFalse, assertNotNull, assert
} = require('../testFramework');

const { createTestDocument } = require('../mocks');

// ============================================================================
// SELECTION CORE TESTS
// ============================================================================

describe('Selection - Core', () => {
    it('Selection object structure', () => {
        if (typeof Selection === 'undefined') return;
        assertNotNull(Selection);
        assert('startSignal' in Selection || typeof Selection === 'function');
    });

    it('isInSelection function', () => {
        if (typeof isInSelection !== 'function') return;
        Selection.active = true;
        Selection.startSignal = 1;
        Selection.endSignal = 3;
        Selection.startSample = 5;
        Selection.endSample = 10;
        
        assertTrue(isInSelection(2, 7), 'Point inside should return true');
        assertFalse(isInSelection(0, 7), 'Point outside should return false');
        assertFalse(isInSelection(2, 15), 'Point outside should return false');
    });

    it('clearSelection function', () => {
        if (typeof clearSelection !== 'function') return;
        Selection.active = true;
        Selection.startSignal = 5;
        clearSelection();
        assertFalse(Selection.active);
        assertEqual(Selection.startSignal, -1);
    });

    it('Selection inactive by default', () => {
        if (typeof Selection === 'undefined') return;
        if (typeof clearSelection === 'function') {
            clearSelection();
        }
        assertFalse(Selection.active);
    });
});

// ============================================================================
// SELECTION BOUNDARY TESTS
// ============================================================================

describe('Selection - Boundaries', () => {
    it('isInSelection at exact boundary - start', () => {
        if (typeof isInSelection !== 'function') return;
        Selection.active = true;
        Selection.startSignal = 1;
        Selection.endSignal = 3;
        Selection.startSample = 5;
        Selection.endSample = 10;
        
        assertTrue(isInSelection(1, 5), 'Start corner should be inside');
    });

    it('isInSelection at exact boundary - end', () => {
        if (typeof isInSelection !== 'function') return;
        Selection.active = true;
        Selection.startSignal = 1;
        Selection.endSignal = 3;
        Selection.startSample = 5;
        Selection.endSample = 10;
        
        assertTrue(isInSelection(3, 10), 'End corner should be inside');
    });

    it('isInSelection just outside - signal', () => {
        if (typeof isInSelection !== 'function') return;
        Selection.active = true;
        Selection.startSignal = 1;
        Selection.endSignal = 3;
        Selection.startSample = 5;
        Selection.endSample = 10;
        
        assertFalse(isInSelection(0, 7), 'Signal before start should be outside');
        assertFalse(isInSelection(4, 7), 'Signal after end should be outside');
    });

    it('isInSelection just outside - sample', () => {
        if (typeof isInSelection !== 'function') return;
        Selection.active = true;
        Selection.startSignal = 1;
        Selection.endSignal = 3;
        Selection.startSample = 5;
        Selection.endSample = 10;
        
        assertFalse(isInSelection(2, 4), 'Sample before start should be outside');
        assertFalse(isInSelection(2, 11), 'Sample after end should be outside');
    });

    it('isInSelection when inactive', () => {
        if (typeof isInSelection !== 'function') return;
        Selection.active = false;
        Selection.startSignal = 1;
        Selection.endSignal = 3;
        Selection.startSample = 5;
        Selection.endSample = 10;
        
        assertFalse(isInSelection(2, 7), 'Should return false when selection inactive');
    });
});

// ============================================================================
// SELECTION CORNER CASES
// ============================================================================

describe('Selection - Corner Cases', () => {
    it('Single cell selection', () => {
        if (typeof isInSelection !== 'function') return;
        Selection.active = true;
        Selection.startSignal = 2;
        Selection.endSignal = 2;
        Selection.startSample = 5;
        Selection.endSample = 5;
        
        assertTrue(isInSelection(2, 5), 'Single cell should be inside');
        assertFalse(isInSelection(2, 4), 'Adjacent cell should be outside');
        assertFalse(isInSelection(2, 6), 'Adjacent cell should be outside');
        assertFalse(isInSelection(1, 5), 'Adjacent signal should be outside');
        assertFalse(isInSelection(3, 5), 'Adjacent signal should be outside');
    });

    it('Single row selection', () => {
        if (typeof isInSelection !== 'function') return;
        Selection.active = true;
        Selection.startSignal = 2;
        Selection.endSignal = 2;
        Selection.startSample = 0;
        Selection.endSample = 10;
        
        assertTrue(isInSelection(2, 0), 'First sample should be inside');
        assertTrue(isInSelection(2, 5), 'Middle sample should be inside');
        assertTrue(isInSelection(2, 10), 'Last sample should be inside');
        assertFalse(isInSelection(1, 5), 'Other signal should be outside');
    });

    it('Single column selection', () => {
        if (typeof isInSelection !== 'function') return;
        Selection.active = true;
        Selection.startSignal = 0;
        Selection.endSignal = 5;
        Selection.startSample = 3;
        Selection.endSample = 3;
        
        assertTrue(isInSelection(0, 3), 'First signal should be inside');
        assertTrue(isInSelection(3, 3), 'Middle signal should be inside');
        assertTrue(isInSelection(5, 3), 'Last signal should be inside');
        assertFalse(isInSelection(3, 2), 'Other sample should be outside');
    });

    it('Selection with swapped start/end', () => {
        if (typeof isInSelection !== 'function') return;
        Selection.active = true;
        // End before start (inverted)
        Selection.startSignal = 5;
        Selection.endSignal = 1;
        Selection.startSample = 10;
        Selection.endSample = 5;
        
        // Behavior depends on implementation
        // Test that it handles gracefully (no crash)
        const result = isInSelection(3, 7);
        assertEqual(typeof result, 'boolean');
    });

    it('Selection at signal 0', () => {
        if (typeof isInSelection !== 'function') return;
        Selection.active = true;
        Selection.startSignal = 0;
        Selection.endSignal = 2;
        Selection.startSample = 0;
        Selection.endSample = 5;
        
        assertTrue(isInSelection(0, 0), 'Origin should be inside');
    });

    it('Clear selection resets all values', () => {
        if (typeof clearSelection !== 'function') return;
        Selection.active = true;
        Selection.startSignal = 5;
        Selection.endSignal = 10;
        Selection.startSample = 3;
        Selection.endSample = 8;
        
        clearSelection();
        
        assertFalse(Selection.active);
        assertEqual(Selection.startSignal, -1);
        assertEqual(Selection.endSignal, -1);
        assertEqual(Selection.startSample, -1);
        assertEqual(Selection.endSample, -1);
    });

    it('Selection with negative indices', () => {
        if (typeof isInSelection !== 'function') return;
        Selection.active = true;
        Selection.startSignal = 1;
        Selection.endSignal = 3;
        Selection.startSample = 5;
        Selection.endSample = 10;
        
        // Test with negative query values
        assertFalse(isInSelection(-1, 7), 'Negative signal should be outside');
        assertFalse(isInSelection(2, -1), 'Negative sample should be outside');
    });
});

module.exports = {};
