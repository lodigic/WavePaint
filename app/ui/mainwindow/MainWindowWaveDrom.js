/**
 * MainWindowWaveDrom.js - WaveDrom import/export and debug panel
 */

/**
 * Import WaveDrom file action
 */
async function importWaveDromAction() {
    try {
        if (typeof WaveDromIO !== 'undefined' && WaveDromIO.openWaveDromFile) {
            const success = await WaveDromIO.openWaveDromFile(document_wave);
            if (success) {
                document.getElementById('sample-spin').value = document_wave.m_sampleCount;
                document.getElementById('substep-spin').value = document_wave.m_subStepCount;
                
                // Use requestAnimationFrame to stagger heavy operations
                requestAnimationFrame(() => {
                    drawWaveform();
                    updateSidePanels();
                    
                    // Defer panel opening to next frame for smoother rendering
                    requestAnimationFrame(() => {
                        openWaveDromDebugPanel();
                    });
                });
                
                await wpAlert('WaveDrom file imported successfully!', 'Import WaveDrom');
            }
        } else {
            await wpAlert('WaveDrom import not available', 'Error');
        }
    } catch (error) {
        console.error('Error importing WaveDrom:', error);
        await wpAlert('Failed to import WaveDrom file: ' + error.message, 'Error');
    }
}

/**
 * Export WaveDrom file action
 */
async function exportWaveDromAction() {
    try {
        if (typeof WaveDromIO !== 'undefined' && WaveDromIO.saveAsWaveDrom) {
            const fileName = await wpPrompt('Enter file name:', 'waveform.json', 'Export WaveDrom');
            if (fileName) {
                const success = await WaveDromIO.saveAsWaveDrom(document_wave, fileName);
                if (success) {
                    await wpAlert('WaveDrom file exported successfully!', 'Export WaveDrom');
                }
            }
        } else {
            await wpAlert('WaveDrom export not available', 'Error');
        }
    } catch (error) {
        console.error('Error exporting WaveDrom:', error);
        await wpAlert('Failed to export WaveDrom file: ' + error.message, 'Error');
    }
}

/**
 * Show WaveDrom code action
 */
async function showWaveDromCodeAction() {
    try {
        if (typeof WaveDromIO !== 'undefined' && WaveDromIO.showWaveDromCode) {
            await WaveDromIO.showWaveDromCode(document_wave);
        } else {
            await wpAlert('WaveDrom code viewer not available', 'Error');
        }
    } catch (error) {
        console.error('Error showing WaveDrom code:', error);
        await wpAlert('Failed to show WaveDrom code: ' + error.message, 'Error');
    }
}

/**
 * Toggle WaveDrom debug panel visibility
 */
let waveDromDebugPanelOpen = false;

function toggleWaveDromDebugPanel() {
    const panel = document.getElementById('wavedrom-debug-panel');
    if (!panel) return;
    
    waveDromDebugPanelOpen = !waveDromDebugPanelOpen;
    
    if (waveDromDebugPanelOpen) {
        panel.classList.remove('hidden');
        document.body.classList.add('wavedrom-debug-open');
        initWaveDromDebugHandlers();
        waveDromCodeUserEditing = false; // Reset editing state
        updateWaveDromDebugCode();
        updateSyntaxHighlighting();
        updateLineNumbers();
    } else {
        panel.classList.add('hidden');
        document.body.classList.remove('wavedrom-debug-open');
        waveDromCodeUserEditing = false;
    }
}

/**
 * Open WaveDrom debug panel (without toggle)
 */
function openWaveDromDebugPanel() {
    if (waveDromDebugPanelOpen) {
        // Already open, just refresh the code
        updateWaveDromDebugCode();
        return;
    }
    
    const panel = document.getElementById('wavedrom-debug-panel');
    if (!panel) return;
    
    waveDromDebugPanelOpen = true;
    waveDromCodeUserEditing = false; // Reset editing state
    
    // First, just show the panel (fast CSS operation)
    panel.classList.remove('hidden');
    document.body.classList.add('wavedrom-debug-open');
    
    // Defer heavy operations to next frame for smooth animation
    requestAnimationFrame(() => {
        initWaveDromDebugHandlers();
        updateWaveDromDebugCode();
        
        // Further defer syntax highlighting
        requestAnimationFrame(() => {
            updateSyntaxHighlighting();
            updateLineNumbers();
        });
    });
}

