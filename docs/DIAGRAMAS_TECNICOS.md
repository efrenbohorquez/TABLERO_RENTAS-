# Diagramas Técnicos del Sistema STAR

**Autor**: Manus AI  
**Fecha**: Febrero 19, 2026  
**Versión**: 2.0

---

## Introducción

Este documento presenta los diagramas técnicos completos del **Sistema de Alerta y Recomendación Territorial (STAR)**, una plataforma integral de pronóstico de recaudos municipales con capacidades avanzadas de Machine Learning. Los diagramas proporcionan una representación visual de la arquitectura del sistema, el modelo de datos, los flujos de procesos y las secuencias de operaciones críticas.

---

## 1. Diagrama de Arquitectura del Sistema

El diagrama de arquitectura muestra la estructura completa del sistema STAR, incluyendo las capas de presentación, lógica de negocio, datos y Machine Learning.

### Componentes Principales

**Frontend (React 19)**:
- Dashboard Ejecutivo con visualizaciones interactivas
- Componente DataLoader para carga asíncrona de datos
- Visualizaciones con Recharts (series de tiempo, predicciones, KPIs)
- Selector de contexto por departamento, municipio y tipología

**Backend (Node.js + tRPC)**:
- API tRPC con 8 routers especializados
- Autenticación con Manus OAuth
- Router ETL para procesamiento asíncrono de datos
- Routers de dominio: Entidades, Recaudos, Predicciones, KPIs, Drift, Dashboard

**Capa de Datos**:
- Base de datos MySQL/TiDB con 8 tablas principales
- Drizzle ORM para mapeo objeto-relacional
- Funciones de consulta optimizadas con índices

**Pipeline ETL (Python)**:
- Extracción de datos desde BaseRentasCedidas.xlsx
- Transformación con limpieza y normalización
- Feature Engineering (lags, medias móviles, variables dummy)
- Carga incremental a base de datos

**Modelos ML (Python)**:
- Modelo XGBoost para relaciones no lineales
- Modelo LSTM para dependencias temporales
- Sistema de ensamble adaptativo
- Generación de predicciones con intervalos de confianza del 95%

![Arquitectura del Sistema STAR](../../artefactos/diagramas/arquitectura_sistema.png)

---

## 2. Diagrama Entidad-Relación (ERD)

El diagrama ERD muestra el modelo de datos completo del sistema, incluyendo las 8 tablas principales y sus relaciones.

### Tablas Principales

**users**: Gestión de usuarios con autenticación OAuth y roles (admin/user).

**entidades_territoriales**: Catálogo de departamentos y municipios con código DIVIPOLA, NIT y tipología municipal (A/B/C/D).

**recaudos_historicos**: Datos históricos de recaudos con variables sintéticas (lags, medias móviles) y variables dummy (festividades, fines de semana).

**predicciones**: Pronósticos generados por XGBoost, LSTM y sistema de ensamble, con intervalos de confianza del 95% para horizontes diario, semanal, mensual y bimensual.

**kpis_historicos**: Métricas de desempeño del sistema incluyendo IEP (Índice de Eficiencia Predictiva), MAPE Local y Global, y semáforo de riesgo fiscal (verde/amarillo/rojo).

**eventos_drift**: Registro de detecciones de Model Drift con severidad (bajo/medio/alto/crítico) y requerimientos de reentrenamiento.

**conceptos_tributarios**: Catálogo de conceptos de rentas cedidas (impuestos, tasas, contribuciones).

**festividades**: Calendario de festividades nacionales y regionales que afectan el comportamiento de recaudos.

### Relaciones Clave

- Una entidad territorial tiene múltiples recaudos históricos (1:N)
- Una entidad territorial tiene múltiples predicciones (1:N)
- Una entidad territorial tiene múltiples KPIs históricos (1:N)
- Una entidad territorial tiene múltiples eventos de drift (1:N)
- Un recaudo histórico pertenece a un concepto tributario (N:1)
- Un recaudo histórico puede estar afectado por una festividad (N:1)

![Diagrama Entidad-Relación](../../artefactos/diagramas/erd_base_datos.png)

---

## 3. Diagrama de Flujo del Pipeline ETL

El diagrama de flujo muestra el proceso completo de Extracción, Transformación y Carga (ETL) de datos desde el archivo BaseRentasCedidas.xlsx hasta la base de datos.

### Fases del Pipeline

**Fase 1: Extracción**
1. Cargar archivo BaseRentasCedidas.xlsx con pandas
2. Validar existencia y formato del archivo
3. Verificar columnas requeridas (NIT, fecha, valor, entidad territorial)

**Fase 2: Limpieza**
1. Manejar valores nulos con estrategias específicas por columna
2. Normalizar formatos de fecha, moneda y texto
3. Eliminar registros duplicados
4. Validar rangos de valores (fechas, montos positivos)

**Fase 3: Transformación**
1. Mapeo NIT → Código DIVIPOLA usando catálogo DANE
2. Cálculo de tipología municipal basado en recaudo anual promedio
3. Asignación de categorías A (Consolidado), B (Emergente), C (Dependiente), D (Crítico)

