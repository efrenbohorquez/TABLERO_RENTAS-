# Análisis Exploratorio de Datos - BaseRentasCedidas

## Resumen Ejecutivo

El dataset **BaseRentasCedidas.xlsx** contiene registros transaccionales de recaudos de rentas cedidas (impuestos al consumo de licores, cervezas, vinos y aperitivos) por parte de entidades territoriales colombianas. Los datos corresponden al año 2020 (enero a agosto) y están estructurados a nivel de transacción individual.

## Estructura del Dataset

**Dimensiones de la muestra analizada:**
- Filas: 1,000 registros (muestra)
- Columnas: 28 variables
- Período: 2020-01-02 a 2020-08-28
- Valores únicos de fecha: 119 días

## Columnas Clave Identificadas

### Variables Temporales
- **Vigencia**: Año fiscal (2020)
- **MesNombreCalendario**: Nombre del mes (8 valores únicos: Enero a Agosto)
- **FechaRecaudo**: Fecha exacta de la transacción (datetime64)

### Variables Geográficas
- **NitBeneficiarioAportante**: Identificador fiscal de la entidad territorial
- **NombreBeneficiarioAportante**: Nombre de la entidad (34 entidades únicas en la muestra)
  - Ejemplos: "Departamento CHOCÓ", "Distrito BOGOTÁ", "Departamento CAUCA"

**NOTA CRÍTICA**: El dataset NO contiene explícitamente el código DIVIPOLA. Será necesario crear un mapeo entre NIT/Nombre de entidad y código DIVIPOLA para cumplir con los requisitos del sistema.

### Variables de Recaudo
- **ValorRecaudo**: Monto del recaudo (float64)
  - Rango: $2.00 - $4,939,631,963.00
  - Media: $104,302,723.91
  - Mediana: $16,886,900.50
  - **Alta variabilidad**: Indica diferencias significativas entre entidades

### Variables de Clasificación Fiscal
- **NombreCuentaBancaria**: Tipo de impuesto (2 categorías)
  - "IMPUESTO CONSUMO LICORES VINOS APERITIVOS Y SIMILARES"
  - "IMPUESTO CONSUMO CERVEZAS SIFONES Y REFAJOS"

- **CódigoConcepto**: Código del concepto tributario (6 valores únicos)
  - 1102-20: Licores Y Alcohol (Licores Vinos Aperitivos Similares) Nal
  - 1102-07: Impoconsumo De Cerveza (Iva Del 8% Cerveza) Nal.
  - 1102-25: Monopolio De Licores Destilados Nal
  - 1102-19: Licores Y Alcohol (Licores Vinos Aperitivos Similares) Ext
  - 1102-24: Monopolio De Licores Destilados Ext.
  - 1102-23: Monopolio Alcohol Potable - Fabricación Licores Destilados Nal

- **NombreSubGrupoFuente**: Categoría del impuesto (2 valores)
  - "Impoconsumo Licores, Vinos, Aperitivos y Similares"
  - "Impoconsumo Cervezas y Sifones"

## Hallazgos Importantes

### 1. Granularidad de los Datos
Los datos están a nivel de **transacción individual diaria**, lo cual es ideal para:
- Pronósticos de alta frecuencia (diarios)
- Agregaciones temporales flexibles (semanal, mensual, bimensual)
- Detección de patrones estacionales y anomalías

### 2. Entidades Territoriales Identificadas (muestra)
- **Departamentos**: CHOCÓ, CAUCA, SUCRE, SANTANDER, BOLÍVAR, QUINDÍO, ANTIOQUIA, CAQUETÁ, CÓRDOBA, VALLE DEL CAUCA, NARIÑO
- **Distritos**: BOGOTÁ

### 3. Valores Nulos
La muestra analizada presenta **cero valores nulos** en las columnas clave (FechaRecaudo, ValorRecaudo, NombreBeneficiarioAportante), lo cual indica buena calidad de datos.

