# Especificación técnica: Pronóstico de Rentas Cedidas con XGBoost + Optuna
**Para implementación en Python**  
Fecha: Mayo 1, 2026 | Proyecto: Rentas Cedidas — Ministerio de Salud, Colombia

---

## 1. Contexto del problema

Se requiere un modelo de pronóstico mensual de recaudo de **Rentas Cedidas** (transferencias fiscales de los departamentos colombianos al sector salud), con horizonte de **12 meses** (Ene–Dic 2026).

- **Dataset:** `BaseRentasVF_limpieza21feb.xlsx` — hoja `Base nueva`
- **Registros:** ~231.984 filas
- **Granularidad de predicción:** mensual agregado nacional (y opcionalmente por entidad/categoría)
- **Variable objetivo:** `ValorRecaudo` agregado por mes (suma)

---

## 2. Estructura del dataset

| Columna | Tipo | Descripción |
|---|---|---|
| `FechaRecaudo` | float (serial Excel) | Fecha del recaudo — convertir con `pd.to_datetime` desde serial |
| `ValorRecaudo` | float | Valor en COP (dividir por 1e9 para Miles de Millones) |
| `NombreSubGrupoFuente` | str | Categoría de renta: `Cigarrillos`, `COLJUEGOS`, `Licores`, `Cerveza`, etc. |
| `NombreConcepto` | str | Descripción del concepto de recaudo |
| `NombreBeneficiarioAportante` | str | Entidad aportante (Gobernación, Fondo, etc.) |
| `TipoRegistro` | str | `Recaudo`, `Retorno`, `Ajuste`, `Transferido` |

### Conversión de fecha Excel:
```python
df['fecha'] = pd.to_datetime(df['FechaRecaudo'] - 25569, unit='D', origin='unix')
# o alternativamente:
df['fecha'] = pd.TimedeltaIndex(df['FechaRecaudo'], unit='D') + pd.Timestamp('1899-12-30')
```

---

## 3. Preprocesamiento y agregación

```python
import pandas as pd
import numpy as np

df = pd.read_excel('BaseRentasVF_limpieza21feb.xlsx', sheet_name='Base nueva')

# Conversión de fecha
df['fecha'] = pd.to_datetime(df['FechaRecaudo'] - 25569, unit='D', origin='unix')
df['anio']  = df['fecha'].dt.year
df['mes']   = df['fecha'].dt.month

# Filtrar solo registros de Recaudo (excluir Retorno/Ajuste si se desea)
df_recaudo = df[df['TipoRegistro'] == 'Recaudo'].copy()

# Agregación mensual nacional
ts = (
    df_recaudo
    .groupby(['anio', 'mes'])['ValorRecaudo']
    .sum()
    .reset_index()
    .sort_values(['anio', 'mes'])
)
ts['valor_mmm'] = ts['ValorRecaudo'] / 1e9   # Miles de millones COP
ts['fecha_mes'] = pd.to_datetime(dict(year=ts['anio'], month=ts['mes'], day=1))
ts = ts.set_index('fecha_mes').sort_index()
```

---

## 4. Feature Engineering

Las siguientes features deben construirse para cada observación `i` (mes):

| Feature | Descripción | Código |
|---|---|---|
| `trend` | Índice temporal normalizado [0,1] | `i / len(series)` |
| `sin_mes` | Estacionalidad seno | `sin(2π·mes/12)` |
| `cos_mes` | Estacionalidad coseno | `cos(2π·mes/12)` |
| `lag_1` | Valor mes anterior | `series[i-1]` |
| `lag_2` | Valor hace 2 meses | `series[i-2]` |
| `lag_3` | Valor hace 3 meses | `series[i-3]` |
| `lag_6` | Valor hace 6 meses | `series[i-6]` |
| `lag_12` | Valor mismo mes año anterior | `series[i-12]` |
| `roll_3` | Media móvil 3 meses | `mean(lag_1, lag_2, lag_3)` |
| `roll_6` | Media móvil 6 meses | `mean(lag_1..lag_6)` |
| `anio_rel` | Año relativo desde inicio | `year - year_min` |

