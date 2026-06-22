"use strict";

import "./../style/visual.less";
import powerbi from "powerbi-visuals-api";


import IVisual = powerbi.extensibility.visual.IVisual;
import VisualConstructorOptions = powerbi.extensibility.visual.VisualConstructorOptions;
import VisualUpdateOptions = powerbi.extensibility.visual.VisualUpdateOptions;

import { RowData } from "./models/RowData";
import { GroupRow, Mode } from "./models/GroupRow";
import { DataService } from "./services/DataService";
import { GroupService } from "./services/GroupService";
import { KpiSection } from "./components/KpiSection";
import { DistributionTable } from "./components/DistributionTable";
import { DetailModal } from "./components/DetailModal";

export class Visual implements IVisual {
    private sortField: string = "total";
    private sortDirection: "asc" | "desc" = "desc";

    private root: HTMLElement;
    private rows: RowData[] = [];
    private mode: Mode = "area";
    private showBreakdown: boolean = false;

    private modalGroupId: string | null = null;
    private modalPage: number = 1;
    private modalSearch: string = "";
    private modalRows: RowData[] = [];
    private modalTitle: string = "";

    constructor(options: VisualConstructorOptions) {
        this.root = document.createElement("div");
        this.root.className = "pd-root";
        options.element.appendChild(this.root);
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
            case "label":
                return g.label;

            case "casCount":
                return g.casCount;

            case "locadorTotalCount":
                return g.locadorTotalCount;

            case "locadorTotalMonto":
                return g.locadorTotalMonto;

            case "locadorGeneralCount":
                return g.locadorGeneralCount;

            case "locadorGeneralMonto":
                return g.locadorGeneralMonto;

            case "locadorEspecializadoCount":
                return g.locadorEspecializadoCount;

            case "locadorEspecializadoMonto":
                return g.locadorEspecializadoMonto;

            case "total":
            default:
                return g.casCount + g.locadorTotalCount;
        }
    }

    public update(options: VisualUpdateOptions): void {
        const dataView = options.dataViews?.[0];

        if (!dataView?.table?.rows?.length) {
            this.root.innerHTML = `<div class="pd-empty">Agrega los campos requeridos al visual.</div>`;
            return;
        }

        this.rows = DataService.parse(dataView);
        this.render();
    }

    private render(): void {
        const casRows = this.rows.filter(r => GroupService.isCas(r));
        const locadorRows = this.rows.filter(r => GroupService.isLocador(r));
        const generalRows = this.rows.filter(r => GroupService.isLocadorGeneral(r));
        const especializadoRows = this.rows.filter(r => GroupService.isEspecializado(r));

        const totalCas = GroupService.distinctCount(casRows);
        const totalLocadores = GroupService.distinctCount(locadorRows);
        const totalGenerales = GroupService.distinctCount(generalRows);
        const totalEspecializados = GroupService.distinctCount(especializadoRows);
        const totalPersonal = totalCas + totalLocadores;

        const montoLocadores = GroupService.sumMonto(locadorRows);
        const montoGenerales = GroupService.sumMonto(generalRows);
        const montoEspecializados = GroupService.sumMonto(especializadoRows);

        const groups = this.sortGroups(
            GroupService.buildGroups(this.rows, this.mode)
        );

        this.root.innerHTML = `
            <div class="pd-page">
                ${KpiSection.render({
                    totalPersonal,
                    totalCas,
                    totalLocadores,
                    totalGenerales,
                    totalEspecializados,
                    montoLocadores,
                    montoGenerales,
                    montoEspecializados
                })}

                ${DistributionTable.render(
                    groups,
                    this.mode,
                    this.showBreakdown,
                    {
                        cas: totalCas,
                        locadorTotal: totalLocadores,
                        locadorGeneral: totalGenerales,
                        locadorEspecializado: totalEspecializados
                    }
                )}

            </div>

            <div id="modalHost"></div>
        `;

        this.bindEvents(groups);

    }

    private bindEvents(groups: GroupRow[]): void {
        this.root.querySelector("#btnArea")?.addEventListener("click", () => {
            this.mode = "area";
            this.modalGroupId = null;
            this.sortField = "total";
            this.sortDirection = "desc";
            this.render();
        });

        this.root.querySelector("#btnProf")?.addEventListener("click", () => {
            this.mode = "profesionCargo";
            this.modalGroupId = null;
            this.sortField = "total";
            this.sortDirection = "desc";
            this.render();
        });

        this.root.querySelector("#btnBreakdown")?.addEventListener("click", () => {
            this.showBreakdown = !this.showBreakdown;
            this.render();
        });

        this.root.querySelector("#btnDetail")?.addEventListener("click", () => {
            this.modalGroupId = "ALL";
            this.modalRows = this.rows;
            this.modalTitle = "Detalle general de personal";
            this.modalPage = 1;
            this.modalSearch = "";
            this.renderModal();
        });

        this.root.querySelectorAll("[data-sort]").forEach(header => {
            header.addEventListener("click", () => {
                const field = (header as HTMLElement).dataset.sort ?? "total";

                if (this.sortField === field) {
                    this.sortDirection = this.sortDirection === "asc" ? "desc" : "asc";
                } else {
                    this.sortField = field;
                    this.sortDirection = "desc";
                }

                this.render();
            });
        });
    }

    private openModal(group: GroupRow, reset: boolean): void {
        this.modalGroupId = group.id;

        if (reset) {
            this.modalPage = 1;
            this.modalSearch = "";
        }

        this.modalRows = group.casRows.concat(group.locadorRows);
        this.modalTitle = `${group.source}: ${group.label}`;

        this.renderModal();
    }

    private renderModal(): void {
        const host = this.root.querySelector("#modalHost") as HTMLElement;

        if (!host) return;

        host.innerHTML = DetailModal.render(
            this.modalTitle,
            this.modalRows,
            this.modalSearch,
            this.modalPage,
            10
        );

        host.querySelector("#modalClose")?.addEventListener("click", () => {
            host.innerHTML = "";
            this.modalGroupId = null;
        });

        const input = host.querySelector("#modalSearch") as HTMLInputElement;

        input?.addEventListener("input", (e) => {
            this.modalSearch = (e.target as HTMLInputElement).value;
            this.modalPage = 1;
            this.renderModal();

            setTimeout(() => {
                const nextInput = this.root.querySelector("#modalSearch") as HTMLInputElement;
                if (nextInput) {
                    nextInput.focus();
                    nextInput.setSelectionRange(nextInput.value.length, nextInput.value.length);
                }
            }, 0);
        });

        host.querySelector("#prevPage")?.addEventListener("click", () => {
            this.modalPage = Math.max(1, this.modalPage - 1);
            this.renderModal();
        });

        host.querySelector("#nextPage")?.addEventListener("click", () => {
            this.modalPage++;
            this.renderModal();
        });
    }
}