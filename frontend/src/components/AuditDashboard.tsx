"use client";

import { useState } from "react";
import {
  ClipboardCheck,
  AlertTriangle,
  Loader2,
  PackageSearch,
} from "lucide-react";

interface AuditResult {
  inventory_status: unknown;
  agent_analysis: string;
  discrepancy_found: boolean;
}

export default function AuditDashboard() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AuditResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const runAudit = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(
        "https://jmawfalu63vtahkogyqrlii5ji0qsmvy.lambda-url.us-west-1.on.aws/run-audit",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ check_type: "discrepancy" }),
        },
      );

      const text = await response.text();
      console.log("Raw response:", text);

      if (!response.ok) {
        setError(`Server error ${response.status}: ${text}`);
        return;
      }

      const data = JSON.parse(text);
      setResult(data);
    } catch (error) {
      console.error("Audit failed", error);
      setError(String(error));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      {/* Header Section */}
      <div className="flex justify-between items-center bg-white p-6 rounded-xl shadow-sm border border-slate-200">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">
            Inventory Auditor
          </h1>
          <p className="text-slate-500">Multimodal AI Verification System</p>
        </div>
        <button
          onClick={runAudit}
          disabled={loading}
          className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-medium transition-all flex items-center gap-2 disabled:opacity-50"
        >
          {loading ? (
            <Loader2 className="animate-spin" />
          ) : (
            <PackageSearch size={20} />
          )}
          {loading ? "Analyzing..." : "Run Audit"}
        </button>
      </div>

      {/* Error Section */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl text-sm">
          {error}
        </div>
      )}

      {/* Results Section */}
      {result && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in fade-in slide-in-from-bottom-4">
          {/* Inventory Table Summary */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
            <h3 className="flex items-center gap-2 font-semibold text-slate-700 mb-4">
              <ClipboardCheck className="text-blue-500" /> Database Status
            </h3>
            <pre className="text-xs bg-slate-50 p-4 rounded-lg overflow-auto max-h-48 text-slate-600">
              {JSON.stringify(result.inventory_status, null, 2)}
            </pre>
          </div>

          {/* AI Analysis Card */}
          <div
            className={`p-6 rounded-xl shadow-sm border ${result.discrepancy_found ? "bg-red-50 border-red-200" : "bg-green-50 border-green-200"}`}
          >
            <h3 className="flex items-center gap-2 font-semibold text-slate-700 mb-4">
              {result.discrepancy_found ? (
                <AlertTriangle className="text-red-500" />
              ) : (
                <ClipboardCheck className="text-green-500" />
              )}
              AI Agent Reasoning
            </h3>
            <p className="text-slate-700 text-sm leading-relaxed">
              {result.agent_analysis}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
