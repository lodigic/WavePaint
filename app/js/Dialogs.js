/**
 * Dialogs - Modal dialog system
 * 
 * Provides wpPrompt, wpConfirm, wpAlert and the underlying
 * openWpModal function for showing modal dialogs.
 */

/**
 * Opens a modal dialog with the specified options.
 * @param {Object} options - Dialog options
 * @param {string} options.title - Dialog title
 * @param {string} options.message - Dialog message
 * @param {boolean} options.showInput - Whether to show an input field
 * @param {string} options.defaultValue - Default value for input
 * @param {string} options.inputType - Type of input field
 * @param {boolean} options.showCancel - Whether to show cancel button
 * @param {string} options.okText - Text for OK button
 * @param {string} options.cancelText - Text for Cancel button
 * @returns {Promise<{ok: boolean, value: string|null}>} Dialog result
 */
function openWpModal(options) {
    const overlay = document.getElementById('wp-modal-overlay');
    const modal = document.getElementById('wp-modal');
    const header = document.getElementById('wp-modal-header');
    const titleEl = document.getElementById('wp-modal-title');
    const messageEl = document.getElementById('wp-modal-message');
    const inputEl = document.getElementById('wp-modal-input');
    const okBtn = document.getElementById('wp-modal-ok');
    const cancelBtn = document.getElementById('wp-modal-cancel');
    const closeBtn = document.getElementById('wp-modal-close');

    if (!overlay || !modal || !header || !titleEl || !messageEl || !inputEl || !okBtn || !cancelBtn || !closeBtn) {
        console.error('Modal elements not found');
        return Promise.resolve({ ok: false, value: null });
    }

    wpModalState.isOpen = true;
    wpModalState.options = options;

    titleEl.textContent = options.title || 'Dialog';
    messageEl.textContent = options.message || '';
    inputEl.style.display = options.showInput ? 'block' : 'none';
    inputEl.type = options.inputType || 'text';
    inputEl.value = options.defaultValue || '';

    okBtn.textContent = options.okText || 'OK';
    cancelBtn.textContent = options.cancelText || 'Cancel';
    cancelBtn.style.display = options.showCancel === false ? 'none' : 'inline-block';
    closeBtn.style.display = options.showCancel === false ? 'none' : 'inline-block';

    overlay.classList.remove('hidden');

    // Center modal
    modal.style.transform = 'translate(-50%, -50%)';
    modal.style.left = '50%';
    modal.style.top = '50%';

    if (options.showInput) {
        setTimeout(() => {
            inputEl.focus();
            inputEl.select();
        }, 0);
    } else {
        setTimeout(() => okBtn.focus(), 0);
    }

    const closeWith = (ok) => {
        if (!wpModalState.isOpen) return;
        wpModalState.isOpen = false;
        overlay.classList.add('hidden');
        document.removeEventListener('keydown', onKeyDown);
        const value = options.showInput ? inputEl.value : null;
        if (wpModalState.resolve) {
            wpModalState.resolve({ ok, value });
        }
        wpModalState.resolve = null;
        wpModalState.options = null;
    };

    const onOk = () => closeWith(true);
    const onCancel = () => closeWith(false);

    const onKeyDown = (e) => {
        if (!wpModalState.isOpen) return;
        if (e.key === 'Escape' && options.showCancel !== false) {
            e.preventDefault();
            onCancel();
        } else if (e.key === 'Enter') {
            e.preventDefault();
            onOk();
        }
    };

    okBtn.onclick = onOk;
    cancelBtn.onclick = onCancel;
    closeBtn.onclick = onCancel;
    overlay.onclick = (e) => {
        if (e.target === overlay && options.showCancel !== false) {
            onCancel();
        }
    };

    document.addEventListener('keydown', onKeyDown);

    // Drag behavior
    header.onmousedown = (e) => {
        if (!wpModalState.isOpen) return;
        wpModalState.dragActive = true;
        const rect = modal.getBoundingClientRect();
        wpModalState.dragOffsetX = e.clientX - rect.left;
        wpModalState.dragOffsetY = e.clientY - rect.top;
        modal.style.transform = 'none';
        modal.style.left = `${rect.left}px`;
        modal.style.top = `${rect.top}px`;
    };

    document.onmousemove = (e) => {
        if (!wpModalState.dragActive || !wpModalState.isOpen) return;
        const x = e.clientX - wpModalState.dragOffsetX;
        const y = e.clientY - wpModalState.dragOffsetY;
        modal.style.left = `${Math.max(0, x)}px`;
        modal.style.top = `${Math.max(0, y)}px`;
    };

    document.onmouseup = () => {
        wpModalState.dragActive = false;
    };

    return new Promise((resolve) => {
        wpModalState.resolve = resolve;
    });
}

