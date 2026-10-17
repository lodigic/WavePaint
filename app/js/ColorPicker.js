/**
 * Color Picker - Color selection popup component
 * 
 * Provides a web-integrated color picker with preset colors
 * and custom color input functionality.
 */

// Preset colors for the color picker
const COLOR_PRESETS = [
    // Row 1: Basic colors
    '#000000', '#ffffff', '#ff0000', '#00ff00', '#0000ff', '#ffff00', '#ff00ff', '#00ffff',
    // Row 2: Dark variations
    '#333333', '#666666', '#990000', '#009900', '#000099', '#999900', '#990099', '#009999',
    // Row 3: Light variations
    '#999999', '#cccccc', '#ff6666', '#66ff66', '#6666ff', '#ffff66', '#ff66ff', '#66ffff',
    // Row 4: Theme colors
    '#4CAF50', '#2196F3', '#FF9800', '#E91E63', '#9C27B0', '#00BCD4', '#795548', '#607D8B'
];

/**
 * Opens a web-integrated color picker popup.
 * @param {string} currentColor - The current color value (hex format)
 * @param {HTMLElement} anchorElement - Optional element to position the picker near
 * @param {string} title - Optional title for the picker
 * @returns {Promise<string|null>} The selected color or null if cancelled
 */
function openColorPicker(currentColor, anchorElement = null, title = 'Choose Color') {
    return new Promise((resolve) => {
        // Remove any existing picker
        const existing = document.querySelector('.wp-color-picker-overlay');
        if (existing) existing.remove();

        // Default to theme color if no current color
        const defaultColor = getComputedStyle(document.body).getPropertyValue('--signal-color').trim() || '#4CAF50';
        const initialColor = currentColor || defaultColor;

        // Create overlay
        const overlay = document.createElement('div');
        overlay.className = 'wp-color-picker-overlay';

        // Create picker container
        const picker = document.createElement('div');
        picker.className = 'wp-color-picker';

        // Title
        const titleEl = document.createElement('div');
        titleEl.className = 'wp-color-picker-title';
        titleEl.textContent = title;
        picker.appendChild(titleEl);

        // Preset colors grid
        const presetsContainer = document.createElement('div');
        presetsContainer.className = 'wp-color-picker-presets';

        let selectedPreset = null;
        let selectedColorValue = initialColor;

        COLOR_PRESETS.forEach(color => {
            const preset = document.createElement('div');
            preset.className = 'wp-color-preset';
            preset.style.backgroundColor = color;
            preset.dataset.color = color;
            
            if (color.toLowerCase() === initialColor.toLowerCase()) {
                preset.classList.add('selected');
                selectedPreset = preset;
            }

            preset.addEventListener('click', () => {
                if (selectedPreset) selectedPreset.classList.remove('selected');
                preset.classList.add('selected');
                selectedPreset = preset;
                selectedColorValue = color;
                customColorInput.value = color;
                customColorText.value = color;
            });

            presetsContainer.appendChild(preset);
        });
        picker.appendChild(presetsContainer);

        // Custom color section
        const customSection = document.createElement('div');
        customSection.className = 'wp-color-picker-custom';

        const customLabel = document.createElement('label');
        customLabel.textContent = 'Custom:';
        customSection.appendChild(customLabel);

        const customColorInput = document.createElement('input');
        customColorInput.type = 'color';
        customColorInput.value = initialColor;
        customSection.appendChild(customColorInput);

        const customColorText = document.createElement('input');
        customColorText.type = 'text';
        customColorText.value = initialColor;
        customColorText.placeholder = '#RRGGBB';
        customSection.appendChild(customColorText);

        customColorInput.addEventListener('input', () => {
            if (selectedPreset) selectedPreset.classList.remove('selected');
            selectedPreset = null;
            selectedColorValue = customColorInput.value;
            customColorText.value = customColorInput.value;
        });

        customColorText.addEventListener('input', () => {
            const val = customColorText.value.trim();
            if (/^#[0-9A-Fa-f]{6}$/.test(val)) {
                if (selectedPreset) selectedPreset.classList.remove('selected');
                selectedPreset = null;
                selectedColorValue = val;
                customColorInput.value = val;
            }
        });

        picker.appendChild(customSection);

        // Footer with buttons
        const footer = document.createElement('div');
        footer.className = 'wp-color-picker-footer';

        const cancelBtn = document.createElement('button');
        cancelBtn.className = 'wp-color-picker-btn cancel';
        cancelBtn.textContent = 'Cancel';
        cancelBtn.type = 'button';

        const okBtn = document.createElement('button');
        okBtn.className = 'wp-color-picker-btn ok';
        okBtn.textContent = 'OK';
        okBtn.type = 'button';

        footer.appendChild(cancelBtn);
        footer.appendChild(okBtn);
        picker.appendChild(footer);

        overlay.appendChild(picker);
        document.body.appendChild(overlay);

        // Position picker near anchor element if provided
        if (anchorElement) {
            const rect = anchorElement.getBoundingClientRect();
            picker.style.position = 'absolute';
            picker.style.left = rect.left + 'px';
            picker.style.top = (rect.bottom + 5) + 'px';
        } else {
            picker.style.position = 'fixed';
            picker.style.left = '50%';
            picker.style.top = '50%';
            picker.style.transform = 'translate(-50%, -50%)';
        }

        // Event handlers
        const cleanup = () => {
            overlay.remove();
        };

        cancelBtn.addEventListener('click', () => {
            cleanup();
            resolve(null);
        });

        okBtn.addEventListener('click', () => {
            cleanup();
            resolve(selectedColorValue);
        });

        // Close on overlay click (not picker)
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) {
                cleanup();
                resolve(null);
            }
        });

        // Close on Escape
        const handleKeydown = (e) => {
            if (e.key === 'Escape') {
                cleanup();
                resolve(null);
                document.removeEventListener('keydown', handleKeydown);
            }
        };
        document.addEventListener('keydown', handleKeydown);
    });
}

/**
 * Updates the paint color box in the toolbar to reflect the current paint color.
 */
function updatePaintColorBox() {
    const colorBox = document.querySelector('#tool-paint-color .color-box');
    if (colorBox) {
        if (selectedPaintColor) {
            colorBox.style.backgroundColor = selectedPaintColor;
        } else {
            // Use skin signal color as default
            let defaultColor;
            if (typeof getCurrentSkin === 'function') {
                defaultColor = getCurrentSkin().signalColor;
            } else {
                defaultColor = getComputedStyle(document.body).getPropertyValue('--signal-color').trim() || '#000000';
            }
            colorBox.style.backgroundColor = defaultColor;
        }
    }
}

/**
 * Gets the current paint color (or skin default if none selected).
 * @returns {string} The current paint color
 */
function getCurrentPaintColor() {
    if (selectedPaintColor) {
        return selectedPaintColor;
    }
    // Use skin signal color as default
    if (typeof getCurrentSkin === 'function') {
        return getCurrentSkin().signalColor;
    }
    return getComputedStyle(document.body).getPropertyValue('--signal-color').trim() || '#000000';
}

/**
 * Gets the selected paint color (null if using theme default).
 * @returns {string|null} The selected paint color or null for theme default
 */
function getSelectedPaintColor() {
    return selectedPaintColor;
}
