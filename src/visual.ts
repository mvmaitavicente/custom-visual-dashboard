"use strict";

import "./../style/visual.less";
import powerbi from "powerbi-visuals-api";

import IVisual = powerbi.extensibility.visual.IVisual;
import VisualConstructorOptions = powerbi.extensibility.visual.VisualConstructorOptions;
import VisualUpdateOptions = powerbi.extensibility.visual.VisualUpdateOptions;
import IVisualHost = powerbi.extensibility.visual.IVisualHost;
import ISelectionManager = powerbi.extensibility.ISelectionManager;
import ISelectionId = powerbi.extensibility.ISelectionId;

import { RowData } from "./models/RowData";
import { GroupRow } from "./models/GroupRow";
import { DataService, DetailColumn } from "./services/DataService";
import { GroupService } from "./services/GroupService";
import { KpiSection } from "./components/KpiSection";
import { DistributionTable } from "./components/DistributionTable";
import { Mode } from "./models/GroupRow";

type KpiKey = "personal" | "cas" | "locadores" | "general" | "especializado";

export class Visual implements IVisual {
    private readonly host: IVisualHost;
    private readonly selectionManager: ISelectionManager;

    private root: HTMLElement;
    private rows: RowData[] = [];
    private filteredRows: RowData[] = [];
    private mode: Mode = "area";
    private showBreakdown: boolean = false;
    private showDetailView: boolean = false;
    private activeKpi: KpiKey | null = null;
    private activeRowFilter: { mode: Mode; value: string } | null = null;
    private detailColumns: DetailColumn[] = [];

    private sortField: string = "total";
    private sortDirection: "asc" | "desc" = "desc";

    private detailPage: number = 1;
    private detailSearch: string = "";
    private detailSortField: string = "nombre";
    private detailSortDirection: "asc" | "desc" = "asc";

    constructor(options: VisualConstructorOptions) {
        this.host = options.host;
        this.selectionManager = options.host.createSelectionManager();

        this.root = document.createElement("div");
        this.root.className = "pd-root";
        options.element.appendChild(this.root);
    }

    public update(options: VisualUpdateOptions): void {
        const dataView = options.dataViews?.[0];

        if (!dataView?.table?.rows?.length) {
            this.root.textContent = "";
            const empty = document.createElement("div");
            empty.className = "pd-empty";
            empty.textContent = "Agrega los campos requeridos al visual.";
            this.root.appendChild(empty);
            return;
        }

        this.rows = DataService.parse(dataView);
        this.detailColumns = DataService.getDetailColumns(dataView);

        this.rows.forEach((row, rowIndex) => {
            row.selectionId = this.host
                .createSelectionIdBuilder()
                .withTable(dataView.table, rowIndex)
                .createSelectionId();
        });

        this.render();
    }

