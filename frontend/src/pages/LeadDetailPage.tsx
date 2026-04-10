import { useParams, Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../api/client";

export default function LeadDetailPage() {
  const { id } = useParams();
  const qc = useQueryClient();
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
    mutationFn: (data: Record<string, unknown>) => api.leads.update(Number(id), data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["lead", id] }),
  });

  if (isLoading || !lead) return <p className="text-gray-500">Loading...</p>;

  return (
    <div>
      <Link to="/leads" className="text-blue-600 text-sm hover:underline">&larr; Back to Leads</Link>

      <div className="mt-4 bg-white rounded shadow p-6">
        <h1 className="text-2xl font-bold">{lead.stadium.name}</h1>
        <p className="text-gray-500">{lead.stadium.club_name} &middot; {lead.stadium.city} &middot; {lead.stadium.capacity?.toLocaleString()} capacity</p>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4 text-sm">
          <div><span className="text-gray-500">Sport:</span> {lead.stadium.sport}</div>
          <div><span className="text-gray-500">League:</span> {lead.stadium.league ?? "-"}</div>
          <div><span className="text-gray-500">Stage:</span> <span className="capitalize">{lead.stage.replace(/_/g, " ")}</span></div>
          <div><span className="text-gray-500">Score:</span> {lead.score?.toFixed(1) ?? "-"}</div>
          <div><span className="text-gray-500">Priority:</span> {lead.priority ?? "-"}</div>
          <div><span className="text-gray-500">Owner:</span> {lead.owner ?? "Unassigned"}</div>
        </div>

        <div className="mt-4">
          <label className="text-sm text-gray-500 block mb-1">Notes</label>
          <textarea
            className="border rounded w-full p-2 text-sm"
            rows={3}
            defaultValue={lead.notes ?? ""}
            onBlur={(e) => updateMutation.mutate({ notes: e.target.value })}
          />
        </div>
      </div>

      <h2 className="text-lg font-semibold mt-6 mb-3">Contacts ({lead.contacts.length})</h2>
      <div className="bg-white rounded shadow overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-xs text-gray-500 uppercase">
            <tr>
              <th className="px-4 py-2 text-left">Name</th>
              <th className="px-4 py-2 text-left">Title</th>
              <th className="px-4 py-2 text-left">Email</th>
              <th className="px-4 py-2 text-left">Confidence</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {lead.contacts.map((c) => (
              <tr key={c.id}>
                <td className="px-4 py-2">{c.name ?? "-"}</td>
                <td className="px-4 py-2">{c.title ?? "-"}</td>
                <td className="px-4 py-2">{c.email ?? "-"}</td>
                <td className="px-4 py-2 capitalize">{c.confidence}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h2 className="text-lg font-semibold mt-6 mb-3">Outreach Drafts ({drafts?.length ?? 0})</h2>
      <div className="space-y-3">
        {drafts?.map((d) => (
          <div key={d.id} className="bg-white rounded shadow p-4">
            <div className="flex justify-between items-center mb-2">
              <span className="font-medium capitalize">{d.outreach_type.replace(/_/g, " ")}</span>
              <span className={`text-xs px-2 py-0.5 rounded ${
                d.approval_status === "approved" ? "bg-green-100 text-green-800" :
                d.approval_status === "rejected" ? "bg-red-100 text-red-800" :
                "bg-yellow-100 text-yellow-800"
              }`}>{d.approval_status}</span>
            </div>
            {d.subject && <p className="text-sm text-gray-600 mb-1"><strong>Subject:</strong> {d.subject}</p>}
            <pre className="text-sm text-gray-700 whitespace-pre-wrap">{d.body}</pre>
          </div>
        ))}
      </div>
    </div>
  );
}
