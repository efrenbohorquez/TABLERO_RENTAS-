# TODO - Sistema de Alerta Temprana y Recomendaciones (SAT-R)

## Fase 1: Configuración Inicial y Análisis de Datos
- [x] Analizar estructura del dataset BaseRentasCedidas.xlsx
- [x] Identificar columnas clave (NIT, fecha, recaudo, entidad territorial)
- [x] Definir esquema de datos y tipologías municipales
- [x] Documentar hallazgos del análisis exploratorio

## Fase 2: Base de Datos y Modelos
- [x] Diseñar esquema de base de datos con modelo estrella
- [x] Crear tabla de entidades territoriales con código DIVIPOLA y tipología (A/B/C/D)
- [x] Crear tabla de recaudos históricos (y_real) con variables sintéticas
- [x] Crear tabla de predicciones (y_pred_xgboost, y_pred_lstm, y_pred_ensemble)
- [x] Crear tabla de KPIs históricos con semáforo de riesgo
- [x] Crear tabla de eventos de Model Drift
- [x] Crear tabla de festividades
- [x] Crear tabla de conceptos tributarios
- [x] Implementar migraciones con Drizzle ORM
- [x] Implementar funciones de consulta en server/db.ts

## Fase 3: Pipeline ETL y Preprocesamiento
- [ ] Implementar clase ETL para ingesta de datos
- [ ] Desarrollar funciones de limpieza y manejo de valores nulos
- [ ] Generar variables sintéticas: lag_12 (rezago anual)
- [ ] Generar medias móviles (3 y 6 meses)
- [ ] Crear variables dummy para festividades municipales
- [ ] Implementar agregaciones temporales (diario → semanal → mensual → bimensual)
- [ ] Crear script de carga inicial de datos históricos

## Fase 4: Motor Predictivo (XGBoost + LSTM)
- [ ] Instalar dependencias de ML (scikit-learn, xgboost, tensorflow)
- [ ] Implementar modelo XGBoost para relaciones no lineales
- [ ] Implementar arquitectura LSTM para dependencias temporales
- [ ] Desarrollar sistema de ensamble adaptativo
- [ ] Calcular intervalos de confianza del 95%
- [ ] Implementar entrenamiento por municipio
- [ ] Crear scripts de entrenamiento y predicción
- [ ] Guardar modelos entrenados

## Fase 5: Backend API con tRPC
- [ ] Crear procedimientos para consulta de municipios
- [ ] Crear procedimientos para obtener series de tiempo
- [ ] Crear procedimientos para obtener predicciones
- [ ] Crear procedimientos para calcular KPIs
- [ ] Implementar filtros por departamento, municipio y tipología
- [ ] Crear endpoints para agregaciones temporales
- [ ] Implementar caché de predicciones

## Fase 6: Dashboard Ejecutivo y Visualizaciones
- [ ] Diseñar layout del dashboard con DashboardLayout
- [ ] Implementar selector de contexto (Departamento/Municipio/Tipología)
- [ ] Crear componente de gráfico de series de tiempo con Recharts
- [ ] Implementar visualización de Recaudo Real vs Pronosticado
- [ ] Agregar bandas de confianza del 95% al gráfico
- [ ] Crear página de análisis por municipio
- [ ] Implementar filtros interactivos
- [ ] Agregar exportación de datos

## Fase 7: Sistema de KPIs y Semáforo
- [ ] Implementar cálculo del IEP (Índice de Eficiencia Predictiva)
- [ ] Implementar cálculo del MAPE Global y Local
- [ ] Implementar lógica del Semáforo de Riesgo Fiscal
- [ ] Crear tarjetas visuales para los 3 KPIs
- [ ] Implementar código de colores (Verde/Amarillo/Rojo)
- [ ] Agregar alertas cuando MAPE > 15%
- [ ] Crear dashboard de KPIs agregados

## Fase 8: Monitoreo de Model Drift y Alertas
- [ ] Implementar función de detección de divergencias
- [ ] Crear sistema de umbrales estadísticos
- [ ] Implementar alertas de reentrenamiento
- [ ] Crear log de eventos de drift
- [ ] Implementar comparación diaria pronóstico vs realidad
- [ ] Crear dashboard de salud del modelo
- [ ] Implementar notificaciones al propietario

## Fase 9: Testing y Documentación
- [ ] Escribir tests unitarios para ETL
- [ ] Escribir tests para modelos predictivos
- [ ] Escribir tests para procedimientos tRPC
- [ ] Crear documentación técnica completa
- [ ] Documentar arquitectura del sistema
- [ ] Crear guía de usuario
- [ ] Ejecutar suite completa de tests
- [ ] Crear checkpoint final

## Fase 10: Entrega
- [ ] Verificar funcionamiento completo del sistema
- [ ] Preparar demo ejecutiva
- [ ] Generar documentación de despliegue
- [ ] Entregar artefactos al usuario

## CORRECCIÓN URGENTE: Usar Solo Datos Reales
- [ ] Eliminar script seed_data.py con datos sintéticos
- [ ] Procesar archivo completo BaseRentasCedidas.xlsx (no solo muestra)
- [ ] Ejecutar ETL pipeline con todos los datos reales
- [ ] Verificar carga completa de datos reales en base de datos
- [ ] Calcular tipologías municipales basadas en datos reales de recaudo
- [ ] Generar predicciones usando solo patrones de datos históricos reales
- [ ] Validar que no existan datos sintéticos en la base de datos

## Sistema de Carga Asíncrona de Datos
- [ ] Crear endpoint tRPC para carga asíncrona de datos completos
- [ ] Implementar indicador de progreso en tiempo real
- [ ] Agregar botón "Cargar Datos Completos" en dashboard
- [ ] Configurar procesamiento en background con estado persistente
- [ ] Implementar carga incremental (solo datos nuevos)
- [ ] Agregar validación de integridad de datos cargados

