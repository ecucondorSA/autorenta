# Scrape Competition

Extrae datos de la competencia para análisis de precios.

## Sitios objetivo
- rentcars.com
- localiza.com
- movida.com.br
- unidas.com.br

## Datos a extraer
- Precios por día
- Categorías de autos
- Promociones activas
- Requisitos de edad/documentos

## Instrucciones

1. Navega a cada sitio
2. Busca alquiler en São Paulo
3. Extrae precios de categoría económica y SUV
4. Guarda en CSV: `tools/data/competition_prices_{fecha}.csv`

## Output
```csv
site,category,daily_price,currency,promo,date
rentcars,economico,89.90,BRL,10% off,2026-01-26
```
