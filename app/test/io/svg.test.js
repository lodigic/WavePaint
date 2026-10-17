#!/usr/bin/env node
/**
 * SVG Export Tests for WavePaint
 * Tests SVG context and export functionality
 */

const {
    describe, it,
    assertEqual, assertType, assertTrue, assertNotNull,
    assertGreaterThan, assertContains
} = require('../testFramework');

const { createSimpleDocument } = require('../mocks');

// ============================================================================
// SVG CONTEXT TESTS
// ============================================================================

describe('SVG Export - SVGContext', () => {
    it('SVGContext class exists', () => {
        assertType(SVGContext, 'function');
    });

    it('exportToSVG function exists', () => {
        assertType(exportToSVG, 'function');
    });

    it('SVGContext can be instantiated', () => {
        const ctx = new SVGContext(800, 600);
        assertNotNull(ctx);
        assertEqual(ctx.width, 800);
        assertEqual(ctx.height, 600);
    });

    it('SVGContext has canvas 2D context properties', () => {
        const ctx = new SVGContext(100, 100);
        
        ctx.fillStyle = '#ff0000';
        assertEqual(ctx.fillStyle, '#ff0000');
        
        ctx.strokeStyle = '#00ff00';
        assertEqual(ctx.strokeStyle, '#00ff00');
        
        ctx.lineWidth = 2;
        assertEqual(ctx.lineWidth, 2);
        
        ctx.font = '12px Arial';
        assertEqual(ctx.font, '12px Arial');
    });

    it('SVGContext save/restore works', () => {
        const ctx = new SVGContext(100, 100);
        
        ctx.fillStyle = '#ff0000';
        ctx.save();
        ctx.fillStyle = '#00ff00';
        assertEqual(ctx.fillStyle, '#00ff00');
        ctx.restore();
        assertEqual(ctx.fillStyle, '#ff0000');
    });

    it('SVGContext fillRect generates SVG element', () => {
        const ctx = new SVGContext(100, 100, { transparentBackground: false });
        ctx.fillStyle = '#ff0000';
        ctx.fillRect(10, 20, 30, 40);
        
        assertTrue(ctx.elements.length > 0);
        assertContains(ctx.elements[0], '<rect');
        assertContains(ctx.elements[0], 'x="10"');
        assertContains(ctx.elements[0], 'y="20"');
        assertContains(ctx.elements[0], 'width="30"');
        assertContains(ctx.elements[0], 'height="40"');
        assertContains(ctx.elements[0], 'fill="#ff0000"');
    });
});

// ============================================================================
// SVG PATH TESTS
// ============================================================================

describe('SVG Export - Paths', () => {
    it('SVGContext path operations generate SVG element', () => {
        const ctx = new SVGContext(100, 100);
        ctx.strokeStyle = '#0000ff';
        ctx.lineWidth = 2;
        
        ctx.beginPath();
        ctx.moveTo(10, 10);
        ctx.lineTo(50, 50);
        ctx.lineTo(90, 10);
        ctx.stroke();
        
        assertTrue(ctx.elements.length > 0);
        assertContains(ctx.elements[0], '<path');
        assertContains(ctx.elements[0], 'M 10 10');
        assertContains(ctx.elements[0], 'L 50 50');
        assertContains(ctx.elements[0], 'L 90 10');
        assertContains(ctx.elements[0], 'stroke="#0000ff"');
    });

    it('SVGContext arc generates SVG arc', () => {
        const ctx = new SVGContext(100, 100);
        ctx.fillStyle = '#ff0000';
        
        ctx.beginPath();
        ctx.arc(50, 50, 20, 0, Math.PI * 2);
        ctx.fill();
        
        assertTrue(ctx.elements.length > 0);
        assertContains(ctx.elements[0], '<path');
        assertContains(ctx.elements[0], 'A 20 20');
    });

    it('SVGContext bezierCurveTo generates SVG curve', () => {
        const ctx = new SVGContext(100, 100);
        ctx.strokeStyle = '#000000';
        
        ctx.beginPath();
        ctx.moveTo(10, 50);
        ctx.bezierCurveTo(30, 10, 70, 90, 90, 50);
        ctx.stroke();
        
        assertTrue(ctx.elements.length > 0);
        assertContains(ctx.elements[0], 'C 30 10 70 90 90 50');
    });

    it('SVGContext strokeRect generates SVG element', () => {
        const ctx = new SVGContext(100, 100);
        ctx.strokeStyle = '#0000ff';
        ctx.lineWidth = 2;
        ctx.strokeRect(10, 10, 80, 80);
        
        assertTrue(ctx.elements.length > 0);
        assertContains(ctx.elements[0], '<rect');
        assertContains(ctx.elements[0], 'fill="none"');
        assertContains(ctx.elements[0], 'stroke="#0000ff"');
    });
});

// ============================================================================
// SVG TEXT TESTS
// ============================================================================

