"""
Pipeline ETL para el Sistema de Alerta y Recomendación Territorial (STAR)
Autor: Sistema STAR
Fecha: 2026-02-19

Este módulo implementa el pipeline completo de Extract-Transform-Load para:
1. Ingesta de datos desde BaseRentasCedidas.xlsx
2. Limpieza y preprocesamiento
3. Generación de variables sintéticas (lag, medias móviles, festividades)
4. Agregaciones temporales (diario, semanal, mensual, bimensual)
5. Carga a base de datos MySQL/TiDB
"""

import pandas as pd
import numpy as np
from datetime import datetime, timedelta
from typing import Dict, List, Tuple, Optional
import mysql.connector
from mysql.connector import Error
import os
import json
import logging

# Configurar logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


class ETLPipeline:
    """
    Clase principal para el pipeline ETL del sistema STAR
    """
    
    def __init__(self, database_url: str):
        """
        Inicializa el pipeline ETL
        
        Args:
            database_url: URL de conexión a la base de datos
        """
        self.database_url = database_url
        self.connection = None
        self.cursor = None
        
        # Mapeo de NIT a código DIVIPOLA (debe completarse con datos oficiales)
        self.nit_to_divipola = self._load_divipola_mapping()
        
        # Festividades nacionales de Colombia
        self.festividades_nacionales = self._load_festividades()
    
    def _load_divipola_mapping(self) -> Dict[str, Dict]:
        """
        Carga el mapeo de NIT a código DIVIPOLA
        
        Returns:
            Diccionario con mapeo NIT -> {divipola, nombre, departamento, tipologia}
        """
        # Mapeo inicial basado en el análisis del dataset
        # En producción, esto debe cargarse desde una fuente oficial (DANE)
        mapping = {
            "891680010": {
                "divipola": "27001",
                "nombre": "Departamento CHOCÓ",
                "codigo_departamento": "27",
                "nombre_departamento": "CHOCÓ",
                "tipo_division": "departamento",
                "tipologia": "D"  # Crítico (por defecto, debe calcularse)
            },
            "891580016": {
                "divipola": "19001",
                "nombre": "Departamento CAUCA",
                "codigo_departamento": "19",
                "nombre_departamento": "CAUCA",
                "tipo_division": "departamento",
                "tipologia": "C"
            },
            "892280021": {
                "divipola": "70001",
                "nombre": "Departamento SUCRE",
                "codigo_departamento": "70",
                "nombre_departamento": "SUCRE",
                "tipo_division": "departamento",
                "tipologia": "C"
            },
            "890201235": {
                "divipola": "68001",
                "nombre": "Departamento SANTANDER",
                "codigo_departamento": "68",
                "nombre_departamento": "SANTANDER",
                "tipo_division": "departamento",
                "tipologia": "B"
            },
            "890480059": {
                "divipola": "13001",
                "nombre": "Departamento BOLÍVAR",
                "codigo_departamento": "13",
                "nombre_departamento": "BOLÍVAR",
                "tipo_division": "departamento",
                "tipologia": "B"
            },
            "800246953": {
                "divipola": "11001",
                "nombre": "Distrito BOGOTÁ",
                "codigo_departamento": "11",
                "nombre_departamento": "BOGOTÁ D.C.",
                "tipo_division": "distrito",
                "tipologia": "A"  # Consolidado
            },
            "890001639": {
                "divipola": "63001",
                "nombre": "Departamento QUINDÍO",
                "codigo_departamento": "63",
                "nombre_departamento": "QUINDÍO",
                "tipo_division": "departamento",
                "tipologia": "C"
            },
            "890900286": {
                "divipola": "05001",
                "nombre": "Departamento ANTIOQUIA",
                "codigo_departamento": "05",
                "nombre_departamento": "ANTIOQUIA",
                "tipo_division": "departamento",
                "tipologia": "A"
            },
            "800091594": {
                "divipola": "18001",
                "nombre": "Departamento CAQUETÁ",
                "codigo_departamento": "18",
                "nombre_departamento": "CAQUETÁ",
                "tipo_division": "departamento",
                "tipologia": "D"
            },
            "800103935": {
                "divipola": "23001",
                "nombre": "Departamento CÓRDOBA",
                "codigo_departamento": "23",
                "nombre_departamento": "CÓRDOBA",
                "tipo_division": "departamento",
                "tipologia": "C"
            },
            "890399029": {
                "divipola": "76001",
                "nombre": "Departamento VALLE DEL CAUCA",
                "codigo_departamento": "76",
                "nombre_departamento": "VALLE DEL CAUCA",
                "tipo_division": "departamento",
                "tipologia": "A"
            },
            "891280001": {
                "divipola": "52001",
                "nombre": "Departamento NARIÑO",
                "codigo_departamento": "52",
                "nombre_departamento": "NARIÑO",
                "tipo_division": "departamento",
                "tipologia": "B"
            },
        }
        return mapping
    
    def _load_festividades(self) -> List[Dict]:
        """
        Carga el calendario de festividades nacionales de Colombia
        
        Returns:
            Lista de festividades con fecha y nombre
        """
        # Festividades fijas y móviles de Colombia 2020
        festividades = [
            {"fecha": "2020-01-01", "nombre": "Año Nuevo", "ambito": "nacional"},
            {"fecha": "2020-01-06", "nombre": "Día de los Reyes Magos", "ambito": "nacional"},
            {"fecha": "2020-03-23", "nombre": "Día de San José", "ambito": "nacional"},
            {"fecha": "2020-04-09", "nombre": "Jueves Santo", "ambito": "nacional"},
            {"fecha": "2020-04-10", "nombre": "Viernes Santo", "ambito": "nacional"},
            {"fecha": "2020-05-01", "nombre": "Día del Trabajo", "ambito": "nacional"},
            {"fecha": "2020-05-25", "nombre": "Ascensión del Señor", "ambito": "nacional"},
            {"fecha": "2020-06-15", "nombre": "Corpus Christi", "ambito": "nacional"},
            {"fecha": "2020-06-22", "nombre": "Sagrado Corazón de Jesús", "ambito": "nacional"},
            {"fecha": "2020-06-29", "nombre": "San Pedro y San Pablo", "ambito": "nacional"},
            {"fecha": "2020-07-20", "nombre": "Día de la Independencia", "ambito": "nacional"},
            {"fecha": "2020-08-07", "nombre": "Batalla de Boyacá", "ambito": "nacional"},
            {"fecha": "2020-08-17", "nombre": "Asunción de la Virgen", "ambito": "nacional"},
            {"fecha": "2020-10-12", "nombre": "Día de la Raza", "ambito": "nacional"},
            {"fecha": "2020-11-02", "nombre": "Día de Todos los Santos", "ambito": "nacional"},
            {"fecha": "2020-11-16", "nombre": "Independencia de Cartagena", "ambito": "nacional"},
            {"fecha": "2020-12-08", "nombre": "Inmaculada Concepción", "ambito": "nacional"},
            {"fecha": "2020-12-25", "nombre": "Navidad", "ambito": "nacional"},
        ]
        return festividades
    
    def connect_database(self):
        """Establece conexión con la base de datos"""
        try:
            # Parsear DATABASE_URL
            # Formato: mysql://user:password@host:port/database
            url = self.database_url.replace("mysql://", "")
            auth, host_db = url.split("@")
            user, password = auth.split(":")
            host_port_db = host_db.split("/")
            host_port = host_port_db[0]
            database = host_port_db[1].split("?")[0]  # Remover parámetros SSL
            host, port = host_port.split(":") if ":" in host_port else (host_port, "3306")
            
            self.connection = mysql.connector.connect(
                host=host,
                port=int(port),
                user=user,
                password=password,
                database=database
            )
            self.cursor = self.connection.cursor(dictionary=True)
            logger.info("✓ Conexión a base de datos establecida")
            
        except Error as e:
            logger.error(f"❌ Error al conectar a la base de datos: {e}")
            raise
    
    def disconnect_database(self):
        """Cierra la conexión con la base de datos"""
        if self.cursor:
            self.cursor.close()
        if self.connection and self.connection.is_connected():
            self.connection.close()
            logger.info("✓ Conexión a base de datos cerrada")
    
    def extract_data(self, file_path: str, nrows: Optional[int] = None) -> pd.DataFrame:
        """
        Extrae datos del archivo Excel
        
        Args:
            file_path: Ruta al archivo BaseRentasCedidas.xlsx
            nrows: Número de filas a leer (None = todas)
        
        Returns:
            DataFrame con los datos crudos
        """
        logger.info(f"Extrayendo datos de {file_path}...")
        
        try:
            df = pd.read_excel(file_path, nrows=nrows)
            logger.info(f"✓ Datos extraídos: {df.shape[0]} filas × {df.shape[1]} columnas")
            return df
        except Exception as e:
            logger.error(f"❌ Error al extraer datos: {e}")
            raise
    
    def clean_data(self, df: pd.DataFrame) -> pd.DataFrame:
        """
        Limpia y normaliza los datos
        
        Args:
            df: DataFrame crudo
        
        Returns:
            DataFrame limpio
        """
        logger.info("Limpiando datos...")
        
        # Copiar para no modificar el original
        df_clean = df.copy()
        
        # Normalizar nombres de columnas (eliminar espacios iniciales)
        df_clean.columns = df_clean.columns.str.strip()
        
        # Convertir FechaRecaudo a datetime
        df_clean['FechaRecaudo'] = pd.to_datetime(df_clean['FechaRecaudo'])
        
        # Manejar valores nulos en ValorRecaudo
        df_clean['ValorRecaudo'] = df_clean['ValorRecaudo'].fillna(0)
        
        # Eliminar registros con NIT nulo
        df_clean = df_clean.dropna(subset=['NitBeneficiarioAportante'])
        
        # Convertir NIT a string
        df_clean['NitBeneficiarioAportante'] = df_clean['NitBeneficiarioAportante'].astype(str).str.split('.').str[0]
        
        # Agregar información de DIVIPOLA
        df_clean['CodigoDivipola'] = df_clean['NitBeneficiarioAportante'].map(
            lambda x: self.nit_to_divipola.get(x, {}).get('divipola', 'DESCONOCIDO')
        )
        df_clean['TipoDivision'] = df_clean['NitBeneficiarioAportante'].map(
            lambda x: self.nit_to_divipola.get(x, {}).get('tipo_division', 'desconocido')
        )
        df_clean['Tipologia'] = df_clean['NitBeneficiarioAportante'].map(
            lambda x: self.nit_to_divipola.get(x, {}).get('tipologia', 'D')
        )
        df_clean['CodigoDepartamento'] = df_clean['NitBeneficiarioAportante'].map(
            lambda x: self.nit_to_divipola.get(x, {}).get('codigo_departamento', None)
        )
        df_clean['NombreDepartamento'] = df_clean['NitBeneficiarioAportante'].map(
            lambda x: self.nit_to_divipola.get(x, {}).get('nombre_departamento', None)
        )
        
        logger.info(f"✓ Datos limpios: {df_clean.shape[0]} filas")
        return df_clean
    
    def generate_synthetic_features(self, df: pd.DataFrame) -> pd.DataFrame:
        """
        Genera variables sintéticas (lags, medias móviles, festividades)
        
        Args:
            df: DataFrame limpio
        
        Returns:
            DataFrame con variables sintéticas
        """
        logger.info("Generando variables sintéticas...")
        
        # Agregar por entidad y fecha
        df_agg = df.groupby(['NitBeneficiarioAportante', 'FechaRecaudo']).agg({
            'ValorRecaudo': 'sum',
            'CantidadOperaciones': 'sum',
            'CodigoDivipola': 'first',
            'NombreBeneficiarioAportante': 'first',
            'TipoDivision': 'first',
            'Tipologia': 'first',
            'CodigoDepartamento': 'first',
            'NombreDepartamento': 'first',
        }).reset_index()
        
        # Renombrar columnas
        df_agg.rename(columns={
            'NitBeneficiarioAportante': 'nit',
            'FechaRecaudo': 'fecha',
            'ValorRecaudo': 'valor_recaudo',
            'CantidadOperaciones': 'numero_transacciones',
            'CodigoDivipola': 'codigo_divipola',
            'NombreBeneficiarioAportante': 'nombre_entidad',
            'TipoDivision': 'tipo_division',
            'Tipologia': 'tipologia',
            'CodigoDepartamento': 'codigo_departamento',
            'NombreDepartamento': 'nombre_departamento',
        }, inplace=True)
        
        # Ordenar por entidad y fecha
        df_agg = df_agg.sort_values(['nit', 'fecha'])
        
        # Generar variables de tiempo
        df_agg['vigencia'] = df_agg['fecha'].dt.year
        df_agg['mes'] = df_agg['fecha'].dt.month
        df_agg['trimestre'] = df_agg['fecha'].dt.quarter
        df_agg['dia_semana'] = df_agg['fecha'].dt.dayofweek
        
        # Variables dummy
        df_agg['es_fin_de_semana'] = (df_agg['dia_semana'] >= 5).astype(int)
        
        # Festividades
        fechas_festividades = set([f['fecha'] for f in self.festividades_nacionales])
        df_agg['es_festividad'] = df_agg['fecha'].astype(str).isin(fechas_festividades).astype(int)
        
        # Generar lags y medias móviles por entidad
        for nit in df_agg['nit'].unique():
            mask = df_agg['nit'] == nit
            
            # Lags
            df_agg.loc[mask, 'lag_1'] = df_agg.loc[mask, 'valor_recaudo'].shift(1)
            df_agg.loc[mask, 'lag_3'] = df_agg.loc[mask, 'valor_recaudo'].shift(3)
            df_agg.loc[mask, 'lag_6'] = df_agg.loc[mask, 'valor_recaudo'].shift(6)
            df_agg.loc[mask, 'lag_12'] = df_agg.loc[mask, 'valor_recaudo'].shift(12)
            
            # Medias móviles
            df_agg.loc[mask, 'ma_3'] = df_agg.loc[mask, 'valor_recaudo'].rolling(window=3, min_periods=1).mean()
            df_agg.loc[mask, 'ma_6'] = df_agg.loc[mask, 'valor_recaudo'].rolling(window=6, min_periods=1).mean()
            df_agg.loc[mask, 'ma_12'] = df_agg.loc[mask, 'valor_recaudo'].rolling(window=12, min_periods=1).mean()
        
        logger.info(f"✓ Variables sintéticas generadas: {df_agg.shape[1]} columnas")
        return df_agg
    
    def load_entidades_territoriales(self, df: pd.DataFrame):
        """
        Carga entidades territoriales a la base de datos
        
        Args:
            df: DataFrame con datos procesados
        """
        logger.info("Cargando entidades territoriales...")
        
        # Obtener entidades únicas
        entidades = df[['nit', 'codigo_divipola', 'nombre_entidad', 'tipo_division', 
                        'tipologia', 'codigo_departamento', 'nombre_departamento']].drop_duplicates()
        
        for _, row in entidades.iterrows():
            try:
                query = """
                INSERT INTO entidades_territoriales 
                (nit, codigo_divipola, nombre, tipo_division, tipologia, codigo_departamento, nombre_departamento)
                VALUES (%s, %s, %s, %s, %s, %s, %s)
                ON DUPLICATE KEY UPDATE
                nombre = VALUES(nombre),
                tipo_division = VALUES(tipo_division),
                tipologia = VALUES(tipologia)
                """
                self.cursor.execute(query, (
                    row['nit'],
                    row['codigo_divipola'],
                    row['nombre_entidad'],
                    row['tipo_division'],
                    row['tipologia'],
                    row['codigo_departamento'],
                    row['nombre_departamento']
                ))
            except Error as e:
                logger.error(f"Error al insertar entidad {row['nombre_entidad']}: {e}")
        
        self.connection.commit()
        logger.info(f"✓ {len(entidades)} entidades territoriales cargadas")
    
    def load_recaudos_historicos(self, df: pd.DataFrame):
        """
        Carga recaudos históricos a la base de datos
        
        Args:
            df: DataFrame con datos procesados y variables sintéticas
        """
        logger.info("Cargando recaudos históricos...")
        
        # Obtener IDs de entidades
        self.cursor.execute("SELECT id, nit FROM entidades_territoriales")
        entidades_map = {row['nit']: row['id'] for row in self.cursor.fetchall()}
        
        # Concepto por defecto (debe expandirse según necesidad)
        concepto_id = 1
        
        count = 0
        for _, row in df.iterrows():
            entidad_id = entidades_map.get(row['nit'])
            if not entidad_id:
                continue
            
            try:
                query = """
                INSERT INTO recaudos_historicos 
                (entidad_id, concepto_id, fecha, vigencia, mes, trimestre, 
                 valor_recaudo, numero_transacciones, lag_1, lag_3, lag_6, lag_12,
                 ma_3, ma_6, ma_12, es_festividad, es_fin_de_semana)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                ON DUPLICATE KEY UPDATE
                valor_recaudo = VALUES(valor_recaudo),
                numero_transacciones = VALUES(numero_transacciones),
                lag_1 = VALUES(lag_1),
                lag_3 = VALUES(lag_3),
                lag_6 = VALUES(lag_6),
                lag_12 = VALUES(lag_12),
                ma_3 = VALUES(ma_3),
                ma_6 = VALUES(ma_6),
                ma_12 = VALUES(ma_12)
                """
                self.cursor.execute(query, (
                    entidad_id,
                    concepto_id,
                    row['fecha'].strftime('%Y-%m-%d'),
                    int(row['vigencia']),
                    int(row['mes']),
                    int(row['trimestre']),
                    float(row['valor_recaudo']),
                    int(row['numero_transacciones']),
                    float(row['lag_1']) if pd.notna(row['lag_1']) else None,
                    float(row['lag_3']) if pd.notna(row['lag_3']) else None,
                    float(row['lag_6']) if pd.notna(row['lag_6']) else None,
                    float(row['lag_12']) if pd.notna(row['lag_12']) else None,
                    float(row['ma_3']) if pd.notna(row['ma_3']) else None,
                    float(row['ma_6']) if pd.notna(row['ma_6']) else None,
                    float(row['ma_12']) if pd.notna(row['ma_12']) else None,
                    int(row['es_festividad']),
                    int(row['es_fin_de_semana'])
                ))
                count += 1
                
                if count % 100 == 0:
                    self.connection.commit()
                    logger.info(f"  Procesados {count} registros...")
                    
            except Error as e:
                logger.error(f"Error al insertar recaudo: {e}")
        
        self.connection.commit()
        logger.info(f"✓ {count} recaudos históricos cargados")
    
    def run(self, file_path: str, nrows: Optional[int] = None):
        """
        Ejecuta el pipeline ETL completo
        
        Args:
            file_path: Ruta al archivo Excel
            nrows: Número de filas a procesar (None = todas)
        """
        try:
            logger.info("="*80)
            logger.info("INICIANDO PIPELINE ETL - SISTEMA STAR")
            logger.info("="*80)
            
            # 1. Conectar a base de datos
            self.connect_database()
            
            # 2. Extraer datos
            df_raw = self.extract_data(file_path, nrows)
            
            # 3. Limpiar datos
            df_clean = self.clean_data(df_raw)
            
            # 4. Generar variables sintéticas
            df_processed = self.generate_synthetic_features(df_clean)
            
            # 5. Cargar a base de datos
            self.load_entidades_territoriales(df_processed)
            self.load_recaudos_historicos(df_processed)
            
            logger.info("="*80)
            logger.info("✓ PIPELINE ETL COMPLETADO EXITOSAMENTE")
            logger.info("="*80)
            
        except Exception as e:
            logger.error(f"❌ Error en pipeline ETL: {e}")
            raise
        finally:
            self.disconnect_database()


if __name__ == "__main__":
    # Ejemplo de uso
    DATABASE_URL = os.getenv("DATABASE_URL", "mysql://user:password@localhost:3306/satr")
    FILE_PATH = "C:\\Users\\efren\\Music\\TABLERO_RENTAS\\TABLERO_RENTAS-\\BaseRentasVF_2022_2025.xlsx"
    
    pipeline = ETLPipeline(DATABASE_URL)
    pipeline.run(FILE_PATH, nrows=5000)  # Procesar primeras 5000 filas como prueba
