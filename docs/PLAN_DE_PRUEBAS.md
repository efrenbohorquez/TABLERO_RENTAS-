# Plan de Aseguramiento de Calidad (QA) - Sistema STAR

## 1. Introducción
Este documento detalla el Sistema de Pruebas de Calidad implementado para el **Sistema de Alerta y Recomendación Territorial (STAR)**. El objetivo es garantizar la integridad del código, la fiabilidad de las predicciones y la estabilidad de la interfaz de usuario en futuras actualizaciones.

## 2. Tipos de Pruebas Implementadas

### 2.1 Pruebas de Frontend (React / Vite)
El framework utilizado para las pruebas de interfaz es **Vitest** en conjunto con **React Testing Library**. 
* **Ubicación:** `star-dashboard/src/pages/Dashboard.test.tsx`
* **Cobertura actual:** Smoke testing del componente principal (`Dashboard.tsx`). Verifica que la aplicación renderice correctamente los estados de carga y no produzca excepciones (crashes) inmediatos tras una actualización.
* **Ejecución:**
  ```bash
  cd star-dashboard
  npm run test
  ```

### 2.2 Pruebas de Backend y Pipeline (Python)
Se utiliza **pytest** para validar las salidas del proceso de Extracción, Transformación, Carga (ETL) y de Machine Learning (XGBoost).
* **Ubicación:** `python/tests/test_pipeline.py`
* **Cobertura actual:** Verificación de existencia y correcta exportación de archivos JSON esenciales (`dashboard_data.json`, `xgboost_forecast.json`, `cv_metrics.json`), además de validar las dependencias del sistema.
* **Ejecución:**
  ```bash
  pytest python/tests
  ```

## 3. Recomendaciones para Futuras Actualizaciones
Para mantener y extender el control de calidad, se sugiere:
1. **Pruebas de Componentes (UI):** Agregar pruebas para componentes aislados como `KpiCard` o los selectores de filtro.
2. **Pruebas de Regresión (ML):** Añadir validaciones en `pytest` que verifiquen si el MAPE general o el RMSE están dentro de un umbral aceptable antes de desplegar un nuevo modelo en producción.
3. **Integración Continua (CI):** Integrar estos comandos (`npm run test` y `pytest`) en un pipeline de CI/CD (por ejemplo, GitHub Actions) para que se ejecuten automáticamente en cada *Pull Request*.
