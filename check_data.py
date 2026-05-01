import json

with open('star-dashboard/public/data/dashboard_data.json', encoding='utf-8') as f:
    d = json.load(f)

print("Ultimos 10 meses Globales:")
for r in d['resumen_global'][-10:]:
    print(r['mes'], f"${r['valor_total']:,.0f}")

print("\nDAGUA ultimos 10 meses:")
dagua_id = next(e['id'] for e in d['entidades'] if 'DAGUA' in e['nombre'].upper())
x = [r for r in d['resumen_mensual'] if r['entidad_id'] == dagua_id]
for r in x[-10:]:
    print(r['mes'], f"${r['valor_total']:,.0f}")
