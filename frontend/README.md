# Solar & Sport - Frontend

React + TypeScript + Vite + Tailwind CSS frontend for the Solar & Sport Stadium Outreach Engine.

## Features

- **Dashboard** - Pipeline visualization, priority breakdown, and key metrics
- **Leads** - Searchable, filterable lead list with detailed lead management
- **Outreach Queue** - Review and approve/reject outreach drafts

## Tech Stack

- React 19
- TypeScript
- Vite 8
- Tailwind CSS 4
- TanStack Query (React Query)
- React Router

## Development

```bash
cd frontend
npm install
npm run dev
```

The dev server will proxy `/api` requests to `http://localhost:8000`.

## Production Deployment

### Vercel Deployment

1. **Install Vercel CLI**:
   ```bash
   npm i -g vercel
   ```

2. **Update API URL**:
   Edit `.env.production` and set `VITE_API_URL` to your deployed backend URL.

3. **Deploy**:
   ```bash
   cd frontend
   vercel --prod
   ```

### Environment Variables

| Variable | Description |
|----------|-------------|
| `VITE_API_URL` | Backend API base URL (e.g., `https://api.example.com`) |

### Backend Integration

The frontend expects a FastAPI backend running on the same domain or at `VITE_API_URL` with these endpoints:

- `GET /api/dashboard/` - Dashboard stats
- `GET /api/leads/` - List leads with filters
- `GET /api/leads/{id}` - Get lead details
- `PATCH /api/leads/{id}` - Update lead
- `GET /api/outreach/` - List outreach drafts
- `POST /api/outreach/{id}/approve` - Approve/reject draft

## Project Structure

```
frontend/
├── src/
│   ├── api/
│   │   ├── client.ts    # API client with React Query
│   │   └── types.ts     # TypeScript interfaces
│   ├── pages/
│   │   ├── DashboardPage.tsx
│   │   ├── LeadListPage.tsx
│   │   ├── LeadDetailPage.tsx
│   │   └── OutreachQueuePage.tsx
│   ├── App.tsx
│   ├── main.tsx
│   └── index.css
├── public/
├── index.html
├── package.json
└── vite.config.ts
```
