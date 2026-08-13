'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  FileText,
  Sparkles,
  UploadCloud,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  ShieldAlert,
  HelpCircle,
  FileSpreadsheet,
} from 'lucide-react';

export default function NewComplaintIntakePage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'structured' | 'unstructured' | 'csv'>('unstructured');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Tab 1: Structured Form State
  const [formData, setFormData] = useState({
    productName: '',
    productCode: '',
    lotNumber: '',
    serialNumber: '',
    category: 'Product Defect',
    reportedImpact: 'No Patient Harm / Pre-Use Defect',
    complainantName: '',
    complainantContact: '',
    complainantType: 'HEALTHCARE_PROVIDER',
    externalReference: '',
    originalDescription: '',
  });

  // Tab 2: Unstructured Text Intake State
  const [rawText, setRawText] = useState(
    `Received urgent email from St. Luke's Hospital ICU (Reporter: Dr. Anita Patel, apatel@stlukeshealth.org). During acute patient ventilation on AirPulse V-400 Ventilator (Ref: AP-V400, Serial: SN-VENT-8819), the inspiratory flow valve seized, causing sudden peak inspiratory pressure alarm (PIP > 65 cmH2O). The respiratory therapist immediately transitioned patient to manual bag valve ventilation. Patient suffered transient oxygen desaturation to 82% before stabilization. Biomed Dept quarantined device and packaging Lot BATCH-VENT-901.`
  );
  const [extractionPreview, setExtractionPreview] = useState<any>(null);
  const [extracting, setExtracting] = useState(false);

  // Tab 3: CSV Batch Intake State
  const [csvText, setCsvText] = useState(
    `product,lot,serial,category,complainant,contact,description\nOptiFlow FX Hemodialyzer,LOT-4411,,Packaging & Sterile Barrier Defect,Nurse Jack,jack@dialysis.org,Pouch sterile seal had a 2mm micro-tear at header.\nAccuRate Plus Infusion Pump 3000,LOT-2026A,SN-8812,Software / Firmware Malfunction,BioMed Dept,biomed@memorial.org,Error code 0x44B displayed on power-on self-test.`
  );
  const [csvPreviewRows, setCsvPreviewRows] = useState<any[]>([]);

  // Run AI / Rule Extraction Preview on Unstructured Text
  const handleRunExtraction = async () => {
    if (!rawText || rawText.trim().length < 5) return;
    setExtracting(true);
    setError(null);
    try {
      const res = await fetch('/api/v1/ai/assist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          task: 'EXTRACTION',
          inputData: { text: rawText },
        }),
      });
      const data = await res.json();
      if (data.data) {
        setExtractionPreview(data.data);
      } else {
        setError(data.error || 'Extraction failed');
      }
    } catch (err: any) {
      setError(err.message || 'Extraction failed');
    } finally {
      setExtracting(false);
    }
  };

  // Submit Structured Complaint
  const handleStructuredSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch('/api/v1/complaints', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to submit complaint');

      router.push(`/complaints/${data.complaint.id}`);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  // Submit Unstructured Intake
  const handleUnstructuredSubmit = async () => {
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch('/api/v1/intake', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rawText }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Intake failed');

      if (data.complaints && data.complaints.length > 0) {
        router.push(`/complaints/${data.complaints[0].id}`);
      } else {
        router.push('/complaints');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  // Submit CSV Batch Intake
  const handleCsvSubmit = async () => {
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch('/api/v1/intake', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ csvData: csvText }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Batch import failed');

      router.push('/complaints');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
        <div>
          <h1 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-brand-600" />
            Complaint Intake Gateway
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Preserves original source records and performs evidence-grounded extraction
          </p>
        </div>

        <Link
          href="/complaints"
          className="text-xs font-medium text-slate-600 hover:text-slate-900"
        >
          Cancel & Return
        </Link>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-start gap-2.5">
          <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
          <div>
            <span className="font-bold">Intake Error: </span>
            {error}
          </div>
        </div>
      )}

      {/* Intake Method Tabs */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="flex border-b border-slate-200 bg-slate-50/70 p-1.5 gap-1.5">
          <button
            onClick={() => setActiveTab('unstructured')}
            className={`flex-1 py-2 text-xs font-semibold rounded-lg flex items-center justify-center gap-2 transition-all ${
              activeTab === 'unstructured'
                ? 'bg-white text-brand-700 shadow-xs border border-slate-200'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Sparkles className="w-4 h-4 text-brand-600" />
            Clinical Email / Unstructured Text Intake
          </button>

          <button
            onClick={() => setActiveTab('structured')}
            className={`flex-1 py-2 text-xs font-semibold rounded-lg flex items-center justify-center gap-2 transition-all ${
              activeTab === 'structured'
                ? 'bg-white text-brand-700 shadow-xs border border-slate-200'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <FileText className="w-4 h-4 text-slate-500" />
            Structured Manual Form
          </button>

          <button
            onClick={() => setActiveTab('csv')}
            className={`flex-1 py-2 text-xs font-semibold rounded-lg flex items-center justify-center gap-2 transition-all ${
              activeTab === 'csv'
                ? 'bg-white text-brand-700 shadow-xs border border-slate-200'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            Batch CSV Import
          </button>
        </div>

        {/* Tab 1: Unstructured Text / Clinical Email */}
        {activeTab === 'unstructured' && (
          <div className="p-6 space-y-5">
            <div>
              <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1.5">
                Paste Original Source Narrative (Email, Report, Call Transcript)
              </label>
              <p className="text-[11px] text-slate-500 mb-2">
                The full narrative will be permanently preserved as an immutable source record with a cryptographic SHA-256 hash.
              </p>
              <textarea
                rows={7}
                value={rawText}
                onChange={(e) => setRawText(e.target.value)}
                className="w-full text-xs p-3 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 font-mono"
                placeholder="Paste customer email or unstructured complaint narrative here..."
              />
            </div>

            <div className="flex items-center justify-between pt-2">
              <button
                type="button"
                onClick={handleRunExtraction}
                disabled={extracting}
                className="px-3.5 py-2 text-xs font-semibold rounded-lg border border-brand-300 bg-brand-50 hover:bg-brand-100 text-brand-800 flex items-center gap-1.5 shadow-2xs transition-colors"
              >
                <Sparkles className="w-3.5 h-3.5" />
                {extracting ? 'Analyzing Narrative...' : 'Preview Extraction & Citations'}
              </button>

              <button
                type="button"
                onClick={handleUnstructuredSubmit}
                disabled={submitting}
                className="px-5 py-2 text-xs font-bold rounded-lg bg-brand-600 hover:bg-brand-700 text-white flex items-center gap-2 shadow-xs transition-colors disabled:opacity-50"
              >
                {submitting ? 'Creating Case...' : 'Commit Complaint Record'}
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>

            {/* Live Extraction Preview Panel */}
            {extractionPreview && (
              <div className="mt-4 p-4 rounded-xl border border-brand-200 bg-brand-50/30 space-y-3">
                <div className="flex items-center justify-between border-b border-brand-100 pb-2">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-brand-600" />
                    <span className="text-xs font-bold text-slate-900">
                      Extraction Preview (Advisory Analysis)
                    </span>
                  </div>
                  <span className="text-[10px] font-semibold text-brand-800 bg-brand-100 px-2 py-0.5 rounded border border-brand-200">
                    Confidence: {(extractionPreview.confidence * 100).toFixed(0)}%
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                  <div>
                    <span className="text-[10px] text-slate-500 block uppercase font-medium">Product</span>
                    <span className="font-semibold text-slate-800">{extractionPreview.productName}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 block uppercase font-medium">Batch / Lot</span>
                    <span className="font-mono font-bold text-slate-800">{extractionPreview.lotNumber || 'Not specified'}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 block uppercase font-medium">Serial Number</span>
                    <span className="font-mono font-bold text-slate-800">{extractionPreview.serialNumber || 'None'}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 block uppercase font-medium">Category</span>
                    <span className="font-medium text-slate-800">{extractionPreview.category}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 block uppercase font-medium">Reported Impact</span>
                    <span className="font-medium text-slate-800">{extractionPreview.reportedImpact || 'Unspecified'}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 block uppercase font-medium">Complainant</span>
                    <span className="font-medium text-slate-800">{extractionPreview.complainantContact || 'Email parsed'}</span>
                  </div>
                </div>

                {/* Text Citations */}
                {extractionPreview.citations && extractionPreview.citations.length > 0 && (
                  <div className="pt-2 border-t border-brand-100/60">
                    <span className="text-[10px] font-bold text-slate-600 uppercase tracking-wider block mb-1">
                      Evidence Citations Grounded in Source Text:
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {extractionPreview.citations.map((c: any, idx: number) => (
                        <span
                          key={idx}
                          className="text-[10px] bg-white border border-slate-200 text-slate-700 px-2 py-0.5 rounded font-mono"
                        >
                          {c.field}: &ldquo;{c.citationText}&rdquo;
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Missing Fields Warnings */}
                {extractionPreview.missingFields && extractionPreview.missingFields.length > 0 && (
                  <div className="pt-2 border-t border-brand-100/60">
                    <span className="text-[10px] font-bold text-amber-700 uppercase tracking-wider block mb-1 flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3 text-amber-600" />
                      Detected Missing Information:
                    </span>
                    <ul className="list-disc pl-4 text-[11px] text-slate-600 space-y-0.5">
                      {extractionPreview.missingFields.map((m: string, idx: number) => (
                        <li key={idx}>{m}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Structured Form */}
        {activeTab === 'structured' && (
          <form onSubmit={handleStructuredSubmit} className="p-6 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Product / Device Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. AccuRate Plus Infusion Pump 3000"
                  value={formData.productName}
                  onChange={(e) => setFormData({ ...formData, productName: e.target.value })}
                  className="w-full text-xs p-2.5 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Product Catalog / REF Number
                </label>
                <input
                  type="text"
                  placeholder="e.g. REF-IP3000"
                  value={formData.productCode}
                  onChange={(e) => setFormData({ ...formData, productCode: e.target.value })}
                  className="w-full text-xs p-2.5 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Lot / Batch Number
                </label>
                <input
                  type="text"
                  placeholder="e.g. LOT-2026A"
                  value={formData.lotNumber}
                  onChange={(e) => setFormData({ ...formData, lotNumber: e.target.value })}
                  className="w-full text-xs p-2.5 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Serial Number (if serialized)
                </label>
                <input
                  type="text"
                  placeholder="e.g. SN-90412"
                  value={formData.serialNumber}
                  onChange={(e) => setFormData({ ...formData, serialNumber: e.target.value })}
                  className="w-full text-xs p-2.5 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Complaint Category
                </label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="w-full text-xs p-2.5 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
                >
                  <option value="Product Defect">Product Defect</option>
                  <option value="Packaging & Sterile Barrier Defect">Packaging & Sterile Barrier Defect</option>
                  <option value="Software / Firmware Malfunction">Software / Firmware Malfunction</option>
                  <option value="Particulate & Chemical Contamination">Particulate & Chemical Contamination</option>
                  <option value="Labeling & Instructions for Use">Labeling & Instructions for Use</option>
                  <option value="Adverse Event / Patient Safety">Adverse Event / Patient Safety</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Reported Clinical Impact
                </label>
                <select
                  value={formData.reportedImpact}
                  onChange={(e) => setFormData({ ...formData, reportedImpact: e.target.value })}
                  className="w-full text-xs p-2.5 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
                >
                  <option value="No Patient Harm / Pre-Use Defect">No Patient Harm / Pre-Use Defect</option>
                  <option value="Treatment Delay (Clinically Significant)">Treatment Delay (Clinically Significant)</option>
                  <option value="Patient Injury / Adverse Reaction">Patient Injury / Adverse Reaction</option>
                  <option value="Life-Threatening Injury / Critical Harm">Life-Threatening Injury / Critical Harm</option>
                  <option value="Death / Fatal Outcome">Death / Fatal Outcome</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Complainant / Reporter Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. Dr. Arthur Bell"
                  value={formData.complainantName}
                  onChange={(e) => setFormData({ ...formData, complainantName: e.target.value })}
                  className="w-full text-xs p-2.5 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Reporter Email / Contact
                </label>
                <input
                  type="email"
                  placeholder="e.g. abell@hospital.org"
                  value={formData.complainantContact}
                  onChange={(e) => setFormData({ ...formData, complainantContact: e.target.value })}
                  className="w-full text-xs p-2.5 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Full Original Narrative Description *
              </label>
              <textarea
                rows={5}
                required
                value={formData.originalDescription}
                onChange={(e) => setFormData({ ...formData, originalDescription: e.target.value })}
                className="w-full text-xs p-3 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
                placeholder="Detailed narrative as reported by customer or hospital staff..."
              />
            </div>

            <div className="flex justify-end pt-3">
              <button
                type="submit"
                disabled={submitting}
                className="px-5 py-2 text-xs font-bold rounded-lg bg-brand-600 hover:bg-brand-700 text-white flex items-center gap-2 shadow-xs transition-colors disabled:opacity-50"
              >
                {submitting ? 'Creating Record...' : 'Submit Complaint'}
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </form>
        )}

        {/* Tab 3: CSV Batch Import */}
        {activeTab === 'csv' && (
          <div className="p-6 space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1.5">
                Paste CSV Batch Lines (With Headers)
              </label>
              <p className="text-[11px] text-slate-500 mb-2">
                Supported columns: <code>product, lot, serial, category, complainant, contact, description</code>.
              </p>
              <textarea
                rows={8}
                value={csvText}
                onChange={(e) => setCsvText(e.target.value)}
                className="w-full text-xs p-3 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 font-mono"
              />
            </div>

            <div className="flex justify-end">
              <button
                type="button"
                onClick={handleCsvSubmit}
                disabled={submitting}
                className="px-5 py-2 text-xs font-bold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-2 shadow-xs transition-colors disabled:opacity-50"
              >
                {submitting ? 'Importing Batch...' : 'Import Batch Complaints'}
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

