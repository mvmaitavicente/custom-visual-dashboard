import { RowData } from "../models/RowData";
import { escapeAttr } from "../utils/format";

export interface FilterState {
    tipoPersonal: string;
    area: string;
    equipoTrabajo: string;
    cargo: string;
    fechaInicio: string;
    fechaFin: string;
    anioIngreso: string;
}

export class FilterSection {
    public static empty(): FilterState {
        return {
            tipoPersonal: "",
            area: "",
            equipoTrabajo: "",
            cargo: "",
            fechaInicio: "",
            fechaFin: "",
            anioIngreso: ""
        };
    }

    public static apply(rows: RowData[], f: FilterState): RowData[] {
        return rows.filter(r =>
            (!f.tipoPersonal || r.tipoPersonal === f.tipoPersonal) &&
            (!f.area || r.area === f.area) &&
            (!f.equipoTrabajo || r.equipoTrabajo === f.equipoTrabajo) &&
            (!f.cargo || r.cargo === f.cargo) &&
            (!f.anioIngreso || r.anioIngreso === f.anioIngreso) &&
            (!f.fechaInicio || !r.fechaInicio || r.fechaInicio >= f.fechaInicio) &&
            (!f.fechaFin || !r.fechaFin || r.fechaFin <= f.fechaFin)
        );
    }

    public static render(rows: RowData[], f: FilterState): string {
        return `
            <section class="filters-bar">
                ${this.select("tipoPersonal", "Tipo Personal", this.distinct(rows, r => r.tipoPersonal), f.tipoPersonal, "Todos")}
                ${this.select("area", "Área", this.distinct(rows, r => r.area), f.area, "Todas")}
                ${this.select("equipoTrabajo", "Equipo Trabajo", this.distinct(rows, r => r.equipoTrabajo), f.equipoTrabajo, "Todos")}
                ${this.select("cargo", "Cargo", this.distinct(rows, r => r.cargo), f.cargo, "Todos")}
                ${this.date("fechaInicio", "Fecha Inicio", f.fechaInicio)}
                ${this.date("fechaFin", "Fecha Fin", f.fechaFin)}
                ${this.select("anioIngreso", "Año Ingreso", this.distinct(rows, r => r.anioIngreso), f.anioIngreso, "Todos")}
                <button class="clear-filters" id="clearFilters" title="Limpiar filtros">
                    <span class="filter-icon">⌯</span>
                    Limpiar filtros
                </button>
            </section>
        `;
    }

    private static distinct(rows: RowData[], getter: (r: RowData) => string): string[] {
        return Array.from(new Set(rows.map(getter).filter(v => v && !v.startsWith("Sin ")))).sort((a, b) => a.localeCompare(b));
    }

    private static select(id: keyof FilterState, label: string, values: string[], selected: string, allText: string): string {
        return `
            <label class="filter-item">
                <span>${label}</span>
                <select id="filter-${id}">
                    <option value="">${allText}</option>
                    ${values.map(v => `<option value="${escapeAttr(v)}" ${v === selected ? "selected" : ""}>${v}</option>`).join("")}
                </select>
            </label>
        `;
    }

    private static date(id: keyof FilterState, label: string, value: string): string {
        return `
            <label class="filter-item">
                <span>${label}</span>
                <input id="filter-${id}" type="date" value="${escapeAttr(value)}" />
            </label>
        `;
    }
}
