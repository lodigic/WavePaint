/**
 * AppContextMenus.js - Context menu handlers for canvas
 */

/**
 * Maps element type string to SelectableType enum.
 */
function mapElementTypeToSelectableType(elemType) {
    if (typeof SelectableType === 'undefined') return null;
    switch (elemType) {
        case 'arrow': return SelectableType.Arrow;
        case 'marker': return SelectableType.Marker;
        case 'timeJump': return SelectableType.TimeJump;
        case 'timeSpan': return SelectableType.TimeSpan;
        case 'textAnnotation': return SelectableType.TextAnnotation;
        default: return null;
    }
}

/**
 * Selects an element for context menu highlighting.
 * Maps element type to SelectableType and calls selectObject.
 */
function selectElementForContextMenu(elem) {
    if (typeof selectObject !== 'function' || typeof SelectableType === 'undefined') return;
    
    switch (elem.type) {
        case 'arrow':
            selectObject(SelectableType.Arrow, elem.element.id);
            break;
        case 'marker':
            selectObject(SelectableType.Marker, elem.element.id);
            break;
        case 'timeJump':
            selectObject(SelectableType.TimeJump, elem.element.id);
            break;
        case 'timeSpan':
            selectObject(SelectableType.TimeSpan, elem.element.id);
            break;
        case 'textAnnotation':
            selectObject(SelectableType.TextAnnotation, elem.element.id);
            break;
    }
    drawWaveform();
}

/**
 * Collects all elements at the given mouse position.
 * Returns an array of { type, element, label } objects.
 */
function collectElementsAtPoint(mouseX, mouseY) {
    const elements = [];
    
    // Check arrows
    if (typeof findArrowNearPoint === 'function') {
        const arrowId = findArrowNearPoint(mouseX, mouseY);
        if (arrowId >= 0) {
            const arrow = document_wave.arrowList().find(a => a.id === arrowId);
            if (arrow) {
                elements.push({ type: 'arrow', element: arrow, label: `Arrow #${arrowId}` });
            }
        }
    }
    
    // Check markers
    if (typeof hitTestMarker === 'function') {
        const marker = hitTestMarker(mouseX, mouseY);
        if (marker) {
            elements.push({ type: 'marker', element: marker, label: `Marker #${marker.id}` });
        }
    }
    
    // Check time jumps
    if (typeof hitTestTimeJump === 'function') {
        const timeJump = hitTestTimeJump(mouseX, mouseY);
        if (timeJump) {
            elements.push({ type: 'timeJump', element: timeJump, label: `Time Jump #${timeJump.id}` });
        }
    }
    
    // Check time spans
    if (typeof hitTestTimeSpan === 'function') {
        const timeSpan = hitTestTimeSpan(mouseX, mouseY);
        if (timeSpan) {
            elements.push({ type: 'timeSpan', element: timeSpan, label: `Time Span #${timeSpan.id}` });
        }
    }
    
    // Check text annotations
    if (typeof hitTestTextAnnotation === 'function') {
        const annotation = hitTestTextAnnotation(mouseX, mouseY);
        if (annotation) {
            const label = annotation.text ? `Text: "${annotation.text.substring(0, 15)}${annotation.text.length > 15 ? '...' : ''}"` : `Text #${annotation.id}`;
            elements.push({ type: 'textAnnotation', element: annotation, label: label });
        }
    }
    
    return elements;
}

/**
 * Shows a combined context menu when multiple elements overlap.
 */
