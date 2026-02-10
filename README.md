# Smart Pantry and Food Expiry Tracker

A full-stack web application for tracking pantry items and monitoring food expiry dates.

## Features

- 📦 Track pantry items with quantities and locations
- ⏰ Monitor expiry dates with notifications
- 📊 View inventory statistics and reports
- 🔄 Real-time updates across devices
- 📱 Responsive design for mobile and desktop

## Tech Stack

### Frontend
- React 19.2.0
- Vite 7.2.4
- Tailwind CSS (to be added)

### Backend
- Express.js 5.2.1
- MongoDB with Mongoose 9.1.5
- JWT Authentication
- CORS enabled

## Quick Start

### Prerequisites
- Node.js (v18 or higher)
- MongoDB installed and running

### Installation

1. Clone the repository
2. Install dependencies for all packages:
   ```bash
   npm run install-deps
   ```

3. Set up environment variables:
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

4. Start MongoDB service

5. Run the development servers:
   ```bash
   npm run dev
   ```

This will start both the frontend (http://localhost:5173) and backend (http://localhost:5000) concurrently.

## Available Scripts

### Root Level
- `npm run dev` - Start both client and server in development mode
- `npm run server` - Start only the backend server
- `npm run client` - Start only the frontend
- `npm run build` - Build the frontend for production
- `npm run install-deps` - Install dependencies for all packages

### Client (client/)
- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint

### Server (server/)
- `npm start` - Start production server
- `npm run dev` - Start development server with nodemon

## Project Structure

```
smart-pantry-tracker/
├── client/                 # React frontend
│   ├── public/
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── hooks/
│   │   └── utils/
│   └── package.json
├── server/                 # Express backend
│   ├── models/
│   ├── routes/
│   ├── middleware/
│   ├── controllers/
│   └── index.js
├── .env.example           # Environment variables template
└── README.md
```

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout

### Pantry Items
- `GET /api/items` - Get all user's items
- `POST /api/items` - Add new item
- `PUT /api/items/:id` - Update item
- `DELETE /api/items/:id` - Delete item

### Categories
- `GET /api/categories` - Get all categories
- `POST /api/categories` - Create new category

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

ISC License
