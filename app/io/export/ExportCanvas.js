/**
 * Export Canvas - Canvas preparation for export operations
 * 
 * Provides helper function to prepare canvas for image export.
 */

/**
 * Helper function to prepare canvas for export.
 * Returns an object with export canvas and cleanup function.
 */
async function prepareExportCanvas() {
    if (!canvas || !ctx || !document_wave) {
        await wpAlert('Canvas not available for export.', 'Export Error');
        return null;
    }
    
    // Calculate exact dimensions based on content
    const signals = document_wave.signalList();
    const sampleCount = document_wave.sampleCount();
    const cellWidth = typeof getWaveCellWidth === 'function' ? getWaveCellWidth() : 48;
    
    // Match the constants from WaveView.js drawWaveform()
    const rowHeight = 40;
    const signalStartY = 40;  // Space for time axis header
    const padding = 20;       // Right padding
    
    // Use dynamic nameWidth calculation like WaveViewMain does
    // This ensures export captures all signal names and group brackets correctly
    const nameWidth = typeof calculateDynamicNameWidth === 'function' 
        ? calculateDynamicNameWidth(ctx, signals) 
        : (typeof getDynamicNameWidth === 'function' ? getDynamicNameWidth() : 200);
    
    // Calculate exact width and height for the content
    const exportWidth = nameWidth + (cellWidth * sampleCount) + padding;
    const exportHeight = signalStartY + (signals.length * rowHeight) + padding;
    
    // Store original canvas dimensions
    const originalWidth = canvas.width;
    const originalHeight = canvas.height;
    
    // Temporarily resize canvas to exact content size
    canvas.width = exportWidth;
    canvas.height = exportHeight;

    // Redraw the waveform at the exact size with export styling
    // (e.g. the time axis blends with the canvas background)
    window._wpExportMode = true;
    if (typeof drawWaveform === 'function') {
        drawWaveform();
    }
    
    // Create a temporary canvas for export
    const exportCanvas = document.createElement('canvas');
    exportCanvas.width = exportWidth;
    exportCanvas.height = exportHeight;
    const exportCtx = exportCanvas.getContext('2d');
    
    // Fill with canvas background color first
    const canvasBg = getComputedStyle(document.body).getPropertyValue('--canvas-bg').trim() || '#ffffff';
    exportCtx.fillStyle = canvasBg;
    exportCtx.fillRect(0, 0, exportCanvas.width, exportCanvas.height);
    
    // Draw the original canvas content on top
    exportCtx.drawImage(canvas, 0, 0);
    window._wpExportMode = false;

    // Cleanup function to restore original canvas
    const cleanup = () => {
        canvas.width = originalWidth;
        canvas.height = originalHeight;
        if (typeof drawWaveform === 'function') {
            drawWaveform();
        }
    };
    
    return { exportCanvas, exportWidth, exportHeight, cleanup };
}
