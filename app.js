// ==========================================
// DATA: MATRICI TABELLARI CEI 64-8 (3 conduttori carichi, 30°C)
// ==========================================
const SECTIONS = [1.5, 2.5, 4, 6, 10, 16, 25, 35, 50, 70, 95, 120, 150];

// Struttura: [B1 (Tubo), C (Muro), E (Passerella)]
const AMPACITY_TABLES = {
    'Cu-PVC': {
        'B1': [13.5, 18.5, 24, 31, 42, 56, 73, 89, 108, 136, 164, 188, 216],
        'C':  [15.5, 21.0, 28, 36, 50, 68, 89, 110, 134, 171, 207, 239, 275],
        'E':  [15.5, 21.0, 28, 36, 50, 68, 89, 110, 134, 171, 207, 239, 275] // Approssimato a C per PVC base
    },
    'Cu-EPR': {
        'B1': [17.0, 23.0, 31, 40, 54, 73, 95, 117, 141, 179, 216, 249, 285],
        'C':  [19.5, 27.0, 36, 46, 63, 85, 112, 138, 168, 214, 259, 299, 344],
        'E':  [23.0, 32.0, 42, 54, 75, 100, 127, 158, 192, 246, 298, 346, 399]
    }
};

const RESISTIVITY = { Cu: 0.0178, Al: 0.0282 };

// ==========================================
// CORE LOGIC
// ==========================================
function calculateLine() {
    // 1. Lettura Parametri
    const powerKw = parseFloat(document.getElementById('c-power').value) || 0;
    const voltage = parseInt(document.getElementById('c-system').value) || 400;
    const cableType = document.getElementById('c-type').value;
    const installation = document.getElementById('c-installation').value;
    const length = parseFloat(document.getElementById('c-length').value) || 1;
    const cosphi = parseFloat(document.getElementById('c-cosphi').value) || 0.9;

    if (powerKw === 0) return;

    // 2. Calcolo Ib
    const P = powerKw * 1000;
    const Ib = voltage === 400 
        ? P / (Math.sqrt(3) * voltage * cosphi) 
        : P / (voltage * cosphi);

    // 3. Setup Ricerca Sezione
    const material = cableType.split('-')[0];
    const tableRef = material === 'Al' ? 'Cu-EPR' : cableType; // Al usa le tabelle EPR con derating
    const izArray = AMPACITY_TABLES[tableRef][installation];
    
    let selectedIndex = -1;
    let Iz = 0;

    // 4. Scansione Matrice per Iz >= Ib
    for (let i = 0; i < SECTIONS.length; i++) {
        // Derating per Alluminio e limite normativo (min 16mmq)
        if (material === 'Al' && SECTIONS[i] < 16) continue;
        
        const currentIz = material === 'Al' ? izArray[i] * 0.78 : izArray[i];

        if (currentIz >= Ib) {
            selectedIndex = i;
            Iz = currentIz;
            break;
        }
    }

    // 5. Calcolo Caduta di Tensione (se trovata sezione)
    let vDropPct = 0;
    if (selectedIndex !== -1) {
        const S = SECTIONS[selectedIndex];
        const rho = RESISTIVITY[material];
        const vDrop = voltage === 400 
            ? (Math.sqrt(3) * length * Ib * cosphi * rho) / S
            : (2 * length * Ib * cosphi * rho) / S;
        vDropPct = (vDrop / voltage) * 100;
    }

    // 6. Aggiornamento UI
    document.getElementById('out-ib').textContent = Ib.toFixed(1) + ' A';
    
    if (selectedIndex !== -1) {
        document.getElementById('out-section').textContent = SECTIONS[selectedIndex] + ' mm²';
        document.getElementById('out-iz').textContent = Iz.toFixed(1) + ' A';
        document.getElementById('out-vdrop').textContent = vDropPct.toFixed(2) + ' %';
        document.getElementById('out-vdrop').className = vDropPct > 4.0 ? 'text-lg font-mono font-semibold text-rose-500' : 'text-lg font-mono font-semibold text-amber-400';
    } else {
        document.getElementById('out-section').textContent = '> 150 mm²';
        document.getElementById('out-iz').textContent = 'Fuori Scala';
        document.getElementById('out-vdrop').textContent = '-';
    }
}

// ==========================================
// EVENT LISTENERS (Reactive UI)
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
    if (window.lucide) window.lucide.createIcons();
    
    // Ricalcolo automatico ad ogni modifica degli input
    const inputs = document.querySelectorAll('.form-input');
    inputs.forEach(input => {
        input.addEventListener('input', calculateLine);
        input.addEventListener('change', calculateLine);
    });

    // Calcolo Iniziale
    calculateLine();
});