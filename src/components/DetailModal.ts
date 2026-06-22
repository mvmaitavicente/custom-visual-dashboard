import { RowData } from "../models/RowData";
import { escapeAttr, fmt } from "../utils/format";
import { GroupService } from "../services/GroupService";

export class DetailModal {
    public static render(
        title: string,
        rows: RowData[],
        search: string,
        page: number,
        pageSize: number
    ): string {
        const q = search.toLowerCase();

        const filtered = rows.filter(r =>
            !q ||
            [
                r.documento,
                r.nombre,
                r.tipoPersonal,
                r.area,
                r.cargo,
                r.profesion,
                r.unidadOrganica
            ].join(" ").toLowerCase().includes(q)
        );

        const pages = Math.max(1, Math.ceil(filtered.length / pageSize));
        const safePage = Math.min(page, pages);
        const start = (safePage - 1) * pageSize;
        const pageRows = filtered.slice(start, start + pageSize);

        return `
            <div class="modal-overlay">
                <div class="modal">
                    <div class="modal-head">
                        <div>
                            <div class="modal-title">Detalle de Distribución</div>
                            <div class="modal-sub">${title}</div>
                        </div>
                        <button class="modal-close" id="modalClose">×</button>
                    </div>

                    <div class="modal-toolbar">
                        <input id="modalSearch" class="modal-search" placeholder="Buscar en la tabla..." value="${escapeAttr(search)}" />
                        <div class="modal-total">Total de registros: ${fmt(filtered.length)}</div>
                    </div>

                    <div class="modal-table-wrap">
                        <table class="modal-table">
                            <thead>
                                <tr>
                                    <th>N°</th>
                                    <th>Documento</th>
                                    <th>Nombre</th>
                                    <th>Tipo Personal</th>
                                    <th>Área</th>
                                    <th>Cargo</th>
                                    <th>Profesión</th>
                                    <th>Unidad Orgánica</th>
                                    <th>Monto</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${pageRows.map((r, i) => `
                                    <tr>
                                        <td>${start + i + 1}</td>
                                        <td>${r.documento}</td>
                                        <td class="strong">${r.nombre}</td>
                                        <td>${r.tipoPersonal}</td>
                                        <td>${r.area}</td>
                                        <td>${r.cargo}</td>
                                        <td>${r.profesion}</td>
                                        <td>${r.unidadOrganica}</td>
                                        <td class="money">${GroupService.isCas(r) ? "-" : "S/ " + fmt(r.monto)}</td>
                                    </tr>
                                `).join("")}
                            </tbody>
                        </table>
                    </div>

                    <div class="modal-footer">
                        <div>Mostrando ${filtered.length === 0 ? 0 : start + 1} a ${Math.min(start + pageSize, filtered.length)} de ${filtered.length}</div>
                        <div class="pager">
                            <button id="prevPage" ${safePage <= 1 ? "disabled" : ""}>‹</button>
                            <span>Página ${safePage} de ${pages}</span>
                            <button id="nextPage" ${safePage >= pages ? "disabled" : ""}>›</button>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }
}