    private render(): void {
        this.filteredRows = this.activeRowFilter
            ? this.rows.filter(r => this.matchesRowFilter(r))
            : this.rows;

        const visibleRows = this.activeKpi ? this.filteredRows.filter(r => this.matchesKpi(r)) : this.filteredRows;

        const totals = {
            totalPersonal: GroupService.distinctCount(this.filteredRows.filter(r => GroupService.isCas(r) || GroupService.isLocador(r))),
            totalCas: GroupService.distinctCount(this.filteredRows.filter(r => GroupService.isCas(r))),
            totalLocadores: GroupService.distinctCount(this.filteredRows.filter(r => GroupService.isLocador(r))),
            totalGenerales: GroupService.distinctCount(this.filteredRows.filter(r => GroupService.isLocadorGeneral(r))),
            totalEspecializados: GroupService.distinctCount(this.filteredRows.filter(r => GroupService.isEspecializado(r))),
            montoLocadores: GroupService.sumMonto(this.filteredRows.filter(r => GroupService.isLocador(r))),
            montoGenerales: GroupService.sumMonto(this.filteredRows.filter(r => GroupService.isLocadorGeneral(r))),
            montoEspecializados: GroupService.sumMonto(this.filteredRows.filter(r => GroupService.isEspecializado(r)))
        };

        // Safety fallback: if totals are zero but there are rows, compute distinct counts from identifiers
        if ((totals.totalPersonal === 0 || totals.totalLocadores === 0 || totals.totalCas === 0) && this.filteredRows.length > 0) {
            const distinctIds = (rows: RowData[]) => {
                const ids = rows.map(r => (r.documento || r.nombre || "").toString().trim()).filter(Boolean);
                return ids.length === 0 ? rows.length : new Set(ids).size;
            };

            const casRows = this.filteredRows.filter(r => GroupService.isCas(r));
            const locadorRows = this.filteredRows.filter(r => GroupService.isLocador(r));
            const generalRows = this.filteredRows.filter(r => GroupService.isLocadorGeneral(r));
            const especializadoRows = this.filteredRows.filter(r => GroupService.isEspecializado(r));

            if (totals.totalCas === 0) totals.totalCas = distinctIds(casRows);
            if (totals.totalLocadores === 0) totals.totalLocadores = distinctIds(locadorRows);
            if (totals.totalGenerales === 0) totals.totalGenerales = distinctIds(generalRows);
            if (totals.totalEspecializados === 0) totals.totalEspecializados = distinctIds(especializadoRows);
            if (totals.totalPersonal === 0) totals.totalPersonal = totals.totalCas + totals.totalLocadores || distinctIds(this.filteredRows);
        }

        const groups = this.sortGroups(GroupService.buildGroups(visibleRows, this.mode));

        this.root.textContent = "";
        const page = document.createElement("div");
        page.className = "pd-page";

        const kpiSection = KpiSection.render(totals, this.activeKpi);
        const distributionSection = DistributionTable.render(
            groups,
            this.mode,
            this.showBreakdown,
            this.showDetailView,
            visibleRows,
            this.detailColumns,
            this.detailSearch,
            this.detailPage,
            this.detailSortField,
            this.detailSortDirection,
            this.activeRowFilter
        );

        page.appendChild(kpiSection);
        page.appendChild(distributionSection);
        this.root.appendChild(page);

        this.bindEvents();
    }

    private bindEvents(): void {
        this.bindFilters();

        this.root.querySelector("#btnArea")?.addEventListener("click", () => {
            this.mode = "area";
            this.showDetailView = false;
            this.activeRowFilter = null;
            this.resetDetailState();
            this.render();
        });

        this.root.querySelector("#btnProf")?.addEventListener("click", () => {
            this.mode = "profesionCargo";
            this.showDetailView = false;
            this.activeRowFilter = null;
            this.resetDetailState();
            this.render();
        });

        this.root.querySelector("#btnDetail")?.addEventListener("click", () => {
            this.showDetailView = !this.showDetailView;
            if (this.showDetailView) {
                this.resetDetailState();
            }
            this.render();
        });

        this.root.querySelector("#btnBreakdown")?.addEventListener("click", () => {
            this.showBreakdown = !this.showBreakdown;
            this.showDetailView = false;
            this.resetDetailState();
            this.render();
        });

        this.root.querySelectorAll(".kpi-card.selectable").forEach(card => {
            card.addEventListener("click", () => {
                const key = (card as HTMLElement).dataset.kpi as KpiKey | undefined;
                if (!key) return;
                this.applyKpiSelection(key);
            });
        });

        this.root.querySelectorAll("[data-row-filter]").forEach(row => {
            row.addEventListener("click", () => {
                const el = row as HTMLElement;
                const value = el.dataset.rowFilter;
                const mode = el.dataset.rowMode as Mode | undefined;

                if (!value || !mode) return;

                this.applyRowFilter(mode, value);
            });
        });

        this.root.querySelectorAll("[data-sort]").forEach(header => {
            header.addEventListener("click", () => {
                const field = (header as HTMLElement).dataset.sort ?? (this.showDetailView ? this.detailSortField : this.sortField);

                if (this.showDetailView) {
                    if (this.detailSortField === field) {
                        this.detailSortDirection = this.detailSortDirection === "asc" ? "desc" : "asc";
                    } else {
                        this.detailSortField = field;
                        this.detailSortDirection = "asc";
                    }
                } else {
                    if (this.sortField === field) {
                        this.sortDirection = this.sortDirection === "asc" ? "desc" : "asc";
                    } else {
                        this.sortField = field;
                        this.sortDirection = "desc";
                    }
                }

                this.render();
            });
        });

        this.root.querySelector("#detailSearch")?.addEventListener("input", (event) => {
            if (!this.showDetailView) return;

            this.detailSearch = (event.target as HTMLInputElement).value;
            this.detailPage = 1;

            this.render();

            requestAnimationFrame(() => {
                const input = this.root.querySelector("#detailSearch") as HTMLInputElement | null;

                if (input) {
                    input.focus();

                    const pos = input.value.length;
                    input.setSelectionRange(pos, pos);
                }
            });
        });

        this.root.querySelector("#prevPage")?.addEventListener("click", () => {
            if (!this.showDetailView) return;
            this.detailPage = Math.max(1, this.detailPage - 1);
            this.render();
        });

        this.root.querySelector("#nextPage")?.addEventListener("click", () => {
            if (!this.showDetailView) return;
            this.detailPage++;
            this.render();
        });
    }

