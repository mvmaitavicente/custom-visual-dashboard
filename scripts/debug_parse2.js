// Run the same simulation reading the updated parse logic by requiring the TS file is not trivial here, so copy the relevant logic inline
function text(v){return String(v ?? '').trim();}
function normalizeDisplay(v){return String(v||'').toLowerCase();}

function parseSim(dataView){
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
    const idx = { documento: getIndex('documento'), tipoPersonal: getIndex('tipoPersonal') };
    if(idx.documento<0) idx.documento = findIndexByNames(['documento','nro_documento','nro documento','dni','id']);
    if(idx.tipoPersonal<0) idx.tipoPersonal = findIndexByNames(['tipo personal','tipo_personal','tipo','personal']);
    if(idx.documento<0){
        idx.documento = columns.findIndex(c=>{const dn=String(c.displayName||'').toUpperCase(); return dn==='NRO_DOCUMENTO'||dn==='NRO DOCUMENTO'||dn==='DOCUMENTO'||dn==='NRODOCUMENTO';});
    }
    if(idx.tipoPersonal<0){
        idx.tipoPersonal = columns.findIndex(c=>{const dn=String(c.displayName||'').toUpperCase(); return dn==='TIPO_PERSONAL'||dn==='TIPO PERSONAL';});
    }
    if(idx.documento<0){
        idx.documento = columns.findIndex(c=>{const s=String(c.displayName||'').toLowerCase(); return /doc|document|number|nro|dni|id/.test(s);});
    }
    if(idx.tipoPersonal<0){
        idx.tipoPersonal = columns.findIndex(c=>{const s=String(c.displayName||'').toLowerCase(); return /tipo|personal|type|person|role/.test(s);});
    }

    const rows = dataView.table.rows.map(r=>({documento: text(idx.documento>=0? r[idx.documento] : ''), tipoPersonal: text(idx.tipoPersonal>=0? r[idx.tipoPersonal] : '')||'Sin tipo'}));
    return {idx, rows};
}

function normalizeTipo(v){return String(v||'').toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu,'').replace(/[^a-z0-9\s]/g,' ').replace(/\s+/g,' ').trim().toUpperCase();}
function isCas(v){const n=normalizeTipo(v); return n.includes('CAS') && !n.includes('LOCADOR');}
function isLocador(v){const n=normalizeTipo(v); return n.includes('LOCADOR');}
function distinct(arr){const ids=arr.map((r,i)=>r.documento||('ROW'+i)).filter(Boolean); return ids.length===0?arr.length:new Set(ids).size}

const baseRows = [ ['LOCADOR','10729172028'], ['CAS','47883199'], ['LOCADOR ESPECIALIZADO','10455870581'] ];
const schemas = [
    {name:'no-roles-different-names', columns:[{displayName:'Document Number'},{displayName:'Type of Person'}], rows: baseRows.map(r=>[r[1], r[0]])},
    {name:'portuguese-like', columns:[{displayName:'NUM_DOCUMENTO'},{displayName:'TIPO_PESSOA'}], rows: baseRows.map(r=>[r[1], r[0]])}
];
for(const s of schemas){
    const dv={table:{columns:s.columns, rows:s.rows}};
    const out=parseSim(dv);
    const totals = {totalPersonal: distinct(out.rows.filter(r=>isCas(r.tipoPersonal)||isLocador(r.tipoPersonal))), totalCas: distinct(out.rows.filter(r=>isCas(r.tipoPersonal))), totalLocadores: distinct(out.rows.filter(r=>isLocador(r.tipoPersonal)))};
    console.log('---',s.name,'---');
    console.log('idx',out.idx);
    console.log('rows',out.rows);
    console.log('totals',totals);
}
