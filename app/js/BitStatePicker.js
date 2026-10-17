/**
 * BitStatePicker.js - Photoshop-style bit state selector
 * Allows selecting what state to paint on bit signals
 */

// Current selected bit state
let currentBitState = '1'; // Default to High

/**
 * Get current bit state for painting
 * @returns {string} Current state: '0', '1', 'x', 'z', 'u', 'd'
 */
function getCurrentBitState() {
    return currentBitState;
}

/**
 * Set current bit state
 * @param {string} state - State to set: '0', '1', 'x', 'z', 'u', 'd'
 */
function setCurrentBitState(state) {
    currentBitState = state;
    updateBitStatePreview();
    
    // Close menu if open
    const menu = document.getElementById('bit-state-menu');
    if (menu) {
        menu.style.display = 'none';
    }
}

/**
 * Update the bit state preview button icon
 */
function updateBitStatePreview() {
    const btn = document.getElementById('tool-bit-state');
    const preview = document.getElementById('bit-state-preview');
    const icon = document.getElementById('bit-state-icon');
    
    if (!btn || !preview || !icon) return;
    
    // Update data attribute for CSS styling
    btn.setAttribute('data-current-state', currentBitState);
    
    // Update SVG based on state
    let svgContent = '';
    switch (currentBitState) {
        case '1':
            svgContent = '<line x1="2" y1="4" x2="14" y2="4" stroke="#4CAF50" stroke-width="2.5"/>';
            break;
        case '0':
            svgContent = '<line x1="2" y1="12" x2="14" y2="12" stroke="#4CAF50" stroke-width="2.5"/>';
            break;
        case 'z':
            svgContent = '<line x1="2" y1="8" x2="14" y2="8" stroke="#2196F3" stroke-width="2" stroke-dasharray="3,2"/>';
            break;
        case 'x':
            svgContent = `
                <defs><pattern id="crosshatch-preview" width="4" height="4" patternUnits="userSpaceOnUse"><path d="M0,0 l4,4 M4,0 l-4,4" stroke="#F44336" stroke-width="0.5"/></pattern></defs>
                <rect x="1" y="3" width="14" height="10" fill="url(#crosshatch-preview)" stroke="#F44336" stroke-width="1"/>
            `;
            break;
        case 'u':
            svgContent = '<line x1="2" y1="4" x2="14" y2="4" stroke="#9C27B0" stroke-width="1.5" stroke-dasharray="1,1"/>';
            break;
        case 'd':
            svgContent = '<line x1="2" y1="12" x2="14" y2="12" stroke="#9C27B0" stroke-width="1.5" stroke-dasharray="1,1"/>';
            break;
    }
    
    icon.innerHTML = svgContent;
    
    // Update tooltip
    const stateLabels = {
        '1': 'High (1)',
        '0': 'Low (0)',
        'z': 'High-Z (z)',
        'x': 'Undefined (x)',
        'u': 'Pull-up (u)',
        'd': 'Pull-down (d)'
    };
    btn.title = `Bit State: ${stateLabels[currentBitState]} - Click to change`;
    
    // Update selected state in menu
    const options = document.querySelectorAll('.bit-state-option');
    options.forEach(opt => {
        if (opt.dataset.state === currentBitState) {
            opt.classList.add('selected');
        } else {
            opt.classList.remove('selected');
        }
    });
}

/**
 * Initialize bit state picker handlers
 */
function initBitStatePicker() {
    const picker = document.getElementById('bit-state-picker');
    const btn = document.getElementById('tool-bit-state');
    const menu = document.getElementById('bit-state-menu');
    
    if (!picker || !btn || !menu) {
        console.warn('BitStatePicker: Elements not found');
        return;
    }
    
    // Toggle menu on button click
    btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const isOpen = menu.style.display === 'block';
        
        // Close all other dropdowns first
        document.querySelectorAll('.dropdown-content').forEach(d => {
            d.style.display = 'none';
        });
        
        menu.style.display = isOpen ? 'none' : 'block';
    });
    
    // Handle state selection
    const options = menu.querySelectorAll('.bit-state-option');
    options.forEach(opt => {
        opt.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            
            const state = opt.dataset.state;
            if (state) {
                setCurrentBitState(state);
            }
        });
    });
    
    // Close menu when clicking outside
    document.addEventListener('click', (e) => {
        if (!picker.contains(e.target)) {
            menu.style.display = 'none';
        }
    });
    
    // Keyboard shortcuts for states (issue #7)
    document.addEventListener('keydown', (e) => {
        // Only if not in an input field and no modifiers (avoid Ctrl+Z etc.)
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' ||
            e.target.isContentEditable) return;
        if (e.ctrlKey || e.metaKey || e.altKey) return;
        if (typeof wpModalState !== 'undefined' && wpModalState.isOpen) return;

        const keyMap = {
            '0': '0',
            '1': '1',
            'z': 'z',
            'Z': 'z',
            'x': 'x',
            'X': 'x',
            'u': 'u',
            'U': 'u',
            'd': 'd',
            'D': 'd'
        };

        if (keyMap[e.key]) {
            setCurrentBitState(keyMap[e.key]);
            // Switch to the paint tool if it is not active, so the state
            // keys always leave the user ready to paint
            if (typeof currentTool !== 'undefined' && currentTool !== 'paint' &&
                typeof setCurrentTool === 'function') {
                setCurrentTool('paint');
                if (typeof drawWaveform === 'function') drawWaveform();
            }
            e.preventDefault();
        }
    });
    
    // Initial state
    updateBitStatePreview();
    
    console.log('BitStatePicker initialized');
}

/**
 * Convert bit state to internal value
 * @param {string} state - State character: '0', '1', 'x', 'z', 'u', 'd'
 * @returns {number} Internal value for WavePaint
 */
function bitStateToValue(state) {
    const WaveValue = window.WaveDromConstants?.WaveValue || {
        LOW: 0,
        HIGH: 1,
        UNDEFINED: -1,
        HIGHZ: 2,
        PULLUP: 3,
        PULLDOWN: 4
    };
    
    switch (state) {
        case '0': return WaveValue.LOW;
        case '1': return WaveValue.HIGH;
        case 'x': return WaveValue.UNDEFINED;
        case 'z': return WaveValue.HIGHZ;
        case 'u': return WaveValue.PULLUP;
        case 'd': return WaveValue.PULLDOWN;
        default: return WaveValue.LOW;
    }
}

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initBitStatePicker);
} else {
    // DOM already loaded
    setTimeout(initBitStatePicker, 0);
}

// Export for use in other modules
if (typeof window !== 'undefined') {
    window.getCurrentBitState = getCurrentBitState;
    window.setCurrentBitState = setCurrentBitState;
    window.bitStateToValue = bitStateToValue;
}
