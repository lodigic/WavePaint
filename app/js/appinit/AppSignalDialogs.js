/**
 * AppSignalDialogs.js - Signal properties dialog
 */

/**
 * Shows the signal properties dialog for a bit signal.
 */
function showSignalPropertiesDialog(signalIndex, signal) {
    const currentEdgeArrow = signal.edgeArrow || 'none';
    const hasEdgeArrow = currentEdgeArrow !== 'none';
    const hasPolarityEnabled = signal.showClockMarkers === true; // Polarity is enabled on this signal
    const currentRiseTime = signal.riseTime || 0;
    const currentFallTime = signal.fallTime || 0;
    const isDark = document.body.classList.contains('dark');
    
    // Color palette based on theme - Using WavePaint green brand colors
    const colors = isDark ? {
        modalBg: '#252528',
        headerBg: '#1a1a1c',
        sectionBg: '#1e1e20',
        sectionBorder: '#3a3a3f',
        inputBg: '#2a2a2e',
        inputBorder: '#444449',
        text: '#e8e8ec',
        textMuted: '#9999a5',
        accent: '#7ee856',
        accentHover: '#6bd648',
        accentGradient: '#4CAF50',
        previewBg: '#0d0d0f',
        previewGrid: '#2a2a30',
        signalDefault: '#4CAF50'
    } : {
        modalBg: '#ffffff',
        headerBg: '#f5f7f5',
        sectionBg: '#f8faf8',
        sectionBorder: '#d8e4d8',
        inputBg: '#ffffff',
        inputBorder: '#c0d0c0',
        text: '#1a1a1f',
        textMuted: '#5a6a5a',
        accent: '#4CAF50',
        accentHover: '#3d9141',
        accentGradient: '#66bb6a',
        previewBg: '#f0f4f0',
        previewGrid: '#d0dcd0',
        signalDefault: '#2e7d32'
    };
    
    // Create overlay
    const overlay = document.createElement('div');
    overlay.style.cssText = `
        position: fixed; inset: 0; 
        background: rgba(0, 0, 0, ${isDark ? '0.6' : '0.4'}); 
        display: flex; align-items: center; justify-content: center; 
        z-index: 10000;
    `;
    
    // Create modal
    const modal = document.createElement('div');
    modal.style.cssText = `
        background: ${colors.modalBg};
        border: 1px solid ${colors.sectionBorder};
        border-radius: 12px;
        box-shadow: 0 20px 60px rgba(0, 0, 0, ${isDark ? '0.5' : '0.2'}), 0 0 0 1px rgba(255,255,255,${isDark ? '0.05' : '0'});
        min-width: 460px;
        max-width: 520px;
        overflow: hidden;
    `;
    
    modal.innerHTML = `
        <!-- Header -->
        <div style="
            padding: 14px 18px;
            background: ${colors.headerBg};
            border-bottom: 1px solid ${colors.sectionBorder};
            display: flex;
            align-items: center;
            justify-content: space-between;
        ">
            <div style="display: flex; align-items: center; gap: 10px;">
                <div style="
                    width: 28px; height: 28px;
                    background: linear-gradient(135deg, ${colors.accent}, ${colors.accentGradient});
                    border-radius: 6px;
                    display: flex; align-items: center; justify-content: center;
                ">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5">
                        <polyline points="3,17 8,17 8,7 16,7 16,17 21,17"/>
                    </svg>
                </div>
                <span style="font-size: 14px; font-weight: 600; color: ${colors.text};">Signal Properties</span>
            </div>
            <button id="props-close-btn" style="
                border: none; background: transparent; 
                color: ${colors.textMuted}; cursor: pointer; 
                font-size: 18px; line-height: 1; padding: 4px;
                border-radius: 4px;
                transition: all 0.15s;
            " onmouseover="this.style.color='${colors.text}';this.style.background='${colors.sectionBg}'" 
               onmouseout="this.style.color='${colors.textMuted}';this.style.background='transparent'">✕</button>
        </div>
        
        <!-- Content -->
        <div style="padding: 18px; display: flex; gap: 18px;">
            <!-- Left: Controls -->
            <div style="flex: 1; display: flex; flex-direction: column; gap: 12px;">
                <!-- Signal name badge -->
                <div style="
                    padding: 10px 14px;
                    background: linear-gradient(135deg, ${colors.accent}15, ${colors.accent}08);
                    border: 1px solid ${colors.accent}30;
                    border-radius: 8px;
                    display: flex; align-items: center; gap: 8px;
                ">
                    <div style="width: 8px; height: 8px; background: ${signal.color || colors.signalDefault}; border-radius: 50%;"></div>
                    <span style="font-size: 13px; color: ${colors.text}; font-weight: 500;">${escapeHtml(signal.name || 'Unnamed Signal')}</span>
                </div>
                
                <!-- Clock Edge Markers -->
                <div style="
                    padding: 14px;
                    background: ${colors.sectionBg};
                    border: 1px solid ${colors.sectionBorder};
                    border-radius: 8px;
                    ${hasPolarityEnabled ? 'opacity: 0.5;' : ''}
                ">
                    <label style="font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; color: ${colors.textMuted}; font-weight: 600; display: block; margin-bottom: 8px;">
                        Clock Edge Markers
                    </label>
                    ${hasPolarityEnabled ? `
                    <div style="font-size: 11px; color: ${colors.textMuted}; font-style: italic; margin-bottom: 8px;">
                        ⚠️ Polarity markers enabled on this signal.
                    </div>
                    ` : ''}
                    <select id="edgeArrow" ${hasPolarityEnabled ? 'disabled' : ''} style="
                        width: 100%; padding: 8px 10px; font-size: 13px;
                        background: ${colors.inputBg};
                        border: 1px solid ${colors.inputBorder};
                        border-radius: 6px;
                        color: ${colors.text};
                        cursor: ${hasPolarityEnabled ? 'not-allowed' : 'pointer'};
                        outline: none;
                        transition: border-color 0.15s;
                    ">
                        <option value="none" ${currentEdgeArrow === 'none' ? 'selected' : ''}>None</option>
                        <option value="positive" ${currentEdgeArrow === 'positive' ? 'selected' : ''}>↑ Positive Edge</option>
                        <option value="negative" ${currentEdgeArrow === 'negative' ? 'selected' : ''}>↓ Negative Edge</option>
                    </select>
                </div>
                
                <!-- Transition Times -->
                <div id="transitionSection" style="
                    padding: 14px;
                    background: ${colors.sectionBg};
                    border: 1px solid ${colors.sectionBorder};
                    border-radius: 8px;
                    transition: opacity 0.2s;
                    ${hasEdgeArrow ? 'opacity: 0.4; pointer-events: none;' : ''}
                ">
                    <label style="font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; color: ${colors.textMuted}; font-weight: 600; display: block; margin-bottom: 10px;">
                        Transition Time
                    </label>
                    <div style="display: flex; gap: 16px;">
                        <div style="flex: 1;">
                            <label style="font-size: 12px; color: ${colors.text}; display: block; margin-bottom: 6px;">Rise</label>
                            <div style="display: flex; align-items: center; gap: 6px;">
                                <input type="number" id="riseTime" min="0" max="10" step="0.1" value="${currentRiseTime}" 
                                    style="
                                        width: 56px; padding: 6px 8px; font-size: 13px; text-align: center;
                                        background: ${colors.inputBg};
                                        border: 1px solid ${colors.inputBorder};
                                        border-radius: 5px;
                                        color: ${colors.text};
                                        outline: none;
                                    ">
                                <span style="font-size: 11px; color: ${colors.textMuted};">steps</span>
                            </div>
                        </div>
                        <div style="flex: 1;">
                            <label style="font-size: 12px; color: ${colors.text}; display: block; margin-bottom: 6px;">Fall</label>
                            <div style="display: flex; align-items: center; gap: 6px;">
                                <input type="number" id="fallTime" min="0" max="10" step="0.1" value="${currentFallTime}" 
                                    style="
                                        width: 56px; padding: 6px 8px; font-size: 13px; text-align: center;
                                        background: ${colors.inputBg};
                                        border: 1px solid ${colors.inputBorder};
                                        border-radius: 5px;
                                        color: ${colors.text};
                                        outline: none;
                                    ">
                                <span style="font-size: 11px; color: ${colors.textMuted};">steps</span>
                            </div>
                        </div>
                    </div>
                </div>
                
                ${signal.type === SignalType.Vector ? `
                <!-- Fill Color (Vector signals only) -->
                <div style="
                    padding: 14px;
                    background: ${colors.sectionBg};
                    border: 1px solid ${colors.sectionBorder};
                    border-radius: 8px;
                ">
                    <label style="font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; color: ${colors.textMuted}; font-weight: 600; display: block; margin-bottom: 8px;">
                        Fill Color
                    </label>
                    <div style="display: flex; align-items: center; gap: 10px;">
                        <div id="fillColorBox" style="
                            width: 32px; height: 32px;
                            border-radius: 6px;
                            border: 2px solid ${colors.inputBorder};
                            cursor: pointer;
                            background: ${signal.fill ? signal.fill : 'transparent'};
                            ${!signal.fill ? `background-image: linear-gradient(45deg, ${colors.previewGrid} 25%, transparent 25%), linear-gradient(-45deg, ${colors.previewGrid} 25%, transparent 25%), linear-gradient(45deg, transparent 75%, ${colors.previewGrid} 75%), linear-gradient(-45deg, transparent 75%, ${colors.previewGrid} 75%); background-size: 8px 8px; background-position: 0 0, 0 4px, 4px -4px, -4px 0px;` : ''}
                        "></div>
                        <div style="display: flex; flex-direction: column; gap: 4px;">
                            <span id="fillColorLabel" style="font-size: 12px; color: ${colors.text};">${signal.fill ? signal.fill : 'No fill'}</span>
                            <button id="clearFillBtn" style="
                                font-size: 11px; padding: 2px 8px;
                                background: transparent;
                                border: 1px solid ${colors.inputBorder};
                                border-radius: 4px;
                                color: ${colors.textMuted};
                                cursor: pointer;
                                ${!signal.fill ? 'display: none;' : ''}
                            ">Clear</button>
                        </div>
                    </div>
                </div>
                ` : ''}
                
                <!-- Per-Signal Substeps -->
                <div style="
                    padding: 14px;
                    background: ${colors.sectionBg};
                    border: 1px solid ${colors.sectionBorder};
                    border-radius: 8px;
                ">
                    <label style="font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; color: ${colors.textMuted}; font-weight: 600; display: block; margin-bottom: 8px;">
                        Substeps
                    </label>
                    <div style="display: flex; align-items: center; gap: 10px;">
                        <input type="number" id="signalSubSteps" min="0" max="16" step="1" value="${signal.subSteps || 0}" 
                            style="
                                width: 56px; padding: 6px 8px; font-size: 13px; text-align: center;
                                background: ${colors.inputBg};
                                border: 1px solid ${colors.inputBorder};
                                border-radius: 5px;
                                color: ${colors.text};
                                outline: none;
                            ">
                        <span style="font-size: 11px; color: ${colors.textMuted};">0 = use global</span>
                    </div>
                </div>
            </div>
            
            <!-- Right: Preview -->
            <div style="width: 130px; display: flex; flex-direction: column;">
                <label style="font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; color: ${colors.textMuted}; font-weight: 600; margin-bottom: 8px; text-align: center;">
                    Preview
                </label>
                <div style="
                    flex: 1;
                    background: ${colors.previewBg};
                    border: 1px solid ${colors.sectionBorder};
                    border-radius: 8px;
                    padding: 10px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                ">
                    <canvas id="signalPreviewCanvas" width="108" height="90"></canvas>
                </div>
            </div>
        </div>
        
        <!-- Footer -->
        <div style="
            padding: 14px 18px;
            background: ${colors.headerBg};
            border-top: 1px solid ${colors.sectionBorder};
            display: flex;
            justify-content: flex-end;
            gap: 10px;
        ">
            <button id="props-cancel-btn" style="
                padding: 8px 18px;
                border: 1px solid ${colors.sectionBorder};
                border-radius: 6px;
                background: ${colors.modalBg};
                color: ${colors.text};
                font-size: 13px;
                cursor: pointer;
                transition: all 0.15s;
            " onmouseover="this.style.background='${colors.sectionBg}'" 
               onmouseout="this.style.background='${colors.modalBg}'">Cancel</button>
            <button id="props-ok-btn" style="
                padding: 8px 22px;
                border: none;
                border-radius: 6px;
                background: ${colors.accent};
                color: #fff;
                font-size: 13px;
                font-weight: 600;
                cursor: pointer;
                transition: all 0.15s;
            " onmouseover="this.style.background='${colors.accentHover}'" 
               onmouseout="this.style.background='${colors.accent}'">Apply</button>
        </div>
    `;
    
    overlay.appendChild(modal);
    document.body.appendChild(overlay);
    
    // Get elements
    const edgeArrowSelect = document.getElementById('edgeArrow');
    const transitionSection = document.getElementById('transitionSection');
    const riseTimeInput = document.getElementById('riseTime');
    const fallTimeInput = document.getElementById('fallTime');
    const previewCanvas = document.getElementById('signalPreviewCanvas');
    const previewCtx = previewCanvas.getContext('2d');
    
    // Fill color state (for vector signals)
    let currentFillColor = signal.fill || null;
    
    // Set up fill color picker for vector signals
    if (signal.type === SignalType.Vector) {
        const fillColorBox = document.getElementById('fillColorBox');
        const fillColorLabel = document.getElementById('fillColorLabel');
        const clearFillBtn = document.getElementById('clearFillBtn');
        
        if (fillColorBox) {
            fillColorBox.addEventListener('click', async () => {
                const newColor = await openColorPicker(currentFillColor || '#4CAF50', fillColorBox, 'Fill Color');
                if (newColor) {
                    currentFillColor = newColor;
                    fillColorBox.style.background = newColor;
                    fillColorBox.style.backgroundImage = 'none';
                    if (fillColorLabel) fillColorLabel.textContent = newColor;
                    if (clearFillBtn) clearFillBtn.style.display = '';
                    drawPreview();
                }
            });
        }
        
        if (clearFillBtn) {
            clearFillBtn.addEventListener('click', () => {
                currentFillColor = null;
                fillColorBox.style.background = 'transparent';
                fillColorBox.style.backgroundImage = `linear-gradient(45deg, ${colors.previewGrid} 25%, transparent 25%), linear-gradient(-45deg, ${colors.previewGrid} 25%, transparent 25%), linear-gradient(45deg, transparent 75%, ${colors.previewGrid} 75%), linear-gradient(-45deg, transparent 75%, ${colors.previewGrid} 75%)`;
                fillColorBox.style.backgroundSize = '8px 8px';
                fillColorBox.style.backgroundPosition = '0 0, 0 4px, 4px -4px, -4px 0px';
                if (fillColorLabel) fillColorLabel.textContent = 'No fill';
                clearFillBtn.style.display = 'none';
                drawPreview();
            });
        }
    }
    
    // Draw preview function
    function drawPreview() {
        const width = previewCanvas.width;
        const height = previewCanvas.height;
        const edgeArrow = edgeArrowSelect.value;
        const riseTime = parseFloat(riseTimeInput.value) || 0;
        const fallTime = parseFloat(fallTimeInput.value) || 0;
        
        // Clear canvas
        previewCtx.fillStyle = colors.previewBg;
        previewCtx.fillRect(0, 0, width, height);
        
        // Grid lines
        previewCtx.strokeStyle = colors.previewGrid;
        previewCtx.lineWidth = 1;
        for (let x = 27; x < width; x += 27) {
            previewCtx.beginPath();
            previewCtx.moveTo(x, 0);
            previewCtx.lineTo(x, height);
            previewCtx.stroke();
        }
        
        // Signal parameters
        const highY = 18;
        const lowY = 72;
        const centerY = 45;
        const stepWidth = 27;
        
        // Signal color (use signal's color or theme default)
        const signalColor = signal.color || colors.signalDefault;
        
        // Draw signal waveform: always show as HIGH (green line at top)
        // This represents what the signal looks like when drawn
        previewCtx.strokeStyle = signalColor;
        previewCtx.lineWidth = 2.5;
        previewCtx.lineCap = 'round';
        previewCtx.lineJoin = 'round';
        previewCtx.beginPath();
        
        // Always draw a HIGH signal (constant at top)
        previewCtx.moveTo(0, highY);
        previewCtx.lineTo(width, highY);
        previewCtx.stroke();
        
        // If edge arrows are enabled, show an example arrow
        if (edgeArrow !== 'none') {
            const arrowHeight = 7;
            const arrowHalfWidth = 4;
            const arrowX = 54; // Center of preview
            
            previewCtx.fillStyle = signalColor;
            
            if (edgeArrow === 'positive') {
                // Upward arrow
                previewCtx.beginPath();
                previewCtx.moveTo(arrowX, centerY - arrowHeight);
                previewCtx.lineTo(arrowX - arrowHalfWidth, centerY);
                previewCtx.lineTo(arrowX + arrowHalfWidth, centerY);
                previewCtx.closePath();
                previewCtx.fill();
                
                // Vertical line
                previewCtx.beginPath();
                previewCtx.moveTo(arrowX, centerY);
                previewCtx.lineTo(arrowX, lowY - 4);
                previewCtx.stroke();
            } else {
                // Downward arrow
                previewCtx.beginPath();
                previewCtx.moveTo(arrowX, centerY + arrowHeight);
                previewCtx.lineTo(arrowX - arrowHalfWidth, centerY);
                previewCtx.lineTo(arrowX + arrowHalfWidth, centerY);
                previewCtx.closePath();
                previewCtx.fill();
                
                // Vertical line
                previewCtx.beginPath();
                previewCtx.moveTo(arrowX, highY + 4);
                previewCtx.lineTo(arrowX, centerY);
                previewCtx.stroke();
            }
        }
    }
    
    // Initial draw
    drawPreview();
    
    // Handle mutual exclusivity between Edge Arrow and Rise/Fall time
    edgeArrowSelect.addEventListener('change', () => {
        const hasArrow = edgeArrowSelect.value !== 'none';
        if (hasArrow) {
            transitionSection.style.opacity = '0.4';
            transitionSection.style.pointerEvents = 'none';
            riseTimeInput.value = '0';
            fallTimeInput.value = '0';
        } else {
            transitionSection.style.opacity = '1';
            transitionSection.style.pointerEvents = 'auto';
        }
        drawPreview();
    });
    
    // If user changes rise/fall time, reset edge arrow and redraw
    const resetEdgeArrow = () => {
        const riseVal = parseFloat(riseTimeInput.value) || 0;
        const fallVal = parseFloat(fallTimeInput.value) || 0;
        if (riseVal > 0 || fallVal > 0) {
            edgeArrowSelect.value = 'none';
            transitionSection.style.opacity = '1';
            transitionSection.style.pointerEvents = 'auto';
        }
        drawPreview();
    };
    riseTimeInput.addEventListener('input', resetEdgeArrow);
    fallTimeInput.addEventListener('input', resetEdgeArrow);
    
    // Close handlers
    const closeDialog = () => {
        document.body.removeChild(overlay);
    };
    
    document.getElementById('props-ok-btn').addEventListener('click', () => {
        const edgeArrow = edgeArrowSelect.value;
        const riseTime = edgeArrow !== 'none' ? 0 : (parseFloat(riseTimeInput.value) || 0);
        const fallTime = edgeArrow !== 'none' ? 0 : (parseFloat(fallTimeInput.value) || 0);
        
        document_wave.setSignalRiseFallTime(signalIndex, riseTime, fallTime);
        signal.edgeArrow = edgeArrow;
        
        // Save fill color for vector signals
        if (signal.type === SignalType.Vector) {
            signal.fill = currentFillColor;
        }
        
        // Save per-signal substeps using the remapping method
        const subStepsInput = document.getElementById('signalSubSteps');
        if (subStepsInput) {
            const newSubSteps = parseInt(subStepsInput.value) || 0;
            // Use setSignalSubSteps to properly remap data (like global substeps)
            document_wave.setSignalSubSteps(signalIndex, newSubSteps);
        }
        
        closeDialog();
        drawWaveform();
    });
    
    document.getElementById('props-cancel-btn').addEventListener('click', closeDialog);
    document.getElementById('props-close-btn').addEventListener('click', closeDialog);
    
    // Close on overlay click
    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) closeDialog();
    });
    
    // Close on Escape
    const handleKeyDown = (e) => {
        if (e.key === 'Escape') {
            closeDialog();
            document.removeEventListener('keydown', handleKeyDown);
        }
    };
    document.addEventListener('keydown', handleKeyDown);
}

/**
 * Helper to escape HTML special characters
 */
function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/&/g, '&amp;')
              .replace(/</g, '&lt;')
              .replace(/>/g, '&gt;')
              .replace(/"/g, '&quot;')
              .replace(/'/g, '&#39;');
}

// Export for module use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { showSignalPropertiesDialog, escapeHtml };
}