/**
 * Shows a prompt dialog to get user input.
 * @param {string} message - Message to display
 * @param {string} defaultValue - Default value for input
 * @param {string} title - Dialog title
 * @returns {Promise<string|null>} User input or null if cancelled
 */
function wpPrompt(message, defaultValue = '', title = 'Input') {
    return openWpModal({
        title,
        message,
        showInput: true,
        defaultValue,
        showCancel: true,
        okText: 'OK',
        cancelText: 'Cancel'
    }).then((result) => (result.ok ? result.value : null));
}

/**
 * Shows a confirmation dialog.
 * @param {string} message - Message to display
 * @param {string} title - Dialog title
 * @returns {Promise<boolean>} True if confirmed, false if cancelled
 */
function wpConfirm(message, title = 'Confirm') {
    return openWpModal({
        title,
        message,
        showInput: false,
        showCancel: true,
        okText: 'OK',
        cancelText: 'Cancel'
    }).then((result) => result.ok);
}

/**
 * Shows an alert dialog.
 * @param {string} message - Message to display
 * @param {string} title - Dialog title
 * @returns {Promise<boolean>} Always resolves to true
 */
function wpAlert(message, title = 'Notice') {
    return openWpModal({
        title,
        message,
        showInput: false,
        showCancel: false,
        okText: 'OK'
    }).then(() => true);
}

/**
 * Shows information about the public WavePaint project.
 */
function showAboutPopup() {
    document.querySelector('.wp-about-overlay')?.remove();
    const overlay = document.createElement('div');
    overlay.className = 'wp-about-overlay';
    const popup = document.createElement('div');
    popup.className = 'wp-about-popup';
    popup.setAttribute('role', 'dialog');
    popup.setAttribute('aria-modal', 'true');
    popup.setAttribute('aria-label', 'About WavePaint');
    popup.innerHTML = `
        <button class="wp-about-close" aria-label="Close">&times;</button>
        <div class="wp-about-header"><span class="wp-about-logo">🌊</span> WavePaint</div>
        <div class="wp-about-content">
            <div class="wp-about-left">
                <div class="wp-about-description">
                    <p><strong>WavePaint</strong> is an open source editor for digital timing diagrams,
                    and waveforms, built for engineers, students and educators.</p>
                    <p>Created and maintained by the WavePaint contributors. Released under the
                    <strong>MIT license</strong>. Third-party libraries retain their own licenses.</p>
                    <p>Projects are processed locally in your browser. WaveDrom provides the optional
                    waveform preview and conversion support.</p>
                </div>
            </div>
        </div>
        <div class="wp-about-footer">
            <a href="https://github.com/lodigic/WavePaint" target="_blank" rel="noopener noreferrer" class="wp-about-link">GitHub</a>
            <a href="https://github.com/lodigic/WavePaint/blob/main/LICENSE" target="_blank" rel="noopener noreferrer" class="wp-about-link">License</a>
            <a href="https://github.com/lodigic/WavePaint/issues" target="_blank" rel="noopener noreferrer" class="wp-about-link">Issues</a>
        </div>
    `;
    const close = () => {
        overlay.remove();
        document.removeEventListener('keydown', onKeyDown);
    };
    const onKeyDown = (event) => {
        if (event.key === 'Escape') close();
    };
    popup.querySelector('.wp-about-close').onclick = close;
    overlay.onclick = (event) => {
        if (event.target === overlay) close();
    };
    document.addEventListener('keydown', onKeyDown);
    overlay.appendChild(popup);
    document.body.appendChild(overlay);
    popup.querySelector('.wp-about-close').focus();
}

