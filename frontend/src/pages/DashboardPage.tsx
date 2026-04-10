import { useQuery } from "@tanstack/react-query";
import { api } from "../api/client";
import { Link } from "react-router-dom";

const STAGE_COLORS: Record<string, string> = {
  discovered: "bg-gray-400",
  enriched: "bg-blue-400",
  qualified: "bg-indigo-400",
  ready_for_outreach: "bg-purple-400",
  contacted: "bg-yellow-400",
  replied: "bg-green-400",
  meeting_booked: "bg-emerald-500",
  opportunity_active: "bg-cyan-500",
  closed_won: "bg-green-600",
  closed_lost: "bg-red-400",
};

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

  if (isLoading || !data) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const totalPipeline = data.pipeline.reduce((sum, s) => sum + s.count, 0);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <Link
          to="/leads"
          className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition"
        >
          View All Leads
        </Link>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          label="Total Leads"
          value={data.total_leads}
          trend="+12%"
          trendUp={true}
          icon="🏟️"
        />
        <StatCard
          label="Pending Approval"
          value={data.outreach_pending}
          trend="Needs review"
          trendUp={data.outreach_pending === 0}
          icon="📧"
          highlight={data.outreach_pending > 0}
        />
        <StatCard
          label="Outreach Sent"
          value={data.outreach_sent}
          trend="Active"
          trendUp={true}
          icon="📤"
        />
        <StatCard
          label="Reply Rate"
          value={`${data.reply_rate.toFixed(1)}%`}
          trend={data.reply_rate > 20 ? "Good" : data.reply_rate > 10 ? "Fair" : "Low"}
          trendUp={data.reply_rate > 20}
          icon="💬"
        />
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Pipeline Visualization */}
        <div className="bg-white rounded-xl shadow-sm border p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Pipeline</h2>
          <div className="space-y-3">
            {data.pipeline.map((s) => {
              const percentage = totalPipeline > 0 ? (s.count / totalPipeline) * 100 : 0;
              return (
                <div key={s.stage} className="flex items-center gap-3">
                  <div className="w-24 text-sm text-gray-600">
                    {STAGE_LABELS[s.stage] ?? s.stage}
                  </div>
                  <div className="flex-1 bg-gray-100 rounded-full h-6 overflow-hidden">
                    <div
                      className={`h-full ${STAGE_COLORS[s.stage] ?? "bg-gray-400"} transition-all duration-500`}
                      style={{ width: `${Math.max(percentage, 5)}%` }}
                    />
                  </div>
                  <div className="w-10 text-right text-sm font-medium text-gray-900">
                    {s.count}
                  </div>
                </div>
              );
            })}
          </div>
          {data.pipeline.length === 0 && (
            <p className="text-gray-400 text-center py-8">No leads in pipeline yet</p>
          )}
        </div>

        {/* Priority Breakdown */}
        <div className="bg-white rounded-xl shadow-sm border p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Priority Breakdown</h2>
          <div className="space-y-4">
            {Object.entries(data.leads_by_priority).map(([priority, count]) => (
              <div key={priority} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className={`w-3 h-3 rounded-full ${
                      priority === "high"
                        ? "bg-red-500"
                        : priority === "medium"
                        ? "bg-yellow-500"
                        : "bg-gray-400"
                    }`}
                  />
                  <span className="text-sm text-gray-700 capitalize">{priority} Priority</span>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-2xl font-bold text-gray-900">{count}</div>
                  <div
                    className={`px-2 py-1 rounded text-xs font-medium ${
                      priority === "high"
                        ? "bg-red-100 text-red-800"
                        : priority === "medium"
                        ? "bg-yellow-100 text-yellow-800"
                        : "bg-gray-100 text-gray-800"
                    }`}
                  >
                    {Math.round((count / data.total_leads) * 100)}%
                  </div>
                </div>
              </div>
            ))}
            {Object.keys(data.leads_by_priority).length === 0 && (
              <p className="text-gray-400 text-center py-8">No prioritized leads yet</p>
            )}
          </div>

          {/* Quick Actions */}
          <div className="mt-6 pt-6 border-t">
            <h3 className="text-sm font-medium text-gray-700 mb-3">Quick Actions</h3>
            <div className="grid grid-cols-2 gap-3">
              <Link
                to="/leads?priority=high"
                className="text-center px-4 py-2 bg-red-50 text-red-700 rounded-lg text-sm font-medium hover:bg-red-100 transition"
              >
                High Priority
              </Link>
              <Link
                to="/outreach"
                className="text-center px-4 py-2 bg-blue-50 text-blue-700 rounded-lg text-sm font-medium hover:bg-blue-100 transition"
              >
                Review Queue ({data.outreach_pending})
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  trend,
  trendUp,
  icon,
  highlight = false,
}: {
  label: string;
  value: string | number;
  trend: string;
  trendUp: boolean;
  icon: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={`bg-white rounded-xl shadow-sm border p-4 ${
        highlight ? "border-orange-300 ring-2 ring-orange-100" : ""
      }`}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-gray-500">{label}</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
        </div>
        <span className="text-2xl">{icon}</span>
      </div>
      <div className="mt-2 flex items-center gap-1">
        <span className={`text-xs ${trendUp ? "text-green-600" : "text-amber-600"}`}>
          {trend}
        </span>
      </div>
    </div>
  );
}
