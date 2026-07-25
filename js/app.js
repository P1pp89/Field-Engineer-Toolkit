// ==========================================
// CORE 1: CABLE SIZING (Tabellare)
// ==========================================
const SECTIONS = [1.5, 2.5, 4, 6, 10, 16, 25, 35, 50, 70, 95, 120, 150];
const AMPACITY_TABLES = {
    'Cu-PVC': {
        'B1': [13.5, 18.5, 24, 31, 42, 56, 73, 89, 108, 136, 164, 188, 216],
        'C':  [15.5, 21.0, 28, 36, 50, 68, 89, 110, 134, 171, 207, 239, 275],
        'E':  [15.5, 21.0, 28, 36, 50, 68, 89, 110, 134, 171, 207, 239, 275]
    },
    'Cu-EPR': {
        'B1': [17.0, 23.0, 31, 40, 54, 73, 95, 117, 141, 179, 216, 249, 285],
        'C':  [19.5, 27.0, 36, 46, 63, 85, 112, 138, 168, 214, 259, 299, 344],
        'E':  [23.0, 32.0, 42, 54, 75, 100, 127, 158, 192, 246, 298, 346, 399]
    }
};
const RESISTIVITY = { Cu: 0.0178, Al: 0.0282 };

// ==========================================
// CORE 2: BREAKER SIZING
// ==========================================
const STANDARD_IN = [6, 10, 13, 16, 20, 25, 32, 40, 50, 63, 80, 100, 125, 160, 250];
const STANDARD_ICU = [4.5, 6, 10, 15, 25, 36, 50, 70];

