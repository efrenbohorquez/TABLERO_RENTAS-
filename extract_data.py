"""
Script ETL: Extrae datos reales de BaseRentasCedidas.xlsx
y los exporta como JSON para el dashboard React.
"""
import pandas as pd
import json
import os
import numpy as np
from datetime import datetime

EXCEL_FILE = os.path.join(os.path.dirname(__file__), "BaseRentasVF_2022_2025.xlsx")
OUTPUT_DIR = os.path.join(os.path.dirname(__file__), "sat-r-dashboard", "public", "data")

def clean_col(col):
    """Remove leading/trailing whitespace and special chars from column names."""
    return col.strip().replace('\u2003', '').strip()

def main():
    print("=" * 60)
    print("ETL: Extrayendo datos reales de BaseRentasVF_2022_2025.xlsx")
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
    print(f"    Filas válidas: {len(df):,}")

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

    data = {
        'metadata': {
            'total_registros': len(df),
            'total_entidades': len(entidades_list),
            'total_conceptos': len(conceptos_list),
            'fecha_min': df['FechaRecaudo'].min().strftime('%Y-%m-%d'),
            'fecha_max': df['FechaRecaudo'].max().strftime('%Y-%m-%d'),
            'recaudo_total_global': float(df['ValorRecaudo'].sum()),
            'generado': datetime.now().isoformat(),
        },
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
