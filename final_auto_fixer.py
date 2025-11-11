#!/usr/bin/env python3
"""
Final automated fixer for remaining Angular class binding errors.
This script will ACTUALLY make the changes to files.
"""

import re
from pathlib import Path
from typing import Dict

# Simple mapping: find single-attribute problematic bindings and convert them
# Pattern: elements with a SINGLE [class.xxx/NN] binding (simplest case)

def fix_simple_opacity_binding(content: str) -> tuple[str, int]:
    """
    Fix simple single-line opacity bindings.
    Pattern: [class.xxx/NN]="condition" -> [ngClass]="{'xxx/NN': condition}"
    Only fixes if it's a standalone binding (not part of a group).
    """
    fixes = 0

    # Pattern: Standalone [class.something/number]="condition" on its own line
    # with proper indentation
    pattern = re.compile(
        r'(\s+)\[class\.([^\]]+/\d+)\]="([^"]+)"',
        re.MULTILINE
    )

    def replacement(match):
        nonlocal fixes
        indent = match.group(1)
        class_name = match.group(2)
        condition = match.group(3)
        fixes += 1
        return f'{indent}[ngClass]="{{\'{class_name}\': {condition}}}"'

    # Only replace if NOT followed immediately by another [class.xxx] on next line
    # This is a safety check to avoid breaking multi-binding elements
    lines = content.split('\n')
    new_lines = []

    for i, line in enumerate(lines):
        match = pattern.search(line)
        if match:
            # Check if next line also has a class binding
            next_has_binding = False
            if i + 1 < len(lines):
                next_has_binding = bool(re.search(r'\[class\.', lines[i + 1]))

            if not next_has_binding:
                # Safe to replace
                new_line = pattern.sub(replacement, line)
                new_lines.append(new_line)
            else:
                # Part of multi-binding, skip
                new_lines.append(line)
        else:
            new_lines.append(line)

    return '\n'.join(new_lines), fixes

def fix_file(file_path: Path) -> int:
    """Fix a single file. Returns number of fixes made."""
    try:
        content = file_path.read_text()
        original_content = content

        # Apply fixes
        content, fixes = fix_simple_opacity_binding(content)

        if fixes > 0:
            # Write changes
            file_path.write_text(content)
            print(f"✓ {file_path.name}: Fixed {fixes} simple opacity bindings")
            return fixes
        else:
            return 0

    except Exception as e:
        print(f"✗ Error fixing {file_path}: {e}")
        return 0

def main():
    # Files to fix (those with simple patterns)
    simple_files = [
        "apps/web/src/app/shared/components/class-benefits-modal/class-benefits-modal.component.html",
        "apps/web/src/app/shared/components/payment-method-selector/payment-method-selector.component.html",
        "apps/web/src/app/shared/components/payment-provider-selector/payment-provider-selector.component.html",
        "apps/web/src/app/shared/components/wallet-account-number-card/wallet-account-number-card.component.html",
        "apps/web/src/app/shared/components/settlement-simulator/settlement-simulator.component.html",
    ]

    base_path = Path("/home/edu/autorenta")
    total_fixes = 0

    print("Fixing simple opacity binding patterns...")
    print("=" * 60)

    for file_rel in simple_files:
        file_path = base_path / file_rel
        if file_path.exists():
            fixes = fix_file(file_path)
            total_fixes += fixes

    print("=" * 60)
    print(f"Total: Fixed {total_fixes} simple bindings")
    print("\nNote: Complex multi-binding elements still need manual fixes")

if __name__ == "__main__":
    main()
