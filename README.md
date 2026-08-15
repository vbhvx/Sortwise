# Sortwise

Sortwise is a quality-complaint management application. It records complaint intake, extraction confirmation, triage, related-case review, investigations, CAPAs, verification, state transitions, exports, audit events, and reports. It is designed around traceability rather than automatic closure decisions.

## Implementation

The application uses Next.js 14, React 18, TypeScript, Prisma/PostgreSQL, Zod, JWT-based role switching, PapaParse, Tailwind CSS, and Vitest. Server routes are under `src/app/api/v1`; UI pages cover dashboard, complaints, investigations, CAPAs, audit, and settings. The relational schema and development seed live in `prisma/`.

## Start locally

```bash
cd 33_Sortwise
npm install
cp .env.example .env
npm run prisma:generate
npm run prisma:migrate
npm run prisma:seed
npm run dev
```

Provide a PostgreSQL `DATABASE_URL` and a long, unique `JWT_SECRET`. The default `AI_PROVIDER=mock` is deterministic and needs no provider key.

```bash
npm test
npm run test:coverage
npm run lint
npm run build
```

`docker compose up --build` provides a containerized option.
