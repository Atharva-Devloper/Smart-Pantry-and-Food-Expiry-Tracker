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

- Node.js (v18+)
- MongoDB running locally (install and start MongoDB service)

### Setup

1. **Install dependencies for the server:**
   ```bash
   cd server
   npm ci
   ```

2. **Set up server environment variables:**
   ```bash
   cp .env.example .env
   ```
   Edit `server/.env` and add your specific information:
   - `GROQ_API_KEY`: Your Groq API key from https://console.groq.com/
   - `JWT_SECRET`: A secure random string for JWT authentication (if not already set)

3. **Install dependencies for the client:**
   ```bash
   cd ../client
   npm ci
   ```

4. **Set up client environment variables (optional):**
   ```bash
   cp .env.example .env
   ```
   The default values should work for local development.

5. **Start the development servers:**

   In one terminal, start the backend server:
   ```bash
   cd server
   npm run dev
   ```

   In another terminal, start the frontend client:
   ```bash
   cd client
   npm run dev
   ```

Frontend will be available at: http://localhost:5173
Backend API will be available at: http://localhost:5000

## Available Scripts

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
Smart-Pantry-and-Food-Expiry-Tracker/
├── client/                 # React frontend
│   ├── .env.example        # Frontend environment template
│   ├── package.json
│   ├── public/
│   ├── src/
│   │   ├── components/
│   │   ├── context/
│   │   ├── styles/
│   │   └── ...
│   └── vite.config.js
├── server/                 # Express backend
│   ├── .env.example        # Backend environment template
│   ├── package.json
│   ├── index.js
│   ├── middleware/
│   ├── models/
│   ├── routes/
│   └── utils/
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
