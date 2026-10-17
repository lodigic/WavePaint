/**
 * PropertyEditor.js - Object selection and property editing system
 * 
 * Manages object selection state and provides property editing UI
 * for different element types (arrows, time spans, markers, signals, etc.)
 */

// Selection types
const SelectableType = {
    None: 'none',
    Arrow: 'arrow',
    TimeSpan: 'timespan',
    Marker: 'marker',
    TimeJump: 'timejump',
    TextAnnotation: 'textannotation',
    Signal: 'signal',
    ClockEdge: 'clockedge'  // Clock edge transition for polarity editing (P/N vs p/n)
};

// Current selection state
let currentSelection = {
    type: SelectableType.None,
    id: null,
    object: null
};

/**
 * Clear the current selection
 */
function clearObjectSelection() {
    currentSelection = {
        type: SelectableType.None,
        id: null,
        object: null
    };
    updatePropertiesButtonState();
    hidePropertiesPanel();
    if (typeof setSelectedObject === 'function') {
        setSelectedObject(null, null);
    }
    // Also clear multiple selection
    if (typeof clearAllObjectSelections === 'function') {
        clearAllObjectSelections();
    }
}

/**
 * Select an object
 * @param {string} type - SelectableType value
 * @param {number|object} idOrObject - Object ID or the object itself
 * @param {object} extraData - Extra data for special types (e.g., ClockEdge)
 */
function selectObject(type, idOrObject, extraData = null) {
    let id = null;
    let obj = null;
    
    switch (type) {
        case SelectableType.Arrow:
            id = typeof idOrObject === 'number' ? idOrObject : idOrObject.id;
            obj = document_wave.arrowList().find(a => a.id === id);
            break;
        case SelectableType.TimeSpan:
            id = typeof idOrObject === 'number' ? idOrObject : idOrObject.id;
            obj = document_wave.timeSpanMarkerList().find(ts => ts.id === id);
            break;
        case SelectableType.Marker:
            id = typeof idOrObject === 'number' ? idOrObject : idOrObject.id;
            obj = document_wave.markerList().find(m => m.id === id);
            break;
        case SelectableType.TimeJump:
            id = typeof idOrObject === 'number' ? idOrObject : idOrObject.id;
            obj = document_wave.timeJumpList().find(tj => tj.id === id);
            break;
        case SelectableType.TextAnnotation:
            id = typeof idOrObject === 'number' ? idOrObject : idOrObject.id;
            obj = document_wave.textAnnotationList().find(ta => ta.id === id);
            break;
        case SelectableType.Signal:
            id = typeof idOrObject === 'number' ? idOrObject : idOrObject;
            obj = document_wave.signalList()[id];
            break;
        case SelectableType.ClockEdge:
            // ClockEdge uses extraData: { signalIndex, sampleIndex, edgeType }
            // id is the signalIndex for identification
            id = extraData ? extraData.signalIndex : null;
            obj = extraData;  // Store the full edge info as the object
            break;
    }
    
    if (!obj && type !== SelectableType.Signal && type !== SelectableType.ClockEdge) {
        clearObjectSelection();
        return;
    }
    
    currentSelection = {
        type: type,
        id: id,
        object: obj
    };
    
    updatePropertiesButtonState();
    
    // Notify WaveView about the selection for visual feedback
    if (typeof setSelectedObject === 'function') {
        setSelectedObject(type, id);
    }
}

/**
 * Get the current selection
 * @returns {object} Current selection state
 */
function getObjectSelection() {
    return currentSelection;
}

/**
 * Check if an object is currently selected
 * @returns {boolean}
 */
function hasObjectSelection() {
    if (currentSelection.type === SelectableType.None) return false;
    // For ClockEdge, check object exists instead of id (signalIndex can be 0)
    if (currentSelection.type === SelectableType.ClockEdge) {
        return currentSelection.object !== null;
    }
    return currentSelection.id !== null;
}

/**
 * Update the properties button enabled/disabled state
 */
function updatePropertiesButtonState() {
    const btn = document.getElementById('tool-properties');
    if (!btn) return;
    
    if (hasObjectSelection()) {
        btn.disabled = false;
        btn.classList.remove('disabled');
        btn.title = `Properties (${getSelectionTypeName()})`;
    } else {
        btn.disabled = true;
        btn.classList.add('disabled');
        btn.title = 'Properties (select an object first)';
    }
}

