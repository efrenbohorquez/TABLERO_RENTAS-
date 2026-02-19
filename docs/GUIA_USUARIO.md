# Guía de Usuario - Sistema SAT-R

**Sistema de Alerta Temprana y Recomendaciones**  
**Pronóstico de Recaudos Municipales - Rentas Cedidas**

---

## Introducción

Bienvenido al Sistema de Alerta Temprana y Recomendaciones (SAT-R), una herramienta diseñada para ayudar a los funcionarios públicos y tomadores de decisiones a monitorear y pronosticar los recaudos de rentas cedidas a nivel municipal en Colombia.

Esta guía le ayudará a navegar por el sistema y aprovechar al máximo sus funcionalidades.

---

## Acceso al Sistema

Para acceder al dashboard ejecutivo, abra su navegador web y visite la URL proporcionada por su administrador del sistema.

**URL de ejemplo**: `https://sat-r-system.manus.space`

El sistema funciona mejor en navegadores modernos como Google Chrome, Mozilla Firefox o Microsoft Edge.

---

## Interfaz Principal

### Pantalla de Inicio

Al ingresar al sistema, verá el **Dashboard Ejecutivo** con los siguientes elementos:

**Encabezado**:
- Título del sistema: "Sistema de Alerta Temprana y Recomendaciones"
- Subtítulo: "Pronóstico de Recaudos Municipales - Rentas Cedidas"
- Badge indicando el período de datos: "Datos Reales 2020"

**Selector de Contexto**:
- Filtro por Tipología Municipal
- Selector de Entidad Territorial
- Información de la entidad seleccionada

**Tarjetas de KPIs**:
- Entidades Monitoreadas
- Recaudo Total (últimos 30 días)
- Semáforo Verde (entidades con recaudo dentro del pronóstico)
- Semáforo Rojo (entidades con riesgo fiscal crítico)

**Tabs de Navegación**:
- Resumen General
- Series de Tiempo
- Predicciones
- Model Drift

---

## Uso del Selector de Contexto

### Filtrar por Tipología Municipal

El sistema clasifica las entidades territoriales en cuatro tipologías:

| Tipología | Nombre | Descripción |
|-----------|--------|-------------|
| **A** | Consolidado | Entidades con alta capacidad fiscal y recaudos estables |
| **B** | Emergente | Entidades con capacidad fiscal media y crecimiento sostenido |
| **C** | Dependiente | Entidades con capacidad fiscal limitada |
| **D** | Crítico | Entidades con baja capacidad fiscal y alta volatilidad |

**Pasos para filtrar**:
1. Haga clic en el selector "Tipología Municipal"
2. Seleccione la tipología deseada (A, B, C, D) o "Todas"
3. El sistema actualizará automáticamente la lista de entidades disponibles

### Seleccionar una Entidad Territorial

**Pasos**:
1. Haga clic en el selector "Entidad Territorial"
2. Busque y seleccione el departamento o municipio de interés
3. El sistema mostrará un badge con la tipología de la entidad seleccionada
4. Las visualizaciones se actualizarán automáticamente con los datos de la entidad

---

## Interpretación de KPIs

### Entidades Monitoreadas

Muestra el número total de departamentos y municipios incluidos en el sistema. Este número puede variar según el filtro de tipología aplicado.

### Recaudo Total

Presenta el recaudo acumulado de los últimos 30 días en pesos colombianos (COP). Este valor se calcula sumando todos los recaudos de las entidades seleccionadas.

### Semáforo Verde 🟢

Indica el número de entidades cuyo recaudo real cumplió o superó el pronóstico. Estas entidades están en buen estado fiscal y no requieren atención inmediata.

### Semáforo Amarillo 🟡

Muestra las entidades cuyo recaudo está dentro del intervalo de confianza del 95%, pero por debajo del pronóstico. Requieren vigilancia reforzada.

### Semáforo Rojo 🔴

Alerta sobre entidades cuyo recaudo real está significativamente por debajo del límite inferior del intervalo de confianza. Estas entidades requieren intervención inmediata.

---

## Navegación por Tabs

### Tab: Resumen General

Esta sección proporciona una vista panorámica del estado fiscal de todas las entidades.

**Gráfico de Pastel - Distribución por Semáforo**:
- Muestra la proporción de entidades en cada categoría del semáforo (Verde, Amarillo, Rojo)
- Pase el cursor sobre cada sección para ver el número exacto de entidades