### 4. Distribución de Recaudos
- **Alta asimetría**: La mediana ($16.9M) es significativamente menor que la media ($104.3M)
- **Valores extremos**: Transacciones desde $2 hasta $4,939M
- **Implicación**: Necesidad de técnicas robustas para manejo de outliers en el modelo predictivo

## Desafíos Identificados

### 1. Ausencia de Código DIVIPOLA
El dataset no incluye el código DIVIPOLA estándar. Soluciones propuestas:
- Crear tabla de mapeo NIT → DIVIPOLA → Nombre Entidad
- Utilizar base de datos oficial del DANE para completar información geográfica
- Implementar normalización de nombres de entidades

### 2. Ausencia de Tipología Municipal
No existe clasificación de municipios en tipologías A/B/C/D. Soluciones propuestas:
- Implementar clasificación basada en criterios objetivos:
  - **Tipo A (Consolidado)**: Recaudo promedio > percentil 75
  - **Tipo B (Emergente)**: Recaudo promedio entre percentil 50-75
  - **Tipo C (Dependiente)**: Recaudo promedio entre percentil 25-50
  - **Tipo D (Crítico)**: Recaudo promedio < percentil 25
- Alternativamente, solicitar clasificación oficial si existe

### 3. Datos Limitados a 2020
La muestra cubre solo 8 meses de 2020. Para modelos robustos de ML:
- Verificar si el archivo completo contiene más años
- Idealmente necesitamos 2-3 años de histórico para LSTM
- Considerar estacionalidad anual y efectos de festividades

### 4. Agregación por Municipio
Los datos están a nivel departamental, no municipal (1,102 municipios). Verificar:
- Si existen registros a nivel municipal en el dataset completo
- Si es necesario trabajar a nivel departamental en lugar de municipal

## Variables Sintéticas a Generar

Según los requisitos del sistema SAT-R:

### 1. Variables de Rezago
- **lag_12**: Rezago de 12 meses (requiere datos de años anteriores)
- **lag_1, lag_3, lag_6**: Rezagos adicionales para capturar patrones

### 2. Medias Móviles
- **ma_3**: Media móvil de 3 meses
- **ma_6**: Media móvil de 6 meses
- **ma_12**: Media móvil de 12 meses (si hay datos suficientes)

### 3. Variables Dummy de Festividades
Calendario de festividades nacionales y regionales:
- Año Nuevo, Semana Santa, Día del Trabajo
- Fiestas patronales por departamento/municipio
- Temporadas de alto consumo (diciembre, festivales regionales)

### 4. Variables Derivadas
- **recaudo_diario_agregado**: Suma de ValorRecaudo por entidad y fecha
- **num_transacciones**: Conteo de transacciones por entidad y fecha
- **recaudo_promedio_transaccion**: ValorRecaudo / num_transacciones
- **variacion_mensual**: Cambio porcentual mes a mes
- **estacionalidad**: Indicadores de mes, trimestre, semestre

## Próximos Pasos

1. **Cargar dataset completo** (no solo muestra de 1,000 filas)
2. **Verificar cobertura temporal** (¿hay más años además de 2020?)
3. **Crear tabla de mapeo** NIT → DIVIPOLA → Entidad → Tipología
4. **Implementar pipeline ETL** para limpieza y generación de variables sintéticas
5. **Agregar datos** a nivel diario por entidad territorial
6. **Diseñar esquema de base de datos** con modelo estrella
7. **Implementar carga inicial** de datos históricos procesados

## Conclusiones

El dataset **BaseRentasCedidas** proporciona una base sólida para el desarrollo del sistema SAT-R, con datos transaccionales detallados y alta calidad. Los principales desafíos son la ausencia de código DIVIPOLA y tipología municipal, que pueden resolverse mediante tablas de mapeo y clasificación algorítmica. La granularidad diaria permite implementar pronósticos multi-horizonte según lo especificado en los requisitos.
