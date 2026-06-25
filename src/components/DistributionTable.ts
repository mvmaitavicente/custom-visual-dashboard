import { GroupRow, Mode } from "../models/GroupRow";
import { RowData } from "../models/RowData";
import { fmt, pct } from "../utils/format";
import { DetailColumn } from "../services/DataService";
import { DetailExcelExportHandler, DetailPanel } from "./DetailPanel";
import { cleanTsvValue, runCopyAction } from "../utils/clipboard";
import { TableSettingsService } from "../services/TableSettingsService";

export class DistributionTable {
    public static render(
        groups: GroupRow[],
        mode: Mode,
        showBreakdown: boolean,
        showDetailView: boolean,
        rows: RowData[],
        detailColumns: DetailColumn[],
        detailSearch: string,
        detailPage: number,
        detailSortField: string,
        detailSortDirection: "asc" | "desc",
        activeRowFilter: { mode: Mode; value: string } | null,
        tableSettingsService: TableSettingsService,
        onExportExcel: DetailExcelExportHandler
    ): HTMLElement {
        const section = document.createElement("section");
        section.className = "analysis-section";

        const toolbarPanel = document.createElement("div");
        toolbarPanel.className = "pd-toolbar-panel";

        const viewGroup = document.createElement("div");
        viewGroup.className = "toolbar-group view-group";
        const viewLabel = document.createElement("span");
        viewLabel.className = "toolbar-label";
        viewLabel.textContent = "Vista";
        viewGroup.appendChild(viewLabel);

        viewGroup.appendChild(this.createSegButton("btnArea", "Área", !showDetailView && mode === "area"));
        viewGroup.appendChild(this.createSegButton("btnProf", "Profesión / Cargo", !showDetailView && mode === "profesionCargo"));
        viewGroup.appendChild(this.createSegButton("btnDetail", "Detalle", showDetailView));

        const spacer = document.createElement("div");
        spacer.className = "toolbar-spacer";

        const actionGroup = document.createElement("div");
        actionGroup.className = "toolbar-group action-group";
        const breakdownButton = this.createSegButton("btnBreakdown", "Desagregar Locador", showBreakdown);
        const iconSpan = document.createElement("span");
        iconSpan.className = "toolbar-icon";
        iconSpan.textContent = "⇲";
        breakdownButton.prepend(iconSpan);
        actionGroup.appendChild(breakdownButton);

        toolbarPanel.appendChild(viewGroup);
        toolbarPanel.appendChild(spacer);
        toolbarPanel.appendChild(actionGroup);

        section.appendChild(toolbarPanel);

        if (showDetailView) {
            section.appendChild(DetailPanel.render(
                rows,
                detailColumns,
                detailSearch,
                detailPage,
                detailSortField,
                detailSortDirection,
                tableSettingsService,
                onExportExcel
            ));
        } else {
            section.appendChild(this.renderContent(groups, mode, showBreakdown, activeRowFilter));
        }

        return section;
    }