/**
 * Get a human-readable name for the current selection type
 */
function getSelectionTypeName() {
    switch (currentSelection.type) {
        case SelectableType.Arrow: return 'Arrow';
        case SelectableType.TimeSpan: return 'Time Span';
        case SelectableType.Marker: return 'Marker';
        case SelectableType.TimeJump: return 'Time Jump';
        case SelectableType.TextAnnotation: return 'Text';
        case SelectableType.Signal: return 'Signal';
        case SelectableType.ClockEdge: return 'Clock Edge';
        default: return '';
    }
}

/**
 * Show the properties panel for the currently selected object
 */
function showPropertiesPanel() {
    if (!hasObjectSelection()) return;
    
    // Remove any existing panel
    hidePropertiesPanel();
    
    const panel = document.createElement('div');
    panel.id = 'properties-panel';
    panel.className = 'properties-panel';
    
    // Build panel content based on selection type
    const content = buildPropertiesContent();
    panel.innerHTML = content;
    
    document.body.appendChild(panel);
    
    // Position panel near the properties button
    const btn = document.getElementById('tool-properties');
    if (btn) {
        const rect = btn.getBoundingClientRect();
        panel.style.top = (rect.bottom + 5) + 'px';
        panel.style.left = Math.max(10, rect.left - 100) + 'px';
    }
    
    // Setup event listeners
    setupPropertiesPanelEvents(panel);
    
    // Close when clicking outside
    setTimeout(() => {
        document.addEventListener('mousedown', handlePropertiesPanelOutsideClick);
    }, 0);
}

/**
 * Hide the properties panel
 */
function hidePropertiesPanel() {
    const panel = document.getElementById('properties-panel');
    if (panel) {
        panel.remove();
    }
    document.removeEventListener('mousedown', handlePropertiesPanelOutsideClick);
}

/**
 * Handle clicks outside the properties panel
 */
function handlePropertiesPanelOutsideClick(e) {
    const panel = document.getElementById('properties-panel');
    const btn = document.getElementById('tool-properties');
    
    if (panel && !panel.contains(e.target) && btn && !btn.contains(e.target)) {
        hidePropertiesPanel();
    }
}

/**
 * Build the properties panel HTML content based on selection type
 */
function buildPropertiesContent() {
    const sel = currentSelection;
    let html = `<div class="properties-header">
        <span class="properties-title">${getSelectionTypeName()} Properties</span>
        <button class="properties-close" onclick="hidePropertiesPanel()">&times;</button>
    </div>
    <div class="properties-body">`;
    
    switch (sel.type) {
        case SelectableType.Arrow:
            html += buildArrowProperties(sel.object);
            break;
        case SelectableType.TimeSpan:
            html += buildTimeSpanProperties(sel.object);
            break;
        case SelectableType.Marker:
            html += buildMarkerProperties(sel.object);
            break;
        case SelectableType.TimeJump:
            html += buildTimeJumpProperties(sel.object);
            break;
        case SelectableType.TextAnnotation:
            html += buildTextAnnotationProperties(sel.object);
            break;
        case SelectableType.Signal:
            html += buildSignalProperties(sel.object, sel.id);
            break;
        case SelectableType.ClockEdge:
            html += buildClockEdgeProperties(sel.object);
            break;
    }
    
    html += `</div>`;
    
    // Only show delete button for deletable objects (not ClockEdge)
    if (sel.type !== SelectableType.ClockEdge) {
        html += `
    <div class="properties-footer">
        <button class="properties-delete-btn" onclick="deleteSelectedObject()">Delete</button>
    </div>`;
    }
    
    return html;
}

/**
 * Build Arrow properties HTML
 */
