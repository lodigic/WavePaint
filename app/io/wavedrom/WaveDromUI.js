// WaveDromUI.js - UI functions for WaveDrom I/O (file dialogs, modals)
console.log('Loading WaveDromUI.js...');

// Key for localStorage to remember if user dismissed the warning
const WAVEDROM_WARNING_DISMISSED_KEY = 'wavepaint_wavedrom_warning_dismissed';

/**
 * Show a warning popup about WaveDrom limitations
 * @param {string} action - The action being performed ('import', 'export', 'open')
 * @returns {Promise<boolean>} - True if user wants to continue, false otherwise
 */
async function showWaveDromCompatibilityWarning(action = 'import') {
    // Check if user has dismissed this warning before
    const dismissed = localStorage.getItem(WAVEDROM_WARNING_DISMISSED_KEY);
    if (dismissed === 'true') {
        return true;
    }
    
    return new Promise((resolve) => {
        // Create overlay
        const overlay = document.createElement('div');
        overlay.className = 'wp-wavedrom-warning-overlay';
        
        // Create modal
        const modal = document.createElement('div');
        modal.className = 'wp-wavedrom-warning-modal';
        
        // Determine action text
        let actionText = 'work with';
        if (action === 'import') actionText = 'import';
        else if (action === 'export') actionText = 'export';
        else if (action === 'open') actionText = 'open';
        
        modal.innerHTML = `
            <div class="wp-wavedrom-warning-header">
                <span class="wp-wavedrom-warning-icon">⚠️</span>
                <h3 class="wp-wavedrom-warning-title">WaveDrom Compatibility</h3>
                <button class="wp-wavedrom-warning-close" aria-label="Close">×</button>
            </div>
            <div class="wp-wavedrom-warning-body">
                <p class="wp-wavedrom-warning-intro">
                    You are about to <strong>${actionText}</strong> a file in WaveDrom format.
                </p>
                <div class="wp-wavedrom-warning-notice">
                    <p><strong>WavePaint offers more features than WaveDrom.</strong></p>
                    <p>Not all WavePaint features are supported in WaveDrom format:</p>
                    <ul class="wp-wavedrom-warning-list">
                        <li>🎨 Advanced custom colors</li>
                        <li>📝 Free text annotations</li>
                        <li>↔️ Custom arrows and connectors</li>
                        <li>📐 Advanced time markers</li>
                        <li>🔧 Some signal properties</li>
                    </ul>
                </div>
                <p class="wp-wavedrom-warning-advice">
                    💡 <strong>Tip:</strong> If you need WaveDrom compatibility, keep its limitations 
                    in mind when designing your diagram.
                </p>
            </div>
            <div class="wp-wavedrom-warning-footer">
                <label class="wp-wavedrom-warning-checkbox">
                    <input type="checkbox" id="wavedrom-warning-remember">
                    <span>Don't show again</span>
                </label>
                <div class="wp-wavedrom-warning-buttons">
                    <button class="wp-modal-btn wp-wavedrom-warning-cancel">Cancel</button>
                    <button class="wp-modal-btn primary wp-wavedrom-warning-continue">Continue</button>
                </div>
            </div>
        `;
        
        overlay.appendChild(modal);
        document.body.appendChild(overlay);
        
        // Animate in
        requestAnimationFrame(() => {
            overlay.classList.add('visible');
        });
        
        const closeModal = (continueAction) => {
            // Check if user wants to remember
            const remember = modal.querySelector('#wavedrom-warning-remember').checked;
            if (remember && continueAction) {
                localStorage.setItem(WAVEDROM_WARNING_DISMISSED_KEY, 'true');
            }
            
            overlay.classList.remove('visible');
            setTimeout(() => {
                if (overlay.parentNode) {
                    document.body.removeChild(overlay);
                }
                resolve(continueAction);
            }, 200);
        };
        
        // Event handlers
        modal.querySelector('.wp-wavedrom-warning-close').onclick = () => closeModal(false);
        modal.querySelector('.wp-wavedrom-warning-cancel').onclick = () => closeModal(false);
        modal.querySelector('.wp-wavedrom-warning-continue').onclick = () => closeModal(true);
        
        overlay.onclick = (e) => {
            if (e.target === overlay) closeModal(false);
        };
        
        // Keyboard handler
        const handleKeydown = (e) => {
            if (e.key === 'Escape') {
                closeModal(false);
                document.removeEventListener('keydown', handleKeydown);
            } else if (e.key === 'Enter') {
                closeModal(true);
                document.removeEventListener('keydown', handleKeydown);
            }
        };
        document.addEventListener('keydown', handleKeydown);
    });
}

