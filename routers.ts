import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { z } from "zod";
import * as db from "./db";
import { etlRouter } from "./etl";

export const appRouter = router({
  system: systemRouter,
  etl: etlRouter,
  
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),

  // ============================================================================
  // ENTIDADES TERRITORIALES
  // ============================================================================
  entidades: router({
    // Listar todas las entidades
    list: publicProcedure
      .input(z.object({
        tipologia: z.enum(["A", "B", "C", "D"]).optional(),
        limit: z.number().min(1).max(100).default(50),
        offset: z.number().min(0).default(0),
      }))
      .query(async ({ input }) => {
        if (input.tipologia) {
          return await db.getEntidadesByTipologia(input.tipologia);
        }
        return await db.getAllEntidades();
      }),

    // Obtener una entidad por ID
    getById: publicProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        return await db.getEntidadById(input.id);
      }),


  }),

  // ============================================================================
  // RECAUDOS HISTÓRICOS
  // ============================================================================
  recaudos: router({
    // Obtener recaudos por entidad y rango de fechas
    getByEntidad: publicProcedure
      .input(z.object({
        entidadId: z.number(),
        fechaInicio: z.string(),
        fechaFin: z.string(),
        conceptoId: z.number().optional(),
      }))
      .query(async ({ input }) => {
        return await db.getRecaudosByEntidad(
          input.entidadId,
          input.fechaInicio,
          input.fechaFin
        );
      }),

    // Recaudos agregados por fecha (para gráficos de series de tiempo)
    agregadoPorFecha: publicProcedure
      .input(z.object({
        entidadId: z.number(),
        fechaInicio: z.string(),
        fechaFin: z.string(),
      }))
      .query(async ({ input }) => {
        return await db.getRecaudoAgregadoPorFecha(
          input.entidadId,
          input.fechaInicio,
          input.fechaFin
        );
      }),

    // Top entidades por recaudo (implementación simplificada)
    topEntidades: publicProcedure
      .input(z.object({
        limit: z.number().min(1).max(50).default(10),
      }))
      .query(async ({ input }) => {
        const entidades = await db.getAllEntidades();
        return entidades.slice(0, input.limit);
      }),
  }),

  // ============================================================================
  // PREDICCIONES
  // ============================================================================
  predicciones: router({
    // Obtener predicciones por entidad
    getByEntidad: publicProcedure
      .input(z.object({
        entidadId: z.number(),
        horizonte: z.enum(["diario", "semanal", "mensual", "bimensual"]).optional(),
        limit: z.number().min(1).max(100).default(30),
      }))
      .query(async ({ input }) => {
        return await db.getPrediccionesByEntidad(
          input.entidadId,
          input.horizonte || "mensual"
        );
      }),


  }),

  // ============================================================================
  // KPIs
  // ============================================================================
  kpis: router({
    // Obtener KPIs por entidad
    getByEntidad: publicProcedure
      .input(z.object({
        entidadId: z.number(),
        periodoCalculo: z.enum(["diario", "semanal", "mensual", "bimensual"]).optional(),
        limit: z.number().min(1).max(100).default(30),
      }))
      .query(async ({ input }) => {
        return await db.getKpisByEntidad(
          input.entidadId,
          input.periodoCalculo || "mensual"
        );
      }),

    // KPI más reciente por entidad
    ultimoPorEntidad: publicProcedure
      .input(z.object({
        entidadId: z.number(),
        periodoCalculo: z.enum(["diario", "semanal", "mensual", "bimensual"]),
      }))
      .query(async ({ input }) => {
        return await db.getUltimoKpiPorEntidad(input.entidadId, input.periodoCalculo);
      }),

    // Entidades por semáforo
    porSemaforo: publicProcedure
      .input(z.object({
        semaforo: z.enum(["verde", "amarillo", "rojo"]),
        periodoCalculo: z.enum(["diario", "semanal", "mensual", "bimensual"]),
      }))
      .query(async ({ input }) => {
        return await db.getEntidadesPorSemaforo(
          input.semaforo,
          input.periodoCalculo
        );
      }),

    // Resumen global de KPIs
    resumenGlobal: publicProcedure
      .input(z.object({
        periodoCalculo: z.enum(["diario", "semanal", "mensual", "bimensual"]).default("mensual"),
      }))
      .query(async ({ input }) => {
        const verde = await db.getEntidadesPorSemaforo("verde", input.periodoCalculo);
        const amarillo = await db.getEntidadesPorSemaforo("amarillo", input.periodoCalculo);
        const rojo = await db.getEntidadesPorSemaforo("rojo", input.periodoCalculo);
        
        return {
          verde: verde.length,
          amarillo: amarillo.length,
          rojo: rojo.length,
          total: verde.length + amarillo.length + rojo.length,
        };
      }),
  }),

  // ============================================================================
  // MODEL DRIFT
  // ============================================================================
  drift: router({
    // Obtener eventos de drift
    getEventos: publicProcedure
      .input(z.object({
        entidadId: z.number().optional(),
        severidad: z.enum(["bajo", "medio", "alto", "critico"]).optional(),
        limit: z.number().min(1).max(100).default(20),
      }))
      .query(async ({ input }) => {
        if (input.entidadId) {
          return await db.getEventosDriftByEntidad(input.entidadId);
        }
        return await db.getEventosDriftPendientes();
      }),

    // Estadísticas de drift
    estadisticas: publicProcedure
      .query(async () => {
        const eventos = await db.getEventosDriftPendientes();
        
        const porSeveridad = {
          bajo: eventos.filter(e => e.severidad === "bajo").length,
          medio: eventos.filter(e => e.severidad === "medio").length,
          alto: eventos.filter(e => e.severidad === "alto").length,
          critico: eventos.filter(e => e.severidad === "critico").length,
        };

        const reentrenamientosRequeridos = eventos.filter(
          e => e.reentrenamientoRequerido === 1
        ).length;

        return {
          total: eventos.length,
          porSeveridad,
          reentrenamientosRequeridos,
          tasaDrift: eventos.length > 0 
            ? (reentrenamientosRequeridos / eventos.length) * 100 
            : 0,
        };
      }),
  }),

  // ============================================================================
  // DASHBOARD - Datos agregados para visualización
  // ============================================================================
  dashboard: router({
    // Resumen ejecutivo
    resumenEjecutivo: publicProcedure
      .query(async () => {
        const totalEntidades = await db.getAllEntidades();
        const kpisResumen = await db.getEntidadesPorSemaforo("verde", "mensual");
        
        // Calcular recaudo total (últimos 30 días)
        const fechaFin = new Date().toISOString().split('T')[0];
        const fechaInicio = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
          .toISOString().split('T')[0];
        
        const recaudoTotal = 0; // Placeholder - calcular desde recaudos reales

        return {
          totalEntidades: totalEntidades.length,
          recaudoTotal,
          entidadesMonitoreadas: kpisResumen.length,
          periodoActual: {
            inicio: fechaInicio,
            fin: fechaFin,
          },
        };
      }),

    // Datos para gráfico de tendencia temporal
    tendenciaTemporal: publicProcedure
      .input(z.object({
        entidadId: z.number().optional(),
        dias: z.number().min(7).max(365).default(90),
      }))
      .query(async ({ input }) => {
        const fechaFin = new Date().toISOString().split('T')[0];
        const fechaInicio = new Date(Date.now() - input.dias * 24 * 60 * 60 * 1000)
          .toISOString().split('T')[0];

        if (input.entidadId) {
          return await db.getRecaudoAgregadoPorFecha(
            input.entidadId,
            fechaInicio,
            fechaFin
          );
        }

        // Si no hay entidad específica, retornar todas
        const entidades = await db.getAllEntidades();
        return entidades.slice(0, 5);
      }),
  }),

  // ============================================================================
  // CONCEPTOS TRIBUTARIOS
  // ============================================================================
  conceptos: router({
    list: publicProcedure
      .query(async () => {
        return await db.getAllConceptos();
      }),
  }),
});

export type AppRouter = typeof appRouter;
