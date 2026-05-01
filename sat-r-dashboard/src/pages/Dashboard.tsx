import { useState, useMemo } from 'react';
import {
    LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
    Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, AreaChart, Area, ComposedChart
} from 'recharts';
import {
    Building2, DollarSign, CheckCircle2, XCircle, AlertTriangle,
    TrendingUp, Activity, Database
} from 'lucide-react';
import { useData } from '../hooks/useData';
import type { Tipologia, Entidad } from '../types';
import { TIPOLOGIA_LABELS } from '../types';

const COLORS_SEMAFORO = {
    verde: '#10b981',
    amarillo: '#f59e0b',
    rojo: '#ef4444',
};

function formatCurrency(value: number): string {
    if (value >= 1e12) return `COP $${(value / 1e12).toFixed(1)}B`; // B de billones
    if (value >= 1e9) return `COP $${(value / 1e9).toFixed(1)}MM`; // MM de miles de millones
    if (value >= 1e6) return `COP $${(value / 1e6).toFixed(1)}M`; // M de millones
    if (value >= 1e3) return `COP $${(value / 1e3).toFixed(0)}k`; // miles
    return `COP $${value.toFixed(0)}`;
}

function formatFullCurrency(value: number | null | undefined): string {
    if (value === null || value === undefined) return '';
    const formatted = new Intl.NumberFormat('es-CO', {
        style: 'currency',
        currency: 'COP',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(value);

    // Si Intl.NumberFormat solo devuelve el símbolo '$', le agregamos 'COP $' antes
    return formatted.includes('COP') ? formatted : formatted.replace('$', 'COP $');
}

function formatDate(dateStr: string): string {
    const d = new Date(dateStr + 'T00:00:00');
    return d.toLocaleDateString('es-CO', { month: 'short', day: 'numeric' });
}

function formatMonth(mesStr: string): string {
    const [y, m] = mesStr.split('-');
    const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
    return `${months[parseInt(m) - 1]} ${y}`;
}

export default function Dashboard() {
    const { data, loading, error } = useData();
    const [selectedTipologia, setSelectedTipologia] = useState<Tipologia>('all');
    const [selectedEntidadId, setSelectedEntidadId] = useState<number | null>(null);
    const [activeTab, setActiveTab] = useState('overview');

    // Filtered entities
    const filteredEntidades = useMemo(() => {
        if (!data) return [];
        if (selectedTipologia === 'all') return data.entidades;
        return data.entidades.filter(e => e.tipologia === selectedTipologia);
    }, [data, selectedTipologia]);

    // Selected entity
    const selectedEntidad = useMemo(() => {
        if (!selectedEntidadId || !data) return null;
        return data.entidades.find(e => e.id === selectedEntidadId) ?? null;
    }, [data, selectedEntidadId]);

    // Recaudos for selected entity
    const entityRecaudos = useMemo(() => {
        if (!data || !selectedEntidadId) return [];
        return data.recaudos_diarios
            .filter(r => r.entidad_id === selectedEntidadId)
            .sort((a, b) => a.fecha.localeCompare(b.fecha));
    }, [data, selectedEntidadId]);

    // Monthly summary for selected entity
    const entityResumenMensual = useMemo(() => {
        if (!data || !selectedEntidadId) return [];
        return data.resumen_mensual
            .filter(r => r.entidad_id === selectedEntidadId)
            .sort((a, b) => a.mes.localeCompare(b.mes));
    }, [data, selectedEntidadId]);

    // Semaforo classification based on real data
    const semaforoStats = useMemo(() => {
        if (!data) return { verde: 0, amarillo: 0, rojo: 0 };

        const entidades = selectedTipologia === 'all'
            ? data.entidades
            : data.entidades.filter(e => e.tipologia === selectedTipologia);

        // Classify based on actual revenue distribution
        const valores = entidades.map(e => e.recaudo_total).sort((a, b) => a - b);
        const promedio = valores.reduce((s, v) => s + v, 0) / valores.length;

        let verde = 0, amarillo = 0, rojo = 0;
        entidades.forEach(e => {
            if (e.recaudo_total >= promedio * 0.85) verde++;
            else if (e.recaudo_total >= promedio * 0.5) amarillo++;
            else rojo++;
        });
        return { verde, amarillo, rojo };
    }, [data, selectedTipologia]);

    // Pie chart data
    const semaforoData = [
        { name: 'Verde', value: semaforoStats.verde, color: COLORS_SEMAFORO.verde },
        { name: 'Amarillo', value: semaforoStats.amarillo, color: COLORS_SEMAFORO.amarillo },
        { name: 'Rojo', value: semaforoStats.rojo, color: COLORS_SEMAFORO.rojo },
    ];

    // Drift stats derived from real data variance
    const driftStats = useMemo(() => {
        if (!data) return null;
        // Calculate drift metrics from actual revenue data variation
        const entWithMultipleRecords = new Map<number, number[]>();
        data.recaudos_diarios.forEach(r => {
            if (!entWithMultipleRecords.has(r.entidad_id)) {
                entWithMultipleRecords.set(r.entidad_id, []);
            }
            entWithMultipleRecords.get(r.entidad_id)!.push(r.valor_total);
        });

        let bajo = 0, medio = 0, alto = 0, critico = 0;
        entWithMultipleRecords.forEach(valores => {
            if (valores.length < 2) return;
            const mean = valores.reduce((s, v) => s + v, 0) / valores.length;
            const stdDev = Math.sqrt(valores.reduce((s, v) => s + Math.pow(v - mean, 2), 0) / valores.length);
            const cv = (stdDev / mean) * 100; // coefficient of variation
            if (cv < 50) bajo++;
            else if (cv < 100) medio++;
            else if (cv < 150) alto++;
            else critico++;
        });

        const total = bajo + medio + alto + critico;
        const reentrenamientosRequeridos = alto + critico;

        return {
            total,
            porSeveridad: { bajo, medio, alto, critico },
            reentrenamientosRequeridos,
            tasaDrift: total > 0 ? (reentrenamientosRequeridos / total) * 100 : 0,
        };
    }, [data]);

    // Recaudo total
    const recaudoTotal = useMemo(() => {
        if (!data) return 0;
        if (selectedTipologia === 'all') return data.metadata.recaudo_total_global;
        return data.entidades
            .filter(e => e.tipologia === selectedTipologia)
            .reduce((s, e) => s + e.recaudo_total, 0);
    }, [data, selectedTipologia]);

    // Top conceptos for overview
    const topConceptos = useMemo(() => {
        if (!data) return [];
        return data.conceptos.slice(0, 10).map(c => ({
            nombre: c.nombre.length > 35 ? c.nombre.substring(0, 33) + '...' : c.nombre,
            recaudo: c.recaudo_total,
        }));
    }, [data]);

    // Global monthly trend
    const globalTrend = useMemo(() => {
        if (!data) return [];
        return data.resumen_global.map(r => ({
            mes: formatMonth(r.mes),
            valor: r.valor_total,
            transacciones: r.num_transacciones,
            entidades: r.num_entidades,
        }));
    }, [data]);

    // Real predictions from XGBoost pipeline
    const predictions = useMemo(() => {
        if (!data || !data.xgboost_forecast || data.xgboost_forecast.length === 0) return [];
        
        // Return only the forecast values with actual real data if available
        // First get historical trend to maybe display actuals up to 2025
        const lastYearTrend = data.resumen_global.slice(-12).map(r => ({
            mes: formatMonth(r.mes),
            real: r.valor_total,
            xgboost: null,
            limite_inferior: null,
            limite_superior: null,
            rango_confianza: null,
        }));

        // Now append XGBoost 2026 predictions
        const future = data.xgboost_forecast.map((p, index) => {
            const dateStr = p.mes.split('T')[0]; // "2026-01-01"
            
            // Si es el primer punto de predicción, le pasamos el último valor real para que la línea se conecte
            const isFirst = index === 0;
            const prevReal = isFirst ? lastYearTrend[lastYearTrend.length - 1].real : null;

            return {
                mes: formatMonth(dateStr),
                real: null, // we don't have real data for 2026 yet
                xgboost: p.mean * 1e9,
                limite_inferior: p.lower * 1e9,
                limite_superior: p.upper * 1e9,
                rango_confianza: [p.lower * 1e9, p.upper * 1e9],
            };
        });

        // Add a connector point so the XGBoost line and Area starts exactly from the last historical point
        const connector = {
            ...lastYearTrend[lastYearTrend.length - 1],
            xgboost: lastYearTrend[lastYearTrend.length - 1].real,
            rango_confianza: [lastYearTrend[lastYearTrend.length - 1].real, lastYearTrend[lastYearTrend.length - 1].real],
        };
        lastYearTrend[lastYearTrend.length - 1] = connector;

        return [...lastYearTrend, ...future];
    }, [data]);

    // Global KPI metrics 
    const cvMetrics = data?.cv_metrics || null;

    // =========================================================================
    // RENDER
    // =========================================================================

    if (loading) {
        return (
            <div className="app-container">
                <header className="dashboard-header">
                    <div className="container">
                        <div className="header-content">
                            <div className="header-title">
                                <h1>Sistema de Alerta y Recomendación Territorial (STAR)</h1>
                                <p>Pronóstico de Recaudos Municipales – Rentas Cedidas</p>
                            </div>
                        </div>
                    </div>
                </header>
                <div className="loading-container">
                    <div className="loading-spinner" />
                    <div className="loading-text">Cargando datos reales...</div>
                    <div className="loading-subtext">Procesando BaseRentasCedidas.xlsx (227,056 registros)</div>
                </div>
            </div>
        );
    }

    if (error || !data) {
        return (
            <div className="app-container">
                <div className="loading-container">
                    <div style={{ color: 'var(--rojo)', fontSize: '3rem' }}>⚠</div>
                    <div className="loading-text">Error al cargar datos</div>
                    <div className="loading-subtext">{error}</div>
                </div>
            </div>
        );
    }

    const tabs = [
        { id: 'overview', label: 'Resumen General' },
        { id: 'timeseries', label: 'Series de Tiempo' },
        { id: 'predictions', label: 'Predicciones' },
        { id: 'drift', label: 'Model Drift' },
    ];

    return (
        <div className="app-container">
            {/* ===== HEADER ===== */}
            <header className="dashboard-header">
                <div className="container">
                    <div className="header-content">
                        <div className="header-title">
                            <h1>Sistema de Alerta y Recomendación Territorial (STAR)</h1>
                            <p>Pronóstico de Recaudos Municipales – Rentas Cedidas</p>
                        </div>
                        <div className="header-badge">
                            <span className="pulse" />
                            Datos Reales {data.metadata.fecha_min.slice(0, 4)}–{data.metadata.fecha_max.slice(0, 4)}
                        </div>
                    </div>
                </div>
            </header>

            {/* ===== MAIN CONTENT ===== */}
            <main className="main-content">
                <div className="container">

                    {/* Context Selector */}
                    <div className="context-selector">
                        <div className="context-selector-header">
                            <h2>Selector de Contexto</h2>
                            <p>Filtra por Tipología Municipal y Entidad Territorial</p>
                        </div>
                        <div className="filters-grid">
                            <div className="filter-group">
                                <label>Tipología Municipal</label>
                                <select
                                    className="filter-select"
                                    value={selectedTipologia}
                                    onChange={e => {
                                        setSelectedTipologia(e.target.value as Tipologia);
                                        setSelectedEntidadId(null);
                                    }}
                                >
                                    <option value="all">Todas las Tipologías</option>
                                    <option value="A">A – Consolidado</option>
                                    <option value="B">B – Emergente</option>
                                    <option value="C">C – Dependiente</option>
                                    <option value="D">D – Crítico</option>
                                    <option value="E">E – Entid. Descentralizadas</option>
                                </select>
                            </div>

                            <div className="filter-group">
                                <label>Entidad Territorial</label>
                                <select
                                    className="filter-select"
                                    value={selectedEntidadId?.toString() ?? ''}
                                    onChange={e => setSelectedEntidadId(e.target.value ? parseInt(e.target.value) : null)}
                                >
                                    <option value="">Seleccionar entidad...</option>
                                    {filteredEntidades.slice(0, 200).map(ent => (
                                        <option key={ent.id} value={ent.id}>
                                            {ent.nombre} ({ent.tipologia})
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                {selectedEntidad && (
                                    <div className="selected-info">
                                        <div className="selected-info-label">Entidad seleccionada</div>
                                        <div className="selected-info-name">{selectedEntidad.nombre}</div>
                                        <span className={`badge-tipologia badge-tipologia-${selectedEntidad.tipologia.toLowerCase()}`}>
                                            Tipo {selectedEntidad.tipologia} – {TIPOLOGIA_LABELS[selectedEntidad.tipologia]}
                                        </span>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* KPI Cards */}
                    <div className="kpi-grid">
                        <div className="kpi-card kpi-entities">
                            <div className="kpi-header">
                                <span className="kpi-label">Entidades Monitoreadas</span>
                                <div className="kpi-icon blue"><Building2 size={18} /></div>
                            </div>
                            <div className="kpi-value">{filteredEntidades.length.toLocaleString()}</div>
                            <div className="kpi-sub">Departamentos, distritos y municipios</div>
                        </div>

                        <div className="kpi-card kpi-revenue">
                            <div className="kpi-header">
                                <span className="kpi-label">Recaudo Total</span>
                                <div className="kpi-icon purple"><DollarSign size={18} /></div>
                            </div>
                            <div className="kpi-value">{formatCurrency(recaudoTotal)}</div>
                            <div className="kpi-sub">{formatFullCurrency(recaudoTotal)}</div>
                        </div>

                        <div className="kpi-card kpi-green">
                            <div className="kpi-header">
                                <span className="kpi-label">Semáforo Verde</span>
                                <div className="kpi-icon green"><CheckCircle2 size={18} /></div>
                            </div>
                            <div className="kpi-value">{semaforoStats.verde.toLocaleString()}</div>
                            <div className="kpi-sub">Recaudo dentro del pronóstico</div>
                        </div>

                        <div className="kpi-card kpi-red">
                            <div className="kpi-header">
                                <span className="kpi-label">Semáforo Rojo</span>
                                <div className="kpi-icon red"><XCircle size={18} /></div>
                            </div>
                            <div className="kpi-value">{semaforoStats.rojo.toLocaleString()}</div>
                            <div className="kpi-sub">Riesgo fiscal crítico</div>
                        </div>
                    </div>

                    {/* Tabs */}
                    <div className="tabs-container">
                        <div className="tabs-list">
                            {tabs.map(tab => (
                                <button
                                    key={tab.id}
                                    className={`tab-button ${activeTab === tab.id ? 'active' : ''}`}
                                    onClick={() => setActiveTab(tab.id)}
                                >
                                    {tab.label}
                                </button>
                            ))}
                        </div>

                        {/* === TAB: OVERVIEW === */}
                        {activeTab === 'overview' && (
                            <div className="grid-2">
                                {/* Semáforo Pie Chart */}
                                <div className="card">
                                    <div className="card-header">
                                        <div className="card-title">Distribución por Semáforo de Riesgo</div>
                                        <div className="card-description">Estado fiscal de entidades territoriales</div>
                                    </div>
                                    <div className="card-content">
                                        <div className="chart-container-sm">
                                            <ResponsiveContainer width="100%" height="100%">
                                                <PieChart>
                                                    <Pie
                                                        data={semaforoData}
                                                        cx="50%" cy="50%"
                                                        innerRadius={60} outerRadius={100}
                                                        paddingAngle={3}
                                                        dataKey="value"
                                                        label={({ name, value }) => `${name}: ${value.toLocaleString()}`}
                                                    >
                                                        {semaforoData.map((entry, i) => (
                                                            <Cell key={i} fill={entry.color} />
                                                        ))}
                                                    </Pie>
                                                    <Tooltip formatter={(v: number) => v.toLocaleString()} />
                                                </PieChart>
                                            </ResponsiveContainer>
                                        </div>
                                        <div className="semaforo-legend">
                                            {semaforoData.map(s => (
                                                <div key={s.name} className="semaforo-legend-item">
                                                    <div className="semaforo-dot" style={{ background: s.color }} />
                                                    {s.name}: {s.value.toLocaleString()}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                {/* Top Conceptos */}
                                <div className="card">
                                    <div className="card-header">
                                        <div className="card-title">Top 10 Conceptos Tributarios</div>
                                        <div className="card-description">Por recaudo total acumulado</div>
                                    </div>
                                    <div className="card-content">
                                        <div className="chart-container-sm">
                                            <ResponsiveContainer width="100%" height="100%">
                                                <BarChart data={topConceptos} layout="vertical" margin={{ left: 10, right: 20 }}>
                                                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border-light)" />
                                                    <XAxis type="number" tickFormatter={formatCurrency} tick={{ fontSize: 11 }} />
                                                    <YAxis dataKey="nombre" type="category" width={140} tick={{ fontSize: 10 }} />
                                                    <Tooltip formatter={(v: number) => formatFullCurrency(v)} />
                                                    <Bar dataKey="recaudo" fill="var(--chart-1)" radius={[0, 4, 4, 0]} />
                                                </BarChart>
                                            </ResponsiveContainer>
                                        </div>
                                    </div>
                                </div>

                                {/* Global Monthly Trend */}
                                <div className="card" style={{ gridColumn: '1 / -1' }}>
                                    <div className="card-header">
                                        <div className="card-title">Tendencia Global de Recaudo Mensual</div>
                                        <div className="card-description">Evolución del recaudo total por mes – Datos reales de BaseRentasCedidas.xlsx</div>
                                    </div>
                                    <div className="card-content">
                                        <div className="chart-container">
                                            <ResponsiveContainer width="100%" height="100%">
                                                <AreaChart data={globalTrend}>
                                                    <defs>
                                                        <linearGradient id="gradientBlue" x1="0" y1="0" x2="0" y2="1">
                                                            <stop offset="0%" stopColor="var(--chart-1)" stopOpacity={0.3} />
                                                            <stop offset="100%" stopColor="var(--chart-1)" stopOpacity={0.02} />
                                                        </linearGradient>
                                                    </defs>
                                                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border-light)" />
                                                    <XAxis dataKey="mes" tick={{ fontSize: 10 }} interval="preserveStartEnd" />
                                                    <YAxis tickFormatter={formatCurrency} tick={{ fontSize: 11 }} />
                                                    <Tooltip
                                                        formatter={(v: number, name: string) => [formatFullCurrency(v), name === 'valor' ? 'Recaudo' : name]}
                                                        labelFormatter={(l) => `Mes: ${l}`}
                                                    />
                                                    <Legend />
                                                    <Area
                                                        type="monotone"
                                                        dataKey="valor"
                                                        stroke="var(--chart-1)"
                                                        fill="url(#gradientBlue)"
                                                        strokeWidth={2}
                                                        name="Recaudo Total"
                                                    />
                                                </AreaChart>
                                            </ResponsiveContainer>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* === TAB: SERIES DE TIEMPO === */}
                        {activeTab === 'timeseries' && (
                            <div>
                                {!selectedEntidadId ? (
                                    <div className="alert">
                                        <div className="alert-icon"><AlertTriangle size={18} /></div>
                                        <div>
                                            <div className="alert-title">Selecciona una entidad</div>
                                            <div className="alert-text">
                                                Selecciona una entidad territorial en el selector de contexto para visualizar sus series de tiempo
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <>
                                        {/* Daily Revenue */}
                                        <div className="card" style={{ marginBottom: 20 }}>
                                            <div className="card-header">
                                                <div className="card-title">Recaudos Diarios – {selectedEntidad?.nombre}</div>
                                                <div className="card-description">Evolución del recaudo diario real</div>
                                            </div>
                                            <div className="card-content">
                                                {entityRecaudos.length > 0 ? (
                                                    <div className="chart-container">
                                                        <ResponsiveContainer width="100%" height="100%">
                                                            <LineChart data={entityRecaudos}>
                                                                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-light)" />
                                                                <XAxis dataKey="fecha" tickFormatter={formatDate} tick={{ fontSize: 10 }} interval="preserveStartEnd" />
                                                                <YAxis tickFormatter={formatCurrency} tick={{ fontSize: 11 }} />
                                                                <Tooltip
                                                                    formatter={(v: number) => formatFullCurrency(v)}
                                                                    labelFormatter={(l) => `Fecha: ${l}`}
                                                                />
                                                                <Legend />
                                                                <Line
                                                                    type="monotone"
                                                                    dataKey="valor_total"
                                                                    stroke="var(--chart-1)"
                                                                    strokeWidth={2}
                                                                    dot={false}
                                                                    name="Recaudo Diario"
                                                                />
                                                            </LineChart>
                                                        </ResponsiveContainer>
                                                    </div>
                                                ) : (
                                                    <div className="chart-empty">No hay datos diarios para esta entidad</div>
                                                )}
                                            </div>
                                        </div>

                                        {/* Monthly Summary */}
                                        <div className="card">
                                            <div className="card-header">
                                                <div className="card-title">Resumen Mensual – {selectedEntidad?.nombre}</div>
                                                <div className="card-description">Recaudo total por mes</div>
                                            </div>
                                            <div className="card-content">
                                                {entityResumenMensual.length > 0 ? (
                                                    <div className="chart-container">
                                                        <ResponsiveContainer width="100%" height="100%">
                                                            <BarChart data={entityResumenMensual.map(r => ({
                                                                mes: formatMonth(r.mes),
                                                                valor: r.valor_total,
                                                                transacciones: r.num_transacciones,
                                                            }))}>
                                                                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-light)" />
                                                                <XAxis dataKey="mes" tick={{ fontSize: 10 }} />
                                                                <YAxis tickFormatter={formatCurrency} tick={{ fontSize: 11 }} />
                                                                <Tooltip formatter={(v: number) => formatFullCurrency(v)} />
                                                                <Legend />
                                                                <Bar dataKey="valor" fill="var(--chart-4)" name="Recaudo Mensual" radius={[4, 4, 0, 0]} />
                                                            </BarChart>
                                                        </ResponsiveContainer>
                                                    </div>
                                                ) : (
                                                    <div className="chart-empty">No hay datos mensuales para esta entidad</div>
                                                )}
                                            </div>
                                        </div>
                                    </>
                                )}
                            </div>
                        )}

                        {/* === TAB: PREDICCIONES === */}
                        {activeTab === 'predictions' && (
                            <div>
                                {predictions.length > 0 ? (
                                    <div className="card">
                                        <div className="card-header">
                                            <div className="card-title">Pronóstico Global Rentas Cedidas 2026 (XGBoost)</div>
                                            <div className="card-description">Predicción basada en modelo XGBoost optimizado con Optuna, incluyendo intervalos de confianza al 90%</div>
                                        </div>
                                        <div className="card-content">
                                            <div className="chart-container">
                                                <ResponsiveContainer width="100%" height="100%">
                                                    <ComposedChart data={predictions}>
                                                        <CartesianGrid strokeDasharray="3 3" stroke="var(--border-light)" />
                                                        <XAxis dataKey="mes" tick={{ fontSize: 11 }} />
                                                        <YAxis tickFormatter={formatCurrency} tick={{ fontSize: 11 }} />
                                                        <Tooltip formatter={(v: number | number[]) => Array.isArray(v) ? `${formatFullCurrency(v[0])} - ${formatFullCurrency(v[1])}` : formatFullCurrency(v)} />
                                                        <Legend />
                                                        <Area type="monotone" dataKey="rango_confianza" fill="#94a3b8" fillOpacity={0.2} stroke="none" name="Intervalo de Confianza (90%)" connectNulls />
                                                        <Line type="monotone" dataKey="real" stroke="var(--text-primary)" strokeWidth={2.5} name="Real (Histórico)" dot={{ r: 4 }} connectNulls />
                                                        <Line type="monotone" dataKey="xgboost" stroke="var(--verde)" strokeWidth={2.5} strokeDasharray="5 5" name="Proyección XGBoost 2026" connectNulls />
                                                    </ComposedChart>
                                                </ResponsiveContainer>
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="alert">
                                        <div className="alert-icon"><AlertTriangle size={18} /></div>
                                        <div>
                                            <div className="alert-title">Sin datos de predicción</div>
                                            <div className="alert-text">No se ha podido cargar el archivo de pronósticos XGBoost.</div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* === TAB: MODEL DRIFT === */}
                        {activeTab === 'drift' && (
                            <div className="grid-2">
                                <div className="card">
                                    <div className="card-header">
                                        <div className="card-title">Monitoreo de Model Drift</div>
                                        <div className="card-description">Detección de divergencias basada en variación real del recaudo</div>
                                    </div>
                                    <div className="card-content">
                                        {driftStats ? (
                                            <>
                                                <div className="stat-row">
                                                    <span className="stat-label">Total entidades analizadas</span>
                                                    <span className="stat-value">{driftStats.total.toLocaleString()}</span>
                                                </div>
                                                <div className="stat-row">
                                                    <span className="stat-label">Reentrenamientos requeridos</span>
                                                    <span className="stat-value orange">{driftStats.reentrenamientosRequeridos.toLocaleString()}</span>
                                                </div>
                                                <div className="stat-row">
                                                    <span className="stat-label">Tasa de drift</span>
                                                    <span className="stat-value">{driftStats.tasaDrift.toFixed(1)}%</span>
                                                </div>
                                                <div>
                                                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 12 }}>Por severidad:</div>
                                                    <div className="severity-grid">
                                                        <div className="severity-item"><span className="severity-dot bajo" /> Bajo: {driftStats.porSeveridad.bajo.toLocaleString()}</div>
                                                        <div className="severity-item"><span className="severity-dot medio" /> Medio: {driftStats.porSeveridad.medio.toLocaleString()}</div>
                                                        <div className="severity-item"><span className="severity-dot alto" /> Alto: {driftStats.porSeveridad.alto.toLocaleString()}</div>
                                                        <div className="severity-item"><span className="severity-dot critico" /> Crítico: {driftStats.porSeveridad.critico.toLocaleString()}</div>
                                                    </div>
                                                </div>
                                            </>
                                        ) : (
                                            <div className="chart-empty">Calculando...</div>
                                        )}
                                    </div>
                                </div>

                                {/* KPI chart for XGBoost CV Metrics */}
                                <div className="card">
                                    <div className="card-header">
                                        <div className="card-title">Métricas de Backtesting (XGBoost)</div>
                                        <div className="card-description">
                                            Validación Cruzada Walk-Forward (Global)
                                        </div>
                                    </div>
                                    <div className="card-content">
                                        {cvMetrics ? (
                                            <>
                                                <div className="stat-row" style={{ marginTop: 10 }}>
                                                    <span className="stat-label">RMSE Promedio</span>
                                                    <span className="stat-value">{formatCurrency(cvMetrics.rmse * 1e9)}</span>
                                                </div>
                                                <div className="stat-row">
                                                    <span className="stat-label">MAE Promedio</span>
                                                    <span className="stat-value">{formatCurrency(cvMetrics.mae * 1e9)}</span>
                                                </div>
                                                <div className="stat-row">
                                                    <span className="stat-label">R² (Entrenamiento)</span>
                                                    <span className="stat-value">{(cvMetrics.r2_train * 100).toFixed(1)}%</span>
                                                </div>
                                                
                                                <div style={{ marginTop: 20 }}>
                                                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: 10 }}>
                                                        Desempeño por Fold (Validación):
                                                    </div>
                                                    <div className="chart-container-sm">
                                                        <ResponsiveContainer width="100%" height="100%">
                                                            <BarChart data={cvMetrics.folds.map(f => ({ fold: `Fold ${f.fold}`, rmse: f.rmse * 1e9, mae: f.mae * 1e9 }))}>
                                                                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-light)" />
                                                                <XAxis dataKey="fold" tick={{ fontSize: 11 }} />
                                                                <YAxis tickFormatter={formatCurrency} tick={{ fontSize: 11 }} />
                                                                <Tooltip formatter={(v: number) => formatFullCurrency(v)} />
                                                                <Legend />
                                                                <Bar dataKey="rmse" fill="var(--chart-1)" name="RMSE" radius={[4, 4, 0, 0]} />
                                                                <Bar dataKey="mae" fill="var(--verde)" name="MAE" radius={[4, 4, 0, 0]} />
                                                            </BarChart>
                                                        </ResponsiveContainer>
                                                    </div>
                                                </div>
                                            </>
                                        ) : (
                                            <div className="chart-empty">Métricas de backtesting no disponibles. Asegúrese de ejecutar el pipeline de XGBoost.</div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Data Summary Footer */}
                    <div className="data-summary">
                        <h3><Database size={16} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 8 }} />Datos Reales – BaseRentasCedidas.xlsx</h3>
                        <div className="data-summary-grid">
                            <div className="data-summary-item">
                                <span className="label">Total Registros</span>
                                <span className="value">{data.metadata.total_registros.toLocaleString()}</span>
                            </div>
                            <div className="data-summary-item">
                                <span className="label">Entidades Territoriales</span>
                                <span className="value">{data.metadata.total_entidades.toLocaleString()}</span>
                            </div>
                            <div className="data-summary-item">
                                <span className="label">Conceptos Tributarios</span>
                                <span className="value">{data.metadata.total_conceptos}</span>
                            </div>
                            <div className="data-summary-item">
                                <span className="label">Rango de Fechas</span>
                                <span className="value">{data.metadata.fecha_min} a {data.metadata.fecha_max}</span>
                            </div>
                            <div className="data-summary-item">
                                <span className="label">Recaudo Total</span>
                                <span className="value">{formatFullCurrency(data.metadata.recaudo_total_global)}</span>
                            </div>
                        </div>
                    </div>

                </div>
            </main>
        </div>
    );
}
