# 💳 MercadoPago Edge Functions - Architecture Guide

> **FROZEN CODE** - Do not modify without explicit permission.
> Last reviewed: 2026-02-07

## Overview

18 Edge Functions handling all MercadoPago integrations. Each function has a specific purpose and should NOT be consolidated to avoid breaking production payments.

## Function Categories

### 🔐 OAuth Flow (4 functions)
| Function | Purpose | Called By |
|----------|---------|-----------|
| `mercadopago-oauth-connect` | Initiate MP connection | Frontend |
| `mercadopago-oauth-callback` | Handle OAuth callback | MercadoPago redirect |
| `mercadopago-refresh-token` | Refresh expired tokens | Cron / Internal |
| `mercadopago-revoke-token` | Revoke user token | Frontend (settings) |

### 💰 Payment Processing (5 functions)
| Function | Purpose | Called By |
|----------|---------|-----------|
| `mercadopago-webhook` | Receive payment notifications | MercadoPago webhook |
| `mercadopago-process-booking-payment` | Process rental payments | Webhook handler |
| `mercadopago-process-brick-payment` | Process Brick UI payments | Frontend |
| `mercadopago-process-deposit-payment` | Process security deposits | Frontend |
| `mercadopago-process-refund` | Process refunds | Admin / Disputes |

### 📋 Preferences (2 functions)
| Function | Purpose | Called By |
|----------|---------|-----------|
| `mercadopago-create-preference` | Generic checkout preference | Frontend |
| `mercadopago-create-booking-preference` | Booking-specific preference | Booking flow |

### 🔒 Pre-authorization (3 functions)
| Function | Purpose | Called By |
|----------|---------|-----------|
| `mp-create-preauth` | Create security deposit hold | Booking flow |
| `mp-capture-preauth` | Capture held funds | Disputes / Damage claims |
| `mp-cancel-preauth` | Release held funds | Trip completion |

### 🔄 Async Operations (4 functions)
| Function | Purpose | Called By |
|----------|---------|-----------|
| `mercadopago-money-out` | Transfer to owner's bank | Post-trip settlement |
| `mercadopago-poll-pending-payments` | Check stuck payments | Cron |
| `mercadopago-retry-failed-deposits` | Retry failed pre-auths | Cron |
| `mercadopago-initiate-onboarding` | Start owner onboarding | Frontend |

## Data Flow

```
┌─────────────────────────────────────────────────────────────┐
│                        FRONTEND                              │
└─────────────────────────────┬───────────────────────────────┘
                              │
          ┌───────────────────┼───────────────────┐
          │                   │                   │
          ▼                   ▼                   ▼
┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐
│ create-booking- │ │ process-brick-  │ │ mp-create-      │
│ preference      │ │ payment         │ │ preauth         │
└────────┬────────┘ └────────┬────────┘ └────────┬────────┘
         │                   │                   │
         └───────────────────┼───────────────────┘
                             ▼
                    ┌─────────────────┐
                    │ MercadoPago API │
                    └────────┬────────┘
                             │
                             ▼
                    ┌─────────────────┐
                    │ mercadopago-    │
                    │ webhook         │
                    └────────┬────────┘
                             │
         ┌───────────────────┼───────────────────┐
         ▼                   ▼                   ▼
┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐
│ process-booking-│ │ process-deposit-│ │ Update DB       │
│ payment         │ │ payment         │ │ (bookings,      │
└─────────────────┘ └─────────────────┘ │ wallets, etc)   │
                                        └─────────────────┘
```

## Security Notes

1. **Never log full payment data** - PCI compliance
2. **Always validate webhook signatures** - Done in `mercadopago-webhook`
3. **Use Service Role Key** for internal calls
4. **Token refresh** happens every 5 hours (tokens expire at 6h)

## Maintenance

### Adding new payment flows
1. Create a new function only if flow is fundamentally different
2. Prefer extending `mercadopago-webhook` with new event handlers
3. Document in this file

### Debugging
- All functions log to Supabase Functions logs
- Payment IDs are indexed in `payment_intents` table
- Use `mercadopago-poll-pending-payments` to check stuck payments

## Why NOT consolidated?

1. **Single Responsibility**: Each function does ONE thing
2. **Cold Start**: Smaller functions = faster cold starts
3. **Failure Isolation**: One failure doesn't break all payments
4. **FROZEN**: Production-critical, battle-tested code
5. **Frontend Integration**: Hardcoded paths everywhere

---

*Reviewed by: Gemini Agent*
*Date: 2026-02-07*
