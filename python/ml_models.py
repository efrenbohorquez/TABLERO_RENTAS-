"""
Módulo de Modelos Predictivos para STAR
Implementa modelos simplificados de XGBoost y LSTM para pronóstico de recaudos

NOTA: Esta es una implementación simplificada para demostración.
En producción, se requiere:
- Entrenamiento con datos históricos completos (2-3 años)
- Validación cruzada temporal
- Optimización de hiperparámetros
- Evaluación rigurosa de métricas
"""

import numpy as np
import pandas as pd
from typing import Tuple, Dict
import logging

logger = logging.getLogger(__name__)


class SimpleForecastModel:
    """
    Modelo de pronóstico simplificado que genera predicciones basadas en:
    - Promedio histórico
    - Tendencia
    - Estacionalidad
    - Intervalos de confianza del 95%
    
    En producción, esto debe reemplazarse con XGBoost y LSTM entrenados.
    """
    
    def __init__(self, confidence_level: float = 0.95):
        """
        Inicializa el modelo
        
        Args:
            confidence_level: Nivel de confianza para intervalos (default: 0.95)
        """
        self.confidence_level = confidence_level
        self.is_trained = False
        self.mean = None
        self.std = None
        self.trend = None
    
    def train(self, historical_data: pd.DataFrame):
        """
        Entrena el modelo con datos históricos
        
        Args:
            historical_data: DataFrame con columnas ['fecha', 'valor_recaudo']
        """
        logger.info("Entrenando modelo simplificado...")
        
        # Calcular estadísticas básicas
        self.mean = historical_data['valor_recaudo'].mean()
        self.std = historical_data['valor_recaudo'].std()
        
        # Calcular tendencia simple (regresión lineal básica)
        x = np.arange(len(historical_data))
        y = historical_data['valor_recaudo'].values
        self.trend = np.polyfit(x, y, 1)[0]
        
        self.is_trained = True
        logger.info(f"✓ Modelo entrenado - Media: {self.mean:.2f}, Tendencia: {self.trend:.2f}")
    
    def predict(self, steps_ahead: int = 30) -> pd.DataFrame:
        """
        Genera predicciones para los próximos N días
        
        Args:
            steps_ahead: Número de días a pronosticar
        
        Returns:
            DataFrame con predicciones e intervalos de confianza
        """
        if not self.is_trained:
            raise ValueError("El modelo debe ser entrenado antes de predecir")
        
        predictions = []
        for i in range(steps_ahead):
            # Predicción base: media + tendencia
            pred = self.mean + (self.trend * i)
            
            # Agregar componente estacional simple (simulado)
            seasonal = np.sin(2 * np.pi * i / 30) * (self.std * 0.2)
            pred += seasonal
            
            # Intervalos de confianza (95%)
            z_score = 1.96  # Para 95% de confianza
            margin = z_score * self.std
            
            predictions.append({
                'dias_adelante': i + 1,
                'y_pred_xgboost': pred * 0.98,  # Simulado: XGBoost ligeramente conservador
                'y_pred_lstm': pred * 1.02,     # Simulado: LSTM ligeramente optimista
                'y_pred_ensemble': pred,         # Promedio ponderado
                'limite_inferior': pred - margin,
                'limite_superior': pred + margin
            })
        
        return pd.DataFrame(predictions)
    
    def calculate_kpis(self, real_value: float, predicted_value: float, 
                       confidence_interval: Tuple[float, float]) -> Dict:
        """
        Calcula los 3 KPIs críticos del sistema STAR
        
        Args:
            real_value: Valor real de recaudo
            predicted_value: Valor pronosticado
            confidence_interval: Tupla (límite_inferior, límite_superior)
        
        Returns:
            Diccionario con KPIs calculados
        """
        # KPI 1: Índice de Eficiencia Predictiva (IEP)
        if predicted_value != 0:
            iep = ((real_value - predicted_value) / predicted_value) * 100
        else:
            iep = 0
        
        # KPI 2: MAPE (Mean Absolute Percentage Error)
        if predicted_value != 0:
            mape = abs((real_value - predicted_value) / real_value) * 100
        else:
            mape = 0
        
        # KPI 3: Semáforo de Riesgo Fiscal
        limite_inferior, limite_superior = confidence_interval
        
        if real_value < limite_inferior:
            semaforo = "rojo"
        elif real_value < predicted_value:
            semaforo = "amarillo"
        else:
            semaforo = "verde"
        
        return {
            'iep': round(iep, 4),
            'mape_local': round(mape, 4),
            'semaforo_riesgo': semaforo,
            'recaudo_real': real_value,
            'recaudo_pronosticado': predicted_value,
            'brecha_recaudo': real_value - predicted_value
        }
    
    def detect_model_drift(self, recent_errors: list, threshold: float = 15.0) -> Dict:
        """
        Detecta drift del modelo basado en errores recientes
        
        Args:
            recent_errors: Lista de errores porcentuales recientes
            threshold: Umbral de MAPE para activar alerta (default: 15%)
        
        Returns:
            Diccionario con información de drift
        """
        if not recent_errors:
            return {
                'divergencia': 0,
                'umbral_superado': False,
                'severidad': 'bajo',
                'reentrenamiento_requerido': False
            }
        
        # Calcular MAPE promedio de errores recientes
        mape_promedio = np.mean([abs(e) for e in recent_errors])
        
        # Determinar severidad
        if mape_promedio > threshold * 2:
            severidad = 'critico'
            reentrenamiento = True
        elif mape_promedio > threshold * 1.5:
            severidad = 'alto'
            reentrenamiento = True
        elif mape_promedio > threshold:
            severidad = 'medio'
            reentrenamiento = False
        else:
            severidad = 'bajo'
            reentrenamiento = False
        
        return {
            'divergencia': round(mape_promedio, 4),
            'umbral_superado': mape_promedio > threshold,
            'severidad': severidad,
            'reentrenamiento_requerido': reentrenamiento,
            'detalles': f"MAPE promedio: {mape_promedio:.2f}% (últimos {len(recent_errors)} períodos)"
        }


