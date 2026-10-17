/**
 * MainWindowDialogs.js - Predefined signal dialogs
 */

async function addClockSignalDialog() {
    const name = await wpPrompt('Clock name:', 'clk', 'Add Clock Signal');
    if (!name) return;
    
    const highSamplesStr = await wpPrompt('High time (samples):', '1', 'Add Clock Signal');
    if (highSamplesStr === null) return;
    const highSamples = parseInt(highSamplesStr, 10);
    if (isNaN(highSamples) || highSamples < 1) return;
    
    const lowSamplesStr = await wpPrompt('Low time (samples):', '1', 'Add Clock Signal');
    if (lowSamplesStr === null) return;
    const lowSamples = parseInt(lowSamplesStr, 10);
    if (isNaN(lowSamples) || lowSamples < 1) return;
    
    // Calculate pulses to fill all available samples
    const period = highSamples + lowSamples;
    const sampleCount = document_wave.m_sampleCount;
    const pulses = Math.ceil(sampleCount / period);
    
    const idx = document_wave.addClockSignal(name, pulses, highSamples, lowSamples);
    // Apply paint color if selected
    if (typeof getSelectedPaintColor === 'function' && getSelectedPaintColor() && idx >= 0) {
        document_wave.setSignalColor(idx, getSelectedPaintColor());
    }
    drawWaveform();
    updateSidePanels();
}

async function addCounterSignalDialog() {
    const name = await wpPrompt('Counter name:', 'cnt', 'Add Counter Signal');
    if (!name) return;
    
    const timeStepStr = await wpPrompt('Time Step:', '1', 'Add Counter Signal');
    if (timeStepStr === null) return;
    const timeStep = parseInt(timeStepStr, 10);
    if (isNaN(timeStep) || timeStep < 0) return;
    
    const fromValueStr = await wpPrompt('From value:', '0', 'Add Counter Signal');
    if (fromValueStr === null) return;
    const fromValue = parseInt(fromValueStr, 10);
    if (isNaN(fromValue) || fromValue < 0) return;
    
    const toValueStr = await wpPrompt('To value:', '15', 'Add Counter Signal');
    if (toValueStr === null) return;
    const toValue = parseInt(toValueStr, 10);
    if (isNaN(toValue) || toValue < 0) return;
    
    const idx = document_wave.addCounterSignal(name, timeStep, fromValue, toValue);
    // Apply paint color if selected
    if (typeof getSelectedPaintColor === 'function' && getSelectedPaintColor() && idx >= 0) {
        document_wave.setSignalColor(idx, getSelectedPaintColor());
    }
    drawWaveform();
    updateSidePanels();
}

async function addResetSignalDialog() {
    const name = await wpPrompt('Signal name:', 'rst_n', 'Add Reset Signal');
    if (!name) return;
    
    const activeCyclesStr = await wpPrompt('Active cycles:', '5', 'Add Reset Signal');
    if (activeCyclesStr === null) return;
    const activeCycles = parseInt(activeCyclesStr, 10);
    if (isNaN(activeCycles) || activeCycles < 1) return;
    
    const polarity = await wpConfirm('Active High? (OK = Active High, Cancel = Active Low)', 'Add Reset Signal');
    
    const idx = document_wave.addResetSignal(name, activeCycles, polarity);
    // Apply paint color if selected
    if (typeof getSelectedPaintColor === 'function' && getSelectedPaintColor() && idx >= 0) {
        document_wave.setSignalColor(idx, getSelectedPaintColor());
    }
    drawWaveform();
    updateSidePanels();
}

async function addPulseSignalDialog() {
    const name = await wpPrompt('Signal name:', 'pulse', 'Add Pulse Signal');
    if (!name) return;
    
    const pulseStartStr = await wpPrompt('Pulse start sample:', '2', 'Add Pulse Signal');
    if (pulseStartStr === null) return;
    const pulseStart = parseInt(pulseStartStr, 10);
    if (isNaN(pulseStart) || pulseStart < 0) return;
    
    const pulseWidthStr = await wpPrompt('Pulse width (samples):', '3', 'Add Pulse Signal');
    if (pulseWidthStr === null) return;
    const pulseWidth = parseInt(pulseWidthStr, 10);
    if (isNaN(pulseWidth) || pulseWidth < 1) return;
    
    const idx = document_wave.addPulseSignal(name, pulseStart, pulseWidth);
    // Apply paint color if selected
    if (typeof getSelectedPaintColor === 'function' && getSelectedPaintColor() && idx >= 0) {
        document_wave.setSignalColor(idx, getSelectedPaintColor());
    }
    drawWaveform();
    updateSidePanels();
}

