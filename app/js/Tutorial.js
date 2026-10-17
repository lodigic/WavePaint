/**
 * Tutorial - Quick Start Guide
 * 
 * A simple, fast tutorial to get users creating waveforms immediately.
 * Focused on the essential actions: create signals and paint.
 */

/**
 * Runs the quick start tutorial.
 */
function runTutorial() {
    if (window.__wavepaintTutorialActive) return;
    window.__wavepaintTutorialActive = true;

    // ======================================
    // TUTORIAL STEPS - Quick & Essential
    // ======================================
    
    const steps = [
        // Step 1: Welcome
        {
            selector: '#canvas',
            title: '👋 Welcome to WavePaint!',
            text: 'Create beautiful waveform diagrams in seconds.\n\nLet\'s learn the basics — it only takes 30 seconds!',
            position: 'center'
        },

        // Step 2: Add a Signal
        {
            selector: '#add-signal-btn',
            title: '1️⃣ Add a Signal',
            text: 'Click here to add your first signal.\n\nChoose <b>Bit Signal</b> for simple 0/1 waveforms, or <b>Vector Signal</b> for buses.',
            position: 'bottom'
        },

        // Step 3: Paint Tool
        {
            selector: '#tool-paint',
            title: '2️⃣ Paint Values',
            text: 'Select the <b>Paint</b> tool, then click on signal cells to toggle values.\n\n<b>Tip:</b> Press <b>D</b> to quickly activate Paint mode!',
            position: 'bottom'
        },

        // Step 4: Paint Color
        {
            selector: '#tool-paint-color',
            title: '🎨 Choose Colors',
            text: 'Click here to pick which value to paint:\n\n• <b>High (1)</b> — Green\n• <b>Low (0)</b> — Green\n• <b>X / Z</b> — Special states',
            position: 'bottom'
        },

        // Step 5: Canvas interaction
        {
            selector: '#canvas',
            title: '3️⃣ Start Creating!',
            text: 'Your canvas is ready!\n\n<b>Quick tips:</b>\n• <b>Click</b> cells to paint\n• <b>Right-click</b> signals for more options\n• <b>Scroll</b> to navigate\n• <b>Ctrl + Z</b> to undo',
            position: 'top'
        },

        // Step 6: Save & Export
        {
            selector: '#tool-save',
            title: '💾 Save Your Work',
            text: 'Don\'t forget to save!\n\nYou can also export as <b>PNG</b>, <b>SVG</b>, or <b>WaveDrom JSON</b> from the File menu.',
            position: 'bottom'
        },

        // Step 7: Done!
        {
            selector: '#logo',
            title: '🎉 You\'re Ready!',
            text: 'That\'s it! You know the essentials.\n\n<b>Explore more:</b>\n• Add arrows, markers & annotations\n• Import VCD files from simulators\n• Check the <b>Help</b> menu anytime\n\nHappy designing!',
            position: 'bottom'
        }
    ];

    // ======================================
    // CREATE UI ELEMENTS
    // ======================================
    
    // Overlay
    const overlay = document.createElement('div');
    overlay.className = 'wp-tutorial-overlay';

    // Tooltip container
    const tooltip = document.createElement('div');
    tooltip.className = 'wp-tutorial-tooltip wp-tutorial-quickstart';

    // Progress bar
    const progressContainer = document.createElement('div');
    progressContainer.className = 'tutorial-progress';
    const progressBar = document.createElement('div');
    progressBar.className = 'tutorial-progress-bar';
    progressBar.style.width = '0%';
    progressContainer.appendChild(progressBar);

    // Step indicator (dots)
    const stepDots = document.createElement('div');
    stepDots.className = 'tutorial-step-dots';
    steps.forEach((_, i) => {
        const dot = document.createElement('span');
        dot.className = 'tutorial-dot';
        dot.dataset.step = i;
        stepDots.appendChild(dot);
    });

    // Title and text
    const titleEl = document.createElement('div');
    titleEl.className = 'title';

    const textEl = document.createElement('div');
    textEl.className = 'text';

    // Actions
    const actions = document.createElement('div');
    actions.className = 'actions';

    const skipBtn = document.createElement('button');
    skipBtn.className = 'btn secondary';
    skipBtn.textContent = 'Skip';
    skipBtn.type = 'button';

    const nextBtn = document.createElement('button');
    nextBtn.className = 'btn primary';
    nextBtn.textContent = 'Next →';
    nextBtn.type = 'button';

    actions.appendChild(skipBtn);
    actions.appendChild(nextBtn);
    
    // Assemble tooltip
    tooltip.appendChild(progressContainer);
    tooltip.appendChild(stepDots);
    tooltip.appendChild(titleEl);
    tooltip.appendChild(textEl);
    tooltip.appendChild(actions);

    // Arrow pointer
    const arrow = document.createElement('div');
    arrow.className = 'wp-tutorial-arrow';

    // Add to DOM
    document.body.appendChild(overlay);
    document.body.appendChild(tooltip);
    document.body.appendChild(arrow);

    // ======================================
    // STATE MANAGEMENT
    // ======================================
    
    let currentIndex = 0;
    let currentTarget = null;

    // ======================================
    // CLEANUP
    // ======================================
    
    const cleanup = () => {
        if (currentTarget) {
            currentTarget.classList.remove('wp-tutorial-highlight');
        }
        
        document.querySelectorAll('.wp-tutorial-highlight').forEach(el => {
            el.classList.remove('wp-tutorial-highlight');
        });
        
        if (overlay.parentElement) overlay.parentElement.removeChild(overlay);
        if (tooltip.parentElement) tooltip.parentElement.removeChild(tooltip);
        if (arrow.parentElement) arrow.parentElement.removeChild(arrow);
        
        document.removeEventListener('keydown', handleKeydown);
        
        localStorage.setItem('wavepaint_tutorial_done', 'true');
        window.__wavepaintTutorialActive = false;
    };

    // ======================================
    // POSITIONING
    // ======================================
    
    const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

    const positionTooltip = (rect, position = 'bottom') => {
        const padding = 20;
        const arrowSize = 12;
        
        tooltip.style.visibility = 'hidden';
        tooltip.style.display = 'block';
        const tooltipRect = tooltip.getBoundingClientRect();
        tooltip.style.visibility = 'visible';

        let top, left;
        let arrowTop, arrowLeft;
        let arrowDirection = 'down';

        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;

        // Special case: center position
        if (position === 'center') {
            top = (viewportHeight - tooltipRect.height) / 2;
            left = (viewportWidth - tooltipRect.width) / 2;
            arrow.style.display = 'none';
            tooltip.style.top = `${top}px`;
            tooltip.style.left = `${left}px`;
            return;
        }

        arrow.style.display = 'block';

        switch (position) {
            case 'top':
                top = rect.top - tooltipRect.height - arrowSize - 8;
                left = rect.left + (rect.width - tooltipRect.width) / 2;
                arrowDirection = 'down';
                break;
            case 'left':
                top = rect.top + (rect.height - tooltipRect.height) / 2;
                left = rect.left - tooltipRect.width - arrowSize - 8;
                arrowDirection = 'right';
                break;
            case 'right':
                top = rect.top + (rect.height - tooltipRect.height) / 2;
                left = rect.right + arrowSize + 8;
                arrowDirection = 'left';
                break;
            case 'bottom':
            default:
                top = rect.bottom + arrowSize + 8;
                left = rect.left + (rect.width - tooltipRect.width) / 2;
                arrowDirection = 'up';
                break;
        }

        // Viewport clamping
        if (top < padding) {
            top = rect.bottom + arrowSize + 8;
            arrowDirection = 'up';
        }
        if (top + tooltipRect.height > viewportHeight - padding) {
            top = rect.top - tooltipRect.height - arrowSize - 8;
            arrowDirection = 'down';
        }

        left = clamp(left, padding, viewportWidth - tooltipRect.width - padding);
        top = clamp(top, padding, viewportHeight - tooltipRect.height - padding);

        tooltip.style.top = `${top}px`;
        tooltip.style.left = `${left}px`;

        arrow.className = 'wp-tutorial-arrow';
        
        if (arrowDirection === 'down') {
            arrowTop = top + tooltipRect.height;
            arrowLeft = clamp(rect.left + rect.width / 2 - 10, padding, viewportWidth - padding - 20);
            arrow.classList.add('arrow-down');
        } else if (arrowDirection === 'up') {
            arrowTop = top - arrowSize;
            arrowLeft = clamp(rect.left + rect.width / 2 - 10, padding, viewportWidth - padding - 20);
            arrow.classList.add('arrow-up');
        } else if (arrowDirection === 'right') {
            arrowTop = clamp(rect.top + rect.height / 2 - 10, padding, viewportHeight - padding - 20);
            arrowLeft = left + tooltipRect.width;
            arrow.classList.add('arrow-right');
        } else {
            arrowTop = clamp(rect.top + rect.height / 2 - 10, padding, viewportHeight - padding - 20);
            arrowLeft = left - arrowSize;
            arrow.classList.add('arrow-left');
        }

        arrow.style.top = `${arrowTop}px`;
        arrow.style.left = `${arrowLeft}px`;
    };

    // ======================================
    // SHOW STEP
    // ======================================
    
    const showStep = (index) => {
        if (currentTarget) {
            currentTarget.classList.remove('wp-tutorial-highlight');
        }

        const step = steps[index];
        if (!step) {
            cleanup();
            return;
        }

        const target = document.querySelector(step.selector);
        if (!target) {
            // Skip missing elements
            if (index < steps.length - 1) {
                showStep(index + 1);
            } else {
                cleanup();
            }
            return;
        }

        currentIndex = index;
        currentTarget = target;

        // Only highlight if not centered
        if (step.position !== 'center') {
            currentTarget.classList.add('wp-tutorial-highlight');
        }

        // Update progress
        const progress = ((index + 1) / steps.length) * 100;
        progressBar.style.width = `${progress}%`;

        // Update dots
        stepDots.querySelectorAll('.tutorial-dot').forEach((dot, i) => {
            dot.classList.toggle('active', i === index);
            dot.classList.toggle('completed', i < index);
        });

        // Update content
        titleEl.textContent = step.title;
        textEl.innerHTML = step.text.replace(/\n/g, '<br>');

        // Update button text
        nextBtn.textContent = index === steps.length - 1 ? 'Get Started!' : 'Next →';

        // Position tooltip
        const rect = currentTarget.getBoundingClientRect();
        positionTooltip(rect, step.position || 'bottom');
    };

    // ======================================
    // EVENT HANDLERS
    // ======================================
    
    skipBtn.onclick = (e) => {
        e.preventDefault();
        e.stopPropagation();
        cleanup();
    };

    nextBtn.onclick = (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (currentIndex >= steps.length - 1) {
            cleanup();
            return;
        }
        showStep(currentIndex + 1);
    };

    // Click on dots to navigate
    stepDots.onclick = (e) => {
        const dot = e.target.closest('.tutorial-dot');
        if (dot) {
            const stepIndex = parseInt(dot.dataset.step, 10);
            if (!isNaN(stepIndex)) {
                showStep(stepIndex);
            }
        }
    };

    const handleKeydown = (e) => {
        if (!window.__wavepaintTutorialActive) return;
        
        if (e.key === 'Escape') {
            cleanup();
        } else if (e.key === 'ArrowRight' || e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            if (currentIndex >= steps.length - 1) {
                cleanup();
            } else {
                showStep(currentIndex + 1);
            }
        } else if (e.key === 'ArrowLeft') {
            e.preventDefault();
            if (currentIndex > 0) {
                showStep(currentIndex - 1);
            }
        }
    };

    document.addEventListener('keydown', handleKeydown);

    window.addEventListener('resize', () => {
        if (currentTarget && window.__wavepaintTutorialActive) {
            const step = steps[currentIndex];
            positionTooltip(currentTarget.getBoundingClientRect(), step?.position || 'bottom');
        }
    });

    // Start tutorial
    showStep(0);
}

function queueTutorial() {
    window.__wavepaintTutorialQueued = true;
    startTutorialIfNeeded();
}

function scheduleTutorialFallback() {
    let tries = 0;
    const timer = setInterval(() => {
        tries += 1;
        const betaOpen = !!document.getElementById('wp-beta-overlay');
        const tutorialDone = localStorage.getItem('wavepaint_tutorial_done') === 'true';
        if (!betaOpen && !tutorialDone) {
            queueTutorial();
            clearInterval(timer);
        }
        if (tries >= 10) {
            clearInterval(timer);
        }
    }, 400);
}

function startTutorialIfNeeded(attempt = 0) {
    if (!window.__wavepaintTutorialQueued) return;
    if (localStorage.getItem('wavepaint_tutorial_done') === 'true') return;
    if (document.body.classList.contains('loading')) {
        if (attempt < 12) setTimeout(() => startTutorialIfNeeded(attempt + 1), 300);
        return;
    }
    if (wpModalState && wpModalState.isOpen) {
        if (attempt < 12) setTimeout(() => startTutorialIfNeeded(attempt + 1), 300);
        return;
    }
    window.__wavepaintTutorialQueued = false;
    runTutorial();
}
