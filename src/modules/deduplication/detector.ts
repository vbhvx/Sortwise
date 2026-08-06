import { RelationshipType, RelationshipReviewStatus } from '@prisma/client';

export interface DuplicateMatchSignal {
  criteriaName: string;
  weight: number;
  matched: boolean;
  evidence: string;
}

export interface DuplicateCandidate {
  targetComplaintId: string;
  targetComplaintNumber: string;
  relationshipType: RelationshipType;
  similarityScore: number;
  signals: DuplicateMatchSignal[];
  rationale: string;
}

export class DuplicateDetectionService {
  /**
   * Deterministic matching algorithm that combines exact identifier matching
   * (Product, Lot, Serial, External Ref) with symptom/text similarity.
   */
  static findCandidates(
    source: {
      id: string;
      productName: string;
      productCode?: string | null;
      lotNumber?: string | null;
      serialNumber?: string | null;
      category: string;
      externalReference?: string | null;
      description: string;
    },
    candidates: Array<{
      id: string;
      complaintNumber: string;
      productName: string;
      productCode?: string | null;
      lotNumber?: string | null;
      serialNumber?: string | null;
      category: string;
      externalReference?: string | null;
      description: string;
      status: string;
      receivedAt: Date;
    }>
  ): DuplicateCandidate[] {
    const results: DuplicateCandidate[] = [];

    const sourceWords = this.tokenize(source.description);

    for (const target of candidates) {
      if (target.id === source.id) continue;

      const signals: DuplicateMatchSignal[] = [];
      let totalWeight = 0;
      let matchedWeight = 0;

      // 1. External Reference (e.g. same RMA, hospital incident ID, support ticket)
      const exactExtRef = !!(
        source.externalReference &&
        target.externalReference &&
        source.externalReference.trim().toLowerCase() === target.externalReference.trim().toLowerCase()
      );
      const extRefWeight = 35;
      totalWeight += extRefWeight;
      if (exactExtRef) matchedWeight += extRefWeight;
      signals.push({
        criteriaName: 'Exact External Reference / Ticket ID',
        weight: extRefWeight,
        matched: exactExtRef,
        evidence: exactExtRef
          ? `Both records share external reference: "${source.externalReference}"`
          : 'External reference does not match or is absent.',
      });

      // 2. Exact Serial Number Match (if device has serial number)
      let exactSerial = false;
      if (source.serialNumber || target.serialNumber) {
        exactSerial = !!(
          source.serialNumber &&
          target.serialNumber &&
          source.serialNumber.trim().toLowerCase() === target.serialNumber.trim().toLowerCase()
        );
        const serialWeight = 30;
        totalWeight += serialWeight;
        if (exactSerial) matchedWeight += serialWeight;
        signals.push({
          criteriaName: 'Exact Device Serial Number',
          weight: serialWeight,
          matched: exactSerial,
          evidence: exactSerial
            ? `Identical device serial number: "${source.serialNumber}"`
            : 'Serial numbers do not match or are not assigned.',
        });
      }

      // 3. Exact Lot / Batch Number Match
      const exactLot = !!(
        source.lotNumber &&
        target.lotNumber &&
        source.lotNumber.trim().toLowerCase() === target.lotNumber.trim().toLowerCase()
      );
      const lotWeight = 20;
      totalWeight += lotWeight;
      if (exactLot) matchedWeight += lotWeight;
      signals.push({
        criteriaName: 'Shared Lot / Batch Number',
        weight: lotWeight,
        matched: exactLot,
        evidence: exactLot
          ? `Both cases originated from batch/lot: "${source.lotNumber}"`
          : 'Lot numbers differ or are not specified.',
      });

      // 4. Exact Product Match
      const exactProduct =
        source.productName.trim().toLowerCase() === target.productName.trim().toLowerCase();
      const prodWeight = 15;
      totalWeight += prodWeight;
      if (exactProduct) matchedWeight += prodWeight;
      signals.push({
        criteriaName: 'Identical Product / Model',
        weight: prodWeight,
        matched: exactProduct,
        evidence: exactProduct
          ? `Matching product: "${source.productName}"`
          : `Different products: "${source.productName}" vs "${target.productName}"`,
      });

      // 5. Category and Symptom Keyword Similarity
      const sameCategory =
        source.category.trim().toLowerCase() === target.category.trim().toLowerCase();
      const targetWords = this.tokenize(target.description);
      const tokenOverlap = this.calculateJaccardSimilarity(sourceWords, targetWords);

      const simWeight = 15;
      totalWeight += simWeight;
      const simMatch = sameCategory && tokenOverlap >= 0.35;
      if (simMatch) matchedWeight += simWeight;
      signals.push({
        criteriaName: 'Defect Category & Symptom Overlap',
        weight: simWeight,
        matched: simMatch,
        evidence: `Category: ${sameCategory ? 'Match' : 'Different'}. Symptom vocabulary overlap: ${(tokenOverlap * 100).toFixed(1)}%`,
      });

      const similarityScore = Math.min(1.0, Math.round((matchedWeight / totalWeight) * 100) / 100);

      // Only consider if score indicates at least potential relationship
      if (similarityScore >= 0.3 || exactLot || exactSerial || exactExtRef) {
        let relType: RelationshipType = RelationshipType.RELATED_COMPLAINT;
        let rationale = '';

        if (exactExtRef || exactSerial || similarityScore >= 0.85) {
          relType = RelationshipType.POSSIBLE_DUPLICATE;
          rationale = `High probability duplicate report based on matching ${
            exactExtRef ? 'external ticket reference' : exactSerial ? 'serial number' : 'lot and symptom signature'
          }. Review required to confirm.`;
        } else if (exactLot && exactProduct) {
          relType = RelationshipType.RELATED_COMPLAINT;
          rationale = `Related batch occurrence: shares product and lot ${source.lotNumber}, but may represent independent clinical reporting.`;
        } else if (tokenOverlap >= 0.4) {
          relType = RelationshipType.SIMILAR_PROBLEM_DISTINCT_CASE;
          rationale = `Shares high symptom similarity (${(tokenOverlap * 100).toFixed(0)}%) across distinct lots/units.`;
        } else {
          relType = RelationshipType.RELATED_COMPLAINT;
          rationale = 'Weak to moderate matching signals identified. Review against historical records.';
        }

        results.push({
          targetComplaintId: target.id,
          targetComplaintNumber: target.complaintNumber,
          relationshipType: relType,
          similarityScore,
          signals,
          rationale,
        });
      }
    }

    // Sort highest similarity score first
    return results.sort((a, b) => b.similarityScore - a.similarityScore);
  }

  private static tokenize(text: string): Set<string> {
    const words = text
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter((w) => w.length >= 3 && !STOP_WORDS.has(w));
    return new Set(words);
  }

  private static calculateJaccardSimilarity(setA: Set<string>, setB: Set<string>): number {
    if (setA.size === 0 || setB.size === 0) return 0;
    let intersection = 0;
    for (const item of setA) {
      if (setB.has(item)) intersection++;
    }
    const union = new Set([...setA, ...setB]).size;
    return union === 0 ? 0 : intersection / union;
  }
}

const STOP_WORDS = new Set([
  'the', 'and', 'was', 'for', 'that', 'with', 'this', 'have', 'from', 'were',
  'which', 'there', 'been', 'about', 'after', 'also', 'will', 'reported', 'found',
]);