```python
def build_features(series: pd.Series) -> tuple[pd.DataFrame, pd.Series]:
    """
    series: pd.Series con índice DatetimeIndex mensual y valores en MM MM COP
    Retorna: X (features), y (target)
    """
    vals = series.values.astype(float)
    n = len(vals)
    rows, targets = [], []

    for i in range(12, n):
        mes = series.index[i].month
        anio_rel = series.index[i].year - series.index[0].year
        roll3 = np.mean(vals[i-3:i])
        roll6 = np.mean(vals[i-6:i])
        row = {
            'trend':    i / n,
            'sin_mes':  np.sin(2 * np.pi * mes / 12),
            'cos_mes':  np.cos(2 * np.pi * mes / 12),
            'lag_1':    vals[i-1],
            'lag_2':    vals[i-2],
            'lag_3':    vals[i-3],
            'lag_6':    vals[i-6],
            'lag_12':   vals[i-12],
            'roll_3':   roll3,
            'roll_6':   roll6,
            'anio_rel': anio_rel,
        }
        rows.append(row)
        targets.append(vals[i])

    X = pd.DataFrame(rows)
    y = pd.Series(targets, name='valor_mmm')
    return X, y
```

---

## 5. Validación: Walk-Forward Cross-Validation

**CRÍTICO:** No usar K-Fold aleatorio — la serie temporal tiene dependencia temporal. Usar walk-forward expanding window:

```python
from sklearn.metrics import mean_squared_error, mean_absolute_error

def walk_forward_cv(X: pd.DataFrame, y: pd.Series, params: dict, n_folds: int = 4) -> dict:
    """
    Walk-forward cross-validation con ventana expandida.
    Cada fold entrena con todo lo anterior y valida en el siguiente bloque.
    """
    import xgboost as xgb

    n = len(X)
    fold_size = n // (n_folds + 1)
    rmse_list, mae_list = [], []

    for fold in range(1, n_folds + 1):
        train_end  = fold * fold_size
        test_start = train_end
        test_end   = min(train_end + fold_size, n)

        if test_end <= test_start:
            continue

        X_train, y_train = X.iloc[:train_end],     y.iloc[:train_end]
        X_test,  y_test  = X.iloc[test_start:test_end], y.iloc[test_start:test_end]

        model = xgb.XGBRegressor(
            objective='reg:squarederror',
            tree_method='hist',       # rápido en CPU
            random_state=42,
            **params
        )
        model.fit(X_train, y_train, verbose=False)
        preds = model.predict(X_test)

        rmse_list.append(np.sqrt(mean_squared_error(y_test, preds)))
        mae_list.append(mean_absolute_error(y_test, preds))

    return {
        'rmse': float(np.mean(rmse_list)),
        'mae':  float(np.mean(mae_list)),
    }
```

---

## 6. Optimización de Hiperparámetros con Optuna (TPE)

```python
import optuna
optuna.logging.set_verbosity(optuna.logging.WARNING)

def objective(trial: optuna.Trial, X: pd.DataFrame, y: pd.Series) -> float:
    params = {
        'n_estimators':      trial.suggest_int('n_estimators',      50,  200),
        'learning_rate':     trial.suggest_float('learning_rate',    0.01, 0.3,  log=True),
        'max_depth':         trial.suggest_int('max_depth',          2,   6),
        'reg_lambda':        trial.suggest_float('reg_lambda',       0.1, 10.0, log=True),
        'subsample':         trial.suggest_float('subsample',        0.5, 1.0),
        'min_child_weight':  trial.suggest_int('min_child_weight',   1,   8),
        'colsample_bytree':  trial.suggest_float('colsample_bytree', 0.5, 1.0),
        'gamma':             trial.suggest_float('gamma',            0.0, 2.0),
    }
    result = walk_forward_cv(X, y, params, n_folds=4)
    return result['rmse']


def optimize_hyperparams(X: pd.DataFrame, y: pd.Series, n_trials: int = 100) -> dict:
    """
    Ejecuta optimización Optuna TPE.
    Retorna: best_params (dict), study (optuna.Study)
    """
    sampler = optuna.samplers.TPESampler(seed=42)
    study = optuna.create_study(direction='minimize', sampler=sampler,
                                study_name='rentas_cedidas_xgb')
    study.optimize(
        lambda trial: objective(trial, X, y),
        n_trials=n_trials,
        show_progress_bar=True,
    )
    print(f"\n✅ Mejor RMSE: {study.best_value:.4f} MM MM COP")
    print(f"   Trial #{study.best_trial.number}")
    print(f"   Parámetros: {study.best_params}")
    return study.best_params, study
```