function showCombinedContextMenu(clientX, clientY, elements) {
    // Remove any existing context menu
    const existing = document.querySelector('.context-menu');
    if (existing) existing.remove();

    // Select all elements to highlight them
    if (typeof setSelectedObjects === 'function') {
        const selectableObjects = elements.map(elem => ({
            type: mapElementTypeToSelectableType(elem.type),
            id: elem.element.id
        }));
        setSelectedObjects(selectableObjects);
    }

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

    // Helper to create submenu container
    function createSubmenuContainer(labelText) {
        const container = document.createElement('div');
        container.className = 'submenu-container';
        container.style.position = 'relative';
        
        const item = document.createElement('div');
        item.innerHTML = labelText + ' <span style="float: right; opacity: 0.5;">▶</span>';
        item.style.padding = '8px 12px';
        item.style.cursor = 'pointer';
        item.style.color = 'var(--text-color)';
        container.appendChild(item);
        
        const submenu = document.createElement('div');
        submenu.className = 'context-menu';
        submenu.style.position = 'absolute';
        submenu.style.left = '100%';
        submenu.style.top = '-6px';
        submenu.style.display = 'none';
        submenu.style.minWidth = '160px';
        submenu.style.background = 'var(--bg-color)';
        submenu.style.border = '1px solid var(--border-color)';
        submenu.style.borderRadius = '4px';
        submenu.style.boxShadow = '0 2px 8px rgba(0,0,0,0.3)';
        submenu.style.zIndex = '5501';
        container.appendChild(submenu);
        
        container.addEventListener('mouseenter', () => {
            item.style.background = 'var(--accent-color)';
            submenu.style.display = 'block';
        });
        container.addEventListener('mouseleave', () => {
            item.style.background = 'transparent';
            submenu.style.display = 'none';
        });
        
        return { container, submenu };
    }

    // Helper to add submenu item with optional element for selection highlighting
    function addSubmenuItem(parent, text, callback, elemForSelection) {
        const item = document.createElement('div');
        item.textContent = text;
        item.style.padding = '8px 12px';
        item.style.cursor = 'pointer';
        item.style.color = 'var(--text-color)';
        item.addEventListener('mouseenter', () => {
            item.style.background = 'var(--accent-color)';
            // Select the element to highlight it when hovering
            if (elemForSelection) {
                selectElementForContextMenu(elemForSelection);
            }
        });
        item.addEventListener('mouseleave', () => {
            item.style.background = 'transparent';
        });
        item.addEventListener('click', (e) => {
            e.stopPropagation();
            callback();
            if (menu.parentNode) document.body.removeChild(menu);
        });
        parent.appendChild(item);
        return item;
    }

    // Delete submenu
    const deleteMenu = createSubmenuContainer('Delete');
    for (const elem of elements) {
        addSubmenuItem(deleteMenu.submenu, elem.label, () => {
            deleteElement(elem);
        }, elem);
    }
    menu.appendChild(deleteMenu.container);

    // Edit submenu - only for elements that have editable properties
    const editableElements = elements.filter(elem => elem.type === 'textAnnotation');
    if (editableElements.length > 0) {
        const editMenu = createSubmenuContainer('Edit');
        for (const elem of editableElements) {
            addSubmenuItem(editMenu.submenu, elem.label, async () => {
                await editElementProperties(elem);
            }, elem);
        }
        menu.appendChild(editMenu.container);
    }

    // Change Color submenu
    const colorMenu = createSubmenuContainer('Change Color');
    for (const elem of elements) {
        addSubmenuItem(colorMenu.submenu, elem.label, async () => {
            await changeElementColor(elem);
        }, elem);
    }
    menu.appendChild(colorMenu.container);

    // Close menu when clicking elsewhere
    function closeMenu(e) {
        if (!menu.contains(e.target)) {
            if (menu.parentNode) {
                document.body.removeChild(menu);
            }
            document.removeEventListener('click', closeMenu);
            // Clear selection when menu closes
            if (typeof clearObjectSelection === 'function') {
                clearObjectSelection();
                drawWaveform();
            }
        }
    }

    document.body.appendChild(menu);
    setTimeout(() => {
        document.addEventListener('click', closeMenu);
    }, 10);
}

/**
 * Delete an element based on its type.
 */