function buildArrowProperties(arrow) {
    const styleOptions = [
        { value: '~', label: 'Spline' },
        { value: '~>', label: 'Spline →' },
        { value: '<~>', label: '← Spline →' },
        { value: '-', label: 'Straight' },
        { value: '->', label: 'Straight →' },
        { value: '<->', label: '← Straight →' }
    ];
    
    let styleSelect = '<select id="prop-arrow-style" class="prop-input">';
    for (const opt of styleOptions) {
        const selected = arrow.style === opt.value ? 'selected' : '';
        styleSelect += `<option value="${opt.value}" ${selected}>${opt.label}</option>`;
    }
    styleSelect += '</select>';
    
    const colorValue = arrow.color || '#00ff00';
    
    return `
        <div class="prop-row">
            <label class="prop-label">Style:</label>
            ${styleSelect}
        </div>
        <div class="prop-row">
            <label class="prop-label">Color:</label>
            <input type="color" id="prop-arrow-color" class="prop-color-input" value="${colorValue}">
            <button class="prop-reset-btn" onclick="resetArrowColor()">Reset</button>
        </div>
    `;
}

/**
 * Build Time Span properties HTML
 */
function buildTimeSpanProperties(timeSpan) {
    const styleOptions = [
        { value: '-|', label: 'L-Shape (horiz→vert)' },
        { value: '|-', label: 'L-Shape (vert→horiz)' },
        { value: '-|-', label: 'Z-Shape' }
    ];
    
    let styleSelect = '<select id="prop-timespan-style" class="prop-input">';
    for (const opt of styleOptions) {
        const selected = timeSpan.style === opt.value ? 'selected' : '';
        styleSelect += `<option value="${opt.value}" ${selected}>${opt.label}</option>`;
    }
    styleSelect += '</select>';
    
    const colorValue = timeSpan.color || '#00ff00';
    
    return `
        <div class="prop-row">
            <label class="prop-label">Style:</label>
            ${styleSelect}
        </div>
        <div class="prop-row">
            <label class="prop-label">Color:</label>
            <input type="color" id="prop-timespan-color" class="prop-color-input" value="${colorValue}">
            <button class="prop-reset-btn" onclick="resetTimeSpanColor()">Reset</button>
        </div>
    `;
}

/**
 * Build Marker properties HTML
 */
function buildMarkerProperties(marker) {
    const colorValue = marker.color || '#ffff00';
    
    return `
        <div class="prop-row">
            <label class="prop-label">Sample:</label>
            <input type="number" id="prop-marker-sample" class="prop-input" value="${marker.sample}" min="0">
        </div>
        <div class="prop-row">
            <label class="prop-label">Color:</label>
            <input type="color" id="prop-marker-color" class="prop-color-input" value="${colorValue}">
            <button class="prop-reset-btn" onclick="resetMarkerColor()">Reset</button>
        </div>
    `;
}

/**
 * Build Time Jump properties HTML
 */
function buildTimeJumpProperties(timeJump) {
    const colorValue = timeJump.color || '#888888';
    
    return `
        <div class="prop-row">
            <label class="prop-label">Sample:</label>
            <input type="number" id="prop-timejump-sample" class="prop-input" value="${timeJump.sample}" min="0">
        </div>
        <div class="prop-row">
            <label class="prop-label">Color:</label>
            <input type="color" id="prop-timejump-color" class="prop-color-input" value="${colorValue}">
            <button class="prop-reset-btn" onclick="resetTimeJumpColor()">Reset</button>
        </div>
    `;
}

/**
 * Build Text Annotation properties HTML
 */
function buildTextAnnotationProperties(annotation) {
    const colorValue = annotation.color || '#ffffff';
    const bgColorValue = annotation.backgroundColor || '#333333';
    const hasBgColor = annotation.backgroundColor !== null && annotation.backgroundColor !== undefined;
    
    const vPosOptions = ['Above', 'Center', 'Below'];
    let vPosSelect = '<select id="prop-text-vpos" class="prop-input">';
    for (const pos of vPosOptions) {
        const selected = annotation.vPos === pos ? 'selected' : '';
        vPosSelect += `<option value="${pos}" ${selected}>${pos}</option>`;
    }
    vPosSelect += '</select>';
    
    return `
        <div class="prop-row">
            <label class="prop-label">Text:</label>
            <input type="text" id="prop-text-content" class="prop-input prop-text-input" value="${escapeHtml(annotation.text)}">
        </div>
        <div class="prop-row">
            <label class="prop-label">Position:</label>
            ${vPosSelect}
        </div>
        <div class="prop-row">
            <label class="prop-label">Font Size:</label>
            <input type="number" id="prop-text-fontsize" class="prop-input" value="${annotation.fontSize || 12}" min="8" max="48">
        </div>
        <div class="prop-row">
            <label class="prop-label">Bold:</label>
            <input type="checkbox" id="prop-text-bold" ${annotation.bold ? 'checked' : ''}>
        </div>
        <div class="prop-row">
            <label class="prop-label">Color:</label>
            <input type="color" id="prop-text-color" class="prop-color-input" value="${colorValue}">
        </div>
        <div class="prop-row">
            <label class="prop-label">
                <input type="checkbox" id="prop-text-bgcolor-enabled" ${hasBgColor ? 'checked' : ''}> Background:
            </label>
            <input type="color" id="prop-text-bgcolor" class="prop-color-input" value="${bgColorValue}" ${hasBgColor ? '' : 'disabled'}>
        </div>
    `;
}

