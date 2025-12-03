# BIMS - Business Information Management System

A modern, AI-powered business management application built with React, TypeScript, and Google's Gemini AI.

## Features

- 📊 **Dashboard** - Real-time business metrics and analytics
- 💰 **Cash Wallet** - Track income, expenses, and cash flow
- 📝 **Accounts Management** - Manage customer and supplier accounts
- 📸 **Receipt Scanner** - AI-powered receipt scanning using Gemini Vision
- 📈 **Analytics** - Visual charts and insights powered by Recharts

## Tech Stack

- **Frontend**: React 19, TypeScript, Vite
- **UI Components**: Lucide React icons
- **Charts**: Recharts
- **AI**: Google Gemini API
- **Styling**: Modern CSS with responsive design

## Run Locally

**Prerequisites:** Node.js (v18 or higher)

1. **Clone the repository:**
   ```bash
   git clone <your-repo-url>
   cd BIMS
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Set up environment variables:**
   - Copy `.env.example` to `.env.local`
   - Get your Gemini API key from [Google AI Studio](https://aistudio.google.com/app/apikey)
   - Add your API key to `.env.local`:
     ```
     VITE_GEMINI_API_KEY=your_api_key_here
     ```

4. **Run the development server:**
   ```bash
   npm run dev
   ```

5. **Open your browser:**
   Navigate to `http://localhost:5173`

## Build for Production

```bash
npm run build
npm run preview
```

## Deployment

This app can be easily deployed to:

- **Vercel** (Recommended)
- **Netlify**
- **GitHub Pages**
- Any static hosting service

### Deploy to Vercel

1. Push your code to GitHub
2. Go to [Vercel](https://vercel.com)
3. Import your GitHub repository
4. Add your `VITE_GEMINI_API_KEY` environment variable
5. Deploy!

### Deploy to Netlify

1. Push your code to GitHub
2. Go to [Netlify](https://netlify.com)
3. Import your GitHub repository
4. Build command: `npm run build`
5. Publish directory: `dist`
6. Add your `VITE_GEMINI_API_KEY` environment variable
7. Deploy!

## Project Structure

```
BIMS/
├── components/          # React components
│   ├── Dashboard.tsx
│   ├── CashWallet.tsx
│   ├── Accounts.tsx
│   ├── Scanner.tsx
│   └── TransactionList.tsx
├── services/           # API services
│   └── geminiService.ts
├── App.tsx            # Main app component
├── types.ts           # TypeScript type definitions
├── constants.ts       # App constants
└── index.tsx          # Entry point
```

## License

MIT

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.