/**
 * Points help requests and bug reports to the public project.
 */
function showContactPopup() {
    document.querySelector('.wp-contact-overlay')?.remove();
    const overlay = document.createElement('div');
    overlay.className = 'wp-contact-overlay';
    const popup = document.createElement('div');
    popup.className = 'wp-contact-popup';
    popup.setAttribute('role', 'dialog');
    popup.setAttribute('aria-modal', 'true');
    popup.setAttribute('aria-label', 'Project Support');
    popup.innerHTML = `
        <button class="wp-contact-close" aria-label="Close">&times;</button>
        <div class="wp-contact-header">Project Support</div>
        <div class="wp-contact-content">
            <p class="wp-contact-intro">Report a bug or suggest an improvement on GitHub.</p>
            <p class="wp-contact-message">Include steps to reproduce the issue and your browser version.
            Share only diagrams you are comfortable making public.</p>
        </div>
        <div class="wp-contact-footer">
            <a href="https://github.com/lodigic/WavePaint/issues/new" target="_blank" rel="noopener noreferrer" class="wp-contact-btn wp-contact-btn-primary">Open an Issue</a>
        </div>
    `;
    const close = () => {
        overlay.remove();
        document.removeEventListener('keydown', onKeyDown);
    };
    const onKeyDown = (event) => {
        if (event.key === 'Escape') close();
    };
    popup.querySelector('.wp-contact-close').onclick = close;
    overlay.onclick = (event) => {
        if (event.target === overlay) close();
    };
    document.addEventListener('keydown', onKeyDown);
    overlay.appendChild(popup);
    document.body.appendChild(overlay);
    popup.querySelector('.wp-contact-close').focus();
}

/**
 * Shows a temporary toast notification.
 * @param {string} message - Message to display
 * @param {number} duration - Duration in milliseconds (default 2000)
 */
function showToast(message, duration = 2000) {
    // Remove existing toast if any
    const existingToast = document.getElementById('wp-toast');
    if (existingToast) {
        existingToast.remove();
    }
    
    // Create toast element
    const toast = document.createElement('div');
    toast.id = 'wp-toast';
    toast.textContent = message;
    toast.style.cssText = `
        position: fixed;
        bottom: 20px;
        left: 50%;
        transform: translateX(-50%);
        background: var(--menu-bg, #333);
        color: var(--text-color, #fff);
        padding: 12px 24px;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        z-index: 10000;
        font-size: 14px;
        opacity: 0;
        transition: opacity 0.2s ease-in-out;
        pointer-events: none;
    `;
    
    document.body.appendChild(toast);
    
    // Fade in
    requestAnimationFrame(() => {
        toast.style.opacity = '1';
    });
    
    // Fade out and remove after duration
    setTimeout(() => {
        toast.style.opacity = '0';
        setTimeout(() => {
            if (toast.parentNode) {
                toast.remove();
            }
        }, 200);
    }, duration);
}
/**
 * Generate SVG icon for arrow style
 * @param {string} style - Arrow style code
 * @param {boolean} isSelected - Whether this style is selected
 * @returns {string} SVG markup
 */