**Fase 4: Feature Engineering**
1. Crear variables lag (lag_1, lag_3, lag_6, lag_12)
2. Calcular medias móviles (ma_3, ma_6, ma_12)
3. Generar variables dummy (festividades, fines de semana)
4. Crear variables temporales (mes, trimestre, día de semana)

**Fase 5: Agregación**
1. Agregación diaria (suma por día)
2. Agregación semanal (suma por semana)
3. Agregación mensual (suma por mes)
4. Agregación bimensual (suma por bimestre)

**Fase 6: Carga**
1. Cargar entidades territoriales (INSERT/UPDATE)
2. Cargar recaudos históricos con variables sintéticas
3. Cargar conceptos tributarios
4. Cargar festividades
5. Validar integridad referencial

**Fase 7: Validación**
1. Verificar completitud de datos cargados
2. Validar rangos y consistencia
3. Generar log de proceso
4. Actualizar estadísticas del sistema

![Flujo del Pipeline ETL](../../artefactos/diagramas/flujo_pipeline_etl.png)

---

## 4. Diagrama de Secuencia de Predicciones

El diagrama de secuencia muestra el flujo completo de generación de predicciones desde la solicitud del usuario hasta la visualización en el dashboard.

### Actores y Componentes

- **Usuario**: Analista o ejecutivo que consulta predicciones
- **Dashboard**: Interfaz React con visualizaciones
- **API tRPC**: Capa de API con endpoints tipados
- **DB Functions**: Funciones de consulta a base de datos
- **MySQL**: Base de datos relacional
- **Python ML**: Motor de Machine Learning
- **XGBoost**: Modelo de gradient boosting
- **LSTM**: Modelo de red neuronal recurrente
- **Ensemble**: Sistema de ensamble adaptativo

### Flujo de Operaciones

**Escenario 1: Predicciones Existentes (Caché)**
1. Usuario selecciona entidad y horizonte en el dashboard
2. Dashboard invoca `trpc.predicciones.getByEntidad()`
3. API consulta base de datos a través de DB Functions
4. MySQL retorna predicciones existentes con intervalos de confianza
5. API retorna JSON con predicciones al dashboard
6. Dashboard renderiza gráfico con bandas de confianza del 95%

**Escenario 2: Predicciones No Existentes (Generación)**
1. Usuario solicita predicciones para una entidad sin datos
2. API detecta ausencia de predicciones en caché
3. API invoca motor Python ML para generación
4. Python ML consulta recaudos históricos con features
5. Python ML prepara datos (escalado, reshape)
6. **Predicción paralela**:
   - XGBoost genera predicción basada en features tabulares
   - LSTM genera predicción basada en secuencias temporales
7. Sistema de ensamble combina predicciones con promedio ponderado
8. Ensemble calcula intervalos de confianza del 95% usando percentiles
9. Python ML inserta predicciones en base de datos
10. API retorna predicciones al dashboard
11. Dashboard renderiza gráfico con predicciones y bandas de confianza

**Escenario 3: Actualización Forzada**
1. Usuario solicita regenerar predicciones
2. Dashboard invoca `trpc.predicciones.regenerar()`
3. Python ML elimina predicciones antiguas de la base de datos
4. Se repite proceso de generación (pasos 4-10 del Escenario 2)
5. Dashboard muestra gráfico actualizado

### Tiempos de Respuesta

- **Consulta de caché**: 100-300 ms
- **Generación de predicciones**: 2-5 segundos
- **Caché de predicciones**: 24 horas

![Secuencia de Predicciones](../../artefactos/diagramas/secuencia_predicciones.png)

---

## 5. Convenciones de Diseño

### Colores de Componentes

- **Azul** (#3b82f6): Componentes de frontend
- **Verde** (#10b981): Componentes de backend
- **Naranja** (#f59e0b): Capa de datos
- **Púrpura** (#8b5cf6): Componentes de Machine Learning
- **Gris** (#6b7280): Servicios externos y almacenamiento

### Tipos de Líneas

- **Línea sólida**: Flujo de datos sincrónico
- **Línea punteada**: Flujo de datos asincrónico o futuro
- **Flecha gruesa**: Flujo principal de datos
- **Flecha delgada**: Flujo secundario o de configuración

---

## 6. Conclusiones

Los diagramas técnicos presentados proporcionan una visión completa de la arquitectura, datos, procesos y flujos del Sistema STAR. Estos diagramas son fundamentales para:

- **Onboarding de nuevos desarrolladores**: Comprensión rápida del sistema
- **Documentación técnica**: Referencia para mantenimiento y evolución
- **Auditorías de arquitectura**: Validación de decisiones de diseño
- **Comunicación con stakeholders**: Explicación visual del sistema

El sistema está diseñado con principios de arquitectura limpia, separación de responsabilidades y escalabilidad horizontal, permitiendo su evolución futura hacia un sistema de nivel empresarial.

---

## Referencias

- Diagramas generados con Mermaid v10.x
- Renderizados con `manus-render-diagram`
- Ubicación: `/home/ubuntu/star-system/artefactos/diagramas/`
- Formatos disponibles: `.mmd` (fuente), `.png` (imagen)
