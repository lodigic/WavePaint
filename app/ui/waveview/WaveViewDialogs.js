// WaveViewDialogs.js - Dialog functions for WaveView

/**
 * Show time span placement dialog
 */
function chooseTimeSpanPlacement() {
    return new Promise((resolve) => {
        const overlay = document.createElement('div');
        overlay.style.position = 'fixed';
        overlay.style.top = '0';
        overlay.style.left = '0';
        overlay.style.width = '100%';
        overlay.style.height = '100%';
        overlay.style.background = 'rgba(0,0,0,0.45)';
        overlay.style.display = 'flex';
        overlay.style.alignItems = 'center';
        overlay.style.justifyContent = 'center';
        overlay.style.zIndex = '10000';

        const dialog = document.createElement('div');
        dialog.style.background = 'var(--menu-bg)';
        dialog.style.border = '1px solid var(--border-color)';
        dialog.style.borderRadius = '8px';
        dialog.style.padding = '16px';
        dialog.style.minWidth = '260px';
        dialog.style.color = 'var(--text-color)';

        const title = document.createElement('div');
        title.textContent = 'Time marker';
        title.style.fontWeight = 'bold';
        title.style.marginBottom = '10px';

        const msg = document.createElement('div');
        msg.textContent = 'Place the time span above or below the signal?';
        msg.style.marginBottom = '12px';

        const btnRow = document.createElement('div');
        btnRow.style.display = 'flex';
        btnRow.style.justifyContent = 'flex-end';
        btnRow.style.gap = '8px';

        const aboveBtn = document.createElement('button');
        aboveBtn.textContent = 'Above signal';
        const belowBtn = document.createElement('button');
        belowBtn.textContent = 'Below signal';
        const cancelBtn = document.createElement('button');
        cancelBtn.textContent = 'Cancel';

        [aboveBtn, belowBtn, cancelBtn].forEach(btn => {
            btn.style.padding = '6px 10px';
            btn.style.border = '1px solid var(--border-color)';
            btn.style.background = 'var(--menu-bg)';
            btn.style.color = 'var(--text-color)';
            btn.style.cursor = 'pointer';
            btn.style.borderRadius = '4px';
        });

        aboveBtn.onclick = () => {
            document.body.removeChild(overlay);
            resolve('above');
        };
        belowBtn.onclick = () => {
            document.body.removeChild(overlay);
            resolve('below');
        };
        cancelBtn.onclick = () => {
            document.body.removeChild(overlay);
            resolve('cancel');
        };

        btnRow.appendChild(cancelBtn);
        btnRow.appendChild(belowBtn);
        btnRow.appendChild(aboveBtn);

        dialog.appendChild(title);
        dialog.appendChild(msg);
        dialog.appendChild(btnRow);
        overlay.appendChild(dialog);
        document.body.appendChild(overlay);
    });
}

// Export for module use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { chooseTimeSpanPlacement };
}
