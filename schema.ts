import { int, mysqlEnum, mysqlTable, text, timestamp, varchar, decimal, date, index, uniqueIndex } from "drizzle-orm/mysql-core";

/**
 * ESQUEMA DE BASE DE DATOS - SISTEMA SAT-R
 * Modelo de estrella para análisis predictivo de recaudos municipales
 */

// ============================================================================
// TABLA DE USUARIOS (Auth)
// ============================================================================

export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// ============================================================================
// DIMENSIÓN: ENTIDADES TERRITORIALES
// ============================================================================

export const entidadesTerritoriales = mysqlTable("entidades_territoriales", {
  id: int("id").autoincrement().primaryKey(),
  
  // Identificadores
  codigoDivipola: varchar("codigo_divipola", { length: 10 }).notNull().unique(),
  nit: varchar("nit", { length: 20 }).notNull(),
  nombre: varchar("nombre", { length: 255 }).notNull(),
  
  // Clasificación geográfica
  tipoDivision: mysqlEnum("tipo_division", ["departamento", "distrito", "municipio"]).notNull(),
  codigoDepartamento: varchar("codigo_departamento", { length: 2 }),
  nombreDepartamento: varchar("nombre_departamento", { length: 100 }),
  
  // Tipología municipal (A: Consolidado, B: Emergente, C: Dependiente, D: Crítico)
  tipologia: mysqlEnum("tipologia", ["A", "B", "C", "D"]).notNull(),
  
  // Metadatos
  poblacion: int("poblacion"),
  categoriaFiscal: varchar("categoria_fiscal", { length: 20 }),
  
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  nitIdx: index("nit_idx").on(table.nit),
  tipologiaIdx: index("tipologia_idx").on(table.tipologia),
  departamentoIdx: index("departamento_idx").on(table.codigoDepartamento),
}));

export type EntidadTerritorial = typeof entidadesTerritoriales.$inferSelect;
export type InsertEntidadTerritorial = typeof entidadesTerritoriales.$inferInsert;

// ============================================================================
// DIMENSIÓN: CONCEPTOS TRIBUTARIOS
// ============================================================================

export const conceptosTributarios = mysqlTable("conceptos_tributarios", {
  id: int("id").autoincrement().primaryKey(),
  
  codigo: varchar("codigo", { length: 20 }).notNull().unique(),
  nombre: varchar("nombre", { length: 255 }).notNull(),
  categoria: varchar("categoria", { length: 100 }).notNull(),
  
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type ConceptoTributario = typeof conceptosTributarios.$inferSelect;
export type InsertConceptoTributario = typeof conceptosTributarios.$inferInsert;

// ============================================================================
// TABLA DE HECHOS: RECAUDOS HISTÓRICOS (y_real)
// ============================================================================

export const recaudosHistoricos = mysqlTable("recaudos_historicos", {
  id: int("id").autoincrement().primaryKey(),
  
  // Llaves foráneas
  entidadId: int("entidad_id").notNull(),
  conceptoId: int("concepto_id").notNull(),
  
  // Dimensión temporal
  fecha: date("fecha").notNull(),
  vigencia: int("vigencia").notNull(),
  mes: int("mes").notNull(),
  trimestre: int("trimestre").notNull(),
  
  // Métricas de recaudo
  valorRecaudo: decimal("valor_recaudo", { precision: 18, scale: 2 }).notNull(),
  numeroTransacciones: int("numero_transacciones").notNull().default(1),
  
  // Variables sintéticas (generadas por ETL)
  lag_1: decimal("lag_1", { precision: 18, scale: 2 }),
  lag_3: decimal("lag_3", { precision: 18, scale: 2 }),
  lag_6: decimal("lag_6", { precision: 18, scale: 2 }),
  lag_12: decimal("lag_12", { precision: 18, scale: 2 }),
  
  ma_3: decimal("ma_3", { precision: 18, scale: 2 }),
  ma_6: decimal("ma_6", { precision: 18, scale: 2 }),
  ma_12: decimal("ma_12", { precision: 18, scale: 2 }),
  
  // Variables dummy de festividades
  esFestividad: int("es_festividad").notNull().default(0),
  esFinDeSemana: int("es_fin_de_semana").notNull().default(0),
  
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  entidadFechaIdx: uniqueIndex("entidad_fecha_concepto_idx").on(table.entidadId, table.fecha, table.conceptoId),
  fechaIdx: index("fecha_idx").on(table.fecha),
  vigenciaIdx: index("vigencia_idx").on(table.vigencia),
}));

export type RecaudoHistorico = typeof recaudosHistoricos.$inferSelect;
export type InsertRecaudoHistorico = typeof recaudosHistoricos.$inferInsert;

// ============================================================================
// TABLA DE HECHOS: PREDICCIONES
// ============================================================================

export const predicciones = mysqlTable("predicciones", {
  id: int("id").autoincrement().primaryKey(),
  
  // Llaves foráneas
  entidadId: int("entidad_id").notNull(),
  conceptoId: int("concepto_id").notNull(),
  
  // Dimensión temporal
  fechaPrediccion: date("fecha_prediccion").notNull(),
  fechaGeneracion: timestamp("fecha_generacion").notNull().defaultNow(),
  horizonte: mysqlEnum("horizonte", ["diario", "semanal", "mensual", "bimensual"]).notNull(),
  
  // Predicciones de modelos individuales
  yPredXgboost: decimal("y_pred_xgboost", { precision: 18, scale: 2 }).notNull(),
  yPredLstm: decimal("y_pred_lstm", { precision: 18, scale: 2 }).notNull(),
  
  // Predicción del ensamble
  yPredEnsemble: decimal("y_pred_ensemble", { precision: 18, scale: 2 }).notNull(),
  
  // Intervalos de confianza del 95%
  limiteInferior: decimal("limite_inferior", { precision: 18, scale: 2 }).notNull(),
  limiteSuperior: decimal("limite_superior", { precision: 18, scale: 2 }).notNull(),
  
  // Metadatos del modelo
  versionModelo: varchar("version_modelo", { length: 50 }).notNull(),
  
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  entidadFechaIdx: uniqueIndex("pred_entidad_fecha_horizonte_idx").on(table.entidadId, table.fechaPrediccion, table.horizonte, table.conceptoId),
  fechaPredIdx: index("fecha_pred_idx").on(table.fechaPrediccion),
}));