/**
 * Reset the WaveDrom warning so it shows again
 */
function resetWaveDromWarning() {
    localStorage.removeItem(WAVEDROM_WARNING_DISMISSED_KEY);
}

/**
 * Open a file picker dialog to load WaveDrom JSON
 * @param {WaveDocument} doc - Target document
 * @returns {Promise<boolean>} Success
 */
async function openWaveDromFile(doc) {
    // Show compatibility warning first
    const shouldContinue = await showWaveDromCompatibilityWarning('open');
    if (!shouldContinue) {
        return false;
    }
    
    const importFromWaveDrom = window.WaveDromImport?.importFromWaveDrom || window.importFromWaveDrom;
    const parseWaveDromCode = window.WaveDromUtils?.parseWaveDromCode || window.parseWaveDromCode;
    
    try {
        if (window.showOpenFilePicker) {
            const [handle] = await window.showOpenFilePicker({
                types: [
                    {
                        description: 'WaveDrom files',
                        accept: { 'application/json': ['.json', '.json5', '.wavedrom'] }
                    }
                ]
            });
            
            const file = await handle.getFile();
            const content = await file.text();
            
            // Parse JSON (handles JSON5-like syntax)
            const parsed = parseWaveDromCode(content);
            if (!parsed) {
                throw new Error('Failed to parse WaveDrom file');
            }
            
            return importFromWaveDrom(doc, parsed);
        } else {
            // Fallback for browsers without File System Access API
            return new Promise((resolve) => {
                const input = document.createElement('input');
                input.type = 'file';
                input.accept = '.json,.json5,.wavedrom';
                
                input.onchange = async (e) => {
                    const file = e.target.files[0];
                    if (!file) {
                        resolve(false);
                        return;
                    }
                    
                    const content = await file.text();
                    const parsed = parseWaveDromCode(content);
                    if (!parsed) {
                        resolve(false);
                        return;
                    }
                    
                    resolve(importFromWaveDrom(doc, parsed));
                };
                
                input.click();
            });
        }
    } catch (error) {
        console.error('Error opening WaveDrom file:', error);
        return false;
    }
}

/**
 * Save document as WaveDrom JSON file
 * @param {WaveDocument} doc - Source document
 * @param {string} fileName - Output file name
 * @returns {Promise<boolean>} Success
 */
