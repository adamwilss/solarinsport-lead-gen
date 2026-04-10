import { useQuery } from "@tanstack/react-query";
import { api } from "../api/client";

const STAGE_LABELS: Record<string, string> = {
  discovered: "Discovered",
  enriched: "Enriched",
  qualified: "Qualified",
  ready_for_outreach: "Ready",
  contacted: "Contacted",
  replied: "Replied",
  meeting_booked: "Meeting",
  opportunity_active: "Active",
  closed_won: "Won",
  closed_lost: "Lost",
};

export default function DashboardPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["dashboard"],
    queryFn: api.dashboard.get,
  });

  if (isLoading || !data) return <p className="text-gray-500">Loading...</p>;

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Dashboard</h1>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <StatCard label="Total Leads" value={data.total_leads} />
        <StatCard label="Outreach Pending" value={data.outreach_pending} />
        <StatCard label="Outreach Sent" value={data.outreach_sent} />
        <StatCard label="Reply Rate" value={`${data.reply_rate.toFixed(1)}%`} />
      </div>

      <h2 className="text-lg font-semibold mb-3">Pipeline</h2>
      <div className="flex gap-2 mb-8 overflow-x-auto">
        {data.pipeline.map((s) => (
          <div key={s.stage} className="bg-white rounded shadow px-4 py-3 min-w-[100px] text-center">
            <div className="text-2xl font-bold">{s.count}</div>
            <div className="text-xs text-gray-500">{STAGE_LABELS[s.stage] ?? s.stage}</div>
          </div>
        ))}
      </div>

      <h2 className="text-lg font-semibold mb-3">By Priority</h2>
      <div className="flex gap-3">
        {Object.entries(data.leads_by_priority).map(([p, c]) => (
          <span key={p} className={`px-3 py-1 rounded text-sm font-medium ${
            p === "high" ? "bg-red-100 text-red-800" :
            p === "medium" ? "bg-yellow-100 text-yellow-800" :
            "bg-gray-100 text-gray-800"
          }`}>
            {p}: {c}
          </span>
        ))}
      </div>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="bg-white rounded shadow px-4 py-3">
      <div className="text-sm text-gray-500">{label}</div>
      <div className="text-2xl font-bold">{value}</div>
    </div>
  );
}
