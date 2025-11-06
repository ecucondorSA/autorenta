# PRD: [Feature Name]

**Document**: Product Requirements Document
**Feature**: [Feature Name]
**Priority**: P0/P1/P2
**Status**: Draft/Approved/Implemented
**Owner**: [Team/Person]
**Created**: [YYYY-MM-DD]
**Last Updated**: [YYYY-MM-DD]

---

## 1. Overview

### 1.1 Feature Description
[Brief description of what this feature does and why it exists]

### 1.2 Problem Statement
[What problem does this feature solve? What user pain point does it address?]

### 1.3 Success Criteria
[How will we know this feature is successful? What metrics will we track?]

---

## 2. User Story

> As a **[role]**, I want **[goal]** so that **[benefit]**.

**Examples**:
- As a **locatario** (renter), I want to **book a car easily** so that I can **have transportation for my trip**.
- As a **locador** (owner), I want to **receive payments automatically** so that I **don't have to chase renters**.

---

## 3. Acceptance Criteria

List all criteria that must be met for this feature to be considered complete:

- ✅ **AC1**: [Criterion 1 - Be specific and measurable]
- ✅ **AC2**: [Criterion 2 - Use "Given-When-Then" format if helpful]
- ✅ **AC3**: [Criterion 3 - Include both functional and non-functional requirements]

**Example**:
- ✅ **AC1**: Given a logged-in user, when they select a car and dates, then the system calculates the total price including insurance and fees.
- ✅ **AC2**: Given a user with insufficient wallet balance, when they try to book, then they see an error message and are prompted to deposit funds.

---

## 4. User Flow (Step-by-Step)

### 4.1 Happy Path

Describe the ideal scenario where everything goes right:

1. **Step 1**: [User action]
   - **Expected behavior**: [System response]
   - **UI state**: [What the user sees]

2. **Step 2**: [User action]
   - **Expected behavior**: [System response]
   - **UI state**: [What the user sees]

3. **Step 3**: [User action]
   - **Expected behavior**: [System response]
   - **UI state**: [What the user sees]

**Example (Booking Flow)**:
1. **User navigates to car detail page** (`/cars/{id}`)
   - **Expected behavior**: Page loads with car information, photos, and "Reservar" button
   - **UI state**: User sees car details, pricing, availability calendar

2. **User clicks "Reservar" button**
   - **Expected behavior**: Date picker modal opens
   - **UI state**: User sees date range selector with unavailable dates greyed out

3. **User selects dates and clicks "Continuar"**
   - **Expected behavior**: System calculates total price and redirects to payment page
   - **UI state**: User sees booking summary with breakdown of costs

### 4.2 Alternative Flows

Describe scenarios where the user takes a different path:

**Alternative Flow 1: [Scenario Name]**
1. [Step 1]
2. [Step 2]
3. [Expected outcome]

**Example (User cancels booking)**:
1. User is on payment page
2. User clicks "Cancelar" button
3. System shows confirmation dialog: "¿Seguro que deseas cancelar?"
4. User confirms cancellation
5. System returns user to car detail page and deletes pending booking

---

## 5. Edge Cases

List scenarios where things might go wrong and how the system should handle them:

### 5.1 Edge Case 1: [Scenario Name]

**Description**: [What is the edge case?]

**Expected behavior**: [How should the system handle it?]

**Error message (if applicable)**: [Exact text of error message]

**Example**:
### 5.1 Edge Case 1: Insufficient Wallet Balance

**Description**: User tries to book a car but doesn't have enough funds in their wallet.

**Expected behavior**:
- Booking is not created
- User sees error message: "Saldo insuficiente. Por favor deposita fondos."
- User is shown a "Depositar ahora" button that redirects to /wallet

**Error message**: `"Tu saldo actual es $X. Necesitas $Y para completar esta reserva."`

### 5.2 Edge Case 2: [Scenario Name]

**Description**: [What is the edge case?]

**Expected behavior**: [How should the system handle it?]

---

## 6. Technical Implementation

### 6.1 Frontend Components

**Components involved**:
- `[component-name].page.ts` - [Description of what it does]
- `[component-name].component.ts` - [Description of what it does]

**Example**:
- `car-detail.page.ts` - Displays car information and handles "Reservar" button click
- `booking-detail-payment.page.ts` - Handles payment flow and MercadoPago integration
- `simple-checkout.component.ts` - Reusable checkout component for wallet and card payments

### 6.2 Backend Services

**Services involved**:
- `[service-name].service.ts` - [Description of methods used]

**Example**:
- `bookings.service.ts` - `createBooking()`, `getBookingById()`, `updateBookingStatus()`
- `wallet.service.ts` - `getBalance()`, `debitFunds()`, `createTransaction()`
- `payments.service.ts` - `createPaymentIntent()`, `confirmPayment()`

### 6.3 Database Operations

**Tables affected**:
- `[table_name]` - [CRUD operations: Create/Read/Update/Delete]

