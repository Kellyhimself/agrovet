# Agrovet Management System

A comprehensive management system for agrovet shops, built with Next.js, TypeScript, and Supabase.

## Features

- Inventory Management
- Sales Tracking
- Offline Mode Support
- Customer Management
- Compliance Tracking
- Mobile-First Design

## Tech Stack

- Next.js 14 with TypeScript
- Supabase (PostgreSQL)
- Tailwind CSS
- PWA Support
- M-Pesa Integration

## Getting Started

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Copy the environment file:
   ```bash
   cp .env.example .env.local
   ```
4. Update the environment variables in `.env.local` with your Supabase and M-Pesa credentials
5. Run the development server:
   ```bash
   npm run dev
   ```

## Development

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint
- `npm run type-check` - Run TypeScript type checking

## Project Structure

See the [Development Plan](docs/development-plan.md) for detailed information about the project structure and implementation phases.

## License

MIT
