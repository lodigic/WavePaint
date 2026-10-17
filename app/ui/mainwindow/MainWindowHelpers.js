/**
 * MainWindowHelpers.js - Helper functions for MainWindow
 */

async function toggleTheme() {
    const result = await openThemeDialog();
    if (result) {
        applyTheme(result.theme);
        applyCanvasTheme(result.canvasTheme);
        // Apply skin if selected
        if (result.skin && typeof setCurrentSkin === 'function') {
            setCurrentSkin(result.skin);
        }
    }
}

function updateSidePanels() {
    // Side panel was removed - this function is now a no-op
    // Kept for compatibility with existing code that calls it
    return;
}

function selectSignal(index) {
    selectedSignalIndex = index;
    updateSidePanels();
    updateColorPicker();
}

async function renameSignal(index) {
    const signal = document_wave.signalList()[index];
    const newName = await wpPrompt('Enter new name:', signal.name, 'Rename Signal');
    if (newName && newName.trim()) {
        document_wave.setSignalName(index, newName.trim());
        updateSidePanels();
        drawWaveform();
    }
}

function updateColorPicker() {
    // Guard: ensure document_wave is initialized
    if (!document_wave) {
        return;
    }
    
    const colorPicker = document.getElementById('signal-color');
    if (selectedSignalIndex >= 0) {
        const signal = document_wave.signalList()[selectedSignalIndex];
        colorPicker.value = signal.color || '#000000';
        colorPicker.style.display = 'inline';
    } else {
        colorPicker.style.display = 'none';
    }
}

// Export for module use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        toggleTheme,
        updateSidePanels,
        selectSignal,
        renameSignal,
        updateColorPicker
    };
}
