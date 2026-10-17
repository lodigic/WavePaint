/**
 * MainWindowActions.js - Main action handler
 */

async function handleAction(action) {
    console.log('handleAction called with action:', action);
    
    // Guard: ensure document_wave is initialized
    if (!document_wave) {
        console.error('handleAction called before document_wave initialized');
        return;
    }
    
    console.log('document_wave is initialized, processing action...');
    
    switch (action) {
        case 'theme':
            await toggleTheme();
            break;
        case 'time-axis':
            // Toggle time axis: when enabling, prompt for configuration like C++ dialog
            if (!timeAxisEnabled) {
                // Ask for unit
                const unit = await wpPrompt('Time unit (ps, ns, μs, ms, s):', timeUnit, 'Time Axis');
                if (unit === null) break; // cancelled
                const normalized = (unit === 'u' || unit === 'us') ? 'μs' : unit;
                if (!['ps','ns','μs','ms','s'].includes(normalized)) {
                    await wpAlert('Invalid unit, using ns', 'Time Axis');
                    timeUnit = 'ns';
                } else {
                    timeUnit = normalized;
                }
                // Ask for time per main step
                const tpsStr = await wpPrompt('Time per main step (number):', String(timePerStep), 'Time Axis');
                if (tpsStr === null) break; // cancelled
                const tps = parseFloat(tpsStr);
                if (isNaN(tps) || tps <= 0) {
                    await wpAlert('Invalid value, using 10', 'Time Axis');
                    timePerStep = 10.0;
                } else {
                    timePerStep = tps;
                }
                timeAxisEnabled = true;
            } else {
                timeAxisEnabled = false;
            }
            drawWaveform();
            break;
        case 'toggle-axis-visibility':
            // Hide/show the axis header entirely (issue #4)
            axisNumbersHidden = !axisNumbersHidden;
            {
                const axisItem = document.querySelector('[data-action="toggle-axis-visibility"]');
                if (axisItem) {
                    axisItem.textContent = axisNumbersHidden ? 'Show Axis Numbers' : 'Hide Axis Numbers';
                }
            }
            drawWaveform();
            break;
        case 'bit-signal':
            {
                const bitName = await wpPrompt('Enter bit signal name:', 'Bit Signal', 'Add Bit Signal');
                if (bitName) {
                    const idx = document_wave.addBitSignal(bitName);
                    // Apply paint color if selected
                    if (typeof getSelectedPaintColor === 'function' && getSelectedPaintColor()) {
                        document_wave.setSignalColor(idx, getSelectedPaintColor());
                    }
                    drawWaveform();
                    updateSidePanels();
                }
            }
            break;
        case 'vector-signal':
            {
                const vectorName = await wpPrompt('Enter vector signal name:', 'Vector Signal', 'Add Vector Signal');
                if (vectorName) {
                    const idx = document_wave.addVectorSignal(vectorName);
                    // Apply paint color if selected
                    if (typeof getSelectedPaintColor === 'function' && getSelectedPaintColor()) {
                        document_wave.setSignalColor(idx, getSelectedPaintColor());
                    }
                    drawWaveform();
                    updateSidePanels();
                }
            }
            break;
        case 'clock':
            await addClockSignalDialog();
            break;
        case 'counter':
            await addCounterSignalDialog();
            break;
        case 'reset':
            await addResetSignalDialog();
            break;
        case 'pulse':
            await addPulseSignalDialog();
            break;
        case 'strobe':
            await addStrobeSignalDialog();
            break;
        case 'pwm':
            await addPWMSignalDialog();
            break;
        case 'ramp':
            await addRampSignalDialog();
            break;
        case 'walking-one':
            await addWalkingOneSignalDialog();
            break;
        case 'walking-zero':
            await addWalkingZeroSignalDialog();
            break;
        case 'bus-idle':
            await addBusIdleSignalDialog();
            break;
        case 'alternating':
            await addAlternatingSignalDialog();
            break;
        case 'gray-code':
            await addGrayCodeSignalDialog();
            break;
        case 'blank-row':
            document_wave.addBlankRow();
            drawWaveform();
            updateSidePanels();
            break;
        case 'tutorial':
            localStorage.removeItem('wavepaint_tutorial_done');
            if (typeof queueTutorial === 'function') {
                queueTutorial();
            } else if (typeof runTutorial === 'function') {
                runTutorial();
            }
            break;
        case 'contact':
            showContactPopup();
            break;
        case 'clear-all-signals':
            if (typeof document_wave.clearAllWaveView === 'function') {
                document_wave.clearAllWaveView();
            } else {
                document_wave.clearAllSignals();
            }
            if (typeof selectedSignalIndex !== 'undefined') {
                selectedSignalIndex = -1;
            }
            drawWaveform();
            updateSidePanels();
            break;
        
        // WaveDrom import/export actions
        case 'import-wavedrom':
            await importWaveDromAction();
            break;
        case 'export-wavedrom':
            await exportWaveDromAction();
            break;
        case 'show-wavedrom-code':
            await showWaveDromCodeAction();
            break;
        case 'wavedrom-debug':
            toggleWaveDromDebugPanel();
            break;
        
        // Export Image actions
        case 'export-png':
            await exportToPNG();
            break;
        case 'export-svg':
            await exportToSVG();
            break;
        case 'export-jpg':
            await exportToJPG();
            break;
        
        // VCD import/export actions
        case 'import-vcd':
            await importVcdAction();
            break;
        case 'export-vcd':
            await exportVcdAction();
            break;
        case 'toggle-vcd-panel':
            toggleVcdPanel();
            break;
        
        // TXT/CSV export actions
        case 'export-txt':
            await exportTxtAction();
            break;
        case 'export-csv':
            await exportCsvAction();
            break;
            
        default:
            console.log('Action:', action);
    }
}

// Export for module use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { handleAction };
}
