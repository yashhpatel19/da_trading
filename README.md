# DA Trading Manager

Internal trade management platform for DA (Documents Against Acceptance) trading business.

## Features

- **Dashboard** — KPIs, exposure risk, commission tracking, charts
- **Deal Management** — Full deal lifecycle with DA tenor, auto due date calculation
- **Party Profiles** — Buyer/supplier with risk scoring and payment history
- **Payment Tracking** — Multiple partial payments per deal, commission tracking
- **Risk Monitor** — Real-time overdue flags, buyer-wise exposure
- **Reports** — Deal profit, buyer outstanding, commission, overdue, monthly summary (CSV export)

## Tech Stack

- **Frontend/Backend**: Next.js 14 (Pages Router)
- **Database**: MongoDB Atlas (Mongoose)
- **Auth**: NextAuth.js (email/password)
- **Styling**: Tailwind CSS (dark mode)
- **Charts**: Recharts

## Quick Start

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment

```bash
cp .env.example .env.local
```

Edit `.env.local`:
```
MONGODB_URI=mongodb+srv://username:password@cluster0.xxxxx.mongodb.net/da_trading
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-random-secret-key-here
```

Generate a secret: `openssl rand -base64 32`

### 3. Start the app

```bash
npm run dev
```

### 4. Seed demo data

After the app is running:

```bash
curl -X POST http://localhost:3000/api/seed
```

Demo login:
- **Email**: admin@datrading.com
- **Password**: admin123

## Deploy to DigitalOcean

### App Platform (recommended)

1. Push this repo to GitHub
2. Go to DigitalOcean App Platform → Connect GitHub repo
3. Set env vars: `MONGODB_URI`, `NEXTAUTH_SECRET`, `NEXTAUTH_URL`
4. Deploy

### VPS

```bash
npm install && npm run build
npm install -g pm2
pm2 start npm --name "da-trading" -- start
```

## Project Structure

```
da_trading/
├── components/       # UI components (Layout, DealForm, PartyForm, Charts)
├── lib/              # mongodb.js, utils.js (formatters, risk calc)
├── models/           # User, Deal, Party, Payment (Mongoose schemas)
├── pages/            # Next.js pages + API routes
│   ├── index.js      # Login
│   ├── dashboard.js
│   ├── deals/        # List, new, [id], [id]/edit
│   ├── parties/      # List, new, [id], [id]/edit
│   ├── payments/     # List, new
│   ├── risk.js
│   ├── reports.js
│   └── api/          # All backend routes
├── styles/globals.css
└── middleware.js     # Route auth protection
```

## Business Logic

### Deal Statuses
Draft → Confirmed → Shipped → Accepted → Payment Due → Partially Paid → Completed
                                                                       ↓ (past due)
                                                                    Overdue

### Risk Score (0–100, rule-based)
- Overdue deal ratio: 0–30 pts
- Avg payment delay: 0–25 pts
- Total overdue amount: 0–25 pts
- Partial payment frequency: 0–20 pts

### Exposure at Risk
Sum of buyer outstanding on deals in: Accepted, Payment Due, Partially Paid, Overdue