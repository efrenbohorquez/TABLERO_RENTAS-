"""
Pruebas Unitarias para el Pipeline del Sistema STAR
Se verifican las configuraciones básicas y estructuras del entorno.
"""

import os
import pytest

def test_dashboard_data_exists():
    """Verifica que el archivo principal JSON exista tras la ejecución del ETL."""
    data_path = os.path.join(os.path.dirname(__file__), '..', '..', 'star-dashboard', 'public', 'data', 'dashboard_data.json')
    assert os.path.exists(data_path), "Falta el archivo dashboard_data.json"

def test_xgboost_forecast_exists():
    """Verifica que el modelo XGBoost generó el archivo de predicciones."""
    forecast_path = os.path.join(os.path.dirname(__file__), '..', '..', 'star-dashboard', 'public', 'data', 'xgboost_forecast.json')
    assert os.path.exists(forecast_path), "Falta el archivo xgboost_forecast.json"

def test_cv_metrics_exists():
    """Verifica que las métricas de Model Drift y CV hayan sido exportadas."""
    cv_path = os.path.join(os.path.dirname(__file__), '..', '..', 'star-dashboard', 'public', 'data', 'cv_metrics.json')
    assert os.path.exists(cv_path), "Falta el archivo cv_metrics.json"

def test_python_version():
    """Verifica la versión de Python recomendada para pandas y ML."""
    import sys
    assert sys.version_info >= (3, 8), "Se requiere Python 3.8 o superior para el sistema STAR."
