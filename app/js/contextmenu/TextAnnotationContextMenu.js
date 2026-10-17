/**
 * TextAnnotation Context Menu - Right-click context menu for text annotations
 */

/**
 * Shows a dialog to edit text annotation properties.
 * @param {Object} annotation - The text annotation object
 */
async function showTextAnnotationPropertiesDialog(annotation) {
    if (!annotation) return;
    
    // Get current values
    const currentText = annotation.text || '';
    const currentColor = annotation.color || '#ffffff';
    const currentBgColor = annotation.backgroundColor || null;
    const hasBgColor = currentBgColor !== null;
    const currentFontSize = annotation.fontSize || 12;
    const currentBold = annotation.bold || false;
    const currentVPos = annotation.vPos || 'Above';
    
    // Create modal overlay
    const overlay = document.createElement('div');
    overlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0,0,0,0.5);
        z-index: 6000;
        display: flex;
        justify-content: center;
        align-items: center;
    `;
    
    // Create dialog
    const dialog = document.createElement('div');
    dialog.style.cssText = `
        background: var(--bg-color);
        border: 1px solid var(--border-color);
        border-radius: 8px;
        padding: 20px;
        min-width: 320px;
        max-width: 400px;
        box-shadow: 0 4px 20px rgba(0,0,0,0.4);
    `;
    
    dialog.innerHTML = `
        <h3 style="margin: 0 0 16px 0; color: var(--text-color); font-size: 16px;">Edit Text Properties</h3>
        
        <div style="margin-bottom: 12px;">
            <label style="display: block; margin-bottom: 4px; color: var(--text-color); font-size: 13px;">Text:</label>
            <input type="text" id="ta-prop-text" value="${currentText.replace(/"/g, '&quot;')}" 
                   style="width: 100%; padding: 6px 8px; background: var(--input-bg); border: 1px solid var(--border-color); 
                          border-radius: 4px; color: var(--text-color); box-sizing: border-box;">
        </div>
        
        <div style="margin-bottom: 12px;">
            <label style="display: block; margin-bottom: 4px; color: var(--text-color); font-size: 13px;">Position:</label>
            <select id="ta-prop-vpos" style="width: 100%; padding: 6px 8px; background: var(--input-bg); 
                    border: 1px solid var(--border-color); border-radius: 4px; color: var(--text-color);">
                <option value="Above" ${currentVPos === 'Above' ? 'selected' : ''}>Above</option>
                <option value="Center" ${currentVPos === 'Center' ? 'selected' : ''}>Center</option>
                <option value="Below" ${currentVPos === 'Below' ? 'selected' : ''}>Below</option>
            </select>
        </div>
        
        <div style="display: flex; gap: 12px; margin-bottom: 12px;">
            <div style="flex: 1;">
                <label style="display: block; margin-bottom: 4px; color: var(--text-color); font-size: 13px;">Font Size:</label>
                <input type="number" id="ta-prop-fontsize" value="${currentFontSize}" min="8" max="48"
                       style="width: 100%; padding: 6px 8px; background: var(--input-bg); border: 1px solid var(--border-color); 
                              border-radius: 4px; color: var(--text-color); box-sizing: border-box;">
            </div>
            <div style="flex: 1; display: flex; align-items: flex-end;">
                <label style="display: flex; align-items: center; gap: 8px; color: var(--text-color); font-size: 13px; cursor: pointer;">
                    <input type="checkbox" id="ta-prop-bold" ${currentBold ? 'checked' : ''}>
                    <span>Bold</span>
                </label>
            </div>
        </div>
        
        <div style="display: flex; gap: 12px; margin-bottom: 16px;">
            <div style="flex: 1;">
                <label style="display: block; margin-bottom: 4px; color: var(--text-color); font-size: 13px;">Text Color:</label>
                <input type="color" id="ta-prop-color" value="${currentColor}" 
                       style="width: 100%; height: 32px; padding: 2px; background: var(--input-bg); 
                              border: 1px solid var(--border-color); border-radius: 4px; cursor: pointer;">
            </div>
            <div style="flex: 1;">
                <label style="display: flex; align-items: center; gap: 8px; margin-bottom: 4px; color: var(--text-color); font-size: 13px;">
                    <input type="checkbox" id="ta-prop-bgcolor-enabled" ${hasBgColor ? 'checked' : ''}>
                    <span>Background:</span>
                </label>
                <input type="color" id="ta-prop-bgcolor" value="${currentBgColor || '#333333'}" 
                       style="width: 100%; height: 32px; padding: 2px; background: var(--input-bg); 
                              border: 1px solid var(--border-color); border-radius: 4px; cursor: pointer;"
                       ${hasBgColor ? '' : 'disabled'}>
            </div>
        </div>
        
        <div style="display: flex; justify-content: flex-end; gap: 8px;">
            <button id="ta-prop-cancel" style="padding: 8px 16px; background: var(--button-bg); border: 1px solid var(--border-color); 
                    border-radius: 4px; color: var(--text-color); cursor: pointer;">Cancel</button>
            <button id="ta-prop-ok" style="padding: 8px 16px; background: var(--accent-color); border: none; 
                    border-radius: 4px; color: white; cursor: pointer;">OK</button>
        </div>
    `;
    
    overlay.appendChild(dialog);
    document.body.appendChild(overlay);
    
    // Focus text input
    const textInput = dialog.querySelector('#ta-prop-text');
    textInput.focus();
    textInput.select();
    
    // Setup background color checkbox toggle
    const bgColorCheckbox = dialog.querySelector('#ta-prop-bgcolor-enabled');
    const bgColorInput = dialog.querySelector('#ta-prop-bgcolor');
    bgColorCheckbox.addEventListener('change', () => {
        bgColorInput.disabled = !bgColorCheckbox.checked;
    });
    
    return new Promise((resolve) => {
        const okBtn = dialog.querySelector('#ta-prop-ok');
        const cancelBtn = dialog.querySelector('#ta-prop-cancel');
        
        function applyChanges() {
            const newText = dialog.querySelector('#ta-prop-text').value;
            const newVPos = dialog.querySelector('#ta-prop-vpos').value;
            const newFontSize = parseInt(dialog.querySelector('#ta-prop-fontsize').value, 10);
            const newBold = dialog.querySelector('#ta-prop-bold').checked;
            const newColor = dialog.querySelector('#ta-prop-color').value;
            const bgEnabled = dialog.querySelector('#ta-prop-bgcolor-enabled').checked;
            const newBgColor = bgEnabled ? dialog.querySelector('#ta-prop-bgcolor').value : null;
            
            // Apply changes
            if (newText !== currentText) {
                document_wave.setTextAnnotationText(annotation.id, newText);
            }
            if (newVPos !== currentVPos && typeof document_wave.setTextAnnotationVPos === 'function') {
                document_wave.setTextAnnotationVPos(annotation.id, newVPos);
            }
            if (newFontSize !== currentFontSize && typeof document_wave.setTextAnnotationFontSize === 'function') {
                document_wave.setTextAnnotationFontSize(annotation.id, newFontSize);
            }
            if (newBold !== currentBold && typeof document_wave.setTextAnnotationBold === 'function') {
                document_wave.setTextAnnotationBold(annotation.id, newBold);
            }
            if (newColor !== currentColor && typeof document_wave.setTextAnnotationColor === 'function') {
                document_wave.setTextAnnotationColor(annotation.id, newColor);
            }
            if (newBgColor !== currentBgColor && typeof document_wave.setTextAnnotationBackgroundColor === 'function') {
                document_wave.setTextAnnotationBackgroundColor(annotation.id, newBgColor);
            }
            
            drawWaveform();
            overlay.remove();
            resolve(true);
        }
        
        function cancel() {
            overlay.remove();
            resolve(false);
        }
        
        okBtn.addEventListener('click', applyChanges);
        cancelBtn.addEventListener('click', cancel);
        
        // Handle Enter key
        textInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') applyChanges();
            if (e.key === 'Escape') cancel();
        });
        
        // Click outside to cancel
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) cancel();
        });
    });
}

/**
 * Shows a context menu for a text annotation.
 * @param {number} clientX - Mouse X position
 * @param {number} clientY - Mouse Y position
 * @param {Object} annotation - The text annotation object
 */
function showTextAnnotationContextMenu(clientX, clientY, annotation) {
    // Remove any existing context menus
    const existing = document.querySelectorAll('.context-menu');
    existing.forEach(m => m.remove());

    if (!annotation) return;

    // Select the text annotation to highlight it
    if (typeof selectObject === 'function' && typeof SelectableType !== 'undefined') {
        selectObject(SelectableType.TextAnnotation, annotation.id);
        drawWaveform();
    }

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
    menu.style.minWidth = '150px';

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
            if (menu.parentNode) document.body.removeChild(menu);
        });
        menu.appendChild(item);
        return item;
    }

    // Edit properties (opens full properties dialog)
    addMenuItem('Edit properties...', async () => {
        await showTextAnnotationPropertiesDialog(annotation);
    });

    // Delete text annotation
    addMenuItem('Delete', () => {
        document_wave.removeTextAnnotation(annotation.id);
        drawWaveform();
    });

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
