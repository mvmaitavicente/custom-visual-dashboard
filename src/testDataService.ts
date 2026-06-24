import powerbi from "powerbi-visuals-api";
import DataView = powerbi.DataView;
import { DataService, DetailColumn } from "./services/DataService";

const sampleDataView: DataView = {
    table: {
        columns: [
            { displayName: "Tipo Personal", roles: { tipoPersonal: true } },
            { displayName: "Nro Documento", roles: { documento: true } },
            { displayName: "Nombres Completos", roles: { nombre: true } },
            { displayName: "Año Ingreso", roles: { anioIngreso: true } },
            { displayName: "Fecha Inicio OS", roles: { fechaInicio: true } },
            { displayName: "Fecha Fin OS", roles: { fechaFin: true } },
            { displayName: "S/.", roles: { monto: true } },
            { displayName: "Profesión", roles: { profesion: true } },
            { displayName: "Posgrado", roles: { tituloProfesional: true } },
            { displayName: "Diplomados", roles: { diplomados: true } },
            { displayName: "Cursos", roles: { cursos: true } },
            { displayName: "Actividad Relevante", roles: { actividadRelevante: true } },
            { displayName: "Observación", roles: { observacion: true } }
        ],
        rows: [
            ["LOCADOR GENERAL", "12345678", "Juan Pérez", "2018", "2023-01-01", "2023-12-31", 1000, "Ingeniero", "Maestría", "Diploma A", "Curso B", "Actividad X", "Obs 1"],
            ["CAS", "87654321", "María Ruiz", "2020", "2023-02-01", "2023-11-30", 0, "Auxiliar", "Postgrado", "Diploma B", "Curso C", "Actividad Y", "Obs 2"]
        ]
    }
} as unknown as DataView;

const rows = DataService.parse(sampleDataView);
const columns = DataService.getDetailColumns(sampleDataView);

console.log("rows:", rows);
console.log("detailColumns:", columns);

const expectedLabels = ["Tipo Personal","Nro Documento","Nombres Completos","Año Ingreso","Fecha Inicio OS","Fecha Fin OS","S/.","Profesión","Posgrado","Diplomados","Cursos","Actividad Relevante","Observación"];
console.log("expectedLabels:", expectedLabels);
console.log("actualLabels:", columns.map(c => c.label));
console.log("order matches:", expectedLabels.join("|") === columns.map(c => c.label).join("|"));
console.log("PERSONAL ACTIVO rows:", rows.filter(r => ["CAS","LOCADOR GENERAL","LOCADOR ESPECIALIZADO"].some(k => r.tipoPersonal?.toUpperCase().includes(k))).length);