**Tarjeta de Monitoreo de Model Drift**:
- **Total eventos**: Número de eventos de divergencia detectados
- **Reentrenamientos requeridos**: Cantidad de modelos que necesitan actualización
- **Tasa de drift**: Porcentaje de eventos de drift sobre el total de predicciones
- **Por severidad**: Desglose de eventos por nivel (Bajo, Medio, Alto, Crítico)

### Tab: Series de Tiempo

Esta sección muestra la evolución histórica del recaudo de la entidad seleccionada.

**Requisito**: Debe seleccionar una entidad territorial en el Selector de Contexto.

**Gráfico de Línea - Recaudos Históricos**:
- **Eje X**: Fechas (últimos 90 días)
- **Eje Y**: Valor del recaudo en COP
- **Línea azul**: Recaudo total por fecha

**Cómo interpretar**:
- Tendencia ascendente: El recaudo está creciendo
- Tendencia descendente: El recaudo está disminuyendo
- Picos: Días con recaudos excepcionales (pueden coincidir con vencimientos de impuestos)
- Valles: Días con recaudos bajos (pueden ser fines de semana o festividades)

### Tab: Predicciones

Esta sección presenta los pronósticos multi-horizonte generados por el sistema.

**Requisito**: Debe seleccionar una entidad territorial.

**Gráfico de Línea Múltiple - Pronósticos**:
- **Línea verde punteada**: Predicción del modelo XGBoost
- **Línea naranja punteada**: Predicción del modelo LSTM
- **Línea azul sólida**: Predicción del modelo Ensemble (combinación de XGBoost y LSTM)
- **Líneas grises punteadas**: Límites del intervalo de confianza del 95%

**Cómo interpretar**:
- La línea azul (Ensemble) es la predicción oficial del sistema
- Si el recaudo real cae fuera de las líneas grises, se activa una alerta
- La distancia entre las líneas grises indica la incertidumbre de la predicción

**Ejemplo de lectura**:
```
Fecha: 15 de marzo de 2020
Predicción Ensemble: $50,000,000 COP
Límite inferior (IC 95%): $45,000,000 COP
Límite superior (IC 95%): $55,000,000 COP

Interpretación: Se espera un recaudo de $50 millones, con un 95% de 
confianza de que el valor real estará entre $45 y $55 millones.
```

### Tab: Model Drift

Esta sección muestra métricas de calidad del modelo predictivo.

**Gráfico de Barras - Métricas de Calidad**:
- **MAPE Local (%)**: Error absoluto porcentual medio de la entidad seleccionada
- **IEP (%)**: Índice de Eficiencia Predictiva

**Cómo interpretar**:
- **MAPE < 10%**: Predicción excelente
- **MAPE 10-15%**: Predicción buena
- **MAPE 15-25%**: Predicción aceptable
- **MAPE > 25%**: Predicción deficiente (modelo requiere reentrenamiento)

**IEP**:
- IEP > 0: El recaudo real superó el pronóstico
- IEP = 0: El pronóstico fue exacto
- IEP < 0: El recaudo real fue menor al pronóstico

---

## Casos de Uso Comunes

### Caso 1: Monitoreo Mensual de Recaudos

**Objetivo**: Revisar el estado fiscal de todas las entidades al final del mes.

**Pasos**:
1. Acceda al dashboard
2. Revise las tarjetas de KPIs en la pantalla principal
3. Identifique el número de entidades en Semáforo Rojo
4. Haga clic en el tab "Resumen General"
5. Analice el gráfico de distribución por semáforo
6. Para cada entidad en rojo:
   - Selecciónela en el Selector de Contexto
   - Revise su serie de tiempo en el tab correspondiente
   - Analice las predicciones para el próximo período
   - Documente las acciones correctivas necesarias

### Caso 2: Análisis de una Entidad Específica

**Objetivo**: Investigar en detalle el comportamiento fiscal de un municipio.

**Pasos**:
1. Seleccione la entidad en el Selector de Contexto
2. Revise la tipología asignada (A/B/C/D)
3. Vaya al tab "Series de Tiempo"
   - Identifique tendencias y patrones
   - Detecte anomalías o picos inusuales
4. Vaya al tab "Predicciones"
   - Revise el pronóstico para los próximos períodos
   - Evalúe la amplitud del intervalo de confianza
5. Vaya al tab "Model Drift"
   - Verifique el MAPE (debe ser < 15%)
   - Revise el IEP para evaluar si el recaudo está cumpliendo expectativas

### Caso 3: Identificación de Entidades en Riesgo

**Objetivo**: Detectar proactivamente entidades que requieren intervención.