function deleteElement(elem) {
    switch (elem.type) {
        case 'arrow':
            document_wave.subArrowById(elem.element.id);
            break;
        case 'marker':
            document_wave.subMarkerById(elem.element.id);
            break;
        case 'timeJump':
            document_wave.subTimeJumpById(elem.element.id);
            break;
        case 'timeSpan':
            document_wave.subTimeSpanMarkerById(elem.element.id);
            break;
        case 'textAnnotation':
            document_wave.removeTextAnnotation(elem.element.id);
            break;
    }
    drawWaveform();
}

/**
 * Change the color of an element based on its type.
 */
async function changeElementColor(elem) {
    let defaultColor, currentColor, title;
    
    switch (elem.type) {
        case 'arrow':
            defaultColor = getComputedStyle(document.body).getPropertyValue('--arrow-color').trim() || '#ff6b00';
            currentColor = elem.element.color || defaultColor;
            title = 'Arrow Color';
            break;
        case 'marker':
            defaultColor = '#00a0ff';
            currentColor = elem.element.color || defaultColor;
            title = 'Marker Color';
            break;
        case 'timeJump':
            defaultColor = '#888888';
            currentColor = elem.element.color || defaultColor;
            title = 'Time Jump Color';
            break;
        case 'timeSpan':
            defaultColor = getComputedStyle(document.body).getPropertyValue('--arrow-color').trim() || '#ff6b00';
            currentColor = elem.element.color || defaultColor;
            title = 'Time Span Color';
            break;
        case 'textAnnotation':
            defaultColor = getComputedStyle(document.body).getPropertyValue('--label-text-color').trim() || '#ffffff';
            currentColor = elem.element.color || defaultColor;
            title = 'Text Color';
            break;
        default:
            return;
    }
    
    const newColor = await openColorPicker(currentColor, null, title);
    if (newColor) {
        switch (elem.type) {
            case 'arrow':
                document_wave.setArrowColorById(elem.element.id, newColor);
                break;
            case 'marker':
                document_wave.setMarkerColorById(elem.element.id, newColor);
                break;
            case 'timeJump':
                document_wave.setTimeJumpColorById(elem.element.id, newColor);
                break;
            case 'timeSpan':
                document_wave.setTimeSpanMarkerColor(elem.element.id, newColor);
                break;
            case 'textAnnotation':
                if (typeof document_wave.setTextAnnotationColor === 'function') {
                    document_wave.setTextAnnotationColor(elem.element.id, newColor);
                }
                break;
        }
        drawWaveform();
    }
}

/**
 * Edit properties of an element based on its type.
 */
async function editElementProperties(elem) {
    switch (elem.type) {
        case 'textAnnotation':
            // Use the dialog from TextAnnotationContextMenu
            if (typeof showTextAnnotationPropertiesDialog === 'function') {
                await showTextAnnotationPropertiesDialog(elem.element);
            }
            break;
        // Add more editable types here as needed
    }
}

/**
 * Handles canvas context menu (right-click).
 */
