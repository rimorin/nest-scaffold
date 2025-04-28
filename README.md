# NestJS Backend Scaffold

## Overview

This project is a scaffold for a NestJS backend application that provides a foundation for building a robust and secure web backend. It comes pre-configured with essential tools and features to accelerate development.

## Features

- **NestJS Framework**: A progressive Node.js framework for building efficient, reliable, and scalable server-side applications
- **Prisma ORM**: Next-generation ORM for Node.js and TypeScript, providing type-safe database access, auto-generated migrations, and a powerful query builder
- **Authentication System**:
  - JWT (JSON Web Token) authentication with token blacklisting
  - Cookie-based authentication for enhanced security
  - Public/Private route decoration
  - User registration and login
- **Health Checks**: Integrated health monitoring with @nestjs/terminus
  - Database connectivity check
  - Ready for cloud deployments and container orchestration
- **Caching System**:
  - Built-in caching mechanisms to improve performance and reduce database load
  - Redis cache integration for distributed caching
- **Data Processing**:
  - Robust data serialization for consistent API responses
  - Offset-based pagination for handling large data sets
- **CORS Support**: Configured Cross-Origin Resource Sharing for secure client-server communication
- **Scheduled Tasks**: Support for cronjobs to automate recurring tasks and background operations
- **Message Queue System**:
  - BullMQ integration for reliable job processing and task scheduling
  - Support for distributed and delayed task execution
- **Error Handling**: Global exception filter for consistent error responses
- **API Documentation**: Swagger/OpenAPI integration for interactive API documentation
- **Code Quality**:
  - ESLint and Prettier integration
  - Husky pre-commit hooks
  - Standardized code formatting and linting

## Getting Started

### Prerequisites

- Node.js (v22 or later recommended)
- npm or yarn
- SQL database (SQLite configured by default)
- Redis (for BullMQ job processing)

### Installation

1. Clone this repository
2. Install dependencies:
   ```
   npm install
   ```
   or
   ```
   yarn install
   ```
3. Set up your environment variables (see `.env.example`)
4. Run Prisma migrations:
   ```
   npx prisma migrate dev
   ```

### Database Management

To launch Prisma Studio for visual database management:

```
npx prisma studio
```

### Running the Application

#### Development

```
npm run start:dev
```

#### Production

```
npm run build

node dist/main.js
```

## Docker Deployment

### Prerequisites

- Docker installed on your system
- Docker Compose v2+ for multi-container setup

### Using Docker Compose (Recommended)

The easiest way to run the application with all required services is using Docker Compose:

1. Prepare required data directories (using the built-in script):

   ```bash
   npm run docker:prepare
   ```

   This creates the necessary directories for persistent storage:

   - `data/postgres`: For PostgreSQL data
   - `data/redis`: For Redis data

2. Start all services with a single command:

   ```bash
   npm run docker:up
   ```

   This runs the containers in detached mode (background).

3. To run only the database services (Postgres and Redis) without the application:

   ```bash
   npm run docker:services
   ```

4. View logs for all services:

   ```bash
   npm run docker:logs
   ```

   or

   ```bash
   docker compose logs -f
   ```

5. View logs for a specific service:

   ```bash
   docker compose logs -f app|postgres|redis
   ```

6. Stop all services:

   ```bash
   npm run docker:down
   ```

   or

   ```bash
   docker compose down
   ```

7. Stop services and remove volumes:

   ```bash
   docker compose down -v
   ```

8. Restart services:
   ```bash
   npm run docker:restart
   ```

### Services Included

- **app**: NestJS application running on port 3000
  - Multi-stage Docker build for optimized production image
  - Runs as non-root user for enhanced security
  - Built-in Prisma client generation
- **postgres**: PostgreSQL 14 (Alpine) database running on port 5432
  - Configured with default credentials (user: prisma, password: prisma)
  - Data persisted to ./data/postgres directory
- **redis**: Redis (Alpine) instance running on port 6379
  - Configured with AOF persistence for data durability
  - Data persisted to ./data/redis directory

### Building and Running with Docker (Without Compose)

If you prefer to build and run containers manually:

1. Build the Docker image:

   ```bash
   docker build -t nest-scaffold .
   ```

   The build uses a multi-stage process:

   - First stage: Builds the application with all dependencies
   - Second stage: Creates a minimal production image

2. Run a container from the image:
   ```bash
   docker run -p 3000:3000 --env-file .env nest-scaffold
   ```

### Database Management

When running in Docker, you can still use Prisma commands through npm:

```bash
# Run Prisma Studio (Web-based database explorer)
npm run prisma:studio

# Apply pending migrations
npm run prisma:migrate:dev

# Deploy migrations in production
npm run prisma:migrate:deploy
```

### Production Deployment

For production environments:

- Use Docker Compose profiles or separate compose files for production configuration
- Implement proper secrets management instead of environment variables in the compose file
- Set up a reverse proxy (like Nginx or Traefik) for SSL termination
- Use Docker Swarm or Kubernetes for container orchestration
- Set up container health checks for reliable service monitoring
- Configure proper logging drivers for centralized logging
- Consider using Docker volumes or a managed database service instead of bind mounts