/**
 * Initialize WaveDrom debug panel button handlers
 */
let waveDromDebugHandlersInitialized = false;
let waveDromCodeUserEditing = false;
let waveDromCodeUpdateDebounceTimer = null;

function initWaveDromDebugHandlers() {
    if (waveDromDebugHandlersInitialized) return;
    waveDromDebugHandlersInitialized = true;
    
    const closeBtn = document.getElementById('wavedrom-debug-close');
    const copyBtn = document.getElementById('wavedrom-debug-copy');
    const openBtn = document.getElementById('wavedrom-debug-open');
    const refreshBtn = document.getElementById('wavedrom-preview-refresh');
    const textarea = document.getElementById('wavedrom-debug-code');
    
    if (closeBtn) {
        closeBtn.addEventListener('click', () => {
            toggleWaveDromDebugPanel();
        });
    }
    
    if (copyBtn) {
        copyBtn.addEventListener('click', async () => {
            const textarea = document.getElementById('wavedrom-debug-code');
            if (textarea) {
                await navigator.clipboard.writeText(textarea.value);
                copyBtn.textContent = '✓ Copied!';
                setTimeout(() => {
                    copyBtn.textContent = '📋 Copy';
                }, 2000);
            }
        });
    }
    
    if (openBtn) {
        openBtn.addEventListener('click', () => {
            if (typeof WaveDromIO !== 'undefined' && WaveDromIO.exportToWaveDrom) {
                const waveJson = WaveDromIO.exportToWaveDrom(document_wave);
                const encoded = encodeURIComponent(JSON.stringify(waveJson));
                window.open(`https://wavedrom.com/editor.html?${encoded}`, '_blank');
            }
        });
    }
    
    if (refreshBtn) {
        refreshBtn.addEventListener('click', () => {
            renderWaveDromPreview();
        });
    }
    
    // Setup textarea for editing
    if (textarea) {
        // Handle input for live updating waveform
        textarea.addEventListener('input', () => {
            waveDromCodeUserEditing = true;
            updateSyntaxHighlighting();
            updateLineNumbers();
            
            // Debounce the waveform update
            clearTimeout(waveDromCodeUpdateDebounceTimer);
            waveDromCodeUpdateDebounceTimer = setTimeout(() => {
                applyWaveDromCodeToWaveform();
            }, 300);
            
            // Also update the live preview in real-time
            debouncedRenderWaveDromPreview();
        });
        
        // Handle scroll sync - textarea scrolls, highlight and line numbers follow
        textarea.addEventListener('scroll', () => {
            const highlight = document.getElementById('wavedrom-highlight');
            const lineNumbers = document.getElementById('wavedrom-line-numbers');
            
            if (highlight) {
                highlight.scrollTop = textarea.scrollTop;
                highlight.scrollLeft = textarea.scrollLeft;
            }
            if (lineNumbers) {
                lineNumbers.scrollTop = textarea.scrollTop;
            }
        });
        
        // Handle tab key for indentation
        textarea.addEventListener('keydown', (e) => {
            if (e.key === 'Tab') {
                e.preventDefault();
                const start = textarea.selectionStart;
                const end = textarea.selectionEnd;
                const value = textarea.value;
                textarea.value = value.substring(0, start) + '  ' + value.substring(end);
                textarea.selectionStart = textarea.selectionEnd = start + 2;
                updateSyntaxHighlighting();
            }
        });
        
        // Mark when user stops editing (blur)
        textarea.addEventListener('blur', () => {
            waveDromCodeUserEditing = false;
        });
    }
    
    // Setup splitter for resizing code/preview panels
    initWaveDromSplitter();
}

