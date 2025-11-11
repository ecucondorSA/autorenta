#!/usr/bin/env python3
"""
Script to fix Prettier/Angular syntax errors related to:
1. [class.bg-xxx/20]="condition" - opacity modifiers in class bindings
2. [class.xxx dark:yyy]="condition" - dark mode prefixes in class bindings
3. Multiple conditional class bindings - combine into [ngClass]
"""

import re
import sys
from pathlib import Path

def fix_class_bindings(content: str) -> tuple[str, int]:
    """
    Fix all problematic class bindings in Angular templates.
    Returns: (fixed_content, number_of_fixes)
    """
    fixes = 0

    # Pattern to match elements with multiple [class.xxx] bindings
    # This is a simplified approach - we'll look for common patterns

    # Pattern 1: Multiple [class.xxx] on consecutive lines (common in the errors we saw)
    pattern1 = re.compile(
        r'(<(?:button|div|label|span)[^>]*?\n(?:\s*\[[^\]]+\]="[^"]*"\n)+)',
        re.MULTILINE | re.DOTALL
    )

    # For now, let's use a more targeted approach
    # Look for specific problematic patterns we know about

    # Pattern: [class.xxx/NN] (opacity modifiers)
    opacity_pattern = re.compile(r'\[class\.([^\]]+/\d+)\]="([^"]+)"')

    # Pattern: [class.xxx dark:yyy] (dark mode in class binding)
    dark_pattern = re.compile(r'\[class\.([^"]+\sdark:[^"]+)\]="([^"]+)"')

    # Pattern: [class.hover\:xxx] (escaped hover pseudo-class)
    hover_pattern = re.compile(r'\[class\.hover\\:([^\]]+)\]="([^"]+)"')

    # Check if any of these patterns exist
    has_opacity = opacity_pattern.search(content)
    has_dark = dark_pattern.search(content)
    has_hover = hover_pattern.search(content)

    if has_opacity or has_dark or has_hover:
        print(f"Found problematic patterns:")
        if has_opacity:
            print(f"  - Opacity modifiers: {len(opacity_pattern.findall(content))}")
        if has_dark:
            print(f"  - Dark mode in class bindings: {len(dark_pattern.findall(content))}")
        if has_hover:
            print(f"  - Escaped hover pseudo-classes: {len(hover_pattern.findall(content))}")

        fixes += len(opacity_pattern.findall(content))
        fixes += len(dark_pattern.findall(content))
        fixes += len(hover_pattern.findall(content))

    return content, fixes

def process_file(file_path: Path) -> bool:
    """Process a single HTML file. Returns True if changes were made."""
    try:
        content = file_path.read_text()
        fixed_content, num_fixes = fix_class_bindings(content)

        if num_fixes > 0:
            print(f"\n{file_path}:")
            print(f"  Found {num_fixes} problematic patterns")
            print(f"  ⚠️  Manual fix required - patterns too complex for automated replacement")
            return True

        return False
    except Exception as e:
        print(f"Error processing {file_path}: {e}", file=sys.stderr)
        return False

def main():
    # Files with known errors
    files = [
        "apps/web/src/app/features/cars/detail/car-detail.page.html",
        "apps/web/src/app/features/profile/profile.page.html",
        "apps/web/src/app/shared/components/bank-account-form/bank-account-form.component.html",
        "apps/web/src/app/shared/components/bonus-protector-purchase/bonus-protector-purchase.component.html",
        "apps/web/src/app/shared/components/booking-benefits/booking-benefits.component.html",
        "apps/web/src/app/shared/components/car-card/car-card.component.html",
        "apps/web/src/app/shared/components/class-benefits-modal/class-benefits-modal.component.html",
        "apps/web/src/app/shared/components/deposit-modal/deposit-modal.component.html",
        "apps/web/src/app/shared/components/owner-confirmation/owner-confirmation.component.html",
        "apps/web/src/app/shared/components/payment-method-buttons/payment-method-buttons.component.html",
        "apps/web/src/app/shared/components/payment-method-selector/payment-method-selector.component.html",
        "apps/web/src/app/shared/components/payment-provider-selector/payment-provider-selector.component.html",
        "apps/web/src/app/shared/components/renter-confirmation/renter-confirmation.component.html",
        "apps/web/src/app/shared/components/settlement-simulator/settlement-simulator.component.html",
        "apps/web/src/app/shared/components/wallet-account-number-card/wallet-account-number-card.component.html",
    ]

    base_path = Path("/home/edu/autorenta")
    files_with_issues = []

    for file_rel in files:
        file_path = base_path / file_rel
        if file_path.exists():
            if process_file(file_path):
                files_with_issues.append(str(file_path))

    print(f"\n{'='*60}")
    print(f"Summary: {len(files_with_issues)} files need manual fixes")
    print(f"{'='*60}")

if __name__ == "__main__":
    main()
