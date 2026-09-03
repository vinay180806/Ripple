# Ripple System Integration Contracts

This document establishes the official API and inter-track integration contracts for the Ripple codebase.

- **Track C (This Platform)**: Implements and hosts the core backend, database, authentication, queues, cache, webhooks, and REST boundaries.
- **Track A (Static Analysis Engine)**: Provides AST parsing, symbol indexing, call graphs, and blast-radius computation.
- **Track B (RAG & LLM Engine)**: Provides semantic search, code chunk embeddings, grounded Q&A, and AI impact analysis.

---

## Part 1: Track C REST API Contracts (Implemented)

All authenticated endpoints require an `Authorization: Bearer <JWT_TOKEN>` header.

### 1. Authentication (`/auth`)

#### `POST /auth/signup`
Creates a new user account.
- **Request Body**:
```json
{
  "username": "alice",
  "email": "alice@example.com",
  "password": "securePassword123!"
}
```
- **Response `201 Created`**:
```json
{
  "status": "ok",
  "data": {
    "user": {
      "id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
      "github_user_id": null,
      "username": "alice",
      "email": "alice@example.com",
      "has_github_auth": false,
      "created_at": "2026-09-02T12:00:00.000Z",
      "updated_at": "2026-09-02T12:00:00.000Z"
    },
    "tokens": {
      "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      "expiresIn": "7d"
    }
  }
}
```

#### `POST /auth/login`
Authenticates existing user and generates session token.
- **Request Body**:
```json
{
  "email": "alice@example.com",
  "password": "securePassword123!"
}
```
- **Response `200 OK`**: Same format as `signup`.

#### `GET /auth/me`
Fetches authenticated user profile.
- **Headers**: `Authorization: Bearer <JWT_TOKEN>`
- **Response `200 OK`**:
```json
{
  "status": "ok",
  "data": {
    "id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
    "github_user_id": "12345678",
    "username": "alice",
    "email": "alice@example.com",
    "has_github_auth": true,
    "created_at": "2026-09-02T12:00:00.000Z",
    "updated_at": "2026-09-02T12:00:00.000Z"
  }
}
```

#### `GET /auth/github`
Returns GitHub OAuth authorization URL and CSRF state.
- **Response `200 OK`**:
```json
{
  "status": "ok",
  "data": {
    "url": "https://github.com/login/oauth/authorize?client_id=...&redirect_uri=...&scope=repo+read%3Auser+user%3Aemail&state=...",
    "state": "a1b2c3d4e5f6..."
  }
}
```

#### `GET /auth/github/callback?code=...&state=...`
Completes OAuth code exchange, encrypts GitHub access token, provisions/links user, and returns session token.

---

### 2. Repository Management (`/repos`)

#### `POST /repos/connect`
Connects a repository to Ripple and enqueues indexing job.
- **Request Body**:
```json
{
  "github_repo_id": "987654321",
  "github_url": "https://github.com/alice/payment-service",
  "name": "payment-service",
  "full_name": "alice/payment-service",
  "default_branch": "main"
}
```
- **Response `201 Created`**:
```json
{
  "status": "ok",
  "data": {
    "id": "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d",
    "github_repo_id": "987654321",
    "github_url": "https://github.com/alice/payment-service",
    "owner_id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
    "name": "payment-service",
    "full_name": "alice/payment-service",
    "default_branch": "main",
    "indexed_status": "pending",
    "last_indexed_commit": null,
    "created_at": "2026-09-02T12:00:00.000Z",
    "updated_at": "2026-09-02T12:00:00.000Z"
  }
}
```

#### `GET /repos`
Lists all repositories owned by the authenticated user.
- **Response `200 OK`**: `{"status": "ok", "data": [ ... ]}`

#### `GET /repos/:id`
Retrieves detailed metadata for a single repository.

#### `GET /repos/:id/status`
Queries current indexing status (`pending`, `indexing`, `complete`, `failed`).
- **Response `200 OK`**:
```json
{
  "status": "ok",
  "data": {
    "id": "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d",
    "name": "payment-service",
    "full_name": "alice/payment-service",
    "indexed_status": "complete",
    "last_indexed_commit": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
    "updated_at": "2026-09-02T12:05:00.000Z"
  }
}
```

#### `DELETE /repos/:id`
Disconnects repository and purges caches.

---

### 3. GitHub Webhooks (`/webhooks/github`)

