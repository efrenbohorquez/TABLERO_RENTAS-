"""
Script de inicialización de datos de ejemplo para STAR
Carga datos sintéticos para demostración del sistema
"""

import os
import sys
import mysql.connector
from mysql.connector import Error
import logging
from datetime import datetime, timedelta
import random

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def seed_conceptos_tributarios(cursor):
    """Carga conceptos tributarios"""
    conceptos = [
        ("1102-20", "Licores Y Alcohol (Licores Vinos Aperitivos Similares) Nal", "Impoconsumo Licores"),
        ("1102-07", "Impoconsumo De Cerveza (Iva Del 8% Cerveza) Nal", "Impoconsumo Cervezas"),
        ("1102-25", "Monopolio De Licores Destilados Nal", "Monopolio Licores"),
    ]
    
    for codigo, nombre, categoria in conceptos:
        cursor.execute("""
            INSERT INTO conceptos_tributarios (codigo, nombre, categoria)
            VALUES (%s, %s, %s)
            ON DUPLICATE KEY UPDATE nombre = VALUES(nombre)
        """, (codigo, nombre, categoria))
    
    logger.info(f"✓ {len(conceptos)} conceptos tributarios cargados")


def seed_entidades_territoriales(cursor):
    """Carga entidades territoriales de ejemplo"""
    entidades = [
        ("891680010", "27001", "Departamento CHOCÓ", "departamento", "D", "27", "CHOCÓ", 500000, "6"),
        ("800246953", "11001", "Distrito BOGOTÁ", "distrito", "A", "11", "BOGOTÁ D.C.", 7500000, "Especial"),
        ("890900286", "05001", "Departamento ANTIOQUIA", "departamento", "A", "05", "ANTIOQUIA", 6500000, "1"),
        ("890399029", "76001", "Departamento VALLE DEL CAUCA", "departamento", "A", "76", "VALLE DEL CAUCA", 4600000, "1"),
        ("891280001", "52001", "Departamento NARIÑO", "departamento", "B", "52", "NARIÑO", 1800000, "2"),
        ("890201235", "68001", "Departamento SANTANDER", "departamento", "B", "68", "SANTANDER", 2100000, "2"),
        ("890480059", "13001", "Departamento BOLÍVAR", "departamento", "B", "13", "BOLÍVAR", 2100000, "2"),
        ("891580016", "19001", "Departamento CAUCA", "departamento", "C", "19", "CAUCA", 1400000, "3"),
        ("892280021", "70001", "Departamento SUCRE", "departamento", "C", "70", "SUCRE", 900000, "3"),
        ("800091594", "18001", "Departamento CAQUETÁ", "departamento", "D", "18", "CAQUETÁ", 400000, "6"),
    ]
    
    for nit, divipola, nombre, tipo, tipologia, cod_dep, nom_dep, poblacion, categoria in entidades:
        cursor.execute("""
            INSERT INTO entidades_territoriales 
            (nit, codigo_divipola, nombre, tipo_division, tipologia, codigo_departamento, 
             nombre_departamento, poblacion, categoria_fiscal)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
            ON DUPLICATE KEY UPDATE 
            nombre = VALUES(nombre),
            poblacion = VALUES(poblacion)
        """, (nit, divipola, nombre, tipo, tipologia, cod_dep, nom_dep, poblacion, categoria))
    
    logger.info(f"✓ {len(entidades)} entidades territoriales cargadas")


