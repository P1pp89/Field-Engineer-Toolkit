// ==========================================
// CORE 1: CABLE SIZING (Tabellare + Vincolo Cdt)
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
// CORE 3: SCHEMA UNIFILARE STATE (TREE)
// ==========================================
let unifilareNodes = [
    { id: 'node_1', name: 'Quadro Generale', in: 100, devType: 'MT', curve: 'C', parentId: '' },
    { id: 'node_2', name: 'Linea FM Officina', in: 32, devType: 'MTR', curve: 'C', parentId: 'node_1' },
    { id: 'node_3', name: 'Linea Luci Reparto', in: 16, devType: 'MT', curve: 'B', parentId: 'node_1' }
];

if (window.mermaid) {
    mermaid.initialize({ startOnLoad: false, theme: 'dark', securityLevel: 'loose' });
}

// ==========================================
// DOM INTERACTION & EVENT LISTENERS
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
    if (window.lucide) window.lucide.createIcons();

    // -- NAVIGAZIONE TAB (4 MODULI) --
    const navCableBtn = document.getElementById('nav-cable');
    const navBreakerBtn = document.getElementById('nav-breaker');
    const navFaultBtn = document.getElementById('nav-fault');
    const navDiagramBtn = document.getElementById('nav-diagram');
    
    const moduleCable = document.getElementById('module-cable');
    const moduleBreaker = document.getElementById('module-breaker');
    const moduleFault = document.getElementById('module-fault');
    const moduleDiagram = document.getElementById('module-diagram');

    function switchTab(target) {
        [navCableBtn, navBreakerBtn, navFaultBtn, navDiagramBtn].forEach(btn => {
            btn.className = "nav-btn flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors text-slate-400 hover:text-slate-200";
        });
        [moduleCable, moduleBreaker, moduleFault, moduleDiagram].forEach(mod => mod.classList.add('hidden'));

        if (target === 'cable') {
            navCableBtn.className = "nav-btn active flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors bg-sky-600/20 text-sky-400 border border-sky-500/30";
            moduleCable.classList.remove('hidden');
        } else if (target === 'breaker') {
            navBreakerBtn.className = "nav-btn active flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors bg-sky-600/20 text-sky-400 border border-sky-500/30";
            moduleBreaker.classList.remove('hidden');
        } else if (target === 'fault') {
            navFaultBtn.className = "nav-btn active flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors bg-sky-600/20 text-sky-400 border border-sky-500/30";
            moduleFault.classList.remove('hidden');
            document.getElementById('fault-form').dispatchEvent(new Event('submit'));
        } else if (target === 'diagram') {
            navDiagramBtn.className = "nav-btn active flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors bg-sky-600/20 text-sky-400 border border-sky-500/30";
            moduleDiagram.classList.remove('hidden');
            renderUnifilare();
        }
    }

    navCableBtn.addEventListener('click', () => switchTab('cable'));
    navBreakerBtn.addEventListener('click', () => switchTab('breaker'));
    navFaultBtn.addEventListener('click', () => switchTab('fault'));
    navDiagramBtn.addEventListener('click', () => switchTab('diagram'));

    // -- HELPER IKC INTERRUTTORE --
    document.getElementById('b-ikc-helper').addEventListener('change', (e) => {
        if (e.target.value) {
            document.getElementById('b-ikc').value = e.target.value;
            document.getElementById('breaker-form').dispatchEvent(new Event('submit'));
        }
    });

    // -- FORM CAVO (SINCRIZZA ANCHE L'ANELLO DI GUASTO) --
    document.getElementById('cable-form').addEventListener('submit', (e) => {
        e.preventDefault();
        const powerKw = parseFloat(document.getElementById('c-power').value) || 0;
        const voltage = parseInt(document.getElementById('c-system').value) || 400;
        const cableType = document.getElementById('c-type').value;
        const installation = document.getElementById('c-installation').value;
        const length = parseFloat(document.getElementById('c-length').value) || 1;
        const cosphi = parseFloat(document.getElementById('c-cosphi').value) || 0.9;
        let requestedVDrop = parseFloat(document.getElementById('c-max-vdrop').value) || 4.0;
        const maxVDrop = Math.min(requestedVDrop, 4.0);

        const P = powerKw * 1000;
        const Ib = voltage === 400 ? P / (Math.sqrt(3) * voltage * cosphi) : P / (voltage * cosphi);

        const material = cableType.split('-')[0];
        const tableRef = material === 'Al' ? 'Cu-EPR' : cableType; 
        const izArray = AMPACITY_TABLES[tableRef][installation];
        const rho = RESISTIVITY[material];
        
        let selectedIndex = -1, Iz = 0, finalVDropPct = 0;

        for (let i = 0; i < SECTIONS.length; i++) {
            if (material === 'Al' && SECTIONS[i] < 16) continue;
            const currentIz = material === 'Al' ? izArray[i] * 0.78 : izArray[i];
            
            if (currentIz >= Ib) {
                const S = SECTIONS[i];
                const currentVDrop = voltage === 400 ? (Math.sqrt(3) * length * Ib * cosphi * rho) / S : (2 * length * Ib * cosphi * rho) / S;
                const currentVDropPct = (currentVDrop / voltage) * 100;
                
                if (currentVDropPct <= maxVDrop) {
                    selectedIndex = i; Iz = currentIz; finalVDropPct = currentVDropPct; break;
                }
            }
        }

        document.getElementById('out-ib').textContent = Ib.toFixed(1) + ' A';
        const statusBox = document.getElementById('cable-status-box');

        if (selectedIndex !== -1) {
            const sectionVal = SECTIONS[selectedIndex];
            document.getElementById('out-section').textContent = sectionVal + ' mm²';
            document.getElementById('out-iz').textContent = Iz.toFixed(1) + ' A';
            document.getElementById('out-vdrop').textContent = finalVDropPct.toFixed(2) + ' %';
            statusBox.className = "mt-6 p-3 rounded border bg-emerald-900/30 border-emerald-800 text-emerald-400 text-xs";
            statusBox.innerHTML = `✓ Sezione commerciale trovata (&Delta;U &le; ${maxVDrop}%).`;

            // SYNC INTERRUTTORE
            document.getElementById('b-ib').value = Ib.toFixed(1);
            document.getElementById('b-iz').value = Iz.toFixed(1);
            document.getElementById('breaker-form').dispatchEvent(new Event('submit'));

            // SYNC ANELLO DI GUASTO (Z_s)
            document.getElementById('f-length').value = length;
            document.getElementById('f-section').value = sectionVal;
            const computedIn = STANDARD_IN.find(In => In >= Ib && In <= Iz) || STANDARD_IN.find(In => In >= Ib) || 16;
            document.getElementById('f-in').value = computedIn;
            const loadTypeVal = document.getElementById('b-loadtype').value;
            const curveVal = loadTypeVal === 'motor' ? 'D' : (loadTypeVal === 'sensitive' ? 'B' : 'C');
            document.getElementById('f-curve').value = curveVal;

            document.getElementById('fault-form').dispatchEvent(new Event('submit'));
        } else {
            document.getElementById('out-section').textContent = '> 150 mm²';
            document.getElementById('out-iz').textContent = 'O.R.';
            document.getElementById('out-vdrop').textContent = '-';
            statusBox.className = "mt-6 p-3 rounded border bg-rose-900/30 border-rose-800 text-rose-400 text-xs";
            statusBox.innerHTML = `⚠ Parametri fuori limite per singola corda.`;
        }
    });

    // -- FORM INTERRUTTORE --
    document.getElementById('breaker-form').addEventListener('submit', (e) => {
        e.preventDefault();
        const Ib = parseFloat(document.getElementById('b-ib').value) || 0;
        const Iz = parseFloat(document.getElementById('b-iz').value) || 0;
        const Ikc = parseFloat(document.getElementById('b-ikc').value) || 6.0;
        const deviceType = document.getElementById('b-device-type').value;
        const loadType = document.getElementById('b-loadtype').value;

        let selectedIn = STANDARD_IN.find(In => In >= Ib && In <= Iz) || STANDARD_IN.find(In => In >= Ib) || null;
        let curve = loadType === 'motor' ? 'D' : (loadType === 'sensitive' ? 'B' : 'C');
        const selectedIcu = STANDARD_ICU.find(icu => icu >= Ikc) || 70;

        const rule1 = selectedIn ? (Ib <= selectedIn && selectedIn <= Iz) : false;
        const rule2 = selectedIn ? ((1.45 * selectedIn) <= (1.45 * Iz)) : false; 
        const rule3 = selectedIcu >= Ikc;

        let typeLabel = deviceType === 'MTR' ? 'Mag-Diff' : (deviceType === 'DIFF' ? 'Diff. Puro' : (deviceType === 'MAG' ? 'Solo Mag.' : 'Magnetotermico'));

        document.getElementById('out-in').textContent = selectedIn ? `${selectedIn} A` : 'O.R.';
        document.getElementById('out-curve').textContent = `${typeLabel} (${curve})`;
        document.getElementById('out-icu').textContent = `${selectedIcu} kA`;

        const updateCheck = (cId, vId, isOk, text) => {
            document.getElementById(vId).textContent = text;
            document.getElementById(cId).className = isOk 
                ? "p-3 bg-emerald-950/30 rounded border border-emerald-800/60 flex justify-between text-emerald-400" 
                : "p-3 bg-rose-950/30 rounded border border-rose-800/60 flex justify-between text-rose-400";
        };

        updateCheck('check-rule1', 'val-rule1', rule1, `${Ib.toFixed(1)}A &le; ${selectedIn||'?'}A &le; ${Iz.toFixed(1)}A`);
        updateCheck('check-rule2', 'val-rule2', rule2, `Ok`);
        updateCheck('check-rule3', 'val-rule3', rule3, `${selectedIcu}kA &ge; ${Ikc}kA`);

        const statusBox = document.getElementById('breaker-status-box');
        if (rule1 && rule2 && rule3) {
            statusBox.className = "p-4 rounded-lg border mb-4 bg-emerald-950/40 border-emerald-800 text-emerald-300 text-sm";
            statusBox.innerHTML = `<strong>✓ Coordinamento Valido.</strong>`;
        } else {
            statusBox.className = "p-4 rounded-lg border mb-4 bg-amber-950/40 border-amber-800 text-amber-300 text-sm";
            statusBox.innerHTML = `<strong>⚠ Attenzione:</strong> Parametri normativi violati.`;
        }

        // AGGIORNA ANCHE IL MODULO ANELLO DI GUASTO SE CAMBIA LA PROTEZIONE
        document.getElementById('f-in').value = selectedIn || 16;
        document.getElementById('f-curve').value = curve;
        document.getElementById('fault-form').dispatchEvent(new Event('submit'));
    });

    // -- FORM ANELLO DI GUASTO (Zs) --
    document.getElementById('fault-form').addEventListener('submit', (e) => {
        e.preventDefault();
        const U0 = parseFloat(document.getElementById('f-u0').value) || 230;
        const L = parseFloat(document.getElementById('f-length').value) || 50;
        const S = parseFloat(document.getElementById('f-section').value) || 2.5;
        const In = parseFloat(document.getElementById('f-in').value) || 16;
        const curve = document.getElementById('f-curve').value;

        const curveMultipliers = { 'B': 5, 'C': 10, 'D': 20 };
        const IaMultiplier = curveMultipliers[curve] || 10;
        const Ia = In * IaMultiplier;

        const rho = RESISTIVITY['Cu'];
        const R = (2 * rho * L) / S; 
        const X = 0.00008 * L;      
        const Zs = Math.sqrt(R*R + X*X);
        const Id = U0 / Zs;
        const isVerified = Id >= Ia;

        document.getElementById('out-zs').textContent = Zs.toFixed(3) + ' Ω';
        document.getElementById('out-id').textContent = Id.toFixed(1) + ' A';
        document.getElementById('val-ia').textContent = Ia.toFixed(1) + ' A';
        document.getElementById('val-cond').textContent = (Zs * Ia).toFixed(1) + ' V (\u2264 ' + U0 + 'V)';

        const statusBox = document.getElementById('fault-status-box');
        if (isVerified) {
            statusBox.className = "p-4 rounded-lg border mb-4 bg-emerald-950/40 border-emerald-800 text-emerald-300 text-sm";
            statusBox.innerHTML = `<strong>✓ Protezione Garantita:</strong> La corrente di guasto (Id = ${Id.toFixed(1)}A) supera la soglia magnetica (Ia = ${Ia}A). Intervento &le; 0.4s.`;
        } else {
            statusBox.className = "p-4 rounded-lg border mb-4 bg-rose-950/40 border-rose-800 text-rose-300 text-sm";
            statusBox.innerHTML = `<strong>✕ Attenzione:</strong> Id insufficiente a garantire lo sgancio magnetico nei tempi prescritti. Aumentare la sezione del PE.`;
        }
    });

    // ==========================================
    // LOGICA MODULO 3: SCHEMA UNIFILARE
    // ==========================================
    const modal = document.getElementById('node-modal');
    const btnAddNode = document.getElementById('btn-add-node');
    const modalCancel = document.getElementById('modal-cancel');
    const nodeForm = document.getElementById('node-form');

    btnAddNode.addEventListener('click', (e) => {
        e.preventDefault();
        document.getElementById('modal-title').textContent = 'Aggiungi Dispositivo';
        document.getElementById('node-edit-id').value = '';
        document.getElementById('n-name').value = '';
        document.getElementById('n-in').value = '32';
        populateParentSelect();
        modal.classList.remove('hidden');
    });

    modalCancel.addEventListener('click', (e) => {
        e.preventDefault();
        modal.classList.add('hidden');
    });

    function populateParentSelect(excludeId = '') {
        const select = document.getElementById('n-parent');
        select.innerHTML = '<option value="">Nessuno (Radice / Generale)</option>';
        unifilareNodes.forEach(n => {
            if (n.id !== excludeId) {
                select.innerHTML += `<option value="${n.id}">${n.name} (${n.in}A)</option>`;
            }
        });
    }

    nodeForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const editId = document.getElementById('node-edit-id').value;
        const name = document.getElementById('n-name').value;
        const inVal = parseInt(document.getElementById('n-in').value);
        const devType = document.getElementById('n-devtype').value;
        const curve = document.getElementById('n-curve').value;
        const parentId = document.getElementById('n-parent').value;

        if (editId) {
            const node = unifilareNodes.find(n => n.id === editId);
            if (node) { node.name = name; node.in = inVal; node.devType = devType; node.curve = curve; node.parentId = parentId; }
        } else {
            const newNode = { id: 'node_' + Date.now(), name, in: inVal, devType, curve, parentId };
            unifilareNodes.push(newNode);
        }

        modal.classList.add('hidden');
        renderUnifilareList();
        renderUnifilare();
    });

    window.editNode = function(id) {
        const node = unifilareNodes.find(n => n.id === id);
        if (!node) return;
        document.getElementById('modal-title').textContent = 'Modifica Dispositivo';
        document.getElementById('node-edit-id').value = node.id;
        document.getElementById('n-name').value = node.name;
        document.getElementById('n-in').value = node.in;
        document.getElementById('n-devtype').value = node.devType || 'MT';
        document.getElementById('n-curve').value = node.curve;
        populateParentSelect(node.id);
        document.getElementById('n-parent').value = node.parentId;
        modal.classList.remove('hidden');
    };

    window.deleteNode = function(id) {
        unifilareNodes = unifilareNodes.filter(n => n.id !== id && n.parentId !== id);
        renderUnifilareList();
        renderUnifilare();
    };

    function renderUnifilareList() {
        const listContainer = document.getElementById('nodes-list');
        listContainer.innerHTML = '';
        if (unifilareNodes.length === 0) {
            listContainer.innerHTML = '<p class="text-xs text-slate-500 italic">Nessun dispositivo inserito.</p>';
            return;
        }

        unifilareNodes.forEach(node => {
            const parent = unifilareNodes.find(p => p.id === node.parentId);
            const parentName = parent ? parent.name : 'Alimentazione Principale';
            let labelType = node.devType === 'MTR' ? 'Mag-Diff' : (node.devType === 'DIFF' ? 'Diff. Puro' : (node.devType === 'MAG' ? 'Solo Mag.' : 'Magnetotermico'));

            listContainer.innerHTML += `
                <div class="bg-slate-900/60 border border-slate-700/60 p-3 rounded-lg flex items-center justify-between text-xs font-mono">
                    <div>
                        <strong class="text-white block font-sans">${node.name}</strong>
                        <span class="text-sky-400">In: ${node.in}A</span> | <span class="text-emerald-400">${labelType} (${node.curve})</span>
                        <div class="text-[10px] text-slate-500 font-sans mt-0.5">Monte: ${parentName}</div>
                    </div>
                    <div class="flex gap-1.5">
                        <button type="button" onclick="editNode('${node.id}')" class="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded"><i data-lucide="edit-2" class="w-3.5 h-3.5"></i></button>
                        <button type="button" onclick="deleteNode('${node.id}')" class="p-1.5 bg-rose-950/50 hover:bg-rose-900 text-rose-400 rounded"><i data-lucide="trash-2" class="w-3.5 h-3.5"></i></button>
                    </div>
                </div>
            `;
        });
        if (window.lucide) window.lucide.createIcons();
    }

    async function renderUnifilare() {
        let diagram = "graph TD\n";
        diagram += "classDef default fill:#0f172a,stroke:#334155,stroke-width:2px,color:#f8fafc;\n";
        diagram += "classDef root fill:#0c4a6e,stroke:#0284c7,stroke-width:2px,color:#f8fafc;\n";

        if (unifilareNodes.length === 0) {
            diagram += "empty[Nessun componente inserito]\n";
        } else {
            unifilareNodes.forEach(node => {
                let labelType = node.devType === 'MTR' ? 'Mag-Diff' : (node.devType === 'DIFF' ? 'Diff. Puro' : (node.devType === 'MAG' ? 'Solo Mag.' : 'MT'));
                let label = `${node.name}<br/><b>In: ${node.in}A</b><br/>(${labelType} - ${node.curve})`;
                diagram += `${node.id}["${label}"]\n`;
                if (!node.parentId) {
                    diagram += `class ${node.id} root;\n`;
                }
            });

            unifilareNodes.forEach(node => {
                if (node.parentId) {
                    diagram += `${node.parentId} --> ${node.id}\n`;
                }
            });
        }

        const container = document.getElementById('diagram-container');
        try {
            const id = 'mermaid_' + Date.now();
            const { svg } = await mermaid.render(id, diagram);
            container.innerHTML = svg;
        } catch (e) {
            container.innerHTML = `<span class="text-xs text-rose-400 font-mono">Errore di rendering dello schema.</span>`;
        }
    }

    renderUnifilareList();
    document.getElementById('cable-form').dispatchEvent(new Event('submit'));
});