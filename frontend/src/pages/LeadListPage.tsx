import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { api } from "../api/client";

const PRIORITY_COLORS: Record<string, string> = {
  high: "bg-red-100 text-red-800 border-red-200",
  medium: "bg-yellow-100 text-yellow-800 border-yellow-200",
  low: "bg-gray-100 text-gray-700 border-gray-200",
};

const STAGE_COLORS: Record<string, string> = {
  discovered: "bg-gray-100 text-gray-700",
  enriched: "bg-blue-100 text-blue-700",
  qualified: "bg-indigo-100 text-indigo-700",
  ready_for_outreach: "bg-purple-100 text-purple-700",
  contacted: "bg-yellow-100 text-yellow-700",
  replied: "bg-green-100 text-green-700",
  meeting_booked: "bg-emerald-100 text-emerald-700",
  opportunity_active: "bg-cyan-100 text-cyan-700",
  closed_won: "bg-green-100 text-green-800",
  closed_lost: "bg-red-100 text-red-700",
};

const STAGE_OPTIONS = [
  { value: "discovered", label: "Discovered" },
  { value: "enriched", label: "Enriched" },
  { value: "qualified", label: "Qualified" },
  { value: "ready_for_outreach", label: "Ready for Outreach" },
  { value: "contacted", label: "Contacted" },
  { value: "replied", label: "Replied" },
  { value: "meeting_booked", label: "Meeting Booked" },
  { value: "opportunity_active", label: "Opportunity Active" },
  { value: "closed_won", label: "Closed Won" },
  { value: "closed_lost", label: "Closed Lost" },
];

const SPORT_OPTIONS = [
  { value: "Football", label: "Football" },
  { value: "Rugby", label: "Rugby" },
  { value: "Cricket", label: "Cricket" },
  { value: "Tennis", label: "Tennis" },
  { value: "Athletics", label: "Athletics" },
];

const PRIORITY_OPTIONS = [
  { value: "high", label: "High" },
  { value: "medium", label: "Medium" },
  { value: "low", label: "Low" },
];