---

## 7. Modelo Final y Pronóstico Autoregresivo

```python
import xgboost as xgb

def train_final_model(X: pd.DataFrame, y: pd.Series, best_params: dict) -> xgb.XGBRegressor:
    model = xgb.XGBRegressor(
        objective='reg:squarederror',
        tree_method='hist',
        random_state=42,
        **best_params
    )
    model.fit(X, y, verbose=False)
    return model


def forecast_autoregressive(
    series: pd.Series,
    model: xgb.XGBRegressor,
    steps: int = 12,
) -> pd.Series:
    """
    Pronóstico autoregresivo mes a mes.
    Usa las predicciones previas como input de las siguientes.
    """
    vals = list(series.values.astype(float))
    n_hist = len(vals)
    future_dates = pd.date_range(
        start=series.index[-1] + pd.DateOffset(months=1),
        periods=steps, freq='MS'
    )
    forecasts = []

    for step in range(steps):
        i = n_hist + step
        mes = future_dates[step].month
        anio_rel = future_dates[step].year - series.index[0].year
        roll3 = np.mean(vals[-3:])
        roll6 = np.mean(vals[-6:])
        feat = pd.DataFrame([{
            'trend':    i / (n_hist + steps),
            'sin_mes':  np.sin(2 * np.pi * mes / 12),
            'cos_mes':  np.cos(2 * np.pi * mes / 12),
            'lag_1':    vals[-1],
            'lag_2':    vals[-2],
            'lag_3':    vals[-3],
            'lag_6':    vals[-6],
            'lag_12':   vals[-12],
            'roll_3':   roll3,
            'roll_6':   roll6,
            'anio_rel': anio_rel,
        }])
        pred = float(model.predict(feat)[0])
        vals.append(pred)
        forecasts.append(pred)

    return pd.Series(forecasts, index=future_dates, name='forecast_mmm')
```

---

## 8. Intervalos de Confianza por Bootstrap

```python
def bootstrap_confidence_intervals(
    series: pd.Series,
    best_params: dict,
    steps: int = 12,
    n_bootstrap: int = 200,
    ci: float = 0.90,
    random_state: int = 42,
) -> pd.DataFrame:
    """
    Calcula IC por bootstrap temporal (resampleo de residuales).
    Retorna DataFrame con columnas: mean, lower, upper.
    """
    rng = np.random.default_rng(random_state)
    X, y = build_features(series)
    boot_forecasts = []

    for b in range(n_bootstrap):
        # Resampleo de índices con reemplazo
        idx = rng.integers(0, len(X), size=len(X))
        X_boot, y_boot = X.iloc[idx], y.iloc[idx]
        m = xgb.XGBRegressor(
            objective='reg:squarederror', tree_method='hist',
            random_state=int(rng.integers(0, 9999)), **best_params
        )
        m.fit(X_boot, y_boot, verbose=False)
        # Pronóstico autoregresivo
        vals = list(series.values.astype(float))
        n_hist = len(vals)
        future_dates = pd.date_range(
            start=series.index[-1] + pd.DateOffset(months=1),
            periods=steps, freq='MS'
        )
        fc = []
        for step in range(steps):
            i = n_hist + step
            mes = future_dates[step].month
            anio_rel = future_dates[step].year - series.index[0].year
            feat = pd.DataFrame([{
                'trend': i/(n_hist+steps), 'sin_mes': np.sin(2*np.pi*mes/12),
                'cos_mes': np.cos(2*np.pi*mes/12), 'lag_1': vals[-1],
                'lag_2': vals[-2], 'lag_3': vals[-3], 'lag_6': vals[-6],
                'lag_12': vals[-12], 'roll_3': np.mean(vals[-3:]),
                'roll_6': np.mean(vals[-6:]), 'anio_rel': anio_rel,
            }])
            p = float(m.predict(feat)[0])
            vals.append(p); fc.append(p)
        boot_forecasts.append(fc)

    boot_arr = np.array(boot_forecasts)
    alpha = (1 - ci) / 2
    future_dates = pd.date_range(
        start=series.index[-1] + pd.DateOffset(months=1),
        periods=steps, freq='MS'
    )
    return pd.DataFrame({
        'mean':  boot_arr.mean(axis=0),
        'lower': np.percentile(boot_arr, alpha*100, axis=0),
        'upper': np.percentile(boot_arr, (1-alpha)*100, axis=0),
    }, index=future_dates)
```

