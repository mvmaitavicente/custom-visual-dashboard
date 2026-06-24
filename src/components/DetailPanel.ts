import { RowData } from "../models/RowData";
import { DetailColumn } from "../services/DataService";
import { TableSettingsService } from "../services/TableSettingsService";
import { fmt, formatDate } from "../utils/format";
import { cleanTsvValue, runCopyAction } from "../utils/clipboard";

const PAGE_SIZE = 50;

export class DetailPanel {
    public static render(
        rows: RowData[],
        columns: DetailColumn[],
        search: string,
        page: number,
        sortField: string,
        sortDirection: "asc" | "desc"
    ): HTMLElement {
        const query = search.trim().toLowerCase();
        const filtered = rows.filter(row => {
            if (!query) return true;
            return Object.entries(row)
                .filter(([key]) => key !== "selectionId")
                .some(([, value]) => String(value ?? "").toLowerCase().includes(query));
        });

        const sorted = [...filtered].sort((a, b) => {
            const av = String((a as any)[sortField] ?? "").toLowerCase();
            const bv = String((b as any)[sortField] ?? "").toLowerCase();
            if (av === bv) return 0;
            return sortDirection === "asc" ? av.localeCompare(bv) : bv.localeCompare(av);
        });

        const pages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
        const safePage = Math.min(page, pages);
        const firstIndex = (safePage - 1) * PAGE_SIZE;
        const pageRows = sorted.slice(firstIndex, firstIndex + PAGE_SIZE);

        const availableColumns = this.addGradoAcademicoColumn(
            columns.length > 0
                ? columns.filter(col => col.label.toLowerCase() !== "unidad orgánica")
                : Object.keys(rows[0] || {})
                    .filter(key => key !== "selectionId")
                    .map(key => ({ label: key.toUpperCase(), key } as any))
        );
        const visibleColumns = this.resolveVisibleColumns(availableColumns);

        const section = document.createElement("section");
        section.className = "detail-section";

        const toolbar = document.createElement("div");
        toolbar.className = "detail-toolbar";

        const toolbarInfo = document.createElement("div");
        const title = document.createElement("div");
        title.className = "detail-title";
        title.textContent = "Detalle completo";

        const sub = document.createElement("div");
        sub.className = "detail-sub";
        sub.textContent = `${fmt(sorted.length)} registros`;

        toolbarInfo.appendChild(title);
        toolbarInfo.appendChild(sub);


        const input = document.createElement("input");
        input.id = "detailSearch";
        input.className = "detail-search";
        input.type = "search";
        input.placeholder = "Buscar en detalle...";
        input.value = search;

        const toolbarActions = document.createElement("div");
        toolbarActions.className = "detail-actions";

        const copyButton = document.createElement("button");
        copyButton.type = "button";
        copyButton.className = "copy-table-btn detail-copy-btn";
        copyButton.textContent = "📋 Copiar";
        copyButton.addEventListener("click", async () => {
            const tsv = this.buildDetailTsv(sorted, visibleColumns);
            await runCopyAction(tsv, copyButton, {
                success: "✓ Copiado",
                error: "No se pudo copiar"
            });
        });

        const configButton = document.createElement("button");
        configButton.type = "button";
        configButton.className = "column-config-btn";
        configButton.textContent = "⚙ Configurar columnas";
        configButton.addEventListener("click", () => {
            this.openColumnConfig(section, availableColumns, visibleColumns);
        });

        toolbarActions.appendChild(input);
        toolbarActions.appendChild(copyButton);
        toolbarActions.appendChild(configButton);

        toolbar.appendChild(toolbarInfo);
        toolbar.appendChild(toolbarActions);
        section.appendChild(toolbar);

        const tableWrap = document.createElement("div");
        tableWrap.className = "detail-table-wrap";

        const table = document.createElement("table");
        table.className = "detail-table";

        const thead = document.createElement("thead");
        const headerRow = document.createElement("tr");
        const thNum = document.createElement("th");
        thNum.className = "sticky row-number-column";
        thNum.textContent = "N°";
        headerRow.appendChild(thNum);

        visibleColumns.forEach(col => {
            const th = document.createElement("th");
            th.className = "sticky sortable";
            const isSorted = col.key === sortField;
            if (isSorted) {
                th.classList.add("sorted-column");
            }

            const label = String(col.label || "").toLowerCase();

            if (
                label === "s/." ||
                label === "monto" ||
                label.includes("monto")
            ) {
                th.classList.add("money-column");
            }

            th.dataset.sort = col.key;

            const content = document.createElement("span");
            content.className = "sort-header-content";

            const labelText = document.createElement("span");
            labelText.textContent = col.label;

            const sortIcon = document.createElement("span");
            sortIcon.className = `sort-icon ${isSorted ? "sort-icon-active" : "sort-icon-inactive"}`;
            sortIcon.textContent = isSorted
                ? sortDirection === "asc" ? "↑" : "↓"
                : "↕";

            content.appendChild(labelText);
            content.appendChild(sortIcon);
            th.appendChild(content);
            headerRow.appendChild(th);
        });
        thead.appendChild(headerRow);
        table.appendChild(thead);

        const tbody = document.createElement("tbody");
        pageRows.forEach((row, rowIndex) => {
            const tr = document.createElement("tr");

            const tdNum = document.createElement("td");
            tdNum.className = "row-number-column";
            tdNum.textContent = String(firstIndex + rowIndex + 1);
            tr.appendChild(tdNum);

            visibleColumns.forEach(col => {
                const td = document.createElement("td");

                const label = String(col.label || "").toLowerCase();

                if (
                    label === "s/." ||
                    label === "monto" ||
                    label.includes("monto")
                ) {
                    td.classList.add("money-column");
                }

                td.textContent = this.getCellValue(row, col);
                tr.appendChild(td);
            });

            tbody.appendChild(tr);
        });
        table.appendChild(tbody);

        tableWrap.appendChild(table);
        section.appendChild(tableWrap);

        const footer = document.createElement("div");
        footer.className = "detail-footer";

        const pageInfo = document.createElement("div");
        pageInfo.textContent = `Registros ${sorted.length === 0 ? 0 : firstIndex + 1} - ${Math.min(firstIndex + PAGE_SIZE, sorted.length)} de ${sorted.length}`;

        const pager = document.createElement("div");
        pager.className = "pager";

        const prevButton = document.createElement("button");
        prevButton.id = "prevPage";
        prevButton.disabled = safePage <= 1;
        prevButton.textContent = "‹";

        const pageLabel = document.createElement("span");
        pageLabel.textContent = `Página ${safePage} de ${pages}`;

        const nextButton = document.createElement("button");
        nextButton.id = "nextPage";
        nextButton.disabled = safePage >= pages;
        nextButton.textContent = "›";

        pager.appendChild(prevButton);
        pager.appendChild(pageLabel);
        pager.appendChild(nextButton);

        footer.appendChild(pageInfo);
        footer.appendChild(pager);
        section.appendChild(footer);

        return section;
    }

