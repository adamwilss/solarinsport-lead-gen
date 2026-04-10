export interface Stadium {
  id: number;
  name: string;
  club_name: string | null;
  city: string | null;
  country: string;
  capacity: number | null;
  sport: string | null;
  league: string | null;
  website: string | null;
  hospitality_url: string | null;
  sustainability_url: string | null;
  created_at: string;
}

export interface Contact {
  id: number;
  lead_id: number;
  name: string | null;
  title: string | null;
  email: string | null;
  phone: string | null;
  linkedin_url: string | null;
  source: string | null;
  confidence: string;
  created_at: string;
}

export interface Lead {
  id: number;
  stadium_id: number;
  stadium: Stadium;
  contacts: Contact[];
  score: number | null;
  priority: string | null;
  stage: string;
  outreach_status: string | null;
  next_action: string | null;
  notes: string | null;
  tags: string | null;
  owner: string | null;
  created_at: string;
  updated_at: string;
}

export interface OutreachDraft {
  id: number;
  lead_id: number;
  outreach_type: string;
  subject: string | null;
  body: string;
  recipient_email: string | null;
  approval_status: string;
  approved_by: string | null;
  sent_at: string | null;
  created_at: string;
}

export interface DashboardData {
  total_leads: number;
  pipeline: { stage: string; count: number }[];
  leads_by_priority: Record<string, number>;
  outreach_pending: number;
  outreach_sent: number;
  reply_rate: number;
}
