#!/usr/bin/env python3

import re
import subprocess
import sys
from pathlib import Path
from collections import defaultdict

def get_lint_issues():
    """Parse ESLint output to get specific issues"""
    try:
        result = subprocess.run(['npm', 'run', 'lint'],
                              capture_output=True, text=True, check=False)
        output = result.stdout + result.stderr
    except Exception as _e:
        print(f"Error running lint: {_e}")
        return {}

    issues = defaultdict(list)
    current_file = None

    for line in output.split('\n'):
        # Match file path
        if line.startswith('/home/edu/autorenta/apps/web/src/'):
            current_file = line.strip()
        # Match issue line
        elif current_file and re.match(r'^\s+\d+:\d+', line):
            match = re.search(r'(\d+):(\d+)\s+(warning|error)\s+(.+?)\s+([@\w/-]+)$', line)
            if match:
                line_num, col, severity, message, rule = match.groups()
                issues[current_file].append({
                    'line': int(line_num),
                    'col': int(col),
                    'severity': severity,
                    'message': message,
                    'rule': rule
                })

    return dict(issues)

def fix_unused_vars(filepath, issues):
    """Fix unused variable warnings by prefixing with underscore"""
    if not Path(filepath).exists():
        return 0

    with open(filepath, 'r') as f:
        lines = f.readlines()

    fixed = 0
    for issue in issues:
        if issue['rule'] != '@typescript-eslint/no-unused-vars':
            continue

        line_idx = issue['line'] - 1
        if line_idx >= len(lines):
            continue

        line = lines[line_idx]
        msg = issue['message']

        # Extract variable name from message
        match = re.search(r"'(\w+)' is defined but never used", msg)
        if not match:
            continue

        var_name = match.group(1)

        # Only fix if it's a catch parameter or function parameter
        if re.search(r'\bcatch\s*\(\s*' + var_name + r'\s*\)', line):
            lines[line_idx] = re.sub(
                r'\bcatch\s*\(\s*' + var_name + r'\s*\)',
                f'catch (_{var_name})',
                line
            )
            fixed += 1
        elif re.search(r'\(.*\b' + var_name + r'\b.*\)\s*[{:]', line):
            # Function parameter - be more careful
            # Only replace if it's followed by : or ) and the message says "Allowed unused args"
            if 'Allowed unused args must match' in msg:
                lines[line_idx] = re.sub(
                    r'\b' + var_name + r'\b',
                    f'_{var_name}',
                    line,
                    count=1
                )
                fixed += 1

    if fixed > 0:
        with open(filepath, 'w') as f:
            f.writelines(lines)

    return fixed

def fix_import_order(filepath, issues):
    """Fix import order warnings"""
    if not Path(filepath).exists():
        return 0

    import_issues = [i for i in issues if i['rule'] == 'import/order']
    if not import_issues:
        return 0

    with open(filepath, 'r') as f:
        content = f.read()

    # Extract all imports
    import_lines = []
    other_lines = []
    in_imports = False

    for line in content.split('\n'):
        if line.startswith('import '):
            import_lines.append(line)
            in_imports = True
        elif in_imports and line.strip() == '':
            import_lines.append(line)
        else:
            if in_imports and line.strip() != '':
                in_imports = False
            other_lines.append(line)

    # Sort imports: external first, then internal (starting with ../)
    external_imports = []
    internal_imports = []

    for line in import_lines:
        if line.strip():
            if '../' in line or './' in line:
                internal_imports.append(line)
            else:
                external_imports.append(line)
        else:
            continue

    # Rebuild file
    new_content = '\n'.join(external_imports + [''] + internal_imports + [''] + other_lines)

    with open(filepath, 'w') as f:
        f.write(new_content)

    return len(import_issues)

def fix_explicit_any(filepath, issues):
    """Fix explicit any warnings by replacing with unknown"""
    if not Path(filepath).exists():
        return 0

    any_issues = [i for i in issues if i['rule'] == '@typescript-eslint/no-explicit-any']
    if not any_issues:
        return 0

    with open(filepath, 'r') as f:
        lines = f.readlines()

    fixed = 0
    for issue in any_issues:
        line_idx = issue['line'] - 1
        if line_idx >= len(lines):
            continue

        line = lines[line_idx]

        # Replace : any with : unknown (but not Record<string, any>)
        if re.search(r':\s*any\s*[,;\)\]]', line):
            lines[line_idx] = re.sub(r':\s*any\s*([,;\)\]])', r': unknown\1', line)
            fixed += 1

    if fixed > 0:
        with open(filepath, 'w') as f:
            f.writelines(lines)

    return fixed

def fix_empty_object_type(filepath, issues):
    """Fix empty object type errors by replacing {} with object"""
    if not Path(filepath).exists():
        return 0

    obj_issues = [i for i in issues if i['rule'] == '@typescript-eslint/no-empty-object-type']
    if not obj_issues:
        return 0

    with open(filepath, 'r') as f:
        lines = f.readlines()

    fixed = 0
    for issue in obj_issues:
        line_idx = issue['line'] - 1
        if line_idx >= len(lines):
            continue

        line = lines[line_idx]

        # Replace : {} with : object
        if re.search(r':\s*{}\s*[,;\)\]]', line):
            lines[line_idx] = re.sub(r':\s*{}\s*([,;\)\]])', r': object\1', line)
            fixed += 1

    if fixed > 0:
        with open(filepath, 'w') as f:
            f.writelines(lines)

    return fixed

def main():
    print("Analyzing ESLint issues...")
    issues = get_lint_issues()

    if not issues:
        print("No issues found or error parsing lint output")
        return

    print(f"Found issues in {len(issues)} files")

    total_fixed = 0

    for filepath, file_issues in issues.items():
        fixed = 0
        fixed += fix_unused_vars(filepath, file_issues)
        fixed += fix_import_order(filepath, file_issues)
        fixed += fix_explicit_any(filepath, file_issues)
        fixed += fix_empty_object_type(filepath, file_issues)

        if fixed > 0:
            print(f"Fixed {fixed} issues in {filepath}")
            total_fixed += fixed

    print(f"\nTotal fixed: {total_fixed} issues")

if __name__ == '__main__':
    main()
