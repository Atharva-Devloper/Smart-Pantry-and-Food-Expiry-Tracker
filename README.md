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

- Node.js v18.17.0+ (or run `nvm use`)
- MongoDB connection string (local or Atlas)

### Setup

```bash
# 1. Clone the repo
git clone <repo-url>
cd Smart-Pantry-and-Food-Expiry-Tracker

# 2. Install dependencies
cd server && npm install && cd ..
cd client && npm install && cd ..

# 3. Configure environment variables

# Required - Server credentials
cd server
cp .env.example .env
# Edit .env and add:
#   MONGO_URI=your_mongodb_connection_string
#   JWT_SECRET=your_random_secret
#   GEMINI_API_KEY=your_google_api_key
cd ..

# Optional - Client config (has defaults, only needed if backend runs elsewhere)
cd client
cp .env.example .env
cd ..

# 4. Run in separate terminals

# Terminal 1 - Server
cd server && npm run dev

# Terminal 2 - Client
cd client && npm run dev
```

**Then visit:** http://localhost:5173

## Testing with Sample Data

### 1. Create a test account

- Go to http://localhost:5173
- Click "Register"
- Create a test account (email: test@example.com, password: any password)

### 2. Seed test pantry items (optional)

```bash
cd server
node seed.js
```

This adds sample items (milk, apples, chicken, etc.) to your pantry for testing.

### 3. Login and explore

- Login with your test credentials
- View the seeded pantry items
- Try adding products, creating shopping lists, generating recipes, etc.

```

Frontend: http://localhost:5173
Backend: http://localhost:5000

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
├── client/ # React frontend
│ ├── public/
│ ├── src/
│ │ ├── components/
│ │ ├── pages/
│ │ ├── hooks/
│ │ └── utils/
│ └── package.json
├── server/ # Express backend
│ ├── models/
│ ├── routes/
│ ├── middleware/
│ ├── controllers/
│ └── index.js
├── .env.example # Environment variables template
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
```
