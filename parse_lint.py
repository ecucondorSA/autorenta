import re
import json
import sys

def strip_ansi(text):
    ansi_escape = re.compile(r'\x1B(?:[@-Z\\-_]|\[[0-?]*[ -/]*[@-~])')
    return ansi_escape.sub('', text)

def parse_lint_report(file_path):
    files_with_errors = {}
    current_file = None

    with open(file_path, 'r') as f:
        for line in f:
            line = strip_ansi(line).strip()
            if line.startswith('/home/edu/autorenta/'):
                current_file = line
            elif '@typescript-eslint/no-unused-vars' in line:
                if current_file:
                    if current_file not in files_with_errors:
                        files_with_errors[current_file] = []

                    # Extract line number
                    match = re.search(r'^(\d+):', line)
                    if match:
                        line_number = int(match.group(1))
                        files_with_errors[current_file].append(line_number)

    return files_with_errors

if __name__ == "__main__":
    report_file = sys.argv[1]
    errors = parse_lint_report(report_file)
    print(json.dumps(errors, indent=2))
