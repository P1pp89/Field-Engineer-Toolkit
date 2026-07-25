// ==========================================
// MODULO 1: CABLE SIZING CORE
// ==========================================
const RESISTIVITY = { Cu: 0.0178, Al: 0.0282 };
const AMPACITY_TABLE = {
    1.5: { PVC: 14.5, EPR: 17.5 }, 2.5: { PVC: 19.5, EPR: 24.0 }, 4: { PVC: 26.0, EPR: 32.0 },
    6: { PVC: 34.0, EPR: 41.0 }, 10: { PVC: 46.0, EPR: 57.0 }, 16: { PVC: 61.0, EPR: 76.0 },
    25: { PVC: 80.0, EPR: 96.0 }, 35: { PVC: 99.0, EPR: 119.0 }, 50: { PVC: 119.0, EPR: 144.0 },
    70: { PVC: 151.0, EPR: 184.0 }, 95: { PVC: 182.0, EPR: 223.0 }, 120: { PVC: 210.0, EPR: 259.0 },
    150: { PVC: 240.0, EPR: 299.0 }, 185: { PVC: 273.0, EPR: 341.0 }, 240: { PVC: 321.0, EPR: 403.0 }
};
const STANDARD_SECTIONS = [1.5, 2.5, 4, 6, 10, 16, 25, 35, 50, 70, 95, 120, 150, 185, 240];

function calculateCable(params) {
    const { system, powerkW, cosphi, length, maxVDropPercent, material, insulation, k1, k2 } = params;
    const Un = system === '3PH' ? 400 : 230;
    const P = powerkW * 1000;
    let Ib = system === '3PH' ? P / (Math.sqrt(3) * Un * cosphi) : P / (Un * cosphi);
    
    let selectedSection = null, IzTab = 0, IzCorr = 0, vDropVolts = 0, vDropPercent = 0;
    const rho = RESISTIVITY[material];

    for (const section of STANDARD_SECTIONS) {
        if (material === 'Al' && section < 16) continue;
        const baseAmpacity = AMPACITY_TABLE[section][insulation];
        const matFactor = material === 'Al' ? 0.78 : 1.0;
        const izCheck = baseAmpacity * k1 * k2 * matFactor;

        if (izCheck < Ib) continue;

        let vDrop = system === '3PH' ? (Math.sqrt(3) * length * Ib * cosphi * rho) / section : (2 * length * Ib * cosphi * rho) / section;
        const vDropPct = (vDrop / Un) * 100;

        if (vDropPct <= maxVDropPercent) {
            selectedSection = section; IzTab = baseAmpacity * matFactor; IzCorr = izCheck; vDropVolts = vDrop; vDropPercent = vDropPct;
            break;
        }
    }
    return {
        Ib: Ib.toFixed(2), selectedSection: selectedSection || 'N/A (>240mm²)',
        IzTab: IzTab.toFixed(1), IzCorr: IzCorr.toFixed(1), vDropVolts: vDropVolts.toFixed(2), vDropPercent: vDropPercent.toFixed(2),
        isSuccess: selectedSection !== null
    };
}

// ==========================================
// MODULO 2: BREAKER SIZING CORE
// ==========================================
const STANDARD_RATINGS_IN = [6, 10, 13, 16, 20, 25, 32, 40, 50, 63, 80, 100, 125, 160, 250];
const STANDARD_ICU_KA = [4.5, 6, 10, 15, 25, 36, 50, 70];

function calculateBreaker(params) {
    const { Ib, Iz, Ikc, loadType } = params;
    let selectedIn = STANDARD_RATINGS_IN.find(In => In >= Ib && In <= Iz) || STANDARD_RATINGS_IN.find(In => In >= Ib) || null;
    let curve = loadType === 'motor' ? 'D' : (loadType === 'sensitive' ? 'B' : 'C');
    const selectedIcu = STANDARD_ICU_KA.find(icu => icu >= Ikc) || 70;

    const rule1 = selectedIn ? (Ib <= selectedIn && selectedIn <= Iz) : false;
    const I2 = selectedIn ? 1.45 * selectedIn : 0;
    const rule2 = selectedIn ? (I2 <= 1.45 * Iz) : false;
    const rule3 = selectedIcu >= Ikc;

    return {
        In: selectedIn ? `${selectedIn}` : 'O.R.', curve: curve, Icu: selectedIcu.toString(),
        rule1: { ok: rule1, text: `${Ib}A <= ${selectedIn || '?'}A <= ${Iz}A` },
        rule2: { ok: rule2, text: `${I2.toFixed(1)}A <= ${(1.45 * Iz).toFixed(1)}A` },
        rule3: { ok: rule3, text: `${selectedIcu}kA >= ${Ikc}kA` },
        isValid: rule1 && rule2 && rule3
    };
}

