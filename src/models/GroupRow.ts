import { RowData } from "./RowData";

export type Mode = "area" | "profesionCargo";

export interface GroupRow {
    id: string;
    label: string;
    source: string;

    casRows: RowData[];
    locadorRows: RowData[];
    generalRows: RowData[];
    especializadoRows: RowData[];

    casCount: number;
    locadorTotalCount: number;
    locadorGeneralCount: number;
    locadorEspecializadoCount: number;
    totalCount: number;

    locadorTotalMonto: number;
    locadorGeneralMonto: number;
    locadorEspecializadoMonto: number;
    totalMonto: number;
}
