#!/bin/bash

# Script para agregar TranslateModule a los imports de componentes

# Buscar todos los archivos .ts que son páginas o componentes
find src/app -type f -name "*.page.ts" -o -name "*.component.ts" | while read -r file; do
  # Verificar si ya tiene TranslateModule
  if ! grep -q "TranslateModule" "$file"; then
    # Verificar si tiene imports array
    if grep -q "imports:\s*\[" "$file"; then
      # Agregar import statement si no existe
      if ! grep -q "import.*TranslateModule.*from '@ngx-translate/core'" "$file"; then
        # Encontrar la última línea de imports
        last_import=$(grep -n "^import" "$file" | tail -1 | cut -d: -f1)
        if [ -n "$last_import" ]; then
          sed -i "${last_import}a import { TranslateModule } from '@ngx-translate/core';" "$file"
        fi
      fi
      
      # Agregar TranslateModule al array de imports
      sed -i "/imports:\s*\[/,/\]/ s/\]/,TranslateModule]/" "$file" | head -1
    fi
  fi
done

echo "✅ TranslateModule agregado a los componentes"