// ==========================================
// DOM INTERACTION & EVENT LISTENERS
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
    if (window.lucide) window.lucide.createIcons();

    // Navigazione
    const navCableBtn = document.getElementById('nav-cable');
    const navBreakerBtn = document.getElementById('nav-breaker');
    const moduleCable = document.getElementById('module-cable');
    const moduleBreaker = document.getElementById('module-breaker');

    navCableBtn.addEventListener('click', () => {
        navCableBtn.classList.add('active'); navBreakerBtn.classList.remove('active');
        moduleCable.classList.remove('hidden'); moduleBreaker.classList.add('hidden');
    });
    navBreakerBtn.addEventListener('click', () => {
        navBreakerBtn.classList.add('active'); navCableBtn.classList.remove('active');
        moduleBreaker.classList.remove('hidden'); moduleCable.classList.add('hidden');
    });

    // Heuristic Helper per Ikc
    const ikcHelper = document.getElementById('b-ikc-helper');
    const ikcInput = document.getElementById('b-ikc');
    ikcHelper.addEventListener('change', (e) => {
        if (e.target.value) {
            ikcInput.value = e.target.value;
            document.getElementById('breaker-form').dispatchEvent(new Event('submit'));
        }
    });

    // Form Linea
    const cableForm = document.getElementById('cable-form');
    cableForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const res = calculateCable({
            system: document.getElementById('c-system').value,
            powerkW: parseFloat(document.getElementById('c-power').value),
            cosphi: parseFloat(document.getElementById('c-cosphi').value),
            length: parseFloat(document.getElementById('c-length').value),
            maxVDropPercent: parseFloat(document.getElementById('c-max-vdrop').value),
            material: document.getElementById('c-material').value,
            insulation: document.getElementById('c-insulation').value,
            k1: parseFloat(document.getElementById('c-k1').value),
            k2: parseFloat(document.getElementById('c-k2').value)
        });

        document.getElementById('out-ib').textContent = `${res.Ib} A`;
        document.getElementById('out-section').textContent = `${res.selectedSection} mm²`;
        document.getElementById('out-vdrop').textContent = `${res.vDropPercent} %`;
        document.getElementById('out-iz-tab').textContent = `${res.IzTab} A`;
        document.getElementById('out-iz-corr').textContent = `${res.IzCorr} A`;
        document.getElementById('out-vdrop-volts').textContent = `${res.vDropVolts} V`;

        // SYNC: Inietta i risultati direttamente nel tab interruttore
        if (res.isSuccess) {
            document.getElementById('b-ib').value = res.Ib;
            document.getElementById('b-iz').value = res.IzCorr;
            document.getElementById('breaker-form').dispatchEvent(new Event('submit')); // Auto-calcola interruttore
        }

        const statusBox = document.getElementById('cable-status-box');
        if (res.isSuccess) {
            statusBox.className = "p-4 rounded-lg border mb-4 bg-emerald-950/40 border-emerald-800 text-emerald-300 text-sm";
            statusBox.innerHTML = `<strong>Verifica OK:</strong> Sezione idonea per portata (Iz = ${res.IzCorr}A >= Ib = ${res.Ib}A).`;
        } else {
            statusBox.className = "p-4 rounded-lg border mb-4 bg-rose-950/40 border-rose-800 text-rose-300 text-sm";
            statusBox.innerHTML = `<strong>Errore:</strong> Nessuna sezione standard commerciale compatibile.`;
        }
    });

    // Form Interruttore
    const breakerForm = document.getElementById('breaker-form');
    breakerForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const res = calculateBreaker({
            Ib: parseFloat(document.getElementById('b-ib').value),
            Iz: parseFloat(document.getElementById('b-iz').value),
            Ikc: parseFloat(document.getElementById('b-ikc').value),
            loadType: document.getElementById('b-loadtype').value
        });

        document.getElementById('out-in').textContent = `${res.In} A`;
        document.getElementById('out-curve').textContent = `Curva ${res.curve}`;
        document.getElementById('out-icu').textContent = `${res.Icu} kA`;

        updateCheck('check-rule1', 'val-rule1', res.rule1.ok, res.rule1.text);
        updateCheck('check-rule2', 'val-rule2', res.rule2.ok, res.rule2.text);
        updateCheck('check-rule3', 'val-rule3', res.rule3.ok, res.rule3.text);

        const statusBox = document.getElementById('breaker-status-box');
        if (res.isValid) {
            statusBox.className = "p-4 rounded-lg border mb-4 bg-emerald-950/40 border-emerald-800 text-emerald-300 text-sm";
            statusBox.innerHTML = `<strong>Coordinamento Valido.</strong>`;
        } else {
            statusBox.className = "p-4 rounded-lg border mb-4 bg-amber-950/40 border-amber-800 text-amber-300 text-sm";
            statusBox.innerHTML = `<strong>Attenzione:</strong> Limiti normativi violati.`;
        }
    });

    function updateCheck(containerId, valueId, isOk, text) {
        document.getElementById(valueId).textContent = text;
        document.getElementById(containerId).className = isOk 
            ? "p-3 bg-emerald-950/30 rounded border border-emerald-800/60 flex items-center justify-between text-emerald-300" 
            : "p-3 bg-rose-950/30 rounded border border-rose-800/60 flex items-center justify-between text-rose-300";
    }

    cableForm.dispatchEvent(new Event('submit'));
});