    private bindFilters(): void {
        // No custom filters are shown in this visual layout.
    }

    private resetDetailState(): void {
        this.detailPage = 1;
        this.detailSearch = "";
        this.detailSortField = "nombre";
        this.detailSortDirection = "asc";
    }

    private sortGroups(groups: GroupRow[]): GroupRow[] {
        const dir = this.sortDirection === "asc" ? 1 : -1;

        return [...groups].sort((a, b) => {
            const av = this.getSortValue(a, this.sortField);
            const bv = this.getSortValue(b, this.sortField);

            if (typeof av === "string" || typeof bv === "string") {
                return String(av).localeCompare(String(bv)) * dir;
            }

            return (Number(av) - Number(bv)) * dir;
        });
    }

    private getSortValue(g: GroupRow, field: string): string | number {
        switch (field) {
            case "label": return g.label;
            case "casCount": return g.casCount;
            case "locadorTotalCount": return g.locadorTotalCount;
            case "locadorTotalMonto": return g.locadorTotalMonto;
            case "locadorGeneralCount": return g.locadorGeneralCount;
            case "locadorGeneralMonto": return g.locadorGeneralMonto;
            case "locadorEspecializadoCount": return g.locadorEspecializadoCount;
            case "locadorEspecializadoMonto": return g.locadorEspecializadoMonto;
            case "totalCount": return g.totalCount;
            case "total":
            default: return g.totalCount;
        }
    }

    private matchesRowFilter(row: RowData): boolean {
        if (!this.activeRowFilter) return true;

        const value = this.normalizeFilterValue(this.activeRowFilter.value);

        switch (this.activeRowFilter.mode) {
            case "area":
                return this.normalizeFilterValue(row.area) === value;

            case "profesionCargo":
                return (
                    this.normalizeFilterValue(row.profesion) === value ||
                    this.normalizeFilterValue(row.cargo) === value
                );

            default:
                return true;
        }
    }

    private applyRowFilter(mode: Mode, value: string): void {
        const sameFilter =
            this.activeRowFilter &&
            this.activeRowFilter.mode === mode &&
            this.normalizeFilterValue(this.activeRowFilter.value) === this.normalizeFilterValue(value);

        this.activeRowFilter = sameFilter ? null : { mode, value };

        this.activeKpi = null;
        this.detailPage = 1;
        this.selectionManager.select([], false);
        this.render();
    }

    private normalizeFilterValue(value: unknown): string {
        return String(value ?? "")
            .trim()
            .toLowerCase();
    }

    private matchesKpi(row: RowData): boolean {
        switch (this.activeKpi) {
            case "personal":
                return GroupService.isCas(row) || GroupService.isLocador(row);
            case "cas":
                return GroupService.isCas(row);
            case "locadores":
                return GroupService.isLocador(row);
            case "general":
                return GroupService.isLocadorGeneral(row);
            case "especializado":
                return GroupService.isEspecializado(row);
            default:
                return true;
        }
    }

    private selectionMatchesKpi(key: KpiKey, row: RowData): boolean {
        switch (key) {
            case "personal":
                return GroupService.isCas(row) || GroupService.isLocador(row);
            case "cas":
                return GroupService.isCas(row);
            case "locadores":
                return GroupService.isLocador(row);
            case "general":
                return GroupService.isLocadorGeneral(row);
            case "especializado":
                return GroupService.isEspecializado(row);
        }
    }

    private applyKpiSelection(key: KpiKey): void {
        if (this.activeKpi === key) {
            this.activeKpi = null;
            this.selectionManager.select([], false);
            this.render();
            return;
        }

        const ids = this.filteredRows
            .filter(row => this.selectionMatchesKpi(key, row) && row.selectionId)
            .map(row => row.selectionId!);

        this.activeKpi = key;
        this.selectionManager.select(ids, false);
        this.detailPage = 1;
        this.render();
    }
}