function handleCanvasContextMenu(e) {
    e.preventDefault();
    
    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const signals = document_wave.signalList();
    const rowHeight = 40;
    const signalStartY = 40;
    const nameWidth = 200;
    
    // Collect all elements at the click point
    const elements = collectElementsAtPoint(mouseX, mouseY);
    
    // If multiple elements found, show combined menu
    if (elements.length > 1) {
        showCombinedContextMenu(e.clientX, e.clientY, elements);
        return;
    }
    
    // If exactly one element, show its individual context menu
    if (elements.length === 1) {
        const elem = elements[0];
        // Select the element to highlight it
        selectElementForContextMenu(elem);
        switch (elem.type) {
            case 'arrow':
                showArrowContextMenu(e.clientX, e.clientY, elem.element.id);
                return;
            case 'marker':
                showMarkerContextMenu(e.clientX, e.clientY, elem.element);
                return;
            case 'timeJump':
                showTimeJumpContextMenu(e.clientX, e.clientY, elem.element);
                return;
            case 'timeSpan':
                showTimeSpanContextMenu(e.clientX, e.clientY, elem.element);
                return;
            case 'textAnnotation':
                showTextAnnotationContextMenu(e.clientX, e.clientY, elem.element);
                return;
        }
    }
    
    const signalIndex = Math.floor((mouseY - signalStartY) / rowHeight);
    
    // If clicking below all signals or in empty area, show "Add Signal" menu
    if (signalIndex < 0 || signalIndex >= signals.length) {
        showAddSignalContextMenu(e.clientX, e.clientY);
        return;
    }

    const signal = signals[signalIndex];
    
    // Check if clicking on waveform area for vector signal
    const dynamicNameWidth = typeof getDynamicNameWidth === 'function' ? getDynamicNameWidth() : nameWidth;
    const isWaveformArea = mouseX >= dynamicNameWidth;
    
    if (isWaveformArea && signal.type === SignalType.Vector) {
        const signalEffectiveCount = document_wave.getSignalEffectiveSampleCount
            ? document_wave.getSignalEffectiveSampleCount(signal)
            : signal.values.length;
        // Use mapToSignalSample for a precise sample index (it uses Math.floor)
        let sampleIndex;
        if (typeof mapToSignalSample === 'function') {
            const mapped = mapToSignalSample(mouseX, mouseY);
            sampleIndex = mapped ? mapped.sampleIndex : -1;
        } else {
            // Fallback: use Math.floor to detect the correct sample
            const subStepCount = (signal.subSteps && signal.subSteps > 0)
                ? signal.subSteps
                : document_wave.subStepCount();
            const cellWidth = typeof getWaveCellWidth === 'function' ? getWaveCellWidth() : waveCellWidth;
            const subStepWidth = cellWidth / (subStepCount + 1);
            sampleIndex = Math.floor((mouseX - dynamicNameWidth) / subStepWidth);
        }
        
        if (sampleIndex < 0 || sampleIndex >= signalEffectiveCount) return;
        if (signal.values[sampleIndex] === -1) return;
        
        const labelCheck = signal.labels[sampleIndex] ? signal.labels[sampleIndex].toLowerCase().trim() : '';
        if (labelCheck === 'l' || labelCheck === 'h' || labelCheck === 'z') return;
        
        const segmentBounds = findVectorSegmentBounds(signal, sampleIndex);
        if (!segmentBounds) return;
        
        showSegmentPropertiesMenu(e.clientX, e.clientY, signalIndex, sampleIndex, segmentBounds);
        return;
    }
    
    // Allow right-click on waveform area for BlankRow signals
    if (isWaveformArea && signal.type !== SignalType.BlankRow) return;
    
    // Show signal context menu
    showSignalContextMenu(e.clientX, e.clientY, signalIndex, signal);
}

/**
 * Shows a context menu for adding signals (right-click on empty area).
 */
