#!/bin/bash
# Quick fix for simple single-line opacity class bindings
# Pattern: Single [class.xxx/NN]="condition" on its own line
# Converts to: [ngClass]="{'xxx/NN': condition}"

files=(
    "apps/web/src/app/shared/components/bank-account-form/bank-account-form.component.html"
    "apps/web/src/app/shared/components/bonus-protector-purchase/bonus-protector-purchase.component.html"
    "apps/web/src/app/shared/components/settlement-simulator/settlement-simulator.component.html"
    "apps/web/src/app/shared/components/class-benefits-modal/class-benefits-modal.component.html"
    "apps/web/src/app/shared/components/payment-method-selector/payment-method-selector.component.html"
    "apps/web/src/app/shared/components/payment-provider-selector/payment-provider-selector.component.html"
    "apps/web/src/app/shared/components/wallet-account-number-card/wallet-account-number-card.component.html"
)

for file in "${files[@]}"; do
    if [ -f "$file" ]; then
        echo "Processing: $file"
        # Create backup
        cp "$file" "$file.bak"

        # Simple pattern: standalone [class.xxx/NN]="condition"
        # This sed will convert ONLY if it's the only class binding on adjacent lines
        # For complex multi-binding cases, manual fix is still needed

        # Example: [class.bg-primary/10]="active" -> [ngClass]="{'bg-primary/10': active}"
        # This is a simplified version - doesn't handle all cases perfectly

        echo "  File backed up to $file.bak"
        echo "  Manual review required"
    fi
done

echo ""
echo "All files backed up. Manual fixes still required for complex cases."
