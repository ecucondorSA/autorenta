INSTRUCCIONES: sobre la migración `20251117_create_mp_webhook_logs.sql`

Se detectó que la migración `20251117_create_mp_webhook_logs.sql` en este repo es redundante porque la tabla `mp_webhook_logs` ya existía en la base de datos objetivo cuando se intentó aplicar. Para evitar confusiones en despliegues automáticos, hacé una de las siguientes acciones manuales:

Opciones recomendadas:
- Renombrar el archivo original a `20251117_create_mp_webhook_logs.sql.disabled` en el repo (mantiene historial pero evita ejecución accidental en pipelines).
- O editar el SQL para usar `CREATE TABLE IF NOT EXISTS` si quieres que sea idempotente.

Nota: este archivo es solo una nota. No se modifica automáticamente por el agente. Si querés que yo renombre/disablee el archivo en el repo, confirmamelo y lo haré (haré commit y push en la rama actual).
