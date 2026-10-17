/**
 * Export SVG - SVG export functionality
 * 
 * Provides functionality to export waveforms to vectorial SVG image format.
 * Uses a canvas-to-SVG approach by intercepting canvas 2D context calls.
 */

/**
 * SVG Context - A mock canvas 2D context that generates SVG elements
 * This allows us to use the same drawWaveform() logic for SVG export
 */
class SVGContext {
    constructor(width, height, options = {}) {
        this.width = width;
        this.height = height;
        this.elements = [];
        this.defs = [];
        this.defIds = 0;
        
        // Options
        this.transparentBackground = options.transparentBackground !== false; // Default true
        this.isFirstFillRect = true;
        
        // State stack for save/restore
        this.stateStack = [];
        
        // Current state
        this.state = {
            fillStyle: '#000000',
            strokeStyle: '#000000',
            lineWidth: 1,
            lineCap: 'butt',
            lineJoin: 'miter',
            lineDash: [],
            font: '10px sans-serif',
            textAlign: 'left',
            textBaseline: 'alphabetic',
            globalAlpha: 1,
            transform: { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 }
        };
        
        // Current path
        this.currentPath = '';
        this.pathStartX = 0;
        this.pathStartY = 0;
    }
    
    // Property getters/setters
    get fillStyle() { return this.state.fillStyle; }
    set fillStyle(v) { this.state.fillStyle = v; }
    
    get strokeStyle() { return this.state.strokeStyle; }
    set strokeStyle(v) { this.state.strokeStyle = v; }
    
    get lineWidth() { return this.state.lineWidth; }
    set lineWidth(v) { this.state.lineWidth = v; }
    
    get lineCap() { return this.state.lineCap; }
    set lineCap(v) { this.state.lineCap = v; }
    
    get lineJoin() { return this.state.lineJoin; }
    set lineJoin(v) { this.state.lineJoin = v; }
    
    get font() { return this.state.font; }
    set font(v) { this.state.font = v; }
    
    get textAlign() { return this.state.textAlign; }
    set textAlign(v) { this.state.textAlign = v; }
    
    get textBaseline() { return this.state.textBaseline; }
    set textBaseline(v) { this.state.textBaseline = v; }
    
    get globalAlpha() { return this.state.globalAlpha; }
    set globalAlpha(v) { this.state.globalAlpha = v; }
    
    // State management
    save() {
        this.stateStack.push(JSON.parse(JSON.stringify(this.state)));
    }
    
    restore() {
        if (this.stateStack.length > 0) {
            this.state = this.stateStack.pop();
        }
    }
    
    // Transform
    translate(x, y) {
        this.state.transform.e += x;
        this.state.transform.f += y;
    }
    
    rotate(angle) {
        const cos = Math.cos(angle);
        const sin = Math.sin(angle);
        const t = this.state.transform;
        const a = t.a * cos + t.c * sin;
        const b = t.b * cos + t.d * sin;
        const c = t.c * cos - t.a * sin;
        const d = t.d * cos - t.b * sin;
        t.a = a; t.b = b; t.c = c; t.d = d;
    }
    
    scale(x, y) {
        this.state.transform.a *= x;
        this.state.transform.d *= y;
    }
    
    // Line dash
    setLineDash(segments) {
        this.state.lineDash = segments || [];
    }
    
    getLineDash() {
        return this.state.lineDash;
    }
    
    // Path operations
    beginPath() {
        this.currentPath = '';
    }
    
    moveTo(x, y) {
        this.currentPath += `M ${x} ${y} `;
        this.pathStartX = x;
        this.pathStartY = y;
    }
    
    lineTo(x, y) {
        this.currentPath += `L ${x} ${y} `;
    }
    
    quadraticCurveTo(cpx, cpy, x, y) {
        this.currentPath += `Q ${cpx} ${cpy} ${x} ${y} `;
    }
    
    bezierCurveTo(cp1x, cp1y, cp2x, cp2y, x, y) {
        this.currentPath += `C ${cp1x} ${cp1y} ${cp2x} ${cp2y} ${x} ${y} `;
    }
    