    private static resolveVisibleColumns(columns: DetailColumn[]): DetailColumn[] {
        return TableSettingsService.apply(columns);
    }

    private static openColumnConfig(
        section: HTMLElement,
        availableColumns: DetailColumn[],
        visibleColumns: DetailColumn[]
    ): void {
        section.querySelector(".column-config-backdrop")?.remove();

        const settings = TableSettingsService.load();
        const orderedColumns = TableSettingsService.apply(
            availableColumns,
            settings,
            false
        );

        const selectedKeys = new Set(
            settings
                ? settings.visibleColumns
                : visibleColumns.map(column => column.key)
        );

        const backdrop = document.createElement("div");
        backdrop.className = "column-config-backdrop";

        const panel = document.createElement("aside");
        panel.className = "column-config-panel";
        panel.setAttribute("role", "dialog");
        panel.setAttribute("aria-modal", "true");
        panel.setAttribute("aria-label", "Configurar columnas");

        const header = document.createElement("div");
        header.className = "column-config-header";

        const title = document.createElement("strong");
        title.textContent = "Configurar columnas";

        const closeButton = document.createElement("button");
        closeButton.type = "button";
        closeButton.className = "column-config-close";
        closeButton.textContent = "×";
        closeButton.title = "Cerrar";

        header.appendChild(title);
        header.appendChild(closeButton);

        const search = document.createElement("input");
        search.type = "search";
        search.className = "column-config-search";
        search.placeholder = "Buscar columnas...";

        const bulkActions = document.createElement("div");
        bulkActions.className = "column-config-bulk-actions";

        const selectAllButton = document.createElement("button");
        selectAllButton.type = "button";
        selectAllButton.textContent = "Seleccionar todo";

        const clearButton = document.createElement("button");
        clearButton.type = "button";
        clearButton.textContent = "Limpiar selección";

        bulkActions.appendChild(selectAllButton);
        bulkActions.appendChild(clearButton);

        const list = document.createElement("div");
        list.className = "column-config-list";

        orderedColumns.forEach(column => {
            list.appendChild(this.createColumnConfigItem(column, selectedKeys.has(column.key)));
        });

        const footer = document.createElement("div");
        footer.className = "column-config-footer";

        const cancelButton = document.createElement("button");
        cancelButton.type = "button";
        cancelButton.className = "column-config-cancel";
        cancelButton.textContent = "Cancelar";

        const applyButton = document.createElement("button");
        applyButton.type = "button";
        applyButton.className = "column-config-apply";
        applyButton.textContent = "Aplicar";

        footer.appendChild(cancelButton);
        footer.appendChild(applyButton);

        panel.appendChild(header);
        panel.appendChild(search);
        panel.appendChild(bulkActions);
        panel.appendChild(list);
        panel.appendChild(footer);
        backdrop.appendChild(panel);
        section.appendChild(backdrop);

        const close = () => backdrop.remove();

        closeButton.addEventListener("click", close);
        cancelButton.addEventListener("click", close);
        backdrop.addEventListener("click", event => {
            if (event.target === backdrop) close();
        });

        search.addEventListener("input", () => {
            const query = this.normalizeLabel(search.value);
            list.querySelectorAll<HTMLElement>(".column-config-item").forEach(item => {
                const label = this.normalizeLabel(item.dataset.columnLabel);
                item.hidden = Boolean(query) && !label.includes(query);
            });
        });

        selectAllButton.addEventListener("click", () => {
            list.querySelectorAll<HTMLInputElement>("input[type='checkbox']").forEach(checkbox => {
                if (!checkbox.closest<HTMLElement>(".column-config-item")?.hidden) {
                    checkbox.checked = true;
                }
            });
        });

        clearButton.addEventListener("click", () => {
            list.querySelectorAll<HTMLInputElement>("input[type='checkbox']").forEach(checkbox => {
                if (!checkbox.closest<HTMLElement>(".column-config-item")?.hidden) {
                    checkbox.checked = false;
                }
            });
        });

        this.bindColumnDragAndDrop(list);

        applyButton.addEventListener("click", () => {
            const items = Array.from(list.querySelectorAll<HTMLElement>(".column-config-item"));
            const currentSettings = TableSettingsService.load();

            TableSettingsService.save({
                columnOrder: items.map(item => item.dataset.columnKey || "").filter(Boolean),
                visibleColumns: items
                    .filter(item => item.querySelector<HTMLInputElement>("input[type='checkbox']")?.checked)
                    .map(item => item.dataset.columnKey || "")
                    .filter(Boolean),
                sortColumn: currentSettings?.sortColumn,
                sortDirection: currentSettings?.sortDirection
            });
            close();
            section.dispatchEvent(new CustomEvent("detailcolumnschange", { bubbles: true }));
        });

        search.focus();
    }

