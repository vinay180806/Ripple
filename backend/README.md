# Ripple Backend Platform (Track C)

Production-grade Backend Platform and integration orchestrator for **Ripple** — an intelligent codebase understanding and impact analysis system.

---

## 🎯 Architecture & Boundaries

This repository implements **Track C (Backend Platform Only)** with clean separation of concerns and decoupled integration boundaries:

- **Auth & Identity**: JWT authentication with bcrypt password hashing and GitHub OAuth code exchange.
- **Repository Management**: Metadata store, indexing state tracker, and multi-tenant repository access control.
- **Asynchronous Queue Engine**: Redis-backed BullMQ `index-repo` and `update-repo` queues with exponential backoff retries and worker lifecycle management.
- **Workspace Isolation**: Sandboxed temporary filesystem workspaces preventing directory traversal with automatic cleanup.
- **GitHub Webhook Engine**: HMAC-SHA256 signature verification (`X-Hub-Signature-256`), push event detection, and changed files extraction.
- **Cache & Performance**: Multi-tier Redis caching with SHA-256 query hashing and automatic cache invalidation on repository pushes.
- **Track A & Track B Boundaries**: Strongly-typed client interfaces (`TrackAClient`, `TrackBClient`) with deterministic mock implementations ready for future HTTP plug-in.

---

## 🛠 Technology Stack

- **Runtime**: Node.js v24+ (TypeScript Strict Mode)
- **Framework**: Express.js
- **Database**: PostgreSQL 16
- **Caching & Queues**: Redis 7, BullMQ, ioredis
- **Security**: JWT, bcryptjs, Helmet, AES-256-GCM Token Encryption, Timing-safe Webhook HMAC verification
- **Validation**: Zod
- **Testing**: Jest, Supertest, ts-jest
- **Containerization**: Docker, Docker Compose

---

## 📁 Project Structure

```
ripple-backend/
├── src/
│   ├── routes/          # Express API route definitions
│   │   ├── auth.routes.ts
│   │   ├── repo.routes.ts
│   │   ├── webhook.routes.ts
│   │   ├── qa.routes.ts
│   │   └── impact.routes.ts
│   ├── controllers/     # HTTP controllers with input validation
│   ├── services/        # Business logic, OAuth, Webhooks, Caching, Workspace
│   ├── jobs/            # BullMQ queues and worker processors
│   │   ├── queues/      # index.queue.ts, update.queue.ts
│   │   └── workers/     # index.worker.ts, update.worker.ts
│   ├── middleware/      # Auth, Error handling, Rate limiting
│   ├── db/              # PostgreSQL pool, schemas, SQL migrations
│   ├── clients/         # Track A & Track B client interfaces & mocks
│   ├── config/          # Zod environment validation
│   ├── types/           # TypeScript domain and API interfaces
│   ├── utils/           # Structured logger, JWT, AES encryption
│   ├── app.ts           # Express application setup
│   └── server.ts        # Server lifecycle and graceful shutdown
├── tests/               # Automated unit and integration test suite
├── contracts/           # API and inter-track integration contracts
├── Dockerfile           # Multi-stage production container build
├── docker-compose.yml   # Backend + PostgreSQL + Redis local orchestration
├── .env.example         # Environment configuration template
└── README.md
```

---

## 🚀 Getting Started

### Prerequisites
- Node.js `v20+` or `v24+`
- npm `v10+`
- (Optional) Docker & Docker Compose for containerized execution

### 1. Installation
```bash
cd ripple-backend
npm install
```

### 2. Environment Configuration
Copy the `.env.example` template:
```bash
cp .env.example .env
```

Key environment variables:
| Variable | Description | Default |
| :--- | :--- | :--- |
| `PORT` | Backend server port | `4000` |
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://postgres:postgres@localhost:5432/ripple` |
| `REDIS_URL` | Redis connection URL | `redis://localhost:6379` |
| `JWT_SECRET` | Secret key for JWT signing | (Set a secure 32+ char string) |
| `TOKEN_ENCRYPTION_KEY` | 32-byte hex key for AES-256-GCM | (64 hex characters) |
| `GITHUB_WEBHOOK_SECRET`| Secret for verifying GitHub webhooks | `mock_github_webhook_secret_key` |

### 3. Running Database Migrations
```bash
npm run migrate
```

### 4. Running the Development Server
```bash
npm run dev
```

### 5. Running Automated Tests
```bash
npm test
```

### 6. Building for Production
```bash
npm run build
npm start
```

---

## 🐳 Docker Deployment

To launch the full backend platform along with PostgreSQL and Redis:
```bash
docker compose up --build
```
This provisions:
- **Backend Platform** at `http://localhost:4000`
- **PostgreSQL 16** at `localhost:5432` with auto-applied migrations
- **Redis 7** at `localhost:6379`

---

## 🔌 API Endpoints Summary

| Method | Endpoint | Description | Auth Required |
| :--- | :--- | :--- | :--- |
| `GET` | `/health` | System health check | No |
| `POST` | `/auth/signup` | Register new user | No |
| `POST` | `/auth/login` | Log in and receive JWT | No |
| `GET` | `/auth/me` | Fetch user profile | Yes |
| `GET` | `/auth/github` | Get GitHub OAuth URL | No |
| `GET` | `/auth/github/callback` | OAuth code exchange | No |
| `POST` | `/repos/connect` | Connect a repository | Yes |
| `GET` | `/repos` | List connected repositories | Yes |
| `GET` | `/repos/:id` | Get repository details | Yes |
| `GET` | `/repos/:id/status` | Get indexing status | Yes |
| `DELETE`| `/repos/:id` | Disconnect repository | Yes |
| `POST` | `/webhooks/github` | GitHub webhook receiver | Webhook HMAC |
| `POST` | `/qa` | Codebase Q&A query | Yes |
| `POST` | `/impact-report` | Change impact analysis | Yes |

For full payload specifications and status codes, see [contracts/CONTRACTS.md](contracts/CONTRACTS.md).

---

## 🧪 Testing Verification

The test suite covers:
- **Auth**: User registration, duplicate emails, password validation, JWT signing/verification, protected route authorization.
- **Database & Encryption**: Schema operations, AES-256-GCM token encryption/decryption integrity.
- **Repositories**: Connection flow, status transitions, multi-tenant isolation, deletion.
- **Webhooks**: Valid and invalid HMAC-SHA256 signatures, push event parsing, changed file extraction.
- **BullMQ Workers**: Background indexing, incremental updates, error handling, retry policies.
- **Cache**: Key generation, TTL expiry, pattern invalidation.
- **Track A & B**: Interface conformance, mock data generation.
