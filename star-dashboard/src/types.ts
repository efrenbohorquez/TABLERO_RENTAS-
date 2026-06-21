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
    promedio_mensual?: number;
    cv_porcentaje?: number;
    mes_max_recaudo?: string;
    concepto_principal?: string;
    crecimiento_yoy?: number;
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
    promedio_mensual_global?: number;
    cv_global?: number;
    mes_max_global?: string;
    concepto_principal_global?: string;
    crecimiento_yoy_global?: number;
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
    xgboost_forecast?: XGBoostForecast[];
    cv_metrics?: CVMetrics;
}

export interface XGBoostForecast {
    mes: string;
    mean: number;
    lower: number;
    upper: number;
}

export interface CVMetrics {
    rmse: number;
    mae: number;
    r2_train: number;
    folds: {
        fold: number;
        rmse: number;
        mae: number;
    }[];
}

export type Tipologia = 'A' | 'B' | 'C' | 'D' | 'E' | 'all';

export const TIPOLOGIA_LABELS: Record<string, string> = {
    A: 'Consolidados',
    B: 'Emergentes',
    C: 'Dependientes',
    D: 'Críticos',
    E: 'Entid. Descentralizadas',
};
