# Archivo de migraciones archivadas: get_available_cars

Este directorio contiene migraciones históricas relacionadas con la función
`get_available_cars` que han sido reemplazadas por la implementación actual
(`20251116_update_get_available_cars_scoring.sql`).

Motivo del archivado:
- Evitar ruido y duplicación en el directorio principal de migraciones.
- Conservar historial y contexto (no se eliminan definitivamente).

Acciones realizadas:
- Los archivos originales han sido movidos aquí desde `supabase/migrations`.
- No se ejecutó ninguna acción en la base de datos; esto es solo reorganización del repo.

Si es necesario restaurar alguno de estos archivos, muévelos de vuelta a
`supabase/migrations/` o crea un nuevo patch con el contenido deseado.

Fecha de archivado: 2025-11-16