def seed_sample_data(cursor, connection):
    """Carga datos de ejemplo de recaudos y predicciones"""
    
    # Obtener IDs de entidades
    cursor.execute("SELECT id, tipologia FROM entidades_territoriales LIMIT 10")
    entidades = cursor.fetchall()
    
    # Obtener ID del concepto
    cursor.execute("SELECT id FROM conceptos_tributarios LIMIT 1")
    concepto_id = cursor.fetchone()['id']
    
    # Generar datos para los últimos 90 días
    start_date = datetime.now() - timedelta(days=90)
    
    count_recaudos = 0
    count_predicciones = 0
    count_kpis = 0
    
    for entidad in entidades:
        entidad_id = entidad['id']
        tipologia = entidad['tipologia']
        
        # Valor base según tipología
        if tipologia == 'A':
            base_value = random.uniform(50_000_000, 200_000_000)
        elif tipologia == 'B':
            base_value = random.uniform(20_000_000, 50_000_000)
        elif tipologia == 'C':
            base_value = random.uniform(5_000_000, 20_000_000)
        else:  # D
            base_value = random.uniform(1_000_000, 5_000_000)
        
        # Generar datos diarios
        for day_offset in range(90):
            fecha = start_date + timedelta(days=day_offset)
            
            # Valor con variación aleatoria
            valor = base_value * random.uniform(0.7, 1.3)
            
            # Recaudo histórico
            cursor.execute("""
                INSERT INTO recaudos_historicos 
                (entidad_id, concepto_id, fecha, vigencia, mes, trimestre, valor_recaudo, numero_transacciones)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                ON DUPLICATE KEY UPDATE valor_recaudo = VALUES(valor_recaudo)
            """, (entidad_id, concepto_id, fecha.strftime('%Y-%m-%d'), 
                  fecha.year, fecha.month, (fecha.month - 1) // 3 + 1, valor, random.randint(1, 10)))
            count_recaudos += 1
            
            # Predicción (solo para los próximos 30 días desde hoy)
            if day_offset >= 60:  # Últimos 30 días
                pred_xgb = valor * random.uniform(0.95, 1.05)
                pred_lstm = valor * random.uniform(0.95, 1.05)
                pred_ensemble = (pred_xgb + pred_lstm) / 2
                
                cursor.execute("""
                    INSERT INTO predicciones 
                    (entidad_id, concepto_id, fecha_prediccion, horizonte, y_pred_xgboost, 
                     y_pred_lstm, y_pred_ensemble, limite_inferior, limite_superior, version_modelo)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                    ON DUPLICATE KEY UPDATE y_pred_ensemble = VALUES(y_pred_ensemble)
                """, (entidad_id, concepto_id, fecha.strftime('%Y-%m-%d'), 'diario',
                      pred_xgb, pred_lstm, pred_ensemble, 
                      pred_ensemble * 0.85, pred_ensemble * 1.15, 'v1.0'))
                count_predicciones += 1
                
                # KPI
                iep = ((valor - pred_ensemble) / pred_ensemble) * 100 if pred_ensemble != 0 else 0
                mape = abs((valor - pred_ensemble) / valor) * 100 if valor != 0 else 0
                
                if valor < pred_ensemble * 0.85:
                    semaforo = 'rojo'
                elif valor < pred_ensemble:
                    semaforo = 'amarillo'
                else:
                    semaforo = 'verde'
                
                cursor.execute("""
                    INSERT INTO kpis_historicos 
                    (entidad_id, fecha, periodo_calculo, iep, mape_global, mape_local, 
                     semaforo_riesgo, recaudo_real, recaudo_pronosticado, brecha_recaudo)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                    ON DUPLICATE KEY UPDATE iep = VALUES(iep)
                """, (entidad_id, fecha.strftime('%Y-%m-%d'), 'diario', iep, mape, mape,
                      semaforo, valor, pred_ensemble, valor - pred_ensemble))
                count_kpis += 1
            
            # Commit cada 100 registros
            if (count_recaudos + count_predicciones + count_kpis) % 100 == 0:
                connection.commit()
    
    connection.commit()
    logger.info(f"✓ {count_recaudos} recaudos históricos cargados")
    logger.info(f"✓ {count_predicciones} predicciones cargadas")
    logger.info(f"✓ {count_kpis} KPIs cargados")


def main():
    """Función principal"""
    DATABASE_URL = os.getenv("DATABASE_URL")
    
    if not DATABASE_URL:
        logger.error("❌ DATABASE_URL no configurada")
        sys.exit(1)
    
    try:
        # Parsear URL
        url = DATABASE_URL.replace("mysql://", "")
        auth, host_db = url.split("@")
        user, password = auth.split(":")
        host_port_db = host_db.split("/")
        host_port = host_port_db[0]
        database = host_port_db[1].split("?")[0]  # Remover parámetros SSL
        host, port = host_port.split(":") if ":" in host_port else (host_port, "3306")
        
        # Conectar
        connection = mysql.connector.connect(
            host=host,
            port=int(port),
            user=user,
            password=password,
            database=database
        )
        cursor = connection.cursor(dictionary=True)
        logger.info("✓ Conectado a base de datos")
        
        # Cargar datos
        logger.info("="*80)
        logger.info("INICIANDO CARGA DE DATOS DE EJEMPLO")
        logger.info("="*80)
        
        seed_conceptos_tributarios(cursor)
        connection.commit()
        
        seed_entidades_territoriales(cursor)
        connection.commit()
        
        seed_sample_data(cursor, connection)
        
        logger.info("="*80)
        logger.info("✓ CARGA DE DATOS COMPLETADA")
        logger.info("="*80)
        
        cursor.close()
        connection.close()
        
    except Error as e:
        logger.error(f"❌ Error: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()
