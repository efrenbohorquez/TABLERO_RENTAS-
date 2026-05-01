<div align="center">

# 📊 STAR — Sistema de Alerta y Recomendación Territorial

### Plataforma Integral de Pronóstico de Recaudos Municipales · Rentas Cedidas

[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=white)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-6-646CFF?logo=vite&logoColor=white)](https://vitejs.dev/)
[![Recharts](https://img.shields.io/badge/Recharts-2.15-22B5BF)](https://recharts.org/)
[![Python](https://img.shields.io/badge/Python-3.11+-3776AB?logo=python&logoColor=white)](https://www.python.org/)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](./LICENSE)

---

**Dashboard ejecutivo interactivo** para el monitoreo y pronóstico de recaudos de rentas cedidas a entidades territoriales de Colombia. Construido con **datos reales** de 227,056 registros fiscales.

</div>

---

## 🎯 Descripción

STAR es una plataforma analítica que combina un **pipeline ETL** (Python) con un **dashboard interactivo** (React/TypeScript) para visualizar y pronosticar el comportamiento del recaudo de rentas cedidas a nivel departamental y municipal en Colombia.

### Características

| Funcionalidad | Detalle |
|---|---|
| 🔄 **Pipeline ETL** | Extracción automatizada desde `BaseRentasCedidas.xlsx` → JSON |
| 📈 **Dashboard Interactivo** | 4 tabs: Resumen General, Series de Tiempo, Predicciones, Model Drift |
| 🎛️ **Selector de Contexto** | Filtros por Tipología Municipal (A/B/C/D) y Entidad Territorial |
| 📊 **6 tipos de gráficos** | PieChart, AreaChart, LineChart, BarChart horizontal/vertical |
| 🚦 **Semáforo Fiscal** | Clasificación Verde/Amarillo/Rojo basada en datos reales |
| 🤖 **Motor Predictivo** | Pronósticos XGBoost, LSTM y Ensemble con IC 95% |
| 📉 **Model Drift** | Monitoreo de divergencias por coeficiente de variación |
| 🏛️ **4,849 entidades** | Departamentos, distritos y municipios monitoreados |

---

## 📊 Datos

El sistema procesa datos reales del archivo **BaseRentasCedidas.xlsx**:

| Métrica | Valor |
|---------|-------|
| **Registros procesados** | 227,056 |
| **Entidades territoriales** | 4,849 |
| **Conceptos tributarios** | 102 |
| **Recaudos diarios** | 122,149 |
| **Rango temporal** | Enero 2020 – Octubre 2025 |
| **Recaudo total** | $15.99 billones COP |

---

## 🏗️ Arquitectura

```
TABLERO_RENTAS_CEDIDAS/
│
├── 📁 sat-r-dashboard/               # Aplicación React (Frontend)
│   ├── src/
│   │   ├── pages/Dashboard.tsx        # Dashboard principal (450+ líneas)
│   │   ├── hooks/useData.ts           # Hook para carga de datos JSON
│   │   ├── types.ts                   # Tipos TypeScript
│   │   ├── App.tsx                    # Componente raíz
│   │   ├── main.tsx                   # Entry point
│   │   └── index.css                  # Design system premium
│   ├── public/data/
│   │   └── dashboard_data.json        # Datos reales (19 MB)
│   ├── package.json
│   ├── vite.config.ts
│   └── tsconfig.json
│
├── 📁 python/                         # Scripts originales ML/ETL
│   ├── etl_pipeline.py                # Pipeline ETL completo
│   ├── ml_models.py                   # Modelos predictivos
│   └── seed_data.py                   # Generación de datos semilla
│
├── 📁 docs/                           # Documentación (archivos .md originales)
│
├── extract_data.py                    # ETL: Excel → JSON (ejecutar primero)
├── BaseRentasCedidas.xlsx             # Fuente de datos (no incluido en repo)
├── .gitignore
└── README.md
```

### Stack Tecnológico

| Capa | Tecnología |
|------|-----------|
| **Frontend** | React 19, TypeScript 5.7, Vite 6 |
| **Gráficos** | Recharts 2.15 |
| **Iconos** | Lucide React |
| **ETL** | Python 3.11+, Pandas, OpenPyXL |
| **Datos** | JSON estático (extraído del Excel real) |

---

## 🚀 Inicio Rápido

### Requisitos previos

- [Node.js 18+](https://nodejs.org/)
- [Python 3.11+](https://www.python.org/) (solo para regenerar datos)

### 1. Clonar el repositorio

```bash
git clone https://github.com/efrenbohorquez/TABLERO_RENTAS-.git
cd TABLERO_RENTAS-
```

### 2. Instalar dependencias

```bash
cd sat-r-dashboard
npm install
```

### 3. Ejecutar el dashboard

```bash
npm run dev
# → Abre http://localhost:3000
```

> **Nota:** Los datos ya están incluidos en `public/data/dashboard_data.json`. No es necesario ejecutar el ETL a menos que se actualice el Excel fuente.

### (Opcional) Regenerar datos desde el Excel

```bash
# Desde la raíz del proyecto
pip install pandas openpyxl
python extract_data.py
```

---

## 📖 Dashboard — Guía de Uso

### Selector de Contexto

| Filtro | Opciones |
|--------|----------|
| **Tipología** | A (Consolidado), B (Emergente), C (Dependiente), D (Crítico) |
| **Entidad** | 4,849 departamentos, distritos y municipios |

### KPIs Principales

| KPI | Descripción |
|-----|-------------|
| **Entidades Monitoreadas** | Total de entidades filtradas |
| **Recaudo Total** | Suma acumulada del recaudo |
| **Semáforo Verde** | Entidades con recaudo ≥ pronóstico |
| **Semáforo Rojo** | Entidades con riesgo fiscal crítico |

### Tabs de Visualización

1. **Resumen General** — PieChart del semáforo, Top 10 conceptos tributarios, tendencia mensual global
2. **Series de Tiempo** — Recaudos diarios y resumen mensual por entidad seleccionada
3. **Predicciones** — Pronósticos XGBoost, LSTM, Ensemble con intervalos de confianza del 95%
4. **Model Drift** — Estadísticas de divergencia y métricas MAPE/IEP por entidad

---

## 🚨 Semáforo de Riesgo Fiscal

| Color | Condición | Acción |
|-------|-----------|--------|
| 🟢 **Verde** | Recaudo ≥ 85% del promedio | Monitoreo rutinario |
| 🟡 **Amarillo** | 50% ≤ Recaudo < 85% del promedio | Vigilancia reforzada |
| 🔴 **Rojo** | Recaudo < 50% del promedio | Intervención requerida |

---

## 📈 Métricas de Calidad

### IEP — Índice de Eficiencia Predictiva

```
IEP = ((Recaudo_Real - Recaudo_Pronosticado) / Recaudo_Pronosticado) × 100
```

### MAPE — Mean Absolute Percentage Error

```
MAPE = |Recaudo_Real - Recaudo_Pronosticado| / Recaudo_Real × 100
```

| Rango MAPE | Calificación |
|------------|-------------|
| < 10% | Excelente |
| 10–15% | Bueno |
| 15–25% | Aceptable |
| > 25% | Reentrenamiento requerido |

---

## 📄 Documentación Adicional

| Documento | Contenido |
|-----------|-----------|
| [`DOCUMENTACION_TECNICA.md`](./DOCUMENTACION_TECNICA.md) | Arquitectura, API, modelos predictivos |
| [`GUIA_USUARIO.md`](./GUIA_USUARIO.md) | Manual del dashboard ejecutivo |
| [`ANALISIS_DATOS.md`](./ANALISIS_DATOS.md) | Hallazgos del análisis exploratorio |
| [`DIAGRAMAS_TECNICOS.md`](./DIAGRAMAS_TECNICOS.md) | Diagramas de arquitectura |
| [`MATRIZ_REQUISITOS.md`](./MATRIZ_REQUISITOS.md) | Trazabilidad de requerimientos |

---

## 🛠️ Scripts Disponibles

| Comando | Descripción |
|---------|-------------|
| `npm run dev` | Servidor de desarrollo (Vite) |
| `npm run build` | Build de producción |
| `npm run preview` | Preview del build |
| `python extract_data.py` | ETL: Excel → JSON |

---

## 📝 Licencia

MIT © 2026 — Efren Bohorquez

---

<div align="center">

**Construido con datos reales del Sistema de Rentas Cedidas de Colombia**

</div>
