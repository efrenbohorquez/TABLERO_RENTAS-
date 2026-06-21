"""
Script ETL: Extrae datos reales de BaseRentasCedidas.xlsx
y los exporta como JSON para el dashboard React.
"""
import pandas as pd
import json
import os
import numpy as np
from datetime import datetime

EXCEL_FILE = os.path.join(os.path.dirname(__file__), "BaseRentasCedidasVF.xlsx")
OUTPUT_DIR = os.path.join(os.path.dirname(__file__), "star-dashboard", "public", "data")

def clean_col(col):
    """Remove leading/trailing whitespace and special chars from column names."""
    return col.strip().replace('\u2003', '').strip()

def main():
    print("=" * 60)
    print("ETL: Extrayendo datos reales de BaseRentasCedidasVF.xlsx")
    print("=" * 60)

    # 1. LECTURA
    print("\n[1/6] Leyendo Excel completo...")
    df = pd.read_excel(EXCEL_FILE)
    df.columns = [clean_col(c) for c in df.columns]
    print(f"    Filas: {len(df):,}, Columnas: {len(df.columns)}")
    print(f"    Columnas: {list(df.columns)}")

    # 2. LIMPIEZA
    print("\n[2/6] Limpieza de datos...")
    df['FechaRecaudo'] = pd.to_datetime(df['FechaRecaudo'], errors='coerce')
    df['ValorRecaudo'] = pd.to_numeric(df['ValorRecaudo'], errors='coerce').fillna(0)
    df['NombreBeneficiarioAportante'] = df['NombreBeneficiarioAportante'].astype(str).str.strip()
    df['NitBeneficiarioAportante'] = df['NitBeneficiarioAportante'].astype(str).str.strip()

    # Columnas opcionales - limpiar si existen
    for col in ['NombreConcepto', 'CódigoConcepto', 'NombreSubGrupoFuente',
                'NombreGrupoFuente', 'TipoRegistro', 'Nombre_SubGrupo_Aportante',
                'Nombre de Rubro', 'NombreCuentaBancaria']:
        if col in df.columns:
            df[col] = df[col].astype(str).str.strip()

    df = df.dropna(subset=['FechaRecaudo'])
    
    # --- FILTRO ALINEADO CON TESIS (1,101 ENTIDADES) ---
    def is_non_territorial(nombre):
        n = str(nombre).upper()
        keywords = ['MONOPOLIO', 'EMPRESA INDUSTRIAL', 'JUEGOS', 'LICORES', 'BENEFICENCIA', 'LOTERIA', 'EMPRESA PARA EL DESARROLLO', 
                    'HOSPITAL', 'CLINICA', 'EMPRESA', 'CONSORCIO', 'APOSTADORES', 'FONDO', 'INSTITUTO', 'UNIVERSIDAD', 'CORPORACION']
        import re
        if re.search(r'\bS\.?A\.?\b', n): return True
        if re.search(r'\bLTDA\b', n): return True
        if re.search(r'\bESE\b', n): return True
        for k in keywords:
            if k in n: return True
        return False
    
    # 1. Unificar NIT por Nombre (para evitar que un mismo municipio cuente varias veces)
    nit_mapping = df.groupby('NombreBeneficiarioAportante')['NitBeneficiarioAportante'].first()
    df['NitBeneficiarioAportante'] = df['NombreBeneficiarioAportante'].map(nit_mapping)

    # 2. Filtrar a 1,101 basándonos en el conteo de nombre
    ent_counts = df.groupby('NombreBeneficiarioAportante').size()
    valid_names = []
    for name, count in ent_counts.items():
        if count >= 12 and not is_non_territorial(name):
            valid_names.append(name)
            
    df = df[df['NombreBeneficiarioAportante'].isin(valid_names)]
    print(f"    Filas válidas tras filtro tesis (1101 entidades): {len(df):,}")
    # ----------------------------------------------------

    # 3. ENTIDADES TERRITORIALES
    print("\n[3/6] Extrayendo entidades territoriales...")
    entidades = (
        df.groupby(['NitBeneficiarioAportante', 'NombreBeneficiarioAportante'])
        .agg(
            recaudo_total=('ValorRecaudo', 'sum'),
            num_transacciones=('ValorRecaudo', 'count'),
            fecha_min=('FechaRecaudo', 'min'),
            fecha_max=('FechaRecaudo', 'max'),
        )
        .reset_index()
        .sort_values('recaudo_total', ascending=False)
    )

    # Clasificar tipologia basada en recaudo de los MUNICIPIOS/DEPARTAMENTOS
    
    # Primero separamos a las entidades especiales descentralizadas
    def es_entidad_especial(nombre):
        n = str(nombre).upper()
        keywords = ['MONOPOLIO', 'EMPRESA INDUSTRIAL', 'JUEGOS', 'LICORES', 'BENEFICENCIA', 'LOTERIA', 'EMPRESA PARA EL DESARROLLO']
        return any(k in n for k in keywords)

    entidades['es_especial'] = entidades['NombreBeneficiarioAportante'].apply(es_entidad_especial)
    
    # Cuartiles SOLO para los que NO son especiales
    mun_recaudos = entidades[~entidades['es_especial']]['recaudo_total']
    q = mun_recaudos.quantile([0.25, 0.5, 0.75]) if not mun_recaudos.empty else {0.25: 0, 0.5: 0, 0.75: 0}
    
    def assign_tipologia(row):
        if row['es_especial']:
            return 'E'
            
        val = row['recaudo_total']
        if val >= q[0.75]:
            return 'A'
        elif val >= q[0.5]:
            return 'B'
        elif val >= q[0.25]:
            return 'C'
        else:
            return 'D'

    entidades['tipologia'] = entidades.apply(assign_tipologia, axis=1)

    # Detectar tipo de division
    def detect_tipo(nombre):
        n = str(nombre).lower()
        if 'departamento' in n:
            return 'departamento'
        elif 'distrito' in n:
            return 'distrito'
        elif 'municipio' in n:
            return 'municipio'
        return 'otro'

    entidades['tipo_division'] = entidades['NombreBeneficiarioAportante'].apply(detect_tipo)

    # Extraer departamento del nombre
    def extract_depto(nombre):
        parts = str(nombre).split(' ', 1)
        if len(parts) > 1:
            return parts[1].strip()
        return nombre
    entidades['departamento'] = entidades['NombreBeneficiarioAportante'].apply(extract_depto)

    # --- NUEVAS ESTADISTICAS POR MUNICIPIO ---
    # 1. Preparar campos temporales
    df['Mes'] = df['FechaRecaudo'].dt.to_period('M').astype(str)
    df['Anio'] = df['FechaRecaudo'].dt.year

    # 2. Promedio mensual and CV%
    monthly_recaudo = df.groupby(['NitBeneficiarioAportante', 'Mes'])['ValorRecaudo'].sum().reset_index()
    stats = monthly_recaudo.groupby('NitBeneficiarioAportante')['ValorRecaudo'].agg(['mean', 'std']).reset_index()
    stats['cv'] = (stats['std'] / stats['mean'] * 100).fillna(0)
    
    # 3. Mes máximo
    idx_max_month = monthly_recaudo.groupby('NitBeneficiarioAportante')['ValorRecaudo'].idxmax()
    max_months = monthly_recaudo.loc[idx_max_month, ['NitBeneficiarioAportante', 'Mes']]
    
    # 4. Concepto principal
    if 'NombreConcepto' in df.columns:
        concept_recaudo = df.groupby(['NitBeneficiarioAportante', 'NombreConcepto'])['ValorRecaudo'].sum().reset_index()
        idx_max_concept = concept_recaudo.groupby('NitBeneficiarioAportante')['ValorRecaudo'].idxmax()
        top_concepts = concept_recaudo.loc[idx_max_concept, ['NitBeneficiarioAportante', 'NombreConcepto']]
    else:
        top_concepts = pd.DataFrame(columns=['NitBeneficiarioAportante', 'NombreConcepto'])
    
    # 5. Crecimiento YoY (2024 vs 2023)
    yearly = df.groupby(['NitBeneficiarioAportante', 'Anio'])['ValorRecaudo'].sum().unstack(fill_value=0)
    if 2024 in yearly.columns and 2023 in yearly.columns:
        yoy = ((yearly[2024] - yearly[2023]) / yearly[2023].replace(0, 1) * 100).reset_index(name='yoy_growth')
    else:
        yoy = pd.DataFrame({'NitBeneficiarioAportante': yearly.index, 'yoy_growth': 0})
        
    # Unir a entidades
    entidades = entidades.merge(stats[['NitBeneficiarioAportante', 'mean', 'cv']], on='NitBeneficiarioAportante', how='left')
    entidades = entidades.merge(max_months.rename(columns={'Mes': 'mes_max'}), on='NitBeneficiarioAportante', how='left')
    entidades = entidades.merge(top_concepts.rename(columns={'NombreConcepto': 'concepto_principal'}), on='NitBeneficiarioAportante', how='left')
    entidades = entidades.merge(yoy, on='NitBeneficiarioAportante', how='left')
    
    entidades['id'] = range(1, len(entidades) + 1)
    entidades_list = []
    for _, row in entidades.iterrows():
        entidades_list.append({
            'id': int(row['id']),
            'nit': str(row['NitBeneficiarioAportante']),
            'nombre': str(row['NombreBeneficiarioAportante']),
            'tipologia': row['tipologia'],
            'tipo_division': row['tipo_division'],
            'departamento': row['departamento'],
            'recaudo_total': float(row['recaudo_total']),
            'num_transacciones': int(row['num_transacciones']),
            'promedio_mensual': float(row.get('mean', 0) if pd.notna(row.get('mean')) else 0),
            'cv_porcentaje': float(row.get('cv', 0) if pd.notna(row.get('cv')) else 0),
            'mes_max_recaudo': str(row.get('mes_max', '') if pd.notna(row.get('mes_max')) else ''),
            'concepto_principal': str(row.get('concepto_principal', '') if pd.notna(row.get('concepto_principal')) else ''),
            'crecimiento_yoy': float(row.get('yoy_growth', 0) if pd.notna(row.get('yoy_growth')) else 0),
        })

    # Create NIT to ID map
    nit_to_id = dict(zip(entidades['NitBeneficiarioAportante'].astype(str), entidades['id']))

    print(f"    Entidades únicas: {len(entidades_list)}")
    print(f"    Por tipología: A={sum(1 for e in entidades_list if e['tipologia']=='A')}, "
          f"B={sum(1 for e in entidades_list if e['tipologia']=='B')}, "
          f"C={sum(1 for e in entidades_list if e['tipologia']=='C')}, "
          f"D={sum(1 for e in entidades_list if e['tipologia']=='D')}")

    # 4. RECAUDOS AGREGADOS POR ENTIDAD Y FECHA
    print("\n[4/6] Aggregando recaudos por entidad y fecha...")
    df['entidad_id'] = df['NitBeneficiarioAportante'].astype(str).map(nit_to_id)

    recaudos_agg = (
        df.groupby(['entidad_id', pd.Grouper(key='FechaRecaudo', freq='D')])
        .agg(
            valor_total=('ValorRecaudo', 'sum'),
            num_transacciones=('ValorRecaudo', 'count'),
        )
        .reset_index()
    )
    recaudos_agg = recaudos_agg[recaudos_agg['valor_total'] > 0]

    recaudos_list = []
    for _, row in recaudos_agg.iterrows():
        recaudos_list.append({
            'entidad_id': int(row['entidad_id']),
            'fecha': row['FechaRecaudo'].strftime('%Y-%m-%d'),
            'valor_total': float(row['valor_total']),
            'num_transacciones': int(row['num_transacciones']),
        })

    print(f"    Registros de recaudo diario: {len(recaudos_list):,}")

    # 5. CONCEPTOS TRIBUTARIOS
    print("\n[5/6] Extrayendo conceptos tributarios...")
    concept_cols_exist = 'CódigoConcepto' in df.columns and 'NombreConcepto' in df.columns
    conceptos_list = []
    if concept_cols_exist:
        conceptos = df.groupby(['CódigoConcepto', 'NombreConcepto']).agg(
            recaudo_total=('ValorRecaudo', 'sum'),
            num_registros=('ValorRecaudo', 'count'),
        ).reset_index().sort_values('recaudo_total', ascending=False)

        for i, (_, row) in enumerate(conceptos.iterrows(), 1):
            conceptos_list.append({
                'id': i,
                'codigo': str(row['CódigoConcepto']),
                'nombre': str(row['NombreConcepto']),
                'recaudo_total': float(row['recaudo_total']),
                'num_registros': int(row['num_registros']),
            })
    print(f"    Conceptos únicos: {len(conceptos_list)}")

    # 6. RESUMEN POR MES Y ENTIDAD
    print("\n[6/6] Generando resumen mensual...")
    df['mes'] = df['FechaRecaudo'].dt.to_period('M')
    resumen_mensual = (
        df.groupby(['entidad_id', 'mes'])
        .agg(
            valor_total=('ValorRecaudo', 'sum'),
            num_transacciones=('ValorRecaudo', 'count'),
        )
        .reset_index()
    )
    resumen_mensual['mes'] = resumen_mensual['mes'].astype(str)

    resumen_list = []
    for _, row in resumen_mensual.iterrows():
        resumen_list.append({
            'entidad_id': int(row['entidad_id']),
            'mes': row['mes'],
            'valor_total': float(row['valor_total']),
            'num_transacciones': int(row['num_transacciones']),
        })

    # Resumen global por mes
    resumen_global = (
        df.groupby('mes')
        .agg(
            valor_total=('ValorRecaudo', 'sum'),
            num_transacciones=('ValorRecaudo', 'count'),
            num_entidades=('NitBeneficiarioAportante', 'nunique'),
        )
        .reset_index()
    )
    resumen_global['mes'] = resumen_global['mes'].astype(str)

    resumen_global_list = []
    for _, row in resumen_global.iterrows():
        resumen_global_list.append({
            'mes': row['mes'],
            'valor_total': float(row['valor_total']),
            'num_transacciones': int(row['num_transacciones']),
            'num_entidades': int(row['num_entidades']),
        })

    # Recaudos por concepto y mes
    recaudos_concepto_mes = []
    if concept_cols_exist:
        rca = df.groupby(['mes', 'NombreConcepto']).agg(
            valor_total=('ValorRecaudo', 'sum'),
        ).reset_index()
        rca['mes'] = rca['mes'].astype(str)
        for _, row in rca.iterrows():
            recaudos_concepto_mes.append({
                'mes': row['mes'],
                'concepto': str(row['NombreConcepto']),
                'valor_total': float(row['valor_total']),
            })

    # Top 10 entidades por recaudo
    top_entidades = entidades_list[:10]

    # === GUARDAR JSON ===
    os.makedirs(OUTPUT_DIR, exist_ok=True)

    # --- ESTADISTICAS GLOBALES ---
    global_monthly = df.groupby('Mes')['ValorRecaudo'].sum()
    global_mean = global_monthly.mean()
    global_cv = (global_monthly.std() / global_mean * 100) if global_mean else 0
    global_max_month = global_monthly.idxmax() if not global_monthly.empty else ''
    global_concept = df.groupby('NombreConcepto')['ValorRecaudo'].sum().idxmax() if 'NombreConcepto' in df.columns else ''
    global_yearly = df.groupby('Anio')['ValorRecaudo'].sum()
    global_yoy = ((global_yearly.get(2024, 0) - global_yearly.get(2023, 0)) / (global_yearly.get(2023, 1)) * 100) if 2023 in global_yearly else 0

    metadata = {
        'total_registros': len(df),
        'total_entidades': len(entidades_list),
        'total_conceptos': len(conceptos_list),
        'fecha_min': str(df['FechaRecaudo'].min().date()),
        'fecha_max': str(df['FechaRecaudo'].max().date()),
        'recaudo_total_global': float(df['ValorRecaudo'].sum()),
        'promedio_mensual_global': float(global_mean),
        'cv_global': float(global_cv),
        'mes_max_global': str(global_max_month),
        'concepto_principal_global': str(global_concept),
        'crecimiento_yoy_global': float(global_yoy),
        'generado': datetime.now().isoformat()
    }

    data = {
        'metadata': metadata,
        'entidades': entidades_list,
        'conceptos': conceptos_list,
        'recaudos_diarios': recaudos_list,
        'resumen_mensual': resumen_list,
        'resumen_global': resumen_global_list,
        'recaudos_concepto_mes': recaudos_concepto_mes,
        'top_entidades': top_entidades,
    }

    # Save main data
    output_path = os.path.join(OUTPUT_DIR, 'dashboard_data.json')
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, default=str)

    file_size = os.path.getsize(output_path) / (1024 * 1024)
    print(f"\n{'=' * 60}")
    print(f"[OK] Datos exportados a {output_path}")
    print(f"  Tamano: {file_size:.1f} MB")
    print(f"  Entidades: {len(entidades_list)}")
    print(f"  Recaudos diarios: {len(recaudos_list):,}")
    print(f"  Resumen mensual: {len(resumen_list)}")
    print(f"  Conceptos: {len(conceptos_list)}")
    print(f"  Rango de fechas: {data['metadata']['fecha_min']} a {data['metadata']['fecha_max']}")
    print(f"  Recaudo total: ${data['metadata']['recaudo_total_global']:,.0f} COP")
    print(f"{'=' * 60}")


if __name__ == '__main__':
    main()