    arc(x, y, radius, startAngle, endAngle, counterclockwise = false) {
        // Convert arc to path commands
        const startX = x + radius * Math.cos(startAngle);
        const startY = y + radius * Math.sin(startAngle);
        const endX = x + radius * Math.cos(endAngle);
        const endY = y + radius * Math.sin(endAngle);
        
        let angleDiff = endAngle - startAngle;
        if (counterclockwise && angleDiff > 0) angleDiff -= 2 * Math.PI;
        if (!counterclockwise && angleDiff < 0) angleDiff += 2 * Math.PI;
        
        const largeArc = Math.abs(angleDiff) > Math.PI ? 1 : 0;
        const sweep = counterclockwise ? 0 : 1;
        
        if (this.currentPath === '' || !this.currentPath.includes('M')) {
            this.currentPath += `M ${startX} ${startY} `;
        } else {
            this.currentPath += `L ${startX} ${startY} `;
        }
        
        // Handle full circle
        if (Math.abs(angleDiff) >= 2 * Math.PI - 0.001) {
            const midX = x + radius * Math.cos(startAngle + Math.PI);
            const midY = y + radius * Math.sin(startAngle + Math.PI);
            this.currentPath += `A ${radius} ${radius} 0 1 ${sweep} ${midX} ${midY} `;
            this.currentPath += `A ${radius} ${radius} 0 1 ${sweep} ${startX} ${startY} `;
        } else {
            this.currentPath += `A ${radius} ${radius} 0 ${largeArc} ${sweep} ${endX} ${endY} `;
        }
    }
    
    closePath() {
        this.currentPath += 'Z ';
    }
    
    rect(x, y, width, height) {
        this.currentPath += `M ${x} ${y} L ${x + width} ${y} L ${x + width} ${y + height} L ${x} ${y + height} Z `;
    }
    
    // Drawing operations
    fill() {
        if (this.currentPath) {
            this.elements.push(this._createPathElement(true, false));
        }
    }
    
    stroke() {
        if (this.currentPath) {
            this.elements.push(this._createPathElement(false, true));
        }
    }
    
    fillRect(x, y, width, height) {
        // Skip the first fillRect (background) if transparent background is enabled
        if (this.transparentBackground && this.isFirstFillRect) {
            this.isFirstFillRect = false;
            return;
        }
        
        const attrs = [
            `x="${x}"`,
            `y="${y}"`,
            `width="${width}"`,
            `height="${height}"`,
            `fill="${this._resolveFill()}"`,
        ];
        if (this.state.globalAlpha < 1) {
            attrs.push(`opacity="${this.state.globalAlpha}"`);
        }
        this.elements.push(`<rect ${attrs.join(' ')}/>`);
    }
    
    strokeRect(x, y, width, height) {
        const attrs = [
            `x="${x}"`,
            `y="${y}"`,
            `width="${width}"`,
            `height="${height}"`,
            `fill="none"`,
            `stroke="${this.state.strokeStyle}"`,
            `stroke-width="${this.state.lineWidth}"`,
        ];
        if (this.state.lineDash.length > 0) {
            attrs.push(`stroke-dasharray="${this.state.lineDash.join(' ')}"`);
        }
        if (this.state.globalAlpha < 1) {
            attrs.push(`opacity="${this.state.globalAlpha}"`);
        }
        this.elements.push(`<rect ${attrs.join(' ')}/>`);
    }
    
    clearRect(x, y, width, height) {
        // In SVG, we just draw a white/bg rectangle
        this.elements.push(`<rect x="${x}" y="${y}" width="${width}" height="${height}" fill="white"/>`);
    }
    
