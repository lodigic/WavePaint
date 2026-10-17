/**
 * AppInitToolbar.js - Toolbar initialization and handlers
 */

/**
 * Initializes toolbar button handlers.
 */
function initToolbarHandlers() {
    // Toolbar buttons - Open and Save
    const toolOpenBtn = document.getElementById('tool-open');
    const toolSaveBtn = document.getElementById('tool-save');

    if (toolOpenBtn) {
        toolOpenBtn.onclick = async function() {
            console.log('=== OPEN BUTTON CLICKED ===');
            try {
                const success = await openFile(document_wave);
                if (success) {
                    selectedSignalIndex = -1;
                    document.getElementById('sample-spin').value = document_wave.m_sampleCount;
                    document.getElementById('substep-spin').value = document_wave.m_subStepCount;
                    drawWaveform();
                    updateSidePanels();
                    updateColorPicker();
                    await wpAlert('File loaded successfully!', 'Open File');
                }
            } catch (error) {
                console.error('Error in Open:', error);
            }
        };
    }

    if (toolSaveBtn) {
        toolSaveBtn.onclick = async function() {
            console.log('=== SAVE BUTTON CLICKED ===');
            try {
                const fileName = await wpPrompt('Enter file name:', 'waveform.wp', 'Save File');
                if (fileName) {
                    const success = await saveToFile(document_wave, fileName);
                    if (success) {
                        await wpAlert('File saved successfully!', 'Save File');
                    } else {
                        await wpAlert('Failed to save file.', 'Save File');
                    }
                }
            } catch (error) {
                console.error('Error in Save:', error);
            }
        };
    }

    // Zoom controls
    const zoomOutBtn = document.querySelector('.tool-btn[title="Zoom Out"]');
    const zoomInBtn = document.querySelector('.tool-btn[title="Zoom In"]');
    const zoomFitBtn = document.querySelector('.tool-btn[title="Zoom Fit"]');

    if (zoomOutBtn) {
        zoomOutBtn.addEventListener('click', () => {
            if (typeof zoomOut === 'function') zoomOut();
        });
    }

    if (zoomInBtn) {
        zoomInBtn.addEventListener('click', () => {
            if (typeof zoomIn === 'function') zoomIn();
        });
    }

    if (zoomFitBtn) {
        zoomFitBtn.addEventListener('click', () => {
            if (typeof zoomFit === 'function') zoomFit();
        });
    }

    // Undo / Redo controls
    const undoBtn = document.getElementById('tool-undo');
    const redoBtn = document.getElementById('tool-redo');

    const applyUndoRedo = (didChange) => {
        if (!didChange) return;
        if (selectedSignalIndex >= document_wave.signalList().length) {
            selectedSignalIndex = -1;
        }
        drawWaveform();
        updateSidePanels();
        updateColorPicker();
    };

    if (undoBtn) {
        undoBtn.addEventListener('click', () => {
            const didUndo = document_wave.undo();
            applyUndoRedo(didUndo);
        });
    }

    if (redoBtn) {
        redoBtn.addEventListener('click', () => {
            const didRedo = document_wave.redo();
            applyUndoRedo(didRedo);
        });
    }

    // Tool buttons
    document.querySelectorAll('.tool-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const tool = this.getAttribute('data-tool');
            if (tool) {
                setCurrentTool(tool);
            }
        });
    });

    // Paint color button
    const paintColorBtn = document.getElementById('tool-paint-color');
    if (paintColorBtn) {
        paintColorBtn.addEventListener('click', async function() {
            const newColor = await openColorPicker(getCurrentPaintColor(), paintColorBtn, 'Paint Color');
            if (newColor) {
                selectedPaintColor = newColor;
                updatePaintColorBox();
            }
        });
    }
    updatePaintColorBox();

    // Dropdown handling
    initDropdownHandlers();

    // Spinners
    document.getElementById('sample-spin').addEventListener('input', function() {
        document_wave.setSampleCount(parseInt(this.value));
        drawWaveform();
    });

    document.getElementById('substep-spin').addEventListener('input', function() {
        document_wave.setSubStepCount(parseInt(this.value));
        drawWaveform();
    });

    // Color picker
    document.getElementById('signal-color').addEventListener('input', function() {
        if (selectedSignalIndex >= 0) {
            document_wave.setSignalColor(selectedSignalIndex, this.value);
            drawWaveform();
        }
    });
}

// Export for module use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { initToolbarHandlers };
}
