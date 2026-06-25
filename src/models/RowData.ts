import powerbi from "powerbi-visuals-api";

export interface RowData {
    documento: string;
    tipoPersonal: string;
    area: string;
    equipoTrabajo: string;
    cargo: string;
    profesion: string;
    nombre: string;
    monto: number;
    fechaInicio: string;
    fechaFin: string;
    anioIngreso: string;
    tipoDocumento?: string;
    tipoContratacion?: string;
    fechaOrden?: string;
    vigenciaContrato?: string;
    nroOs?: string;
    armada?: string;
    montoOrden?: string;
    situacionActualLicencia?: string;
    tituloProfesional?: string;
    maestriaDoctorado?: string;
    diplomados?: string;
    cursos?: string;
    nivel?: string;
    experienciaGeneral?: string;
    experienciaEspecifica?: string;
    objetoContratacion?: string;
    actividadRelevante?: string;
    observacion?: string;
    vencenHastaEl?: string;
    selectionId?: powerbi.extensibility.ISelectionId;
    [key: string]: string | number | powerbi.extensibility.ISelectionId | undefined;
}
