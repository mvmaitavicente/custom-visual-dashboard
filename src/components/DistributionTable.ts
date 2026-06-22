import { GroupRow, Mode } from "../models/GroupRow";
import { fmt, pct } from "../utils/format";

export class DistributionTable {
    public static render(
        groups: GroupRow[],
        mode: Mode,
        showBreakdown: boolean,
        totals: {
            cas: number;
            locadorTotal: number;
            locadorGeneral: number;
            locadorEspecializado: number;
        }
    ): string {
        return `
            <section class="pd-panel">
                <div class="pd-panel-head">
                    <div class="pd-panel-left">
                        <div class="pd-title">
                            ${mode === "area" ? "Distribución por Área" : "Distribución por Profesión / Cargo"}
                        </div>
                    </div>

                    <div class="pd-toolbar">
                        <div class="toolbar-group">
                            <span class="toolbar-label">Vista</span>
                            <button class="seg-btn ${mode === "area" ? "active" : ""}" id="btnArea">Área</button>
                            <button class="seg-btn ${mode === "profesionCargo" ? "active" : ""}" id="btnProf">Profesión / Cargo</button>
                        </div>

                        <div class="toolbar-group">
                            <span class="toolbar-label">Locadores</span>
                            <button class="switch-btn ${showBreakdown ? "on" : ""}" id="btnBreakdown">
                                <span class="switch-dot"></span>
                                <span>${showBreakdown ? "General / Especializado" : "Total"}</span>
                            </button>
                        </div>

                        <button class="detail-main" id="btnDetail">Detalle</button>
                    </div>
                </div>

                ${
                    mode === "area"
                        ? this.renderAreaTable(groups, showBreakdown, totals)
                        : this.renderProfessionCargoTables(groups, totals)
                }
            </section>
        `;
    }

    private static renderAreaTable(
        groups: GroupRow[],
        showBreakdown: boolean,
        totals: {
            cas: number;
            locadorTotal: number;
            locadorGeneral: number;
            locadorEspecializado: number;
        }
    ): string {
        return `
            <div class="pd-table-wrap">
                <table class="pd-table">
                    <thead>
                        <tr>
                            <th rowspan="2" class="left sticky-left sortable" data-sort="label">Área ↕</th>
                            <th colspan="2" class="blue group-block">CAS</th>
                            ${
                                !showBreakdown
                                    ? `<th colspan="3" class="green group-block group-separator">LOCADOR TOTAL</th>`
                                    : `
                                        <th colspan="3" class="green group-block group-separator">LOCADOR GENERAL</th>
                                        <th colspan="3" class="purple group-block group-separator">LOCADOR ESPECIALIZADO</th>
                                    `
                            }
                        </tr>
                        <tr>
                            <th class="sortable" data-sort="casCount">Personas ↕</th>
                            <th class="sortable" data-sort="casCount">% ↕</th>

                            ${
                                !showBreakdown
                                    ? `
                                        <th class="sortable group-separator" data-sort="locadorTotalCount">Personas ↕</th>
                                        <th class="sortable" data-sort="locadorTotalCount">% ↕</th>
                                        <th class="sortable" data-sort="locadorTotalMonto">Monto ↕</th>
                                    `
                                    : `
                                        <th class="sortable group-separator" data-sort="locadorGeneralCount">Personas ↕</th>
                                        <th class="sortable" data-sort="locadorGeneralCount">% ↕</th>
                                        <th class="sortable" data-sort="locadorGeneralMonto">Monto ↕</th>

                                        <th class="sortable group-separator" data-sort="locadorEspecializadoCount">Personas ↕</th>
                                        <th class="sortable" data-sort="locadorEspecializadoCount">% ↕</th>
                                        <th class="sortable" data-sort="locadorEspecializadoMonto">Monto ↕</th>
                                    `
                            }
                        </tr>
                    </thead>

                    <tbody>
                        ${groups.map(g => this.areaRow(g, showBreakdown, totals)).join("")}
                    </tbody>
                </table>
            </div>
        `;
    }

