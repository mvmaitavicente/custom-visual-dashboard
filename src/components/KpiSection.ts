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

export class KpiSection {
    public static render(k: KpiData): string {
        return `
            <section class="pd-kpis">
                <div class="kpi-card kpi-primary">
                    <div class="kpi-title">PERSONAL ACTIVO</div>
                    <div class="kpi-value">${fmt(k.totalPersonal)}</div>
                    <div class="kpi-sub">Personas</div>
                    <div class="kpi-foot">CAS + Locadores</div>
                </div>

                <div class="kpi-card">
                    <div class="kpi-title green">CAS</div>
                    <div class="kpi-row">
                        <div>
                            <div class="kpi-value green">${fmt(k.totalCas)}</div>
                        </div>
                        ${this.donut(k.totalCas, k.totalPersonal, "#188038")}
                    </div>
                </div>

                <div class="kpi-card">
                    <div class="kpi-title blue">LOCADORES</div>
                    <div class="kpi-row">
                        <div>
                            <div class="kpi-value blue">${fmt(k.totalLocadores)}</div>
                            <div class="kpi-money">S/ ${fmt(k.montoLocadores)}</div>
                            <div class="kpi-sub">Monto contratado</div>
                        </div>
                        ${this.donut(k.totalLocadores, k.totalPersonal, "#2563eb")}
                    </div>
                </div>

                <div class="kpi-card kpi-split">
                    <div>
                        <div class="kpi-title green">Locador General</div>
                        <div class="kpi-value green">${fmt(k.totalGenerales)}</div>
                        <div class="kpi-sub">${this.pct(k.totalGenerales, k.totalLocadores)} de locadores</div>
                        <div class="kpi-money">S/ ${fmt(k.montoGenerales)}</div>
                    </div>

                    <div class="split-line"></div>

                    <div>
                        <div class="kpi-title purple">Locador Especializado</div>
                        <div class="kpi-value purple">${fmt(k.totalEspecializados)}</div>
                        <div class="kpi-sub">${this.pct(k.totalEspecializados, k.totalLocadores)} de locadores</div>
                        <div class="kpi-money purple">S/ ${fmt(k.montoEspecializados)}</div>
                    </div>
                </div>
            </section>
        `;
    }

    private static pct(value: number, total: number): string {
        return total ? `${Math.round((value / total) * 100)}%` : "0%";
    }

    private static donut(value: number, total: number, color: string): string {
        const p = total ? Math.round((value / total) * 100) : 0;

        return `
            <div class="donut" style="background:conic-gradient(${color} ${p * 3.6}deg,#e5e7eb 0deg);">
                <div>${p}%</div>
            </div>
        `;
    }
}