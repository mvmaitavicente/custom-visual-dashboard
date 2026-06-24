// Simulate DataService.parse + GroupService behavior for different column schemas
function text(v){return String(v ?? '').trim();}
function toNumber(v){const n=Number(String(v||'').replace(/S\/\.?/gi,'').replace(/,/g,'').replace(/\s/g,'').trim());return Number.isFinite(n)?n:0}

function isUnidadOrgLabel(label){
    const normalized = String(label||'').toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu,'').replace(/\s+/g,' ').trim();
    return normalized.includes('unidad org') || normalized.includes('unidad organica') || normalized.includes('unidad organiz');
}

function parse(dataView){
    const columns = dataView.table.columns;
    const getIndex = role => columns.findIndex(c => c.roles && c.roles[role]);
    const findIndexByNames = names => {
        const n = names.map(x=>x.toLowerCase());
        return columns.findIndex(c=>{
            const dn = String(c.displayName||'').toLowerCase();
            if(n.some(s=>dn.includes(s))) return true;
            const source = Object.keys(c.roles||{})[0]||'';
            if(n.some(s=>source.toLowerCase().includes(s))) return true;
            return false;
        });
    };

    const idx = {
        documento: getIndex('documento'),
        tipoPersonal: getIndex('tipoPersonal'),
        area: getIndex('area'),
        equipoTrabajo: getIndex('equipoTrabajo'),
        cargo: getIndex('cargo'),
        profesion: getIndex('profesion'),
        nombre: getIndex('nombre'),
        monto: getIndex('monto'),
        fechaInicio: getIndex('fechaInicio'),
        fechaFin: getIndex('fechaFin'),
        anioIngreso: getIndex('anioIngreso'),
        tipoDocumento: getIndex('tipoDocumento'),
        tipoContratacion: getIndex('tipoContratacion'),
        fechaOrden: getIndex('fechaOrden'),
        vigenciaContrato: getIndex('vigenciaContrato'),
        nroOs: getIndex('nroOs'),
        armada: getIndex('armada'),
        montoOrden: getIndex('montoOrden'),
        situacionActualLicencia: getIndex('situacionActualLicencia'),
        tituloProfesional: getIndex('tituloProfesional'),
        maestriaDoctorado: getIndex('maestriaDoctorado'),
        diplomados: getIndex('diplomados'),
        cursos: getIndex('cursos'),
        nivel: getIndex('nivel'),
        experienciaGeneral: getIndex('experienciaGeneral'),
        experienciaEspecifica: getIndex('experienciaEspecifica'),
        objetoContratacion: getIndex('objetoContratacion'),
        actividadRelevante: getIndex('actividadRelevante'),
        observacion: getIndex('observacion')
    };
    if(idx.documento <0) idx.documento = findIndexByNames(['documento','nro_documento','nro documento','dni','id']);
    if(idx.tipoPersonal <0) idx.tipoPersonal = findIndexByNames(['tipo personal','tipo_personal','tipo','personal']);
    if(idx.documento<0){
        idx.documento = columns.findIndex(c=>{
            const dn=String(c.displayName||'').toUpperCase();
            return dn==='NRO_DOCUMENTO'||dn==='NRO DOCUMENTO'||dn==='DOCUMENTO'||dn==='NRODOCUMENTO';
        });
    }
    if(idx.tipoPersonal<0){
        idx.tipoPersonal = columns.findIndex(c=>{
            const dn=String(c.displayName||'').toUpperCase();
            return dn==='TIPO_PERSONAL'||dn==='TIPO PERSONAL';
        });
    }

    const rows = dataView.table.rows.map(r=>{
        const row = {
            documento: text(idx.documento>=0 ? r[idx.documento] : ''),
            tipoPersonal: text(idx.tipoPersonal>=0 ? r[idx.tipoPersonal] : '') || 'Sin tipo'
        };
        return row;
    });
    return {rows, idx};
}

function normalizeTipo(v){return String(v||'').toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu,'').replace(/[^a-z0-9\s]/g,' ').replace(/\s+/g,' ').trim().toUpperCase();}
function isCas(v){const n=normalizeTipo(v); return n.includes('CAS') && !n.includes('LOCADOR');}
function isLocador(v){const n=normalizeTipo(v); return n.includes('LOCADOR');}

function totalsFromRows(rows){
    const cas = rows.filter(r=>isCas(r.tipoPersonal));
    const loc = rows.filter(r=>isLocador(r.tipoPersonal));
    const distinct = arr=>{const ids=arr.map((r,i)=>r.documento||('ROW'+i)).filter(Boolean); return ids.length===0?arr.length:new Set(ids).size};
    return {totalPersonal: distinct(rows.filter(r=>isCas(r.tipoPersonal)||isLocador(r.tipoPersonal))), totalCas: distinct(cas), totalLocadores: distinct(loc)};
}

// Test cases
const baseRows = [ ['LOCADOR','10729172028'], ['CAS','47883199'], ['LOCADOR ESPECIALIZADO','10455870581'] ];

const schemas = [
    {name:'roles-mapped', columns:[{displayName:'Documento', roles:{documento:true}},{displayName:'Tipo Personal', roles:{tipoPersonal:true}}], rows: baseRows.map(r=>[r[1], r[0]])},
    {name:'displayname-uppercase_underscore', columns:[{displayName:'NRO_DOCUMENTO'},{displayName:'TIPO_PERSONAL'}], rows: baseRows.map(r=>[r[1], r[0]])},
    {name:'displayname-lower-nospecial', columns:[{displayName:'nro_documento'},{displayName:'tipo_personal'}], rows: baseRows.map(r=>[r[1], r[0]])},
    {name:'swapped-order', columns:[{displayName:'TIPO_PERSONAL'},{displayName:'NRO_DOCUMENTO'}], rows: baseRows.map(r=>[r[0], r[1]])},
    {name:'no-roles-different-names', columns:[{displayName:'Document Number'},{displayName:'Type of Person'}], rows: baseRows.map(r=>[r[1], r[0]])}
];

for(const s of schemas){
    const dataView = {table:{columns:s.columns, rows:s.rows}};
    const out = parse(dataView);
    const t = totalsFromRows(out.rows);
    console.log('---',s.name,'---');
    console.log('idx documento,tipoPersonal =>', out.idx.documento, out.idx.tipoPersonal);
    console.log('parsed rows', out.rows);
    console.log('totals', t);
}
