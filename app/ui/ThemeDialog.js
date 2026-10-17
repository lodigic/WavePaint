// ThemeDialog.js - Theme selection dialog

/**
 * Opens a dialog to select between Light and Dark theme, and canvas color
 * @returns {Promise<{theme: string, canvasTheme: string}|null>} theme settings or null if cancelled
 */
async function openThemeDialog() {
    return new Promise((resolve) => {
        // Create overlay
        const overlay = document.createElement('div');
        overlay.className = 'theme-dialog-overlay';
        
        // Create dialog
        const dialog = document.createElement('div');
        dialog.className = 'theme-dialog';
        
        // Header
        const header = document.createElement('div');
        header.className = 'theme-dialog-header';
        
        const title = document.createElement('span');
        title.className = 'theme-dialog-title';
        title.textContent = 'Appearance';
        
        const closeBtn = document.createElement('button');
        closeBtn.className = 'theme-dialog-close';
        closeBtn.innerHTML = '✕';
        closeBtn.setAttribute('aria-label', 'Close');
        
        header.appendChild(title);
        header.appendChild(closeBtn);
        
        // Body
        const body = document.createElement('div');
        body.className = 'theme-dialog-body';
        
        // === THEME SECTION ===
        const themeSection = document.createElement('div');
        themeSection.className = 'theme-dialog-section';
        
        const themeLabel = document.createElement('div');
        themeLabel.className = 'theme-dialog-section-label';
        themeLabel.textContent = 'Interface Theme';
        
        const optionsContainer = document.createElement('div');
        optionsContainer.className = 'theme-dialog-options';
        
        // Light theme option
        const lightOption = document.createElement('div');
        lightOption.className = 'theme-option';
        lightOption.dataset.theme = 'light';
        
        const lightPreview = document.createElement('div');
        lightPreview.className = 'theme-preview theme-preview-light';
        
        const lightPreviewHeader = document.createElement('div');
        lightPreviewHeader.className = 'theme-preview-header';
        
        const lightPreviewContent = document.createElement('div');
        lightPreviewContent.className = 'theme-preview-content';
        
        // Signal lines preview for light theme
        for (let i = 0; i < 3; i++) {
            const line = document.createElement('div');
            line.className = 'theme-preview-signal';
            lightPreviewContent.appendChild(line);
        }
        
        lightPreview.appendChild(lightPreviewHeader);
        lightPreview.appendChild(lightPreviewContent);
        
        const lightLabel = document.createElement('span');
        lightLabel.className = 'theme-option-label';
        lightLabel.textContent = 'Light';
        
        const lightCheck = document.createElement('div');
        lightCheck.className = 'theme-option-check';
        lightCheck.innerHTML = '✓';
        
        lightOption.appendChild(lightPreview);
        lightOption.appendChild(lightLabel);
        lightOption.appendChild(lightCheck);
        
        // Dark theme option
        const darkOption = document.createElement('div');
        darkOption.className = 'theme-option';
        darkOption.dataset.theme = 'dark';
        
        const darkPreview = document.createElement('div');
        darkPreview.className = 'theme-preview theme-preview-dark';
        
        const darkPreviewHeader = document.createElement('div');
        darkPreviewHeader.className = 'theme-preview-header';
        
        const darkPreviewContent = document.createElement('div');
        darkPreviewContent.className = 'theme-preview-content';
        
        // Signal lines preview for dark theme
        for (let i = 0; i < 3; i++) {
            const line = document.createElement('div');
            line.className = 'theme-preview-signal';
            darkPreviewContent.appendChild(line);
        }
        
        darkPreview.appendChild(darkPreviewHeader);
        darkPreview.appendChild(darkPreviewContent);
        
        const darkLabel = document.createElement('span');
        darkLabel.className = 'theme-option-label';
        darkLabel.textContent = 'Dark';
        
        const darkCheck = document.createElement('div');
        darkCheck.className = 'theme-option-check';
        darkCheck.innerHTML = '✓';
        
        darkOption.appendChild(darkPreview);
        darkOption.appendChild(darkLabel);
        darkOption.appendChild(darkCheck);
        
        optionsContainer.appendChild(lightOption);
        optionsContainer.appendChild(darkOption);
        
        themeSection.appendChild(themeLabel);
        themeSection.appendChild(optionsContainer);
        
        // === CANVAS SECTION ===
        const canvasSection = document.createElement('div');
        canvasSection.className = 'theme-dialog-section';
        
        const canvasLabel = document.createElement('div');
        canvasLabel.className = 'theme-dialog-section-label';
        canvasLabel.textContent = 'Canvas Background';
        
        const canvasOptionsContainer = document.createElement('div');
        canvasOptionsContainer.className = 'theme-dialog-options canvas-options';
        
        // White canvas option
        const whiteCanvasOption = document.createElement('div');
        whiteCanvasOption.className = 'theme-option canvas-option';
        whiteCanvasOption.dataset.canvas = 'light';
        
        const whiteCanvasPreview = document.createElement('div');
        whiteCanvasPreview.className = 'canvas-preview canvas-preview-light';
        
        const whiteCanvasLabel = document.createElement('span');
        whiteCanvasLabel.className = 'theme-option-label';
        whiteCanvasLabel.textContent = 'White';
        
        const whiteCanvasCheck = document.createElement('div');
        whiteCanvasCheck.className = 'theme-option-check';
        whiteCanvasCheck.innerHTML = '✓';
        
        whiteCanvasOption.appendChild(whiteCanvasPreview);
        whiteCanvasOption.appendChild(whiteCanvasLabel);
        whiteCanvasOption.appendChild(whiteCanvasCheck);
        
        // Black canvas option
        const blackCanvasOption = document.createElement('div');
        blackCanvasOption.className = 'theme-option canvas-option';
        blackCanvasOption.dataset.canvas = 'dark';
        
        const blackCanvasPreview = document.createElement('div');
        blackCanvasPreview.className = 'canvas-preview canvas-preview-dark';
        
        const blackCanvasLabel = document.createElement('span');
        blackCanvasLabel.className = 'theme-option-label';
        blackCanvasLabel.textContent = 'Black';
        
        const blackCanvasCheck = document.createElement('div');
        blackCanvasCheck.className = 'theme-option-check';
        blackCanvasCheck.innerHTML = '✓';
        
        blackCanvasOption.appendChild(blackCanvasPreview);
        blackCanvasOption.appendChild(blackCanvasLabel);
        blackCanvasOption.appendChild(blackCanvasCheck);
        
        canvasOptionsContainer.appendChild(whiteCanvasOption);
        canvasOptionsContainer.appendChild(blackCanvasOption);
        
        canvasSection.appendChild(canvasLabel);
        canvasSection.appendChild(canvasOptionsContainer);
        
        body.appendChild(themeSection);
        body.appendChild(canvasSection);
        
        // === SKINS SECTION ===
        const skinsSection = document.createElement('div');
        skinsSection.className = 'theme-dialog-section';
        
        const skinsLabel = document.createElement('div');
        skinsLabel.className = 'theme-dialog-section-label';
        skinsLabel.textContent = 'Skins';
        
        const skinsDescription = document.createElement('div');
        skinsDescription.className = 'theme-dialog-section-description';
        skinsDescription.textContent = 'Color palette for signals, vectors, arrows, markers and WaveDrom export';
        
        const skinsContainer = document.createElement('div');
        skinsContainer.className = 'skins-container';
        
        // Get all available skins
        const allSkins = typeof getAllSkins === 'function' ? getAllSkins() : {};
        const currentSkinId = typeof getCurrentSkin === 'function' ? getCurrentSkin().id : 'black';
        let selectedSkin = currentSkinId;
        
        // Create skin option cards
        Object.values(allSkins).forEach(skin => {
            const skinOption = document.createElement('div');
            skinOption.className = 'skin-option';
            skinOption.dataset.skin = skin.id;
            if (skin.id === currentSkinId) {
                skinOption.classList.add('selected');
            }
            
            // Skin preview showing color palette (neutral background, skins don't affect canvas)
            const skinPreview = document.createElement('div');
            skinPreview.className = 'skin-preview';
            skinPreview.style.backgroundColor = 'var(--section-bg)';
            
            // Color swatches showing the skin's palette
            const swatchRow = document.createElement('div');
            swatchRow.className = 'skin-swatches';
            
            // Add signal color swatch
            const signalSwatch = document.createElement('div');
            signalSwatch.className = 'skin-swatch';
            signalSwatch.style.backgroundColor = skin.signalColor;
            signalSwatch.title = 'Signal';
            swatchRow.appendChild(signalSwatch);
            
            // Add arrow color swatch
            const arrowSwatch = document.createElement('div');
            arrowSwatch.className = 'skin-swatch';
            arrowSwatch.style.backgroundColor = skin.arrowColor;
            arrowSwatch.title = 'Arrow';
            swatchRow.appendChild(arrowSwatch);
            
            // Add first 4 vector colors
            skin.vectorColors.slice(0, 4).forEach((color, i) => {
                const swatch = document.createElement('div');
                swatch.className = 'skin-swatch skin-swatch-small';
                swatch.style.backgroundColor = color;
                swatch.title = `Vector ${i + 1}`;
                swatchRow.appendChild(swatch);
            });
            
            skinPreview.appendChild(swatchRow);
            
            // Skin name
            const skinName = document.createElement('div');
            skinName.className = 'skin-name';
            skinName.textContent = skin.name;
            
            // Selected check
            const skinCheck = document.createElement('div');
            skinCheck.className = 'skin-check';
            skinCheck.innerHTML = '✓';
            
            skinOption.appendChild(skinPreview);
            skinOption.appendChild(skinName);
            skinOption.appendChild(skinCheck);
            skinsContainer.appendChild(skinOption);
            
            // Click handler
            skinOption.addEventListener('click', () => {
                selectedSkin = skin.id;
                skinsContainer.querySelectorAll('.skin-option').forEach(opt => {
                    opt.classList.toggle('selected', opt.dataset.skin === skin.id);
                });
            });
        });
        
        skinsSection.appendChild(skinsLabel);
        skinsSection.appendChild(skinsDescription);
        skinsSection.appendChild(skinsContainer);
        
        body.appendChild(skinsSection);
        
        // Footer
        const footer = document.createElement('div');
        footer.className = 'theme-dialog-footer';
        
        const cancelBtn = document.createElement('button');
        cancelBtn.className = 'wp-modal-btn';
        cancelBtn.textContent = 'Cancel';
        
        const applyBtn = document.createElement('button');
        applyBtn.className = 'wp-modal-btn primary';
        applyBtn.textContent = 'Apply';
        
        footer.appendChild(cancelBtn);
        footer.appendChild(applyBtn);
        
        // Assemble dialog
        dialog.appendChild(header);
        dialog.appendChild(body);
        dialog.appendChild(footer);
        overlay.appendChild(dialog);
        document.body.appendChild(overlay);
        
        // Get current theme and canvas theme
        const currentTheme = document.body.classList.contains('dark') ? 'dark' : 'light';
        const currentCanvasTheme = document.body.classList.contains('canvas-dark') ? 'dark' : 'light';
        let selectedTheme = currentTheme;
        let selectedCanvasTheme = currentCanvasTheme;
        
        // Mark current theme as selected
        const updateThemeSelection = (theme) => {
            selectedTheme = theme;
            lightOption.classList.toggle('selected', theme === 'light');
            darkOption.classList.toggle('selected', theme === 'dark');
        };
        
        // Mark current canvas theme as selected
        const updateCanvasSelection = (canvasTheme) => {
            selectedCanvasTheme = canvasTheme;
            whiteCanvasOption.classList.toggle('selected', canvasTheme === 'light');
            blackCanvasOption.classList.toggle('selected', canvasTheme === 'dark');
        };
        
        updateThemeSelection(currentTheme);
        updateCanvasSelection(currentCanvasTheme);
        
        // Event handlers
        const closeDialog = (result) => {
            overlay.remove();
            resolve(result);
        };
        
        lightOption.addEventListener('click', () => updateThemeSelection('light'));
        darkOption.addEventListener('click', () => updateThemeSelection('dark'));
        whiteCanvasOption.addEventListener('click', () => updateCanvasSelection('light'));
        blackCanvasOption.addEventListener('click', () => updateCanvasSelection('dark'));
        
        closeBtn.addEventListener('click', () => closeDialog(null));
        cancelBtn.addEventListener('click', () => closeDialog(null));
        applyBtn.addEventListener('click', () => closeDialog({ theme: selectedTheme, canvasTheme: selectedCanvasTheme, skin: selectedSkin }));
        
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) {
                closeDialog(null);
            }
        });
        
        // Keyboard handling
        const onKeyDown = (e) => {
            if (e.key === 'Escape') {
                closeDialog(null);
            } else if (e.key === 'Enter') {
                closeDialog({ theme: selectedTheme, canvasTheme: selectedCanvasTheme, skin: selectedSkin });
            }
        };
        
        document.addEventListener('keydown', onKeyDown);
        
        // Cleanup keyboard listener when dialog closes
        const originalClose = closeDialog;
        const wrappedClose = (result) => {
            document.removeEventListener('keydown', onKeyDown);
            originalClose(result);
        };
        
        closeBtn.onclick = () => wrappedClose(null);
        cancelBtn.onclick = () => wrappedClose(null);
        applyBtn.onclick = () => wrappedClose({ theme: selectedTheme, canvasTheme: selectedCanvasTheme, skin: selectedSkin });
        overlay.onclick = (e) => {
            if (e.target === overlay) wrappedClose(null);
        };
    });
}

