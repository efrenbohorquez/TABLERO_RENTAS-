import { z } from "zod";
import { publicProcedure, router } from "./_core/trpc";
import { spawn } from "child_process";
import path from "path";

// Estado global del proceso ETL (en producción usar Redis o BD)
let etlStatus: {
  isRunning: boolean;
  progress: number;
  message: string;
  error: string | null;
  startedAt: Date | null;
  completedAt: Date | null;
  recordsProcessed: number;
  totalRecords: number;
} = {
  isRunning: false,
  progress: 0,
  message: "Esperando inicio",
  error: null,
  startedAt: null,
  completedAt: null,
  recordsProcessed: 0,
  totalRecords: 0,
};

export const etlRouter = router({
  /**
   * Iniciar procesamiento asíncrono del dataset completo
   */
  startProcessing: publicProcedure
    .input(
      z.object({
        filePath: z.string().default("/home/ubuntu/upload/BaseRentasCedidas.xlsx"),
        nrows: z.number().optional(), // Si se especifica, procesa solo N filas (para testing)
      })
    )
    .mutation(async ({ input }) => {
      // Verificar si ya hay un proceso en ejecución
      if (etlStatus.isRunning) {
        return {
          success: false,
          message: "Ya hay un proceso ETL en ejecución",
          status: etlStatus,
        };
      }

      // Reiniciar estado
      etlStatus = {
        isRunning: true,
        progress: 0,
        message: "Iniciando procesamiento...",
        error: null,
        startedAt: new Date(),
        completedAt: null,
        recordsProcessed: 0,
        totalRecords: 0,
      };

      // Ejecutar script Python en background
      const scriptPath = path.join(process.cwd(), "scripts/etl/etl_pipeline.py");
      const pythonProcess = spawn("python3.11", [
        "-c",
        `
import sys
sys.path.append('${process.cwd()}')
from scripts.etl.etl_pipeline import ETLPipeline
import os

pipeline = ETLPipeline(os.environ['DATABASE_URL'])
pipeline.run('${input.filePath}'${input.nrows ? `, nrows=${input.nrows}` : ""})
print("ETL_COMPLETE")
        `,
      ]);

      // Capturar salida del proceso
      pythonProcess.stdout.on("data", (data) => {
        const output = data.toString();
        console.log("[ETL]", output);

        // Parsear progreso del output
        if (output.includes("Procesando")) {
          etlStatus.message = output.trim();
        }
        if (output.includes("registros procesados")) {
          const match = output.match(/(\d+)\/(\d+) registros procesados/);
          if (match) {
            etlStatus.recordsProcessed = parseInt(match[1]);
            etlStatus.totalRecords = parseInt(match[2]);
            etlStatus.progress = Math.floor(
              (etlStatus.recordsProcessed / etlStatus.totalRecords) * 100
            );
          }
        }
        if (output.includes("ETL_COMPLETE")) {
          etlStatus.isRunning = false;
          etlStatus.progress = 100;
          etlStatus.message = "Procesamiento completado exitosamente";
          etlStatus.completedAt = new Date();
        }
      });

      pythonProcess.stderr.on("data", (data) => {
        const error = data.toString();
        console.error("[ETL Error]", error);
        etlStatus.error = error;
      });

      pythonProcess.on("close", (code) => {
        if (code !== 0 && etlStatus.isRunning) {
          etlStatus.isRunning = false;
          etlStatus.error = `Proceso terminó con código ${code}`;
          etlStatus.message = "Error en el procesamiento";
        }
      });

      return {
        success: true,
        message: "Procesamiento iniciado",
        status: etlStatus,
      };
    }),

  /**
   * Obtener estado actual del procesamiento ETL
   */
  getStatus: publicProcedure.query(() => {
    return {
      success: true,
      status: etlStatus,
    };
  }),

  /**
   * Cancelar procesamiento en curso
   */
  cancelProcessing: publicProcedure.mutation(() => {
    if (!etlStatus.isRunning) {
      return {
        success: false,
        message: "No hay ningún proceso en ejecución",
      };
    }

    // En producción, aquí se mataría el proceso Python
    etlStatus.isRunning = false;
    etlStatus.message = "Procesamiento cancelado por el usuario";
    etlStatus.error = "Cancelado";

    return {
      success: true,
      message: "Procesamiento cancelado",
      status: etlStatus,
    };
  }),
});