---

## 9. Visualizaciones recomendadas (matplotlib / plotly)

### 9.1 Pronóstico + Histórico + IC
```python
import matplotlib.pyplot as plt
import matplotlib.patches as mpatches

def plot_forecast(series, forecast_df, best_params, rmse, r2):
    fig, ax = plt.subplots(figsize=(14, 6))

    # Histórico
    ax.plot(series.index, series.values, color='#2563a8', lw=2, label='Histórico')

    # Pronóstico
    ax.plot(forecast_df.index, forecast_df['mean'], color='#0c7c6b',
            lw=2.5, linestyle='--', marker='o', ms=5, label='Pronóstico XGBoost')

    # IC 90%
    ax.fill_between(forecast_df.index, forecast_df['lower'], forecast_df['upper'],
                    alpha=0.2, color='#0c7c6b', label='IC 90% (bootstrap)')

    # Línea divisoria histórico/pronóstico
    ax.axvline(series.index[-1], color='gray', lw=1, linestyle=':', alpha=.6)

    ax.set_title(f'Pronóstico Rentas Cedidas 2026 — XGBoost+Optuna\nRMSE: {rmse:.2f} MM MM | R²: {r2:.4f}',
                 fontsize=13, pad=12)
    ax.set_ylabel('Recaudo (Miles de Millones COP)')
    ax.set_xlabel('Fecha')
    ax.legend(framealpha=0.9)
    ax.grid(alpha=0.3)
    plt.tight_layout()
    plt.savefig('forecast_rentas_cedidas_2026.png', dpi=150)
    plt.show()
```

### 9.2 Historial de Optuna
```python
import optuna.visualization as ov

# Curva de optimización
ov.plot_optimization_history(study).show()

# Importancia de hiperparámetros
ov.plot_param_importances(study).show()

# Contour plots de interacciones
ov.plot_contour(study, params=['learning_rate', 'max_depth']).show()
```

### 9.3 Importancia de Features
```python
import xgboost as xgb

xgb.plot_importance(model, importance_type='gain', max_num_features=11,
                    title='Importancia de Features (Ganancia)', figsize=(10,6))
plt.tight_layout()
plt.savefig('feature_importance.png', dpi=150)
plt.show()
```

---

## 10. Script principal completo (`main.py`)

