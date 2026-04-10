import type { Lead, OutreachDraft, DashboardData } from "./types";

// Use environment variable for API base URL, fallback to relative for development
const API_BASE = import.meta.env.VITE_API_URL || "";
const BASE = `${API_BASE}/api`;

async function fetchJSON<T>(url: string, init?: RequestInit): Promise<T> {
  const resp = await fetch(`${BASE}${url}`, {
    headers: { "Content-Type": "application/json" },
    ...init,
  });
  if (!resp.ok) {
    const error = await resp.text().catch(() => "Unknown error");
    throw new Error(`API error: ${resp.status} - ${error}`);
  }
  return resp.json();
}

export const api = {
  leads: {
    list: (params?: Record<string, string>) => {
      const qs = params ? "?" + new URLSearchParams(params).toString() : "";
      return fetchJSON<Lead[]>(`/leads/${qs}`);
    },
    get: (id: number) => fetchJSON<Lead>(`/leads/${id}`),
    update: (id: number, data: Record<string, unknown>) =>
      fetchJSON<Lead>(`/leads/${id}`, {
        method: "PATCH",
        body: JSON.stringify(data),
      }),
  },
  outreach: {
    list: (params?: Record<string, string>) => {
      const qs = params ? "?" + new URLSearchParams(params).toString() : "";
      return fetchJSON<OutreachDraft[]>(`/outreach/${qs}`);
    },
    approve: (id: number, approved_by: string) =>
      fetchJSON<OutreachDraft>(`/outreach/${id}/approve`, {
        method: "POST",
        body: JSON.stringify({ status: "approved", approved_by }),
      }),
    reject: (id: number, approved_by: string) =>
      fetchJSON<OutreachDraft>(`/outreach/${id}/approve`, {
        method: "POST",
        body: JSON.stringify({ status: "rejected", approved_by }),
      }),
  },
  dashboard: {
    get: () => fetchJSON<DashboardData>("/dashboard/"),
  },
};