function getArrowStyleSVG(style, isSelected = false) {
    // Use accent color from theme (WavePaint theme)
    const accent = getComputedStyle(document.body).getPropertyValue('--accent-color') || '#1ecb7a';
    const strokeColor = isSelected ? '#fff' : accent.trim();
    const w = 60, h = 32;
    const x1 = 10, y1 = 16, x2 = 50, y2 = 16;
    const strokeWidth = 3;
    
    // Arrowhead helper (pointing right)
    const arrowHead = (x, y, dir = 'right') => {
        const size = 7;
        if (dir === 'right') {
            return `<polygon points="${x},${y} ${x-size},${y-size/1.3} ${x-size},${y+size/1.3}" fill="${strokeColor}"/>`;
        } else {
            return `<polygon points="${x},${y} ${x+size},${y-size/1.3} ${x+size},${y+size/1.3}" fill="${strokeColor}"/>`;
        }
    };
    
    // Circle endpoint
    const circle = (x, y) => `<circle cx="${x}" cy="${y}" r="3" fill="${strokeColor}"/>`;
    
    let path = '';
    let heads = '';
    let startDot = circle(x1, y1);
    
    switch(style) {
        // Splines
        case '~':
            path = `<path d="M${x1},${y1} C${x1+17},${y1-10} ${x2-17},${y2+10} ${x2},${y2}" stroke="${strokeColor}" fill="none" stroke-width="${strokeWidth}"/>`;
            heads = circle(x2, y2);
            break;
        case '~>':
            path = `<path d="M${x1},${y1} C${x1+17},${y1-10} ${x2-17},${y2+10} ${x2-6},${y2}" stroke="${strokeColor}" fill="none" stroke-width="${strokeWidth}"/>`;
            heads = arrowHead(x2, y2, 'right');
            break;
        case '<~>':
            path = `<path d="M${x1+6},${y1} C${x1+17},${y1-10} ${x2-17},${y2+10} ${x2-6},${y2}" stroke="${strokeColor}" fill="none" stroke-width="${strokeWidth}"/>`;
            heads = arrowHead(x1, y1, 'left') + arrowHead(x2, y2, 'right');
            startDot = '';
            break;
        case '-~>':
            path = `<path d="M${x1},${y1} L${x1+14},${y1} C${x1+22},${y1} ${x2-17},${y2+8} ${x2-6},${y2}" stroke="${strokeColor}" fill="none" stroke-width="${strokeWidth}"/>`;
            heads = arrowHead(x2, y2, 'right');
            break;
        case '~->':
            path = `<path d="M${x1},${y1} C${x1+17},${y1-8} ${x2-22},${y2} ${x2-14},${y2} L${x2-6},${y2}" stroke="${strokeColor}" fill="none" stroke-width="${strokeWidth}"/>`;
            heads = arrowHead(x2, y2, 'right');
            break;
            
        // Straight lines
        case '-':
            path = `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${strokeColor}" stroke-width="${strokeWidth}"/>`;
            heads = circle(x2, y2);
            break;
        case '->':
            path = `<line x1="${x1}" y1="${y1}" x2="${x2-6}" y2="${y2}" stroke="${strokeColor}" stroke-width="${strokeWidth}"/>`;
            heads = arrowHead(x2, y2, 'right');
            break;
        case '<->':
            path = `<line x1="${x1+6}" y1="${y1}" x2="${x2-6}" y2="${y2}" stroke="${strokeColor}" stroke-width="${strokeWidth}"/>`;
            heads = arrowHead(x1, y1, 'left') + arrowHead(x2, y2, 'right');
            startDot = '';
            break;
            
        // Sharp lines: -| (horizontal then vertical)
        case '-|':
            path = `<path d="M${x1},${y1} L${x2},${y1} L${x2},${y2+8}" stroke="${strokeColor}" fill="none" stroke-width="${strokeWidth}"/>`;
            heads = circle(x2, y2+8);
            break;
        case '-|>':
            path = `<path d="M${x1},${y1-5} L${x2},${y1-5} L${x2},${y2+5}" stroke="${strokeColor}" fill="none" stroke-width="${strokeWidth}"/>`;
            heads = `<polygon points="${x2},${y2+10} ${x2-4},${y2+4} ${x2+4},${y2+4}" fill="${strokeColor}"/>`;
            startDot = circle(x1, y1-5);
            break;
        case '<-|>':
            path = `<path d="M${x1+6},${y1-5} L${x2},${y1-5} L${x2},${y2+5}" stroke="${strokeColor}" fill="none" stroke-width="${strokeWidth}"/>`;
            heads = arrowHead(x1, y1-5, 'left') + `<polygon points="${x2},${y2+10} ${x2-4},${y2+4} ${x2+4},${y2+4}" fill="${strokeColor}"/>`;
            startDot = '';
            break;
            
        // Sharp lines: |- (vertical then horizontal)
        case '|-':
            path = `<path d="M${x1},${y1-8} L${x1},${y2} L${x2},${y2}" stroke="${strokeColor}" fill="none" stroke-width="${strokeWidth}"/>`;
            heads = circle(x2, y2);
            startDot = circle(x1, y1-8);
            break;
        case '|->':
            path = `<path d="M${x1},${y1-8} L${x1},${y2} L${x2-6},${y2}" stroke="${strokeColor}" fill="none" stroke-width="${strokeWidth}"/>`;
            heads = arrowHead(x2, y2, 'right');
            startDot = circle(x1, y1-8);
            break;
            
        // Sharp lines: -|- (horizontal, vertical, horizontal - Z shape)
        case '-|-':
            const midX = (x1 + x2) / 2;
            path = `<path d="M${x1},${y1-6} L${midX},${y1-6} L${midX},${y2+6} L${x2},${y2+6}" stroke="${strokeColor}" fill="none" stroke-width="${strokeWidth}"/>`;
            heads = circle(x2, y2+6);
            startDot = circle(x1, y1-6);
            break;
        case '-|->':
            const midX2 = (x1 + x2) / 2;
            path = `<path d="M${x1},${y1-6} L${midX2},${y1-6} L${midX2},${y2+6} L${x2-6},${y2+6}" stroke="${strokeColor}" fill="none" stroke-width="${strokeWidth}"/>`;
            heads = arrowHead(x2, y2+6, 'right');
            startDot = circle(x1, y1-6);
            break;
        case '<-|->':
            const midX3 = (x1 + x2) / 2;
            path = `<path d="M${x1+6},${y1-6} L${midX3},${y1-6} L${midX3},${y2+6} L${x2-6},${y2+6}" stroke="${strokeColor}" fill="none" stroke-width="${strokeWidth}"/>`;
            heads = arrowHead(x1, y1-6, 'left') + arrowHead(x2, y2+6, 'right');
            startDot = '';
            break;
            
        default:
            path = `<line x1="${x1}" y1="${y1}" x2="${x2-6}" y2="${y2}" stroke="${strokeColor}" stroke-width="${strokeWidth}"/>`;
            heads = arrowHead(x2, y2, 'right');
    }
    
    return `<svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" xmlns="http://www.w3.org/2000/svg">
        ${startDot}${path}${heads}
    </svg>`;
}