/**
 * Initialize the draggable splitter between code editor and preview
 */
function initWaveDromSplitter() {
    const splitter = document.getElementById('wavedrom-splitter');
    const codeEditor = document.querySelector('.wavedrom-code-editor');
    const previewContainer = document.querySelector('.wavedrom-preview-container');
    const container = document.querySelector('.wavedrom-debug-content');
    
    if (!splitter || !codeEditor || !previewContainer || !container) return;
    
    let isDragging = false;
    let startX = 0;
    let startCodeWidth = 0;
    
    splitter.addEventListener('mousedown', (e) => {
        isDragging = true;
        startX = e.clientX;
        startCodeWidth = codeEditor.offsetWidth;
        splitter.classList.add('dragging');
        document.body.style.cursor = 'col-resize';
        document.body.style.userSelect = 'none';
        e.preventDefault();
    });
    
    document.addEventListener('mousemove', (e) => {
        if (!isDragging) return;
        
        const containerWidth = container.offsetWidth;
        const splitterWidth = splitter.offsetWidth;
        const deltaX = e.clientX - startX;
        let newCodeWidth = startCodeWidth + deltaX;
        
        // Enforce minimum widths
        const minWidth = 200;
        const maxCodeWidth = containerWidth - splitterWidth - minWidth;
        
        newCodeWidth = Math.max(minWidth, Math.min(newCodeWidth, maxCodeWidth));
        
        // Calculate flex ratios
        const previewWidth = containerWidth - newCodeWidth - splitterWidth;
        const codeRatio = newCodeWidth / (newCodeWidth + previewWidth);
        const previewRatio = previewWidth / (newCodeWidth + previewWidth);
        
        codeEditor.style.flex = codeRatio;
        previewContainer.style.flex = previewRatio;
    });
    
    document.addEventListener('mouseup', () => {
        if (isDragging) {
            isDragging = false;
            splitter.classList.remove('dragging');
            document.body.style.cursor = '';
            document.body.style.userSelect = '';
        }
    });
}

/**
 * Reset the user editing flag (called when user clicks on canvas)
 */
function resetWaveDromUserEditing() {
    waveDromCodeUserEditing = false;
}

/**
 * Update WaveDrom debug panel code (called on every change)
 * Only updates if user is not currently editing
 */
function updateWaveDromDebugCode() {
    if (!waveDromDebugPanelOpen) return;
    if (waveDromCodeUserEditing) return; // Don't overwrite user's edits
    
    const textarea = document.getElementById('wavedrom-debug-code');
    if (!textarea) return;
    
    try {
        if (typeof WaveDromIO !== 'undefined' && WaveDromIO.exportToWaveDromString) {
            const jsonStr = WaveDromIO.exportToWaveDromString(document_wave, true);
            textarea.value = jsonStr;
            updateSyntaxHighlighting();
            updateLineNumbers();
            setWaveDromStatus(true);
            // Immediately render preview
            debouncedRenderWaveDromPreview();
        } else {
            textarea.value = '{ signal: [] }';
        }
    } catch (error) {
        console.error('Error updating WaveDrom debug code:', error);
        textarea.value = '// Error generating code: ' + error.message;
    }
}

/**
 * Apply syntax highlighting to the code
 */
function updateSyntaxHighlighting() {
    const textarea = document.getElementById('wavedrom-debug-code');
    const highlightEl = document.getElementById('wavedrom-highlight');
    if (!textarea || !highlightEl) return;
    
    const code = textarea.value;
    const highlighted = highlightJson(code);
    const codeEl = highlightEl.querySelector('code');
    if (codeEl) {
        codeEl.innerHTML = highlighted;
    }
}

/**
 * Update line numbers
 */