```python
"""
main.py — Pronóstico Rentas Cedidas con XGBoost + Optuna
Autor: [Tu nombre]
Fecha: Mayo 2026
"""

import pandas as pd
import numpy as np
import xgboost as xgb
import optuna
from sklearn.metrics import mean_squared_error, r2_score
import warnings
warnings.filterwarnings('ignore')

# ── Importar funciones del módulo ─────────────────────────
# (pegar aquí las funciones de las secciones 3-8 o importarlas)

def main():
    print("=" * 60)
    print("  PRONÓSTICO RENTAS CEDIDAS — XGBoost + Optuna TPE")
    print("=" * 60)

    # 1. Cargar y preprocesar datos
    print("\n[1/6] Cargando datos...")
    df = pd.read_excel('BaseRentasVF_limpieza21feb.xlsx', sheet_name='Base nueva')
    df['fecha'] = pd.to_datetime(df['FechaRecaudo'] - 25569, unit='D', origin='unix')
    df['anio']  = df['fecha'].dt.year
    df['mes']   = df['fecha'].dt.month

    ts = (
        df[df['TipoRegistro'] == 'Recaudo']
        .groupby(['anio', 'mes'])['ValorRecaudo']
        .sum()
        .reset_index()
        .sort_values(['anio', 'mes'])
    )
    ts['fecha_mes'] = pd.to_datetime(dict(year=ts['anio'], month=ts['mes'], day=1))
    series = ts.set_index('fecha_mes')['ValorRecaudo'] / 1e9
    print(f"   Serie: {series.index[0].strftime('%Y-%m')} → {series.index[-1].strftime('%Y-%m')} ({len(series)} meses)")

    # 2. Feature engineering
    print("\n[2/6] Construyendo features...")
    X, y = build_features(series)
    print(f"   X shape: {X.shape} | Features: {list(X.columns)}")

    # 3. Optimización Optuna
    print("\n[3/6] Optimizando hiperparámetros con Optuna (100 trials)...")
    best_params, study = optimize_hyperparams(X, y, n_trials=100)

    # 4. Métricas de validación
    print("\n[4/6] Evaluando modelo final...")
    cv_result = walk_forward_cv(X, y, best_params, n_folds=4)
    model = train_final_model(X, y, best_params)
    train_preds = model.predict(X)
    r2 = r2_score(y, train_preds)
    print(f"   RMSE walk-forward: {cv_result['rmse']:.4f} MM MM COP")
    print(f"   MAE  walk-forward: {cv_result['mae']:.4f} MM MM COP")
    print(f"   R² (entrenamiento): {r2:.4f}")

    # 5. Pronóstico 2026 + IC Bootstrap
    print("\n[5/6] Generando pronóstico 2026 + intervalos de confianza...")
    forecast = forecast_autoregressive(series, model, steps=12)
    ci_df    = bootstrap_confidence_intervals(series, best_params, steps=12, n_bootstrap=200)
    forecast_df = ci_df.copy()
    forecast_df['mean'] = forecast.values

    print("\n  Pronóstico Enero–Diciembre 2026 (MM MM COP):")
    print("  " + "-"*50)
    for fecha, row in forecast_df.iterrows():
        print(f"  {fecha.strftime('%b %Y')}: ${row['mean']:.2f}  [IC90%: ${row['lower']:.1f} – ${row['upper']:.1f}]")
    print(f"\n  Total estimado 2026: ${forecast_df['mean'].sum():.1f} MM MM COP")

    # 6. Exportar resultados
    print("\n[6/6] Exportando resultados...")
    forecast_df.to_csv('forecast_2026_rentas_cedidas.csv')
    print("   ✅ forecast_2026_rentas_cedidas.csv")

    # Visualizar
    plot_forecast(series, forecast_df, best_params, cv_result['rmse'], r2)

    return model, study, forecast_df


if __name__ == '__main__':
    model, study, forecast = main()
```

---

## 11. Dependencias (`requirements.txt`)

```
pandas>=2.0
numpy>=1.24
xgboost>=2.0
optuna>=3.5
scikit-learn>=1.3
matplotlib>=3.7
plotly>=5.18
openpyxl>=3.1
```

Instalar con:
```bash
pip install -r requirements.txt
```

---

## 12. Datos reales de referencia (validación)

Usa estos valores reales del archivo para verificar que tu pipeline los reproduce correctamente:

| Año | Total acumulado (MM MM COP) |
|---|---|
| 2022 | 2.829,0 |
| 2023 | 3.025,8 |
| 2024 | 3.155,0 |
| 2025 | 3.430,6 |

**Series mensuales 2025 (referencia):**
```
Ene: 471.6 | Feb: 273.9 | Mar: 292.9 | Abr: 177.5
May: 189.3 | Jun: 244.9 | Jul: 414.8 | Ago: 270.8
Sep: 273.0 | Oct: 307.0 | Nov: 293.3 | Dic: 221.6
```

**Top categorías acumulado 2020–2025:**
```
Cigarrillos (Comp. Específico): 4.111,5 MM MM
COLJUEGOS (Rég. Subsidiado):    3.044,0 MM MM
Licores, Vinos y Aperitivos:    2.596,6 MM MM
Juegos Suerte y Azar ET:        2.280,8 MM MM
Ad Valorem Cigarrillos:         1.931,4 MM MM
```

---

## 13. Notas de implementación

- **Seed fijo:** `random_state=42` en XGBoost y `seed=42` en Optuna para reproducibilidad
- **Escala:** Trabajar siempre en **Miles de Millones (MM MM) COP**, no en COP crudos
- **Filtro TipoRegistro:** Se recomienda correr también con todos los tipos y comparar RMSE
- **Extensión por entidad:** Misma pipeline se puede aplicar por `NombreSubGrupoFuente` o por `NombreBeneficiarioAportante` para pronósticos desagregados
- **Horizon expandido:** Cambiar `steps=12` a `steps=24` para pronóstico 2026–2027
- **Feature adicional sugerida:** Índice Gini departamental anual como feature exógena (`gini_lag1`)

---

*Generado desde dashboard interactivo — Panel de Control: Rentas Cedidas v2.0*