/**
 * Apply a skin to the document
 * @param {string} skinId - Skin identifier
 */
function applySkin(skinId) {
    if (typeof setCurrentSkin === 'function') {
        setCurrentSkin(skinId);
    }
}

/**
 * Apply a theme and save to localStorage
 * @param {string} theme - 'light' or 'dark'
 */
function applyTheme(theme) {
    if (theme === 'dark') {
        document.body.classList.add('dark');
    } else {
        document.body.classList.remove('dark');
    }
    localStorage.setItem('theme', theme);
    
    // Update paint color box with new theme color (if no custom color selected)
    if (typeof updatePaintColorBox === 'function') {
        updatePaintColorBox();
    }
    
    // Redraw waveform with new theme colors
    if (typeof drawWaveform === 'function') {
        drawWaveform();
    }
}

/**
 * Apply canvas theme and save to localStorage
 * @param {string} canvasTheme - 'light' or 'dark'
 */
function applyCanvasTheme(canvasTheme) {
    if (canvasTheme === 'dark') {
        document.body.classList.add('canvas-dark');
    } else {
        document.body.classList.remove('canvas-dark');
    }
    localStorage.setItem('canvasTheme', canvasTheme);
    
    // Redraw waveform with new canvas colors
    if (typeof drawWaveform === 'function') {
        drawWaveform();
    }
}

/**
 * Get the current canvas theme
 * @returns {string} 'light' or 'dark'
 */
function getCurrentCanvasTheme() {
    return document.body.classList.contains('canvas-dark') ? 'dark' : 'light';
}

/**
 * Get the current theme
 * @returns {string} 'light' or 'dark'
 */
function getCurrentTheme() {
    return document.body.classList.contains('dark') ? 'dark' : 'light';
}

/**
 * Get the default signal color based on current theme
 * @returns {string} Color hex string
 */
function getDefaultSignalColor() {
    return getComputedStyle(document.body).getPropertyValue('--signal-color').trim() || '#000000';
}

/**
 * Get the default vector signal color based on current theme
 * @returns {string} Color hex string
 */
function getDefaultVectorColor() {
    return getComputedStyle(document.body).getPropertyValue('--signal-color').trim() || '#000000';
}
