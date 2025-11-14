# 🚨 Database API Errors Analysis

**Timestamp:** 2025-11-14T10:20:20.125Z
**Source:** Browser console errors from Supabase API calls

## 📊 Error Summary

| Endpoint | Error | Count | Severity |
|----------|-------|-------|----------|
| `reviews` | 400 Bad Request | 3x | 🔴 HIGH |
| `car_stats` | 404 Not Found | 2x | 🟡 MEDIUM |
| `exchange_rates` | 406 Not Acceptable | 1x | 🟡 MEDIUM |
| `car_blocked_dates` | 404 Not Found | 1x | 🟡 MEDIUM |

## 🔍 Detailed Analysis

### 1. Reviews API - 400 Bad Request (3 occurrences)
```
GET /rest/v1/reviews?select=*%2Creviewe…51&is_visible=eq.true&review_type=eq.renter_to_owner&order=created_at.desc
```
**Possible Issues:**
- Malformed select query (URL encoding issue with `%2C`)
- Invalid column name in select statement
- Missing or invalid foreign key relationships
- RLS (Row Level Security) policy blocking the request

### 2. Car Stats API - 404 Not Found (2 occurrences)
```
GET /rest/v1/car_stats?select=*&car_id=eq.b288ed1c-9544-44e1-b159-8e3335425051
```
**Possible Issues:**
- `car_stats` table doesn't exist
- Table name mismatch (maybe `car_statistics` or `vehicle_stats`)
- Missing database migration

### 3. Exchange Rates API - 406 Not Acceptable (1 occurrence)
```
GET /rest/v1/exchange_rates?select=*&pair=eq.USDTARS&is_active=eq.true&order=last_updated.desc&limit=1
```
**Possible Issues:**
- Invalid currency pair format (`USDTARS` should be `USD-ARS` or `USD/ARS`)
- Wrong column name for currency pair
- Content-Type negotiation issue

### 4. Car Blocked Dates API - 404 Not Found (1 occurrence)
```
GET /rest/v1/car_blocked_dates?select=blocked_from,blocked_to&car_id=eq.b288ed1c-9544-44e1-b159-8e3335425051&order=blocked_from.asc
```
**Possible Issues:**
- `car_blocked_dates` table doesn't exist
- Table name might be `blocked_dates` or `car_availability`
- Missing database migration

## 🎯 Target Car ID
All errors reference car: `b288ed1c-9544-44e1-b159-8e3335425051`

## 🔧 Recommended Actions
1. **Check database schema** - Verify table names exist
2. **Validate RLS policies** - Ensure proper access permissions
3. **Fix API queries** - Correct malformed requests
4. **Update migrations** - Create missing tables if needed
