export class HeaderSection {
    public static render(): string {
        return `
            <header class="report-header">

                <div class="brand-left">
                    <img
                        class="minedu-img"
                        src="./assets/MINEDU.png"
                        alt="Ministerio de Educación"
                    />
                </div>

                <div class="brand-right">

                    <div class="pronied-title">
                        <span class="pronied-logo">
                            PRONIED
                        </span>

                        <span class="brand-divider"></span>

                        <span class="pronied-text">
                            Programa Nacional de Infraestructura Educativa
                        </span>

                    </div>

                </div>

            </header>
        `;
    }
}