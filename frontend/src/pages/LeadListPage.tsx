import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { api } from "../api/client";

const PRIORITY_COLORS: Record<string, string> = {
  high: "bg-red-100 text-red-800",
  medium: "bg-yellow-100 text-yellow-800",
  low: "bg-gray-100 text-gray-800",
};

export default function LeadListPage() {
  const [filters, setFilters] = useState<Record<string, string>>({});
  const { data: leads, isLoading } = useQuery({
    queryKey: ["leads", filters],
    queryFn: () => api.leads.list(Object.fromEntries(Object.entries(filters).filter(([, v]) => v))),
  });

  if (isLoading) return <p className="text-gray-500">Loading...</p>;

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">Leads</h1>

      <div className="flex gap-3 mb-4 flex-wrap">
        <FilterSelect label="Sport" value={filters.sport} onChange={(v) => setFilters({ ...filters, sport: v })} options={["Football", "Rugby", "Cricket"]} />
        <FilterSelect label="Stage" value={filters.stage} onChange={(v) => setFilters({ ...filters, stage: v })} options={["discovered", "enriched", "qualified", "ready_for_outreach", "contacted", "replied"]} />
        <FilterSelect label="Priority" value={filters.priority} onChange={(v) => setFilters({ ...filters, priority: v })} options={["high", "medium", "low"]} />
      </div>

      <div className="bg-white rounded shadow overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left text-xs text-gray-500 uppercase">
            <tr>
              <th className="px-4 py-3">Stadium</th>
              <th className="px-4 py-3">Club</th>
              <th className="px-4 py-3">City</th>
              <th className="px-4 py-3">Capacity</th>
              <th className="px-4 py-3">Stage</th>
              <th className="px-4 py-3">Priority</th>
              <th className="px-4 py-3">Score</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {leads?.map((lead) => (
              <tr key={lead.id} className="hover:bg-gray-50">
                <td className="px-4 py-3">
                  <Link to={`/leads/${lead.id}`} className="text-blue-600 hover:underline">
                    {lead.stadium.name}
                  </Link>
                </td>
                <td className="px-4 py-3">{lead.stadium.club_name ?? "-"}</td>
                <td className="px-4 py-3">{lead.stadium.city ?? "-"}</td>
                <td className="px-4 py-3">{lead.stadium.capacity?.toLocaleString() ?? "-"}</td>
                <td className="px-4 py-3 capitalize">{lead.stage.replace(/_/g, " ")}</td>
                <td className="px-4 py-3">
                  {lead.priority && (
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${PRIORITY_COLORS[lead.priority] ?? ""}`}>
                      {lead.priority}
                    </span>
                  )}
                </td>
                <td className="px-4 py-3">{lead.score?.toFixed(1) ?? "-"}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {leads?.length === 0 && <p className="text-gray-400 text-center py-8">No leads found</p>}
      </div>
    </div>
  );
}

function FilterSelect({ label, value, onChange, options }: {
  label: string; value?: string; onChange: (v: string) => void; options: string[];
}) {
  return (
    <select
      className="border rounded px-3 py-1.5 text-sm"
      value={value ?? ""}
      onChange={(e) => onChange(e.target.value)}
    >
      <option value="">All {label}</option>
      {options.map((o) => <option key={o} value={o}>{o}</option>)}
    </select>
  );
}