describe('SVG Export - Text', () => {
    it('SVGContext fillText generates SVG text element', () => {
        const ctx = new SVGContext(100, 100);
        ctx.fillStyle = '#000000';
        ctx.font = '12px Arial';
        ctx.fillText('Hello', 50, 50);
        
        assertTrue(ctx.elements.length > 0);
        assertContains(ctx.elements[0], '<text');
        assertContains(ctx.elements[0], 'Hello');
        assertContains(ctx.elements[0], 'x="50"');
        assertContains(ctx.elements[0], 'y="50"');
    });

    it('SVGContext measureText returns approximate width', () => {
        const ctx = new SVGContext(100, 100);
        ctx.font = '12px Arial';
        
        const metrics = ctx.measureText('Hello');
        assertNotNull(metrics);
        assertGreaterThan(metrics.width, 0);
    });

    it('SVGContext escapes XML special characters', () => {
        const ctx = new SVGContext(100, 100);
        ctx.fillText('<test>&"value\'', 10, 10);
        
        assertTrue(ctx.elements.length > 0);
        assertContains(ctx.elements[0], '&lt;');
        assertContains(ctx.elements[0], '&gt;');
        assertContains(ctx.elements[0], '&amp;');
        assertContains(ctx.elements[0], '&quot;');
        assertContains(ctx.elements[0], '&apos;');
    });
});

// ============================================================================
// SVG LINE STYLE TESTS
// ============================================================================

describe('SVG Export - Line Styles', () => {
    it('SVGContext setLineDash works', () => {
        const ctx = new SVGContext(100, 100);
        ctx.setLineDash([5, 3]);
        
        const dash = ctx.getLineDash();
        assertEqual(dash.length, 2);
        assertEqual(dash[0], 5);
        assertEqual(dash[1], 3);
    });

    it('SVGContext with lineDash generates stroke-dasharray', () => {
        const ctx = new SVGContext(100, 100);
        ctx.strokeStyle = '#000000';
        ctx.setLineDash([5, 3]);
        ctx.strokeRect(10, 10, 80, 80);
        
        assertTrue(ctx.elements.length > 0);
        assertContains(ctx.elements[0], 'stroke-dasharray="5 3"');
    });

    it('SVGContext clear line dash', () => {
        const ctx = new SVGContext(100, 100);
        ctx.setLineDash([5, 3]);
        ctx.setLineDash([]);
        
        const dash = ctx.getLineDash();
        assertEqual(dash.length, 0);
    });
});

// ============================================================================
// SVG OUTPUT TESTS
// ============================================================================

describe('SVG Export - Output', () => {
    it('SVGContext toSVG generates valid SVG', () => {
        const ctx = new SVGContext(200, 100);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, 200, 100);
        ctx.fillStyle = '#000000';
        ctx.fillText('Test', 100, 50);
        
        const svg = ctx.toSVG();
        
        assertContains(svg, '<?xml version="1.0"');
        assertContains(svg, '<svg xmlns="http://www.w3.org/2000/svg"');
        assertContains(svg, 'width="200"');
        assertContains(svg, 'height="100"');
        assertContains(svg, '</svg>');
    });

    it('SVGContext with transparent background', () => {
        const ctx = new SVGContext(100, 100, { transparentBackground: true });
        ctx.fillRect(10, 10, 20, 20);
        
        const svg = ctx.toSVG();
        // Should not have a background rect
        assertContains(svg, '<svg');
    });

    it('SVGContext empty produces valid SVG', () => {
        const ctx = new SVGContext(100, 100);
        const svg = ctx.toSVG();
        
        assertContains(svg, '<svg');
        assertContains(svg, '</svg>');
    });
});

// ============================================================================
// SVG CORNER CASES
// ============================================================================

describe('SVG Export - Corner Cases', () => {
    it('SVG with very small dimensions', () => {
        const ctx = new SVGContext(1, 1);
        ctx.fillRect(0, 0, 1, 1);
        
        const svg = ctx.toSVG();
        assertContains(svg, 'width="1"');
        assertContains(svg, 'height="1"');
    });

    it('SVG with large dimensions', () => {
        const ctx = new SVGContext(10000, 10000);
        const svg = ctx.toSVG();
        
        assertContains(svg, 'width="10000"');
        assertContains(svg, 'height="10000"');
    });

    it('SVG with negative coordinates', () => {
        const ctx = new SVGContext(100, 100);
        ctx.beginPath();
        ctx.moveTo(-10, -10);
        ctx.lineTo(50, 50);
        ctx.stroke();
        
        const svg = ctx.toSVG();
        assertContains(svg, 'M -10 -10');
    });

    it('SVG with floating point coordinates', () => {
        const ctx = new SVGContext(100, 100);
        ctx.beginPath();
        ctx.moveTo(10.5, 20.25);
        ctx.lineTo(50.75, 60.125);
        ctx.stroke();
        
        assertTrue(ctx.elements.length > 0);
    });

    it('Multiple save/restore operations', () => {
        const ctx = new SVGContext(100, 100);
        
        ctx.fillStyle = '#ff0000';
        ctx.save();
        ctx.fillStyle = '#00ff00';
        ctx.save();
        ctx.fillStyle = '#0000ff';
        ctx.save();
        ctx.fillStyle = '#ffff00';
        
        ctx.restore();
        assertEqual(ctx.fillStyle, '#0000ff');
        ctx.restore();
        assertEqual(ctx.fillStyle, '#00ff00');
        ctx.restore();
        assertEqual(ctx.fillStyle, '#ff0000');
    });
});

module.exports = {};
