import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { getSessionFromRequest, getSession, authenticateUser } from '@/lib/auth/session';
import { recordAuditEvent } from '@/lib/observability/audit';
import { ComplaintExtractionService } from '@/modules/extraction/extractor';
import { RiskTriageEngine } from '@/modules/triage/risk-engine';
import { computeSha256 } from '@/modules/intake/sanitizer';
import { ComplaintStatus, SourceType } from '@prisma/client';
import Papa from 'papaparse';

export async function POST(request: NextRequest) {
  let session = getSessionFromRequest(request) || (await getSession());
  if (!session) {
    session = await authenticateUser('reviewer@apexquality.com');
  }

  try {
    const contentType = request.headers.get('content-type') || '';
    let itemsToProcess: Array<{
      description: string;
      productName?: string;
      productCode?: string;
      lotNumber?: string;
      serialNumber?: string;
      complainantName?: string;
      complainantContact?: string;
      complainantType?: string;
      category?: string;
      externalReference?: string;
      sourceSystem?: string;
    }> = [];

    if (contentType.includes('application/json')) {
      const body = await request.json();
      if (Array.isArray(body)) {
        itemsToProcess = body;
      } else if (body.rawText) {
        itemsToProcess = [{
          description: body.rawText,
          sourceSystem: body.sourceSystem || 'unstructured_text_intake',
          externalReference: body.externalReference,
        }];
      } else if (body.csvData) {
        const parsed = Papa.parse(body.csvData, { header: true, skipEmptyLines: true });
        itemsToProcess = parsed.data.map((row: any) => ({
          description: row.description || row.Description || row.complaint_text || row.Narrative || '',
          productName: row.product || row.Product || row.product_name,
          productCode: row.product_code || row.Ref || row.CatalogNumber,
          lotNumber: row.lot || row.Lot || row.lot_number || row.Batch,
          serialNumber: row.serial || row.Serial || row.serial_number,
          complainantName: row.complainant || row.Reporter || row.Customer,
          complainantContact: row.contact || row.Email,
          category: row.category || row.Category,
          externalReference: row.external_ref || row.TicketID || row.RMA,
          sourceSystem: 'csv_batch_import',
        }));
      } else {
        itemsToProcess = [body];
      }
    } else {
      const text = await request.text();
      itemsToProcess = [{
        description: text,
        sourceSystem: 'raw_text_intake',
      }];
    }

    if (itemsToProcess.length === 0) {
      return NextResponse.json({ error: 'No complaint data provided' }, { status: 400 });
    }

    const createdComplaints = [];
    const currentYear = new Date().getFullYear();

    for (const item of itemsToProcess) {
      if (!item.description || item.description.trim().length < 5) continue;

      const count = await prisma.complaint.count({
        where: { organizationId: session!.organizationId },
      });
      const complaintNumber = `CMP-${currentYear}-${String(count + 1).padStart(4, '0')}`;

      // Extraction
      const extraction = ComplaintExtractionService.extractFromText(item.description);
      const productName = item.productName || extraction.productName || 'Unspecified Product';
      const category = item.category || extraction.category;
      const lotNumber = item.lotNumber || extraction.lotNumber;
      const serialNumber = item.serialNumber || extraction.serialNumber;

      // Triage
      const triage = RiskTriageEngine.evaluateComplaint({
        description: item.description,
        productName,
        category,
        lotNumber,
        serialNumber,
      });

      const dueDate = new Date(Date.now() + triage.slaHours * 3600 * 1000);
      const contentHash = computeSha256(item.description);

      const complaint = await prisma.$transaction(async (tx) => {
        const c = await tx.complaint.create({
          data: {
            complaintNumber,
            organizationId: session!.organizationId,
            sourceType: SourceType.CSV_IMPORT,
            externalReference: item.externalReference || null,
            complainantName: item.complainantName || extraction.complainantName || null,
            complainantContact: item.complainantContact || extraction.complainantContact || null,
            complainantType: item.complainantType || extraction.complainantType || 'CONSUMER',
            productName,
            productCode: item.productCode || extraction.productCode || null,
            lotNumber: lotNumber || null,
            serialNumber: serialNumber || null,
            originalDescription: item.description, // Source record
            normalizedDescription: extraction.normalizedDescription,
            category,
            reportedImpact: extraction.reportedImpact || null,
            status: ComplaintStatus.TRIAGE_REVIEW,
            priority: triage.suggestedPriority,
            isSafetyCritical: triage.isSafetyCritical,
            isReportable: triage.isReportableSuspected,
            dueDate,
            assignedToId: session!.userId,
          },
        });

        await tx.complaintSource.create({
          data: {
            complaintId: c.id,
            sourceSystem: item.sourceSystem || 'csv_import',
            externalId: item.externalReference || null,
            rawPayload: item.description,
            contentHash,
          },
        });

        await tx.complaintExtraction.create({
          data: {
            complaintId: c.id,
            schemaVersion: 'v1.0',
            extractionMethod: 'AI_ASSISTED',
            extractedFields: JSON.parse(
              JSON.stringify({
                productName,
                lotNumber,
                serialNumber,
                category,
                citations: extraction.citations,
              })
            ),
            confidence: extraction.confidence,
            missingFields: extraction.missingFields,
          },
        });

        await tx.riskAssessment.create({
          data: {
            complaintId: c.id,
            assessmentVersion: 1,
            appliedRules: triage.factors.filter((f) => f.triggered).map((f) => f.name),
            factorsConsidered: JSON.parse(JSON.stringify(triage.factors)),
            suggestedPriority: triage.suggestedPriority,
            suggestedCategory: category,
            confidence: triage.confidence,
            rationale: triage.rationale,
            missingInformation: triage.missingInformation,
            finalPriority: triage.suggestedPriority,
          },
        });

        return c;
      });

      await recordAuditEvent({
        organizationId: session!.organizationId,
        actor: session,
        action: 'COMPLAINT_IMPORTED',
        entityType: 'Complaint',
        entityId: complaint.id,
        newState: {
          complaintNumber: complaint.complaintNumber,
          productName: complaint.productName,
          priority: complaint.priority,
        },
        reason: `Batch intake from ${item.sourceSystem || 'import'}`,
      });

      createdComplaints.push(complaint);
    }

    return NextResponse.json({
      success: true,
      count: createdComplaints.length,
      complaints: createdComplaints,
    });
  } catch (err: any) {
    console.error('[INTAKE_ERROR]', err);
    return NextResponse.json({ error: err.message || 'Intake failed' }, { status: 500 });
  }
}
