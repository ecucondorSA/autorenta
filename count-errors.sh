#!/bin/bash
#
# Error Counter Script for Angular/TypeScript Projects
# Analyzes build errors and provides detailed statistics
#
# Usage: ./count-errors.sh [build|watch]
#

set -e

PROJECT_DIR="/home/edu/autorenta/apps/web"
OUTPUT_FILE="/tmp/build_errors.log"
REPORT_FILE="/tmp/error_report.txt"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color
BOLD='\033[1m'

# Function to print colored output
print_color() {
    color=$1
    shift
    echo -e "${color}$@${NC}"
}

# Function to print section header
print_header() {
    echo ""
    print_color "${BOLD}${CYAN}" "═══════════════════════════════════════════════════════════════════════"
    print_color "${BOLD}${CYAN}" "  $1"
    print_color "${BOLD}${CYAN}" "═══════════════════════════════════════════════════════════════════════"
    echo ""
}

# Function to build project and capture errors
build_project() {
    print_header "BUILDING PROJECT..."
    
    cd "$PROJECT_DIR"
    
    if [ "$1" = "watch" ]; then
        print_color "${YELLOW}" "⚠️  Watch mode not supported in script. Using build mode."
    fi
    
    print_color "${BLUE}" "Running: npm run build"
    echo ""
    
    npm run build 2>&1 | tee "$OUTPUT_FILE"
    
    echo ""
}

# Function to count total errors
count_total_errors() {
    grep "✘ \[ERROR\]" "$OUTPUT_FILE" 2>/dev/null | wc -l || echo "0"
}

# Function to count warnings
count_warnings() {
    grep "▲ \[WARNING\]" "$OUTPUT_FILE" 2>/dev/null | wc -l || echo "0"
}

# Function to extract errors by file
extract_errors_by_file() {
    grep -B1 "✘ \[ERROR\]" "$OUTPUT_FILE" 2>/dev/null | \
    grep "src/app/" | \
    sed 's/:[0-9]*:[0-9]*:.*//' | \
    sort | uniq -c | sort -rn
}

# Function to extract error types
extract_error_types() {
    grep "✘ \[ERROR\]" "$OUTPUT_FILE" 2>/dev/null | \
    sed 's/.*TS\([0-9]*\):.*/TS\1/' | \
    sort | uniq -c | sort -rn | head -20
}

# Function to extract most common error messages
extract_common_errors() {
    grep "✘ \[ERROR\]" "$OUTPUT_FILE" 2>/dev/null | \
    sed 's/.*TS[0-9]*: //' | \
    sed 's/\[plugin angular-compiler\]//' | \
    cut -d'.' -f1 | \
    sort | uniq -c | sort -rn | head -15
}

