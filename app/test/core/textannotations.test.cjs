#!/usr/bin/env node
/**
 * TextAnnotations Tests for WavePaint
 * Tests text annotation creation, styling, and manipulation
 */

const {
    describe, it,
    assertEqual, assertTrue, assertFalse, assertGreaterThan
} = require('../testFramework.cjs');

const { createTestDocument } = require('../mocks.cjs');

// ============================================================================
// TEXT ANNOTATION CORE TESTS
// ============================================================================

describe('TextAnnotations - Core', () => {
    it('Add text annotation to signal', () => {
        const doc = createTestDocument();
        doc.m_sampleCount = 10;
        doc.m_signals.push(new Signal('sig1', SignalType.Bit, 10));
        
        const id = doc.addTextAnnotation('Signal', 0, 'Test Label', 5, 'Above');
        assertGreaterThan(id, 0, 'Annotation id should be positive');
        assertEqual(doc.m_textAnnotations.length, 1);
        assertEqual(doc.m_textAnnotations[0].text, 'Test Label');
        assertEqual(doc.m_textAnnotations[0].anchorType, 'Signal');
        assertEqual(doc.m_textAnnotations[0].position, 5);  // Fractional position
        assertEqual(doc.m_textAnnotations[0].vPos, 'Above');
    });

    it('Add text annotation to arrow', () => {
        const doc = createTestDocument();
        doc.m_sampleCount = 10;
        doc.m_signals.push(new Signal('a', SignalType.Bit, 10));
        doc.m_signals.push(new Signal('b', SignalType.Bit, 10));
        
        const arrowId = doc.addArrow(0, 2, 1, 6, '~>');
        const annId = doc.addTextAnnotation('Arrow', arrowId, 'Arrow Label');
        
        assertGreaterThan(annId, 0);
        assertEqual(doc.m_textAnnotations[0].anchorType, 'Arrow');
        assertEqual(doc.m_textAnnotations[0].anchorId, arrowId);
    });

    it('Remove text annotation', () => {
        const doc = createTestDocument();
        doc.m_sampleCount = 10;
        doc.m_signals.push(new Signal('sig', SignalType.Bit, 10));
        
        const id = doc.addTextAnnotation('Signal', 0, 'Label', 3);
        assertEqual(doc.m_textAnnotations.length, 1);
        
        doc.removeTextAnnotation(id);
        assertEqual(doc.m_textAnnotations.length, 0);
    });

    it('Remove non-existent annotation does nothing', () => {
        const doc = createTestDocument();
        doc.m_sampleCount = 10;
        doc.m_signals.push(new Signal('sig', SignalType.Bit, 10));
        
        const id = doc.addTextAnnotation('Signal', 0, 'Label', 3);
        const undoStackBefore = doc.m_undoStack.length;
        
        doc.removeTextAnnotation(999); // Non-existent id
        assertEqual(doc.m_textAnnotations.length, 1); // Should still have 1
        assertEqual(doc.m_undoStack.length, undoStackBefore); // No undo snapshot for failed removal
    });

    it('Text annotation list', () => {
        const doc = createTestDocument();
        doc.m_sampleCount = 10;
        doc.m_signals.push(new Signal('sig', SignalType.Bit, 10));
        
        doc.addTextAnnotation('Signal', 0, 'Label1', 1);
        doc.addTextAnnotation('Signal', 0, 'Label2', 5);
        
        const list = doc.textAnnotationList();
        assertEqual(list.length, 2);
        assertEqual(list[0].text, 'Label1');
        assertEqual(list[1].text, 'Label2');
    });

    it('Text annotations removed when arrow deleted', () => {
        const doc = createTestDocument();
        doc.m_sampleCount = 10;
        doc.m_signals.push(new Signal('a', SignalType.Bit, 10));
        doc.m_signals.push(new Signal('b', SignalType.Bit, 10));
        
        const arrowId = doc.addArrow(0, 2, 1, 6, '~>');
        doc.addTextAnnotation('Arrow', arrowId, 'Arrow Label');
        assertEqual(doc.m_textAnnotations.length, 1);
        
        doc.subArrowById(arrowId);
        assertEqual(doc.m_textAnnotations.length, 0);
    });

    it('Text annotations default values', () => {
        const doc = createTestDocument();
        doc.m_sampleCount = 10;
        doc.m_signals.push(new Signal('sig', SignalType.Bit, 10));
        
        const id = doc.addTextAnnotation('Signal', 0, 'Label', 3);
        const ann = doc.m_textAnnotations[0];
        
        assertEqual(ann.color, null);
        assertEqual(ann.backgroundColor, null);
        assertEqual(ann.fontSize, 12);
        assertEqual(ann.bold, false);
    });
});

