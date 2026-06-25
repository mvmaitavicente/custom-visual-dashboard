import powerbi from "powerbi-visuals-api";

import DataViewObjects = powerbi.DataViewObjects;
import IVisualHost = powerbi.extensibility.visual.IVisualHost;

export interface TableSettings {
    visibleColumns: string[];
    columnOrder: string[];
    sortColumn?: string;
    sortDirection?: "asc" | "desc";
    filters?: Record<string, string[]>;
    savedViews?: SavedTableView[];
    activeViewId?: string;
}

export interface SavedTableView {
    id: string;
    name: string;
    visibleColumns: string[];
    columnOrder: string[];
    sortColumn?: string;
    sortDirection?: "asc" | "desc";
    filters?: Record<string, string[]>;
}

type ColumnWithKey = {
    key: string;
};

const OBJECT_NAME = "tableSettings";
const PROPERTY_NAME = "state";
const STORAGE_KEY = "cardCarouselPro1234567890.detailTableSettings.v1";
const LEGACY_STORAGE_KEY = "cardCarouselPro1234567890.detailColumns.v1";

export class TableSettingsService {
    private settings: TableSettings | null = null;
    private synchronized: boolean = false;

    constructor(private readonly host: IVisualHost) {}

    public synchronize(objects?: DataViewObjects): TableSettings | null {
        const persistedState = objects?.[OBJECT_NAME]?.[PROPERTY_NAME];

        if (typeof persistedState === "string" && persistedState) {
            const persistedSettings = this.parse(persistedState);
            if (persistedSettings) {
                this.settings = persistedSettings;
                this.synchronized = true;
                return this.settings;
            }
        }

        if (!this.synchronized) {
            const localSettings = this.loadLocal();
            this.settings = localSettings;
            this.synchronized = true;

            if (localSettings) {
                this.persist(localSettings);
                this.clearLocal();
            }
        }

        return this.settings;
    }

    public load(): TableSettings | null {
        return this.settings;
    }

    public save(settings: TableSettings): void {
        const normalized = this.normalize({
            ...settings,
            filters: settings.filters ?? this.settings?.filters,
            savedViews: settings.savedViews ?? this.settings?.savedViews,
            activeViewId: settings.activeViewId
        });
        this.settings = normalized;
        this.synchronized = true;
        this.persist(normalized);
    }

    public getSavedViews(): SavedTableView[] {
        return [...(this.settings?.savedViews || [])];
    }

    public saveNamedView(name: string, settings: TableSettings): SavedTableView | null {
        const cleanName = name.trim();
        if (!cleanName) return null;

        const savedViews = this.getSavedViews();
        const existingIndex = savedViews.findIndex(
            view => view.name.toLocaleLowerCase() === cleanName.toLocaleLowerCase()
        );
        const existing = existingIndex >= 0 ? savedViews[existingIndex] : null;
        const view: SavedTableView = {
            id: existing?.id || this.createViewId(),
            name: cleanName,
            visibleColumns: this.uniqueStrings(settings.visibleColumns),
            columnOrder: this.uniqueStrings(settings.columnOrder),
            sortColumn: settings.sortColumn,
            sortDirection: settings.sortDirection,
            filters: this.normalizeFilters(settings.filters ?? this.settings?.filters)
        };

        if (existingIndex >= 0) {
            savedViews.splice(existingIndex, 1, view);
        } else {
            savedViews.push(view);
        }

        this.save({
            ...settings,
            savedViews,
            activeViewId: view.id
        });

        return view;
    }

    public applyNamedView(viewId: string): TableSettings | null {
        const view = this.getSavedViews().find(item => item.id === viewId);
        if (!view) return null;

        const nextSettings: TableSettings = {
            visibleColumns: view.visibleColumns,
            columnOrder: view.columnOrder,
            sortColumn: view.sortColumn,
            sortDirection: view.sortDirection,
            filters: this.normalizeFilters(view.filters),
            savedViews: this.getSavedViews(),
            activeViewId: view.id
        };

        this.save(nextSettings);
        return this.settings;
    }

    public clear(): void {
        this.settings = null;
        this.synchronized = true;
        this.clearLocal();

        this.host.persistProperties({
            removeObject: [{
                objectName: OBJECT_NAME,
                properties: {},
                selector: null
            }]
        });
    }

    public apply<T extends ColumnWithKey>(
        columns: T[],
        settings: TableSettings | null = this.settings,
        visibleOnly: boolean = true
    ): T[] {
        if (!settings) return [...columns];

        const columnsByKey = new Map(columns.map(column => [column.key, column]));
        const ordered = settings.columnOrder
            .map(key => columnsByKey.get(key))
            .filter((column): column is T => Boolean(column));
        const orderedKeys = new Set(ordered.map(column => column.key));

        columns.forEach(column => {
            if (!orderedKeys.has(column.key)) {
                ordered.push(column);
            }
        });

        if (!visibleOnly) return ordered;

        const visibleKeys = new Set(settings.visibleColumns);
        const configuredKeys = new Set(settings.columnOrder);
        return ordered.filter(column =>
            visibleKeys.has(column.key) || !configuredKeys.has(column.key)
        );
    }

