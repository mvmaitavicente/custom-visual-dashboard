import { fmt } from "../utils/format";

export interface KpiData {
    totalPersonal: number;
    totalCas: number;
    totalLocadores: number;
    totalGenerales: number;
    totalEspecializados: number;
    montoLocadores: number;
    montoGenerales: number;
    montoEspecializados: number;
}

type KpiKey = "personal" | "cas" | "locadores" | "general" | "especializado";

export class KpiSection {
    public static render(k: KpiData, activeKpi: KpiKey | null): HTMLElement {
        const section = document.createElement("section");
        section.className = "pd-kpis";

        section.appendChild(this.createPrimaryCard(k.totalPersonal, activeKpi));
        section.appendChild(this.createSelectableCard("CAS", "cas", fmt(k.totalCas), "Personal CAS", this.donut(k.totalCas, k.totalPersonal, "#1565C0"), activeKpi === "cas", "blue"));
        section.appendChild(this.createSelectableCard(
            "LOCADORES",
            "locadores",
            fmt(k.totalLocadores),
            `Monto contratado: S/\u00A0${fmt(k.montoLocadores)}`,
            this.donut(k.totalLocadores, k.totalPersonal, "#2E7D32"),
            activeKpi === "locadores",
            "green"
        ));
        section.appendChild(this.createDetailCard("LOCADOR GENERAL", "general", fmt(k.totalGenerales), `S/ ${fmt(k.montoGenerales)}`, `${this.pct(k.totalGenerales, k.totalLocadores)} de Locadores`, activeKpi === "general", "orange"));
        section.appendChild(this.createDetailCard("LOCADOR ESPECIALIZADO", "especializado", fmt(k.totalEspecializados), `S/ ${fmt(k.montoEspecializados)}`, `${this.pct(k.totalEspecializados, k.totalLocadores)} de Locadores`, activeKpi === "especializado", "purple"));

        return section;
    }

    private static createPrimaryCard(total: number, activeKpi: KpiKey | null): HTMLElement {
        const card = document.createElement("div");
        card.className = `kpi-card kpi-primary ${activeKpi === "personal" ? "active" : ""}`.trim();
        card.dataset.kpi = "personal";

        const content = document.createElement("div");
        const title = document.createElement("div");
        title.className = "kpi-title";
        title.textContent = "PERSONAL ACTIVO";

        const value = document.createElement("div");
        value.className = "kpi-value";
        value.textContent = fmt(total);

        const sub = document.createElement("div");
        sub.className = "kpi-sub white";
        sub.textContent = "CAS + LOCADORES";

        content.appendChild(title);
        content.appendChild(value);
        content.appendChild(sub);

        const icon = document.createElement("div");
        icon.className = "kpi-main-icon";
        icon.textContent = "👥";

        card.appendChild(content);
        card.appendChild(icon);

        return card;
    }

    private static createSelectableCard(
        titleText: string,
        kpiKey: KpiKey,
        valueText: string,
        subText: string,
        donutElement: HTMLElement,
        active: boolean,
        colorClass: string,
        valueLabel?: string
    ): HTMLElement {
        const card = document.createElement("div");
        card.className = `kpi-card kpi-balanced selectable ${active ? "active" : ""}`.trim();
        card.dataset.kpi = kpiKey;

        const content = document.createElement("div");
        const title = document.createElement("div");
        title.className = `kpi-title ${colorClass}`;
        title.textContent = titleText;

        const value = document.createElement("div");
        value.className = `kpi-value ${colorClass}`;
        value.textContent = valueLabel ? valueLabel : valueText;

        const money = document.createElement("div");

        if (subText.startsWith("Monto contratado:")) {
            money.className = `kpi-money ${colorClass}`;
            money.textContent = subText.replace("Monto contratado:", "").trim();

            const sub = document.createElement("div");
            sub.className = "kpi-sub";
            sub.textContent = "Monto contratado";

            content.appendChild(title);
            content.appendChild(value);
            content.appendChild(money);
            content.appendChild(sub);
        } else {
            const sub = document.createElement("div");
            sub.className = "kpi-sub";
            sub.textContent = subText;

            content.appendChild(title);
            content.appendChild(value);
            content.appendChild(sub);
        }

        card.appendChild(content);
        card.appendChild(donutElement);

        return card;
    }

    private static createDetailCard(
        titleText: string,
        kpiKey: KpiKey,
        valueText: string,
        moneyText: string,
        subText: string,
        active: boolean,
        colorClass: string
    ): HTMLElement {
        const card = document.createElement("div");
        card.className = `kpi-card kpi-detail ${colorClass}-soft selectable ${active ? "active" : ""}`.trim();
        card.dataset.kpi = kpiKey;

        const content = document.createElement("div");
        const title = document.createElement("div");
        title.className = `kpi-title ${colorClass}`;
        title.textContent = titleText;

        const value = document.createElement("div");
        value.className = `kpi-value ${colorClass}`;
        value.textContent = valueText;

        const money = document.createElement("div");
        money.className = `kpi-money ${colorClass}`;
        money.textContent = moneyText;

        const sub = document.createElement("div");
        sub.className = "kpi-sub";
        sub.textContent = subText;

        content.appendChild(title);
        content.appendChild(value);
        content.appendChild(money);
        content.appendChild(sub);

        card.appendChild(content);

        return card;
    }

    private static donut(value: number, total: number, color: string): HTMLElement {
        const p = total ? Math.round((value / total) * 100) : 0;
        const donut = document.createElement("div");
        donut.className = "donut";
        donut.style.background = `conic-gradient(${color} ${p}%, #e4e7ec 0)`;

        const label = document.createElement("div");
        label.textContent = `${p}%`;
        donut.appendChild(label);

        return donut;
    }

    private static pct(value: number, total: number): string {
        return total ? `${Math.round((value / total) * 100)}%` : "0%";
    }
}
