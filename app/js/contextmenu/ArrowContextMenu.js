/**
 * Arrow Context Menu - Right-click context menu for arrows
 */

/**
 * Shows a context menu for an arrow.
 * @param {number} clientX - Mouse X position
 * @param {number} clientY - Mouse Y position
 * @param {number} arrowId - The arrow ID
 */
function showArrowContextMenu(clientX, clientY, arrowId) {
    // Remove any existing context menu
    const existing = document.querySelector('.context-menu');
    if (existing) existing.remove();

    const arrow = document_wave.arrowList().find(a => a.id === arrowId);
    if (!arrow) return;

    // Select the arrow to highlight it
    if (typeof selectObject === 'function' && typeof SelectableType !== 'undefined') {
        selectObject(SelectableType.Arrow, arrowId);
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
            document.body.removeChild(menu);
        });
        menu.appendChild(item);
        return item;
    }

    // Change arrow color
    addMenuItem('Change color...', async () => {
        const defaultColor = getComputedStyle(document.body).getPropertyValue('--arrow-color').trim() || '#ff6b00';
        const currentColor = arrow.color || defaultColor;
        const newColor = await openColorPicker(currentColor, null, 'Arrow Color');
        if (newColor) {
            document_wave.setArrowColorById(arrowId, newColor);
            drawWaveform();
        }
    });

    // Change arrow style (WaveDrom edge styles - splines and straight lines only)
    // Sharp line styles (L-shape, corner, Z-shape) are now in Time Span tool
    addMenuItem('Change style...', async () => {
        const styleOptions = [
            { value: '~', label: 'Spline (~)' },
            { value: '~>', label: 'Spline → (~>)' },
            { value: '<~>', label: 'Spline ↔ (<~>)' },
            { value: '-', label: 'Straight (-)' },
            { value: '->', label: 'Straight → (->)' },
            { value: '<->', label: 'Straight ↔ (<->)' }
        ];
        
        const currentStyle = arrow.style || '~>';
        const result = await showStylePickerDialog(styleOptions, currentStyle, 'Arrow Style');
        if (result) {
            document_wave.setArrowStyleById(arrowId, result);
            drawWaveform();
        }
    });

    // Delete arrow
    addMenuItem('Delete arrow', () => {
        document_wave.subArrowById(arrowId);
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
