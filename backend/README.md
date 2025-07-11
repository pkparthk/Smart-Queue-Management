# Backend (Node.js/Express) - Smart Queue Management System

This is the backend API for the Smart Queue Management System, built with Node.js, Express, TypeScript, and MongoDB.

## Features

- RESTful API for queues, tokens, users, analytics
- JWT authentication
- Real-time updates via Socket.IO
- Email notifications (SMTP)
- Role-based access (admin, staff, customer)
- Input validation and error handling

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn
- MongoDB instance (local or cloud)

### Setup

```bash
cd backend
cp ../.env.example .env # or set up your own .env
npm install
npm run dev
```

### Environment Variables

See the root `.env.example` for required variables. Key backend variables:

- `MONGODB_URI` - MongoDB connection string
- `JWT_SECRET` - JWT secret
- `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS` - SMTP credentials for email

### Scripts

- `npm run dev` - Start development server (with nodemon)
- `npm run build` - Build TypeScript
- `npm start` - Start production server
- `npm test` - Run tests (Jest)

### Project Structure

```
backend/
  src/
    controllers/   # Route controllers
    models/        # Mongoose models
    routes/        # Express routes
    middleware/    # Auth, error handling
    socket/        # Socket.IO handlers
    config/        # Database config
    utils/         # Utility functions (email, etc.)
```

## API Documentation

See the main project `README.md` or use Postman to explore `/api` endpoints.

## License

MIT
