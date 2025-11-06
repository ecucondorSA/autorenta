# AutoRenta Tools Directory

This directory contains operational scripts and utilities for the AutoRenta project.

## 📦 Consolidated Script Runner (PRIMARY)

**All common operations have been consolidated into a single, unified CLI:**

```bash
./tools/run.sh [command]
```

### Quick Reference

```bash
# Development
./tools/run.sh dev              # Start full environment
./tools/run.sh dev:web          # Web only
./tools/run.sh dev:worker       # Worker only
./tools/run.sh dev:stop         # Stop all

# CI/CD
./tools/run.sh ci               # Full pipeline
./tools/run.sh test:quick       # Quick tests
./tools/run.sh build            # Build all
./tools/run.sh deploy           # Deploy (with confirmation)

# Utilities
./tools/run.sh status           # Project status
./tools/run.sh help             # Full help
```

**Or use npm shortcuts from project root:**
```bash
npm run dev
npm run ci
npm run deploy
npm run status
```

See `CLAUDE.md` for complete documentation.

---

## 🔧 Individual Scripts (SPECIALIZED)

The following scripts handle specific operations not covered by the consolidated runner:

### Setup & Configuration

- **`setup-auth.sh`** - One-time CLI authentication setup (GitHub, Supabase, Cloudflare)
- **`setup-production.sh`** - Production environment configuration
- **`quick-production-setup.sh`** - Fast production setup wizard
- **`setup-custom-domain.sh`** - Custom domain configuration for Cloudflare

### Monitoring & Health

- **`monitor-health.sh`** - System health checks and alerts
- **`monitor-wallet-deposits.sh`** - Real-time wallet deposit monitoring
- **`monitoring-setup.sh`** - Initial monitoring infrastructure setup
- **`diagnose-supabase.sh`** - Supabase connectivity and configuration diagnostics

### Maintenance & Cron Jobs

- **`cleanup-old-deposits-cron.sh`** - Clean up stale deposit records (cron job)
- **`wallet-reconciliation-cron.sh`** - Wallet balance reconciliation (cron job)

### Utilities

- **`check-auth.sh`** - Check authentication status of all CLIs
- **`check-skills.sh`** - Verify Claude Code skills configuration
- **`sync-types.sh`** - Sync TypeScript types from Supabase schema
- **`organize-docs.sh`** - Organize project documentation

### Deployment (Advanced)

- **`deploy-pages.sh`** - Advanced Cloudflare Pages deployment with smoke tests
- **`deploy-worker.sh`** - Advanced Cloudflare Worker deployment with validation

### Accounting

- **`accounting/export-ledger.mjs`** - Export accounting ledger data

### Legacy/Reference

- **`claude-workflows.sh`** - ⚠️ Legacy workflow functions (now integrated into `run.sh`)
- **`dev.sh`** - ⚠️ Legacy dev wrapper (now use `./run.sh dev`)
- **`claude-automation.sh`** - Claude Code automation helpers
- **`copilot-autonomous.sh`** - GitHub Copilot experiments

---

## 🎯 When to Use What

### Use `./tools/run.sh` for:
- ✅ Daily development tasks
- ✅ Testing (unit, integration, E2E)
- ✅ Building and deploying
- ✅ CI/CD pipelines
- ✅ Quick status checks

### Use individual scripts for:
- ✅ One-time setup tasks
- ✅ Production environment configuration
- ✅ Advanced deployment with custom options
- ✅ Monitoring and diagnostics
- ✅ Cron jobs and scheduled tasks

---

## 📝 Adding New Commands

To add a new command to the consolidated runner:

1. Edit `tools/run.sh`
2. Add a new function: `cmd_your_command() { ... }`
3. Add case to router: `your:command) cmd_your_command "$@" ;;`
4. Update help text in `cmd_help()`
5. Add npm shortcut in root `package.json` (optional)

**Example:**
```bash
# In tools/run.sh
cmd_backup() {
    header "💾 Creating Backup"
    # Your backup logic here
    success "Backup completed"
}

# In router section
case "$COMMAND" in
    # ... other commands
    backup) cmd_backup "$@" ;;
    # ...
esac
```

---

## 🔄 Migration Notes (Nov 2025)

Previously, the project had **42+ npm scripts** and **20+ bash scripts** scattered across:
- Root `package.json`
- `apps/web/package.json`
- `functions/workers/*/package.json`
- Various bash scripts in `tools/`

**Problems:**
- ❌ Duplicated logic across multiple scripts
- ❌ Inconsistent command patterns
- ❌ Hard to maintain and discover commands
- ❌ No single source of truth

**Solution:**
- ✅ Single consolidated runner (`tools/run.sh`)
- ✅ Consistent command structure
- ✅ Better error handling and logging
- ✅ Parallel execution support
- ✅ Clear categorization

**Backward Compatibility:**
All existing npm shortcuts still work - they now delegate to `run.sh`.

---

## 📚 Documentation

- **Main docs:** `/CLAUDE.md` - Complete project guide
- **This file:** Quick reference for tools directory
- **Help command:** `./tools/run.sh help` - Interactive help

---

## 🤝 Contributing

When adding new tools:
1. Prefer adding to `run.sh` for general operations
2. Create separate scripts only for specialized/one-time tasks
3. Use consistent logging functions (log, success, error, warn)
4. Add documentation to this README
5. Test on clean environment

---

**Last updated:** November 2025
**Maintained by:** AutoRenta Team
