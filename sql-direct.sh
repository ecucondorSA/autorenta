#!/bin/bash
# Script para ejecutar comandos SQL usando Supabase Direct Connection
# Más estable que pooling para migrations

export PGPASSWORD=ECUCONDOR08122023
DB_URL="postgresql://postgres.obxvffplochgeiclibng:ECUCONDOR08122023@aws-0-us-east-1.pooler.supabase.com:6543/postgres"

if [ "$1" == "-f" ]; then
  # Ejecutar desde archivo
  psql "$DB_URL" -f "$2"
elif [ "$1" == "-i" ]; then
  # Modo interactivo
  psql "$DB_URL"
else
  # Ejecutar comando directo
  psql "$DB_URL" -c "$1"
fi
