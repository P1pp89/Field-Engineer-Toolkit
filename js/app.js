import { calculateCable } from './cableSizing.js';
import { calculateBreaker } from './breakerSizing.js';

document.addEventListener('DOMContentLoaded', () => {
    if (window.lucide) {
        window.lucide.createIcons();
    }

    const navCableBtn = document.getElementById('nav-cable');
    const navBreakerBtn = document.getElementById('nav-breaker');
    const moduleCable = document.getElementById('module-cable');
    const moduleBreaker = document.getElementById('module-breaker');

    navCableBtn.addEventListener('click', () => {
        navCableBtn.classList.add('active');
        navBreakerBtn.classList.remove('active');
        moduleCable.classList.remove('hidden');
        moduleBreaker.classList.add('hidden');
    });

    navBreakerBtn.addEventListener('click', () => {
        navBreakerBtn.classList.add('active');
        navCableBtn.classList.remove('active');
        moduleBreaker.classList.remove('hidden');
        moduleCable.classList.add('hidden');
    });

    const cableForm = document.getElementById('cable-form');
    cableForm.addEventListener('submit', (e) => {
        e.preventDefault();

        const params = {
            system: document.getElementById('c-system').value,
            powerkW: parseFloat(document.getElementById('c-power').value),
            cosphi: parseFloat(document.getElementById('c-cosphi').value),
            length: parseFloat(document.getElementById('c-length').value),
            maxVDropPercent: parseFloat(document.getElementById('c-max-vdrop').value),
            material: document.getElementById('c-material').value,
            insulation: document.getElementById('c-insulation').value,
            k1: parseFloat(document.getElementById('c-k1').value),
            k2: parseFloat(document.getElementById('c-k2').value)
        };

        const res = calculateCable(params);

        document.getElementById('out-ib').textContent = `${res.Ib} A`;
        document.getElementById('out-section').textContent = `${res.selectedSection} mm²`;
        document.getElementById('out-vdrop').textContent = `${res.vDropPercent} %`;
        document.getElementById('out-iz-tab').textContent = `${res.IzTab} A`;
        document.getElementById('out-iz-corr').textContent = `${res.IzCorr} A`;
        document.getElementById('out-vdrop-volts').textContent = `${res.vDropVolts} V`;

        const statusBox = document.getElementById('cable-status-box');
        if (res.isSuccess) {
            statusBox.className = "p-4 rounded-lg border mb-4 bg-emerald-950/40 border-emerald-800 text-emerald-300 text-sm";
            statusBox.innerHTML = `<strong>Verifica CEI 64-8 Positiva:</strong> Sezione di <strong>${res.selectedSection} mm²</strong> idonea per portata termica (Iz = ${res.IzCorr} A >= Ib =${res.Ib} A) e caduta di tensione (&Delta;U = ${res.vDropPercent}\% <=${params.maxVDropPercent}%).`;
        } else {
            statusBox.className = "p-4 rounded-lg border mb-4 bg-rose-950/40 border-rose-800 text-rose-300 text-sm";
            statusBox.innerHTML = `<strong>Condizioni non soddisfatte:</strong> Impossibile trovare una sezione standard <= 240 mm² che soddisfi i limiti.`;
        }
    });

    const breakerForm = document.getElementById('breaker-form');
    breakerForm.addEventListener('submit', (e) => {
        e.preventDefault();

        const params = {
            Ib: parseFloat(document.getElementById('b-ib').value),
            Iz: parseFloat(document.getElementById('b-iz').value),
            Ikc: parseFloat(document.getElementById('b-ikc').value),
            loadType: document.getElementById('b-loadtype').value,
            standard: document.getElementById('b-standard').value
        };

        const res = calculateBreaker(params);

        document.getElementById('out-in').textContent = `${res.In} A`;
        document.getElementById('out-curve').textContent = `Curva ${res.curve}`;
        document.getElementById('out-icu').textContent = `${res.Icu} kA`;

        updateCheckItem('check-rule1', 'val-rule1', res.rule1.ok, res.rule1.text);
        updateCheckItem('check-rule2', 'val-rule2', res.rule2.ok, res.rule2.text);
        updateCheckItem('check-rule3', 'val-rule3', res.rule3.ok, res.rule3.text);

        const statusBox = document.getElementById('breaker-status-box');
        if (res.isValid) {
            statusBox.className = "p-4 rounded-lg border mb-4 bg-emerald-950/40 border-emerald-800 text-emerald-300 text-sm";
            statusBox.innerHTML = `<strong>Coordinamento Corretto:</strong> Interruttore Magnetotermico <strong>In = ${res.In}A, Curva ${res.curve}, Icu =${res.Icu}kA</strong> idoneo.`;
        } else {
            statusBox.className = "p-4 rounded-lg border mb-4 bg-amber-950/40 border-amber-800 text-amber-300 text-sm";
            statusBox.innerHTML = `<strong>Attenzione:</strong> Regole di coordinamento non completamente soddisfatte.`;
        }
    });

    function updateCheckItem(containerId, valueId, isOk, text) {
        const el = document.getElementById(containerId);
        const valEl = document.getElementById(valueId);
        valEl.textContent = text;
        if (isOk) {
            el.className = "p-3 bg-emerald-950/30 rounded border border-emerald-800/60 flex items-center justify-between text-emerald-300";
        } else {
            el.className = "p-3 bg-rose-950/30 rounded border border-rose-800/60 flex items-center justify-between text-rose-300";
        }
    }

    cableForm.dispatchEvent(new Event('submit'));
    breakerForm.dispatchEvent(new Event('submit'));
});