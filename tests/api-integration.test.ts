import { describe, it, expect } from 'vitest';
import { prisma } from '@/lib/db/prisma';
import { ComplaintStatus, Priority, Role } from '@prisma/client';

describe('Database & Traceability Integration Tests', () => {
  it('should find seeded organization, users, complaints, and audit records in PostgreSQL', async () => {
    const org = await prisma.organization.findUnique({
      where: { slug: 'apex-biomedical' },
      include: {
        memberships: {
          include: { user: true },
        },
      },
    });

    expect(org).toBeDefined();
    expect(org!.name).toBe('Apex Biomedical Quality Systems');
    expect(org!.memberships.length).toBeGreaterThanOrEqual(5);

    // Verify all 5 key quality roles exist
    const roles = org!.memberships.map((m) => m.role);
    expect(roles).toContain(Role.ADMINISTRATOR);
    expect(roles).toContain(Role.COMPLAINT_REVIEWER);
    expect(roles).toContain(Role.INVESTIGATOR);
    expect(roles).toContain(Role.QUALITY_APPROVER);
    expect(roles).toContain(Role.READONLY_AUDITOR);
  });

  it('should guarantee original description is preserved and hashable', async () => {
    const cmp = await prisma.complaint.findUnique({
      where: { complaintNumber: 'CMP-2026-0001' },
      include: { source: true, riskAssessments: true, investigations: true },
    });

    expect(cmp).toBeDefined();
    expect(cmp!.originalDescription).toContain('PACU');
    expect(cmp!.source).toBeDefined();
    expect(cmp!.source!.contentHash.length).toBe(64);
  });

  it('should maintain full traceability from Complaint -> Investigation -> 5 Whys -> CAPA', async () => {
    const cmp = await prisma.complaint.findUnique({
      where: { complaintNumber: 'CMP-2026-0001' },
      include: {
        investigations: {
          include: {
            hypotheses: true,
            tasks: true,
          },
        },
        capaLinks: {
          include: {
            capa: {
              include: {
                leadOwner: true,
              },
            },
          },
        },
      },
    });

    expect(cmp!.investigations.length).toBeGreaterThan(0);
    const inv = cmp!.investigations[0];
    expect(inv.investigationNumber).toBe('INV-2026-0001');
    expect(inv.hypotheses.length).toBe(5); // 5 Whys verified steps

    expect(cmp!.capaLinks.length).toBeGreaterThan(0);
    const capaLink = cmp!.capaLinks[0];
    expect(capaLink.capa.capaNumber).toBe('CAPA-2026-0001');
    expect(capaLink.capa.effectivenessCriteria).toContain('Zero watchdog reset events');
  });

  it('should verify audit events exist for material quality actions', async () => {
    const events = await prisma.auditEvent.findMany({
      take: 10,
      orderBy: { createdAt: 'desc' },
    });

    expect(events.length).toBeGreaterThan(0);
    const actions = events.map((e) => e.action);
    expect(actions).toContain('COMPLAINT_CREATED');
    expect(actions).toContain('CAPA_CREATED');
  });
});

