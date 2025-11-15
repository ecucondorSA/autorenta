# AutoRenta 🚗

[![Production Readiness](https://img.shields.io/badge/Production%20Ready-67%25-yellow)](https://github.com/ecucondorSA/autorenta)
[![Angular](https://img.shields.io/badge/Angular-17-red)](https://angular.io/)
[![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-green)](https://supabase.com/)
[![Cloudflare](https://img.shields.io/badge/Cloudflare-Pages-orange)](https://pages.cloudflare.com/)

Marketplace de renta de autos peer-to-peer para Argentina. Conecta dueños de autos con personas que necesitan alquilar un vehículo de forma segura y confiable.

## 🌟 Features

### ✅ Implementado
- **Autenticación & Autorización**: Sistema completo con roles (locador, locatario, admin)
- **Publicación de Autos**: CRUD completo con hasta 10 fotos por auto
- **Sistema de Reservas**: Flujo completo de booking con estados y validaciones
- **Pagos & Wallet**: Integración con MercadoPago, wallet interno con balance bloqueado
- **Mensajería**: Chat estilo WhatsApp con archivos, fotos y cámara
- **Verificación**: Sistema de verificación de identidad y documentos
- **Protecciones**: Sistema de protectores para cobertura de seguros
- **Calendario**: Integración con Google Calendar para disponibilidad
- **Admin Panel**: Dashboard administrativo completo

### 🚧 En Desarrollo
- Precios dinámicos basados en demanda
- Sistema de referidos con bonos
- Monitoreo y alertas en tiempo real
- Integración con FIPE (valuación de autos en Brasil/Argentina)

## 🚀 Quick Start

### Prerequisites

- Node.js 20+ (check with `node -v`)
- Docker (for Supabase local)
- pnpm 10.22.0+ (check with `pnpm -v`)

### Setup

```bash
# 1. Clone repository
git clone https://github.com/ecucondorSA/autorenta.git
cd autorenta

# 2. Install dependencies
npm run install

# 3. Configure environment
cp .env.local.example .env.local
# Edit .env.local with your credentials

# 4. Setup authentication (one-time)
./tools/setup-auth.sh

# 5. Start development environment
npm run dev

# 6. Open browser
# - Web: http://localhost:4200
# - Worker: http://localhost:8787
```

### Common Commands

```bash
npm run dev              # Start dev environment
npm run test:quick       # Run tests
npm run ci               # Full CI pipeline (lint + test + build)
npm run deploy           # Deploy to production
npm run status           # Check project health
```

**See all commands**: `npm run workflows` or check [CLAUDE_WORKFLOWS.md](./CLAUDE_WORKFLOWS.md)

## 📖 Documentation

### For Developers
- **[CLAUDE.md](./CLAUDE.md)** - Main guide for AI assistants (start here!)
- **[CLAUDE_ARCHITECTURE.md](./CLAUDE_ARCHITECTURE.md)** - Technical architecture
- **[CLAUDE_WORKFLOWS.md](./CLAUDE_WORKFLOWS.md)** - Commands, CI/CD, deployment
- **[CLAUDE_STORAGE.md](./CLAUDE_STORAGE.md)** - Supabase Storage & RLS
- **[CLAUDE_PAYMENTS.md](./CLAUDE_PAYMENTS.md)** - Payment system (MercadoPago)

### Operational Runbooks
- **[Troubleshooting](./docs/runbooks/troubleshooting.md)** - Problem solving guide
- **[Deployment Guide](./docs/deployment-guide.md)** - Deployment procedures
- **[Disaster Recovery](./docs/disaster-recovery-plan.md)** - Recovery plan

### Additional Resources
- **[docs/](./docs/)** - Complete documentation index
- **[tests/](./tests/)** - E2E test suite (Playwright)
- **[tools/](./tools/)** - CLI tools and scripts

## 🏗️ Architecture

```
┌─────────────────┐
│   Angular 17    │  ← Frontend (Standalone Components)
│  (Cloudflare)   │
└────────┬────────┘
         │
         ↓
┌─────────────────┐
│    Supabase     │  ← Backend (PostgreSQL + Edge Functions)
│  (PostgreSQL)   │
└────────┬────────┘
         │
         ↓
┌─────────────────┐
│   MercadoPago   │  ← Payments (Production)
└─────────────────┘
```

### Tech Stack

**Frontend:**
- Angular 17 (standalone components)
- Tailwind CSS + PrimeNG
- Mapbox GL JS (maps)
- Signals & RxJS (state)

**Backend:**
- Supabase (PostgreSQL + Auth + Storage)
- Edge Functions (Deno)
- Row Level Security (RLS)

**Infrastructure:**
- Cloudflare Pages (hosting)
- Cloudflare Workers (webhooks)
- GitHub Actions (CI/CD)

**Payments:**
- MercadoPago (production)
- Mock webhooks (development)

## 🧪 Testing

```bash
# Unit tests
npm run test             # All tests with coverage
npm run test:quick       # Fast tests (no coverage)

# E2E tests (Playwright)
npm run test:e2e         # Headless mode
npm run test:e2e:ui      # UI mode (recommended)
npm run test:e2e:headed  # Headed mode

# Specific test suites
npm run test:e2e:booking     # Booking flow
npm run test:e2e:wallet      # Wallet tests
npm run test:e2e:calendar    # Google Calendar OAuth
```

**Test Coverage Goal**: 80%+ per module

## 🚀 Deployment

### Automatic (Recommended)

Merges to `main` trigger automatic deployment via GitHub Actions.

### Manual

```bash
# Deploy everything
npm run deploy

# Deploy specific targets
npm run deploy:web       # Angular app to Cloudflare Pages
npm run deploy:worker    # Workers to Cloudflare
```

**Production URLs:**
- Web: https://autorenta-web.pages.dev
- API: https://obxvffplochgeiclibng.supabase.co

## 🔒 Security

- **Authentication**: Supabase Auth with JWT tokens
- **Authorization**: Row Level Security (RLS) on all tables
- **Secrets**: GitHub Secrets + Cloudflare env vars
- **Compliance**: OWASP Top 10 checks in CI

**Report security issues**: Open an issue with `[SECURITY]` prefix

## 🤝 Contributing

1. Fork the repository
2. Create feature branch: `git checkout -b feature/amazing-feature`
3. Make changes and test: `npm run ci`
4. Commit: `git commit -m 'feat: add amazing feature'`
5. Push: `git push origin feature/amazing-feature`
6. Open Pull Request

**See**: [CONTRIBUTING.md](./CONTRIBUTING.md) and [PR_PROCESS.md](./docs/PR_PROCESS.md)

## 📊 Project Status

**Production Readiness**: 67% (as of Nov 2025)

**Recent Milestones:**
- ✅ Documentation cleanup (62 obsolete docs archived)
- ✅ E2E test suite (54 comprehensive tests)
- ✅ UI v2 (WhatsApp-style messaging, toast notifications)
- ✅ Brand colors applied (azul celeste, marfil, neutros)
- ✅ Real-time messaging with file uploads

**Next Up:**
- [ ] Dynamic pricing system
- [ ] Referral program
- [ ] Enhanced monitoring & alerting
- [ ] FIPE integration for car valuations

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](./LICENSE) file for details.

## 🆘 Support

- **Documentation**: Start with [CLAUDE.md](./CLAUDE.md)
- **Issues**: [GitHub Issues](https://github.com/ecucondorSA/autorenta/issues)
- **Troubleshooting**: [docs/runbooks/troubleshooting.md](./docs/runbooks/troubleshooting.md)

## 🙏 Acknowledgments

Built with:
- [Angular](https://angular.io/)
- [Supabase](https://supabase.com/)
- [Cloudflare](https://www.cloudflare.com/)
- [MercadoPago](https://www.mercadopago.com.ar/)
- [Mapbox](https://www.mapbox.com/)
- [PrimeNG](https://primeng.org/)

---

**Made with ❤️ in Argentina**