    private static createColumnConfigItem(
        column: DetailColumn,
        selected: boolean
    ): HTMLElement {
        const item = document.createElement("label");
        item.className = "column-config-item";
        item.draggable = true;
        item.dataset.columnKey = column.key;
        item.dataset.columnLabel = column.label;

        const dragHandle = document.createElement("span");
        dragHandle.className = "column-drag-handle";
        dragHandle.textContent = "⋮⋮";
        dragHandle.title = "Arrastrar para reordenar";

        const checkbox = document.createElement("input");
        checkbox.type = "checkbox";
        checkbox.checked = selected;

        const label = document.createElement("span");
        label.className = "column-config-label";
        label.textContent = column.label;

        item.appendChild(dragHandle);
        item.appendChild(checkbox);
        item.appendChild(label);
        return item;
    }

    private static bindColumnDragAndDrop(list: HTMLElement): void {
        let draggedItem: HTMLElement | null = null;

        list.addEventListener("dragstart", event => {
            const item = (event.target as HTMLElement).closest<HTMLElement>(".column-config-item");
            if (!item || item.hidden) return;

            draggedItem = item;
            item.classList.add("dragging");
            event.dataTransfer?.setData("text/plain", item.dataset.columnKey || "");
            if (event.dataTransfer) event.dataTransfer.effectAllowed = "move";
        });

        list.addEventListener("dragover", event => {
            if (!draggedItem) return;
            event.preventDefault();

            const target = (event.target as HTMLElement).closest<HTMLElement>(".column-config-item");
            if (!target || target === draggedItem || target.hidden) return;

            const rect = target.getBoundingClientRect();
            const insertAfter = event.clientY > rect.top + rect.height / 2;
            list.insertBefore(draggedItem, insertAfter ? target.nextSibling : target);
        });

        list.addEventListener("dragend", () => {
            draggedItem?.classList.remove("dragging");
            draggedItem = null;
        });
    }

