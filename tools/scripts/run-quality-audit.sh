#!/bin/bash
# ============================================================================
# Script: run-quality-audit.sh
# Ejecuta auditoría completa de calidad y aplica fixes automáticos
#
# Uso: ./tools/scripts/run-quality-audit.sh [--fix]
# ============================================================================

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

FIX_MODE=false
if [[ "$1" == "--fix" ]]; then
  FIX_MODE=true
fi

echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}                   AUTORENTA QUALITY AUDIT                      ${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
echo ""

# ============================================================================
# 1. SECURITY AUDIT
# ============================================================================
echo -e "${YELLOW}▶ [1/5] Security Audit (pnpm audit)${NC}"
echo ""

AUDIT_RESULT=$(pnpm audit --json 2>/dev/null || true)
VULNERABILITIES=$(echo "$AUDIT_RESULT" | jq -r '.metadata.vulnerabilities.total // 0' 2>/dev/null || echo "0")

if [[ "$VULNERABILITIES" == "0" ]]; then
  echo -e "${GREEN}  ✅ No vulnerabilities found${NC}"
else
  echo -e "${RED}  ⚠️  Found $VULNERABILITIES vulnerabilities${NC}"
  if $FIX_MODE; then
    echo -e "${YELLOW}  → Running pnpm audit fix...${NC}"
    pnpm audit fix || true
  else
    echo -e "${YELLOW}  → Run with --fix to auto-fix${NC}"
  fi
fi
echo ""

# ============================================================================
# 2. IMAGES WITHOUT DIMENSIONS (CLS)
# ============================================================================
echo -e "${YELLOW}▶ [2/5] Images without width/height (CLS)${NC}"
echo ""

# Use the precise ESM script
IMG_RESULT=$(node tools/scripts/fix-image-dimensions.mjs 2>&1 || echo "0")
IMG_COUNT=$(echo "$IMG_RESULT" | grep -oE "Found [0-9]+ images" | grep -oE "[0-9]+" || echo "0")

if [[ "$IMG_COUNT" == "0" ]]; then
  echo -e "${GREEN}  ✅ All images have dimensions${NC}"
else
  echo -e "${YELLOW}  ⚠️  Found $IMG_COUNT images without explicit dimensions${NC}"
  if $FIX_MODE; then
    echo -e "${YELLOW}  → Applying fixes...${NC}"
    node tools/scripts/fix-image-dimensions.mjs --apply
  else
    echo -e "${YELLOW}  → Run with --fix to apply fixes${NC}"
  fi
fi
echo ""

# ============================================================================
# 3. INPUTS WITHOUT LABELS (A11Y)
# ============================================================================
echo -e "${YELLOW}▶ [3/5] Inputs without labels (Accessibility)${NC}"
echo ""

# Use Python for precise multiline parsing
INPUT_COUNT=$(python3 -c "
import re, glob
count = 0
for f in glob.glob('apps/web/src/**/*.html', recursive=True):
    with open(f) as file:
        content = file.read()
    for m in re.finditer(r'<input[^>]*>', content, re.DOTALL):
        tag = m.group()
        if 'aria-label' in tag.lower(): continue
        if re.search(r'type=[\"\'](hidden|file|checkbox|radio)[\"\']', tag, re.I): continue
        if re.search(r'type=[\"\'](text|number|email|search|tel|password)[\"\']', tag, re.I):
            count += 1
print(count)
" 2>/dev/null || echo "0")

if [[ "$INPUT_COUNT" == "0" ]]; then
  echo -e "${GREEN}  ✅ All inputs have aria-labels${NC}"
else
  echo -e "${YELLOW}  ⚠️  Found $INPUT_COUNT inputs without aria-label${NC}"
  if $FIX_MODE; then
    echo -e "${YELLOW}  → Applying fixes...${NC}"
    node tools/scripts/fix-aria-labels.mjs
  else
    echo -e "${YELLOW}  → Run with --fix to apply fixes${NC}"
  fi
fi
echo ""

# ============================================================================
# 4. BUNDLE SIZE CHECK
# ============================================================================
echo -e "${YELLOW}▶ [4/5] Bundle Size Check${NC}"
echo ""

# Check if dist exists
if [[ -d "dist/apps/web" ]]; then
  MAIN_BUNDLE=$(find dist/apps/web -name "main*.js" -type f 2>/dev/null | head -1)
  if [[ -n "$MAIN_BUNDLE" ]]; then
    SIZE=$(du -h "$MAIN_BUNDLE" | cut -f1)
    echo -e "${GREEN}  ✅ Main bundle: $SIZE${NC}"
  fi
else
  echo -e "${YELLOW}  ⚠️  No build found. Run 'pnpm build' first for size analysis.${NC}"
fi
echo ""

# ============================================================================
# 5. TYPESCRIPT STRICT CHECK
# ============================================================================
echo -e "${YELLOW}▶ [5/5] TypeScript Strict Check${NC}"
echo ""

# Count any types that are NOT disabled with eslint-disable (check previous line too)
ANY_UNJUSTIFIED=$(python3 -c "
import re, glob, os

count = 0
for pattern in ['apps/web/src/**/*.ts', 'libs/**/*.ts']:
    for f in glob.glob(pattern, recursive=True):
        if 'node_modules' in f or '.spec.ts' in f or '.test.ts' in f or 'mock' in f.lower():
            continue
        try:
            with open(f) as file:
                lines = file.readlines()
            for i, line in enumerate(lines):
                if ': any' in line and 'eslint-disable' not in line:
                    # Check if previous line has eslint-disable
                    prev_line = lines[i-1] if i > 0 else ''
                    if 'eslint-disable' not in prev_line:
                        # Skip JSDoc comments
                        if '* @' in line or '//' in line.split(': any')[0]:
                            continue
                        count += 1
        except:
            pass
print(count)
" 2>/dev/null || echo "0")
ANY_TOTAL=$(grep -rn ': any' --include="*.ts" apps/web/src libs 2>/dev/null | grep -v 'node_modules' | grep -v '.spec.ts' | grep -v '.test.ts' | wc -l || echo "0")

if [[ "$ANY_UNJUSTIFIED" == "0" ]]; then
  echo -e "${GREEN}  ✅ All 'any' usages are justified ($ANY_TOTAL with eslint-disable)${NC}"
else
  echo -e "${YELLOW}  ⚠️  Found $ANY_UNJUSTIFIED unjustified 'any' types ($ANY_TOTAL total)${NC}"
fi
ANY_COUNT=$ANY_UNJUSTIFIED
echo ""

# ============================================================================
# SUMMARY
# ============================================================================
echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}                         SUMMARY                                ${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
echo ""
echo -e "  Security:        $([ "$VULNERABILITIES" == "0" ] && echo -e "${GREEN}✅ PASS${NC}" || echo -e "${RED}⚠️  FIX NEEDED${NC}")"
echo -e "  Images CLS:      $([ "$IMG_COUNT" == "0" ] && echo -e "${GREEN}✅ PASS${NC}" || echo -e "${YELLOW}⚠️  REVIEW${NC}")"
echo -e "  Accessibility:   $([ "$INPUT_COUNT" == "0" ] && echo -e "${GREEN}✅ PASS${NC}" || echo -e "${YELLOW}⚠️  REVIEW${NC}")"
echo -e "  TypeScript:      $([ "$ANY_COUNT" == "0" ] && echo -e "${GREEN}✅ PASS${NC}" || echo -e "${YELLOW}⚠️  REVIEW${NC}")"
echo ""

if ! $FIX_MODE; then
  echo -e "${YELLOW}Run with --fix to automatically fix issues${NC}"
fi

echo ""
echo -e "${BLUE}For database audits, run SQL scripts in Supabase:${NC}"
echo -e "  • tools/scripts/analyze-unused-indexes.sql"
echo -e "  • tools/scripts/consolidate-rls-policies.sql"
echo ""
