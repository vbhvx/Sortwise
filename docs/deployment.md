# Deployment & Operations Guide: Sortwise

## 1. Prerequisites

- **Node.js**: v20 or v22+
- **PostgreSQL**: v14, v15, or v16+
- **Docker & Docker Compose** (Optional for containerized deployments)

---

## 2. Local Development Setup

1. **Clone the repository and install dependencies**:
   ```bash
   git clone <repo-url>
   cd 33_Sortwise
   npm install
   ```

2. **Configure Environment Variables**:
   ```bash
   cp .env.example .env
   ```
   Ensure `DATABASE_URL` points to your PostgreSQL instance:
   ```env
   DATABASE_URL="postgresql://user:password@localhost:5432/sortwise_dev?schema=public"
   JWT_SECRET="sortwise-quality-intelligence-secret-key-2026"
   NEXT_PUBLIC_APP_URL="http://localhost:3000"
   AI_PROVIDER="mock" # "mock" | "openai" | "gemini" | "anthropic"
   ```

3. **Initialize Database Schema & Migrations**:
   ```bash
   npx prisma db push
   ```

4. **Seed Verified Quality Demonstration Records**:
   ```bash
   npm run prisma:seed
   ```

5. **Run the Development Server**:
   ```bash
   npm run dev
   ```
   Open `http://localhost:3000` in your web browser.

---

## 3. Automated Test Execution

Run the complete Vitest test suite covering intake, triage, state machine, deduplication, CAPA workflow, and prompt injection defense:
```bash
npm test
```

To run type checking and production build:
```bash
npm run build
```

---

## 4. Docker Deployment

A standalone `Dockerfile` and `docker-compose.yml` are provided in the root directory:

```bash
docker-compose up -d --build
```
This boots both the PostgreSQL database container and the Next.js production web server on port 3000.