// ============================================================================
// TEXT ANNOTATION STYLING TESTS
// ============================================================================

describe('TextAnnotations - Styling', () => {
    it('Set text annotation text', () => {
        const doc = createTestDocument();
        doc.m_sampleCount = 10;
        doc.m_signals.push(new Signal('sig', SignalType.Bit, 10));
        
        const id = doc.addTextAnnotation('Signal', 0, 'Original', 3);
        doc.setTextAnnotationText(id, 'Modified');
        
        assertEqual(doc.m_textAnnotations[0].text, 'Modified');
    });

    it('Set text annotation color', () => {
        const doc = createTestDocument();
        doc.m_sampleCount = 10;
        doc.m_signals.push(new Signal('sig', SignalType.Bit, 10));
        
        const id = doc.addTextAnnotation('Signal', 0, 'Label', 3);
        doc.setTextAnnotationColor(id, '#ff0000');
        
        assertEqual(doc.m_textAnnotations[0].color, '#ff0000');
    });

    it('Set text annotation background color', () => {
        const doc = createTestDocument();
        doc.m_sampleCount = 10;
        doc.m_signals.push(new Signal('sig', SignalType.Bit, 10));
        
        const id = doc.addTextAnnotation('Signal', 0, 'Label', 3);
        doc.setTextAnnotationBackgroundColor(id, '#00ff00');
        
        assertEqual(doc.m_textAnnotations[0].backgroundColor, '#00ff00');
    });

    it('Set text annotation background color to null', () => {
        const doc = createTestDocument();
        doc.m_sampleCount = 10;
        doc.m_signals.push(new Signal('sig', SignalType.Bit, 10));
        
        const id = doc.addTextAnnotation('Signal', 0, 'Label', 3);
        doc.setTextAnnotationBackgroundColor(id, '#00ff00');
        doc.setTextAnnotationBackgroundColor(id, null);
        
        assertEqual(doc.m_textAnnotations[0].backgroundColor, null);
    });

    it('Set text annotation font size', () => {
        const doc = createTestDocument();
        doc.m_sampleCount = 10;
        doc.m_signals.push(new Signal('sig', SignalType.Bit, 10));
        
        const id = doc.addTextAnnotation('Signal', 0, 'Label', 3);
        doc.setTextAnnotationFontSize(id, 24);
        
        assertEqual(doc.m_textAnnotations[0].fontSize, 24);
    });

    it('Set text annotation font size clamped', () => {
        const doc = createTestDocument();
        doc.m_sampleCount = 10;
        doc.m_signals.push(new Signal('sig', SignalType.Bit, 10));
        
        const id = doc.addTextAnnotation('Signal', 0, 'Label', 3);
        
        doc.setTextAnnotationFontSize(id, 2); // Too small
        assertEqual(doc.m_textAnnotations[0].fontSize, 8); // Clamped to min
        
        doc.setTextAnnotationFontSize(id, 100); // Too large
        assertEqual(doc.m_textAnnotations[0].fontSize, 48); // Clamped to max
    });

    it('Set text annotation bold', () => {
        const doc = createTestDocument();
        doc.m_sampleCount = 10;
        doc.m_signals.push(new Signal('sig', SignalType.Bit, 10));
        
        const id = doc.addTextAnnotation('Signal', 0, 'Label', 3);
        assertFalse(doc.m_textAnnotations[0].bold);
        
        doc.setTextAnnotationBold(id, true);
        assertTrue(doc.m_textAnnotations[0].bold);
        
        doc.setTextAnnotationBold(id, false);
        assertFalse(doc.m_textAnnotations[0].bold);
    });
});

// ============================================================================
// TEXT ANNOTATION POSITION TESTS
// ============================================================================

