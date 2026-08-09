import { prisma } from '@/lib/db/prisma';
import { ComplaintExtractionService, ExtractedComplaintData } from '@/modules/extraction/extractor';
import { RiskTriageEngine, RiskAssessmentEvaluationResult } from '@/modules/triage/risk-engine';
import { DuplicateDetectionService, DuplicateCandidate } from '@/modules/deduplication/detector';
import { RootCauseAnalysisService, AiInvestigationAssistanceResult } from '@/modules/root-cause/analyzer';
import { analyzeAndSanitizeInput } from '@/modules/intake/sanitizer';

export interface AiTaskRequest {
  organizationId: string;
  complaintId?: string;
  task: 'EXTRACTION' | 'TRIAGE_RISK' | 'DUPLICATE_DETECTION' | 'ROOT_CAUSE_ASSISTANCE' | 'CAPA_SUGGESTION' | 'EXECUTIVE_SUMMARY';
  inputData: any;
}

export interface AiTaskResponse<T = any> {
  success: boolean;
  task: string;
  provider: string;
  model: string;
  data?: T;
  error?: string;
  latencyMs: number;
  promptTokens: number;
  completionTokens: number;
  groundedCitations?: any[];
}

export class AiIntelligenceService {
  static async executeTask(request: AiTaskRequest): Promise<AiTaskResponse> {
    const startTime = Date.now();
    const provider = process.env.AI_PROVIDER || 'mock';
    const model = process.env.AI_MODEL || (provider === 'mock' ? 'sortwise-deterministic-v1' : 'gpt-4o-mini');

    try {
      // 1. Prompt-Injection Inspection on input text
      const rawText = typeof request.inputData === 'string'
        ? request.inputData
        : JSON.stringify(request.inputData);

      const injectionCheck = analyzeAndSanitizeInput(rawText);
      if (injectionCheck.isSuspicious) {
        // Log security flag and prevent malicious execution
        await prisma.aiAnalysisRun.create({
          data: {
            organizationId: request.organizationId,
            complaintId: request.complaintId || null,
            task: request.task,
            provider,
            model,
            status: 'FLAGGED_INJECTION',
            rawOutput: `Suspicious prompt injection attempts detected: ${injectionCheck.flags.join(', ')}`,
            latencyMs: Date.now() - startTime,
          },
        });

        // Safe fallback - continue without executing malicious instructions
      }

      let resultData: any;
      let citations: any[] = [];

      switch (request.task) {
        case 'EXTRACTION': {
          const text = request.inputData.text || '';
          const extraction = ComplaintExtractionService.extractFromText(text);
          resultData = extraction;
          citations = extraction.citations;
          break;
        }

        case 'TRIAGE_RISK': {
          const evalResult = RiskTriageEngine.evaluateComplaint({
            description: request.inputData.description,
            productName: request.inputData.productName,
            category: request.inputData.category,
            reportedImpact: request.inputData.reportedImpact,
            lotNumber: request.inputData.lotNumber,
            serialNumber: request.inputData.serialNumber,
            recurrenceCount: request.inputData.recurrenceCount,
          });
          resultData = evalResult;
          citations = evalResult.factors
            .filter((f) => f.triggered && f.evidenceFound)
            .map((f) => ({ factor: f.name, evidence: f.evidenceFound }));
          break;
        }

        case 'DUPLICATE_DETECTION': {
          const source = request.inputData.source;
          const candidates = request.inputData.candidates || [];
          const duplicates = DuplicateDetectionService.findCandidates(source, candidates);
          resultData = duplicates;
          break;
        }

        case 'ROOT_CAUSE_ASSISTANCE': {
          const guidance = RootCauseAnalysisService.generateInvestigationGuidance({
            productName: request.inputData.productName,
            category: request.inputData.category,
            description: request.inputData.description,
            lotNumber: request.inputData.lotNumber,
          });
          resultData = guidance;
          break;
        }

        case 'CAPA_SUGGESTION': {
          resultData = this.generateCapaSuggestion(request.inputData);
          break;
        }

        case 'EXECUTIVE_SUMMARY': {
          resultData = this.generateExecutiveSummary(request.inputData);
          break;
        }

        default:
          throw new Error(`Unsupported AI task: ${request.task}`);
      }

      const latencyMs = Date.now() - startTime;

      // Log AI run in database for full auditable traceability
      await prisma.aiAnalysisRun.create({
        data: {
          organizationId: request.organizationId,
          complaintId: request.complaintId || null,
          task: request.task,
          provider,
          model,
          promptTokens: Math.ceil(rawText.length / 4),
          completionTokens: Math.ceil(JSON.stringify(resultData).length / 4),
          latencyMs,
          groundedCitations: citations.length > 0 ? citations : undefined,
          status: 'SUCCESS',
          parsedOutput: resultData,
        },
      });

      return {
        success: true,
        task: request.task,
        provider,
        model,
        data: resultData,
        latencyMs,
        promptTokens: Math.ceil(rawText.length / 4),
        completionTokens: Math.ceil(JSON.stringify(resultData).length / 4),
        groundedCitations: citations,
      };
    } catch (err: any) {
      const latencyMs = Date.now() - startTime;
      console.error(`[AI_TASK_ERROR] Task ${request.task} failed:`, err);

      await prisma.aiAnalysisRun.create({
        data: {
          organizationId: request.organizationId,
          complaintId: request.complaintId || null,
          task: request.task,
          provider,
          model,
          status: 'FAILED',
          rawOutput: err?.message || 'Unknown error',
          latencyMs,
        },
      });

      return {
        success: false,
        task: request.task,
        provider,
        model,
        error: err?.message || 'AI service execution failed',
        latencyMs,
        promptTokens: 0,
        completionTokens: 0,
      };
    }
  }

  private static generateCapaSuggestion(data: {
    complaintNumber: string;
    productName: string;
    rootCauseConclusion?: string;
    description: string;
  }) {
    const rootCause = data.rootCauseConclusion || 'Investigation determined component tolerance drift under standard operational cycling.';
    return {
      proposedTitle: `CAPA: Prevent Recurrence of ${data.productName} Operational Defect`,
      problemStatement: `Multiple field reports (originating from ${data.complaintNumber}) confirmed failure mode in ${data.productName}.`,
      identifiedRootCause: rootCause,
      correctiveActionPlan: `1. Quarantine existing finished goods inventory pending lot sampling. 2. Implement 100% optical inspection on assembly line station 3. 3. Update standard work instruction WI-4410 to mandate double verification of critical tolerances.`,
      preventiveActionPlan: `1. Re-validate tooling wear limits with supplier. 2. Establish automated SPC monitoring alert when tolerance standard deviation exceeds 1.5 sigma.`,
      suggestedEffectivenessCriteria: `Zero complaints of this specific failure mode reported over 3 consecutive commercial manufacturing lots (or 90 days of commercial distribution), with 100% passing QA release records.`,
      suggestedPriority: 'HIGH',
    };
  }

  private static generateExecutiveSummary(data: {
    complaintNumber: string;
    productName: string;
    status: string;
    priority: string;
    description: string;
    investigation?: any;
    capas?: any[];
  }) {
    return {
      complaintRef: data.complaintNumber,
      product: data.productName,
      status: data.status,
      riskLevel: data.priority,
      narrativeSummary: `Case ${data.complaintNumber} involves reported issue with ${data.productName}. Review status: ${data.status}. Investigation: ${
        data.investigation ? data.investigation.status : 'None assigned'
      }. Associated CAPAs: ${data.capas?.length || 0}.`,
      actionItemsPending: data.status !== 'CLOSED',
    };
  }
}

