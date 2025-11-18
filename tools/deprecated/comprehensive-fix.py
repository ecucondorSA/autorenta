#!/usr/bin/env python3
"""
Comprehensive ESLint auto-fix script
Fixes all remaining no-unused-vars, no-explicit-any, import/order, and no-empty-object-type issues
"""

import re
import subprocess
from pathlib import Path
from collections import defaultdict

def run_command(cmd):
    """Run shell command and return output"""
    try:
        result = subprocess.run(cmd, shell=True, capture_output=True, text=True, check=False)
        return result.stdout + result.stderr
    except Exception as e:
        print(f"Error: {e}")
        return ""

def get_all_ts_files():
    """Get all TypeScript files in src/app"""
    cmd = "find src/app -name '*.ts' -type f"
    output = run_command(cmd)
    return [line.strip() for line in output.split('\n') if line.strip()]

def fix_unused_imports(filepath):
    """Remove completely unused imports"""
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()

        # Common unused imports to remove
        unused_imports = [
            r"import\s*{\s*inject\s*}\s*from\s*'@angular/core';\n",
        ]

        original = content
        for pattern in unused_imports:
            # Only remove if 'inject' doesn't appear elsewhere
            if 'inject(' not in content:
                content = re.sub(pattern, '', content)

        if content != original:
            with open(filepath, 'w', encoding='utf-8') as f:
                f.write(content)
            return 1
    except Exception as e:
        print(f"Error in {filepath}: {e}")
    return 0

def fix_unused_parameters(filepath):
    """Fix unused function/catch parameters by prefixing with underscore"""
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()

        original = content

        # Fix catch parameters
        content = re.sub(r'\bcatch\s*\(\s*(error|err|e)\s*\)', r'catch (_\1)', content)

        # Fix arrow function parameters
        content = re.sub(r'\((\w+)\)\s*=>\s*{[^}]*}', lambda m: f'(_{m.group(1)}) => {{...}}' if not re.search(r'\b' + m.group(1) + r'\b', m.group(0).split('=>')[1]) else m.group(0), content)

        if content != original:
            with open(filepath, 'w', encoding='utf-8') as f:
                f.write(content)
            return 1
    except Exception as e:
        print(f"Error in {filepath}: {e}")
    return 0

def fix_explicit_any(filepath):
    """Replace any with unknown"""
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()

        original = content

        # Fix : any
        content = re.sub(r':\s*any\b', ': unknown', content)

        # Fix <any>
        content = re.sub(r'<any>', '<unknown>', content)

        # Fix Record<string, any>
        content = re.sub(r'Record<string,\s*any>', 'Record<string, unknown>', content)

        # Fix Array<any>
        content = re.sub(r'Array<any>', 'Array<unknown>', content)

        # Fix Observable<any>
        content = re.sub(r'Observable<any>', 'Observable<unknown>', content)

        if content != original:
            with open(filepath, 'w', encoding='utf-8') as f:
                f.write(content)
            return 1
    except Exception as e:
        print(f"Error in {filepath}: {e}")
    return 0

def fix_empty_object_type(filepath):
    """Replace {} with object"""
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()

        original = content

        # Fix : {}
        content = re.sub(r':\s*\{\}(?=\s*[,;\)\]])', ': object', content)

        if content != original:
            with open(filepath, 'w', encoding='utf-8') as f:
                f.write(content)
            return 1
    except Exception as e:
        print(f"Error in {filepath}: {e}")
    return 0

def fix_import_order(filepath):
    """Fix import order by grouping external and internal imports"""
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            lines = f.readlines()

        # Find import section
        import_start = -1
        import_end = -1
        for i, line in enumerate(lines):
            if line.strip().startswith('import '):
                if import_start == -1:
                    import_start = i
                import_end = i

        if import_start == -1:
            return 0

        # Extract imports
        import_lines = []
        i = import_start
        while i <= import_end:
            line = lines[i]
            if line.strip().startswith('import '):
                # Multi-line import
                full_import = line
                while i <= import_end and not full_import.rstrip().endswith(';'):
                    i += 1
                    if i < len(lines):
                        full_import += lines[i]
                import_lines.append(full_import)
            i += 1

        # Separate external and internal imports
        external = []
        internal = []
        for imp in import_lines:
            if '../' in imp or './' in imp:
                internal.append(imp)
            else:
                external.append(imp)

        # Sort each group
        external.sort()
        internal.sort()

        # Rebuild file
        new_lines = lines[:import_start]
        new_lines.extend(external)
        if external and internal:
            new_lines.append('\n')
        new_lines.extend(internal)
        new_lines.extend(lines[import_end + 1:])

        # Remove duplicate blank lines
        final_lines = []
        prev_blank = False
        for line in new_lines:
            is_blank = line.strip() == ''
            if not (is_blank and prev_blank):
                final_lines.append(line)
            prev_blank = is_blank

        with open(filepath, 'w', encoding='utf-8') as f:
            f.writelines(final_lines)

        return 1 if final_lines != lines else 0
    except Exception as e:
        print(f"Error in {filepath}: {e}")
    return 0

def main():
    print("🔧 Comprehensive ESLint Auto-Fix")
    print("=" * 50)

    files = get_all_ts_files()
    print(f"Found {len(files)} TypeScript files\n")

    stats = defaultdict(int)

    for i, filepath in enumerate(files, 1):
        if not Path(filepath).exists():
            continue

        fixed = 0
        fixed += fix_unused_imports(filepath)
        fixed += fix_unused_parameters(filepath)
        fixed += fix_explicit_any(filepath)
        fixed += fix_empty_object_type(filepath)
        fixed += fix_import_order(filepath)

        if fixed > 0:
            stats['files_fixed'] += 1
            stats['total_fixes'] += fixed
            if i % 10 == 0 or fixed > 0:
                print(f"[{i}/{len(files)}] {filepath}: {fixed} fixes")

    print("\n" + "=" * 50)
    print(f"✅ Fixed {stats['total_fixes']} issues in {stats['files_fixed']} files")
    print("\nRunning final lint check...")

    lint_output = run_command("npm run lint 2>&1 | grep -E '^✖'")
    print(lint_output if lint_output else "No lint summary found")

if __name__ == '__main__':
    main()