export default function LeadListPage() {
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [searchTerm, setSearchTerm] = useState("");

  const { data: leads, isLoading } = useQuery({
    queryKey: ["leads", filters],
    queryFn: () =>
      api.leads.list(
        Object.fromEntries(
          Object.entries(filters).filter(([, v]) => v)
        )
      ),
  });

  const filteredLeads = leads?.filter((lead) => {
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();
    return (
      lead.stadium.name.toLowerCase().includes(search) ||
      lead.stadium.club_name?.toLowerCase().includes(search) ||
      lead.stadium.city?.toLowerCase().includes(search) ||
      false
    );
  });

  const clearFilters = () => {
    setFilters({});
    setSearchTerm("");
  };

  const activeFilterCount = Object.values(filters).filter(Boolean).length + (searchTerm ? 1 : 0);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Leads</h1>
        <div className="text-sm text-gray-500">
          {filteredLeads?.length ?? 0} of {leads?.length ?? 0} leads
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border p-4">
        <div className="flex flex-wrap gap-3 items-end">
          {/* Search */}
          <div className="flex-1 min-w-[200px]">
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Search
            </label>
            <input
              type="text"
              placeholder="Search stadiums, clubs, cities..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* Sport Filter */}
          <FilterSelect
            label="Sport"
            value={filters.sport}
            onChange={(v) => setFilters({ ...filters, sport: v })}
            options={SPORT_OPTIONS}
          />

          {/* Stage Filter */}
          <FilterSelect
            label="Stage"
            value={filters.stage}
            onChange={(v) => setFilters({ ...filters, stage: v })}
            options={STAGE_OPTIONS}
          />

          {/* Priority Filter */}
          <FilterSelect
            label="Priority"
            value={filters.priority}
            onChange={(v) => setFilters({ ...filters, priority: v })}
            options={PRIORITY_OPTIONS}
          />

          {/* Clear Filters */}
          {activeFilterCount > 0 && (
            <button
              onClick={clearFilters}
              className="px-3 py-2 text-sm text-gray-600 hover:text-gray-900 underline"
            >
              Clear {activeFilterCount} filter{activeFilterCount !== 1 ? "s" : ""}
            </button>
          )}
        </div>
      </div>

      {/* Leads Table */}
      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : (
          <>
            <table className="w-full">
              <thead className="bg-gray-50 text-left">
                <tr>
                  <th className="px-4 py-3 text-xs font-semibold text-gray-600 uppercase">
                    Stadium
                  </th>
                  <th className="px-4 py-3 text-xs font-semibold text-gray-600 uppercase">
                    Club
                  </th>
                  <th className="px-4 py-3 text-xs font-semibold text-gray-600 uppercase">
                    Location
                  </th>
                  <th className="px-4 py-3 text-xs font-semibold text-gray-600 uppercase text-right">
                    Capacity
                  </th>
                  <th className="px-4 py-3 text-xs font-semibold text-gray-600 uppercase">
                    Stage
                  </th>
                  <th className="px-4 py-3 text-xs font-semibold text-gray-600 uppercase">
                    Priority
                  </th>
                  <th className="px-4 py-3 text-xs font-semibold text-gray-600 uppercase text-right">
                    Score
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredLeads?.map((lead) => (
                  <tr
                    key={lead.id}
                    className="hover:bg-gray-50 transition group"
                  >
                    <td className="px-4 py-3">
                      <Link
                        to={`/leads/${lead.id}`}
                        className="font-medium text-gray-900 hover:text-blue-600 transition"
                      >
                        {lead.stadium.name}
                      </Link>
                      {lead.stadium.website && (
                        <a
                          href={lead.stadium.website}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="ml-2 text-gray-400 hover:text-gray-600 text-xs"
                        >
                          ↗
                        </a>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {lead.stadium.club_name ?? "-"}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {lead.stadium.city ? (
                        <>
                          {lead.stadium.city}
                          <span className="text-gray-400">, {lead.stadium.country}</span>
                        </>
                      ) : (
                        lead.stadium.country
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600 text-right">
                      {lead.stadium.capacity?.toLocaleString() ?? "-"}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex px-2 py-1 rounded-full text-xs font-medium capitalize ${
                          STAGE_COLORS[lead.stage] ?? "bg-gray-100 text-gray-700"
                        }`}
                      >
                        {lead.stage.replace(/_/g, " ")}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {lead.priority ? (
                        <span
                          className={`inline-flex px-2 py-1 rounded-full text-xs font-medium capitalize border ${
                            PRIORITY_COLORS[lead.priority] ?? "bg-gray-100 text-gray-700"
                          }`}
                        >
                          {lead.priority}
                        </span>
                      ) : (
                        <span className="text-gray-400 text-sm">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span
                        className={`font-semibold ${
                          lead.score && lead.score >= 80
                            ? "text-green-600"
                            : lead.score && lead.score >= 60
                            ? "text-yellow-600"
                            : lead.score
                            ? "text-gray-600"
                            : "text-gray-400"
                        }`}
                      >
                        {lead.score?.toFixed(1) ?? "-"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {filteredLeads?.length === 0 && (
              <div className="text-center py-12">
                <div className="text-4xl mb-3">🔍</div>
                <p className="text-gray-500">No leads found</p>
                {activeFilterCount > 0 && (
                  <button
                    onClick={clearFilters}
                    className="mt-2 text-blue-600 hover:underline text-sm"
                  >
                    Clear filters to see all leads
                  </button>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function FilterSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value?: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <div className="min-w-[140px]">
      <label className="block text-xs font-medium text-gray-700 mb-1">
        {label}
      </label>
      <select
        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value)}
      >
        <option value="">All {label}s</option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}