function updateLineNumbers() {
    const textarea = document.getElementById('wavedrom-debug-code');
    const lineNumbersEl = document.getElementById('wavedrom-line-numbers');
    if (!textarea || !lineNumbersEl) return;
    
    const lines = textarea.value.split('\n');
    const lineCount = lines.length;
    
    let html = '';
    for (let i = 1; i <= lineCount; i++) {
        html += `<span class="line-number">${i}</span>`;
    }
    lineNumbersEl.innerHTML = html;
}

/**
 * Render WaveDrom preview in the debug panel
 */
let waveDromRenderDebounceTimer = null;
let waveDromRenderIndex = 0;

/**
 * Check if WaveDrom library is fully loaded and ready
 */
function isWaveDromReady() {
    return typeof WaveDrom !== 'undefined' && 
           typeof WaveDrom.RenderWaveForm === 'function' && 
           typeof window.WaveSkin !== 'undefined' &&
           window.WaveSkin.default;
}

function renderWaveDromPreview() {
    const renderTarget = document.getElementById('wavedrom-render-target');
    if (!renderTarget) return;
    
    const textarea = document.getElementById('wavedrom-debug-code');
    if (!textarea) return;
    
    const code = textarea.value;
    
    try {
        // Parse the WaveDrom code
        const parsed = WaveDromIO.parseWaveDromCode(code);
        
        if (!parsed) {
            renderTarget.innerHTML = '<div style="color:#f48771;padding:20px;">⚠️ Invalid WaveDrom JSON</div>';
            return;
        }
        
        // Clear previous render
        renderTarget.innerHTML = '';
        
        // Use WaveDrom library to render
        if (isWaveDromReady()) {
            try {
                // Use a fixed prefix and incremented index
                const currentIndex = waveDromRenderIndex++;
                const containerId = 'WaveDrom_Preview_' + currentIndex;
                
                // Create the container that WaveDrom will render into
                const container = document.createElement('div');
                container.id = containerId;
                container.style.cssText = 'min-height:50px;background:#fff;padding:10px;border-radius:4px;';
                renderTarget.appendChild(container);
                
                // WaveDrom.RenderWaveForm(index, source, outputPrefix, notFirstSignal)
                // It looks for element with ID: outputPrefix + index
                // So we need: 'WaveDrom_Preview_' + currentIndex = containerId ✓
                
                // Use setTimeout to ensure DOM is flushed before render
                setTimeout(() => {
                    try {
                        const targetEl = document.getElementById(containerId);
                        if (targetEl) {
                            WaveDrom.RenderWaveForm(currentIndex, parsed, 'WaveDrom_Preview_', false);
                        } else {
                            console.error('WaveDrom target element not found:', containerId);
                        }
                    } catch (e) {
                        console.error('WaveDrom render failed:', e);
                        const el = document.getElementById(containerId);
                        if (el) {
                            el.innerHTML = '<div style="color:#f48771;padding:10px;">⚠️ Render failed: ' + e.message + '</div>';
                        }
                    }
                }, 10);
            } catch (renderErr) {
                console.error('WaveDrom render error:', renderErr);
                renderTarget.innerHTML = '<div style="color:#f48771;padding:20px;">⚠️ Render error: ' + renderErr.message + '</div>';
            }
        } else {
            // Fallback: show JSON structure info and retry
            const signalCount = parsed.signal ? parsed.signal.length : 0;
            const waveDromLoaded = typeof WaveDrom !== 'undefined';
            const skinLoaded = typeof window.WaveSkin !== 'undefined';
            renderTarget.innerHTML = `<div style="color:#858585;padding:20px;">
                <p>⏳ Loading WaveDrom library...</p>
                <p style="font-size:10px;">WaveDrom: ${waveDromLoaded ? '✓' : '✗'} | Skin: ${skinLoaded ? '✓' : '✗'}</p>
                <p><strong>Signals:</strong> ${signalCount}</p>
            </div>`;
            
            // Retry after library loads (max 5 seconds)
            let retryCount = 0;
            const retryInterval = setInterval(() => {
                if (isWaveDromReady()) {
                    clearInterval(retryInterval);
                    renderWaveDromPreview();
                } else if (++retryCount > 10) {
                    clearInterval(retryInterval);
                    renderTarget.innerHTML = '<div style="color:#f48771;padding:20px;">⚠️ WaveDrom library failed to load</div>';
                }
            }, 500);
        }
    } catch (error) {
        console.error('Error rendering WaveDrom preview:', error);
        renderTarget.innerHTML = '<div style="color:#f48771;padding:20px;">⚠️ Error: ' + error.message + '</div>';
    }
}