    private static areaRow(
        g: GroupRow,
        showBreakdown: boolean,
        totals: {
            cas: number;
            locadorTotal: number;
            locadorGeneral: number;
            locadorEspecializado: number;
        }
    ): string {
        if (!showBreakdown) {
            return `
                <tr>
                    <td class="left strong sticky-left wrap-text">${g.label}</td>

                    <td>${this.bar(g.casCount, totals.cas, "blue")}</td>
                    <td>${pct(g.casCount, totals.cas)}</td>

                    <td class="group-separator">${this.bar(g.locadorTotalCount, totals.locadorTotal, "green")}</td>
                    <td>${pct(g.locadorTotalCount, totals.locadorTotal)}</td>
                    <td class="money">S/ ${fmt(g.locadorTotalMonto)}</td>
                </tr>
            `;
        }

        return `
            <tr>
                <td class="left strong sticky-left wrap-text">${g.label}</td>

                <td>${this.bar(g.casCount, totals.cas, "blue")}</td>
                <td>${pct(g.casCount, totals.cas)}</td>

                <td class="group-separator">${this.bar(g.locadorGeneralCount, totals.locadorGeneral, "green")}</td>
                <td>${pct(g.locadorGeneralCount, totals.locadorGeneral)}</td>
                <td class="money">S/ ${fmt(g.locadorGeneralMonto)}</td>

                <td class="group-separator">${this.bar(g.locadorEspecializadoCount, totals.locadorEspecializado, "purple")}</td>
                <td>${pct(g.locadorEspecializadoCount, totals.locadorEspecializado)}</td>
                <td class="money">S/ ${fmt(g.locadorEspecializadoMonto)}</td>
            </tr>
        `;
    }

    private static renderProfessionCargoTables(
        groups: GroupRow[],
        totals: {
            cas: number;
            locadorTotal: number;
            locadorGeneral: number;
            locadorEspecializado: number;
        }
    ): string {
        const casGroups = groups.filter(g => g.casCount > 0);
        const locadorGroups = groups.filter(g => g.locadorGeneralCount > 0);

        return `
            <div class="dual-tables">
                <div class="sub-panel">
                    <div class="sub-panel-title blue">CAS por Cargo</div>
                    <div class="pd-table-wrap inner">
                        <table class="pd-table mini">
                            <thead>
                                <tr>
                                    <th class="left sticky-left sortable" data-sort="label">Cargo ↕</th>
                                    <th class="sortable" data-sort="casCount">Personas ↕</th>
                                    <th class="sortable" data-sort="casCount">% ↕</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${casGroups.map(g => `
                                    <tr>
                                        <td class="left strong sticky-left wrap-text">${g.label}</td>
                                        <td>${this.bar(g.casCount, totals.cas, "blue")}</td>
                                        <td>${pct(g.casCount, totals.cas)}</td>
                                    </tr>
                                `).join("")}
                            </tbody>
                        </table>
                    </div>
                </div>

                <div class="sub-panel">
                    <div class="sub-panel-title green">Locadores Generales por Profesión</div>
                    <div class="pd-table-wrap inner">
                        <table class="pd-table mini">
                            <thead>
                                <tr>
                                    <th class="left sticky-left sortable" data-sort="label">Profesión ↕</th>
                                    <th class="sortable" data-sort="locadorGeneralCount">Personas ↕</th>
                                    <th class="sortable" data-sort="locadorGeneralCount">% ↕</th>
                                    <th class="sortable" data-sort="locadorGeneralMonto">Monto ↕</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${locadorGroups.map(g => `
                                    <tr>
                                        <td class="left strong sticky-left wrap-text">${g.label}</td>
                                        <td>${this.bar(g.locadorGeneralCount, totals.locadorGeneral, "green")}</td>
                                        <td>${pct(g.locadorGeneralCount, totals.locadorGeneral)}</td>
                                        <td class="money">S/ ${fmt(g.locadorGeneralMonto)}</td>
                                    </tr>
                                `).join("")}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        `;
    }

    private static bar(value: number, total: number, color: string): string {
        const width = total ? Math.max(4, Math.round((value / total) * 100)) : 0;

        return `
            <div class="bar-cell">
                <span>${fmt(value)}</span>
                <div class="bar-bg">
                    <div class="bar-fill ${color}" style="width:${width}%"></div>
                </div>
            </div>
        `;
    }
}