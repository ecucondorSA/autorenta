# P2P Automation System

Automated Binance P2P + MercadoPago transfer system for Argentina.

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         SUPABASE (Source of Truth)                       │
│  ┌─────────────────┐  ┌────────────────┐                                │
│  │   p2p_orders    │  │   p2p_events   │                                │
│  │  (State Machine)│  │  (Audit Log)   │                                │
│  └────────┬────────┘  └───────┬────────┘                                │
└───────────┼───────────────────┼─────────────────────────────────────────┘
            │                   │
            └───────────────────┼───────────────────┐
                                │                   │
                                ▼                   ▼
                   ┌─────────────────┐   ┌─────────────────┐
                   │    DETECTOR     │   │    EXECUTOR     │
                   │  (Binance Poll) │   │ (MP Transfers)  │
                   └─────────────────┘   └─────────────────┘
```

## Quick Start

```bash
# 1. Install
./scripts/install.sh

# 2. Run migration
./scripts/migrate.sh

# 3. Start services
npm run dev -- detector    # Terminal 1
npm run dev -- executor    # Terminal 2
```

## State Machine

```
detected → extracting → pending_transfer → transferring → awaiting_qr → confirming → completed
                │                │              │                           │
                └────────────────┴──────────────┴─────────── failed ◀───────┘
```

## Commands

```bash
npm run build        # Build TypeScript
npm run dev          # Run with tsx (dev)
npm start            # Run compiled (prod)
```

## Systemd Services

```bash
# Install services
sudo cp systemd/*.service /etc/systemd/system/
sudo systemctl daemon-reload

# Enable on boot
sudo systemctl enable p2p-detector p2p-executor

# Start/stop
sudo systemctl start p2p-detector
sudo systemctl start p2p-executor

# View logs
journalctl -u p2p-detector -f
journalctl -u p2p-executor -f
```

## Known Limitations

1. **QR Verification**: Cannot be automated - requires manual phone scan
2. **React Hack**: MercadoPago amount input uses React internals
3. **Session Expiry**: Browser sessions may expire - requires re-login