    private static renderContent(
        groups: GroupRow[],
        mode: Mode,
        showBreakdown: boolean,
        activeRowFilter: { mode: Mode; value: string } | null
    ): HTMLElement {
        const totals = {
            cas: groups.reduce((sum, g) => sum + g.casCount, 0),
            locadorTotal: groups.reduce((sum, g) => sum + g.locadorTotalCount, 0),
            locadorGeneral: groups.reduce((sum, g) => sum + g.locadorGeneralCount, 0),
            locadorEspecializado: groups.reduce((sum, g) => sum + g.locadorEspecializadoCount, 0),
            totalPersonal: groups.reduce((sum, g) => sum + g.totalCount, 0)
        };

        if (mode === "area" && showBreakdown) {
            const wrapper = document.createElement("div");
            wrapper.className = "triple-tables";
            wrapper.appendChild(this.simplePanel("Distribución por Área - CAS", "Área", groups, "casCount", totals.cas, "blue", false, undefined, mode, activeRowFilter));
            wrapper.appendChild(this.simplePanel("Distribución por Área - Locador General", "Área", groups, "locadorGeneralCount", totals.locadorGeneral, "green", true, "locadorGeneralMonto", mode, activeRowFilter));
            wrapper.appendChild(this.simplePanel("Distribución por Área - Locador Especializado", "Área", groups, "locadorEspecializadoCount", totals.locadorEspecializado, "purple", true, "locadorEspecializadoMonto", mode, activeRowFilter));
            return wrapper;
        }

        if (mode === "area") {
            const wrapper = document.createElement("div");
            wrapper.className = "dual-tables area-dual";
            wrapper.appendChild(this.simplePanel("Distribución por Área - CAS", "Área", groups, "casCount", totals.cas, "blue", false, undefined, mode, activeRowFilter));
            wrapper.appendChild(this.simplePanel("Distribución por Área - Locadores", "Área", groups, "locadorTotalCount", totals.locadorTotal, "blue", true, "locadorTotalMonto", mode, activeRowFilter));
            return wrapper;
        }

        const casGroups = groups.filter(g => g.casCount > 0);
        const locadorGroups = groups.filter(g => g.locadorTotalCount > 0);

        if (showBreakdown) {
            const wrapper = document.createElement("div");
            wrapper.className = "triple-tables";
            wrapper.appendChild(this.simplePanel("CAS por Cargo", "Cargo", casGroups, "casCount", totals.cas, "blue", false, undefined, mode, activeRowFilter));
            wrapper.appendChild(this.simplePanel("Locador General por Profesión", "Profesión", locadorGroups, "locadorGeneralCount", totals.locadorGeneral, "green", true, "locadorGeneralMonto", mode, activeRowFilter));
            wrapper.appendChild(this.simplePanel("Locador Especializado", "Tipo", locadorGroups, "locadorEspecializadoCount", totals.locadorEspecializado, "purple", true, "locadorEspecializadoMonto", mode, activeRowFilter));
            return wrapper;
        }

        const wrapper = document.createElement("div");
        wrapper.className = "dual-tables";
        wrapper.appendChild(this.simplePanel("CAS por Cargo", "Cargo", casGroups, "casCount", totals.cas, "blue", false, undefined, mode, activeRowFilter));
        wrapper.appendChild(this.simplePanel("Locadores por Profesión", "Profesión", locadorGroups, "locadorTotalCount", totals.locadorTotal, "blue", true, "locadorTotalMonto", mode, activeRowFilter));
        return wrapper;
    }

    private static simplePanel(
        title: string,
        firstCol: string,
        groups: GroupRow[],
        countField: keyof GroupRow,
        total: number,
        color: string,
        includeMonto: boolean,
        montoField?: keyof GroupRow,
        rowMode?: Mode,
        activeRowFilter?: { mode: Mode; value: string } | null
    ): HTMLElement {
        const rows = groups.filter(g => Number(g[countField]) > 0);

        const card = document.createElement("div");
        card.className = "table-card";
        if (rowMode === "profesionCargo" || this.isProfessionTableTitle(title)) {
            card.classList.add("profession-table");
            card.classList.add("profession-panel");
        }

        const headEl = document.createElement("div");
        headEl.className = "table-card-head";

        const titleEl = document.createElement("div");
        titleEl.className = "table-card-title";
        titleEl.textContent = title;
        headEl.appendChild(titleEl);

        const copyButton = document.createElement("button");
        copyButton.type = "button";
        copyButton.className = "copy-table-btn";
        copyButton.textContent = "Copiar";
        copyButton.addEventListener("click", async () => {
            const tsv = this.buildTableTsv(
                rows,
                firstCol,
                countField,
                total,
                includeMonto,
                montoField
            );
            await runCopyAction(tsv, copyButton);
        });
        headEl.appendChild(copyButton);

        card.appendChild(headEl);

        const wrap = document.createElement("div");
        wrap.className = "pd-table-wrap";

        const table = document.createElement("table");
        table.className = "pd-table";

        const thead = document.createElement("thead");
        const headRow = document.createElement("tr");

        headRow.appendChild(this.createSortableHeader(firstCol, "label"));
        headRow.appendChild(this.createSortableHeader("Personas ↕", String(countField)));
        headRow.appendChild(this.createSortableHeader("% ↕", String(countField), "pct-col"));
        if (includeMonto) {
            headRow.appendChild(this.createSortableHeader("Monto ↕", String(montoField ?? "locadorTotalMonto"), "money-col"));
        }

        thead.appendChild(headRow);
        table.appendChild(thead);

        const tbody = document.createElement("tbody");
        rows.forEach(g => {
            const row = document.createElement("tr");
            row.classList.add("selectable-row");
            row.dataset.rowFilter = g.label;
            if (rowMode) {
                row.dataset.rowMode = rowMode;
            }

            if (
                activeRowFilter &&
                rowMode &&
                activeRowFilter.mode === rowMode &&
                this.normalizeFilterValue(activeRowFilter.value) === this.normalizeFilterValue(g.label)
            ) {
                row.classList.add("active-row-filter");
            }

            const count = Number(g[countField]);
            const monto = montoField ? Number(g[montoField]) : Number(g.totalMonto);

            const labelCell = document.createElement("td");
            labelCell.className = "left strong wrap-text";
            labelCell.textContent = g.label;
            row.appendChild(labelCell);

            const barCell = document.createElement("td");
            barCell.appendChild(this.bar(count, total, color));
            row.appendChild(barCell);

            const pctCell = document.createElement("td");
            pctCell.textContent = pct(count, total);
            row.appendChild(pctCell);

            if (includeMonto) {
                const montoCell = document.createElement("td");
                montoCell.className = "money";
                montoCell.textContent = `S/ ${fmt(monto)}`;
                row.appendChild(montoCell);
            }

            tbody.appendChild(row);
        });

        table.appendChild(tbody);
        wrap.appendChild(table);
        card.appendChild(wrap);

        return card;
    }

