import AuditDashboard from "../components/AuditDashboard";

export default function Home() {
  return (
    <main className="min-h-screen bg-slate-50 flex flex-col items-center justify-start py-12 px-4">
      {/* Container for the dashboard */}
      <div className="w-full max-w-5xl">
        <AuditDashboard />
      </div>
    </main>
  );
}
