"use client"; //In Next.js, components are "Server Components by default. They have no interactivity. Use client tells Next.JS this component needs to handle clicks, manage state, and run in the user's browser"

/**
 * Flow
 * User Clicks Button -> Triggers runAudit
 * loading becomes true -> Button shows a spinner
 * Browser sends POST to lambda -> Python runs the Nova AI
 * Lambda sends JSON back -> setRestult(data) is called
 * React notices State Change -> The UI Automatically re-renders to show the Results Section
 */
import { useState } from "react";
import {
  ClipboardCheck,
  AlertTriangle,
  Loader2,
  PackageSearch,
} from "lucide-react";

interface AuditResult {
  inventory_status: unknown; // Or a more specific type if you know it
  agent_analysis: string;
  discrepancy_found: boolean;
}

export default function AuditDashboard() {
  const [loading, setLoading] = useState(false); // Show spinner so the user knows the AI is working and doesn't click Run Audit repeatedly
  const [result, setResult] = useState<AuditResult | null>(null); //Holds the data we get back from the python API. Starts as null and updates once the AI finishes

  const runAudit = async () => {
    //Ascrynchronous function that awaits the response from AWS lambda so the rest of the website doesn't freeze while waiting for the AI
    setLoading(true);
    try {
      const response = await fetch(
        "https://jmawfalu63vtahkogyqrlii5ji0qsmvy.lambda-url.us-west-1.on.aws/run-audit",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ check_type: "discrepancy" }),
        },
      );
      const data = await response.json();
      setResult(data);
    } catch (error) {
      console.error("Audit failed", error);
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

      {/* Results Section */}
      {result && ( // shortcut in React that says "If we have data, show the dashboard. If not then show nothing"
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
            //Template literal. Checks if discrepancy_found boolean from the python backend, is TRUE then apply red, is FALSE apply green tailwind classes
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