    // Text
    fillText(text, x, y, maxWidth) {
        const fontSize = parseInt(this.state.font) || 10;
        const fontFamily = this.state.font.replace(/^\d+px\s*/, '') || 'sans-serif';
        const fontWeight = this.state.font.includes('bold') ? 'bold' : 'normal';
        
        let textAnchor = 'start';
        if (this.state.textAlign === 'center') textAnchor = 'middle';
        else if (this.state.textAlign === 'right' || this.state.textAlign === 'end') textAnchor = 'end';
        
        let dy = '0';
        if (this.state.textBaseline === 'middle') dy = '0.35em';
        else if (this.state.textBaseline === 'top' || this.state.textBaseline === 'hanging') dy = '0.8em';
        else if (this.state.textBaseline === 'bottom' || this.state.textBaseline === 'ideographic') dy = '-0.2em';
        
        // Handle transform
        let transform = '';
        const t = this.state.transform;
        if (t.a !== 1 || t.b !== 0 || t.c !== 0 || t.d !== 1 || t.e !== 0 || t.f !== 0) {
            transform = ` transform="matrix(${t.a} ${t.b} ${t.c} ${t.d} ${t.e} ${t.f})"`;
        }
        
        const escapedText = this._escapeXml(text);
        const attrs = [
            `x="${x}"`,
            `y="${y}"`,
            `font-family="${fontFamily}"`,
            `font-size="${fontSize}"`,
            `font-weight="${fontWeight}"`,
            `fill="${this._resolveFill()}"`,
            `text-anchor="${textAnchor}"`,
            `dy="${dy}"`,
        ];
        
        if (transform) {
            attrs.push(transform.trim());
        }
        
        this.elements.push(`<text ${attrs.join(' ')}>${escapedText}</text>`);
    }
    
    strokeText(text, x, y, maxWidth) {
        // Similar to fillText but with stroke
        const fontSize = parseInt(this.state.font) || 10;
        const fontFamily = this.state.font.replace(/^\d+px\s*/, '') || 'sans-serif';
        
        let textAnchor = 'start';
        if (this.state.textAlign === 'center') textAnchor = 'middle';
        else if (this.state.textAlign === 'right' || this.state.textAlign === 'end') textAnchor = 'end';
        
        const escapedText = this._escapeXml(text);
        this.elements.push(`<text x="${x}" y="${y}" font-family="${fontFamily}" font-size="${fontSize}" fill="none" stroke="${this.state.strokeStyle}" stroke-width="${this.state.lineWidth}" text-anchor="${textAnchor}">${escapedText}</text>`);
    }
    
    measureText(text) {
        // Use a real canvas context for accurate metrics: the previous
        // per-character approximation overestimated widths, so signal names
        // were truncated with '…' only in SVG exports (issue #4)
        if (typeof document !== 'undefined') {
            if (!SVGContext._measureCtx) {
                SVGContext._measureCtx = document.createElement('canvas').getContext('2d');
            }
            const mctx = SVGContext._measureCtx;
            mctx.font = this.state.font;
            return mctx.measureText(text);
        }
        const fontSize = parseInt(this.state.font) || 12;
        return { width: text.length * fontSize * 0.6 };
    }
    
    // Clipping - simplified, we just note it but don't fully implement
    clip(fillRule) {
        // For SVG export, we'll skip complex clipping for now
        // The main canvas uses clipping for text exclusion zones which we can ignore
    }
    
    // Image drawing - not supported in SVG context
    drawImage() {
        // Not supported
    }
    
    // Helper methods
    _resolveFill() {
        const fill = this.state.fillStyle;
        if (typeof fill === 'string') {
            return fill;
        }
        return '#000000';
    }
    
    _createPathElement(doFill, doStroke) {
        const attrs = [`d="${this.currentPath.trim()}"`];
        
        if (doFill) {
            attrs.push(`fill="${this._resolveFill()}"`);
        } else {
            attrs.push('fill="none"');
        }
        
        if (doStroke) {
            attrs.push(`stroke="${this.state.strokeStyle}"`);
            attrs.push(`stroke-width="${this.state.lineWidth}"`);
            attrs.push(`stroke-linecap="${this.state.lineCap}"`);
            attrs.push(`stroke-linejoin="${this.state.lineJoin}"`);
            if (this.state.lineDash.length > 0) {
                attrs.push(`stroke-dasharray="${this.state.lineDash.join(' ')}"`);
            }
        }
        
        if (this.state.globalAlpha < 1) {
            attrs.push(`opacity="${this.state.globalAlpha}"`);
        }
        
        return `<path ${attrs.join(' ')}/>`;
    }
    
