export interface TableSettings {
    visibleColumns: string[];
    columnOrder: string[];
    sortColumn?: string;
    sortDirection?: "asc" | "desc";
}

type ColumnWithKey = {
    key: string;
};

const STORAGE_KEY = "cardCarouselPro1234567890.detailTableSettings.v1";
const LEGACY_STORAGE_KEY = "cardCarouselPro1234567890.detailColumns.v1";

export class TableSettingsService {
    private static memorySettings: TableSettings | null = null;

    public static load(): TableSettings | null {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            if (raw) {
                const settings = this.parse(raw);
                if (settings) {
                    this.memorySettings = settings;
                    return settings;
                }
            }

            const legacyRaw = localStorage.getItem(LEGACY_STORAGE_KEY);
            if (legacyRaw) {
                const legacy = JSON.parse(legacyRaw) as {
                    visibleKeys?: unknown;
                    order?: unknown;
                };

                if (Array.isArray(legacy.visibleKeys) && Array.isArray(legacy.order)) {
                    const settings: TableSettings = {
                        visibleColumns: legacy.visibleKeys.filter(
                            (key): key is string => typeof key === "string"
                        ),
                        columnOrder: legacy.order.filter(
                            (key): key is string => typeof key === "string"
                        )
                    };
                    this.save(settings);
                    localStorage.removeItem(LEGACY_STORAGE_KEY);
                    return settings;
                }
            }
        } catch {
            return this.memorySettings;
        }

        return this.memorySettings;
    }

    public static save(settings: TableSettings): void {
        const normalized: TableSettings = {
            visibleColumns: this.uniqueStrings(settings.visibleColumns),
            columnOrder: this.uniqueStrings(settings.columnOrder),
            sortColumn: typeof settings.sortColumn === "string"
                ? settings.sortColumn
                : undefined,
            sortDirection: settings.sortDirection === "asc" || settings.sortDirection === "desc"
                ? settings.sortDirection
                : undefined
        };

        this.memorySettings = normalized;

        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(normalized));
        } catch {
            // Keep settings for the current session when storage is unavailable.
        }
    }

    public static clear(): void {
        this.memorySettings = null;

        try {
            localStorage.removeItem(STORAGE_KEY);
            localStorage.removeItem(LEGACY_STORAGE_KEY);
        } catch {
            // Nothing else is required when storage is unavailable.
        }
    }

    public static apply<T extends ColumnWithKey>(
        columns: T[],
        settings: TableSettings | null = this.load(),
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
        return ordered.filter(column => visibleKeys.has(column.key));
    }

    private static parse(raw: string): TableSettings | null {
        const parsed = JSON.parse(raw) as Partial<TableSettings>;
        if (!Array.isArray(parsed.visibleColumns) || !Array.isArray(parsed.columnOrder)) {
            return null;
        }

        return {
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
                : undefined
        };
    }

    private static uniqueStrings(values: string[]): string[] {
        return Array.from(new Set(values.filter(value => typeof value === "string")));
    }
}