**Example**:
- `bookings` - CREATE new booking, UPDATE status to "confirmed"
- `wallet_transactions` - CREATE transaction record
- `user_wallets` - UPDATE balance (debit funds)

### 6.4 RPC Functions / Edge Functions

**Functions called**:
- `[function_name]` - [Description of what it does]

**Example**:
- `request_booking` - Creates booking and locks funds in wallet
- `wallet_confirm_deposit` - Credits funds after successful MercadoPago payment
- Edge Function: `mercadopago-create-booking-preference` - Generates MercadoPago checkout URL

### 6.5 External APIs

**Third-party services**:
- `[Service Name]` - [Endpoint(s) called, purpose]

**Example**:
- **MercadoPago API** - `/v1/payments`, `/v1/payment_methods` - Create preference, process payment
- **Mapbox API** - `/geocoding/v5` - Convert addresses to coordinates

---

## 7. Test Scenarios

### 7.1 Happy Path Tests

| Test ID | Description | Steps | Expected Result |
|---------|-------------|-------|-----------------|
| T1 | Successful booking with wallet payment | 1. Select car<br>2. Choose dates<br>3. Pay with wallet | Booking created with status "confirmed" |
| T2 | [Test description] | [Steps] | [Expected result] |

### 7.2 Edge Case Tests

| Test ID | Description | Steps | Expected Result |
|---------|-------------|-------|-----------------|
| E1 | Insufficient wallet balance | 1. Select car<br>2. Choose dates<br>3. Attempt payment with insufficient funds | Error message shown, booking not created |
| E2 | [Test description] | [Steps] | [Expected result] |

### 7.3 Regression Tests

| Test ID | Description | Purpose |
|---------|-------------|---------|
| R1 | [Test description] | Ensure [specific functionality] still works after changes |

---

## 8. Dependencies

### 8.1 Technical Dependencies

**Services that must be available**:
- [ ] Supabase Auth (user authentication)
- [ ] Supabase Database (data persistence)
- [ ] MercadoPago API (payment processing)
- [ ] [Other services]

**Example**:
- [x] Supabase Auth - User must be authenticated to create bookings
- [x] Supabase Edge Functions - Webhook must be deployed and functional
- [x] MercadoPago API - Account must be in production mode with valid credentials

### 8.2 Feature Dependencies

**Features that must be implemented first**:
- [ ] [Feature X] must be completed before starting this feature
- [ ] [Feature Y] is required for full functionality

**Example**:
- [x] Wallet system must be fully implemented (deposits, balance tracking)
- [x] Car availability calendar must be functional
- [ ] Review system is optional but enhances trust

### 8.3 Data Dependencies

**Data that must exist**:
- [ ] [Data type X] must be seeded in database
- [ ] [Configuration Y] must be set

**Example**:
- [x] At least one car must be published and active
- [x] Test user accounts must exist (locador and locatario)
- [x] MercadoPago credentials must be configured in Supabase secrets

---

## 9. Security Considerations

### 9.1 Authentication & Authorization

**Who can access this feature?**
- [ ] Public (anyone)
- [ ] Authenticated users only
- [ ] Specific roles: [list roles]

**Example**:
- [x] Authenticated users only
- [x] Locatarios (renters) can create bookings
- [x] Locadores (owners) can view bookings for their cars

### 9.2 Data Validation

**Input validation required**:
- [ ] [Field X] must be validated for [format/range/etc.]
- [ ] [Field Y] must be sanitized to prevent [XSS/SQL injection/etc.]

**Example**:
- [x] Booking dates must be in the future
- [x] Booking dates must not overlap with existing bookings
- [x] Payment amounts must be positive numbers
- [x] User cannot book their own cars

### 9.3 RLS Policies

**Row Level Security policies to enforce**:
- [ ] [Policy name] - [Description]

**Example**:
- [x] Users can only view their own bookings (as locador or locatario)
- [x] Only authenticated users can create bookings
- [x] Users cannot modify bookings after they are confirmed

---

## 10. Performance Considerations

### 10.1 Expected Load

**Anticipated usage**:
- **Peak concurrent users**: [Number]
- **Requests per second**: [Number]
- **Data volume**: [Size]

**Example**:
- **Peak concurrent users**: 100 users
- **Requests per second**: 10 RPS
- **Data volume**: 10,000 bookings per month

### 10.2 Optimization Requirements

**Performance targets**:
- [ ] Page load time < [X] seconds
- [ ] API response time < [X] ms
- [ ] Database query time < [X] ms

**Example**:
- [x] Booking creation API response < 500ms
- [x] Payment page load time < 2 seconds
- [x] Wallet balance query < 100ms

---

## 11. Success Metrics

### 11.1 Quantitative Metrics

| Metric | Target | Measurement Method |
|--------|--------|--------------------|
| [Metric name] | [Target value] | [How to measure] |

