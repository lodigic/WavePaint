/**
 * Segment Context Menu - Right-click context menu and dialog for vector segments
 */

/**
 * Finds the bounds of a vector segment at the given sample index.
 * A segment is a contiguous run of samples with the same value AND same label.
 * @param {Signal} signal - The signal object
 * @param {number} sampleIndex - The sample index to find bounds for
 * @returns {{start: number, end: number}|null} - Segment bounds or null if not found
 */
function findVectorSegmentBounds(signal, sampleIndex) {
    if (!signal || signal.type !== SignalType.Vector) return null;
    if (sampleIndex < 0 || sampleIndex >= signal.values.length) return null;
    
    const v = signal.values[sampleIndex];
    if (v === -1) return null; // Undefined value
    
    // Check if label indicates L, H, or Z (not a bar segment)
    const label = signal.labels[sampleIndex] ? signal.labels[sampleIndex] : '';
    const labelLower = label.toLowerCase().trim();
    if (labelLower === 'l' || labelLower === 'h' || labelLower === 'z') return null;
    
    // Find start of segment - must have same value AND same label
    let start = sampleIndex;
    while (start > 0 && 
           signal.values[start - 1] === v && 
           signal.labels[start - 1] === label) {
        start--;
    }
    
    // Find end of segment - must have same value AND same label
    let end = sampleIndex;
    while (end < signal.values.length - 1 && 
           signal.values[end + 1] === v && 
           signal.labels[end + 1] === label) {
        end++;
    }
    
    return { start, end };
}

/**
 * Shows the segment properties context menu.
 * @param {number} clientX - Mouse X position
 * @param {number} clientY - Mouse Y position
 * @param {number} signalIndex - Signal index
 * @param {number} sampleIndex - Sample index
 * @param {{start: number, end: number}} segmentBounds - Segment bounds
 */
function showSegmentPropertiesMenu(clientX, clientY, signalIndex, sampleIndex, segmentBounds) {
    // Remove any existing context menus
    const existing = document.querySelectorAll('.context-menu');
    existing.forEach(m => m.remove());
    
    const signals = document_wave.signalList();
    const signal = signals[signalIndex];
    
    // Create context menu
    const menu = document.createElement('div');
    menu.className = 'context-menu';
    menu.style.position = 'fixed';
    menu.style.left = clientX + 'px';
    menu.style.top = clientY + 'px';
    menu.style.background = 'var(--bg-color)';
    menu.style.border = '1px solid var(--border-color)';
    menu.style.borderRadius = '4px';
    menu.style.boxShadow = '0 2px 8px rgba(0,0,0,0.3)';
    menu.style.zIndex = '5500';
    menu.style.minWidth = '180px';
    
    // Helper function to add menu items
    function addMenuItem(text, callback) {
        const item = document.createElement('div');
        item.textContent = text;
        item.style.padding = '8px 12px';
        item.style.cursor = 'pointer';
        item.style.color = 'var(--text-color)';
        item.addEventListener('mouseenter', () => {
            item.style.background = 'var(--accent-color)';
        });
        item.addEventListener('mouseleave', () => {
            item.style.background = 'transparent';
        });
        item.addEventListener('click', () => {
            callback();
            if (menu.parentNode) {
                document.body.removeChild(menu);
            }
        });
        menu.appendChild(item);
        return item;
    }
    
    // Edit segment value without redrawing the bus (issue #7)
    addMenuItem('Edit value...', async () => {
        const currentLabel = signal.labels[sampleIndex] || '';
        const newLabel = await wpPrompt('Segment value:', currentLabel, 'Edit Segment Value');
        if (newLabel === null) return;
        document_wave.pushUndoSnapshot();
        for (let i = segmentBounds.start; i <= segmentBounds.end; i++) {
            if (i >= 0 && i < signal.labels.length) {
                signal.labels[i] = newLabel;
            }
        }
        document_wave.dataChanged();
    });

    // Segment Properties option
    addMenuItem('Segment properties...', () => {
        showSegmentPropertiesDialog(signalIndex, sampleIndex, segmentBounds);
    });
    
    // Close menu when clicking elsewhere
    function closeMenu(e) {
        if (!menu.contains(e.target)) {
            if (menu.parentNode) {
                document.body.removeChild(menu);
            }
            document.removeEventListener('click', closeMenu);
        }
    }
    
    document.body.appendChild(menu);
    setTimeout(() => {
        document.addEventListener('click', closeMenu);
    }, 10);
}

