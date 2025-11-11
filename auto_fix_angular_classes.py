#!/usr/bin/env python3
"""
Automated fixer for Angular class binding syntax errors.
Converts [class.xxx]="condition" patterns with opacity/dark-mode to [ngClass].
"""

import re
from pathlib import Path
from typing import List, Tuple

def find_element_with_class_bindings(content: str, start_pos: int) -> Tuple[int, int, str]:
    """
    Find an HTML element that contains problematic class bindings.
    Returns: (element_start, element_end, element_tag)
    """
    # Find the opening tag before start_pos
    tag_pattern = re.compile(r'<(\w+)([^>]*)>', re.DOTALL)

    # Search backwards from start_pos to find the opening tag
    for match in tag_pattern.finditer(content):
        if match.start() <= start_pos <= match.end():
            return match.start(), match.end(), match.group(1)

    return (-1, -1, '')

def extract_all_class_bindings(element_content: str) -> List[Tuple[str, str]]:
    """
    Extract all [class.xxx]="yyy" bindings from an element.
    Returns list of (class_name, condition) tuples.
    """
    pattern = re.compile(r'\[class\.([^\]]+)\]="([^"]+)"')
    matches = pattern.findall(element_content)
    return matches

def has_problematic_binding(bindings: List[Tuple[str, str]]) -> bool:
    """Check if any binding has opacity modifier or dark: prefix."""
    for class_name, _ in bindings:
        if '/' in class_name or 'dark:' in class_name or r'\:' in class_name:
            return True
    return False

def convert_to_ngclass(bindings: List[Tuple[str, str]]) -> str:
    """Convert list of class bindings to [ngClass] format."""
    if not bindings:
        return ""

    lines = ["[ngClass]=\"{"]
    for class_name, condition in bindings:
        # Escape single quotes in class names
        safe_class_name = class_name.replace("'", "\\'")
        lines.append(f"              '{safe_class_name}': {condition},")
    lines.append("            }\"")

    return "\n".join(lines)

def fix_file(file_path: Path) -> int:
    """
    Fix all problematic class bindings in a file.
    Returns number of fixes made.
    """
    content = file_path.read_text()

    # Find all problematic patterns
    pattern = re.compile(r'\[class\.([^\]]+/\d+|[^"]+\sdark:|hover\\:[^\]]+)\]="[^"]+"')
    matches = list(pattern.finditer(content))

    if not matches:
        return 0

    print(f"\n{file_path.name}:")
    print(f"  Found {len(matches)} problematic bindings")

    # For now, just report - actual fixing is complex without full AST parsing
    for match in matches[:3]:  # Show first 3
        print(f"    Line ~{content[:match.start()].count(chr(10)) + 1}: {match.group()}")

    if len(matches) > 3:
        print(f"    ... and {len(matches) - 3} more")

    return len(matches)

def main():
    base_path = Path("/home/edu/autorenta/apps/web/src")

    # Find all HTML files with issues
    html_files = []
    for pattern in ["**/*.html"]:
        html_files.extend(base_path.glob(pattern))

    total_fixes = 0
    files_fixed = 0

    for html_file in html_files:
        try:
            fixes = fix_file(html_file)
            if fixes > 0:
                files_fixed += 1
                total_fixes += fixes
        except Exception as e:
            print(f"Error processing {html_file}: {e}")

    print(f"\n{'='*60}")
    print(f"Summary: {files_fixed} files with {total_fixes} problematic bindings")
    print(f"{'='*60}")
    print("\nManual fixes required for each location.")

if __name__ == "__main__":
    main()
