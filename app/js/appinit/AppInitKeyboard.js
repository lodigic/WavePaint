/**
 * AppInitKeyboard.js - Keyboard event initialization
 */

/**
 * Initializes keyboard event handlers.
 */
function initKeyboardHandlers() {
    document.addEventListener('keydown', function(e) {
        if (wpModalState.isOpen) return;

        // Ignore shortcuts while typing in inputs/textareas (except Escape),
        // otherwise typing e.g. a tool letter in a field triggers the tool
        const target = e.target;
        const isTextInput = target && (target.tagName === 'INPUT' ||
            target.tagName === 'TEXTAREA' || target.isContentEditable);
        if (isTextInput && e.key !== 'Escape') return;

        const isMac = navigator.platform.toUpperCase().includes('MAC');
        const ctrlOrCmd = isMac ? e.metaKey : e.ctrlKey;
        
        // Ctrl+A to select all signals
        if (ctrlOrCmd && (e.key === 'a' || e.key === 'A')) {
            const signals = document_wave.signalList();
            if (signals && signals.length > 0) {
                e.preventDefault();
                selectedSignalIndices = signals.map((_, i) => i);
                lastSelectedSignalIndex = signals.length - 1;
                drawWaveform();
                return;
            }
        }
        
        // Ctrl+Z for undo
        if (ctrlOrCmd && (e.key === 'z' || e.key === 'Z')) {
            e.preventDefault();
            const didUndo = document_wave.undo();
            if (didUndo) {
                if (selectedSignalIndex >= document_wave.signalList().length) {
                    selectedSignalIndex = -1;
                }
                drawWaveform();
                updateSidePanels();
                updateColorPicker();
            }
            return;
        }
        
        // Ctrl+Y for redo
        if (ctrlOrCmd && (e.key === 'y' || e.key === 'Y')) {
            e.preventDefault();
            const didRedo = document_wave.redo();
            if (didRedo) {
                if (selectedSignalIndex >= document_wave.signalList().length) {
                    selectedSignalIndex = -1;
                }
                drawWaveform();
                updateSidePanels();
                updateColorPicker();
            }
            return;
        }
        
        // Ctrl+C for copy (only works when select tool is active)
        if (ctrlOrCmd && (e.key === 'c' || e.key === 'C')) {
            // First check if signals are selected (name area selection)
            if (selectedSignalIndices.length > 0) {
                e.preventDefault();
                const signals = document_wave.signalList();
                const copiedSignals = [];
                for (const idx of selectedSignalIndices) {
                    // Full clone: keeps substeps/clock data (issue #11)
                    copiedSignals.push(cloneSignalData(signals[idx]));
                }
                signalClipboard = { signals: copiedSignals, count: copiedSignals.length };
                // Clear value clipboard to avoid confusion
                clipboard = null;
                console.log(`Copied ${copiedSignals.length} signal(s) to clipboard`);
                return;
            }
            // Then check range selection for waveform data
            if (rangeSelActive && currentTool === 'select') {
                e.preventDefault();
                // Clear signal clipboard to avoid confusion
                signalClipboard = null;
                copySelection();
                return;
            }
        }
        
        // Ctrl+V for paste
        if (ctrlOrCmd && (e.key === 'v' || e.key === 'V')) {
            // If select tool is active and we have value clipboard, paste values (priority)
            if (currentTool === 'select' && clipboard && clipboard.signals && clipboard.signals.length > 0) {
                e.preventDefault();
                pasteClipboard();
                return;
            }
            // Otherwise, if we have signals selected by name and signal clipboard, paste new signals
            if (signalClipboard && signalClipboard.signals && signalClipboard.signals.length > 0 && selectedSignalIndices.length > 0) {
                e.preventDefault();
                document_wave.pushUndoSnapshot();
                const signals = document_wave.signalList();
                // Insert after last selected signal, or at end
                let insertIndex = Math.max(...selectedSignalIndices) + 1;
                for (const sig of signalClipboard.signals) {
                    // Full clone: keeps substeps/clock data (issue #11)
                    const newSignal = cloneSignalData(sig, ' (copy)');
                    signals.splice(insertIndex, 0, newSignal);
                    insertIndex++;
                }
                selectedSignalIndices = [];
                lastSelectedSignalIndex = -1;
                drawWaveform();
                updateSidePanels();
                return;
            }
        }
        
        // Ctrl+X for cut (copy + delete) (only works when select tool is active)
        if (ctrlOrCmd && (e.key === 'x' || e.key === 'X')) {
            if (rangeSelActive && currentTool === 'select') {
                e.preventDefault();
                copySelection();
                deleteSelection();
                return;
            }
        }
        
        // Delete key to delete selection (only works when select tool is active)
        if (e.key === 'Delete' && rangeSelActive && currentTool === 'select') {
            e.preventDefault();
            deleteSelection();
            return;
        }
        
        // Escape to cancel current tool
        if (e.key === 'Escape') {
            // Close any open context menu
            const contextMenu = document.querySelector('.context-menu');
            if (contextMenu) {
                contextMenu.remove();
            }
            
            // Clear object selection (arrows, markers, text annotations, etc.)
            if (typeof clearObjectSelection === 'function') {
                clearObjectSelection();
            }
            
            // Clear clipboard when pressing Escape (second time if selection was already cleared)
            if (!rangeSelActive && !rangeSelecting && clipboard) {
                clipboard = null;
                pastePreviewSignal = -1;
                pastePreviewSample = -1;
                console.log('Clipboard cleared');
                drawWaveform();
            }
            
            cancelCurrentTool();
            if (selectedSignalIndices.length > 0) {
                selectedSignalIndices = [];
                lastSelectedSignalIndex = -1;
                drawWaveform();
            }
            currentTool = 'none';
            document.querySelectorAll('.tool-btn').forEach(btn => {
                btn.classList.remove('active');
            });
            drawWaveform();
            e.preventDefault();
        }
        
        // Delete key to remove selected signals (only if no range selection active)
        if (e.key === 'Delete' && selectedSignalIndices.length > 0 && !rangeSelActive) {
            e.preventDefault();
            const count = selectedSignalIndices.length;
            const confirmMsg = count > 1 
                ? `Are you sure you want to delete ${count} signals?`
                : `Are you sure you want to delete the selected signal?`;
            wpConfirm(confirmMsg, 'Delete Signal').then((confirmed) => {
                if (confirmed) {
                    document_wave.removeSignals(selectedSignalIndices);
                    clearSignalSelection();
                    drawWaveform();
                }
            });
        }
        
        const noModifiers = !e.ctrlKey && !e.metaKey && !e.altKey;

        // Zoom hotkeys: +/- adjust the cell width (issue #10)
        if (noModifiers && (e.key === '+' || e.key === '=')) {
            e.preventDefault();
            if (typeof zoomIn === 'function') zoomIn();
            return;
        }
        if (noModifiers && (e.key === '-' || e.key === '_')) {
            e.preventDefault();
            if (typeof zoomOut === 'function') zoomOut();
            return;
        }

        // Tool hotkeys (issue #7) - single letters, no modifiers.
        // Note: 0/1/x/z/u/d select the paint bit state (see BitStatePicker.js)
        if (noModifiers) {
            const toolKeyMap = {
                'p': 'paint',
                'e': 'erase',
                's': 'select',
                'a': 'arrow',
                'r': 'time-span',
                'm': 'marker',
                'j': 'time-jump',
                't': 'text',
                'c': 'cut',
                'v': 'select-object'
            };
            const tool = toolKeyMap[e.key.toLowerCase()];
            if (tool) {
                e.preventDefault();
                setCurrentTool(tool);
                drawWaveform();
            }
        }
    });
}

// Export for module use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { initKeyboardHandlers };
}