// ==========================================
// DOM INTERACTION & EVENT LISTENERS
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
    if (window.lucide) window.lucide.createIcons();

    // -- NAVIGAZIONE TAB --
    const navCableBtn = document.getElementById('nav-cable');
    const navBreakerBtn = document.getElementById('nav-breaker');
    const moduleCable = document.getElementById('module-cable');
    const moduleBreaker = document.getElementById('module-breaker');

    function switchTab(showCable) {
        if (showCable) {
            navCableBtn.className = "nav-btn active flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors bg-sky-600/20 text-sky-400 border border-sky-500/30";
            navBreakerBtn.className = "nav-btn flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors text-slate-400 hover:text-slate-200";
            moduleCable.classList.remove('hidden');
            moduleBreaker.classList.add('hidden');
        } else {
            navBreakerBtn.className = "nav-btn active flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors bg-sky-600/20 text-sky-400 border border-sky-500/30";
            navCableBtn.className = "nav-btn flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors text-slate-400 hover:text-slate-200";
            moduleBreaker.classList.remove('hidden');
            moduleCable.classList.add('hidden');
        }
    }

    navCableBtn.addEventListener('click', () => switchTab(true));
    navBreakerBtn.addEventListener('click', () => switchTab(false));

    // -- HELPER IKC INTERRUTTORE --
    document.getElementById('b-ikc-helper').addEventListener('change', (e) => {
        if (e.target.value) {
            document.getElementById('b-ikc').value = e.target.value;
            document.getElementById('breaker-form').dispatchEvent(new Event('submit'));
        }
    });

    // -- FORM CAVO (SUBMIT MANUALE) --
    document.getElementById('cable-form').addEventListener('submit', (e) => {
        e.preventDefault();
        
        const powerKw = parseFloat(document.getElementById('c-power').value) || 0;
        const voltage = parseInt(document.getElementById('c-system').value) || 400;
        const cableType = document.getElementById('c-type').value;
        const installation = document.getElementById('c-installation').value;
        const length = parseFloat(document.getElementById('c-length').value) || 1;
        const cosphi = parseFloat(document.getElementById('c-cosphi').value) || 0.9;

        const P = powerKw * 1000;
        const Ib = voltage === 400 ? P / (Math.sqrt(3) * voltage * cosphi) : P / (voltage * cosphi);

        const material = cableType.split('-')[0];
        const tableRef = material === 'Al' ? 'Cu-EPR' : cableType; 
        const izArray = AMPACITY_TABLES[tableRef][installation];
        
        let selectedIndex = -1;
        let Iz = 0;

        for (let i = 0; i < SECTIONS.length; i++) {
            if (material === 'Al' && SECTIONS[i] < 16) continue;
            const currentIz = material === 'Al' ? izArray[i] * 0.78 : izArray[i];
            if (currentIz >= Ib) {
                selectedIndex = i; Iz = currentIz; break;
            }
        }

        let vDropPct = 0;
        if (selectedIndex !== -1) {
            const S = SECTIONS[selectedIndex];
            const rho = RESISTIVITY[material];
            const vDrop = voltage === 400 ? (Math.sqrt(3) * length * Ib * cosphi * rho) / S : (2 * length * Ib * cosphi * rho) / S;
            vDropPct = (vDrop / voltage) * 100;
        }

        // Output UI Cavo
        document.getElementById('out-ib').textContent = Ib.toFixed(1) + ' A';
        const statusBox = document.getElementById('cable-status-box');

        if (selectedIndex !== -1) {
            document.getElementById('out-section').textContent = SECTIONS[selectedIndex] + ' mm²';
            document.getElementById('out-iz').textContent = Iz.toFixed(1) + ' A';
            document.getElementById('out-vdrop').textContent = vDropPct.toFixed(2) + ' %';
            document.getElementById('out-vdrop').className = vDropPct > 4.0 ? 'text-xl font-mono font-semibold text-rose-500' : 'text-xl font-mono font-semibold text-amber-400';
            
            statusBox.className = "mt-6 p-3 rounded border bg-emerald-900/30 border-emerald-800 text-emerald-400 text-xs";
            statusBox.innerHTML = `✓ Sezione commerciale trovata ed applicabile per posa ${installation}.`;

            // SYNC INTERRUTTORE
            document.getElementById('b-ib').value = Ib.toFixed(1);
            document.getElementById('b-iz').value = Iz.toFixed(1);
            document.getElementById('breaker-form').dispatchEvent(new Event('submit'));
        } else {
            document.getElementById('out-section').textContent = '> 150 mm²';
            document.getElementById('out-iz').textContent = 'O.R.';
            document.getElementById('out-vdrop').textContent = '-';
            
            statusBox.className = "mt-6 p-3 rounded border bg-rose-900/30 border-rose-800 text-rose-400 text-xs";
            statusBox.innerHTML = `⚠ Corrente troppo elevata per singola corda. Prevedere posa in parallelo.`;
        }
    });

    // -- FORM INTERRUTTORE (SUBMIT MANUALE / AUTO-SYNC) --
    document.getElementById('breaker-form').addEventListener('submit', (e) => {
        e.preventDefault();
        
        const Ib = parseFloat(document.getElementById('b-ib').value) || 0;
        const Iz = parseFloat(document.getElementById('b-iz').value) || 0;
        const Ikc = parseFloat(document.getElementById('b-ikc').value) || 6.0;
        const loadType = document.getElementById('b-loadtype').value;

        let selectedIn = STANDARD_IN.find(In => In >= Ib && In <= Iz) || STANDARD_IN.find(In => In >= Ib) || null;
        let curve = loadType === 'motor' ? 'D' : (loadType === 'sensitive' ? 'B' : 'C');
        const selectedIcu = STANDARD_ICU.find(icu => icu >= Ikc) || 70;

        const rule1 = selectedIn ? (Ib <= selectedIn && selectedIn <= Iz) : false;
        const rule2 = selectedIn ? ((1.45 * selectedIn) <= (1.45 * Iz)) : false; 
        const rule3 = selectedIcu >= Ikc;

        document.getElementById('out-in').textContent = selectedIn ? `${selectedIn} A` : 'O.R.';
        document.getElementById('out-curve').textContent = curve;
        document.getElementById('out-icu').textContent = `${selectedIcu} kA`;

        const updateCheck = (cId, vId, isOk, text) => {
            document.getElementById(vId).textContent = text;
            document.getElementById(cId).className = isOk 
                ? "p-3 bg-emerald-950/30 rounded border border-emerald-800/60 flex justify-between text-emerald-400" 
                : "p-3 bg-rose-950/30 rounded border border-rose-800/60 flex justify-between text-rose-400";
        };

        updateCheck('check-rule1', 'val-rule1', rule1, `${Ib.toFixed(1)}A ≤ ${selectedIn||'?'}A ≤ ${Iz.toFixed(1)}A`);
        updateCheck('check-rule2', 'val-rule2', rule2, `Ok`);
        updateCheck('check-rule3', 'val-rule3', rule3, `${selectedIcu}kA ≥ ${Ikc}kA`);

        const statusBox = document.getElementById('breaker-status-box');
        if (rule1 && rule2 && rule3) {
            statusBox.className = "p-4 rounded-lg border mb-4 bg-emerald-950/40 border-emerald-800 text-emerald-300 text-sm";
            statusBox.innerHTML = `<strong>✓ Coordinamento Valido.</strong>`;
        } else {
            statusBox.className = "p-4 rounded-lg border mb-4 bg-amber-950/40 border-amber-800 text-amber-300 text-sm";
            statusBox.innerHTML = `<strong>⚠ Attenzione:</strong> Parametri normativi violati.`;
        }
    });
});