describe('TextAnnotations - Position', () => {
    it('Set text annotation vertical position', () => {
        const doc = createTestDocument();
        doc.m_sampleCount = 10;
        doc.m_signals.push(new Signal('sig', SignalType.Bit, 10));
        
        const id = doc.addTextAnnotation('Signal', 0, 'Label', 3, 'Above');
        assertEqual(doc.m_textAnnotations[0].vPos, 'Above');
        
        doc.setTextAnnotationVPos(id, 'Center');
        assertEqual(doc.m_textAnnotations[0].vPos, 'Center');
        
        doc.setTextAnnotationVPos(id, 'Below');
        assertEqual(doc.m_textAnnotations[0].vPos, 'Below');
    });

    it('Set text annotation vPos invalid value rejected', () => {
        const doc = createTestDocument();
        doc.m_sampleCount = 10;
        doc.m_signals.push(new Signal('sig', SignalType.Bit, 10));
        
        const id = doc.addTextAnnotation('Signal', 0, 'Label', 3, 'Above');
        doc.setTextAnnotationVPos(id, 'InvalidPosition');
        
        assertEqual(doc.m_textAnnotations[0].vPos, 'Above'); // Should not change
    });

    it('Set text annotation position', () => {
        const doc = createTestDocument();
        doc.m_sampleCount = 10;
        doc.m_signals.push(new Signal('sig1', SignalType.Bit, 10));
        doc.m_signals.push(new Signal('sig2', SignalType.Bit, 10));
        
        const id = doc.addTextAnnotation('Signal', 0, 'Label', 3);
        doc.setTextAnnotationPosition(id, 7, 1);
        
        assertEqual(doc.m_textAnnotations[0].position, 7);  // Fractional position
        assertEqual(doc.m_textAnnotations[0].anchorId, 1);
    });

    it('Set text annotation position invalid sample rejected', () => {
        const doc = createTestDocument();
        doc.m_sampleCount = 10;
        doc.m_signals.push(new Signal('sig', SignalType.Bit, 10));
        
        const id = doc.addTextAnnotation('Signal', 0, 'Label', 3);
        doc.setTextAnnotationPosition(id, -5); // Invalid
        
        assertEqual(doc.m_textAnnotations[0].position, 3); // Should not change (fractional position)
    });

    it('Set text annotation position out of bounds rejected', () => {
        const doc = createTestDocument();
        doc.m_sampleCount = 10;
        doc.m_signals.push(new Signal('sig', SignalType.Bit, 10));
        
        const id = doc.addTextAnnotation('Signal', 0, 'Label', 3);
        doc.setTextAnnotationPosition(id, 100); // Out of bounds
        
        assertEqual(doc.m_textAnnotations[0].position, 3); // Should not change (fractional position)
    });
});

// ============================================================================
// TEXT ANNOTATION CORNER CASES
// ============================================================================