## MEJORAS - Fase de Optimización (Continuación)

### Sistema de Carga Asíncrona Mejorado
- [x] Crear endpoint tRPC para procesamiento asíncrono (server/etl.ts)
- [x] Crear componente React de barra de progreso visual con porcentaje (DataLoader.tsx)
- [x] Implementar polling cada 2 segundos para estado en tiempo real
- [x] Implementar manejo de errores y reintentos automáticos
- [x] Agregar logs detallados del proceso de carga
- [x] Implementar cancelación de carga en progreso
- [x] Integrar DataLoader en el Dashboard principal

### Modelos ML Reales (XGBoost y LSTM)
- [ ] Instalar scikit-learn, xgboost, tensorflow, keras
- [ ] Implementar XGBoostForecaster con GridSearchCV para optimización
- [ ] Implementar LSTMForecaster con arquitectura de red neuronal profunda
- [ ] Entrenar modelos con walk-forward validation
- [ ] Calcular métricas reales: MAPE, RMSE, MAE, R²
- [ ] Implementar guardado y carga de modelos entrenados
- [ ] Crear endpoint tRPC para reentrenamiento de modelos

### Diagramas Técnicos Profesionales
- [x] Generar diagrama de arquitectura del sistema completo (Mermaid)
- [x] Generar diagrama entidad-relación (ERD) de las 8 tablas de BD
- [x] Generar diagrama de flujo del pipeline ETL con decisiones
- [x] Generar diagrama de secuencia de predicciones end-to-end
- [x] Renderizar diagramas a PNG con manus-render-diagram
- [x] Guardar todos los diagramas en artefactos/diagramas/
- [x] Agregar diagramas a la documentación técnica (DIAGRAMAS_TECNICOS.md)

### Testing Completo de Mejoras
- [x] Crear test para endpoint de carga asíncrona (server/etl.test.ts)
- [x] Ejecutar suite completa de tests (24/24 pasados - 100%)
- [ ] Crear tests para modelos XGBoost y LSTM reales (pendiente implementación modelos)
- [ ] Validar precisión de predicciones (objetivo: MAPE ≤ 15%)
- [ ] Crear tests de integración end-to-end


## FASE DE MEJORAS CRÍTICAS - Sistema SAT-R v3.0

### 1. Modelos ML Reales (XGBoost y LSTM)
- [ ] Instalar dependencias: xgboost, tensorflow, keras, scikit-learn
- [ ] Implementar clase XGBoostForecaster con GridSearchCV
- [ ] Definir grid de hiperparámetros (n_estimators, max_depth, learning_rate, subsample)
- [ ] Implementar clase LSTMForecaster con arquitectura de red neuronal
- [ ] Diseñar arquitectura LSTM (capas, unidades, dropout, activación)
- [ ] Implementar walk-forward validation temporal
- [ ] Entrenar XGBoost sobre datos históricos completos
- [ ] Entrenar LSTM sobre datos históricos completos
- [ ] Calcular métricas: MAPE, RMSE, MAE, R²
- [ ] Validar MAPE ≤ 15% (objetivo)
- [ ] Implementar guardado de modelos entrenados (pickle/h5)
- [ ] Crear endpoint tRPC para reentrenamiento manual
- [ ] Implementar reentrenamiento automático mensual

### 2. Integración APIs Oficiales
- [ ] Investigar API del DANE para código DIVIPOLA
- [ ] Implementar cliente HTTP para API DANE
- [ ] Crear función de sincronización de entidades territoriales
- [ ] Investigar API de MinHacienda para recaudos
- [ ] Implementar cliente HTTP para API MinHacienda
- [ ] Crear función de sincronización de recaudos diarios
- [ ] Implementar scheduler para sincronización automática diaria
- [ ] Crear logs de sincronización
- [ ] Implementar manejo de errores y reintentos
- [ ] Crear endpoint tRPC para sincronización manual
- [ ] Validar integridad de datos sincronizados

### 3. Sistema de Alertas y Notificaciones
- [ ] Implementar módulo de envío de correos (nodemailer)
- [ ] Configurar plantillas HTML para alertas
- [ ] Crear alerta de cambio de semáforo (amarillo/rojo)
- [ ] Crear alerta de Model Drift crítico
- [ ] Implementar sistema de suscripciones de usuarios
- [ ] Crear tabla de configuración de alertas en BD
- [ ] Implementar scheduler para verificación diaria de alertas
- [ ] Crear endpoint tRPC para gestión de suscripciones
- [ ] Implementar envío de SMS (opcional - Twilio)
- [ ] Crear logs de alertas enviadas

### 4. Reportes Ejecutivos en PDF
- [ ] Instalar librería de generación de PDF (pdfkit o puppeteer)
- [ ] Diseñar plantilla de reporte ejecutivo
- [ ] Implementar generación de gráficos para PDF
- [ ] Crear sección de análisis de tendencias
- [ ] Crear sección de recomendaciones automáticas
- [ ] Implementar generación de reporte semanal
- [ ] Crear scheduler para envío automático de reportes
- [ ] Implementar endpoint tRPC para generación manual
- [ ] Guardar reportes históricos en S3
- [ ] Crear galería de reportes en dashboard

### 5. Testing y Validación
- [ ] Crear tests para modelos XGBoost y LSTM
- [ ] Crear tests para clientes de APIs externas
- [ ] Crear tests para sistema de alertas
- [ ] Crear tests para generación de reportes PDF
- [ ] Validar precisión de predicciones (MAPE ≤ 15%)
- [ ] Ejecutar suite completa de tests
- [ ] Validar sincronización de datos en tiempo real
- [ ] Probar envío de alertas end-to-end
