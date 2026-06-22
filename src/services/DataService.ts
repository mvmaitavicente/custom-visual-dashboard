import powerbi from "powerbi-visuals-api";
import DataView = powerbi.DataView;
import { RowData } from "../models/RowData";
import { text, toNumber } from "../utils/format";

export class DataService {
    public static parse(dataView: DataView): RowData[] {
        const columns = dataView.table.columns;

        const getIndex = (role: string): number =>
            columns.findIndex(c => c.roles && c.roles[role]);

        const idx = {
            documento: getIndex("documento"),
            tipoPersonal: getIndex("tipoPersonal"),
            area: getIndex("area"),
            cargo: getIndex("cargo"),
            profesion: getIndex("profesion"),
            nombre: getIndex("nombre"),
            unidadOrganica: getIndex("unidadOrganica"),
            monto: getIndex("monto")
        };

        return dataView.table.rows.map(r => ({
            documento: text(idx.documento >= 0 ? r[idx.documento] : ""),
            tipoPersonal: text(idx.tipoPersonal >= 0 ? r[idx.tipoPersonal] : ""),
            area: text(idx.area >= 0 ? r[idx.area] : "") || "Sin área",
            cargo: text(idx.cargo >= 0 ? r[idx.cargo] : "") || "Sin cargo",
            profesion: text(idx.profesion >= 0 ? r[idx.profesion] : "") || "Sin profesión",
            nombre: text(idx.nombre >= 0 ? r[idx.nombre] : "") || "Sin nombre",
            unidadOrganica: text(idx.unidadOrganica >= 0 ? r[idx.unidadOrganica] : ""),
            monto: toNumber(idx.monto >= 0 ? r[idx.monto] : 0)
        }));
    }
}