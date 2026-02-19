import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Loader2, Upload, CheckCircle2, XCircle, AlertCircle } from "lucide-react";
import { toast } from "sonner";

export function DataLoader() {
  const [isPolling, setIsPolling] = useState(false);

  // Mutation para iniciar procesamiento
  const startProcessing = trpc.etl.startProcessing.useMutation({
    onSuccess: (data) => {
      if (data.success) {
        toast.success("Procesamiento iniciado");
        setIsPolling(true);
      } else {
        toast.error(data.message);
      }
    },
    onError: (error) => {
      toast.error(`Error: ${error.message}`);
    },
  });

  // Query para obtener estado (polling cada 2 segundos cuando está activo)
  const { data: statusData, refetch } = trpc.etl.getStatus.useQuery(undefined, {
    enabled: isPolling,
    refetchInterval: isPolling ? 2000 : false,
  });

  // Mutation para cancelar procesamiento
  const cancelProcessing = trpc.etl.cancelProcessing.useMutation({
    onSuccess: () => {
      toast.info("Procesamiento cancelado");
      setIsPolling(false);
    },
  });

  // Detener polling cuando el proceso termina
  useEffect(() => {
    if (statusData?.status && !statusData.status.isRunning && isPolling) {
      setIsPolling(false);
      if (statusData.status.error) {
        toast.error("Procesamiento fallido");
      } else if (statusData.status.progress === 100) {
        toast.success("Procesamiento completado exitosamente");
      }
    }
  }, [statusData, isPolling]);

  const status = statusData?.status;
  const isRunning = status?.isRunning ?? false;
  const progress = status?.progress ?? 0;
  const message = status?.message ?? "Esperando inicio";
  const error = status?.error;
  const recordsProcessed = status?.recordsProcessed ?? 0;
  const totalRecords = status?.totalRecords ?? 0;

  const handleStart = () => {
    startProcessing.mutate({
      filePath: "/home/ubuntu/upload/BaseRentasCedidas.xlsx",
      // nrows: 10000, // Descomentar para procesar solo 10,000 registros (testing)
    });
  };

  const handleCancel = () => {
    cancelProcessing.mutate();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Upload className="h-5 w-5" />
          Carga de Datos Completos
        </CardTitle>
        <CardDescription>
          Procesar el archivo completo BaseRentasCedidas.xlsx con todos los datos históricos
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Estado actual */}
        {status && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium">Estado:</span>
              <span className="flex items-center gap-2">
                {isRunning && <Loader2 className="h-4 w-4 animate-spin text-blue-500" />}
                {!isRunning && progress === 100 && <CheckCircle2 className="h-4 w-4 text-green-500" />}
                {!isRunning && error && <XCircle className="h-4 w-4 text-red-500" />}
                {message}
              </span>
            </div>

            {totalRecords > 0 && (
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium">Registros:</span>
                <span>
                  {recordsProcessed.toLocaleString()} / {totalRecords.toLocaleString()}
                </span>
              </div>
            )}

            {status.startedAt && (
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium">Iniciado:</span>
                <span>{new Date(status.startedAt).toLocaleString()}</span>
              </div>
            )}

            {status.completedAt && (
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium">Completado:</span>
                <span>{new Date(status.completedAt).toLocaleString()}</span>
              </div>
            )}
          </div>
        )}

        {/* Barra de progreso */}
        {isRunning && (
          <div className="space-y-2">
            <Progress value={progress} className="h-2" />
            <p className="text-sm text-center text-muted-foreground">{progress}%</p>
          </div>
        )}

        {/* Alerta de error */}
        {error && !isRunning && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error en el procesamiento</AlertTitle>
            <AlertDescription className="text-sm font-mono">{error}</AlertDescription>
          </Alert>
        )}

        {/* Alerta de éxito */}
        {!isRunning && progress === 100 && !error && (
          <Alert className="border-green-500 bg-green-50 text-green-900">
            <CheckCircle2 className="h-4 w-4 text-green-600" />
            <AlertTitle>Procesamiento completado</AlertTitle>
            <AlertDescription>
              Los datos se han cargado exitosamente en la base de datos.
            </AlertDescription>
          </Alert>
        )}

        {/* Botones de acción */}
        <div className="flex gap-2">
          <Button
            onClick={handleStart}
            disabled={isRunning || startProcessing.isPending}
            className="flex-1"
          >
            {startProcessing.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isRunning ? "Procesando..." : "Iniciar Carga Completa"}
          </Button>

          {isRunning && (
            <Button
              onClick={handleCancel}
              variant="destructive"
              disabled={cancelProcessing.isPending}
            >
              {cancelProcessing.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Cancelar
            </Button>
          )}
        </div>

        {/* Información adicional */}
        <div className="text-xs text-muted-foreground space-y-1">
          <p>• El procesamiento puede tardar entre 30-45 minutos para el dataset completo</p>
          <p>• Los datos se cargarán en la base de datos MySQL/TiDB</p>
          <p>• Puedes cerrar esta ventana, el proceso continuará en segundo plano</p>
        </div>
      </CardContent>
    </Card>
  );
}
