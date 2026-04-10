import { useParams, Link } from "react-router-dom";
import {
  useQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import { api } from "../api/client";
import { useState } from "react";

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

const PRIORITY_OPTIONS = [
  { value: "", label: "Not Set" },
  { value: "high", label: "High" },
  { value: "medium", label: "Medium" },
  { value: "low", label: "Low" },
];

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

const CONFIDENCE_COLORS: Record<string, string> = {
  high: "bg-green-100 text-green-800",
  medium: "bg-yellow-100 text-yellow-800",
  low: "bg-red-100 text-red-800",
};

export default function LeadDetailPage() {
  const { id } = useParams();
  const qc = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);
  const [notes, setNotes] = useState("");

  const { data: lead, isLoading } = useQuery({
    queryKey: ["lead", id],
    queryFn: () => api.leads.get(Number(id)),
  });

  const { data: drafts } = useQuery({
    queryKey: ["drafts", id],
    queryFn: () => api.outreach.list({ lead_id: id! }),
    enabled: !!id,
  });

  const updateMutation = useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      api.leads.update(Number(id), data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["lead", id] });
      qc.invalidateQueries({ queryKey: ["leads"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      setIsEditing(false);
    },
  });

  if (isLoading || !lead) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const handleSaveNotes = () => {
    updateMutation.mutate({ notes });
  };

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm">
        <Link to="/leads" className="text-gray-500 hover:text-gray-700">
          ← Back to Leads
        </Link>
      </div>

      {/* Header Card */}
      <div className="bg-white rounded-xl shadow-sm border p-6">
        <div className="flex justify-between items-start mb-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-2xl font-bold text-gray-900">
                {lead.stadium.name}
              </h1>
              <span
                className={`px-3 py-1 rounded-full text-xs font-medium capitalize ${
                  STAGE_COLORS[lead.stage] ?? "bg-gray-100"
                }`}
              >
                {lead.stage.replace(/_/g, " ")}
              </span>
            </div>
            <p className="text-gray-500">
              {lead.stadium.club_name && <span>{lead.stadium.club_name} • </span>}
              {lead.stadium.city && <span>{lead.stadium.city}, </span>}
              {lead.stadium.country}
              {lead.stadium.capacity && (
                <span> • {lead.stadium.capacity.toLocaleString()} capacity</span>
              )}
            </p>
          </div>
          <div className="text-right">
            <div className="text-3xl font-bold text-gray-900">
              {lead.score?.toFixed(1) ?? "-"}
            </div>
            <div className="text-xs text-gray-500 uppercase tracking-wide">
              Lead Score
            </div>
          </div>
        </div>

        {/* Quick Info Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 py-4 border-y border-gray-100">
          <InfoItem label="Sport" value={lead.stadium.sport} />
          <InfoItem label="League" value={lead.stadium.league} />
          <InfoItem label="Priority" value={lead.priority ?? "Not set"} />
          <InfoItem label="Owner" value={lead.owner ?? "Unassigned"} />
        </div>

        {/* Links */}
        <div className="flex gap-4 pt-4">
          {lead.stadium.website && (
            <a
              href={lead.stadium.website}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:text-blue-800 text-sm flex items-center gap-1"
            >
              Club Website →
            </a>
          )}
          {lead.stadium.hospitality_url && (
            <a
              href={lead.stadium.hospitality_url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:text-blue-800 text-sm flex items-center gap-1"
            >
              Hospitality →
            </a>
          )}
          {lead.stadium.sustainability_url && (
            <a
              href={lead.stadium.sustainability_url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:text-blue-800 text-sm flex items-center gap-1"
            >
              Sustainability →
            </a>
          )}
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Lead Management */}
        <div className="bg-white rounded-xl shadow-sm border p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Lead Management
          </h2>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Pipeline Stage
              </label>
              <select
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-blue-500"
                value={lead.stage}
                onChange={(e) =>
                  updateMutation.mutate({ stage: e.target.value })
                }
              >
                {STAGE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Priority
              </label>
              <select
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-blue-500"
                value={lead.priority ?? ""}
                onChange={(e) =>
                  updateMutation.mutate({
                    priority: e.target.value || null,
                  })
                }
              >
                {PRIORITY_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Owner
              </label>
              <input
                type="text"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500"
                placeholder="Assign to..."
                defaultValue={lead.owner ?? ""}
                onBlur={(e) =>
                  updateMutation.mutate({
                    owner: e.target.value || null,
                  })
                }
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Tags
              </label>
              <input
                type="text"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500"
                placeholder="Comma separated tags..."
                defaultValue={lead.tags ?? ""}
                onBlur={(e) =>
                  updateMutation.mutate({
                    tags: e.target.value || null,
                  })
                }
              />
            </div>
          </div>
        </div>

        {/* Notes */}
        <div className="bg-white rounded-xl shadow-sm border p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Notes</h2>
          <textarea
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 min-h-[200px]"
            placeholder="Add notes about this lead..."
            defaultValue={lead.notes ?? ""}
            onChange={(e) => setNotes(e.target.value)}
          />
          <div className="flex justify-end gap-2 mt-3">
            {notes !== (lead.notes ?? "") && (
              <>
                <button
                  onClick={() => setNotes(lead.notes ?? "")}
                  className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-800"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveNotes}
                  disabled={updateMutation.isPending}
                  className="px-4 py-1.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
                >
                  {updateMutation.isPending ? "Saving..." : "Save Notes"}
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Contacts */}
      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        <div className="px-6 py-4 border-b">
          <h2 className="text-lg font-semibold text-gray-900">
            Contacts ({lead.contacts.length})
          </h2>
        </div>
        {lead.contacts.length > 0 ? (
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                  Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                  Title
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                  Email
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                  Phone
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                  Confidence
                </th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {lead.contacts.map((contact) => (
                <tr key={contact.id} className="hover:bg-gray-50">
                  <td className="px-6 py-3 text-sm font-medium text-gray-900">
                    {contact.name ?? "Unknown"}
                    {contact.linkedin_url && (
                      <a
                        href={contact.linkedin_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="ml-2 text-blue-600 hover:text-blue-800 text-xs"
                      >
                        in
                      </a>
                    )}
                  </td>
                  <td className="px-6 py-3 text-sm text-gray-600">
                    {contact.title ?? "-"}
                  </td>
                  <td className="px-6 py-3 text-sm text-gray-600">
                    {contact.email ? (
                      <a
                        href={`mailto:${contact.email}`}
                        className="text-blue-600 hover:underline"
                      >
                        {contact.email}
                      </a>
                    ) : (
                      "-"
                    )}
                  </td>
                  <td className="px-6 py-3 text-sm text-gray-600">
                    {contact.phone ?? "-"}
                  </td>
                  <td className="px-6 py-3">
                    <span
                      className={`inline-flex px-2 py-1 rounded-full text-xs font-medium capitalize ${
                        CONFIDENCE_COLORS[contact.confidence] ??
                        "bg-gray-100 text-gray-700"
                      }`}
                    >
                      {contact.confidence}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="p-8 text-center text-gray-400">
            No contacts found for this lead
          </div>
        )}
      </div>

      {/* Outreach Drafts */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Outreach Drafts ({drafts?.length ?? 0})
        </h2>
        <div className="space-y-4">
          {drafts?.map((draft) => (
            <div
              key={draft.id}
              className="bg-white rounded-xl shadow-sm border p-5"
            >
              <div className="flex justify-between items-start mb-3">
                <div className="flex items-center gap-3">
                  <span className="font-medium capitalize text-gray-900">
                    {draft.outreach_type.replace(/_/g, " ")}
                  </span>
                  <span
                    className={`px-2 py-1 rounded-full text-xs font-medium ${
                      draft.approval_status === "approved"
                        ? "bg-green-100 text-green-800"
                        : draft.approval_status === "rejected"
                        ? "bg-red-100 text-red-800"
                        : draft.approval_status === "sent"
                        ? "bg-blue-100 text-blue-800"
                        : "bg-yellow-100 text-yellow-800"
                    }`}
                  >
                    {draft.approval_status}
                  </span>
                </div>
                <span className="text-xs text-gray-400">
                  {new Date(draft.created_at).toLocaleDateString()}
                </span>
              </div>

              {draft.recipient_email && (
                <div className="text-sm text-gray-500 mb-2">
                  To: {draft.recipient_email}
                </div>
              )}

              {draft.subject && (
                <div className="bg-gray-50 px-3 py-2 rounded text-sm text-gray-700 mb-3">
                  <strong>Subject:</strong> {draft.subject}
                </div>
              )}

              <div className="border rounded-lg p-3 bg-gray-50">
                <pre className="text-sm text-gray-700 whitespace-pre-wrap font-sans">
                  {draft.body}
                </pre>
              </div>

              {draft.approved_by && (
                <div className="text-xs text-gray-500 mt-2">
                  {draft.approval_status === "approved" ? "Approved" : "Rejected"} by{" "}
                  {draft.approved_by}
                </div>
              )}
            </div>
          ))}

          {(!drafts || drafts.length === 0) && (
            <div className="text-center py-8 bg-gray-50 rounded-xl border border-dashed">
              <p className="text-gray-400">No outreach drafts created yet</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function InfoItem({ label, value }: { label: string; value?: string | null }) {
  return (
    <div>
      <div className="text-xs text-gray-500 uppercase tracking-wide">{label}</div>
      <div className="text-sm font-medium text-gray-900">
        {value ?? <span className="text-gray-400 italic">Not set</span>}
      </div>
    </div>
  );
}
