# Befaringsskjema - Norwegian Wastewater System Inspection Form

## Overview

This is a digital inspection form application for Norwegian wastewater and greywater systems ("Befaringsskjema: Lett Avløps-/Gråvannsystem"). The application allows inspectors to collect and submit inspection data including customer details, drainage solutions, technical specifications, and photo documentation. It's built as a full-stack TypeScript application with a React frontend and Express backend.

## Authentication System

The application uses a custom session-based authentication system (separate from Replit Auth):
- **First-time setup**: When no users exist, the login page shows a setup form to create the first admin
- **User roles**: "user" (can submit forms) and "admin" (can manage users and view all submissions)
- **Session-based**: Uses express-session with PostgreSQL session store
- **Password hashing**: SHA-256 hashing (stored as hex)
- **Protected routes**: All routes require authentication; admin dashboard requires admin role
- **Auto-fill**: "Hvem fylte ut rapporten" field is auto-populated with logged-in user's name

### Setup Endpoints
- `GET /api/app/setup-status` - Check if setup is needed (returns { needsSetup: boolean })
- `POST /api/app/setup` - Create first admin user (only works when no users exist)

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Routing**: Wouter (lightweight React router)
- **State Management**: TanStack React Query for server state
- **Forms**: React Hook Form with Zod validation
- **UI Components**: shadcn/ui component library built on Radix UI primitives
- **Styling**: Tailwind CSS with custom design tokens and CSS variables for theming
- **Build Tool**: Vite with custom plugins for Replit integration

### Backend Architecture
- **Framework**: Express.js with TypeScript
- **API Pattern**: RESTful endpoints under `/api/` prefix
- **File Uploads**: Integration with Google Cloud Storage for object storage
- **Storage**: In-memory storage implementation with interface for future database migration
- **Schema Validation**: Zod schemas shared between client and server

### Data Layer
- **ORM**: Drizzle ORM configured for PostgreSQL
- **Schema Location**: `shared/schema.ts` contains all database schemas and Zod validation schemas
- **Primary Database**: Render PostgreSQL (external) via `Inspeksjonsskjema_db` environment variable with SSL
- **Fallback Database**: Replit PostgreSQL via `DATABASE_URL` environment variable
- **Database Config**: Uses `Inspeksjonsskjema_db` if available, otherwise falls back to `DATABASE_URL`

### Project Structure
```
├── client/           # React frontend application
│   └── src/
│       ├── components/ui/  # shadcn/ui components
│       ├── pages/          # Page components
│       ├── hooks/          # Custom React hooks
│       └── lib/            # Utilities and API client
├── server/           # Express backend
│   ├── routes.ts     # API route definitions
│   ├── storage.ts    # Data storage interface and implementation
│   └── objectStorage.ts  # Google Cloud Storage integration
├── shared/           # Shared code between client and server
│   └── schema.ts     # Database schemas and Zod validation
└── migrations/       # Drizzle database migrations
```

### Map Features (Situasjonsplan)
The map section uses professional Norwegian map data:
- **Background**: Kartverket WMTS topographic tiles from `https://cache.kartverket.no/v1/wmts/1.0.0/topo/default/webmercator/{z}/{y}/{x}.png`
- **Property Boundaries**: WMS layer from Matrikkelen showing official property boundaries (transparent overlay)
- **Draggable Markers**: Biocleaner, Slamavskiller, and Utslippspunkt markers can be dragged to adjust placement
- **Scale Control**: Metric scale bar in bottom-left corner
- **Info Box**: "Situasjonsplan for Biocleaner" with current date in top-right corner
- **Print Function**: Button to prepare map for printing at 1:500 scale (municipal requirement)
- **Address Autocomplete**: Google Places integration (requires VITE_GOOGLE_MAPS_API_KEY)

### Form Sections
The inspection form is organized into 7 main sections:
1. Customer and Project Details (name, address, contact info)
2. Drainage Solution Information (existing system, planned solutions)
3. Installation Site Assessment (placement, frost protection)
4. Technical Connections (electrical, plumbing requirements)
5. Photo Documentation (image uploads to cloud storage)

## External Dependencies

### Cloud Services
- **Google Cloud Storage**: Object storage for photo uploads and file management
- **PostgreSQL**: Database (configured via `DATABASE_URL` environment variable)

### Key NPM Packages
- **UI**: Radix UI primitives, Lucide React icons, class-variance-authority
- **Forms**: react-hook-form, @hookform/resolvers, zod
- **Data Fetching**: @tanstack/react-query
- **File Upload**: @uppy/core, @uppy/react, @uppy/dashboard
- **Database**: drizzle-orm, drizzle-zod, pg
- **Server**: express, express-session, connect-pg-simple

### Development Tools
- **TypeScript**: Strict mode enabled
- **Vite**: Development server with HMR
- **Drizzle Kit**: Database migrations and schema management
- **esbuild**: Production server bundling