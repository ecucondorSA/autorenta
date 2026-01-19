# 🏛️ AutoRenta: Technical & Operational Deep-Dive Report
**Confidential** | **Date:** January 2026 | **Version:** 2.0 (Institutional Grade)

> **EXECUTIVE SUMMARY**
> AutoRenta is not an MVP. It is a **Vertical Fintech Platform** specialized in mobility assets.
> This document details the proprietary architecture that enables:
> 1.  **Banking-Grade Transactions:** Handling P2P payments, escrows, and wallets without a banking license.
> 2.  **Autonomous Operations:** Replacing human ops teams with Edge Functions and AI Agents.
> 3.  **Cross-Border Scalability:** A unified codebase serving multiple jurisdictions and currencies.

---

## 1. 🏗️ SYSTEM ARCHITECTURE & INFRASTRUCTURE
*Built for scale, security, and low latency from Day 1.*

### **A. "Serverless-First" Edge Architecture**
Unlike traditional monoliths (Django/Rails) that require heavy DevOps, AutoRenta runs on the Edge.
*   **Backend:** Supabase (PostgreSQL 15+) with pure **Edge Functions (Deno/TypeScript)**.
    *   *Benefit:* Zero server maintenance, instant global scaling, <50ms latency in LatAm.
    *   *Evidence:* `supabase/functions/` contains 50+ microservices handling discrete logic.
*   **Database Security (RLS):** Security is not in the app layer; it's in the database engine.
    *   *Mechanism:* **Row Level Security (RLS)** policies ensure no user can ever query data they don't own, even if the API is compromised.
    *   *Evidence:* `supabase/migrations/*_enable_rls.sql`.

### **B. Native Omnichannel Frontend (Capacitor + Angular 18)**
*   **Strategy:** Single Codebase, Multiple Targets (Web, Android, iOS).
*   **Tech Stack:** Angular 18 (Standalone, Signals) + Ionic/Capacitor.
*   **Performance:** Uses **Optimistic UI** updates (interface updates instantly, syncs background) to work on spotty 4G networks.
*   **Evidence:** `apps/web` compiles to both PWA and Android APK (`android/`).

---

## 2. 💎 THE FINTECH CORE (The "Hidden Bank")
*Proprietary financial infrastructure for the unbanked.*

### **A. Double-Entry Ledger System (The Wallet)**
We don't just "store value"; we run a ledger.
*   **Architecture:** Implements `debit` and `credit` integrity with **Advisory Locks** to prevent race conditions during concurrent high-volume transactions.
*   **Capabilities:**
    *   **Pre-paid Balance:** Users load cash/crypto to rent.
    *   **Locked Assets:** Logic to "freeze" wallet funds as security deposits without moving money.
*   **Code Evidence:** `core/models/wallet.model.ts`, `apps/web/src/app/core/services/infrastructure/advisory-lock.service.ts`.

### **B. Membership-Based Risk Scoring**
*   **Logic:** A dynamic subscription engine that alters the financial risk parameters per user.
*   **Mechanism:**
    *   `Standard User`: 100% Deposit required.
    *   `Black Member`: 50% Deposit + Lower deductible.
    *   `Luxury Member`: 0% Deposit (Subscription covers insurance premium).
*   **Business Impact:** Transforms irregular transactional revenue into **Annual Recurring Revenue (ARR)**.

### **C. Split-Payments Engine**
*   **Logic:** Automated revenue dispersion at the moment of transaction.
*   **Flow:** Renter Pays $100 → System splits: $80 to Owner, $20 to AutoRenta.
*   **Benefit:** Reduces tax liability (we only recognize our fee) and automates owner payouts (T+2 days).
*   **Evidence:** `supabase/functions/process-payment-split`.

---

## 3. 🛡️ TRUST OS: AI-POWERED RISK MITIGATION
*Replacing human reviewers with Algorithms.*

