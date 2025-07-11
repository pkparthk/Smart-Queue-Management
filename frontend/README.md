# Frontend (Next.js) - Smart Queue Management System

This is the frontend application for the Smart Queue Management System, built with Next.js 14, TypeScript, and Tailwind CSS.

## Features

- Modern UI with responsive design
- Real-time updates via Socket.IO
- Authentication (login/register)
- Queue management dashboard
- Analytics and reporting
- Zustand for state management
- Email notifications (via EmailJS, optional)

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn

### Setup

```bash
cd frontend
cp ../.env.example .env # or set up your own .env
npm install
npm run dev
```

### Environment Variables

See the root `.env.example` for required variables. Key frontend variables:

- `NEXT_PUBLIC_BACKEND_URL` - Backend API base URL
- `EMAIL_JS_SERVICE_ID`, `EMAIL_JS_TEMPLATE_ID`, `EMAIL_JS_PUBLIC_KEY` (if using EmailJS)

### Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm start` - Start production server

### Project Structure

```
frontend/
  src/
    app/           # Next.js app directory
    components/    # UI components
    hooks/         # Custom React hooks
    store/         # Zustand state management
    styles/        # Global styles
```

## Deployment

See the main project `DEPLOYMENT.md` for deployment instructions.

## License

MIT
