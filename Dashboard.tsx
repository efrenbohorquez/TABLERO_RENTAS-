import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { DataLoader } from "@/components/DataLoader";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle, 
  CheckCircle2, 
  XCircle,
  Building2,
  DollarSign,
  Activity,
  BarChart3
} from "lucide-react";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

/**
 * Dashboard Ejecutivo - Sistema SAT-R
 * 
 * Características:
 * - Selector de contexto (Departamento, Municipio, Tipología)
 * - KPIs críticos con semáforo de riesgo fiscal
 * - Gráficos de series de tiempo (Real vs Pronosticado)
 * - Visualización de predicciones con intervalos de confianza
 * - Monitoreo de Model Drift
 */

const COLORES_SEMAFORO = {
  verde: "#10b981",
  amarillo: "#f59e0b",
  rojo: "#ef4444",
};

const TIPOLOGIA_LABELS = {
  A: "Consolidado",
  B: "Emergente",
  C: "Dependiente",
  D: "Crítico",
};

export default function Dashboard() {
  const [selectedEntidad, setSelectedEntidad] = useState<number | null>(null);
  const [selectedTipologia, setSelectedTipologia] = useState<"A" | "B" | "C" | "D" | "all">("all");
  const [selectedDepartamento, setSelectedDepartamento] = useState<string | null>(null);

  // Queries
  const { data: entidades, isLoading: loadingEntidades } = trpc.entidades.list.useQuery({
    tipologia: selectedTipologia === "all" ? undefined : selectedTipologia,
    limit: 100,
  });

  const { data: resumenEjecutivo, isLoading: loadingResumen } = trpc.dashboard.resumenEjecutivo.useQuery();

  const { data: kpisResumen } = trpc.kpis.resumenGlobal.useQuery({
    periodoCalculo: "mensual",
  });

  const { data: recaudos } = trpc.recaudos.agregadoPorFecha.useQuery(
    {
      entidadId: selectedEntidad!,
      fechaInicio: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      fechaFin: new Date().toISOString().split('T')[0],
    },
    { enabled: !!selectedEntidad }
  );

  const { data: predicciones } = trpc.predicciones.getByEntidad.useQuery(
    {
      entidadId: selectedEntidad!,
      horizonte: "mensual",
      limit: 30,
    },
    { enabled: !!selectedEntidad }
  );

  const { data: kpis } = trpc.kpis.getByEntidad.useQuery(
    {
      entidadId: selectedEntidad!,
      periodoCalculo: "mensual",
      limit: 12,
    },
    { enabled: !!selectedEntidad }
  );

  const { data: driftStats } = trpc.drift.estadisticas.useQuery();

  // Formatear datos para gráficos
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const formatDate = (dateString: string | Date) => {
    const date = typeof dateString === 'string' ? new Date(dateString) : dateString;
    return date.toLocaleDateString('es-CO', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  // Datos para gráfico de semáforo
  const semaforoData = kpisResumen ? [
    { name: 'Verde', value: kpisResumen.verde, color: COLORES_SEMAFORO.verde },
    { name: 'Amarillo', value: kpisResumen.amarillo, color: COLORES_SEMAFORO.amarillo },
    { name: 'Rojo', value: kpisResumen.rojo, color: COLORES_SEMAFORO.rojo },
  ] : [];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-card">
        <div className="container py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">
                Sistema de Alerta Temprana y Recomendaciones
              </h1>
              <p className="text-muted-foreground mt-1">
                Pronóstico de Recaudos Municipales - Rentas Cedidas
              </p>
            </div>
            <Badge variant="outline" className="text-sm">
              Datos Reales 2020
            </Badge>
          </div>
        </div>
      </div>

      <div className="container py-8">
        {/* Selector de Contexto */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Selector de Contexto</CardTitle>
            <CardDescription>
              Filtra por Departamento, Municipio o Tipología Municipal
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Tipología */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Tipología Municipal</label>
                <Select
                  value={selectedTipologia}
                  onValueChange={(value) => setSelectedTipologia(value as any)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas</SelectItem>
                    <SelectItem value="A">A - Consolidado</SelectItem>
                    <SelectItem value="B">B - Emergente</SelectItem>
                    <SelectItem value="C">C - Dependiente</SelectItem>
                    <SelectItem value="D">D - Crítico</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Entidad */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Entidad Territorial</label>
                <Select
                  value={selectedEntidad?.toString() || ""}
                  onValueChange={(value) => setSelectedEntidad(value ? parseInt(value) : null)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar entidad..." />
                  </SelectTrigger>
                  <SelectContent>
                    {loadingEntidades ? (
                      <SelectItem value="loading" disabled>Cargando...</SelectItem>
                    ) : (
                      entidades?.map((entidad) => (
                        <SelectItem key={entidad.id} value={entidad.id.toString()}>
                          {entidad.nombre} ({entidad.tipologia})
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>

              {/* Info de selección */}
              <div className="flex items-end">
                {selectedEntidad && entidades && (
                  <div className="text-sm">
                    <p className="text-muted-foreground">Entidad seleccionada:</p>
                    <p className="font-medium">
                      {entidades.find(e => e.id === selectedEntidad)?.nombre}
                    </p>
                    <Badge className={`badge-tipologia-${entidades.find(e => e.id === selectedEntidad)?.tipologia.toLowerCase()}`}>
                      Tipología {entidades.find(e => e.id === selectedEntidad)?.tipologia}
                    </Badge>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* KPIs Principales */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Entidades Monitoreadas
              </CardTitle>
              <Building2 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {loadingResumen ? (
                <Skeleton className="h-8 w-24" />
              ) : (
                <>
                  <div className="text-2xl font-bold">{resumenEjecutivo?.totalEntidades || 0}</div>
                  <p className="text-xs text-muted-foreground">
                    Departamentos y municipios
                  </p>
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Recaudo Total
              </CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {loadingResumen ? (
                <Skeleton className="h-8 w-32" />
              ) : (
                <>
                  <div className="text-2xl font-bold">
                    {formatCurrency(resumenEjecutivo?.recaudoTotal || 0)}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Últimos 30 días
                  </p>
                </>
              )}
            </CardContent>
          </Card>

          <Card className="semaforo-verde">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Semáforo Verde
              </CardTitle>
              <CheckCircle2 className="h-4 w-4" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{kpisResumen?.verde || 0}</div>
              <p className="text-xs">
                Recaudo dentro del pronóstico
              </p>
            </CardContent>
          </Card>

          <Card className="semaforo-rojo">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Semáforo Rojo
              </CardTitle>
              <XCircle className="h-4 w-4" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{kpisResumen?.rojo || 0}</div>
              <p className="text-xs">
                Riesgo fiscal crítico
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Tabs de Visualización */}
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList>
            <TabsTrigger value="overview">Resumen General</TabsTrigger>
            <TabsTrigger value="timeseries">Series de Tiempo</TabsTrigger>
            <TabsTrigger value="predictions">Predicciones</TabsTrigger>
            <TabsTrigger value="drift">Model Drift</TabsTrigger>
          </TabsList>

          {/* Tab: Resumen General */}
          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Gráfico de Semáforo */}
              <Card>
                <CardHeader>
                  <CardTitle>Distribución por Semáforo de Riesgo</CardTitle>
                  <CardDescription>
                    Estado fiscal de entidades territoriales
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={semaforoData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={(entry) => `${entry.name}: ${entry.value}`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {semaforoData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Estadísticas de Drift */}
              <Card>
                <CardHeader>
                  <CardTitle>Monitoreo de Model Drift</CardTitle>
                  <CardDescription>
                    Detección de divergencias en predicciones
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {driftStats ? (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Total eventos</span>
                        <span className="text-2xl font-bold">{driftStats.total}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Reentrenamientos requeridos</span>
                        <span className="text-2xl font-bold text-orange-600">
                          {driftStats.reentrenamientosRequeridos}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Tasa de drift</span>
                        <span className="text-2xl font-bold">
                          {driftStats.tasaDrift.toFixed(1)}%
                        </span>
                      </div>
                      <div className="pt-4 border-t">
                        <p className="text-xs text-muted-foreground mb-2">Por severidad:</p>
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          <div>Bajo: {driftStats.porSeveridad.bajo}</div>
                          <div>Medio: {driftStats.porSeveridad.medio}</div>
                          <div>Alto: {driftStats.porSeveridad.alto}</div>
                          <div>Crítico: {driftStats.porSeveridad.critico}</div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <Skeleton className="h-48" />
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Tab: Series de Tiempo */}
          <TabsContent value="timeseries" className="space-y-6">
            {!selectedEntidad ? (
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Selecciona una entidad</AlertTitle>
                <AlertDescription>
                  Por favor selecciona una entidad territorial para visualizar sus series de tiempo
                </AlertDescription>
              </Alert>
            ) : (
              <Card>
                <CardHeader>
                  <CardTitle>Recaudos Históricos</CardTitle>
                  <CardDescription>
                    Evolución del recaudo en los últimos 90 días
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {recaudos && recaudos.length > 0 ? (
                    <ResponsiveContainer width="100%" height={400}>
                      <LineChart data={recaudos}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis 
                          dataKey="fecha" 
                          tickFormatter={(value) => formatDate(value)}
                        />
                        <YAxis 
                          tickFormatter={(value) => formatCurrency(value)}
                        />
                        <Tooltip 
                          formatter={(value: any) => formatCurrency(parseFloat(value))}
                          labelFormatter={(label) => formatDate(label)}
                        />
                        <Legend />
                        <Line 
                          type="monotone" 
                          dataKey="valorTotal" 
                          stroke="#3b82f6" 
                          name="Recaudo Total"
                          strokeWidth={2}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-64 flex items-center justify-center text-muted-foreground">
                      No hay datos disponibles para esta entidad
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Tab: Predicciones */}
          <TabsContent value="predictions" className="space-y-6">
            {!selectedEntidad ? (
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Selecciona una entidad</AlertTitle>
                <AlertDescription>
                  Por favor selecciona una entidad territorial para visualizar sus predicciones
                </AlertDescription>
              </Alert>
            ) : predicciones && predicciones.length > 0 ? (
              <Card>
                <CardHeader>
                  <CardTitle>Pronósticos Multi-Horizonte</CardTitle>
                  <CardDescription>
                    Predicciones XGBoost, LSTM y Ensemble con intervalos de confianza 95%
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={400}>
                    <LineChart data={predicciones}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis 
                        dataKey="fechaPrediccion" 
                        tickFormatter={(value) => formatDate(value)}
                      />
                      <YAxis tickFormatter={(value) => formatCurrency(value)} />
                      <Tooltip 
                        formatter={(value: any) => formatCurrency(parseFloat(value))}
                        labelFormatter={(label) => formatDate(label)}
                      />
                      <Legend />
                      <Line 
                        type="monotone" 
                        dataKey="yPredXgboost" 
                        stroke="#10b981" 
                        name="XGBoost"
                        strokeDasharray="5 5"
                      />
                      <Line 
                        type="monotone" 
                        dataKey="yPredLstm" 
                        stroke="#f59e0b" 
                        name="LSTM"
                        strokeDasharray="5 5"
                      />
                      <Line 
                        type="monotone" 
                        dataKey="yPredEnsemble" 
                        stroke="#3b82f6" 
                        name="Ensemble"
                        strokeWidth={2}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="limiteInferior" 
                        stroke="#94a3b8" 
                        name="IC 95% Inferior"
                        strokeDasharray="3 3"
                      />
                      <Line 
                        type="monotone" 
                        dataKey="limiteSuperior" 
                        stroke="#94a3b8" 
                        name="IC 95% Superior"
                        strokeDasharray="3 3"
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            ) : (
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Sin predicciones</AlertTitle>
                <AlertDescription>
                  No hay predicciones disponibles para esta entidad
                </AlertDescription>
              </Alert>
            )}
          </TabsContent>

          {/* Tab: Model Drift */}
          <TabsContent value="drift" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Sistema de Detección de Model Drift</CardTitle>
                <CardDescription>
                  Monitoreo automático de divergencias y alertas de reentrenamiento
                </CardDescription>
              </CardHeader>
              <CardContent>
                {kpis && kpis.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={kpis}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis 
                        dataKey="fecha" 
                        tickFormatter={(value) => formatDate(value)}
                      />
                      <YAxis />
                      <Tooltip 
                        labelFormatter={(label) => formatDate(label)}
                      />
                      <Legend />
                      <Bar dataKey="mapeLocal" fill="#3b82f6" name="MAPE Local (%)" />
                      <Bar dataKey="iep" fill="#10b981" name="IEP (%)" />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-64 flex items-center justify-center text-muted-foreground">
                    Selecciona una entidad para ver métricas de drift
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Sección de carga de datos */}
        <div className="mt-8">
          <DataLoader />
        </div>
      </div>
    </div>
  );
}