/**
 * Shows the segment properties dialog.
 * @param {number} signalIndex - Signal index
 * @param {number} sampleIndex - Sample index
 * @param {{start: number, end: number}} segmentBounds - Segment bounds
 */
function showSegmentPropertiesDialog(signalIndex, sampleIndex, segmentBounds) {
    const signals = document_wave.signalList();
    const signal = signals[signalIndex];
    
    // Get current segment style
    const currentStyle = (signal.segmentStyles && sampleIndex < signal.segmentStyles.length)
        ? signal.segmentStyles[sampleIndex]
        : { color: null, hatched: false, fill: null };
    
    // Get current WaveDrom color code if any
    const currentWaveDromCode = (signal.waveDromColorCodes && sampleIndex < signal.waveDromColorCodes.length)
        ? signal.waveDromColorCodes[sampleIndex]
        : null;
    
    const hasCustomColor = currentStyle && currentStyle.color;
    const isHatched = currentStyle && currentStyle.hatched;
    const hasFill = currentStyle && currentStyle.fill;
    const defaultColor = signal.color || getThemeDefaultSignalColor();
    const currentColor = hasCustomColor ? currentStyle.color : defaultColor;
    const currentFill = hasFill ? currentStyle.fill : '#4CAF50';
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
        btnCancel: '#3a3a3f',
        btnCancelHover: '#4a4a4f'
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
        btnCancel: '#e0e0e0',
        btnCancelHover: '#d0d0d0'
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
        min-width: 380px;
        max-width: 420px;
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
                        <rect x="3" y="8" width="18" height="8" rx="1"/>
                    </svg>
                </div>
                <span style="font-size: 14px; font-weight: 600; color: ${colors.text};">Segment Properties</span>
            </div>
            <button id="seg-close-btn" style="
                border: none; background: transparent; 
                color: ${colors.textMuted}; cursor: pointer; 
                font-size: 18px; line-height: 1; padding: 4px;
                border-radius: 4px;
                transition: all 0.15s;
            " onmouseover="this.style.color='${colors.text}';this.style.background='${colors.sectionBg}'" 
               onmouseout="this.style.color='${colors.textMuted}';this.style.background='transparent'">✕</button>
        </div>
        
        <!-- Content -->
        <div style="padding: 18px; display: flex; flex-direction: column; gap: 14px;">
            <!-- Info text -->
            <div style="
                font-size: 12px; 
                color: ${colors.textMuted}; 
                line-height: 1.4;
            ">
                Customize the appearance of this segment (samples ${segmentBounds.start} to ${segmentBounds.end}).
            </div>
            
            <!-- Custom Color Section -->
            <div style="
                background: ${colors.sectionBg};
                border: 1px solid ${colors.sectionBorder};
                border-radius: 8px;
                padding: 14px;
            ">
                <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: ${hasCustomColor ? '12px' : '0'};">
                    <label style="display: flex; align-items: center; gap: 8px; cursor: pointer; font-size: 13px; color: ${colors.text};">
                        <input type="checkbox" id="seg-use-custom-color" ${hasCustomColor ? 'checked' : ''} style="
                            width: 16px; height: 16px; cursor: pointer;
                            accent-color: ${colors.accent};
                        ">
                        Use custom border color
                    </label>
                </div>
                <div id="seg-color-row" style="display: ${hasCustomColor ? 'flex' : 'none'}; align-items: center; gap: 12px;">
                    <input type="color" id="seg-color" value="${currentColor}" style="
                        width: 40px; height: 28px; 
                        border: 1px solid ${colors.inputBorder}; 
                        border-radius: 4px; 
                        cursor: pointer;
                        background: ${colors.inputBg};
                    ">
                    <span id="seg-color-name" style="font-family: monospace; font-size: 12px; color: ${colors.textMuted};">${currentColor}</span>
                </div>
            </div>
            
            <!-- Hatching Section -->
            <div style="
                background: ${colors.sectionBg};
                border: 1px solid ${colors.sectionBorder};
                border-radius: 8px;
                padding: 14px;
            ">
                <label style="display: flex; align-items: center; gap: 8px; cursor: pointer; font-size: 13px; color: ${colors.text};">
                    <input type="checkbox" id="seg-hatched" ${isHatched ? 'checked' : ''} style="
                        width: 16px; height: 16px; cursor: pointer;
                        accent-color: ${colors.accent};
                    ">
                    Diagonal hatching pattern
                </label>
            </div>
            
            <!-- Fill Section -->
            <div style="
                background: ${colors.sectionBg};
                border: 1px solid ${colors.sectionBorder};
                border-radius: 8px;
                padding: 14px;
            ">
                <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: ${hasFill ? '12px' : '0'};">
                    <label style="display: flex; align-items: center; gap: 8px; cursor: pointer; font-size: 13px; color: ${colors.text};">
                        <input type="checkbox" id="seg-use-fill" ${hasFill ? 'checked' : ''} style="
                            width: 16px; height: 16px; cursor: pointer;
                            accent-color: ${colors.accent};
                        ">
                        Fill segment
                    </label>
                </div>
                <div id="seg-fill-row" style="display: ${hasFill ? 'flex' : 'none'}; flex-direction: column; gap: 12px;">
                    <!-- WaveDrom Standard Colors -->
                    <div style="display: flex; flex-direction: column; gap: 6px;">
                        <span style="font-size: 11px; color: ${colors.textMuted}; text-transform: uppercase; letter-spacing: 0.5px;">WaveDrom Colors</span>
                        <div id="seg-wavedrom-colors" style="display: flex; gap: 6px; flex-wrap: wrap;">
                            <button class="seg-wd-color" data-code="=" data-color="#ffffff" title="= Default (White)" style="
                                width: 28px; height: 28px; border-radius: 4px; border: 2px solid ${colors.inputBorder};
                                background: #ffffff; cursor: pointer; transition: all 0.15s;
                            "></button>
                            <button class="seg-wd-color" data-code="3" data-color="#ffffb4" title="3 Yellow" style="
                                width: 28px; height: 28px; border-radius: 4px; border: 2px solid ${colors.inputBorder};
                                background: #ffffb4; cursor: pointer; transition: all 0.15s;
                            "></button>
                            <button class="seg-wd-color" data-code="4" data-color="#ffe0b9" title="4 Orange" style="
                                width: 28px; height: 28px; border-radius: 4px; border: 2px solid ${colors.inputBorder};
                                background: #ffe0b9; cursor: pointer; transition: all 0.15s;
                            "></button>
                            <button class="seg-wd-color" data-code="5" data-color="#b9e0ff" title="5 Blue" style="
                                width: 28px; height: 28px; border-radius: 4px; border: 2px solid ${colors.inputBorder};
                                background: #b9e0ff; cursor: pointer; transition: all 0.15s;
                            "></button>
                            <button class="seg-wd-color" data-code="6" data-color="#ccfdfe" title="6 Cyan" style="
                                width: 28px; height: 28px; border-radius: 4px; border: 2px solid ${colors.inputBorder};
                                background: #ccfdfe; cursor: pointer; transition: all 0.15s;
                            "></button>
                            <button class="seg-wd-color" data-code="7" data-color="#cdfdc5" title="7 Green" style="
                                width: 28px; height: 28px; border-radius: 4px; border: 2px solid ${colors.inputBorder};
                                background: #cdfdc5; cursor: pointer; transition: all 0.15s;
                            "></button>
                            <button class="seg-wd-color" data-code="8" data-color="#f0c1fb" title="8 Pink" style="
                                width: 28px; height: 28px; border-radius: 4px; border: 2px solid ${colors.inputBorder};
                                background: #f0c1fb; cursor: pointer; transition: all 0.15s;
                            "></button>
                            <button class="seg-wd-color" data-code="9" data-color="#f5c2c0" title="9 Red" style="
                                width: 28px; height: 28px; border-radius: 4px; border: 2px solid ${colors.inputBorder};
                                background: #f5c2c0; cursor: pointer; transition: all 0.15s;
                            "></button>
                        </div>
                    </div>
                    <!-- Custom Color Picker -->
                    <div style="display: flex; align-items: center; gap: 12px;">
                        <span style="font-size: 11px; color: ${colors.textMuted}; text-transform: uppercase; letter-spacing: 0.5px; min-width: 50px;">Custom</span>
                        <input type="color" id="seg-fill-color" value="${currentFill}" style="
                            width: 40px; height: 28px; 
                            border: 1px solid ${colors.inputBorder}; 
                            border-radius: 4px; 
                            cursor: pointer;
                            background: ${colors.inputBg};
                        ">
                        <span id="seg-fill-color-name" style="font-family: monospace; font-size: 12px; color: ${colors.textMuted};">${currentFill}</span>
                    </div>
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
            <button id="seg-cancel-btn" style="
                padding: 8px 18px; 
                cursor: pointer; 
                background: ${colors.btnCancel}; 
                color: ${colors.text}; 
                border: 1px solid ${colors.sectionBorder}; 
                border-radius: 6px;
                font-size: 13px;
                font-weight: 500;
                transition: all 0.15s;
            " onmouseover="this.style.background='${colors.btnCancelHover}'" 
               onmouseout="this.style.background='${colors.btnCancel}'">Cancel</button>
            <button id="seg-ok-btn" style="
                padding: 8px 18px; 
                cursor: pointer; 
                background: linear-gradient(135deg, ${colors.accent}, ${colors.accentGradient}); 
                color: white; 
                border: none; 
                border-radius: 6px;
                font-size: 13px;
                font-weight: 500;
                transition: all 0.15s;
            " onmouseover="this.style.opacity='0.9'" 
               onmouseout="this.style.opacity='1'">Apply</button>
        </div>
    `;
    
    overlay.appendChild(modal);
    document.body.appendChild(overlay);
    
    // Set up event handlers
    const closeBtn = modal.querySelector('#seg-close-btn');
    const useCustomColorCheck = modal.querySelector('#seg-use-custom-color');
    const colorRow = modal.querySelector('#seg-color-row');
    const colorInput = modal.querySelector('#seg-color');
    const colorName = modal.querySelector('#seg-color-name');
    const hatchedCheck = modal.querySelector('#seg-hatched');
    const useFillCheck = modal.querySelector('#seg-use-fill');
    const fillRow = modal.querySelector('#seg-fill-row');
    const fillColorInput = modal.querySelector('#seg-fill-color');
    const fillColorName = modal.querySelector('#seg-fill-color-name');
    const okBtn = modal.querySelector('#seg-ok-btn');
    const cancelBtn = modal.querySelector('#seg-cancel-btn');
    
    useCustomColorCheck.addEventListener('change', () => {
        colorRow.style.display = useCustomColorCheck.checked ? 'flex' : 'none';
    });
    
    colorInput.addEventListener('input', () => {
        colorName.textContent = colorInput.value;
    });
    
    useFillCheck.addEventListener('change', () => {
        fillRow.style.display = useFillCheck.checked ? 'flex' : 'none';
    });
    
    fillColorInput.addEventListener('input', () => {
        fillColorName.textContent = fillColorInput.value;
        // Deselect WaveDrom color buttons when custom color is picked
        modal.querySelectorAll('.seg-wd-color').forEach(btn => {
            btn.style.borderColor = colors.inputBorder;
            btn.style.transform = 'scale(1)';
        });
    });
    
    // WaveDrom color button handlers
    const waveDromColorBtns = modal.querySelectorAll('.seg-wd-color');
    waveDromColorBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const colorHex = btn.dataset.color;
            const colorCode = btn.dataset.code;
            
            // Update color input and display
            fillColorInput.value = colorHex;
            fillColorName.textContent = `${colorHex} (WaveDrom ${colorCode})`;
            
            // Visual feedback - highlight selected button
            waveDromColorBtns.forEach(b => {
                b.style.borderColor = colors.inputBorder;
                b.style.transform = 'scale(1)';
            });
            btn.style.borderColor = colors.accent;
            btn.style.transform = 'scale(1.1)';
        });
        
        // Hover effect
        btn.addEventListener('mouseenter', () => {
            if (btn.style.transform !== 'scale(1.1)') {
                btn.style.transform = 'scale(1.05)';
            }
        });
        btn.addEventListener('mouseleave', () => {
            if (btn.style.borderColor !== colors.accent) {
                btn.style.transform = 'scale(1)';
            }
        });
    });
    
    // Highlight current WaveDrom color if one is set
    if (currentWaveDromCode && hasFill) {
        const currentWdBtn = modal.querySelector(`.seg-wd-color[data-code="${currentWaveDromCode}"]`);
        if (currentWdBtn) {
            currentWdBtn.style.borderColor = colors.accent;
            currentWdBtn.style.transform = 'scale(1.1)';
            fillColorName.textContent = `${fillColorInput.value} (WaveDrom ${currentWaveDromCode})`;
        }
    }
    
    const closeDialog = () => {
        document.body.removeChild(overlay);
    };
    
    closeBtn.addEventListener('click', closeDialog);
    cancelBtn.addEventListener('click', closeDialog);
    
    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) {
            closeDialog();
        }
    });
    
    okBtn.addEventListener('click', () => {
        const newStyle = {
            color: useCustomColorCheck.checked ? colorInput.value : null,
            hatched: hatchedCheck.checked,
            fill: useFillCheck.checked ? fillColorInput.value : null
        };
        
        // Detect if a WaveDrom color was selected
        let selectedWaveDromCode = null;
        const selectedWdBtn = modal.querySelector('.seg-wd-color[style*="scale(1.1)"]');
        if (selectedWdBtn && useFillCheck.checked) {
            selectedWaveDromCode = selectedWdBtn.dataset.code;
        }
        
        console.log('Applying segment style:', newStyle, 'to samples', segmentBounds.start, 'to', segmentBounds.end);
        if (selectedWaveDromCode) {
            console.log('WaveDrom color code:', selectedWaveDromCode);
        }
        
        // Apply style to all samples in the segment
        document_wave.pushUndoSnapshot();
        
        // Ensure segmentStyles array exists and is properly sized
        if (!signal.segmentStyles || signal.segmentStyles.length !== signal.values.length) {
            const oldStyles = signal.segmentStyles || [];
            signal.segmentStyles = [];
            for (let i = 0; i < signal.values.length; i++) {
                signal.segmentStyles[i] = oldStyles[i] ? { ...oldStyles[i] } : { color: null, hatched: false };
            }
        }
        
        // Ensure waveDromColorCodes array exists and is properly sized
        if (!signal.waveDromColorCodes || signal.waveDromColorCodes.length !== signal.values.length) {
            const oldCodes = signal.waveDromColorCodes || [];
            signal.waveDromColorCodes = [];
            for (let i = 0; i < signal.values.length; i++) {
                signal.waveDromColorCodes[i] = oldCodes[i] || null;
            }
        }
        
        // Apply style only to the segment range
        for (let i = segmentBounds.start; i <= segmentBounds.end; i++) {
            if (i >= 0 && i < signal.segmentStyles.length) {
                signal.segmentStyles[i] = { color: newStyle.color, hatched: newStyle.hatched, fill: newStyle.fill };
                
                // Update waveDromColorCodes if WaveDrom color was selected
                if (useFillCheck.checked && selectedWaveDromCode) {
                    signal.waveDromColorCodes[i] = selectedWaveDromCode;
                } else if (!useFillCheck.checked) {
                    // Clear WaveDrom color code if fill is disabled
                    signal.waveDromColorCodes[i] = null;
                }
            }
        }
        
        closeDialog();
        drawWaveform();
    });
}
