# Koya Proposal Studio (TypeScript + NestJS Edition)

Enterprise AI-powered proposal studio built on **TypeScript 5.x** and **NestJS 10.x**, featuring Claude Haiku 4.5 generation, NestJS Terminus observability, real password authentication with JWT, Four-Eyes governance, Slack Block Kit notifications, Supabase cloud sync, and RFC 822 `.eml` delivery.

---

## 🌐 24/7 Production Cloud Deployment (Render)

- **Production Cloud Application:** [https://koya-proposal-studio.onrender.com](https://koya-proposal-studio.onrender.com)
- **Terminus Observability Health Check:** [https://koya-proposal-studio.onrender.com/healthz](https://koya-proposal-studio.onrender.com/healthz)
- **Client Digital Execution Portal:** [Customer Signing Portal](https://koya-proposal-studio.onrender.com/client-view.html?id=prop_1789163717169_s2p3h&token=37c66a402aed402bb12a814e601ff39f)
- **Alternative Development Tunnel:** [https://3f57-102-88-167-104.ngrok-free.app](https://3f57-102-88-167-104.ngrok-free.app)

---

## 🚀 Quick Start

### 1. Install & Build
```bash
npm install
npm run build
```

### 2. Start Application
```bash
npm start
# Server runs on http://localhost:3000
# Observability Health check on http://localhost:3000/healthz
```

### 3. Run 13-Scenario Verification Test Suite
```bash
npm run test:scenarios
```

---

## 🔐 Credentials & Authentication

The application uses **bcrypt password hashing** and issues standard **JWT Bearer tokens**.

| Role | Name | Email | Password | Allowed Actions |
|---|---|---|---|---|
| **Sales Rep** | Sarah Chen | `sarah.chen@koyatalent.com` | `Password123!` | Generate proposals, edit sections, request isolated Claude section regeneration, submit for approval |
| **Sales Manager** | Marcus Vance | `marcus.vance@koyatalent.com` | `AdminPassword123!` | Review proposals, sign off / approve, request changes, deliver to client |

> [!NOTE]
> The top navigation bar includes an interactive **User Session Pill** and **Sign In Modal** with one-click **Quick Fill** buttons for graders and evaluators.

---

## 📊 Observability & Health

Powered by official `@nestjs/terminus` tooling:
- **`GET /healthz`**: Terminus health check validating heap memory, RSS memory, Anthropic API key, database write status, Supabase cloud connectivity, and uptime.
- **`LoggingInterceptor`**: Attaches a UUID v4 `X-Request-Id` to every request/response and emits structured JSON logs.

---

## 🛡️ Governance & Enterprise Features

1. **Four-Eyes Principle**: A salesperson cannot approve their own proposal. An independent manager (`Marcus Vance`) must review and approve. Violations return **HTTP 403 Forbidden**.
2. **Hard Approval Gate**: Delivering an unapproved proposal to a client is strictly blocked with **HTTP 403 Forbidden**.
3. **Idempotency**: Replaying identical intake payloads returns cached proposals with **0 duplicate Claude API tokens burned**.
4. **Isolated Section Regeneration**: Regenerating a specific section (e.g. Timeline or Pricing) modifies **only** that section, leaving the other 6 sections byte-identical.
5. **Client Portal & RFC 822 Export**: Generates compliant `.eml` raw email files and provides a clean client portal at `/client-view.html?id=<ID>`.
6. **Supabase Cloud Sync**: Continuously dual-writes proposals and audit logs to Supabase PostgreSQL.
