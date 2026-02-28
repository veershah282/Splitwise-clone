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
Create a `.env` file in `backend-ts/` with your database and API keys.

Run the backend in dev mode (automatically seeds demo data):
```bash
npm run dev
```

### 2. Frontend Setup
```bash
cd frontend
npm install
npm run dev
```

## Testing
Run the backend test suite:
```bash
cd backend-ts
npm run test
```
