# NestJS Backend Scaffold

## Overview

This project is a scaffold for a NestJS backend application that provides a foundation for building a robust and secure web backend. It comes pre-configured with essential tools and features to accelerate development.

## Features

- **NestJS Framework**: A progressive Node.js framework for building efficient, reliable, and scalable server-side applications
- **Prisma ORM**: Next-generation ORM for Node.js and TypeScript, providing type-safe database access, auto-generated migrations, and a powerful query builder
- **Authentication System**:
  - JWT (JSON Web Token) authentication with token blacklisting
  - Public/Private route decoration
  - User registration and login
- **Health Checks**: Integrated health monitoring with @nestjs/terminus
  - Database connectivity check
  - Ready for cloud deployments and container orchestration
- **Caching System**: Built-in caching mechanisms to improve performance and reduce database load
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

### Building the Docker Image

Build a Docker image for your application:

```
docker build -t nest-scaffold .
```

### Running with Docker

Run the application in a Docker container:

```
docker run -p 3000:3000 --env-file .env nest-scaffold
```

### Production Considerations

- Use multi-stage builds to create smaller production images
- Consider using Docker Swarm or Kubernetes for orchestration
- Set up proper health checks for container monitoring
- Implement container-specific logging solutions
- Use Docker secrets management for sensitive information
