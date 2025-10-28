#!/bin/bash

# Claude Automation Script for Autorenta
# This script enables autonomous operation for Claude Code

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Load environment
load_env() {
    if [ -f "$PROJECT_ROOT/.env" ]; then
        log_info "Loading environment variables..."
        export $(cat "$PROJECT_ROOT/.env" | grep -v '^#' | xargs)
    fi
}

# Pre-commit automation
pre_commit_checks() {
    log_info "Running pre-commit checks..."
    
    cd "$PROJECT_ROOT"
    
    # Lint check
    log_info "Running lint..."
    if pnpm run lint; then
        log_success "Lint check passed"
    else
        log_error "Lint check failed"
        return 1
    fi
    
    # Quick tests
    log_info "Running quick tests..."
    if pnpm run test:quick; then
        log_success "Quick tests passed"
    else
        log_error "Quick tests failed"
        return 1
    fi
    
    log_success "All pre-commit checks passed!"
}

# Pre-deployment automation
pre_deploy_checks() {
    log_info "Running pre-deployment checks..."
    
    cd "$PROJECT_ROOT"
    
    # Sync types
    log_info "Syncing Supabase types..."
    if pnpm run sync:types; then
        log_success "Types synced"
    else
        log_warning "Type sync failed, continuing..."
    fi
    
    # Run CI pipeline
    log_info "Running CI pipeline..."
    if pnpm run ci; then
        log_success "CI pipeline passed"
    else
        log_error "CI pipeline failed"
        return 1
    fi
    
    # Build
    log_info "Building project..."
    if pnpm run build; then
        log_success "Build successful"
    else
        log_error "Build failed"
        return 1
    fi
    
    log_success "All pre-deployment checks passed!"
}

# Code review automation
code_review() {
    log_info "Running automated code review..."
    
    cd "$PROJECT_ROOT"
    
    # Check for common issues
    log_info "Checking for console.log statements..."
    if git diff --cached | grep -q 'console\.log'; then
        log_warning "Found console.log statements in staged changes"
    fi
    
    # Check for TODO comments
    log_info "Checking for TODO comments..."
    if git diff --cached | grep -q 'TODO'; then
        log_warning "Found TODO comments in staged changes"
    fi
    
    # Check for hardcoded secrets
    log_info "Checking for potential secrets..."
    if git diff --cached | grep -iE '(api_key|password|secret|token).*=.*["\047]'; then
        log_error "Potential hardcoded secrets found!"
        return 1
    fi
    
    log_success "Code review completed"
}

# Setup development environment
setup_dev() {
    log_info "Setting up development environment..."
    
    cd "$PROJECT_ROOT"
    
    # Install dependencies
    if [ ! -d "node_modules" ]; then
        log_info "Installing dependencies..."
        pnpm install
    fi
    
    # Check for required tools
    log_info "Checking required tools..."
    
    if ! command -v pnpm &> /dev/null; then
        log_error "pnpm is not installed"
        return 1
    fi
    
    if ! command -v supabase &> /dev/null; then
        log_warning "supabase CLI is not installed"
    fi
    
    log_success "Development environment ready"
}

# Generate component
generate_component() {
    local feature=$1
    local name=$2
    
    if [ -z "$feature" ] || [ -z "$name" ]; then
        log_error "Usage: generate_component <feature> <name>"
        return 1
    fi
    
    log_info "Generating component: $name in feature: $feature"
    
    cd "$PROJECT_ROOT/apps/web"
    ng generate component "features/$feature/$name" --standalone
    
    log_success "Component generated"
}

# Generate service
generate_service() {
    local name=$1
    
    if [ -z "$name" ]; then
        log_error "Usage: generate_service <name>"
        return 1
    fi
    
    log_info "Generating service: $name"
    
    cd "$PROJECT_ROOT/apps/web"
    ng generate service "services/$name"
    
    log_success "Service generated"
}

# Sync Supabase types
sync_types() {
    log_info "Syncing Supabase types..."
    
    cd "$PROJECT_ROOT"
    pnpm run sync:types
    
    log_success "Types synced"
}

# Run tests
run_tests() {
    local type=${1:-all}
    
    cd "$PROJECT_ROOT"
    
    case $type in
        unit)
            log_info "Running unit tests..."
            pnpm run test:quick
            ;;
        e2e)
            log_info "Running E2E tests..."
            pnpm run test:e2e
            ;;
        coverage)
            log_info "Running tests with coverage..."
            pnpm run test:coverage
            ;;
        all)
            log_info "Running all tests..."
            pnpm run test:quick
            pnpm run test:e2e
            ;;
        *)
            log_error "Unknown test type: $type"
            return 1
            ;;
    esac
    
    log_success "Tests completed"
}

# Deploy
deploy() {
    local target=${1:-all}
    
    cd "$PROJECT_ROOT"
    
    # Run pre-deployment checks
    if ! pre_deploy_checks; then
        log_error "Pre-deployment checks failed"
        return 1
    fi
    
    case $target in
        web)
            log_info "Deploying web app..."
            pnpm run deploy:web
            ;;
        worker)
            log_info "Deploying workers..."
            pnpm run deploy:worker
            ;;
        all)
            log_info "Deploying all..."
            pnpm run deploy
            ;;
        *)
            log_error "Unknown deployment target: $target"
            return 1
            ;;
    esac
    
    log_success "Deployment completed"
}

# Show help
show_help() {
    cat << EOF
Claude Automation Script for Autorenta

Usage: $0 <command> [options]

Commands:
    pre-commit          Run pre-commit checks (lint + quick tests)
    pre-deploy          Run pre-deployment checks (CI + build)
    code-review         Run automated code review
    setup-dev           Setup development environment
    generate-component  Generate new component
    generate-service    Generate new service
    sync-types          Sync Supabase types
    run-tests           Run tests (unit|e2e|coverage|all)
    deploy              Deploy (web|worker|all)
    help                Show this help message

Examples:
    $0 pre-commit
    $0 generate-component bookings booking-form
    $0 generate-service payment
    $0 run-tests unit
    $0 deploy web

EOF
}

# Main
main() {
    local command=$1
    shift
    
    load_env
    
    case $command in
        pre-commit)
            pre_commit_checks "$@"
            ;;
        pre-deploy)
            pre_deploy_checks "$@"
            ;;
        code-review)
            code_review "$@"
            ;;
        setup-dev)
            setup_dev "$@"
            ;;
        generate-component)
            generate_component "$@"
            ;;
        generate-service)
            generate_service "$@"
            ;;
        sync-types)
            sync_types "$@"
            ;;
        run-tests)
            run_tests "$@"
            ;;
        deploy)
            deploy "$@"
            ;;
        help|--help|-h|"")
            show_help
            ;;
        *)
            log_error "Unknown command: $command"
            show_help
            exit 1
            ;;
    esac
}

main "$@"
