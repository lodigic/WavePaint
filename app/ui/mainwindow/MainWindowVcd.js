/**
 * MainWindowVcd.js - VCD import/export functions
 */

/**
 * Import VCD file action
 */
async function importVcdAction() {
    try {
        if (typeof VcdIO === 'undefined') {
            await wpAlert('VCD import not available', 'Error');
            return;
        }

        // Show file size limits
        const config = VcdIO.getConfig();
        const confirm = await wpConfirm(
            `VCD Import limits for web:\n• Max file size: ${config.maxFileSizeMB}MB\n• Max samples: ${config.maxSamples.toLocaleString()}\n• Max signals: ${config.maxSignals}\n\nContinue?`,
            'Import VCD File'
        );
        if (!confirm) return;

        // Import with progress (could add a progress dialog here)
        const success = await VcdIO.loadFromVcd(document_wave, (progress) => {
            // Could update a progress bar here
            console.log(`VCD import progress: ${progress}%`);
            return true; // Continue
        });

        if (success) {
            // Update sample count spinner
            const sampleSpin = document.getElementById('sample-spin');
            if (sampleSpin) {
                sampleSpin.value = document_wave.m_sampleCount;
            }
            
            // Show VCD hierarchy panel
            if (typeof VcdHierarchyPanel !== 'undefined') {
                VcdHierarchyPanel.rebuildHierarchy(document_wave);
            }
            
            drawWaveform();
            updateSidePanels();
            
            await wpAlert(
                `VCD file imported successfully!\n${document_wave.m_vcdSignals.length} signals loaded.\n\nUse the VCD Signals panel to add signals to the waveform.`,
                'Import VCD'
            );
        } else {
            const error = VcdIO.getLastError();
            await wpAlert('Failed to import VCD file: ' + (error || 'Unknown error'), 'Error');
        }
    } catch (error) {
        console.error('Error importing VCD:', error);
        await wpAlert('Failed to import VCD file: ' + error.message, 'Error');
    }
}

/**
 * Export VCD file action
 */
async function exportVcdAction() {
    try {
        if (typeof VcdIO === 'undefined') {
            await wpAlert('VCD export not available', 'Error');
            return;
        }

        // Check if there are signals to export (prioritize main signals over VCD signals)
        const mainSignals = document_wave.m_signals ? 
            document_wave.m_signals.filter(s => s && s.type !== SignalType.BlankRow) : [];
        const vcdSignals = document_wave.m_vcdSignals ? 
            document_wave.m_vcdSignals.filter(s => s && s.type !== SignalType.BlankRow) : [];
        
        const hasMainSignals = mainSignals.length > 0;
        const hasVcdSignals = vcdSignals.length > 0;
        
        if (!hasMainSignals && !hasVcdSignals) {
            await wpAlert('No signals to export.\n\nAdd signals to the waveform first, or import a VCD file.', 'Export VCD');
            return;
        }

        // Inform user which signals will be exported
        let exportInfo = '';
        if (hasMainSignals) {
            exportInfo = `Will export ${mainSignals.length} signal(s) from the waveform.`;
        } else if (hasVcdSignals) {
            exportInfo = `Will export ${vcdSignals.length} VCD signal(s).\n\nNote: Transfer VCD signals to waveform for editing before export.`;
        }

        const fileName = await wpPrompt(`${exportInfo}\n\nEnter file name:`, 'waveform.vcd', 'Export VCD');
        if (fileName) {
            const success = await VcdIO.saveAsVcd(document_wave, fileName);
            if (success) {
                const exportedCount = hasMainSignals ? mainSignals.length : vcdSignals.length;
                await wpAlert(`VCD file exported successfully!\n\n${exportedCount} signal(s) exported.`, 'Export VCD');
            } else {
                const error = VcdIO.getLastError();
                if (error) {
                    await wpAlert('Failed to export VCD file: ' + error, 'Error');
                }
            }
        }
    } catch (error) {
        console.error('Error exporting VCD:', error);
        await wpAlert('Failed to export VCD file: ' + error.message, 'Error');
    }
}

/**
 * Toggle VCD panel visibility
 */
function toggleVcdPanel() {
    if (typeof VcdHierarchyPanel !== 'undefined') {
        if (VcdHierarchyPanel.isOpen()) {
            VcdHierarchyPanel.hide();
        } else {
            VcdHierarchyPanel.show();
            // Rebuild if we have VCD signals
            if (document_wave.m_vcdSignals && document_wave.m_vcdSignals.length > 0) {
                VcdHierarchyPanel.rebuildHierarchy(document_wave);
            }
        }
    }
}

// Export for module use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { importVcdAction, exportVcdAction, toggleVcdPanel };
}
