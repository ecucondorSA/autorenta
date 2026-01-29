#!/bin/bash
# Fix all .from( and .rpc( calls to use .getClient()

echo "🔧 Fixing Supabase service calls..."

# Archivos a corregir
FILES=(
  "split-payment.service.ts"
  "payout.service.ts"
)

for file in "${FILES[@]}"; do
  if [ -f "$file" ]; then
    echo "Fixing $file..."
    
    # Reemplazar .from( por .getClient().from(
    sed -i 's/this\.supabase\.from(/this.supabase.getClient().from(/g' "$file"
    
    # Reemplazar .rpc( por .getClient().rpc(
    sed -i 's/this\.supabase\.rpc(/this.supabase.getClient().rpc(/g' "$file"
    
    echo "✅ $file fixed"
  fi
done

echo "✅ All files fixed!"