/**
 * Shows a style picker dialog for selecting arrow styles.
 * @param {Array} options - Array of {value, label} objects
 * @param {string} currentValue - Currently selected value
 * @param {string} title - Dialog title
 * @returns {Promise<string|null>} Selected value or null if cancelled
 */
function showStylePickerDialog(options, currentValue, title = 'Select Style') {
    return new Promise((resolve) => {
        // Remove any existing picker
        const existing = document.querySelector('.style-picker-overlay');
        if (existing) existing.remove();

        // Create overlay (same style as theme-dialog-overlay)
        const overlay = document.createElement('div');
        overlay.className = 'style-picker-overlay theme-dialog-overlay';

        // Create dialog (same style as theme-dialog)
        const dialog = document.createElement('div');
        dialog.className = 'style-picker-dialog theme-dialog';
        dialog.style.minWidth = '380px';
        dialog.style.maxWidth = '420px';

        // Header (same as theme-dialog-header)
        const header = document.createElement('div');
        header.className = 'theme-dialog-header';
        
        const titleEl = document.createElement('span');
        titleEl.className = 'theme-dialog-title';
        titleEl.textContent = title;
        
        const closeBtn = document.createElement('button');
        closeBtn.className = 'theme-dialog-close';
        closeBtn.innerHTML = '✕';
        closeBtn.setAttribute('aria-label', 'Close');
        closeBtn.addEventListener('click', () => {
            cleanup();
            resolve(null);
        });
        
        header.appendChild(titleEl);
        header.appendChild(closeBtn);
        dialog.appendChild(header);

        // Body
        const body = document.createElement('div');
        body.className = 'theme-dialog-body';

        // Options grid
        const optionsContainer = document.createElement('div');
        optionsContainer.className = 'theme-dialog-options';
        optionsContainer.style.cssText = `
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 10px;
            justify-content: center;
        `;

        let selectedValue = currentValue;
        const optionElements = [];

        // English style names
        const styleNames = {
            '~': 'Spline', '~>': 'Spline →', '<~>': 'Spline ↔',
            '-': 'Straight', '->': 'Straight →', '<->': 'Straight ↔',
            '-|': 'L-Shape', '-|>': 'L-Shape →', '<-|>': 'L-Shape ↔',
            '|-': 'Corner', '|->': 'Corner →',
            '-|-': 'Z-Shape', '-|->': 'Z-Shape →', '<-|->': 'Z-Shape ↔'
        };

        options.forEach(opt => {
            const optionEl = document.createElement('div');
            const isSelected = opt.value === currentValue;
            optionEl.className = `theme-option arrow-style-option ${isSelected ? 'selected' : ''}`;
            optionEl.dataset.value = opt.value;
            optionEl.style.cssText = `
                padding: 10px 6px 8px 6px;
                min-width: 100px;
                gap: 6px;
            `;
            
            // SVG icon wrapper
            const iconWrapper = document.createElement('div');
            iconWrapper.className = 'arrow-style-icon';
            iconWrapper.style.cssText = `
                width: 60px;
                height: 32px;
                display: flex;
                align-items: center;
                justify-content: center;
            `;
            iconWrapper.innerHTML = getArrowStyleSVG(opt.value, isSelected);
            
            // Label
            const labelEl = document.createElement('span');
            labelEl.className = 'theme-option-label';
            labelEl.textContent = styleNames[opt.value] || opt.value;
            labelEl.style.fontSize = '11px';
            
            // Check mark
            const checkEl = document.createElement('div');
            checkEl.className = 'theme-option-check';
            checkEl.innerHTML = '✓';
            
            optionEl.appendChild(iconWrapper);
            optionEl.appendChild(labelEl);
            optionEl.appendChild(checkEl);
            
            optionEl.addEventListener('click', () => {
                selectedValue = opt.value;
                optionElements.forEach(el => {
                    const isNowSelected = el.dataset.value === selectedValue;
                    el.classList.toggle('selected', isNowSelected);
                    el.querySelector('.arrow-style-icon').innerHTML = getArrowStyleSVG(el.dataset.value, isNowSelected);
                });
            });
            
            optionEl.addEventListener('dblclick', () => {
                cleanup();
                resolve(opt.value);
            });
            
            optionElements.push(optionEl);
            optionsContainer.appendChild(optionEl);
        });
        
        body.appendChild(optionsContainer);
        dialog.appendChild(body);

        // Footer (same style as theme-dialog-footer)
        const footer = document.createElement('div');
        footer.className = 'theme-dialog-footer';

        const cancelBtn = document.createElement('button');
        cancelBtn.className = 'wp-modal-btn';
        cancelBtn.textContent = 'Cancel';
        cancelBtn.addEventListener('click', () => {
            cleanup();
            resolve(null);
        });

        const okBtn = document.createElement('button');
        okBtn.className = 'wp-modal-btn primary';
        okBtn.textContent = 'Apply';
        okBtn.addEventListener('click', () => {
            cleanup();
            resolve(selectedValue);
        });

        footer.appendChild(cancelBtn);
        footer.appendChild(okBtn);
        dialog.appendChild(footer);

        overlay.appendChild(dialog);
        document.body.appendChild(overlay);

        // Close on overlay click
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) {
                cleanup();
                resolve(null);
            }
        });

        // Close on Escape
        function handleKeydown(e) {
            if (e.key === 'Escape') {
                cleanup();
                resolve(null);
            } else if (e.key === 'Enter') {
                cleanup();
                resolve(selectedValue);
            }
        }
        document.addEventListener('keydown', handleKeydown);

        function cleanup() {
            document.removeEventListener('keydown', handleKeydown);
            if (overlay.parentNode) {
                overlay.remove();
            }
        }
    });
}