async function saveAsWaveDrom(doc, fileName = 'waveform.json') {
    // Show compatibility warning first
    const shouldContinue = await showWaveDromCompatibilityWarning('export');
    if (!shouldContinue) {
        return false;
    }
    
    const exportToWaveDromString = window.WaveDromExport?.exportToWaveDromString || window.exportToWaveDromString;
    
    try {
        const jsonStr = exportToWaveDromString(doc, true);
        
        if (window.showSaveFilePicker) {
            const handle = await window.showSaveFilePicker({
                suggestedName: fileName,
                types: [
                    {
                        description: 'WaveDrom JSON',
                        accept: { 'application/json': ['.json'] }
                    }
                ]
            });
            
            const writable = await handle.createWritable();
            await writable.write(jsonStr);
            await writable.close();
        } else {
            // Fallback download
            const blob = new Blob([jsonStr], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = fileName;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        }
        
        return true;
    } catch (error) {
        console.error('Error saving WaveDrom file:', error);
        return false;
    }
}

/**
 * Show WaveDrom code in a modal dialog
 * @param {WaveDocument} doc - Source document
 */
async function showWaveDromCode(doc) {
    // Show compatibility warning first
    const shouldContinue = await showWaveDromCompatibilityWarning('export');
    if (!shouldContinue) {
        return;
    }
    
    const exportToWaveDromString = window.WaveDromExport?.exportToWaveDromString || window.exportToWaveDromString;
    const exportToWaveDrom = window.WaveDromExport?.exportToWaveDrom || window.exportToWaveDrom;
    const escapeHtml = window.WaveDromUtils?.escapeHtml || ((s) => s.replace(/</g, '&lt;').replace(/>/g, '&gt;'));
    
    const jsonStr = exportToWaveDromString(doc, true);
    
    // Create modal
    const overlay = document.createElement('div');
    overlay.className = 'wp-modal-overlay';
    overlay.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.5);display:flex;align-items:center;justify-content:center;z-index:10000;';
    
    const modal = document.createElement('div');
    modal.className = 'wp-modal';
    modal.style.cssText = 'background:var(--bg-color,#fff);border-radius:8px;max-width:800px;width:90%;max-height:80vh;display:flex;flex-direction:column;';
    
    modal.innerHTML = `
        <div class="wp-modal-header" style="padding:15px 20px;border-bottom:1px solid var(--border-color,#ccc);display:flex;justify-content:space-between;align-items:center;">
            <h3 style="margin:0;color:var(--text-color,#000);">WaveDrom Code</h3>
            <button class="close-btn" style="background:none;border:none;font-size:20px;cursor:pointer;color:var(--text-color,#000);">×</button>
        </div>
        <div class="wp-modal-body" style="padding:20px;flex:1;overflow:auto;">
            <textarea id="wavedrom-code" readonly style="width:100%;height:400px;font-family:monospace;font-size:13px;padding:10px;border:1px solid var(--border-color,#ccc);border-radius:4px;resize:vertical;background:var(--input-bg,#f5f5f5);color:var(--text-color,#000);">${escapeHtml(jsonStr)}</textarea>
        </div>
        <div class="wp-modal-footer" style="padding:15px 20px;border-top:1px solid var(--border-color,#ccc);display:flex;justify-content:flex-end;gap:10px;">
            <button id="copy-btn" class="wp-modal-btn" style="padding:8px 16px;cursor:pointer;">Copy to Clipboard</button>
            <button id="preview-btn" class="wp-modal-btn" style="padding:8px 16px;cursor:pointer;">Open in WaveDrom Editor</button>
            <button id="close-modal-btn" class="wp-modal-btn primary" style="padding:8px 16px;cursor:pointer;background:var(--accent,#4a90d9);color:#fff;border:none;border-radius:4px;">Close</button>
        </div>
    `;
    
    overlay.appendChild(modal);
    document.body.appendChild(overlay);
    
    // Event handlers
    const closeModal = () => {
        document.body.removeChild(overlay);
    };
    
    modal.querySelector('.close-btn').onclick = closeModal;
    modal.querySelector('#close-modal-btn').onclick = closeModal;
    overlay.onclick = (e) => {
        if (e.target === overlay) closeModal();
    };
    
    modal.querySelector('#copy-btn').onclick = async () => {
        const textarea = modal.querySelector('#wavedrom-code');
        textarea.select();
        await navigator.clipboard.writeText(jsonStr);
        modal.querySelector('#copy-btn').textContent = 'Copied!';
        setTimeout(() => {
            modal.querySelector('#copy-btn').textContent = 'Copy to Clipboard';
        }, 2000);
    };
    
    modal.querySelector('#preview-btn').onclick = () => {
        const waveJson = exportToWaveDrom(doc);
        const encoded = encodeURIComponent(JSON.stringify(waveJson));
        window.open(`https://wavedrom.com/editor.html?${encoded}`, '_blank');
    };
}

/**
 * Show import dialog for WaveDrom code
 * @param {WaveDocument} doc - Target document
 * @param {function} onImport - Callback after successful import
 */
