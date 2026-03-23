/**
 * Seed script for local development
 * Run: node scripts/seed.js
 * Or hit POST /api/seed from the browser (dev only)
 */

const fetch = require('http').get

console.log(`
To seed the database:

Option 1 - Via API (app must be running):
  curl -X POST http://localhost:3000/api/seed

Option 2 - Use the /api/seed endpoint from your browser:
  Open: http://localhost:3000/api/seed (POST request)

Option 3 - Direct script (requires dotenv):
  Set MONGODB_URI in .env.local, then this script will be enhanced.

Demo credentials after seeding:
  Email: admin@datrading.com
  Password: admin123
`)