# Function to generate full report
generate_report() {
    local total_errors=$(count_total_errors)
    local total_warnings=$(count_warnings)
    
    {
        print_header "ERROR ANALYSIS REPORT"
        
        # Summary
        print_color "${BOLD}" "📊 SUMMARY"
        echo ""
        if [ "$total_errors" -eq 0 ]; then
            print_color "${GREEN}" "✅ Total Errors: $total_errors"
        elif [ "$total_errors" -lt 50 ]; then
            print_color "${YELLOW}" "⚠️  Total Errors: $total_errors"
        else
            print_color "${RED}" "❌ Total Errors: $total_errors"
        fi
        print_color "${YELLOW}" "⚠️  Total Warnings: $total_warnings"
        echo ""
        
        # Top files with errors
        print_header "🔴 TOP 15 FILES WITH MOST ERRORS"
        
        local file_errors=$(extract_errors_by_file)
        
        if [ -z "$file_errors" ]; then
            print_color "${GREEN}" "✅ No errors found!"
        else
            echo "$file_errors" | head -15 | while read count file; do
                if [ "$count" -gt 10 ]; then
                    print_color "${RED}" "$(printf '%4d' $count) errors - ${file}"
                elif [ "$count" -gt 5 ]; then
                    print_color "${YELLOW}" "$(printf '%4d' $count) errors - ${file}"
                else
                    print_color "${BLUE}" "$(printf '%4d' $count) errors - ${file}"
                fi
            done
        fi
        
        echo ""
        
        # Error types
        print_header "📋 TOP 20 ERROR TYPES (by TypeScript Error Code)"
        
        local error_types=$(extract_error_types)
        
        if [ -z "$error_types" ]; then
            print_color "${GREEN}" "✅ No errors found!"
        else
            echo "$error_types" | while read count code; do
                printf "%4d occurrences - %s\n" "$count" "$code"
            done
        fi
        
        echo ""
        
        # Common error messages
        print_header "💬 TOP 15 MOST COMMON ERROR MESSAGES"
        
        local common_errors=$(extract_common_errors)
        
        if [ -z "$common_errors" ]; then
            print_color "${GREEN}" "✅ No errors found!"
        else
            echo "$common_errors" | while read count message; do
                printf "%4d - %s\n" "$count" "$message"
            done
        fi
        
        echo ""
        
        # Recommendations
        if [ "$total_errors" -gt 0 ]; then
            print_header "🎯 RECOMMENDATIONS"
            
            # Analyze patterns
            local service_errors=$(echo "$file_errors" | grep -c "service.ts" || echo "0")
            local component_errors=$(echo "$file_errors" | grep -c "component.ts" || echo "0")
            local page_errors=$(echo "$file_errors" | grep -c "page.ts" || echo "0")
            
            if [ "$service_errors" -gt 5 ]; then
                print_color "${YELLOW}" "⚠️  Multiple service files have errors ($service_errors files)"
                echo "   → Focus on fixing core services first (they're used everywhere)"
            fi
            
            if [ "$component_errors" -gt 10 ]; then
                print_color "${YELLOW}" "⚠️  Many component files have errors ($component_errors files)"
                echo "   → Check for missing imports or type definitions"
            fi
            
            if [ "$page_errors" -gt 5 ]; then
                print_color "${YELLOW}" "⚠️  Multiple pages have errors ($page_errors files)"
                echo "   → Pages may need type updates from services"
            fi
            
            # Check for specific patterns
            if grep -q "does not exist on type" "$OUTPUT_FILE"; then
                echo ""
                print_color "${CYAN}" "💡 TIP: Many 'property does not exist' errors detected"
                echo "   → Run: supabase gen types to regenerate types"
                echo "   → Check if service methods are properly defined"
            fi
            
            if grep -q "implicitly has an 'any' type" "$OUTPUT_FILE"; then
                echo ""
                print_color "${CYAN}" "💡 TIP: Implicit 'any' types detected"
                echo "   → Add explicit type annotations"
                echo "   → Enable strict type checking gradually"
            fi
            
            if grep -q "Observable" "$OUTPUT_FILE"; then
                echo ""
                print_color "${CYAN}" "💡 TIP: Observable-related errors detected"
                echo "   → Check if .subscribe() is missing"
                echo "   → Ensure proper RxJS operators are used"
            fi
        fi
        
        echo ""
        print_header "REPORT COMPLETE"
        echo ""
        print_color "${GREEN}" "✅ Full log saved to: $OUTPUT_FILE"
        print_color "${GREEN}" "✅ Report saved to: $REPORT_FILE"
        echo ""
        
    } | tee "$REPORT_FILE"
}

# Function to compare with previous run
compare_with_previous() {
    local prev_file="/tmp/previous_error_count.txt"
    local current_count=$(count_total_errors)
    
    if [ -f "$prev_file" ]; then
        local prev_count=$(cat "$prev_file")
        local diff=$((current_count - prev_count))
        
        echo ""
        print_header "📈 COMPARISON WITH PREVIOUS RUN"
        echo ""
        print_color "${BLUE}" "Previous: $prev_count errors"
        print_color "${BLUE}" "Current:  $current_count errors"
        
        if [ "$diff" -lt 0 ]; then
            print_color "${GREEN}" "Progress: ${diff#-} errors fixed! 🎉"
        elif [ "$diff" -gt 0 ]; then
            print_color "${RED}" "Regression: +$diff new errors"
        else
            print_color "${YELLOW}" "No change"
        fi
        echo ""
    fi
    
    # Save current count
    echo "$current_count" > "$prev_file"
}

# Main execution
main() {
    clear
    
    print_header "TypeScript Error Counter & Analyzer"
    print_color "${BLUE}" "Project: $PROJECT_DIR"
    print_color "${BLUE}" "Date: $(date '+%Y-%m-%d %H:%M:%S')"
    
    # Build project
    build_project "$1"
    
    # Generate report
    generate_report
    
    # Compare with previous
    compare_with_previous
    
    # Return exit code based on error count
    local total=$(count_total_errors)
    if [ "$total" -eq 0 ]; then
        exit 0
    else
        exit 1
    fi
}

# Run main
main "$@"