/**
 * Build Signal properties HTML
 */
function buildSignalProperties(signal, signalIndex) {
    const colorValue = signal.color || '#00ff00';
    
    let typeLabel = 'Bit Signal';
    if (signal.type === SignalType.Vector) typeLabel = 'Vector Signal';
    if (signal.type === SignalType.BlankRow) typeLabel = 'Blank Row';
    
    let html = `
        <div class="prop-row">
            <label class="prop-label">Name:</label>
            <input type="text" id="prop-signal-name" class="prop-input prop-text-input" value="${escapeHtml(signal.name)}">
        </div>
        <div class="prop-row">
            <label class="prop-label">Type:</label>
            <span class="prop-value">${typeLabel}</span>
        </div>
        <div class="prop-row">
            <label class="prop-label">Color:</label>
            <input type="color" id="prop-signal-color" class="prop-color-input" value="${colorValue}">
            <button class="prop-reset-btn" onclick="resetSignalColor()">Reset</button>
        </div>
    `;
    
    if (signal.type === SignalType.Bit) {
        const showClockMarkers = signal.showClockMarkers !== false;
        html += `
        <div class="prop-row">
            <label class="prop-label">Rise Time:</label>
            <input type="number" id="prop-signal-rise" class="prop-input" value="${signal.riseTime || 0}" min="0" max="1" step="0.1">
        </div>
        <div class="prop-row">
            <label class="prop-label">Fall Time:</label>
            <input type="number" id="prop-signal-fall" class="prop-input" value="${signal.fallTime || 0}" min="0" max="1" step="0.1">
        </div>
        <div class="prop-row" style="margin-top: 8px; padding-top: 8px; border-top: 1px solid var(--border-color);">
            <label class="prop-label">Clock Markers:</label>
            <input type="checkbox" id="prop-signal-clockmarkers" ${showClockMarkers ? 'checked' : ''}>
            <span style="font-size: 11px; color: var(--text-muted); margin-left: 4px;">Show P/N arrows</span>
        </div>
        `;
    }
    
    return html;
}

/**
 * Build Clock Edge properties HTML
 * Shows only a checkbox to enable/disable polarity visibility
 */