**Example**:
| Metric | Target | Measurement Method |
|--------|--------|--------------------|
| Booking conversion rate | 60% | (Completed bookings / Car detail views) × 100 |
| Payment success rate | 95% | (Successful payments / Payment attempts) × 100 |
| Average time to book | < 3 minutes | Track time from car detail view to booking confirmation |

### 11.2 Qualitative Metrics

**User feedback**:
- [ ] User satisfaction survey score > [X]/10
- [ ] < [X]% of users report confusion during booking process

**Example**:
- [x] User satisfaction score > 8/10
- [x] < 10% of users contact support during booking process

---

## 12. Rollout Plan

### 12.1 Phased Rollout

**Phase 1: Internal Testing** (Week 1)
- [ ] Deploy to staging environment
- [ ] Test with internal team
- [ ] Fix critical bugs

**Phase 2: Beta Testing** (Week 2)
- [ ] Deploy to production with feature flag
- [ ] Invite 10-20 beta users
- [ ] Gather feedback

**Phase 3: Full Release** (Week 3)
- [ ] Enable feature for all users
- [ ] Monitor metrics
- [ ] Iterate based on feedback

### 12.2 Rollback Plan

**Criteria for rollback**:
- [ ] [Critical bug X] is discovered
- [ ] [Metric Y] drops below [threshold]

**Rollback procedure**:
1. [Step 1]
2. [Step 2]
3. [Notify users]

**Example**:
**Criteria for rollback**:
- [x] Payment success rate drops below 80%
- [x] Server errors exceed 5% of requests

**Rollback procedure**:
1. Disable feature flag in Supabase
2. Revert to previous deployment
3. Post status update on homepage
4. Notify affected users via email

---

## 13. Open Questions

**Unresolved issues**:
1. [Question 1] - **Owner**: [Name] - **Due date**: [Date]
2. [Question 2] - **Owner**: [Name] - **Due date**: [Date]

**Example**:
1. Should we allow bookings less than 24 hours in advance? - **Owner**: Product Team - **Due date**: 2025-11-10
2. What happens if a locador cancels a confirmed booking? - **Owner**: Legal Team - **Due date**: 2025-11-15

---

## 14. Appendix

### 14.1 Mockups / Wireframes

[Link to Figma/design files]

### 14.2 Related Documents

- [Link to technical architecture doc]
- [Link to API specification]
- [Link to user research]

**Example**:
- [AutoRenta Architecture Overview](../CLAUDE.md)
- [Wallet System Documentation](../archived/WALLET_SYSTEM_DOCUMENTATION.md)
- [MercadoPago Integration Guide](../implementation/MERCADOPAGO_INTEGRATION.md)

---

## 15. Changelog

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | [YYYY-MM-DD] | [Name] | Initial draft |
| 1.1 | [YYYY-MM-DD] | [Name] | [Description of changes] |

---

## 16. Sign-off

| Role | Name | Signature | Date |
|------|------|-----------|------|
| **Product Owner** | [Name] | [ ] | [ ] |
| **Tech Lead** | [Name] | [ ] | [ ] |
| **QA Lead** | [Name] | [ ] | [ ] |
| **Design Lead** | [Name] | [ ] | [ ] |

**Status**: 🟡 Draft / 🟢 Approved / 🔴 Rejected

---

**End of PRD Template**

---

## How to Use This Template

### Step 1: Copy this template
```bash
cp docs/templates/testsprite-prd-template.md docs/prd/[your-feature-name].md
```

### Step 2: Fill out all sections
- Replace all `[placeholders]` with actual content
- Check off all checkboxes as you complete them
- Be as specific as possible - vague PRDs lead to poor tests

### Step 3: Review with team
- Share with Product, Design, and Engineering
- Gather feedback and iterate
- Get sign-off from all stakeholders

### Step 4: Use with TestSprite
Once your PRD is approved:

```bash
# TestSprite will read your PRD and generate tests automatically
npx @testsprite/testsprite-mcp@latest generate-tests \
  --prd docs/prd/[your-feature-name].md \
  --output tests/e2e/[your-feature-name].spec.ts
```

### Tips for Writing Effective PRDs

1. **Be specific**: "User sees error message" → "User sees red toast notification with text: 'Saldo insuficiente'"

2. **Include screenshots**: Visual examples help TestSprite understand expected UI

3. **Define edge cases exhaustively**: The more edge cases you document, the more robust your tests

4. **Use Given-When-Then format**: Makes it easy to convert to automated tests
   - Given: Initial state
   - When: User action
   - Then: Expected result

5. **Document data dependencies**: TestSprite needs to know what test data to create

6. **Link to code**: Include file paths and function names for context

7. **Update regularly**: Keep PRD in sync with implementation as features evolve

---

**Questions?** See [TESTSPRITE_MCP_INTEGRATION_SPEC.md](../implementation/TESTSPRITE_MCP_INTEGRATION_SPEC.md) for complete integration guide.
