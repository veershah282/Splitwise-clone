# Splitwise Clone with AI Features

A full-stack recreation of Splitwise featuring natural language expense parsing and automated monthly summaries.

## Key Features
- **User Authentication:** Secure registration and login system.
- **Group Management:** Create groups and manage members.
- **Expense Tracking:** Add expenses and split them among members.
- **Settlements:** Settle debts and track payments.
- **AI Expense Parsing:** "Magic Input" for adding expenses using natural language.
- **AI Monthly Summaries:** Automatic personalized spending summaries sent via email.
- **Demo Access:** One-click login buttons for quick access.

## Core Stack
- **Frontend:** React with Tailwind CSS
- **Backend:** Node.js with Express and TypeScript
- **Database:** MongoDB
- **AI:** Google Gemini
- **Email:** Resend

## Getting Started

### 1. Backend Setup
```bash
cd backend-ts
npm install
```
1. Create a `.env` file in `backend-ts/` (refer to `.env.example`).
2. Add your `MONGODB_URI`, `GEMINI_API_KEY`, and `RESEND_API_KEY`.
3. Run in dev mode (automatically seeds demo data):
```bash
npm run dev
```

### 2. Frontend Setup
```bash
cd frontend
npm install
```
1. Create a `.env` file in `frontend/` (refer to `.env.example`).
2. Set `VITE_API_URL=http://localhost:5000/api`.
3. Run the frontend:
```bash
npm run dev
```

## Testing
Run the backend test suite:
```bash
cd backend-ts
npm run test
```

