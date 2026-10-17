/**
 * Example Loader - Dialog for loading example waveform files
 * 
 * Provides the UI dialog to select and load example files.
 */

/**
 * Opens a dialog to select and load an example file.
 */
async function openLoadExampleDialog() {
    const examples = getExampleList();
    
    // Create overlay
    const overlay = document.createElement('div');
    overlay.style.cssText = 'position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 10000;';
    
    // Create dialog
    const dialog = document.createElement('div');
    dialog.style.cssText = 'background: var(--menu-bg); border: 1px solid var(--border-color); border-radius: 8px; padding: 20px; min-width: 320px; box-shadow: 0 8px 24px rgba(0,0,0,0.3);';
    
    // Title
    const title = document.createElement('h3');
    title.textContent = 'Load Example';
    title.style.cssText = 'margin: 0 0 15px 0; color: var(--text-color); font-size: 16px;';
    dialog.appendChild(title);
    
    // Description
    const desc = document.createElement('p');
    desc.textContent = 'Select an example waveform to load:';
    desc.style.cssText = 'margin: 0 0 15px 0; color: var(--text-color); font-size: 13px;';
    dialog.appendChild(desc);
    
    // Select dropdown
    const select = document.createElement('select');
    select.style.cssText = 'width: 100%; padding: 8px 10px; border: 1px solid var(--border-color); border-radius: 4px; background: var(--bg-color); color: var(--text-color); font-size: 13px; margin-bottom: 20px; cursor: pointer;';
    
    examples.forEach(ex => {
        const option = document.createElement('option');
        option.value = ex.id;
        option.textContent = ex.name;
        select.appendChild(option);
    });
    dialog.appendChild(select);
    
    // Buttons container
    const buttons = document.createElement('div');
    buttons.style.cssText = 'display: flex; justify-content: flex-end; gap: 10px;';
    
    // Cancel button
    const cancelBtn = document.createElement('button');
    cancelBtn.textContent = 'Cancel';
    cancelBtn.style.cssText = 'padding: 8px 16px; border: 1px solid var(--border-color); border-radius: 4px; background: var(--bg-color); color: var(--text-color); cursor: pointer;';
    buttons.appendChild(cancelBtn);
    
    // Load button
    const loadBtn = document.createElement('button');
    loadBtn.textContent = 'Load';
    loadBtn.style.cssText = 'padding: 8px 16px; border: none; border-radius: 4px; background: var(--accent); color: #fff; cursor: pointer; font-weight: 500;';
    buttons.appendChild(loadBtn);
    
    dialog.appendChild(buttons);
    overlay.appendChild(dialog);
    document.body.appendChild(overlay);
    
    // Focus select
    setTimeout(() => select.focus(), 0);
    
    return new Promise((resolve) => {
        const close = () => {
            document.body.removeChild(overlay);
        };
        
        cancelBtn.addEventListener('click', () => {
            close();
            resolve(false);
        });
        
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) {
                close();
                resolve(false);
            }
        });
        
        loadBtn.addEventListener('click', async () => {
            const selectedId = select.value;
            const selectedExample = examples.find(e => e.id === selectedId);
            close();
            
            if (selectedExample) {
                const success = await loadExample(document_wave, selectedId);
                if (success) {
                    selectedSignalIndex = -1;
                    document.getElementById('sample-spin').value = document_wave.m_sampleCount;
                    document.getElementById('substep-spin').value = document_wave.m_subStepCount;
                    drawWaveform();
                    updateSidePanels();
                    updateColorPicker();
                    await wpAlert(`Example '${selectedExample.name}' loaded successfully!`, 'Load Example');
                    resolve(true);
                } else {
                    await wpAlert(`Failed to load example '${selectedExample.name}'.`, 'Load Example');
                    resolve(false);
                }
            } else {
                resolve(false);
            }
        });
        
        // Handle Enter key on select
        select.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                loadBtn.click();
            } else if (e.key === 'Escape') {
                cancelBtn.click();
            }
        });
    });
}