/**
 * Debounced render for performance - real-time update
 */
function debouncedRenderWaveDromPreview() {
    clearTimeout(waveDromRenderDebounceTimer);
    waveDromRenderDebounceTimer = setTimeout(() => {
        renderWaveDromPreview();
    }, 150); // Faster debounce for more real-time feel
}

/**
 * Set the status indicator
 */
function setWaveDromStatus(valid, errorMsg = '') {
    const statusEl = document.getElementById('wavedrom-debug-status');
    if (!statusEl) return;
    
    if (valid) {
        statusEl.textContent = '✓ Valid';
        statusEl.className = 'status-ok';
        // Also trigger preview render
        debouncedRenderWaveDromPreview();
    } else {
        statusEl.textContent = '✗ ' + (errorMsg || 'Invalid JSON');
        statusEl.className = 'status-error';
    }
}

/**
 * Apply WaveDrom code from editor to waveform
 */
function applyWaveDromCodeToWaveform() {
    const textarea = document.getElementById('wavedrom-debug-code');
    if (!textarea) return;
    
    const code = textarea.value;
    
    try {
        // Try to parse the JSON
        const parsed = WaveDromIO.parseWaveDromCode(code);
        
        if (!parsed) {
            setWaveDromStatus(false, 'Parse error');
            return;
        }
        
        // Valid JSON - import it
        const success = WaveDromIO.importFromWaveDrom(document_wave, parsed);
        
        if (success) {
            setWaveDromStatus(true);
            // Temporarily disable user editing flag to prevent loop
            waveDromCodeUserEditing = true;
            drawWaveform();
            // Re-enable after a short delay
            setTimeout(() => {
                waveDromCodeUserEditing = false;
            }, 100);
        } else {
            setWaveDromStatus(false, 'Import failed');
        }
    } catch (error) {
        console.error('Error applying WaveDrom code:', error);
        setWaveDromStatus(false, error.message.substring(0, 30));
    }
}

/**
 * Highlight JSON syntax
 */
function highlightJson(code) {
    // Escape HTML first
    let html = code
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
    
    // Highlight different parts of JSON
    // Order matters - more specific patterns first
    
    // Strings (including keys)
    html = html.replace(/"([^"\\]*(\\.[^"\\]*)*)"/g, (match) => {
        return `<span class="json-string">${match}</span>`;
    });
    
    // Keys (unquoted, like WaveDrom allows)
    html = html.replace(/(\b[a-zA-Z_][a-zA-Z0-9_]*\b)(\s*:)/g, (match, key, colon) => {
        return `<span class="json-key">${key}</span><span class="json-colon">${colon}</span>`;
    });
    
    // Numbers
    html = html.replace(/\b(-?\d+\.?\d*(?:[eE][+-]?\d+)?)\b/g, '<span class="json-number">$1</span>');
    
    // Booleans
    html = html.replace(/\b(true|false)\b/g, '<span class="json-boolean">$1</span>');
    
    // Null
    html = html.replace(/\bnull\b/g, '<span class="json-null">null</span>');
    
    // Brackets and braces
    html = html.replace(/(\[|\])/g, '<span class="json-bracket">$1</span>');
    html = html.replace(/(\{|\})/g, '<span class="json-brace">$1</span>');
    
    return html;
}

// Export for module use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        importWaveDromAction,
        exportWaveDromAction,
        showWaveDromCodeAction,
        toggleWaveDromDebugPanel,
        openWaveDromDebugPanel,
        resetWaveDromUserEditing,
        updateWaveDromDebugCode
    };
}
