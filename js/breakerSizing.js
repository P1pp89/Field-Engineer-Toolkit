const STANDARD_RATINGS_IN = [6, 10, 13, 16, 20, 25, 32, 40, 50, 63, 80, 100, 125];
const STANDARD_ICU_KA = [4.5, 6, 10, 15, 25, 36, 50];

export function calculateBreaker(params) {
    const { Ib, Iz, Ikc, loadType } = params;

    let selectedIn = STANDARD_RATINGS_IN.find(In => In >= Ib && In <= Iz);
    
    if (!selectedIn) {
        selectedIn = STANDARD_RATINGS_IN.find(In => In >= Ib) || null;
    }

    let curve = 'C';
    if (loadType === 'motor') curve = 'D';
    if (loadType === 'sensitive') curve = 'B';

    const selectedIcu = STANDARD_ICU_KA.find(icu => icu >= Ikc) || 50;

    const rule1 = selectedIn ? (Ib <= selectedIn && selectedIn <= Iz) : false;
    const I2 = selectedIn ? 1.45 * selectedIn : 0;
    const rule2 = selectedIn ? (I2 <= 1.45 * Iz) : false;
    const rule3 = selectedIcu >= Ikc;

    const isValid = rule1 && rule2 && rule3;

    return {
        In: selectedIn ? `${selectedIn}` : 'Fuori Scala',
        curve: curve,
        Icu: selectedIcu.toString(),
        rule1: { ok: rule1, text: `${Ib}A <= ${selectedIn \vert{}\vert{} '?'}A <=${Iz}A` },
        rule2: { ok: rule2, text: `${I2.toFixed(1)}A <=${(1.45 * Iz).toFixed(1)}A` },
        rule3: { ok: rule3, text: `${selectedIcu}kA >=${Ikc}kA` },
        isValid: isValid
    };
}