    private persist(settings: TableSettings): void {
        this.host.persistProperties({
            merge: [{
                objectName: OBJECT_NAME,
                properties: {
                    [PROPERTY_NAME]: JSON.stringify(settings)
                },
                selector: null
            }]
        });
    }

    private loadLocal(): TableSettings | null {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            if (raw) {
                const settings = this.parse(raw);
                if (settings) return settings;
            }

            const legacyRaw = localStorage.getItem(LEGACY_STORAGE_KEY);
            if (!legacyRaw) return null;

            const legacy = JSON.parse(legacyRaw) as {
                visibleKeys?: unknown;
                order?: unknown;
            };

            if (!Array.isArray(legacy.visibleKeys) || !Array.isArray(legacy.order)) {
                return null;
            }

            return this.normalize({
                visibleColumns: legacy.visibleKeys.filter(
                    (key): key is string => typeof key === "string"
                ),
                columnOrder: legacy.order.filter(
                    (key): key is string => typeof key === "string"
                )
            });
        } catch {
            return null;
        }
    }

    private clearLocal(): void {
        try {
            localStorage.removeItem(STORAGE_KEY);
            localStorage.removeItem(LEGACY_STORAGE_KEY);
        } catch {
            // Persisted PBIX settings remain the source of truth.
        }
    }

    private parse(raw: string): TableSettings | null {
        try {
            const parsed = JSON.parse(raw) as Partial<TableSettings>;
            if (!Array.isArray(parsed.visibleColumns) || !Array.isArray(parsed.columnOrder)) {
                return null;
            }

            return this.normalize({
                visibleColumns: parsed.visibleColumns.filter(
                    (key): key is string => typeof key === "string"
                ),
                columnOrder: parsed.columnOrder.filter(
                    (key): key is string => typeof key === "string"
                ),
                sortColumn: typeof parsed.sortColumn === "string"
                    ? parsed.sortColumn
                    : undefined,
                sortDirection: parsed.sortDirection === "asc" || parsed.sortDirection === "desc"
                    ? parsed.sortDirection
                    : undefined,
                filters: this.isFilterRecord(parsed.filters)
                    ? parsed.filters
                    : undefined,
                savedViews: Array.isArray(parsed.savedViews)
                    ? parsed.savedViews
                    : undefined,
                activeViewId: typeof parsed.activeViewId === "string"
                    ? parsed.activeViewId
                    : undefined
            });
        } catch {
            return null;
        }
    }

    private normalize(settings: TableSettings): TableSettings {
        return {
            visibleColumns: this.uniqueStrings(settings.visibleColumns),
            columnOrder: this.uniqueStrings(settings.columnOrder),
            sortColumn: typeof settings.sortColumn === "string"
                ? settings.sortColumn
                : undefined,
            sortDirection: settings.sortDirection === "asc" || settings.sortDirection === "desc"
                ? settings.sortDirection
                : undefined,
            filters: this.normalizeFilters(settings.filters),
            savedViews: this.normalizeSavedViews(settings.savedViews),
            activeViewId: typeof settings.activeViewId === "string"
                ? settings.activeViewId
                : undefined
        };
    }

    private normalizeSavedViews(views: SavedTableView[] | undefined): SavedTableView[] {
        if (!Array.isArray(views)) return [];

        return views
            .filter(view => view && typeof view.id === "string" && typeof view.name === "string")
            .map(view => ({
                id: view.id,
                name: view.name.trim(),
                visibleColumns: this.uniqueStrings(view.visibleColumns || []),
                columnOrder: this.uniqueStrings(view.columnOrder || []),
                sortColumn: typeof view.sortColumn === "string"
                    ? view.sortColumn
                    : undefined,
                sortDirection: view.sortDirection === "asc" || view.sortDirection === "desc"
                    ? view.sortDirection
                    : undefined,
                filters: this.normalizeFilters(view.filters)
            }))
            .filter(view => Boolean(view.name));
    }

    private createViewId(): string {
        const randomValues = new Uint32Array(2);
        window.crypto.getRandomValues(randomValues);
        const suffix = Array.from(randomValues)
            .map(value => value.toString(36))
            .join("");

        return `view_${Date.now()}_${suffix}`;
    }

    private normalizeFilters(
        filters: Record<string, string[]> | undefined
    ): Record<string, string[]> {
        if (!filters) return {};

        return Object.entries(filters).reduce<Record<string, string[]>>(
            (result, [key, values]) => {
                if (typeof key !== "string" || !Array.isArray(values)) return result;
                result[key] = this.uniqueStrings(values);
                return result;
            },
            {}
        );
    }

    private isFilterRecord(value: unknown): value is Record<string, string[]> {
        if (!value || typeof value !== "object" || Array.isArray(value)) return false;

        return Object.values(value).every(values =>
            Array.isArray(values) && values.every(item => typeof item === "string")
        );
    }

    private uniqueStrings(values: string[]): string[] {
        return Array.from(new Set(values.filter(value => typeof value === "string")));
    }
}
