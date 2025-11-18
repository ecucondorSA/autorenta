#!/bin/bash

# Fix all unused error/err variables in catch blocks
find src/app -name "*.ts" -type f -exec perl -i -pe '
  s/catch\s*\(\s*error\s*\)/catch (_error)/g;
  s/catch\s*\(\s*err\s*\)/catch (_err)/g;
  s/catch\s*\(\s*e\s*\)\s*\{/catch (_e) {/g;
' {} \;

# Fix unused function parameters that are errors
find src/app -name "*.ts" -type f -exec perl -i -pe '
  s/\(error\)\s*=>/(_error) =>/g;
  s/\(err\)\s*=>/(_err) =>/g;
  s/\(e\)\s*=>/(_e) =>/g;
' {} \;

# Fix : any to : unknown in simple cases
find src/app -name "*.ts" -type f -exec perl -i -pe '
  s/:\s*any([,;\)\]])/: unknown$1/g;
' {} \;

# Fix Record<string, any> to Record<string, unknown>
find src/app -name "*.ts" -type f -exec perl -i -pe '
  s/Record<string,\s*any>/Record<string, unknown>/g;
' {} \;

# Fix : {} to : object
find src/app -name "*.ts" -type f -exec perl -i -pe '
  s/:\s*\{\}([,;\)\]])/: object$1/g;
' {} \;

echo "Bulk fixes applied"
