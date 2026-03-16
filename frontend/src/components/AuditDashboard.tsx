"use client";

import { useState } from "react";
import {
  ClipboardCheck,
  AlertTriangle,
  Loader2,
  PackageSearch,
} from "lucide-react";

interface InventoryItem {
  part_name: string;
  stock_level: number;
  threshold: number;
  vendor_url: string;
}

interface AuditResult {
  inventory_status: InventoryItem[];
  agent_analysis: string;
  discrepancy_found: boolean;
}

function AgentAnalysis({
  text,
  onApprove,
  approved,
  approving,
  showApproveButtons = true,
}: {
  text: string;
  onApprove: (partName: string, quantity: number) => void;
  approved: Record<string, boolean>;
  approving: Record<string, boolean>;
  showApproveButtons?: boolean;
}) {
  const lines = text.split("\n").filter((l) => l.trim() !== "");

  return (
    <div className="space-y-1 text-sm">
      {lines.map((line, i) => {
        if (line.startsWith("### ")) {
          return (
            <p
              key={i}
              className="font-bold text-slate-800 mt-4 mb-1 first:mt-0"
            >
              {line.replace(/^### /, "")}
            </p>
          );
        }

        if (/^\d+\.\s/.test(line)) {
          const content = line
            .replace(/^\d+\.\s/, "")
            .replace(/\*\*(.*?)\*\*/g, "$1");
          const partName = content.replace(/:$/, "").trim();
          const qtyMatch = text.match(
            new RegExp(
              `${partName}[\\s\\S]*?\\*?\\*?Suggested Reorder Quantity:\\*?\\*?\\s*(\\d+)`,
              "i",
            ),
          );
          const quantity = qtyMatch ? parseInt(qtyMatch[1]) : 0;
          const isApproved = approved[partName];
          const isApproving = approving[partName];

          return (
            <div
              key={i}
              className="flex items-center justify-between ml-2 mt-2"
            >
              <div className="flex gap-2">
                <span className="font-bold text-slate-500 shrink-0">
                  {line.match(/^(\d+)/)?.[1]}.
                </span>
                <span className="font-semibold text-slate-700">{content}</span>
              </div>
              {showApproveButtons && (
                <button
                  onClick={() => onApprove(partName, quantity)}
                  disabled={isApproved || isApproving}
                  className={`text-xs px-3 py-1 rounded-full font-semibold transition-all duration-200 shrink-0 ml-2 ${
                    isApproved
                      ? "bg-green-100 text-green-600 border border-green-300 cursor-default"
                      : isApproving
                        ? "bg-slate-100 text-slate-400 border border-slate-200 cursor-wait"
                        : "bg-blue-50 text-blue-600 border border-blue-200 hover:bg-blue-100"
                  }`}
                >
                  {isApproved
                    ? "✓ Approved"
                    : isApproving
                      ? "Saving..."
                      : "Approve Order"}
                </button>
              )}
            </div>
          );
        }

        if (line.startsWith("- ") || line.startsWith("  - ")) {
          const indent = line.startsWith("  - ");
          const content = line.replace(/^\s*- /, "");
          const boldMatch = content.match(/^\*\*(.*?)\*\*:?\s*(.*)/);

          if (boldMatch) {
            return (
              <div
                key={i}
                className={`flex gap-2 ${indent ? "ml-8" : "ml-4"} py-0.5`}
              >
                <span className="text-slate-400 shrink-0">•</span>
                <span>
                  <span className="font-semibold text-slate-700">
                    {boldMatch[1]}:{" "}
                  </span>
                  <span className="text-slate-600">{boldMatch[2]}</span>
                </span>
              </div>
            );
          }

          return (
            <div
              key={i}
              className={`flex gap-2 ${indent ? "ml-8" : "ml-4"} py-0.5`}
            >
              <span className="text-slate-400 shrink-0">•</span>
              <span className="text-slate-600">{content}</span>
            </div>
          );
        }

        return (
          <p key={i} className="text-slate-600 ml-2 py-0.5 leading-relaxed">
            {line.replace(/\*\*(.*?)\*\*/g, "$1")}
          </p>
        );
      })}
    </div>
  );
}

function StockBar({ stock, threshold }: { stock: number; threshold: number }) {
  const pct = Math.min((stock / threshold) * 100, 100);
  const critical = pct === 0;
  const low = pct < 60;
  return (
    <div className="w-full bg-slate-200 rounded-full h-1.5 mt-1">
      <div
        className={`h-1.5 rounded-full transition-all duration-700 ${
          critical ? "bg-red-500" : low ? "bg-amber-400" : "bg-emerald-500"
        }`}
        style={{ width: `${Math.max(pct, critical ? 0 : 4)}%` }}
      />
    </div>
  );
}

export default function AuditDashboard() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AuditResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [approved, setApproved] = useState<Record<string, boolean>>({});
  const [approving, setApproving] = useState<Record<string, boolean>>({});
  const [shipmentFile, setShipmentFile] = useState<File | null>(null);
  const [shipmentLoading, setShipmentLoading] = useState(false);
  const [shipmentResult, setShipmentResult] = useState<{
    analysis: string;
    discrepancy_found: boolean;
  } | null>(null);

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

  const approveOrder = async (partName: string, quantity: number) => {
    setApproving((prev) => ({ ...prev, [partName]: true }));
    try {
      const response = await fetch(
        "https://jmawfalu63vtahkogyqrlii5ji0qsmvy.lambda-url.us-west-1.on.aws/approve-order",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ part_name: partName, quantity }),
        },
      );
      const text = await response.text();
      if (!response.ok) {
        setError(`Approval failed: ${text}`);
        return;
      }
      setApproved((prev) => ({ ...prev, [partName]: true }));
    } catch (err) {
      setError(`Approval failed: ${String(err)}`);
    } finally {
      setApproving((prev) => ({ ...prev, [partName]: false }));
    }
  };

  const verifyShipment = async () => {
    if (!shipmentFile) return;
    setShipmentLoading(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append("file", shipmentFile);

      const response = await fetch(
        "https://jmawfalu63vtahkogyqrlii5ji0qsmvy.lambda-url.us-west-1.on.aws/verify-shipment",
        {
          method: "POST",
          body: formData,
        },
      );

      const text = await response.text();
      if (!response.ok) {
        setError(`Verification failed: ${text}`);
        return;
      }

      const data = JSON.parse(text);
      setShipmentResult(data);
    } catch (err) {
      setError(`Verification failed: ${String(err)}`);
    } finally {
      setShipmentLoading(false);
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

      {/* Audit Results Section */}
      {result && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in fade-in slide-in-from-bottom-4">
          {/* Inventory Cards */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
            <h3 className="flex items-center gap-2 font-semibold text-slate-700 mb-4">
              <ClipboardCheck className="text-blue-500" /> Database Status
            </h3>
            <div className="space-y-3">
              {Array.isArray(result.inventory_status) &&
                result.inventory_status.map((item, i) => {
                  const critical = item.stock_level === 0;
                  const low = item.stock_level < item.threshold;
                  return (
                    <div
                      key={i}
                      className="border border-slate-100 rounded-lg p-3 bg-slate-50"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-slate-700 text-sm">
                          {item.part_name}
                        </span>
                        <span
                          className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                            critical
                              ? "bg-red-100 text-red-600"
                              : low
                                ? "bg-amber-100 text-amber-600"
                                : "bg-green-100 text-green-600"
                          }`}
                        >
                          {critical ? "Critical" : low ? "Low" : "OK"}
                        </span>
                      </div>
                      <StockBar
                        stock={item.stock_level}
                        threshold={item.threshold}
                      />
                      <div className="flex justify-between mt-1 text-xs text-slate-400">
                        <span>
                          Stock:{" "}
                          <span className="text-slate-600">
                            {item.stock_level}
                          </span>
                        </span>
                        <span>
                          Threshold:{" "}
                          <span className="text-slate-600">
                            {item.threshold}
                          </span>
                        </span>
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>

          {/* AI Analysis */}
          <div
            className={`p-6 rounded-xl shadow-sm border ${
              result.discrepancy_found
                ? "bg-red-50 border-red-200"
                : "bg-green-50 border-green-200"
            }`}
          >
            <h3 className="flex items-center gap-2 font-semibold text-slate-700 mb-4">
              {result.discrepancy_found ? (
                <AlertTriangle className="text-red-500" />
              ) : (
                <ClipboardCheck className="text-green-500" />
              )}
              AI Agent Reasoning
            </h3>
            <div className="overflow-y-auto max-h-80">
              <AgentAnalysis
                text={result.agent_analysis}
                onApprove={approveOrder}
                approved={approved}
                approving={approving}
                showApproveButtons={true}
              />
            </div>
          </div>
        </div>
      )}

      {/* Shipment Verification Section */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
        <h3 className="flex items-center gap-2 font-semibold text-slate-700 mb-4">
          <PackageSearch className="text-blue-500" /> Shipment Verification
        </h3>

        {/* Upload Area */}
        <div className="flex items-center gap-4 mb-4">
          <label className="flex-1 border-2 border-dashed border-slate-200 rounded-lg p-4 text-center cursor-pointer hover:border-blue-400 transition-colors">
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => setShipmentFile(e.target.files?.[0] || null)}
            />
            {shipmentFile ? (
              <span className="text-sm text-slate-700 font-medium">
                {shipmentFile.name}
              </span>
            ) : (
              <span className="text-sm text-slate-400">
                Click to upload shipment label image
              </span>
            )}
          </label>
          <button
            onClick={verifyShipment}
            disabled={!shipmentFile || shipmentLoading}
            className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-lg font-medium transition-all flex items-center gap-2 disabled:opacity-50"
          >
            {shipmentLoading ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <ClipboardCheck size={16} />
            )}
            {shipmentLoading ? "Verifying..." : "Verify"}
          </button>
        </div>

        {/* Shipment Result */}
        {shipmentResult && (
          <div
            className={`rounded-lg p-4 border ${
              shipmentResult.discrepancy_found
                ? "bg-red-50 border-red-200"
                : "bg-green-50 border-green-200"
            }`}
          >
            <div className="flex items-center gap-2 font-semibold text-slate-700 mb-3">
              {shipmentResult.discrepancy_found ? (
                <AlertTriangle size={16} className="text-red-500" />
              ) : (
                <ClipboardCheck size={16} className="text-green-500" />
              )}
              {shipmentResult.discrepancy_found
                ? "Discrepancy Detected"
                : "Shipment Verified"}
            </div>
            <AgentAnalysis
              text={shipmentResult.analysis}
              onApprove={approveOrder}
              approved={approved}
              approving={approving}
              showApproveButtons={false}
            />
          </div>
        )}
      </div>
    </div>
  );
}