    _escapeXml(str) {
        if (typeof str !== 'string') str = String(str);
        return str.replace(/&/g, '&amp;')
                  .replace(/</g, '&lt;')
                  .replace(/>/g, '&gt;')
                  .replace(/"/g, '&quot;')
                  .replace(/'/g, '&apos;');
    }
    
    // Generate final SVG
    toSVG() {
        let defsSection = '';
        if (this.defs.length > 0) {
            defsSection = `<defs>\n    ${this.defs.join('\n    ')}\n  </defs>\n  `;
        }
        
        return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${this.width}" height="${this.height}" viewBox="0 0 ${this.width} ${this.height}">
  <title>WavePaint Waveform Export</title>
  ${defsSection}${this.elements.join('\n  ')}
</svg>`;
    }
}

/**
 * Exports the current waveform to a vectorial SVG image file.
 * Uses the same drawing logic as the canvas by swapping the context.
 */
async function exportToSVG() {
    if (!document_wave) {
        await wpAlert('Document not available for export.', 'Export Error');
        return;
    }
    
    // Get filename from user
    const fileName = await wpPrompt('Enter file name:', 'waveform.svg', 'Export SVG');
    if (!fileName) {
        console.log('Export cancelled by user');
        return;
    }
    
    // Ensure filename has .svg extension
    let finalFileName = fileName;
    if (!finalFileName.toLowerCase().endsWith('.svg')) {
        finalFileName += '.svg';
    }
    
    try {
        // Calculate dimensions (same as prepareExportCanvas)
        const signals = document_wave.signalList();
        const sampleCount = document_wave.sampleCount();
        const cellWidth = typeof getWaveCellWidth === 'function' ? getWaveCellWidth() : 48;
        
        const rowHeight = 40;
        const signalStartY = 40;
        const padding = 20;
        
        // Use dynamic nameWidth calculation
        const nameWidth = typeof getDynamicNameWidth === 'function' 
            ? getDynamicNameWidth() 
            : 200;
        
        const exportWidth = nameWidth + (cellWidth * sampleCount) + padding;
        const exportHeight = signalStartY + (signals.length * rowHeight) + padding;
        
        // Store original canvas and context
        const originalCanvas = canvas;
        const originalCtx = ctx;
        const originalWidth = canvas.width;
        const originalHeight = canvas.height;
        
        // Create SVG context
        const svgCtx = new SVGContext(exportWidth, exportHeight);
        
        // Create a mock canvas object for drawWaveform
        const mockCanvas = {
            width: exportWidth,
            height: exportHeight,
            getContext: () => svgCtx
        };
        
        // Temporarily replace global canvas and ctx
        canvas = mockCanvas;
        ctx = svgCtx;

        // Call the actual drawWaveform function with export styling
        window._wpExportMode = true;
        try {
            if (typeof drawWaveform === 'function') {
                drawWaveform();
            }
        } catch (drawError) {
            console.error('Error during SVG drawWaveform:', drawError);
        }
        window._wpExportMode = false;

        // Restore original canvas and context
        canvas = originalCanvas;
        ctx = originalCtx;
        
        // Redraw original canvas
        if (typeof drawWaveform === 'function') {
            drawWaveform();
        }
        
        // Get SVG content
        const svgContent = svgCtx.toSVG();
        
        // Create blob and download
        const blob = new Blob([svgContent], { type: 'image/svg+xml' });
        const url = URL.createObjectURL(blob);
        
        const link = document.createElement('a');
        link.download = finalFileName;
        link.href = url;
        
        // Trigger download
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        // Clean up the object URL
        URL.revokeObjectURL(url);
        
        console.log('SVG exported successfully:', finalFileName);
        await wpAlert('SVG exported successfully!', 'Export SVG');
    } catch (error) {
        console.error('Failed to export SVG:', error);
        await wpAlert('Failed to export SVG: ' + error.message, 'Export Error');
    }
}