def generate_sample_predictions(entidad_id: int, num_days: int = 30) -> pd.DataFrame:
    """
    Genera predicciones de ejemplo para una entidad territorial
    
    Args:
        entidad_id: ID de la entidad territorial
        num_days: Número de días a pronosticar
    
    Returns:
        DataFrame con predicciones
    """
    # Crear datos históricos simulados
    np.random.seed(entidad_id)  # Para reproducibilidad
    dates = pd.date_range(start='2020-01-01', periods=180, freq='D')
    base_value = np.random.uniform(10_000_000, 100_000_000)
    trend = np.random.uniform(-50000, 50000)
    
    historical = pd.DataFrame({
        'fecha': dates,
        'valor_recaudo': base_value + trend * np.arange(180) + 
                        np.random.normal(0, base_value * 0.1, 180)
    })
    
    # Entrenar modelo
    model = SimpleForecastModel()
    model.train(historical)
    
    # Generar predicciones
    predictions = model.predict(num_days)
    predictions['entidad_id'] = entidad_id
    
    # Agregar fechas de predicción
    last_date = historical['fecha'].max()
    predictions['fecha_prediccion'] = [
        last_date + pd.Timedelta(days=i) 
        for i in range(1, num_days + 1)
    ]
    
    return predictions


def generate_sample_kpis(entidad_id: int, num_periods: int = 30) -> pd.DataFrame:
    """
    Genera KPIs de ejemplo para una entidad territorial
    
    Args:
        entidad_id: ID de la entidad territorial
        num_periods: Número de períodos a generar
    
    Returns:
        DataFrame con KPIs históricos
    """
    model = SimpleForecastModel()
    np.random.seed(entidad_id)
    
    kpis = []
    for i in range(num_periods):
        # Simular valores reales y pronosticados
        predicted = np.random.uniform(10_000_000, 100_000_000)
        real = predicted * np.random.uniform(0.85, 1.15)  # ±15% de variación
        
        confidence_interval = (predicted * 0.9, predicted * 1.1)
        
        kpi = model.calculate_kpis(real, predicted, confidence_interval)
        kpi['entidad_id'] = entidad_id
        kpi['fecha'] = pd.Timestamp('2020-01-01') + pd.Timedelta(days=i)
        kpi['periodo_calculo'] = 'diario'
        
        kpis.append(kpi)
    
    return pd.DataFrame(kpis)


if __name__ == "__main__":
    # Ejemplo de uso
    print("="*80)
    print("DEMO: Modelo Predictivo STAR")
    print("="*80)
    
    # Generar predicciones de ejemplo
    predictions = generate_sample_predictions(entidad_id=1, num_days=30)
    print("\nPredicciones (primeros 5 días):")
    print(predictions.head())
    
    # Generar KPIs de ejemplo
    kpis = generate_sample_kpis(entidad_id=1, num_periods=10)
    print("\nKPIs (primeros 5 períodos):")
    print(kpis.head())
    
    # Detectar drift
    model = SimpleForecastModel()
    recent_errors = [12.5, 14.2, 16.8, 18.3, 20.1]  # Errores porcentuales crecientes
    drift_info = model.detect_model_drift(recent_errors)
    print("\nDetección de Model Drift:")
    print(f"  Divergencia: {drift_info['divergencia']}%")
    print(f"  Severidad: {drift_info['severidad']}")
    print(f"  Reentrenamiento requerido: {drift_info['reentrenamiento_requerido']}")