function buildClockEdgeProperties(edgeInfo) {
    if (!edgeInfo) return '<div class="prop-row">No edge selected</div>';
    
    const { signalIndex, sampleIndex, edgeType, hasMarker } = edgeInfo;
    const signals = document_wave.signalList();
    const signal = signals[signalIndex];
    const signalName = signal ? signal.name : 'Unknown';
    
    // Check if THIS specific edge has a marker enabled
    const thisEdgeHasMarker = signal && signal.clockMarkers && signal.clockMarkers[sampleIndex] === true;
    
    // Check if edgeArrow is active (blocks polarity feature)
    const edgeArrowValue = signal ? signal.edgeArrow : undefined;
    const hasEdgeArrow = edgeArrowValue && edgeArrowValue !== 'none';
    const edgeArrowLabel = edgeArrowValue === 'positive' ? 'Rising' : edgeArrowValue === 'negative' ? 'Falling' : '';
    
    // edgeType is 'rising' or 'falling'
    const edgeLabel = edgeType === 'rising' ? '↑ Rising Edge' : '↓ Falling Edge';
    
    let html = `
        <div class="prop-row">
            <label class="prop-label">Signal:</label>
            <span class="prop-value">${escapeHtml(signalName)}</span>
        </div>
        <div class="prop-row">
            <label class="prop-label">Position:</label>
            <span class="prop-value">Sample ${sampleIndex}</span>
        </div>
        <div class="prop-row">
            <label class="prop-label">Edge:</label>
            <span class="prop-value">${edgeLabel}</span>
        </div>
    `;
    
    if (hasEdgeArrow) {
        // Edge Arrow is active - polarity feature not available
        html += `
        <div class="prop-row" style="margin-top: 12px; padding-top: 12px; border-top: 1px solid var(--border-color);">
            <span style="font-size: 11px; color: var(--text-muted); font-style: italic;">
                ⚠️ Polarity not available.<br>
                Signal has ${edgeArrowLabel} Edge enabled in Signal Properties.
            </span>
        </div>
        `;
    } else {
        // Normal - show checkbox for this specific edge
        html += `
        <div class="prop-row" style="margin-top: 12px; padding-top: 12px; border-top: 1px solid var(--border-color);">
            <label class="prop-label">Show Polarity:</label>
            <input type="checkbox" id="prop-clockedge-visible" ${thisEdgeHasMarker ? 'checked' : ''} title="Show polarity marker on this edge">
        </div>
        <div class="prop-help" style="font-size: 11px; color: var(--text-muted); margin-top: 8px;">
            Shows a P/N polarity arrow on this clock edge.
        </div>
        `;
    }
    
    return html;
}

/**
 * Escape HTML special characters
 */
