import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { api } from "../api/client";

export default function OutreachQueuePage() {
  const qc = useQueryClient();
  const { data: drafts, isLoading } = useQuery({
    queryKey: ["outreach-queue"],
    queryFn: () => api.outreach.list({ status: "pending" }),
  });

  const approveMut = useMutation({
    mutationFn: (id: number) => api.outreach.approve(id, "admin"),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["outreach-queue"] }),
  });
  const rejectMut = useMutation({
    mutationFn: (id: number) => api.outreach.reject(id, "admin"),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["outreach-queue"] }),
  });

  if (isLoading) return <p className="text-gray-500">Loading...</p>;

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">Outreach Approval Queue</h1>
      <p className="text-gray-500 mb-6">{drafts?.length ?? 0} pending drafts</p>

      <div className="space-y-4">
        {drafts?.map((d) => (
          <div key={d.id} className="bg-white rounded shadow p-5">
            <div className="flex justify-between items-start mb-3">
              <div>
                <span className="font-medium capitalize">{d.outreach_type.replace(/_/g, " ")}</span>
                <span className="text-gray-400 mx-2">&middot;</span>
                <Link to={`/leads/${d.lead_id}`} className="text-blue-600 text-sm hover:underline">
                  Lead #{d.lead_id}
                </Link>
              </div>
              <span className="text-xs text-gray-400">{d.recipient_email}</span>
            </div>

            {d.subject && <p className="text-sm mb-2"><strong>Subject:</strong> {d.subject}</p>}
            <pre className="text-sm text-gray-700 whitespace-pre-wrap bg-gray-50 p-3 rounded mb-4">{d.body}</pre>

            <div className="flex gap-2">
              <button
                onClick={() => approveMut.mutate(d.id)}
                className="bg-green-600 text-white px-4 py-1.5 rounded text-sm hover:bg-green-700"
              >
                Approve
              </button>
              <button
                onClick={() => rejectMut.mutate(d.id)}
                className="bg-red-600 text-white px-4 py-1.5 rounded text-sm hover:bg-red-700"
              >
                Reject
              </button>
            </div>
          </div>
        ))}
        {drafts?.length === 0 && (
          <p className="text-gray-400 text-center py-8">No pending drafts - all clear!</p>
        )}
      </div>
    </div>
  );
}