describe('TextAnnotations - Corner Cases', () => {
    it('Add annotation with empty text', () => {
        const doc = createTestDocument();
        doc.m_sampleCount = 10;
        doc.m_signals.push(new Signal('sig', SignalType.Bit, 10));
        
        const id = doc.addTextAnnotation('Signal', 0, '', 3);
        assertGreaterThan(id, 0);
        assertEqual(doc.m_textAnnotations[0].text, '');
    });

    it('Add annotation with very long text', () => {
        const doc = createTestDocument();
        doc.m_sampleCount = 10;
        doc.m_signals.push(new Signal('sig', SignalType.Bit, 10));
        
        const longText = 'A'.repeat(1000);
        const id = doc.addTextAnnotation('Signal', 0, longText, 3);
        assertGreaterThan(id, 0);
        assertEqual(doc.m_textAnnotations[0].text, longText);
    });

    it('Add annotation with unicode text', () => {
        const doc = createTestDocument();
        doc.m_sampleCount = 10;
        doc.m_signals.push(new Signal('sig', SignalType.Bit, 10));
        
        const unicodeText = '测试 πεriφérique émoji 🎉';
        const id = doc.addTextAnnotation('Signal', 0, unicodeText, 3);
        assertGreaterThan(id, 0);
        assertEqual(doc.m_textAnnotations[0].text, unicodeText);
    });

    it('Add annotation at sample 0', () => {
        const doc = createTestDocument();
        doc.m_sampleCount = 10;
        doc.m_signals.push(new Signal('sig', SignalType.Bit, 10));
        
        const id = doc.addTextAnnotation('Signal', 0, 'Label', 0);
        assertGreaterThan(id, 0);
        assertEqual(doc.m_textAnnotations[0].position, 0);  // Fractional position
    });

    it('Add annotation at last sample', () => {
        const doc = createTestDocument();
        doc.m_sampleCount = 10;
        doc.m_signals.push(new Signal('sig', SignalType.Bit, 10));
        
        const id = doc.addTextAnnotation('Signal', 0, 'Label', 9);
        assertGreaterThan(id, 0);
        assertEqual(doc.m_textAnnotations[0].position, 9);  // Fractional position
    });

    it('Add annotation to invalid signal - handles gracefully', () => {
        const doc = createTestDocument();
        doc.m_sampleCount = 10;
        doc.m_signals.push(new Signal('sig', SignalType.Bit, 10));
        
        // Current implementation may accept invalid indices - verify no crash
        const id = doc.addTextAnnotation('Signal', 99, 'Label', 3);
        // Either returns -1 or creates the annotation (implementation dependent)
        assertEqual(typeof id, 'number');
    });

    it('Add annotation to invalid arrow - handles gracefully', () => {
        const doc = createTestDocument();
        doc.m_sampleCount = 10;
        doc.m_signals.push(new Signal('a', SignalType.Bit, 10));
        doc.m_signals.push(new Signal('b', SignalType.Bit, 10));
        
        // Current implementation may accept invalid arrow IDs - verify no crash
        const id = doc.addTextAnnotation('Arrow', 99999, 'Label');
        // Either returns -1 or creates the annotation (implementation dependent)
        assertEqual(typeof id, 'number');
    });

    it('Multiple annotations on same signal', () => {
        const doc = createTestDocument();
        doc.m_sampleCount = 10;
        doc.m_signals.push(new Signal('sig', SignalType.Bit, 10));
        
        const id1 = doc.addTextAnnotation('Signal', 0, 'Label1', 3);
        const id2 = doc.addTextAnnotation('Signal', 0, 'Label2', 3);
        const id3 = doc.addTextAnnotation('Signal', 0, 'Label3', 3);
        
        assertGreaterThan(id1, 0);
        assertGreaterThan(id2, 0);
        assertGreaterThan(id3, 0);
        assertEqual(doc.m_textAnnotations.length, 3);
    });

    it('Multiple annotations on same arrow', () => {
        const doc = createTestDocument();
        doc.m_sampleCount = 10;
        doc.m_signals.push(new Signal('a', SignalType.Bit, 10));
        doc.m_signals.push(new Signal('b', SignalType.Bit, 10));
        
        const arrowId = doc.addArrow(0, 0, 1, 5);
        doc.addTextAnnotation('Arrow', arrowId, 'Label1');
        doc.addTextAnnotation('Arrow', arrowId, 'Label2');
        
        assertEqual(doc.m_textAnnotations.length, 2);
    });

    it('Annotation unique IDs', () => {
        const doc = createTestDocument();
        doc.m_sampleCount = 10;
        doc.m_signals.push(new Signal('sig', SignalType.Bit, 10));
        
        const ids = [];
        for (let i = 0; i < 10; i++) {
            ids.push(doc.addTextAnnotation('Signal', 0, `Label${i}`, i));
        }
        
        const uniqueIds = new Set(ids);
        assertEqual(uniqueIds.size, ids.length, 'All IDs should be unique');
    });

    it('Set properties on non-existent annotation', () => {
        const doc = createTestDocument();
        doc.m_sampleCount = 10;
        doc.m_signals.push(new Signal('sig', SignalType.Bit, 10));
        
        // These should not throw
        doc.setTextAnnotationText(99999, 'New Text');
        doc.setTextAnnotationColor(99999, '#ff0000');
        doc.setTextAnnotationBackgroundColor(99999, '#00ff00');
        doc.setTextAnnotationFontSize(99999, 20);
        doc.setTextAnnotationBold(99999, true);
        doc.setTextAnnotationVPos(99999, 'Below');
        doc.setTextAnnotationPosition(99999, 5);
        
        // No crash = success
        assertEqual(doc.m_textAnnotations.length, 0);
    });
});

module.exports = {};
