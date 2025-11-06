# Architecture Documentation Index

**Last Updated:** 2025-11-06  
**Purpose:** Central hub for all architectural documentation

---

## Quick Navigation

- [📊 Service Dependencies](#service-dependencies)
- [🔄 Business Flows](#business-flows)
- [🏗️ Architecture Layers](#architecture-layers)
- [🎯 Domain Boundaries](#domain-boundaries)
- [✅ Safe Change Guides](#safe-change-guides)
- [🛠️ Tools & Scripts](#tools--scripts)
- [📈 Diagrams](#diagrams)

---

## Service Dependencies

### Core Documentation

**[DEPENDENCY_GRAPH.md](architecture/DEPENDENCY_GRAPH.md)**  
Complete service dependency analysis with 95 services mapped.

**Key Sections:**
- Service tier classification (Foundation → Core → Domain → Orchestration)
- Top 10 most coupled services
- Dependency tree visualizations
- Circular dependency analysis (✅ None found)
- Refactoring recommendations

**When to Read:**
- Before modifying any service
- Understanding service coupling
- Planning refactoring

---

## Business Flows

### Critical Flow Documentation

All flows documented with layer-by-layer tracing from UI to database.

| Flow | Document | Complexity | Critical? |
|------|----------|------------|-----------|
| **Booking Creation** | [FLOW_BOOKING_CREATION.md](flows/FLOW_BOOKING_CREATION.md) | HIGH (7 deps) | ✅ YES |
| **Payment Checkout** | [FLOW_PAYMENT_CHECKOUT.md](flows/FLOW_PAYMENT_CHECKOUT.md) | HIGH (6 deps) | ✅ YES |
| **Wallet Deposit** | [FLOW_WALLET_DEPOSIT.md](flows/FLOW_WALLET_DEPOSIT.md) | MEDIUM (2 deps) | ✅ YES |
| **Settlement/Claims** | [SETTLEMENT_CLAIM_FLOW.md](SETTLEMENT_CLAIM_FLOW.md) | VERY HIGH (4 deps) | ✅ YES |
| **Car Publication** | [FLOW_CAR_PUBLICATION.md](flows/FLOW_CAR_PUBLICATION.md) | MEDIUM | ✅ YES |

**Each flow document includes:**
- Entry point (UI component)
- Service layer orchestration
- Database operations (RPCs, tables)
- External API integrations
- Success and error paths
- File references with line numbers

---

## Architecture Layers

### Layer Separation

**[LAYER_SEPARATION.md](architecture/LAYER_SEPARATION.md)**  
Defines the 4 architectural layers and separation guidelines.

**Layers:**
1. **Presentation Layer** - UI components (Angular standalone)
2. **Service/Business Logic Layer** - Injectable services
3. **Data Access Layer** - Database queries (currently implicit, needs separation)
4. **External Integration Layer** - Edge Functions, payment gateways

**Key Sections:**
- Layer responsibilities (what's allowed vs not allowed)
- Dependency injection patterns
- Current state analysis (mixed concerns)
- Proposed Repository pattern
- Refactoring priorities

**When to Read:**
- Before creating new services
- Planning layer refactoring
- Understanding architectural patterns

---

## Domain Boundaries

### Domain Mapping

**[DOMAIN_BOUNDARIES.md](architecture/DOMAIN_BOUNDARIES.md)**  
Maps business domains and defines boundaries.

**7 Domains Identified:**
1. **Auth** - Users, profiles, authentication (foundation, 0 dependencies)
2. **Car** - Vehicle management
3. **Booking** - Rental bookings (⚠️ highest coupling - depends on 6 domains)
4. **Payment** - Payment processing
5. **Wallet** - User funds management
6. **Insurance** - Coverage, FGO, claims, settlements
7. **Risk** - Driver risk profiling, bonus-malus

**Each domain documented with:**
- Services belonging to domain
- Database tables
- Storage buckets
- Dependencies (depends on / depended on by)
- Allowed vs prohibited dependencies

### Dependency Matrix

**[DOMAIN_DEPENDENCY_MATRIX.md](architecture/DOMAIN_DEPENDENCY_MATRIX.md)**  
Detailed cross-domain dependency mapping.

**Key Sections:**
- Domain-to-domain dependency matrix
- Service-level dependency details
- High-coupling services analysis
- Circular dependency verification (✅ None)
- Change impact scenarios
- Testing strategy by domain

**When to Read:**
- Before making cross-domain changes
- Understanding change blast radius
- Planning domain refactoring

---

## Safe Change Guides

### Checklists

**[SAFE_CHANGE_CHECKLIST.md](guides/SAFE_CHANGE_CHECKLIST.md)**  
Surgical code change validation checklists.

**7 Checklists:**
1. **Modifying a Service (0-2 deps)** - LOW risk
2. **Modifying a Service (3-5 deps)** - MEDIUM risk
3. **Modifying a Service (6+ deps)** - HIGH risk ⚠️
4. **Modifying a Database Table/RPC** - MEDIUM to CRITICAL
5. **Modifying an Angular Component** - LOW risk
6. **Modifying an Edge Function** - MEDIUM risk
7. **Refactoring (Repository Pattern)** - MEDIUM risk

**Each checklist includes:**
- Pre-change analysis steps
- Code review guidelines
- Database impact assessment
- Cross-domain impact analysis
- Testing requirements
- Documentation requirements

### Breaking Changes

**[BREAKING_CHANGES_LOG.md](guides/BREAKING_CHANGES_LOG.md)**  
Log of breaking changes with migration guides.

**Template includes:**
- Change description
- Affected components/services
- Migration guide (before/after code)
- Database migrations (up/down)
- Testing checklist
- Rollback plan

---

## Tools & Scripts

### Dependency Analysis

**`tools/analyze-dependencies.sh <file-path>`**  
Analyzes service dependencies and assesses risk.

**Output:**
- Dependencies (services this file injects)
- Dependents (who uses this service)
- Database operations (tables, RPCs)
- Risk assessment (🟢 LOW / 🟡 MEDIUM / 🔴 CRITICAL)
- Recommendations

**Example:**
```bash
./tools/analyze-dependencies.sh apps/web/src/app/core/services/bookings.service.ts
```

### Change Validation

**`tools/validate-change.sh <file-path>`**  
Validates code changes before committing.

**Checks:**
1. TypeScript compilation
2. ESLint validation
3. Related unit tests
4. TODO/FIXME comments
5. console.log statements

**Example:**
```bash
./tools/validate-change.sh apps/web/src/app/core/services/bookings.service.ts
```

### Dependency Report Generation

**`tools/generate-dependency-report.sh`**  
Generates updated DEPENDENCY_GRAPH.md (future enhancement).

---

## Diagrams

### Available Mermaid Diagrams

**[diagrams/dependency-graph.mmd](diagrams/dependency-graph.mmd)**  
Service dependency graph (high-coupling services highlighted).

**[diagrams/booking-flow.mmd](diagrams/booking-flow.mmd)**  
Complete booking creation flow from UI to database.

**[diagrams/payment-flow.mmd](diagrams/payment-flow.mmd)**  
Payment checkout flow (3 modes: wallet, card, split).

**[diagrams/wallet-flow.mmd](diagrams/wallet-flow.mmd)**  
Wallet deposit flow with MercadoPago integration.

**[diagrams/domain-boundaries.mmd](diagrams/domain-boundaries.mmd)**  
Domain boundaries and inter-domain dependencies.

**Viewing Diagrams:**
- GitHub renders Mermaid automatically
- VS Code: Install Mermaid extension
- Online: https://mermaid.live/

---

## How to Use This Documentation

### Scenario 1: Modifying an Existing Service

1. **Analyze dependencies:**
   ```bash
   ./tools/analyze-dependencies.sh path/to/service.ts
   ```

2. **Check risk level:**
   - 🟢 LOW (0-2 deps): Follow checklist 1 in SAFE_CHANGE_CHECKLIST.md
   - 🟡 MEDIUM (3-5 deps): Follow checklist 2
   - 🔴 CRITICAL (6+ deps): Follow checklist 3

3. **Review documentation:**
   - DEPENDENCY_GRAPH.md - understand dependencies
   - DOMAIN_DEPENDENCY_MATRIX.md - cross-domain impact
   - Relevant FLOW_*.md - if service is in a flow

4. **Make changes and validate:**
   ```bash
   ./tools/validate-change.sh path/to/service.ts
   ```

5. **Update documentation:**
   - If breaking change: Add entry to BREAKING_CHANGES_LOG.md
   - If flow changed: Update relevant FLOW_*.md
   - If dependencies changed: Update DEPENDENCY_GRAPH.md

### Scenario 2: Adding a New Service

1. **Plan layer and domain:**
   - Review LAYER_SEPARATION.md - which layer?
   - Review DOMAIN_BOUNDARIES.md - which domain?

2. **Design dependencies:**
   - Keep dependencies minimal (aim for tier 1-2: 0-3 deps)
   - Check DOMAIN_DEPENDENCY_MATRIX.md - ensure no circular deps
   - Follow dependency patterns from similar services

3. **Create service:**
   - Follow Angular standalone patterns
   - Use `inject()` for dependencies
   - Add JSDoc comments

4. **Update documentation:**
   - Add to DEPENDENCY_GRAPH.md
   - Add to relevant domain in DOMAIN_BOUNDARIES.md
   - If part of critical flow: Update FLOW_*.md

### Scenario 3: Debugging a Flow Issue

1. **Identify the flow:**
   - Booking creation? → FLOW_BOOKING_CREATION.md
   - Payment? → FLOW_PAYMENT_CHECKOUT.md
   - Wallet? → FLOW_WALLET_DEPOSIT.md
   - Claims? → SETTLEMENT_CLAIM_FLOW.md
   - Car publication? → FLOW_CAR_PUBLICATION.md

2. **Trace the flow:**
   - Follow layer-by-layer breakdown
   - Check file references with line numbers
   - Review success and error paths

3. **Check dependencies:**
   - DEPENDENCY_GRAPH.md - service dependencies
   - DOMAIN_DEPENDENCY_MATRIX.md - cross-domain issues

4. **Verify database:**
   - Check RPC functions listed in flow doc
   - Check table operations
   - Review RLS policies

---

## Documentation Maintenance

### When to Update

**After ANY of these changes:**
- Adding/removing service dependencies
- Creating new services
- Modifying critical business flows
- Database schema changes
- Breaking changes to APIs
- Refactoring (e.g., extracting repositories)

### Update Checklist

- [ ] Run `./tools/analyze-dependencies.sh` on changed files
- [ ] Update DEPENDENCY_GRAPH.md if dependency count changed
- [ ] Update DOMAIN_BOUNDARIES.md if new domain or service added
- [ ] Update DOMAIN_DEPENDENCY_MATRIX.md if cross-domain deps changed
- [ ] Update relevant FLOW_*.md if flow logic changed
- [ ] Add entry to BREAKING_CHANGES_LOG.md if breaking change
- [ ] Update Mermaid diagrams if architecture changed

### Scheduled Reviews

**Monthly:**
- Review DEPENDENCY_GRAPH.md accuracy
- Check for new high-coupling services (6+ deps)
- Verify no circular dependencies introduced

**Quarterly:**
- Full documentation review
- Update diagrams
- Review refactoring priorities
- Update safe change checklists

---

## Project Statistics

**Documentation Created:** 2025-11-06

**Total Documents:** 15+
- Architecture docs: 4
- Flow docs: 5
- Guide docs: 2
- Diagrams: 5
- Scripts: 3

**Services Analyzed:** 95

**Flows Documented:** 5 critical flows

**Domains Mapped:** 7 business domains

**Total Lines of Documentation:** 5,000+

---

## Quick Reference

### Most Important Documents (Start Here)

1. **[DEPENDENCY_GRAPH.md](architecture/DEPENDENCY_GRAPH.md)** - Understand service coupling
2. **[SAFE_CHANGE_CHECKLIST.md](guides/SAFE_CHANGE_CHECKLIST.md)** - Before making ANY change
3. **[DOMAIN_BOUNDARIES.md](architecture/DOMAIN_BOUNDARIES.md)** - Understand domain boundaries

### For Specific Tasks

| Task | Document |
|------|----------|
| Modify BookingsService | DEPENDENCY_GRAPH.md + FLOW_BOOKING_CREATION.md + Checklist 3 |
| Add payment method | FLOW_PAYMENT_CHECKOUT.md + LAYER_SEPARATION.md |
| Understand insurance claims | SETTLEMENT_CLAIM_FLOW.md + DOMAIN_BOUNDARIES.md |
| Debug wallet issues | FLOW_WALLET_DEPOSIT.md + DEPENDENCY_GRAPH.md |
| Add new service | LAYER_SEPARATION.md + DOMAIN_BOUNDARIES.md + DEPENDENCY_GRAPH.md |
| Database migration | SAFE_CHANGE_CHECKLIST.md (checklist 4) + BREAKING_CHANGES_LOG.md |

---

## Support & Feedback

**Questions?** Refer to this index to find the right documentation.

**Found an issue?** Update the relevant document and add entry to BREAKING_CHANGES_LOG.md if needed.

**Suggestions for improvement?** Add to project backlog or discuss with team.

---

**Last Updated:** 2025-11-06  
**Next Scheduled Review:** 2025-12-06
