/**
 * Marker Context Menu - Right-click context menu for markers
 */

/**
 * Shows a context menu for a marker.
 * @param {number} clientX - Mouse X position
 * @param {number} clientY - Mouse Y position
 * @param {Object} marker - The marker object
 */
function showMarkerContextMenu(clientX, clientY, marker) {
    // Remove any existing context menu
    const existing = document.querySelector('.context-menu');
    if (existing) existing.remove();

    // Select the marker to highlight it
    if (typeof selectObject === 'function' && typeof SelectableType !== 'undefined') {
        selectObject(SelectableType.Marker, marker.id);
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

    // Change marker color
    addMenuItem('Change color...', async () => {
        const defaultColor = '#00a0ff';
        const currentColor = marker.color || defaultColor;
        const newColor = await openColorPicker(currentColor, null, 'Marker Color');
        if (newColor) {
            document_wave.setMarkerColorById(marker.id, newColor);
            drawWaveform();
        }
    });

    // Delete marker
    addMenuItem('Delete marker', () => {
        document_wave.subMarkerById(marker.id);
        drawWaveform();
    });

    // Close menu when clicking elsewhere
    function closeMenu(e) {
        if (!menu.contains(e.target)) {
            if (menu.parentNode) document.body.removeChild(menu);
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