    private static buildTableTsv(
        rows: GroupRow[],
        firstCol: string,
        countField: keyof GroupRow,
        total: number,
        includeMonto: boolean,
        montoField?: keyof GroupRow
    ): string {
        const headers = [firstCol, "Personas", "%"];
        if (includeMonto) {
            headers.push("Monto");
        }

        const body = rows.map(row => {
            const count = Number(row[countField]);
            const values = [
                cleanTsvValue(row.label),
                cleanTsvValue(fmt(count)),
                cleanTsvValue(pct(count, total))
            ];

            if (includeMonto) {
                const monto = montoField
                    ? Number(row[montoField])
                    : Number(row.totalMonto);
                values.push(cleanTsvValue(Number.isFinite(monto) ? String(monto) : ""));
            }

            return values.join("\t");
        });

        return [headers.join("\t"), ...body].join("\n");
    }

    private static bar(value: number, total: number, color: string): HTMLElement {
        const width = total ? Math.max(4, Math.round((value / total) * 100)) : 0;

        const barCell = document.createElement("div");
        barCell.className = "bar-cell";

        const label = document.createElement("span");
        label.textContent = fmt(value);
        barCell.appendChild(label);

        const bg = document.createElement("div");
        bg.className = "bar-bg";
        const fill = document.createElement("div");
        fill.className = `bar-fill ${color}`;
        fill.style.width = `${width}%`;
        bg.appendChild(fill);
        barCell.appendChild(bg);

        return barCell;
    }

    private static normalizeFilterValue(value: unknown): string {
        return String(value ?? "")
            .trim()
            .toLowerCase();
    }

    private static isProfessionTableTitle(title: string): boolean {
        const normalizedTitle = title
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .toLowerCase();

        return normalizedTitle.includes("profesion") || normalizedTitle.includes("profesi") || normalizedTitle.includes("cargo");
    }

    private static createSegButton(id: string, label: string, active: boolean): HTMLElement {
        const button = document.createElement("button");
        button.id = id;
        button.className = `seg-btn ${active ? "active" : ""}`.trim();
        button.textContent = label;
        return button;
    }

    private static createSortableHeader(label: string, sortField: string, extraClass = ""): HTMLElement {
        const th = document.createElement("th");
        th.className = `sortable ${extraClass}`.trim();
        th.dataset.sort = sortField;
        th.textContent = label;
        return th;
    }
}
