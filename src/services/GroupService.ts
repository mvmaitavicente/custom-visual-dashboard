import { GroupRow, Mode } from "../models/GroupRow";
import { RowData } from "../models/RowData";

export class GroupService {
    public static isCas(r: RowData): boolean {
        const v = this.normalize(r.tipoPersonal);
        return v.includes("CAS") && !v.includes("LOCADOR");
    }

    public static isLocador(r: RowData): boolean {
        const v = this.normalize(r.tipoPersonal);
        return v.includes("LOCADOR");
    }

    public static isLocadorGeneral(r: RowData): boolean {
        const v = this.normalize(r.tipoPersonal);
        return v.includes("LOCADOR") && (v.includes("GENERAL") || (!v.includes("ESPECIALIZADO") && v.includes("LOCADOR")));
    }

    public static isEspecializado(r: RowData): boolean {
        const v = this.normalize(r.tipoPersonal);
        return v.includes("ESPECIALIZADO");
    }

    public static distinctCount(rows: RowData[]): number {
        const keys = rows.map(r => (r.documento || r.nombre || "").toString().trim()).filter(Boolean);
        if (keys.length === 0) return rows.length;
        return new Set(keys).size;
    }

    public static sumMonto(rows: RowData[]): number {
        return rows.reduce((acc, r) => acc + (r.monto || 0), 0);
    }

    public static buildGroups(rows: RowData[], mode: Mode): GroupRow[] {
        const map = new Map<string, GroupRow>();

        rows.forEach(r => {
            const id = mode === "area"
                ? `AREA|${r.area}`
                : this.isCas(r)
                    ? `CAS|${r.cargo}`
                    : this.isLocador(r)
                        ? `LOCADOR|${this.isEspecializado(r) ? "Especializado" : r.profesion}`
                        : "";

            if (!id) return;

            const label = mode === "area"
                ? r.area
                : this.isCas(r)
                    ? r.cargo
                    : this.isEspecializado(r)
                        ? "Locador Especializado"
                        : r.profesion;

            const source = mode === "area"
                ? "Área"
                : this.isCas(r)
                    ? "CAS por cargo"
                    : "Locador por profesión";

            if (!map.has(id)) {
                map.set(id, {
                    id,
                    label,
                    source,
                    casRows: [],
                    locadorRows: [],
                    generalRows: [],
                    especializadoRows: [],
                    casCount: 0,
                    locadorTotalCount: 0,
                    locadorGeneralCount: 0,
                    locadorEspecializadoCount: 0,
                    totalCount: 0,
                    locadorTotalMonto: 0,
                    locadorGeneralMonto: 0,
                    locadorEspecializadoMonto: 0,
                    totalMonto: 0
                });
            }

            const g = map.get(id)!;
            if (this.isCas(r)) g.casRows.push(r);
            if (this.isLocador(r)) g.locadorRows.push(r);
            if (this.isLocadorGeneral(r)) g.generalRows.push(r);
            if (this.isEspecializado(r)) g.especializadoRows.push(r);
        });

        map.forEach(g => {
            g.casCount = this.distinctCount(g.casRows);
            g.locadorTotalCount = this.distinctCount(g.locadorRows);
            g.locadorGeneralCount = this.distinctCount(g.generalRows);
            g.locadorEspecializadoCount = this.distinctCount(g.especializadoRows);
            g.totalCount = g.casCount + g.locadorTotalCount;
            g.locadorTotalMonto = this.sumMonto(g.locadorRows);
            g.locadorGeneralMonto = this.sumMonto(g.generalRows);
            g.locadorEspecializadoMonto = this.sumMonto(g.especializadoRows);
            g.totalMonto = g.locadorTotalMonto;
        });

        return Array.from(map.values()).sort((a, b) => b.totalCount - a.totalCount);
    }

    private static clean(value: string): string {
        return String(value ?? "").trim().toUpperCase();
    }

    private static normalize(value: string): string {
        return String(value ?? "")
            .toLowerCase()
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .replace(/[^a-z0-9\s]/g, " ")
            .replace(/\s+/g, " ")
            .trim()
            .toUpperCase();
    }
}
