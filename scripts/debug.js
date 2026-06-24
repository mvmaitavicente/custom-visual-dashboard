// Simple local debug script to simulate GroupService logic
function normalize(value){
    return String(value ?? "")
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9\s]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .toUpperCase();
}

function isCas(tipo){
    const v = normalize(tipo);
    return v.includes('CAS') && !v.includes('LOCADOR');
}

function isLocador(tipo){
    const v = normalize(tipo);
    return v.includes('LOCADOR');
}

function isLocadorGeneral(tipo){
    const v = normalize(tipo);
    return v.includes('LOCADOR') && (v.includes('GENERAL') || (!v.includes('ESPECIALIZADO') && v.includes('LOCADOR')));
}

function isEspecializado(tipo){
    const v = normalize(tipo);
    return v.includes('ESPECIALIZADO');
}

function distinctCount(rows){
    const keys = rows.map(r => String(r.documento || r.nombre || '').trim()).filter(Boolean);
    if(keys.length === 0) return rows.length;
    return new Set(keys).size;
}

const rows = [
    { TIPO_PERSONAL: 'LOCADOR', NRO_DOCUMENTO: '10729172028', nombre: 'A' },
    { TIPO_PERSONAL: 'CAS', NRO_DOCUMENTO: '47883199', nombre: 'B' },
    { TIPO_PERSONAL: 'LOCADOR ESPECIALIZADO', NRO_DOCUMENTO: '10455870581', nombre: 'C' }
];

// Map to expected row shape (tipoPersonal, documento)
const mapped = rows.map(r => ({ tipoPersonal: r.TIPO_PERSONAL, documento: r.NRO_DOCUMENTO, nombre: r.nombre }));

const totals = {
    totalPersonal: distinctCount(mapped.filter(r => isCas(r.tipoPersonal) || isLocador(r.tipoPersonal))),
    totalCas: distinctCount(mapped.filter(r => isCas(r.tipoPersonal))),
    totalLocadores: distinctCount(mapped.filter(r => isLocador(r.tipoPersonal))),
    totalGenerales: distinctCount(mapped.filter(r => isLocadorGeneral(r.tipoPersonal))),
    totalEspecializados: distinctCount(mapped.filter(r => isEspecializado(r.tipoPersonal)))
};

console.log('mapped rows:', mapped);
console.log('isCas flags:', mapped.map(r=>isCas(r.tipoPersonal)));
console.log('isLocador flags:', mapped.map(r=>isLocador(r.tipoPersonal)));
console.log('isLocadorGeneral flags:', mapped.map(r=>isLocadorGeneral(r.tipoPersonal)));
console.log('isEspecializado flags:', mapped.map(r=>isEspecializado(r.tipoPersonal)));
console.log('totals:', totals);
console.log('totalPersonal should equal CAS + LOCADORES distinct? totalCas + totalLocadores:', totals.totalCas, '+', totals.totalLocadores, '=', totals.totalCas + totals.totalLocadores);