async function showWaveDromImportDialog(doc, onImport) {
    // Show compatibility warning first
    const shouldContinue = await showWaveDromCompatibilityWarning('import');
    if (!shouldContinue) {
        return;
    }
    
    const importFromWaveDrom = window.WaveDromImport?.importFromWaveDrom || window.importFromWaveDrom;
    const parseWaveDromCode = window.WaveDromUtils?.parseWaveDromCode || window.parseWaveDromCode;
    
    // Create modal
    const overlay = document.createElement('div');
    overlay.className = 'wp-modal-overlay';
    overlay.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.5);display:flex;align-items:center;justify-content:center;z-index:10000;';
    
    const modal = document.createElement('div');
    modal.className = 'wp-modal';
    modal.style.cssText = 'background:var(--bg-color,#fff);border-radius:8px;max-width:800px;width:90%;max-height:80vh;display:flex;flex-direction:column;';
    
    modal.innerHTML = `
        <div class="wp-modal-header" style="padding:15px 20px;border-bottom:1px solid var(--border-color,#ccc);display:flex;justify-content:space-between;align-items:center;">
            <h3 style="margin:0;color:var(--text-color,#000);">Import WaveDrom Code</h3>
            <button class="close-btn" style="background:none;border:none;font-size:20px;cursor:pointer;color:var(--text-color,#000);">×</button>
        </div>
        <div class="wp-modal-body" style="padding:20px;flex:1;overflow:auto;">
            <p style="margin-top:0;color:var(--text-color,#666);">Paste WaveDrom JSON code below:</p>
            <textarea id="wavedrom-input" style="width:100%;height:300px;font-family:monospace;font-size:13px;padding:10px;border:1px solid var(--border-color,#ccc);border-radius:4px;resize:vertical;background:var(--input-bg,#fff);color:var(--text-color,#000);" placeholder='{ "signal": [ { "name": "clk", "wave": "p......" } ] }'></textarea>
            <div id="import-error" style="color:#f44336;margin-top:10px;display:none;"></div>
        </div>
        <div class="wp-modal-footer" style="padding:15px 20px;border-top:1px solid var(--border-color,#ccc);display:flex;justify-content:flex-end;gap:10px;">
            <button id="cancel-btn" class="wp-modal-btn" style="padding:8px 16px;cursor:pointer;">Cancel</button>
            <button id="import-btn" class="wp-modal-btn primary" style="padding:8px 16px;cursor:pointer;background:var(--accent,#4a90d9);color:#fff;border:none;border-radius:4px;">Import</button>
        </div>
    `;
    
    overlay.appendChild(modal);
    document.body.appendChild(overlay);
    
    const closeModal = () => {
        document.body.removeChild(overlay);
    };
    
    modal.querySelector('.close-btn').onclick = closeModal;
    modal.querySelector('#cancel-btn').onclick = closeModal;
    overlay.onclick = (e) => {
        if (e.target === overlay) closeModal();
    };
    
    modal.querySelector('#import-btn').onclick = () => {
        const textarea = modal.querySelector('#wavedrom-input');
        const errorDiv = modal.querySelector('#import-error');
        const code = textarea.value.trim();
        
        if (!code) {
            errorDiv.textContent = 'Please enter WaveDrom code';
            errorDiv.style.display = 'block';
            return;
        }
        
        const parsed = parseWaveDromCode(code);
        if (!parsed) {
            errorDiv.textContent = 'Invalid JSON format. Please check your code.';
            errorDiv.style.display = 'block';
            return;
        }
        
        const success = importFromWaveDrom(doc, parsed);
        if (success) {
            closeModal();
            if (onImport) onImport();
        } else {
            errorDiv.textContent = 'Failed to import WaveDrom. Check the signal format.';
            errorDiv.style.display = 'block';
        }
    };
    
    // Focus the textarea
    setTimeout(() => {
        modal.querySelector('#wavedrom-input').focus();
    }, 100);
}

// Export for use in other modules
if (typeof window !== 'undefined') {
    window.WaveDromUI = {
        openWaveDromFile,
        saveAsWaveDrom,
        showWaveDromCode,
        showWaveDromImportDialog,
        showWaveDromCompatibilityWarning,
        resetWaveDromWarning
    };
}
