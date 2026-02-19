// Type definitions for real data from BaseRentasCedidas.xlsx

export interface Entidad {
    id: number;
    nit: string;
    nombre: string;
    tipologia: 'A' | 'B' | 'C' | 'D';
    tipo_division: string;
    departamento: string;
    recaudo_total: number;
    num_transacciones: number;
}

export interface RecaudoDiario {
    entidad_id: number;
    fecha: string;
    valor_total: number;
    num_transacciones: number;
}

export interface Concepto {
    id: number;
    codigo: string;
    nombre: string;
    recaudo_total: number;
    num_registros: number;
}

export interface ResumenMensual {
    entidad_id: number;
    mes: string;
    valor_total: number;
    num_transacciones: number;
}

export interface ResumenGlobal {
    mes: string;
    valor_total: number;
    num_transacciones: number;
    num_entidades: number;
}

export interface RecaudoConceptoMes {
    mes: string;
    concepto: string;
    valor_total: number;
}

export interface Metadata {
    total_registros: number;
    total_entidades: number;
    total_conceptos: number;
    fecha_min: string;
    fecha_max: string;
    recaudo_total_global: number;
    generado: string;
}

export interface DashboardData {
    metadata: Metadata;
    entidades: Entidad[];
    conceptos: Concepto[];
    recaudos_diarios: RecaudoDiario[];
    resumen_mensual: ResumenMensual[];
    resumen_global: ResumenGlobal[];
    recaudos_concepto_mes: RecaudoConceptoMes[];
    top_entidades: Entidad[];
}

export type Tipologia = 'A' | 'B' | 'C' | 'D' | 'all';

export const TIPOLOGIA_LABELS: Record<string, string> = {
    A: 'Consolidado',
    B: 'Emergente',
    C: 'Dependiente',
    D: 'Crítico',
};
