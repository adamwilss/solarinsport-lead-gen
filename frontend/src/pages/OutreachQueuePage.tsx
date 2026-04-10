import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { api } from "../api/client";
import { useState } from "react";

const STATUS_OPTIONS = [
  { value: "pending", label: "Pending" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Rejected" },
  { value: "sent", label: "Sent" },
];

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800 border-yellow-200",
  approved: "bg-green-100 text-green-800 border-green-200",
  rejected: "bg-red-100 text-red-800 border-red-200",
  sent: "bg-blue-100 text-blue-800 border-blue-200",
};

export default function OutreachQueuePage() {
  const qc = useQueryClient();
  const [filter, setFilter] = useState("pending");
  const [expandedDraft, setExpandedDraft] = useState<number | null>(null);

  const { data: drafts, isLoading } = useQuery({
    queryKey: ["outreach-queue", filter],
    queryFn: () => api.outreach.list({ status: filter === "all" ? "" : filter }),
  });

  const approveMut = useMutation({
    mutationFn: (id: number) => api.outreach.approve(id, "admin"),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["outreach-queue"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });

  const rejectMut = useMutation({
    mutationFn: (id: number) => api.outreach.reject(id, "admin"),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["outreach-queue"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });

  const pendingCount = drafts?.filter((d) => d.approval_status === "pending")
    .length ?? 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Outreach Queue</h1>
          <p className="text-gray-500 text-sm mt-1">
            Review and approve outreach drafts before sending
          </p>
        </div>
        {pendingCount > 0 && (
          <div className="bg-orange-100 text-orange-800 px-4 py-2 rounded-lg text-sm font-medium">
            {pendingCount} pending approval
          </div>
        )}
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border p-4">
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setFilter("all")}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
              filter === "all"
                ? "bg-blue-600 text-white"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            All
          </button>
          {STATUS_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setFilter(opt.value)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                filter === opt.value
                  ? "bg-blue-600 text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Drafts List */}
      <div className="space-y-4">
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : (
          <>
            {drafts?.map((draft) => (
              <div
                key={draft.id}
                className="bg-white rounded-xl shadow-sm border overflow-hidden"
              >
                <div className="p-5">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <span className="font-medium capitalize text-gray-900">
                          {draft.outreach_type.replace(/_/g, " ")}
                        </span>
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-medium border ${
                            STATUS_COLORS[draft.approval_status]
                          }`}
                        >
                          {draft.approval_status}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 text-sm text-gray-500">
                        <Link
                          to={`/leads/${draft.lead_id}`}
                          className="text-blue-600 hover:underline"
                        >
                          Lead #{draft.lead_id}
                        </Link>
                        {draft.recipient_email && (
                          <>
                            <span>•</span>
                            <span>{draft.recipient_email}</span>
                          </>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() =>
                          setExpandedDraft(
                            expandedDraft === draft.id ? null : draft.id
                          )
                        }
                        className="text-gray-500 hover:text-gray-700 text-sm"
                      >
                        {expandedDraft === draft.id ? "Collapse" : "Preview"}
                      </button>
                    </div>
                  </div>

                  {/* Draft Preview */}
                  <div
                    className={`mt-4 space-y-3 transition-all ${
                      expandedDraft === draft.id ? "block" : "hidden"
                    }`}
                  >
                    {draft.subject && (
                      <div className="bg-gray-50 px-4 py-3 rounded-lg">
                        <div className="text-xs text-gray-500 uppercase tracking-wide mb-1">
                          Subject
                        </div>
                        <div className="text-sm text-gray-900">{draft.subject}</div>
                      </div>
                    )}

                    <div className="border rounded-lg p-4 bg-gray-50">
                      <div className="text-xs text-gray-500 uppercase tracking-wide mb-2">
                        Message Preview
                      </div>
                      <pre className="text-sm text-gray-700 whitespace-pre-wrap font-sans">
                        {draft.body}
                      </pre>
                    </div>

                    {draft.approved_by && (
                      <div className="text-sm text-gray-500">
                        {draft.approval_status === "approved"
                          ? "Approved"
                          : "Rejected"}{" "}
                        by {draft.approved_by}
                        {draft.sent_at && (
                          <span>
                            {" "}
                            • Sent{" "}
                            {new Date(draft.sent_at).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Actions Bar */}
                {draft.approval_status === "pending" && (
                  <div className="bg-gray-50 px-5 py-3 flex gap-2 border-t">
                    <button
                      onClick={() => approveMut.mutate(draft.id)}
                      disabled={approveMut.isPending}
                      className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50 transition"
                    >
                      {approveMut.isPending ? "Approving..." : "✓ Approve"}
                    </button>
                    <button
                      onClick={() => rejectMut.mutate(draft.id)}
                      disabled={rejectMut.isPending}
                      className="bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-red-700 disabled:opacity-50 transition"
                    >
                      {rejectMut.isPending ? "Rejecting..." : "✕ Reject"}
                    </button>
                    <button
                      onClick={() => setExpandedDraft(draft.id)}
                      className="ml-auto text-gray-600 hover:text-gray-900 text-sm"
                    >
                      Preview
                    </button>
                  </div>
                )}
              </div>
            ))}

            {drafts?.length === 0 && (
              <div className="text-center py-16 bg-gray-50 rounded-xl border border-dashed">
                <div className="text-4xl mb-4">📭</div>
                <p className="text-gray-500 font-medium">
                  No {filter !== "all" ? filter : ""} drafts found
                </p>
                <p className="text-sm text-gray-400 mt-1">
                  {filter === "pending"
                    ? "All caught up! No drafts waiting for approval."
                    : filter === "all"
                    ? "No outreach drafts created yet."
                    : `No ${filter} drafts to display.`}
                </p>
                {filter !== "all" && (
                  <button
                    onClick={() => setFilter("all")}
                    className="mt-4 text-blue-600 hover:underline text-sm"
                  >
                    View all drafts
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