**Pasos**:
1. Revise la tarjeta "Semáforo Rojo" en el dashboard principal
2. Filtre por tipología D (Crítico) para priorizar entidades vulnerables
3. Para cada entidad en rojo:
   - Selecciónela en el Selector de Contexto
   - Analice su serie de tiempo para identificar cuándo comenzó la caída
   - Revise las predicciones para evaluar si la situación mejorará
   - Verifique el MAPE en el tab "Model Drift"
4. Genere un reporte con las entidades críticas y las acciones recomendadas

### Caso 4: Evaluación de la Calidad del Modelo

**Objetivo**: Verificar que el modelo predictivo está funcionando correctamente.

**Pasos**:
1. Vaya al tab "Resumen General"
2. Revise la tarjeta "Monitoreo de Model Drift"
3. Verifique que la tasa de drift sea < 15%
4. Revise el desglose por severidad:
   - Si hay eventos críticos, el modelo requiere reentrenamiento
   - Si hay muchos eventos de severidad media, programe una revisión
5. Seleccione algunas entidades aleatorias
6. Para cada una, vaya al tab "Model Drift" y verifique que el MAPE sea < 15%

---

## Preguntas Frecuentes

**P: ¿Con qué frecuencia se actualizan los datos?**  
R: Los datos se actualizan diariamente mediante el pipeline ETL automatizado. Las predicciones se regeneran semanalmente.

**P: ¿Qué significa el badge "Datos Reales 2020"?**  
R: Indica que el sistema está utilizando datos históricos reales del período enero-agosto 2020 del archivo BaseRentasCedidas.xlsx.

**P: ¿Por qué algunas entidades no tienen predicciones?**  
R: Las predicciones requieren un historial mínimo de datos. Entidades con menos de 30 días de datos históricos no tendrán predicciones disponibles.

**P: ¿Qué hago si una entidad está en Semáforo Rojo?**  
R: Revise la serie de tiempo para identificar la causa de la caída en el recaudo. Coordine con la entidad territorial para implementar acciones correctivas (campañas de cobro, facilidades de pago, etc.).

**P: ¿Cómo puedo exportar los datos?**  
R: Actualmente, el sistema no incluye funcionalidad de exportación directa. Contacte al administrador del sistema para solicitar reportes personalizados.

**P: ¿Qué navegadores son compatibles?**  
R: El sistema funciona mejor en Google Chrome, Mozilla Firefox y Microsoft Edge (versiones recientes). No se recomienda Internet Explorer.

**P: ¿Puedo acceder al sistema desde mi celular?**  
R: Sí, el dashboard es responsivo y se adapta a pantallas de dispositivos móviles. Sin embargo, para una mejor experiencia, se recomienda usar una computadora de escritorio o tablet.

---

## Glosario de Términos

**DIVIPOLA**: Código de División Político-Administrativa de Colombia, estándar del DANE para identificar entidades territoriales.

**Ensemble**: Modelo predictivo que combina las predicciones de múltiples modelos (XGBoost y LSTM) para mejorar la precisión.

**IC 95%**: Intervalo de Confianza del 95%. Rango dentro del cual se espera que caiga el valor real con un 95% de probabilidad.

**IEP**: Índice de Eficiencia Predictiva. Mide la desviación porcentual entre el recaudo real y el pronosticado.

**LSTM**: Long Short-Term Memory. Tipo de red neuronal especializada en capturar dependencias temporales de largo plazo.

**MAPE**: Mean Absolute Percentage Error. Error absoluto porcentual medio, métrica de calidad de las predicciones.

**Model Drift**: Degradación del modelo predictivo a lo largo del tiempo debido a cambios en los patrones de datos.

**Rentas Cedidas**: Impuestos nacionales cuyo recaudo es transferido a las entidades territoriales (departamentos y municipios).

**Semáforo de Riesgo Fiscal**: Sistema de clasificación en tres categorías (Verde/Amarillo/Rojo) según el cumplimiento del pronóstico de recaudo.

**Tipología Municipal**: Clasificación de entidades territoriales en cuatro categorías (A/B/C/D) según su capacidad fiscal y nivel de desarrollo.

**XGBoost**: Extreme Gradient Boosting. Algoritmo de Machine Learning especializado en capturar relaciones no lineales entre variables.

---

## Soporte Técnico

Si encuentra problemas técnicos o tiene preguntas sobre el uso del sistema, contacte al equipo de soporte:

**Email**: soporte-satr@entidad.gov.co  
**Teléfono**: +57 (1) 234-5678  
**Horario**: Lunes a viernes, 8:00 AM - 5:00 PM

---

**Autor**: Manus AI  
**Fecha**: Febrero 2026  
**Versión**: 1.0