export type Prediccion = typeof predicciones.$inferSelect;
export type InsertPrediccion = typeof predicciones.$inferInsert;

// ============================================================================
// TABLA DE HECHOS: KPIs HISTÓRICOS
// ============================================================================

export const kpisHistoricos = mysqlTable("kpis_historicos", {
  id: int("id").autoincrement().primaryKey(),
  
  // Llaves foráneas
  entidadId: int("entidad_id").notNull(),
  
  // Dimensión temporal
  fecha: date("fecha").notNull(),
  periodoCalculo: mysqlEnum("periodo_calculo", ["diario", "semanal", "mensual", "bimensual"]).notNull(),
  
  // KPI 1: Índice de Eficiencia Predictiva (IEP)
  iep: decimal("iep", { precision: 10, scale: 4 }),
  
  // KPI 2: MAPE (Mean Absolute Percentage Error)
  mapeGlobal: decimal("mape_global", { precision: 10, scale: 4 }),
  mapeLocal: decimal("mape_local", { precision: 10, scale: 4 }),
  
  // KPI 3: Semáforo de Riesgo Fiscal
  semaforoRiesgo: mysqlEnum("semaforo_riesgo", ["verde", "amarillo", "rojo"]).notNull(),
  
  // Valores para cálculo
  recaudoReal: decimal("recaudo_real", { precision: 18, scale: 2 }),
  recaudoPronosticado: decimal("recaudo_pronosticado", { precision: 18, scale: 2 }),
  brechaRecaudo: decimal("brecha_recaudo", { precision: 18, scale: 2 }),
  
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  entidadFechaIdx: uniqueIndex("kpi_entidad_fecha_periodo_idx").on(table.entidadId, table.fecha, table.periodoCalculo),
  semaforoIdx: index("semaforo_idx").on(table.semaforoRiesgo),
  fechaIdx: index("kpi_fecha_idx").on(table.fecha),
}));

export type KpiHistorico = typeof kpisHistoricos.$inferSelect;
export type InsertKpiHistorico = typeof kpisHistoricos.$inferInsert;

// ============================================================================
// TABLA DE EVENTOS: MODEL DRIFT
// ============================================================================

export const eventosModelDrift = mysqlTable("eventos_model_drift", {
  id: int("id").autoincrement().primaryKey(),
  
  // Contexto
  entidadId: int("entidad_id").notNull(),
  fecha: date("fecha").notNull(),
  
  // Métricas de drift
  divergencia: decimal("divergencia", { precision: 10, scale: 4 }).notNull(),
  umbralSuperado: int("umbral_superado").notNull().default(0),
  
  // Tipo de alerta
  severidad: mysqlEnum("severidad", ["bajo", "medio", "alto", "critico"]).notNull(),
  
  // Acciones tomadas
  reentrenamientoRequerido: int("reentrenamiento_requerido").notNull().default(0),
  reentrenamientoRealizado: int("reentrenamiento_realizado").notNull().default(0),
  fechaReentrenamiento: timestamp("fecha_reentrenamiento"),
  
  // Detalles
  detalles: text("detalles"),
  
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  entidadFechaIdx: index("drift_entidad_fecha_idx").on(table.entidadId, table.fecha),
  severidadIdx: index("severidad_idx").on(table.severidad),
}));

export type EventoModelDrift = typeof eventosModelDrift.$inferSelect;
export type InsertEventoModelDrift = typeof eventosModelDrift.$inferInsert;

// ============================================================================
// TABLA DE CONFIGURACIÓN: FESTIVIDADES
// ============================================================================

export const festividades = mysqlTable("festividades", {
  id: int("id").autoincrement().primaryKey(),
  
  // Contexto geográfico (null = nacional)
  entidadId: int("entidad_id"),
  ambito: mysqlEnum("ambito", ["nacional", "departamental", "municipal"]).notNull(),
  
  // Información de la festividad
  nombre: varchar("nombre", { length: 255 }).notNull(),
  fecha: date("fecha").notNull(),
  
  // Metadatos
  esMovil: int("es_movil").notNull().default(0),
  descripcion: text("descripcion"),
  
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  fechaIdx: index("festividad_fecha_idx").on(table.fecha),
  entidadIdx: index("festividad_entidad_idx").on(table.entidadId),
}));

export type Festividad = typeof festividades.$inferSelect;
export type InsertFestividad = typeof festividades.$inferInsert;