#### `POST /webhooks/github`
Receives GitHub push/ping events. Validates HMAC signature via `X-Hub-Signature-256`.
- **Headers**:
  - `X-Hub-Signature-256: sha256=...`
  - `X-GitHub-Event: push`
- **Response `202 Accepted`**:
```json
{
  "status": "ok",
  "message": "Update job enqueued",
  "data": {
    "enqueued": true,
    "repoId": "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d",
    "changedFilesCount": 2
  }
}
```

---

### 4. Q&A API Boundary (`POST /qa`)

#### `POST /qa`
Submits a natural-language question about the codebase.
- **Request Body**:
```json
{
  "repo_id": "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d",
  "question": "How does user authentication work in this repository?",
  "commit_hash": "e3b0c442..."
}
```
- **Response `200 OK`**:
```json
{
  "status": "ok",
  "data": {
    "repoId": "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d",
    "question": "How does user authentication work in this repository?",
    "commitHash": "e3b0c442...",
    "answer": "[MOCK TRACK B RESPONSE] Based on repository analysis...",
    "sources": [
      {
        "file": "src/middleware/auth.middleware.ts",
        "lineStart": 18,
        "lineEnd": 35,
        "snippet": "export async function authenticate(...) { ... }"
      }
    ],
    "confidence": 0.94,
    "isMock": true,
    "cached": false
  }
}
```

---

### 5. Impact Report API Boundary (`POST /impact-report`)

#### `POST /impact-report`
Analyzes impact of a code change / pull request diff.
- **Request Body**:
```json
{
  "repo_id": "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d",
  "diff_ref": "HEAD~1..HEAD",
  "changed_files": ["src/services/payment.ts"]
}
```
- **Response `200 OK`**:
```json
{
  "status": "ok",
  "data": {
    "reportId": "550e8400-e29b-41d4-a716-446655440000",
    "repoId": "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d",
    "diffRef": "HEAD~1..HEAD",
    "summary": "[MOCK TRACK B RESPONSE] Impact analysis on 1 changed files...",
    "riskScore": 0.35,
    "affectedSymbols": ["symbol_in_src_services_payment_ts"],
    "blastRadius": [
      "src/routes/auth.routes.ts",
      "src/controllers/auth.controller.ts"
    ],
    "recommendations": [
      "Run full auth test suite before merging"
    ],
    "isMock": true,
    "cached": false
  }
}
```

---

## Part 2: Future Track A Integration Contracts

> [!NOTE]
> **Status: NOT IMPLEMENTED IN THIS TRACK**
> Clean client interfaces and mock implementations (`TrackAClient`, `MockTrackAClient`) exist in Track C to allow immediate plug-and-play HTTP wiring in the future.

### `POST /ingest`
- **Purpose**: Ingests whole repository workspace, generates AST, extracts symbol table, and constructs call graph.
- **Request**:
```json
{
  "repo_id": "string",
  "commit_sha": "string",
  "workspace_path": "/tmp_workspaces/job_index_..."
}
```
- **Response**:
```json
{
  "success": true,
  "repo_id": "string",
  "commit_sha": "string",
  "symbol_count": 142,
  "graph_node_count": 320,
  "processing_time_ms": 150
}
```

### `POST /update`
- **Purpose**: Incrementally updates symbol table and call graph for changed files.
- **Request**:
```json
{
  "repo_id": "string",
  "commit_sha": "string",
  "changed_files": ["src/service.ts", "src/controller.ts"]
}
```

### `GET /blast-radius/:symbol_id?repo_id=...`
- **Purpose**: Computes transitive downstream dependencies and risk score.

### `GET /graph/:repo_id`
- **Purpose**: Returns complete or scoped node/edge call graph representation.

---

## Part 3: Future Track B Integration Contracts

> [!NOTE]
> **Status: NOT IMPLEMENTED IN THIS TRACK**
> Clean client interfaces and mock implementations (`TrackBClient`, `MockTrackBClient`) exist in Track C.

### `POST /qa`
- **Purpose**: Generates grounded natural language answers with source citations using RAG and vector retrieval.

### `POST /impact-report`
- **Purpose**: Uses LLM reasoning over AST blast-radius to provide human-readable risk summaries and recommendations.

### `POST /embed`
- **Purpose**: Generates and stores vector embeddings for updated code chunks.
- **Request**:
```json
{
  "repo_id": "string",
  "commit_sha": "string",
  "changed_files": ["src/service.ts"]
}
```