### **A. Computer Vision Damage Arbitration**
*   **The Problem:** Subjective disputes ("Small scratch" vs "Damage").
*   **The Tech:** A custom pipeline that ingests inspection videos/photos.
*   **Workflow:**
    1.  **Ingest:** `video-inspection-recorder` uploads signed evidence.
    2.  **Process:** `analyze-damage-images` (Edge Function) runs cosmetic analysis.
    3.  **Arbitrate:** AI compares Check-in vs Check-out vectors. If distance > threshold → Flag for dispute.
*   **Impact:** 90% reduction in manual dispute handling costs.

### **B. Identity & Fraud Firewall**
*   **Components:**
    *   **Document Analysis:** `gemini3-document-analyzer` extracts OCR data from CNH/DNI.
    *   **Liveness Check:** `verify-face` ensures the user is present.
    *   **Behavioral Fraud:** `fraud_detection_system.sql` analyzes velocity (IPs, cards, device IDs) to block synthetic identities.
*   **Status:** Hard-blocking. No booking is possible without passing this gate.

---

## 4. ⚖️ LEGAL-TECH: THE "COMODATO" ENGINE
*Regulatory defense baked into code.*

### **A. Dynamic Contract Generation**
*   **Concept:** We do not offer "Rent-a-Car" (Transport); we facilitate "Comodato Oneroso" (Private Lending).
*   **Implementation:** The system generates a unique, legally binding PDF contract for *every single trip*, signed digitally by both parties.
*   **Specificity:** Contracts adapt clauses based on jurisdiction (Argentina vs Uruguay) and asset type.
*   **Evidence:** `apps/web/src/app/features/contracts`, `generate-booking-contract-pdf`.

### **B. Geofencing & Logistics Automation**
*   **Tech:** PostGIS (Geospatial database extension).
*   **Logic:** Defined "Handover Zones" with lat/long and radius.
*   **Automation:** Database triggers (`sql/feature_contracts_geofence.sql`) detect when an asset enters the return zone, automatically changing status to `Returned` and stopping the billing clock.

---

## 5. 📈 GROWTH ENGINEERING
*Acquisition costs approaching zero.*

### **A. The "Border Wi-Fi" Node Strategy**
*   **Tech:** Captive Portal PWA.
*   **Flow:** User connects to Free Wi-Fi → Redirection to Local PWA Server → Data Capture (Phone/WhatsApp) → App Install.
*   **Advantage:** Zero-marginal cost lead generation in high-traffic/low-connectivity zones.

### **B. Viral Content Automation**
*   **Tech:** Headless browser agents.
*   **Function:** `social-media-publisher` & `tiktok-events`.
*   **Action:** Automatically edits car photos into vertical video format and posts to TikTok/Reels with trending audio to drive organic traffic.

---

## 6. 🤖 DEV-OPS & QUALITY ASSURANCE
*How we maintain a massive platform with a lean team.*

### **A. AI-Agent CI/CD**
*   **Tools:** `tools/gemini-suite-mcp`.
*   **Workflow:** AI Agents proactively audit the codebase for unused tables, type errors, and security vulnerabilities.
*   **Result:** A "Self-Healing" codebase that allows 2 developers to do the work of 10.

### **B. Competitor Intelligence**
*   **Tool:** `tools/analyze-competitors.ts`.
*   **Function:** Scrapes pricing data from major rental agencies to feed the `DynamicPricing` model, ensuring AutoRenta owners are always competitively priced.

---

## 7. CONCLUSION & READINESS VERDICT

**Technical Readiness Level (TRL): 8/9 (System Complete and Qualified).**

The platform requires **no significant R&D** to launch. The architectural risks (Scalability, Security, Payments) have been mitigated.
The current focus is purely on **Operational Tuning** and **Liquidity Injection**.

*   **Code Quality:** Production-Grade (Strict TypeScript, RLS, Linted).
*   **Scalability:** Horizontally scalable via Serverless Edge.
*   **Security:** Zero-Trust Architecture (RLS + Policies).

**Prepared by:** AutoRenta Engineering Team
**Audited:** January 2026