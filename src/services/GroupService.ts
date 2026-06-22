import { GroupRow, Mode } from "../models/GroupRow";
import { RowData } from "../models/RowData";

export class GroupService {
    public static isCas(r: RowData): boolean {
        return this.clean(r.tipoPersonal) === "CAS";
    }

    public static isLocador(r: RowData): boolean {
        const v = this.clean(r.tipoPersonal);
        return v === "LOCADOR" || v === "LOCADOR ESPECIALIZADO";
    }

    public static isLocadorGeneral(r: RowData): boolean {
        return this.clean(r.tipoPersonal) === "LOCADOR";
    }

    public static isEspecializado(r: RowData): boolean {
        return this.clean(r.tipoPersonal) === "LOCADOR ESPECIALIZADO";
    }

    public static distinctCount(rows: RowData[]): number {
        return new Set(rows.map(r => r.documento || r.nombre)).size;
    }

    public static sumMonto(rows: RowData[]): number {
        return rows.reduce((acc, r) => acc + (r.monto || 0), 0);
    }

    public static buildGroups(rows: RowData[], mode: Mode): GroupRow[] {
        const map = new Map<string, GroupRow>();

        rows.forEach(r => {
            if (mode === "profesionCargo" && this.isEspecializado(r)) {
                return;
            }

            const id =
                mode === "area"
                    ? `AREA|${r.area}`
                    : this.isCas(r)
                        ? `CAS|${r.cargo}`
                        : this.isLocadorGeneral(r)
                            ? `LOCADOR|${r.profesion}`
                            : "";

            if (!id) return;

            const label =
                mode === "area"
                    ? r.area
                    : this.isCas(r)
                        ? r.cargo
                        : r.profesion;

            const source =
                mode === "area"
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
                    locadorTotalMonto: 0,
                    locadorGeneralMonto: 0,
                    locadorEspecializadoMonto: 0
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

            g.locadorTotalMonto = this.sumMonto(g.locadorRows);
            g.locadorGeneralMonto = this.sumMonto(g.generalRows);
            g.locadorEspecializadoMonto = this.sumMonto(g.especializadoRows);
        });

        return Array.from(map.values()).sort((a, b) =>
            (b.casCount + b.locadorTotalCount) - (a.casCount + a.locadorTotalCount)
        );
    }

    private static clean(value: string): string {
        return String(value ?? "").trim().toUpperCase();
    }
}