function showAddSignalContextMenu(clientX, clientY) {
    // Remove any existing context menus
    const existing = document.querySelectorAll('.context-menu');
    existing.forEach(m => m.remove());
    
    const menu = document.createElement('div');
    menu.className = 'context-menu';
    menu.style.position = 'fixed';
    menu.style.left = clientX + 'px';
    menu.style.top = clientY + 'px';
    menu.style.zIndex = '5500';
    
    function addSubmenuItem(parent, text, callback) {
        const item = document.createElement('div');
        item.className = 'menu-item';
        item.textContent = text;
        item.addEventListener('click', (e) => {
            e.stopPropagation();
            callback();
            if (menu.parentElement) document.body.removeChild(menu);
        });
        parent.appendChild(item);
        return item;
    }
    
    function addSeparatorTo(parent) {
        const sep = document.createElement('div');
        sep.className = 'context-menu-separator';
        sep.style.height = '1px';
        sep.style.background = 'var(--border-color)';
        sep.style.margin = '6px 12px';
        sep.style.padding = '0';
        sep.style.cursor = 'default';
        parent.appendChild(sep);
    }
    
    // Main "Add Signal" item with submenu
    const addSignalContainer = document.createElement('div');
    addSignalContainer.className = 'submenu-container';
    addSignalContainer.style.position = 'relative';
    
    const addSignalItem = document.createElement('div');
    addSignalItem.innerHTML = 'Add Signal <span style="float: right; opacity: 0.5;">▶</span>';
    addSignalContainer.appendChild(addSignalItem);
    
    const addSignalSubmenu = document.createElement('div');
    addSignalSubmenu.className = 'context-menu';
    addSignalSubmenu.style.position = 'absolute';
    addSignalSubmenu.style.left = '100%';
    addSignalSubmenu.style.top = '-6px';
    addSignalSubmenu.style.display = 'none';
    addSignalSubmenu.style.minWidth = '160px';
    addSignalContainer.appendChild(addSignalSubmenu);
    
    addSignalContainer.addEventListener('mouseenter', () => {
        addSignalSubmenu.style.display = 'block';
    });
    addSignalContainer.addEventListener('mouseleave', () => {
        addSignalSubmenu.style.display = 'none';
    });
    
    // Add Signal submenu items
    addSubmenuItem(addSignalSubmenu, 'Bit Signal', async () => {
        const bitName = await wpPrompt('Enter bit signal name:', 'Bit Signal', 'Add Bit Signal');
        if (bitName) {
            const idx = document_wave.addBitSignal(bitName);
            if (typeof getSelectedPaintColor === 'function' && getSelectedPaintColor()) {
                document_wave.setSignalColor(idx, getSelectedPaintColor());
            }
            drawWaveform();
            updateSidePanels();
        }
    });
    
    addSubmenuItem(addSignalSubmenu, 'Vector Signal', async () => {
        const vectorName = await wpPrompt('Enter vector signal name:', 'Vector Signal', 'Add Vector Signal');
        if (vectorName) {
            const idx = document_wave.addVectorSignal(vectorName);
            if (typeof getSelectedPaintColor === 'function' && getSelectedPaintColor()) {
                document_wave.setSignalColor(idx, getSelectedPaintColor());
            }
            drawWaveform();
            updateSidePanels();
        }
    });
    
    addSeparatorTo(addSignalSubmenu);
    
    // Predefined signals nested submenu
    const predefinedContainer = document.createElement('div');
    predefinedContainer.className = 'submenu-container';
    predefinedContainer.style.position = 'relative';
    
    const predefinedItem = document.createElement('div');
    predefinedItem.innerHTML = 'Predefined Signals <span style="float: right; opacity: 0.5;">▶</span>';
    predefinedContainer.appendChild(predefinedItem);
    
    const predefinedSubmenu = document.createElement('div');
    predefinedSubmenu.className = 'context-menu';
    predefinedSubmenu.style.position = 'absolute';
    predefinedSubmenu.style.left = '100%';
    predefinedSubmenu.style.top = '-6px';
    predefinedSubmenu.style.display = 'none';
    predefinedSubmenu.style.minWidth = '160px';
    predefinedContainer.appendChild(predefinedSubmenu);
    
    predefinedContainer.addEventListener('mouseenter', () => {
        predefinedSubmenu.style.display = 'block';
    });
    predefinedContainer.addEventListener('mouseleave', () => {
        predefinedSubmenu.style.display = 'none';
    });
    
    const predefinedSignals = [
        { name: 'Clock', fn: typeof addClockSignalDialog === 'function' ? addClockSignalDialog : null },
        { name: 'Counter', fn: typeof addCounterSignalDialog === 'function' ? addCounterSignalDialog : null },
        { name: 'Reset', fn: typeof addResetSignalDialog === 'function' ? addResetSignalDialog : null },
        { name: 'Pulse', fn: typeof addPulseSignalDialog === 'function' ? addPulseSignalDialog : null },
        { name: 'Strobe/Enable', fn: typeof addStrobeSignalDialog === 'function' ? addStrobeSignalDialog : null },
        { name: 'PWM', fn: typeof addPWMSignalDialog === 'function' ? addPWMSignalDialog : null },
        { name: 'Ramp', fn: typeof addRampSignalDialog === 'function' ? addRampSignalDialog : null },
        { name: 'Walking One', fn: typeof addWalkingOneSignalDialog === 'function' ? addWalkingOneSignalDialog : null },
        { name: 'Walking Zero', fn: typeof addWalkingZeroSignalDialog === 'function' ? addWalkingZeroSignalDialog : null },
        { name: 'Bus Idle', fn: typeof addBusIdleSignalDialog === 'function' ? addBusIdleSignalDialog : null },
        { name: 'Alternating', fn: typeof addAlternatingSignalDialog === 'function' ? addAlternatingSignalDialog : null },
        { name: 'Gray Code Counter', fn: typeof addGrayCodeSignalDialog === 'function' ? addGrayCodeSignalDialog : null }
    ];
    
    for (const sig of predefinedSignals) {
        if (sig.fn) {
            addSubmenuItem(predefinedSubmenu, sig.name, async () => {
                await sig.fn();
            });
        }
    }
    
    addSignalSubmenu.appendChild(predefinedContainer);
    
    addSeparatorTo(addSignalSubmenu);
    
    addSubmenuItem(addSignalSubmenu, 'Blank Row', () => {
        document_wave.addBlankRow();
        drawWaveform();
        updateSidePanels();
    });
    
    menu.appendChild(addSignalContainer);
    
    // Add Paste signal option if clipboard has content
    if (signalClipboard && signalClipboard.signals && signalClipboard.signals.length > 0) {
        const sep = document.createElement('div');
        sep.className = 'context-menu-separator';
        sep.style.height = '1px';
        sep.style.background = 'var(--border-color)';
        sep.style.margin = '4px 12px';
        sep.style.padding = '0';
        menu.appendChild(sep);
        
        const pasteLabel = signalClipboard.count > 1 
            ? `Paste ${signalClipboard.count} signals` 
            : 'Paste signal';
        const pasteItem = document.createElement('div');
        pasteItem.className = 'menu-item';
        pasteItem.textContent = pasteLabel;
        pasteItem.addEventListener('click', (e) => {
            e.stopPropagation();
            document_wave.pushUndoSnapshot();
            const signals = document_wave.signalList();
            for (const sig of signalClipboard.signals) {
                const newSignal = {
                    name: sig.name + ' (copy)',
                    type: sig.type,
                    color: sig.color,
                    values: [...sig.values],
                    labels: sig.labels ? [...sig.labels] : null,
                    radix: sig.radix,
                    segmentStyles: sig.segmentStyles ? sig.segmentStyles.map(s => ({...s})) : null,
                    edgeArrow: sig.edgeArrow,
                    riseTime: sig.riseTime,
                    fallTime: sig.fallTime
                };
                signals.push(newSignal);
            }
            drawWaveform();
            updateSidePanels();
            if (menu.parentElement) document.body.removeChild(menu);
        });
        menu.appendChild(pasteItem);
    }

    document.body.appendChild(menu);
    
    // Close menu on click outside
    const closeHandler = (e) => {
        if (!menu.contains(e.target)) {
            if (menu.parentElement) {
                document.body.removeChild(menu);
            }
            document.removeEventListener('click', closeHandler);
        }
    };
    setTimeout(() => document.addEventListener('click', closeHandler), 0);
    
    // Close menu when mouse leaves (with small delay to allow submenu navigation)
    let menuCloseTimeout;
    menu.addEventListener('mouseleave', function() {
        menuCloseTimeout = setTimeout(() => {
            if (menu.parentElement) {
                document.body.removeChild(menu);
            }
            document.removeEventListener('click', closeHandler);
        }, 100);
    });
    menu.addEventListener('mouseenter', function() {
        if (menuCloseTimeout) clearTimeout(menuCloseTimeout);
    });
}

// Export for module use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { handleCanvasContextMenu, showAddSignalContextMenu };
}