async function addStrobeSignalDialog() {
    const name = await wpPrompt('Signal name:', 'strobe', 'Add Strobe Signal');
    if (!name) return;
    
    const periodStr = await wpPrompt('Period (samples):', '5', 'Add Strobe Signal');
    if (periodStr === null) return;
    const period = parseInt(periodStr, 10);
    if (isNaN(period) || period < 2) return;
    
    const pulseWidthStr = await wpPrompt('Pulse width (samples):', '1', 'Add Strobe Signal');
    if (pulseWidthStr === null) return;
    const pulseWidth = parseInt(pulseWidthStr, 10);
    if (isNaN(pulseWidth) || pulseWidth < 1 || pulseWidth >= period) return;
    
    const idx = document_wave.addStrobeSignal(name, period, pulseWidth);
    // Apply paint color if selected
    if (typeof getSelectedPaintColor === 'function' && getSelectedPaintColor() && idx >= 0) {
        document_wave.setSignalColor(idx, getSelectedPaintColor());
    }
    drawWaveform();
    updateSidePanels();
}

async function addPWMSignalDialog() {
    const name = await wpPrompt('Signal name:', 'pwm', 'Add PWM Signal');
    if (!name) return;
    
    const periodStr = await wpPrompt('Period (samples):', '10', 'Add PWM Signal');
    if (periodStr === null) return;
    const period = parseInt(periodStr, 10);
    if (isNaN(period) || period < 2) return;
    
    const dutyCycleStr = await wpPrompt('Duty cycle %:', '50', 'Add PWM Signal');
    if (dutyCycleStr === null) return;
    const dutyCycle = parseInt(dutyCycleStr, 10);
    if (isNaN(dutyCycle) || dutyCycle < 0 || dutyCycle > 100) return;
    
    const idx = document_wave.addPWMSignal(name, period, dutyCycle);
    // Apply paint color if selected
    if (typeof getSelectedPaintColor === 'function' && getSelectedPaintColor() && idx >= 0) {
        document_wave.setSignalColor(idx, getSelectedPaintColor());
    }
    drawWaveform();
    updateSidePanels();
}

async function addRampSignalDialog() {
    const name = await wpPrompt('Signal name:', 'ramp', 'Add Ramp Signal');
    if (!name) return;
    
    const startValueStr = await wpPrompt('Start value:', '0', 'Add Ramp Signal');
    if (startValueStr === null) return;
    const startValue = parseInt(startValueStr, 10);
    if (isNaN(startValue)) return;
    
    const endValueStr = await wpPrompt('End value:', '10', 'Add Ramp Signal');
    if (endValueStr === null) return;
    const endValue = parseInt(endValueStr, 10);
    if (isNaN(endValue)) return;
    
    const stepSizeStr = await wpPrompt('Step size:', '1', 'Add Ramp Signal');
    if (stepSizeStr === null) return;
    const stepSize = parseInt(stepSizeStr, 10);
    if (isNaN(stepSize) || stepSize === 0) return;
    
    const idx = document_wave.addRampSignal(name, startValue, endValue, stepSize);
    // Apply paint color if selected
    if (typeof getSelectedPaintColor === 'function' && getSelectedPaintColor() && idx >= 0) {
        document_wave.setSignalColor(idx, getSelectedPaintColor());
    }
    drawWaveform();
    updateSidePanels();
}

async function addWalkingOneSignalDialog() {
    const name = await wpPrompt('Signal name:', 'walking_one', 'Add Walking One');
    if (!name) return;
    
    const bitWidthStr = await wpPrompt('Bit width:', '4', 'Add Walking One');
    if (bitWidthStr === null) return;
    const bitWidth = parseInt(bitWidthStr, 10);
    if (isNaN(bitWidth) || bitWidth < 1 || bitWidth > 32) return;
    
    const idx = document_wave.addWalkingOneSignal(name, bitWidth);
    // Apply paint color if selected
    if (typeof getSelectedPaintColor === 'function' && getSelectedPaintColor() && idx >= 0) {
        document_wave.setSignalColor(idx, getSelectedPaintColor());
    }
    drawWaveform();
    updateSidePanels();
}