    private static addGradoAcademicoColumn(columns: (DetailColumn | any)[]): (DetailColumn | any)[] {
        const result = [...columns];
        const hasGrado = result.some(col => this.normalizeLabel(col.label).includes("grado academico"));

        if (hasGrado) return result;

        const profesionIndex = result.findIndex(col => {
            const label = this.normalizeLabel(col.label);
            return label.includes("profesion") || label.includes("profesión");
        });

        const gradoColumn = {
            label: "Grado Académico",
            key: "tituloProfesional"
        } as DetailColumn;

        if (profesionIndex >= 0) {
            result.splice(profesionIndex, 0, gradoColumn);
        } else {
            result.push(gradoColumn);
        }

        return result;
    }

    private static normalizeLabel(value: unknown): string {
        return String(value ?? "")
            .toLowerCase()
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .trim();
    }

    private static formatDate(value: any): string {
        if (!value) return "";

        const raw = String(value).trim();

        const date = new Date(raw);

        if (isNaN(date.getTime())) {
            return raw;
        }

        const day = String(date.getUTCDate()).padStart(2, "0");
        const month = String(date.getUTCMonth() + 1).padStart(2, "0");
        const year = date.getUTCFullYear();

        return `${day}/${month}/${year}`;
    }

    private static buildDetailTsv(rows: RowData[], columns: (DetailColumn | any)[]): string {
        const headers = ["N°", ...columns.map(column => cleanTsvValue(column.label))];
        const body = rows.map((row, index) => [
            String(index + 1),
            ...columns.map(column => cleanTsvValue(this.getCopyCellValue(row, column)))
        ].join("\t"));

        return [headers.join("\t"), ...body].join("\n");
    }

    private static getCopyCellValue(row: RowData, column: DetailColumn | any): string {
        const value = (row as any)[column.key];

        if (this.isMoneyColumn(column)) {
            return this.toPlainNumber(value);
        }

        return this.getCellValue(row, column);
    }

    private static isMoneyColumn(column: DetailColumn | any): boolean {
        const label = this.normalizeLabel(column.label);
        const key = this.normalizeLabel(column.key);

        return label === "s/." ||
            label.includes("monto") ||
            key.includes("monto");
    }

    private static toPlainNumber(value: unknown): string {
        if (typeof value === "number") {
            return Number.isFinite(value) ? String(value) : "";
        }

        const raw = String(value ?? "")
            .replace(/s\/\.?/gi, "")
            .replace(/\s/g, "")
            .trim();

        if (!raw) return "";

        const lastComma = raw.lastIndexOf(",");
        const lastDot = raw.lastIndexOf(".");
        let normalized = raw;

        if (lastComma >= 0 && lastDot >= 0) {
            normalized = lastComma > lastDot
                ? raw.replace(/\./g, "").replace(",", ".")
                : raw.replace(/,/g, "");
        } else if (lastComma >= 0) {
            const decimalDigits = raw.length - lastComma - 1;
            normalized = decimalDigits > 0 && decimalDigits <= 2
                ? raw.replace(/\./g, "").replace(",", ".")
                : raw.replace(/,/g, "");
        } else {
            normalized = raw.replace(/,/g, "");
        }

        const number = Number(normalized);
        return Number.isFinite(number) ? String(number) : raw;
    }


    private static getCellValue(row: RowData, column: DetailColumn | any): string {
        const value = (row as any)[column.key];
        const label = String(column.label || "").toLowerCase();

        if (this.isMoneyColumn(column)) {
            return `S/ ${fmt(Number(value) || 0)}`;
        }

        if (
            column.key === "fechaInicio" ||
            column.key === "fechaFin" ||
            label.includes("fecha")
        ) {
            return this.formatDate(value);
        }

        return String(value ?? "");
    }
}
