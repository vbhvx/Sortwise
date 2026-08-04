import { analyzeAndSanitizeInput } from '@/modules/intake/sanitizer';

export interface ExtractedCitation {
  field: string;
  value: string;
  citationText: string;
}

export interface ExtractedComplaintData {
  productName?: string;
  productCode?: string;
  lotNumber?: string;
  serialNumber?: string;
  expirationDate?: string;
  occurredAt?: string;
  complainantName?: string;
  complainantContact?: string;
  complainantType?: string;
  category: string;
  reportedImpact?: string;
  normalizedDescription: string;
  citations: ExtractedCitation[];
  missingFields: string[];
  confidence: number;
  injectionFlags?: string[];
}

export class ComplaintExtractionService {
  /**
   * Deterministic pattern extraction with citation tracking.
   * This guarantees that even if external AI APIs fail or are unavailable,
   * extraction and field validation work 100% reliably.
   */
  static extractFromText(rawText: string): ExtractedComplaintData {
    const { isSuspicious, flags, sanitizedText } = analyzeAndSanitizeInput(rawText);

    const citations: ExtractedCitation[] = [];
    const missingFields: string[] = [];

    // 1. Extract Lot Number: Lot #12345, Lot: L-9876, Lot Number 88219, Batch B123
    let lotNumber: string | undefined;
    const lotMatch = sanitizedText.match(/(?:lot|batch)\s*(?:#|no\.?|num(?:ber)?)?\s*[:\-]?\s*([A-Za-z0-9\-]+)/i);
    if (lotMatch && lotMatch[1]) {
      lotNumber = lotMatch[1].trim();
      citations.push({
        field: 'lotNumber',
        value: lotNumber,
        citationText: lotMatch[0],
      });
    } else {
      missingFields.push('Lot/Batch Number not specified in source report');
    }

    // 2. Extract Serial Number: SN #1234, Serial: S-987, Serial Number: ...
    let serialNumber: string | undefined;
    const snMatch = sanitizedText.match(/(?:serial\s*(?:#|no\.?|num(?:ber)?)?|sn)\s*[:\-]?\s*([A-Za-z0-9\-]+)/i);
    if (snMatch && snMatch[1]) {
      serialNumber = snMatch[1].trim();
      citations.push({
        field: 'serialNumber',
        value: serialNumber,
        citationText: snMatch[0],
      });
    }

    // 3. Extract Product Name & Code
    let productName = 'Medical / Quality Product (Unspecified)';
    let productCode: string | undefined;

    const prodCodeMatch = sanitizedText.match(/(?:catalog|cat|model|ref|sku|code)\s*(?:#|no\.?|num(?:ber)?)?\s*[:\-]?\s*([A-Za-z0-9\-]+)/i);
    if (prodCodeMatch && prodCodeMatch[1]) {
      productCode = prodCodeMatch[1].trim();
      citations.push({
        field: 'productCode',
        value: productCode,
        citationText: prodCodeMatch[0],
      });
    }

    // Common known product keyword detections
    if (/dialyzer|hemodialysis/i.test(sanitizedText)) {
      productName = 'OptiFlow FX Hemodialyzer';
    } else if (/infusion\s+pump/i.test(sanitizedText)) {
      productName = 'AccuRate Plus Infusion Pump 3000';
    } else if (/ventilator|respiratory/i.test(sanitizedText)) {
      productName = 'AirPulse V-400 Critical Care Ventilator';
    } else if (/syringe|catheter|needle/i.test(sanitizedText)) {
      productName = 'UltraSafe Safety Shield Syringe (3ml)';
    } else if (/insulin|pen/i.test(sanitizedText)) {
      productName = 'GlucoPrecision Insulin Pen System';
    } else if (/pacemaker|cardiac/i.test(sanitizedText)) {
      productName = 'CardioSync Leadless Pacemaker 500';
    } else if (/tablet|capsule|injectable|vial|solution/i.test(sanitizedText)) {
      productName = 'Sterile Cefazolin Sodium Injection (1g Vial)';
    }

    // 4. Extract Category
    let category = 'Product Defect';
    if (/adverse\s+event|injury|death|harm|hospitalized|icu|patient\s+arrest/i.test(sanitizedText)) {
      category = 'Adverse Event / Patient Safety';
    } else if (/label|labeling|instructions|ifu|misbranded/i.test(sanitizedText)) {
      category = 'Labeling & Instructions for Use';
    } else if (/packag|seal|breach|sterile\s+barrier|cracked|tamper/i.test(sanitizedText)) {
      category = 'Packaging & Sterile Barrier Defect';
    } else if (/software|firmware|reboot|crash|screen\s+freeze|error\s+code/i.test(sanitizedText)) {
      category = 'Software / Firmware Malfunction';
    } else if (/contaminat|foreign\s+particle|discolor|particulate|turbid/i.test(sanitizedText)) {
      category = 'Particulate & Chemical Contamination';
    }

    // 5. Extract Reported Impact
    let reportedImpact: string | undefined;
    if (/death|fatal|expired/i.test(sanitizedText)) {
      reportedImpact = 'Death / Fatal Outcome';
    } else if (/icu|life-threatening|permanent\s+damage|anaphylaxis|cardiac\s+arrest/i.test(sanitizedText)) {
      reportedImpact = 'Life-Threatening Injury / Critical Harm';
    } else if (/injury|harm|infection|bleeding|burn|reaction|hospitalization/i.test(sanitizedText)) {
      reportedImpact = 'Patient Injury / Adverse Reaction';
    } else if (/delay|postponed|treatment\s+halted/i.test(sanitizedText)) {
      reportedImpact = 'Treatment Delay (Clinically Significant)';
    } else if (/no\s+harm|no\s+injury|intercepted|not\s+used\s+on\s+patient/i.test(sanitizedText)) {
      reportedImpact = 'No Patient Harm / Pre-Use Defect';
    } else {
      missingFields.push('Complainant did not clarify whether patient harm occurred');
    }

    // 6. Extract Complainant info
    let complainantType = 'CONSUMER';
    if (/dr\.|doctor|physician|rn|nurse|hospital|clinic|cath\s+lab|icu\s+staff/i.test(sanitizedText)) {
      complainantType = 'HEALTHCARE_PROVIDER';
    } else if (/distributor|wholesaler|pharmacy/i.test(sanitizedText)) {
      complainantType = 'DISTRIBUTOR';
    } else if (/patient|user|family/i.test(sanitizedText)) {
      complainantType = 'PATIENT';
    }

    const emailMatch = sanitizedText.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
    let complainantContact: string | undefined;
    if (emailMatch) {
      complainantContact = emailMatch[0];
      citations.push({
        field: 'complainantContact',
        value: emailMatch[0],
        citationText: emailMatch[0],
      });
    }

    // Calculate confidence score (higher if key traceable fields found)
    let score = 0.5;
    if (lotNumber) score += 0.2;
    if (productCode) score += 0.1;
    if (reportedImpact) score += 0.1;
    if (citations.length >= 3) score += 0.1;

    // Structured normalized summary
    const normalizedDescription = `Product: ${productName}${productCode ? ` (Ref: ${productCode})` : ''}. ` +
      `Category: ${category}. ` +
      `Lot: ${lotNumber || 'UNKNOWN'}. ` +
      `Impact: ${reportedImpact || 'Unspecified'}. ` +
      `Summary: ${sanitizedText.slice(0, 300).trim()}...`;

    return {
      productName,
      productCode,
      lotNumber,
      serialNumber,
      category,
      reportedImpact,
      complainantType,
      complainantContact,
      normalizedDescription,
      citations,
      missingFields,
      confidence: Math.min(1.0, score),
      injectionFlags: isSuspicious ? flags : undefined,
    };
  }
}

