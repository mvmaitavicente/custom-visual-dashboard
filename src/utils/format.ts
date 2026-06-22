export function fmt(value: number): string {
    return new Intl.NumberFormat("es-PE", {
        maximumFractionDigits: 0
    }).format(value || 0);
}

export function pct(value: number, total: number): string {
    return total ? `${Math.round((value / total) * 100)}%` : "0%";
}

export function text(value: unknown): string {
    return String(value ?? "").trim();
}

export function toNumber(value: unknown): number {
    if (value === null || value === undefined || value === "") return 0;
    if (typeof value === "number") return value;

    const clean = String(value)
        .replace(/S\/\.?/gi, "")
        .replace(/,/g, "")
        .replace(/\s/g, "")
        .trim();

    const n = Number(clean);
    return Number.isFinite(n) ? n : 0;
}

export function escapeAttr(value: string): string {
    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");
}