async function addWalkingZeroSignalDialog() {
    const name = await wpPrompt('Signal name:', 'walking_zero', 'Add Walking Zero');
    if (!name) return;
    
    const bitWidthStr = await wpPrompt('Bit width:', '4', 'Add Walking Zero');
    if (bitWidthStr === null) return;
    const bitWidth = parseInt(bitWidthStr, 10);
    if (isNaN(bitWidth) || bitWidth < 1 || bitWidth > 32) return;
    
    const idx = document_wave.addWalkingZeroSignal(name, bitWidth);
    // Apply paint color if selected
    if (typeof getSelectedPaintColor === 'function' && getSelectedPaintColor() && idx >= 0) {
        document_wave.setSignalColor(idx, getSelectedPaintColor());
    }
    drawWaveform();
    updateSidePanels();
}

async function addBusIdleSignalDialog() {
    const name = await wpPrompt('Signal name:', 'bus_idle', 'Add Bus Idle');
    if (!name) return;
    
    const valueStr = await wpPrompt('Idle value:', '0', 'Add Bus Idle');
    if (valueStr === null) return;
    const value = parseInt(valueStr, 10);
    if (isNaN(value)) return;
    
    const idx = document_wave.addBusIdleSignal(name, value);
    // Apply paint color if selected
    if (typeof getSelectedPaintColor === 'function' && getSelectedPaintColor() && idx >= 0) {
        document_wave.setSignalColor(idx, getSelectedPaintColor());
    }
    drawWaveform();
    updateSidePanels();
}

async function addAlternatingSignalDialog() {
    const name = await wpPrompt('Signal name:', 'alternating', 'Add Alternating');
    if (!name) return;
    
    const value1Str = await wpPrompt('First value:', '0', 'Add Alternating');
    if (value1Str === null) return;
    const value1 = parseInt(value1Str, 10);
    if (isNaN(value1)) return;
    
    const value2Str = await wpPrompt('Second value:', '255', 'Add Alternating');
    if (value2Str === null) return;
    const value2 = parseInt(value2Str, 10);
    if (isNaN(value2)) return;
    
    const samplesPerValueStr = await wpPrompt('Samples per value:', '2', 'Add Alternating');
    if (samplesPerValueStr === null) return;
    const samplesPerValue = parseInt(samplesPerValueStr, 10);
    if (isNaN(samplesPerValue) || samplesPerValue < 1) return;
    
    const idx = document_wave.addAlternatingSignal(name, value1, value2, samplesPerValue);
    // Apply paint color if selected
    if (typeof getSelectedPaintColor === 'function' && getSelectedPaintColor() && idx >= 0) {
        document_wave.setSignalColor(idx, getSelectedPaintColor());
    }
    drawWaveform();
    updateSidePanels();
}

async function addGrayCodeSignalDialog() {
    const name = await wpPrompt('Signal name:', 'gray_code', 'Add Gray Code');
    if (!name) return;
    
    const startValueStr = await wpPrompt('Start value:', '0', 'Add Gray Code');
    if (startValueStr === null) return;
    const startValue = parseInt(startValueStr, 10);
    if (isNaN(startValue) || startValue < 0) return;
    
    const endValueStr = await wpPrompt('End value:', '7', 'Add Gray Code');
    if (endValueStr === null) return;
    const endValue = parseInt(endValueStr, 10);
    if (isNaN(endValue) || endValue < 0) return;
    
    const idx = document_wave.addGrayCodeSignal(name, startValue, endValue);
    // Apply paint color if selected
    if (typeof getSelectedPaintColor === 'function' && getSelectedPaintColor() && idx >= 0) {
        document_wave.setSignalColor(idx, getSelectedPaintColor());
    }
    drawWaveform();
    updateSidePanels();
}

// Export for module use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        addClockSignalDialog,
        addCounterSignalDialog,
        addResetSignalDialog,
        addPulseSignalDialog,
        addStrobeSignalDialog,
        addPWMSignalDialog,
        addRampSignalDialog,
        addWalkingOneSignalDialog,
        addWalkingZeroSignalDialog,
        addBusIdleSignalDialog,
        addAlternatingSignalDialog,
        addGrayCodeSignalDialog
    };
}
