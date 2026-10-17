/**
 * AppInitCanvas.js - Canvas event initialization
 */

/**
 * Initializes canvas event handlers.
 */
function initCanvasHandlers() {
    canvas.addEventListener('mousedown', function(e) {
        if (e.button !== 0) return;
        isMouseDown = true;
        // Reset WaveDrom editor flag when user clicks on canvas
        if (typeof resetWaveDromUserEditing === 'function') {
            resetWaveDromUserEditing();
        }
        // Clear all preserved WaveDrom data - canvas edits mean fresh export
        if (typeof WaveDromIO !== 'undefined' && WaveDromIO.clearDocumentWaveDromPreserved) {
            WaveDromIO.clearDocumentWaveDromPreserved(document_wave);
        }
        handleMouseEvent(e);
    });

    canvas.addEventListener('mousemove', function(e) {
        if (isMouseDown || (currentTool === 'arrow' && arrowHasStart) || currentTool === 'marker' || currentTool === 'time-jump' || currentTool === 'time-span' || currentTool === 'text' || currentTool === 'cut') {
            handleMouseEvent(e);
        }
    });

    canvas.addEventListener('mouseup', function(e) {
        if (e.button !== 0) return;
        handleMouseEvent(e);
        isMouseDown = false;
        lastSampleIndex = -1;
        lastSignalIndex = -1;
    });

    document.addEventListener('mouseup', function(e) {
        if (e.button !== 0) return;
        if (isMouseDown) {
            isMouseDown = false;
            if (typeof endSignalDrag === 'function') {
                endSignalDrag();
            }
        }
    });

    // Context menu for signals
    canvas.addEventListener('contextmenu', handleCanvasContextMenu);

    // Ctrl + mouse wheel adjusts the cell width, so more or fewer clock
    // cycles fit on one page (issue #10)
    canvas.addEventListener('wheel', function(e) {
        if (!e.ctrlKey) return;
        e.preventDefault();
        if (e.deltaY < 0) {
            if (typeof zoomIn === 'function') zoomIn();
        } else {
            if (typeof zoomOut === 'function') zoomOut();
        }
    }, { passive: false });

    // Double-click: rename a signal from its name, or add a signal from the
    // empty area below the rows (issue #8)
    canvas.addEventListener('dblclick', async function(e) {
        const rect = canvas.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;

        const signals = document_wave.signalList();
        const rowHeight = 40;
        const signalStartY = 40;
        const signalIndex = Math.floor((mouseY - signalStartY) / rowHeight);

        // Below all signal rows: quick add via the existing add-signal menu
        if (signalIndex >= signals.length && typeof showAddSignalContextMenu === 'function') {
            showAddSignalContextMenu(e.clientX, e.clientY);
            return;
        }

        // On the name column: rename
        const nameWidth = typeof getDynamicNameWidth === 'function' ? getDynamicNameWidth() : 200;
        if (mouseX >= nameWidth) return;
        if (signalIndex < 0 || signalIndex >= signals.length) return;
        const signal = signals[signalIndex];
        if (signal.type === SignalType.BlankRow) return;

        const newName = await wpPrompt('Enter new signal name:', signal.name, 'Rename Signal');
        if (newName && newName.trim()) {
            document_wave.setSignalName(signalIndex, newName.trim());
            drawWaveform();
        }
    });
}

// Export for module use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { initCanvasHandlers };
}