function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/&/g, '&amp;')
              .replace(/</g, '&lt;')
              .replace(/>/g, '&gt;')
              .replace(/"/g, '&quot;')
              .replace(/'/g, '&#039;');
}

/**
 * Setup event listeners for the properties panel
 */
function setupPropertiesPanelEvents(panel) {
    const sel = currentSelection;
    
    // Arrow events
    if (sel.type === SelectableType.Arrow) {
        const styleSelect = panel.querySelector('#prop-arrow-style');
        const colorInput = panel.querySelector('#prop-arrow-color');
        
        if (styleSelect) {
            styleSelect.addEventListener('change', () => {
                document_wave.setArrowStyleById(sel.id, styleSelect.value);
            });
        }
        if (colorInput) {
            colorInput.addEventListener('input', () => {
                document_wave.setArrowColorById(sel.id, colorInput.value);
            });
        }
    }
    
    // Time Span events
    if (sel.type === SelectableType.TimeSpan) {
        const styleSelect = panel.querySelector('#prop-timespan-style');
        const colorInput = panel.querySelector('#prop-timespan-color');
        
        if (styleSelect) {
            styleSelect.addEventListener('change', () => {
                document_wave.setTimeSpanMarkerStyle(sel.id, styleSelect.value);
            });
        }
        if (colorInput) {
            colorInput.addEventListener('input', () => {
                document_wave.setTimeSpanMarkerColor(sel.id, colorInput.value);
            });
        }
    }
    
    // Marker events
    if (sel.type === SelectableType.Marker) {
        const sampleInput = panel.querySelector('#prop-marker-sample');
        const colorInput = panel.querySelector('#prop-marker-color');
        
        if (sampleInput) {
            sampleInput.addEventListener('change', () => {
                const newSample = parseInt(sampleInput.value, 10);
                if (!isNaN(newSample) && typeof document_wave.setMarkerSample === 'function') {
                    document_wave.setMarkerSample(sel.id, newSample);
                }
            });
        }
        if (colorInput) {
            colorInput.addEventListener('input', () => {
                if (typeof document_wave.setMarkerColor === 'function') {
                    document_wave.setMarkerColor(sel.id, colorInput.value);
                }
            });
        }
    }
    
    // Time Jump events
    if (sel.type === SelectableType.TimeJump) {
        const colorInput = panel.querySelector('#prop-timejump-color');
        
        if (colorInput) {
            colorInput.addEventListener('input', () => {
                if (typeof document_wave.setTimeJumpColor === 'function') {
                    document_wave.setTimeJumpColor(sel.id, colorInput.value);
                }
            });
        }
    }
    
    // Text Annotation events
    if (sel.type === SelectableType.TextAnnotation) {
        const textInput = panel.querySelector('#prop-text-content');
        const vPosSelect = panel.querySelector('#prop-text-vpos');
        const fontSizeInput = panel.querySelector('#prop-text-fontsize');
        const boldCheck = panel.querySelector('#prop-text-bold');
        const colorInput = panel.querySelector('#prop-text-color');
        const bgColorEnabledCheck = panel.querySelector('#prop-text-bgcolor-enabled');
        const bgColorInput = panel.querySelector('#prop-text-bgcolor');
        
        if (textInput) {
            textInput.addEventListener('input', () => {
                document_wave.setTextAnnotationText(sel.id, textInput.value);
            });
        }
        if (vPosSelect) {
            vPosSelect.addEventListener('change', () => {
                if (typeof document_wave.setTextAnnotationVPos === 'function') {
                    document_wave.setTextAnnotationVPos(sel.id, vPosSelect.value);
                }
            });
        }
        if (fontSizeInput) {
            fontSizeInput.addEventListener('change', () => {
                if (typeof document_wave.setTextAnnotationFontSize === 'function') {
                    document_wave.setTextAnnotationFontSize(sel.id, parseInt(fontSizeInput.value, 10));
                }
            });
        }
        if (boldCheck) {
            boldCheck.addEventListener('change', () => {
                if (typeof document_wave.setTextAnnotationBold === 'function') {
                    document_wave.setTextAnnotationBold(sel.id, boldCheck.checked);
                }
            });
        }
        if (colorInput) {
            colorInput.addEventListener('input', () => {
                if (typeof document_wave.setTextAnnotationColor === 'function') {
                    document_wave.setTextAnnotationColor(sel.id, colorInput.value);
                }
            });
        }
        if (bgColorEnabledCheck && bgColorInput) {
            bgColorEnabledCheck.addEventListener('change', () => {
                bgColorInput.disabled = !bgColorEnabledCheck.checked;
                if (typeof document_wave.setTextAnnotationBackgroundColor === 'function') {
                    const bgColor = bgColorEnabledCheck.checked ? bgColorInput.value : null;
                    document_wave.setTextAnnotationBackgroundColor(sel.id, bgColor);
                }
            });
            bgColorInput.addEventListener('input', () => {
                if (bgColorEnabledCheck.checked && typeof document_wave.setTextAnnotationBackgroundColor === 'function') {
                    document_wave.setTextAnnotationBackgroundColor(sel.id, bgColorInput.value);
                }
            });
        }
    }
    
    // Signal events
    if (sel.type === SelectableType.Signal) {
        const nameInput = panel.querySelector('#prop-signal-name');
        const colorInput = panel.querySelector('#prop-signal-color');
        const riseInput = panel.querySelector('#prop-signal-rise');
        const fallInput = panel.querySelector('#prop-signal-fall');
        const clockMarkersCheck = panel.querySelector('#prop-signal-clockmarkers');
        
        if (nameInput) {
            nameInput.addEventListener('input', () => {
                document_wave.setSignalName(sel.id, nameInput.value);
            });
        }
        if (colorInput) {
            colorInput.addEventListener('input', () => {
                document_wave.setSignalColor(sel.id, colorInput.value);
            });
        }
        if (riseInput) {
            riseInput.addEventListener('change', () => {
                if (typeof document_wave.setSignalRiseTime === 'function') {
                    document_wave.setSignalRiseTime(sel.id, parseFloat(riseInput.value));
                }
            });
        }
        if (fallInput) {
            fallInput.addEventListener('change', () => {
                if (typeof document_wave.setSignalFallTime === 'function') {
                    document_wave.setSignalFallTime(sel.id, parseFloat(fallInput.value));
                }
            });
        }
        if (clockMarkersCheck) {
            clockMarkersCheck.addEventListener('change', () => {
                const signals = document_wave.signalList();
                const signal = signals[sel.id];
                if (signal) {
                    if (typeof document_wave.pushUndoSnapshot === 'function') {
                        document_wave.pushUndoSnapshot();
                    }
                    signal.showClockMarkers = clockMarkersCheck.checked;
                    if (typeof drawWaveform === 'function') {
                        drawWaveform();
                    }
                }
            });
        }
    }
    
    // ClockEdge events - only visibility checkbox now
    if (sel.type === SelectableType.ClockEdge && sel.object) {
        const visibleCheck = panel.querySelector('#prop-clockedge-visible');
        
        if (visibleCheck) {
            visibleCheck.addEventListener('change', () => {
                const { signalIndex, sampleIndex } = sel.object;
                const signals = document_wave.signalList();
                const signal = signals[signalIndex];
                
                if (signal) {
                    // Save undo state
                    if (typeof document_wave.pushUndoSnapshot === 'function') {
                        document_wave.pushUndoSnapshot();
                    }
                    
                    // Update ONLY this specific edge's marker
                    if (signal.clockMarkers && sampleIndex < signal.clockMarkers.length) {
                        signal.clockMarkers[sampleIndex] = visibleCheck.checked;
                    }
                    
                    // Update showClockMarkers based on whether ANY edge has a marker
                    const hasAnyMarker = signal.clockMarkers && signal.clockMarkers.some(m => m === true);
                    signal.showClockMarkers = hasAnyMarker;
                    
                    // Redraw
                    if (typeof drawWaveform === 'function') {
                        drawWaveform();
                    }
                }
            });
        }
    }
}

/**
 * Delete the currently selected object
 */
function deleteSelectedObject() {
    const sel = currentSelection;
    if (!hasObjectSelection()) return;
    
    switch (sel.type) {
        case SelectableType.Arrow:
            document_wave.subArrowById(sel.id);
            break;
        case SelectableType.TimeSpan:
            document_wave.subTimeSpanMarkerById(sel.id);
            break;
        case SelectableType.Marker:
            document_wave.subMarkerById(sel.id);
            break;
        case SelectableType.TimeJump:
            document_wave.subTimeJumpById(sel.id);
            break;
        case SelectableType.TextAnnotation:
            document_wave.removeTextAnnotation(sel.id);
            break;
        case SelectableType.Signal:
            document_wave.subSignal(sel.id);
            break;
        case SelectableType.ClockEdge:
            // Clock edges are part of the signal - cannot be deleted individually
            // Just clear selection
            break;
    }
    
    clearObjectSelection();
}

/**
 * Reset color helper functions
 */
function resetArrowColor() {
    if (currentSelection.type === SelectableType.Arrow) {
        document_wave.setArrowColorById(currentSelection.id, null);
        const colorInput = document.querySelector('#prop-arrow-color');
        if (colorInput) colorInput.value = '#00ff00';
    }
}

function resetTimeSpanColor() {
    if (currentSelection.type === SelectableType.TimeSpan) {
        document_wave.setTimeSpanMarkerColor(currentSelection.id, null);
        const colorInput = document.querySelector('#prop-timespan-color');
        if (colorInput) colorInput.value = '#00ff00';
    }
}

function resetMarkerColor() {
    if (currentSelection.type === SelectableType.Marker) {
        if (typeof document_wave.setMarkerColor === 'function') {
            document_wave.setMarkerColor(currentSelection.id, null);
        }
        const colorInput = document.querySelector('#prop-marker-color');
        if (colorInput) colorInput.value = '#ffff00';
    }
}

function resetSignalColor() {
    if (currentSelection.type === SelectableType.Signal) {
        document_wave.setSignalColor(currentSelection.id, null);
        const colorInput = document.querySelector('#prop-signal-color');
        if (colorInput) colorInput.value = '#00ff00';
    }
}

/**
 * Toggle properties panel
 */
function togglePropertiesPanel() {
    const panel = document.getElementById('properties-panel');
    if (panel) {
        hidePropertiesPanel();
    } else if (hasObjectSelection()) {
        showPropertiesPanel();
    }
}

/**
 * Initialize the property editor system
 */
function initPropertyEditor() {
    // Properties button click handler
    const propsBtn = document.getElementById('tool-properties');
    if (propsBtn) {
        propsBtn.addEventListener('click', togglePropertiesPanel);
    }
    
    // Note: tool-select-object button is handled by the generic tool button 
    // handler in AppInit.js (via data-tool attribute)
    
    // Initial state - properties button disabled
    updatePropertiesButtonState();
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initPropertyEditor);
} else {
    initPropertyEditor();
}
