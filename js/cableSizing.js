const RESISTIVITY = {
    Cu: 0.0178,
    Al: 0.0282
};

const AMPACITY_TABLE = {
    1.5:  { PVC: 14.5, EPR: 17.5 },
    2.5:  { PVC: 19.5, EPR: 24.0 },
    4:    { PVC: 26.0, EPR: 32.0 },
    6:    { PVC: 34.0, EPR: 41.0 },
    10:   { PVC: 46.0, EPR: 57.0 },
    16:   { PVC: 61.0, EPR: 76.0 },
    25:   { PVC: 80.0, EPR: 96.0 },
    35:   { PVC: 99.0, EPR: 119.0 },
    50:   { PVC: 119.0, EPR: 144.0 },
    70:   { PVC: 151.0, EPR: 184.0 },
    95:   { PVC: 182.0, EPR: 223.0 },
    120:  { PVC: 210.0, EPR: 259.0 },
    150:  { PVC: 240.0, EPR: 299.0 },
    185:  { PVC: 273.0, EPR: 341.0 },
    240:  { PVC: 321.0, EPR: 403.0 }
};

const STANDARD_SECTIONS = [1.5, 2.5, 4, 6, 10, 16, 25, 35, 50, 70, 95, 120, 150, 185, 240];

export function calculateCable(params) {
    const { system, powerkW, cosphi, length, maxVDropPercent, material, insulation, k1, k2 } = params;

    const Un = system === '3PH' ? 400 : 230;
    const P = powerkW * 1000;

    let Ib = 0;
    if (system === '3PH') {
        Ib = P / (Math.sqrt(3) * Un * cosphi);
    } else {
        Ib = P / (Un * cosphi);
    }

    let selectedSection = null;
    let IzTab = 0;
    let IzCorr = 0;
    let vDropVolts = 0;
    let vDropPercent = 0;

    const rho = RESISTIVITY[material];

    for (const section of STANDARD_SECTIONS) {
        if (material === 'Al' && section < 16) continue;

        const baseAmpacity = AMPACITY_TABLE[section][insulation];
        const matFactor = material === 'Al' ? 0.78 : 1.0;
        const izCheck = baseAmpacity * k1 * k2 * matFactor;

        if (izCheck < Ib) continue;

        let vDrop = 0;
        if (system === '3PH') {
            vDrop = (Math.sqrt(3) * length * Ib * cosphi * rho) / section;
        } else {
            vDrop = (2 * length * Ib * cosphi * rho) / section;
        }
        
        const vDropPct = (vDrop / Un) * 100;

        if (vDropPct <= maxVDropPercent) {
            selectedSection = section;
            IzTab = baseAmpacity * matFactor;
            IzCorr = izCheck;
            vDropVolts = vDrop;
            vDropPercent = vDropPct;
            break;
        }
    }

    return {
        Ib: Ib.toFixed(2),
        selectedSection: selectedSection ? selectedSection : 'N/A (>240mm²)',
        IzTab: IzTab.toFixed(1),
        IzCorr: IzCorr.toFixed(1),
        vDropVolts: vDropVolts.toFixed(2),
        vDropPercent: vDropPercent.toFixed(2),
        isSuccess: selectedSection !== null
    };
}