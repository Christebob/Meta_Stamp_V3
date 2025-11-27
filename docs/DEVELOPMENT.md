# META-STAMP V3 Development Guide

Welcome to the META-STAMP V3 development guide! This document provides comprehensive instructions for setting up your local development environment, running services, maintaining code quality, testing, and contributing to the project.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Environment Setup](#environment-setup)
  - [Clone the Repository](#clone-the-repository)
  - [Backend Setup](#backend-setup)
  - [Frontend Setup](#frontend-setup)
  - [Environment Variables](#environment-variables)
- [Running Services](#running-services)
  - [Docker Compose (Recommended)](#docker-compose-recommended)
  - [Running Services Independently](#running-services-independently)
  - [Service Endpoints](#service-endpoints)
- [Code Quality Tools](#code-quality-tools)
  - [Backend (Python)](#backend-python)
  - [Frontend (TypeScript/React)](#frontend-typescriptreact)
  - [Pre-commit Hooks](#pre-commit-hooks)
- [Testing](#testing)
  - [Backend Tests](#backend-tests)
  - [Frontend Tests](#frontend-tests)
  - [Running Full Test Suite](#running-full-test-suite)
- [Git Workflow](#git-workflow)
  - [Branching Strategy](#branching-strategy)
  - [Commit Message Conventions](#commit-message-conventions)
  - [Pull Request Process](#pull-request-process)
- [Troubleshooting](#troubleshooting)
- [Additional Resources](#additional-resources)

---

## Prerequisites

Before you begin, ensure you have the following tools installed on your development machine:

### Required Software

| Tool | Version | Purpose | Installation |
|------|---------|---------|--------------|
| **Python** | 3.11+ | Backend runtime | [python.org](https://www.python.org/downloads/) |
| **Poetry** | 2.2.1+ | Python dependency management | [python-poetry.org](https://python-poetry.org/docs/#installation) |
| **Node.js** | 20+ (LTS) | Frontend runtime | [nodejs.org](https://nodejs.org/) |
| **npm** | 10+ | Frontend package management | Included with Node.js |
| **Docker** | 24+ | Containerization | [docker.com](https://docs.docker.com/get-docker/) |
| **Docker Compose** | 2.20+ | Multi-container orchestration | [docker.com](https://docs.docker.com/compose/install/) |
| **Git** | 2.40+ | Version control | [git-scm.com](https://git-scm.com/) |

### Verify Installation

Run the following commands to verify your installations:

```bash
# Python version (must be 3.11+)
python --version
# Expected: Python 3.11.x or higher

# Poetry version (must be 2.2.1+)
poetry --version
# Expected: Poetry (version 2.2.1) or higher

# Node.js version (must be 20+)
node --version
# Expected: v20.x.x or higher

# npm version (must be 10+)
npm --version
# Expected: 10.x.x or higher

# Docker version
docker --version
# Expected: Docker version 24.x.x or higher

# Docker Compose version
docker compose version
# Expected: Docker Compose version v2.20.x or higher

# Git version
git --version
# Expected: git version 2.40.x or higher
```

### Optional Tools

| Tool | Purpose |
|------|---------|
| **MongoDB Compass** | GUI for MongoDB database inspection |
| **Redis Insight** | GUI for Redis cache inspection |
| **Postman** | API testing and development |
| **VS Code** | Recommended code editor with extensions |

### VS Code Recommended Extensions

If using VS Code, install these extensions for the best development experience:

- **Python** (`ms-python.python`) - Python language support
- **Pylance** (`ms-python.vscode-pylance`) - Python IntelliSense
- **ESLint** (`dbaeumer.vscode-eslint`) - JavaScript/TypeScript linting
- **Prettier** (`esbenp.prettier-vscode`) - Code formatting
- **Tailwind CSS IntelliSense** (`bradlc.vscode-tailwindcss`) - Tailwind autocomplete
- **Docker** (`ms-azuretools.vscode-docker`) - Docker support
- **Thunder Client** (`rangav.vscode-thunder-client`) - REST API testing

---

## Environment Setup

### Clone the Repository

```bash
# Clone the repository
git clone https://github.com/your-org/meta-stamp-v3.git

# Navigate to project directory
cd meta-stamp-v3
```

### Backend Setup

The backend uses Python 3.11+ with Poetry for dependency management.

#### 1. Navigate to Backend Directory

```bash
cd backend
```

#### 2. Install Poetry (if not already installed)

```bash
# Using the official installer
curl -sSL https://install.python-poetry.org | python3 -

# Or using pipx (recommended)
pipx install poetry

# Verify installation
poetry --version
```

#### 3. Configure Poetry Virtual Environment

```bash
# Configure Poetry to create virtual environment in project directory
poetry config virtualenvs.in-project true
```

#### 4. Install Dependencies

```bash
# Install all dependencies (production + development)
poetry install

# Verify installation
poetry show
```

#### 5. Activate Virtual Environment

```bash
# Activate the virtual environment
poetry shell

# Or prefix commands with `poetry run`
poetry run python --version
```

### Frontend Setup

The frontend uses React 18 with TypeScript, Vite, and TailwindCSS.

#### 1. Navigate to Frontend Directory

```bash
cd frontend
```

#### 2. Install Dependencies

```bash
# Install all npm packages
npm install

# Verify installation
npm list --depth=0
```

### Environment Variables

Both backend and frontend require environment variables to be configured.

#### Backend Environment Variables

```bash
# Navigate to backend directory
cd backend

# Copy the example environment file
cp .env.example .env

# Edit the .env file with your configuration
```

**Key Backend Environment Variables:**

```bash
# Application Settings
APP_NAME=META-STAMP-V3
APP_ENV=development
DEBUG=true
LOG_LEVEL=info
SECRET_KEY=your-secret-key-here-change-in-production

# Server Configuration
HOST=0.0.0.0
PORT=8000
CORS_ORIGINS=http://localhost:3000,http://localhost:5173

# MongoDB Configuration
MONGODB_URI=mongodb://admin:password@localhost:27017/
MONGODB_DB_NAME=metastamp
MONGODB_MIN_POOL_SIZE=10
MONGODB_MAX_POOL_SIZE=100

# Redis Configuration
REDIS_URL=redis://localhost:6379/0
REDIS_CACHE_TTL_SECONDS=300

# S3/MinIO Storage
S3_ENDPOINT_URL=http://localhost:9000
S3_ACCESS_KEY_ID=minioadmin
S3_SECRET_ACCESS_KEY=minioadmin
S3_BUCKET_NAME=metastamp-assets
S3_REGION=us-east-1
PRESIGNED_URL_EXPIRATION_SECONDS=900

# Auth0 Configuration (Optional - falls back to local JWT)
AUTH0_DOMAIN=your-tenant.auth0.com
AUTH0_API_AUDIENCE=https://api.metastamp.com
AUTH0_CLIENT_ID=your-client-id
AUTH0_CLIENT_SECRET=your-client-secret
JWT_ALGORITHM=HS256
JWT_EXPIRATION_HOURS=24

# LangChain AI Providers (add keys for providers you want to use)
OPENAI_API_KEY=sk-your-openai-key
ANTHROPIC_API_KEY=sk-ant-your-anthropic-key
GOOGLE_API_KEY=your-google-api-key
DEFAULT_AI_PROVIDER=openai
DEFAULT_AI_MODEL=gpt-4

# File Upload Settings
MAX_UPLOAD_SIZE_MB=500
DIRECT_UPLOAD_THRESHOLD_MB=10
```

#### Frontend Environment Variables

```bash
# Navigate to frontend directory
cd frontend

# Copy the example environment file
cp .env.example .env

# Edit the .env file with your configuration
```

**Key Frontend Environment Variables:**

```bash
# Backend API Configuration
VITE_API_URL=http://localhost:8000

# Auth0 Configuration
VITE_AUTH0_DOMAIN=your-tenant.auth0.com
VITE_AUTH0_CLIENT_ID=your-client-id
VITE_AUTH0_AUDIENCE=https://api.metastamp.com

# Feature Flags
VITE_ENABLE_WEBSOCKET=true
VITE_ENABLE_AI_ASSISTANT=true
VITE_ENABLE_DARK_MODE=true

# Upload Configuration
VITE_MAX_UPLOAD_SIZE_MB=500
VITE_DIRECT_UPLOAD_THRESHOLD_MB=10

# Environment
VITE_APP_ENV=development
```

> **Note:** Environment variables in Vite must be prefixed with `VITE_` to be exposed to the frontend application.

---

## Running Services

### Docker Compose (Recommended)

The easiest way to run all services is using Docker Compose. This starts MongoDB, Redis, MinIO, backend, and frontend with proper networking.

#### Start All Services

```bash
# From the project root directory
docker compose up

# Or run in detached mode (background)
docker compose up -d

# View logs when running in detached mode
docker compose logs -f
```

#### Start with Development Overrides

For development with hot-reload and debug ports:

```bash
# Use both compose files for development
docker compose -f docker-compose.yml -f docker-compose.dev.yml up
```

#### Stop Services

```bash
# Stop all services
docker compose down

# Stop and remove volumes (WARNING: deletes all data)
docker compose down -v
```

#### Rebuild Services

```bash
# Rebuild and restart services after code changes
docker compose up --build

# Rebuild a specific service
docker compose build backend
docker compose up backend
```

### Running Services Independently

For more control during development, you can run services independently.

#### 1. Start Infrastructure Services

```bash
# Start only MongoDB, Redis, and MinIO
docker compose up mongodb redis minio -d
```

#### 2. Run Backend (FastAPI)

```bash
# Navigate to backend directory
cd backend

# Activate virtual environment
poetry shell

# Run the FastAPI development server
poetry run uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload

# Or using the defined script
poetry run dev
```

The backend will be available at `http://localhost:8000`.

#### 3. Run Frontend (Vite)

```bash
# Navigate to frontend directory
cd frontend

# Run the Vite development server
npm run dev

# Or with explicit host binding
npm run dev -- --host 0.0.0.0
```

The frontend will be available at `http://localhost:5173` (or `http://localhost:3000` in Docker).

### Service Endpoints

When running locally, services are available at:

| Service | Port | URL | Purpose |
|---------|------|-----|---------|
| **Frontend** | 5173 (dev) / 3000 (Docker) | http://localhost:5173 | React web application |
| **Backend API** | 8000 | http://localhost:8000 | FastAPI REST API |
| **API Documentation** | 8000 | http://localhost:8000/docs | Swagger UI |
| **API ReDoc** | 8000 | http://localhost:8000/redoc | ReDoc documentation |
| **MongoDB** | 27017 | mongodb://localhost:27017 | Database |
| **Redis** | 6379 | redis://localhost:6379 | Cache |
| **MinIO API** | 9000 | http://localhost:9000 | S3-compatible storage API |
| **MinIO Console** | 9001 | http://localhost:9001 | MinIO web console |

#### MinIO Console Access

To access the MinIO web console:

1. Open `http://localhost:9001` in your browser
2. Login with credentials:
   - **Username:** `minioadmin`
   - **Password:** `minioadmin`
3. Create the `metastamp-assets` bucket if it doesn't exist

---

## Code Quality Tools

META-STAMP V3 enforces strict code quality standards using automated formatters and linters.

### Backend (Python)

#### Black Formatter

Black is used for consistent Python code formatting with a line length of 100 characters.

```bash
cd backend

# Format all Python files
poetry run black .

# Check formatting without making changes
poetry run black --check .

# Format specific files
poetry run black app/services/upload_service.py
```

**Configuration** (in `pyproject.toml`):
```toml
[tool.black]
line-length = 100
target-version = ["py311"]
include = '\.pyi?$'
extend-exclude = '''
/(
  \.venv
  | build
  | dist
)/
'''
```

#### Ruff Linter

Ruff is a fast Python linter that combines multiple linting tools.

```bash
cd backend

# Run linter
poetry run ruff check .

# Auto-fix fixable issues
poetry run ruff check --fix .

# Show specific rule violations
poetry run ruff check --select E,F,I .
```

**Configuration** (in `ruff.toml`):
```toml
line-length = 100
target-version = "py311"

[lint]
select = ["E", "F", "I", "N", "W", "UP", "B"]
ignore = ["E501", "B008"]

[lint.isort]
known-first-party = ["app"]
```

#### Type Checking with MyPy

```bash
cd backend

# Run type checker
poetry run mypy app/

# Run with strict mode
poetry run mypy --strict app/
```

#### Running All Backend Quality Checks

```bash
cd backend

# Run formatter, linter, and type checker
poetry run black --check .
poetry run ruff check .
poetry run mypy app/
```

### Frontend (TypeScript/React)

#### ESLint

ESLint is used for JavaScript/TypeScript linting with React-specific rules.

```bash
cd frontend

# Run linter
npm run lint

# Auto-fix fixable issues
npm run lint -- --fix

# Lint specific files
npx eslint src/components/SmartUploader.tsx
```

**Configuration** (in `.eslintrc.json`):
```json
{
  "parser": "@typescript-eslint/parser",
  "plugins": ["@typescript-eslint", "react", "react-hooks"],
  "extends": [
    "eslint:recommended",
    "plugin:@typescript-eslint/recommended",
    "plugin:react/recommended",
    "plugin:react-hooks/recommended",
    "prettier"
  ],
  "rules": {
    "react/react-in-jsx-scope": "off",
    "react/prop-types": "off"
  }
}
```

#### Prettier

Prettier is used for consistent code formatting.

```bash
cd frontend

# Format all files
npm run format

# Check formatting without making changes
npx prettier --check "src/**/*.{ts,tsx,css}"

# Format specific files
npx prettier --write src/components/SmartUploader.tsx
```

**Configuration** (in `.prettierrc`):
```json
{
  "printWidth": 80,
  "tabWidth": 2,
  "useTabs": false,
  "semi": true,
  "singleQuote": true,
  "trailingComma": "es5",
  "bracketSpacing": true,
  "jsxSingleQuote": false,
  "arrowParens": "always",
  "endOfLine": "lf"
}
```

#### Running All Frontend Quality Checks

```bash
cd frontend

# Run linter and format check
npm run lint
npx prettier --check "src/**/*.{ts,tsx,css}"
```

### Pre-commit Hooks

Set up pre-commit hooks to automatically run quality checks before each commit.

#### Installation

```bash
# Install pre-commit (if not already installed)
pip install pre-commit

# Install the pre-commit hooks
pre-commit install
```

#### Configuration (`.pre-commit-config.yaml`)

Create this file in the project root:

```yaml
repos:
  # Backend hooks
  - repo: https://github.com/psf/black
    rev: 25.11.0
    hooks:
      - id: black
        language_version: python3.11
        args: [--line-length=100]
        files: ^backend/

  - repo: https://github.com/astral-sh/ruff-pre-commit
    rev: v0.14.6
    hooks:
      - id: ruff
        args: [--fix]
        files: ^backend/

  # Frontend hooks
  - repo: local
    hooks:
      - id: eslint
        name: eslint
        entry: bash -c 'cd frontend && npm run lint'
        language: system
        types: [javascript, jsx, ts, tsx]
        files: ^frontend/src/

      - id: prettier
        name: prettier
        entry: bash -c 'cd frontend && npx prettier --check "src/**/*.{ts,tsx,css}"'
        language: system
        files: ^frontend/src/
```

#### Running Pre-commit Manually

```bash
# Run on all files
pre-commit run --all-files

# Run specific hook
pre-commit run black --all-files

# Skip hooks for a commit (use sparingly)
git commit --no-verify -m "Emergency fix"
```

---

## Testing

META-STAMP V3 uses comprehensive testing with pytest for the backend and Vitest/React Testing Library for the frontend.

### Backend Tests

#### Running Tests

```bash
cd backend

# Run all tests
poetry run pytest

# Run with verbose output
poetry run pytest -v

# Run specific test file
poetry run pytest tests/test_upload.py

# Run specific test function
poetry run pytest tests/test_upload.py::test_direct_upload_success

# Run tests matching a pattern
poetry run pytest -k "upload"
```

#### Test Coverage

```bash
# Run tests with coverage report
poetry run pytest --cov=app --cov-report=term-missing

# Generate HTML coverage report
poetry run pytest --cov=app --cov-report=html
# Open htmlcov/index.html in browser

# Run with minimum coverage threshold
poetry run pytest --cov=app --cov-fail-under=80
```

#### Test Categories

Tests are organized using pytest markers:

```bash
# Run only unit tests
poetry run pytest -m unit

# Run only integration tests
poetry run pytest -m integration

# Run only async tests
poetry run pytest -m asyncio

# Skip slow tests
poetry run pytest -m "not slow"
```

#### Writing Backend Tests

Test files should be placed in `backend/tests/` and follow the naming convention `test_*.py`.

**Example Test Structure:**

```python
# backend/tests/test_upload.py
import pytest
from httpx import AsyncClient
from app.main import app

@pytest.fixture
async def async_client():
    async with AsyncClient(app=app, base_url="http://test") as client:
        yield client

@pytest.mark.asyncio
async def test_upload_text_success(async_client):
    """Test successful text file upload."""
    files = {"file": ("test.txt", b"Hello, World!", "text/plain")}
    response = await async_client.post("/api/v1/upload/text", files=files)
    
    assert response.status_code == 200
    assert "asset_id" in response.json()

@pytest.mark.asyncio
async def test_upload_rejects_zip_files(async_client):
    """Test that ZIP files are rejected."""
    files = {"file": ("test.zip", b"PK...", "application/zip")}
    response = await async_client.post("/api/v1/upload/text", files=files)
    
    assert response.status_code == 415
    assert "not allowed" in response.json()["detail"].lower()
```

#### Test Fixtures

Common fixtures are defined in `backend/tests/conftest.py`:

```python
# backend/tests/conftest.py
import pytest
import pytest_asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from redis.asyncio import Redis

@pytest_asyncio.fixture
async def test_db():
    """Provide a test MongoDB database."""
    client = AsyncIOMotorClient("mongodb://localhost:27017")
    db = client.test_metastamp
    yield db
    # Cleanup after tests
    await client.drop_database("test_metastamp")
    client.close()

@pytest_asyncio.fixture
async def test_redis():
    """Provide a test Redis connection."""
    redis = Redis.from_url("redis://localhost:6379/1")
    yield redis
    await redis.flushdb()
    await redis.close()

@pytest.fixture
def mock_s3_client(mocker):
    """Mock S3 client for storage tests."""
    return mocker.patch("app.core.storage.s3_client")
```

### Frontend Tests

#### Running Tests

```bash
cd frontend

# Run all tests
npm test

# Run tests in watch mode
npm test -- --watch

# Run specific test file
npm test -- src/components/SmartUploader.test.tsx

# Run with coverage
npm test -- --coverage
```

#### Writing Frontend Tests

Test files should be placed alongside components with the `.test.tsx` extension.

**Example Component Test:**

```tsx
// frontend/src/components/SmartUploader.test.tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import SmartUploader from './SmartUploader';

describe('SmartUploader', () => {
  it('renders upload zone', () => {
    render(<SmartUploader />);
    
    expect(screen.getByText(/drag and drop/i)).toBeInTheDocument();
  });

  it('handles file selection', async () => {
    const onUpload = vi.fn();
    render(<SmartUploader onUpload={onUpload} />);
    
    const input = screen.getByTestId('file-input');
    const file = new File(['hello'], 'hello.txt', { type: 'text/plain' });
    
    fireEvent.change(input, { target: { files: [file] } });
    
    expect(onUpload).toHaveBeenCalledWith(expect.any(File));
  });

  it('rejects files larger than threshold', async () => {
    render(<SmartUploader maxSizeMB={10} />);
    
    const input = screen.getByTestId('file-input');
    const largeFile = new File(['x'.repeat(15 * 1024 * 1024)], 'large.txt');
    
    fireEvent.change(input, { target: { files: [largeFile] } });
    
    expect(screen.getByText(/file too large/i)).toBeInTheDocument();
  });
});
```

#### Test Utilities

Common test utilities and mocks:

```tsx
// frontend/src/test/test-utils.tsx
import { render, RenderOptions } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from '@/contexts/AuthContext';

const AllProviders = ({ children }: { children: React.ReactNode }) => {
  return (
    <BrowserRouter>
      <AuthProvider>
        {children}
      </AuthProvider>
    </BrowserRouter>
  );
};

const customRender = (ui: React.ReactElement, options?: RenderOptions) =>
  render(ui, { wrapper: AllProviders, ...options });

export * from '@testing-library/react';
export { customRender as render };
```

### Running Full Test Suite

To run all tests for both backend and frontend:

```bash
# From project root
# Run backend tests
cd backend && poetry run pytest -v && cd ..

# Run frontend tests
cd frontend && npm test && cd ..

# Or create a script
#!/bin/bash
echo "Running backend tests..."
(cd backend && poetry run pytest -v)
echo "Running frontend tests..."
(cd frontend && npm test)
```

#### CI/CD Test Commands

For continuous integration:

```bash
# Backend CI tests
cd backend
poetry install
poetry run pytest --cov=app --cov-report=xml --cov-fail-under=80

# Frontend CI tests
cd frontend
npm ci
npm test -- --coverage --watchAll=false
```

---

## Git Workflow

### Branching Strategy

META-STAMP V3 uses a feature branch workflow with the following conventions:

| Branch | Purpose |
|--------|---------|
| `main` | Production-ready code |
| `develop` | Integration branch for features |
| `feature/*` | New feature development |
| `bugfix/*` | Bug fixes |
| `hotfix/*` | Urgent production fixes |
| `release/*` | Release preparation |

#### Creating a Feature Branch

```bash
# Ensure you're on the latest develop branch
git checkout develop
git pull origin develop

# Create and switch to a new feature branch
git checkout -b feature/your-feature-name

# Example: Adding new upload endpoint
git checkout -b feature/add-video-upload
```

#### Feature Branch Naming

Use descriptive names with the following prefixes:

- `feature/` - New features (e.g., `feature/ai-assistant-streaming`)
- `bugfix/` - Bug fixes (e.g., `bugfix/upload-validation-error`)
- `hotfix/` - Urgent fixes (e.g., `hotfix/security-patch`)
- `docs/` - Documentation updates (e.g., `docs/api-documentation`)
- `refactor/` - Code refactoring (e.g., `refactor/fingerprinting-service`)

### Commit Message Conventions

Follow the Conventional Commits specification:

```
<type>(<scope>): <description>

[optional body]

[optional footer(s)]
```

#### Commit Types

| Type | Description |
|------|-------------|
| `feat` | A new feature |
| `fix` | A bug fix |
| `docs` | Documentation changes |
| `style` | Code style changes (formatting, no logic change) |
| `refactor` | Code refactoring |
| `test` | Adding or updating tests |
| `chore` | Maintenance tasks |
| `perf` | Performance improvements |

#### Examples

```bash
# Feature commit
git commit -m "feat(upload): add support for audio file uploads"

# Bug fix commit
git commit -m "fix(auth): resolve JWT token expiration issue"

# Documentation commit
git commit -m "docs(api): add endpoint documentation for fingerprinting"

# Breaking change (add ! after type)
git commit -m "feat(api)!: change upload response format"

# Multi-line commit with body
git commit -m "feat(assistant): implement streaming responses

- Add Server-Sent Events support
- Implement chunked response handling
- Add conversation context management

Closes #123"
```

### Pull Request Process

#### 1. Push Your Branch

```bash
# Push your feature branch
git push origin feature/your-feature-name
```

#### 2. Create Pull Request

- Open a Pull Request (PR) on GitHub
- Use a descriptive title following commit conventions
- Fill out the PR template

#### 3. PR Requirements Checklist

Before requesting review, ensure:

- [ ] All tests pass (`poetry run pytest` and `npm test`)
- [ ] Code is formatted (`black`, `prettier`)
- [ ] Linting passes (`ruff`, `eslint`)
- [ ] Documentation is updated (if applicable)
- [ ] No new warnings or errors
- [ ] PR title follows commit conventions
- [ ] PR description explains the changes

#### 4. Code Review

- At least one approval is required
- Address all review comments
- Re-request review after making changes

#### 5. Merging

- Squash and merge is preferred for feature branches
- Ensure branch is up to date with `develop`
- Delete branch after merging

#### PR Template

```markdown
## Description

Brief description of the changes.

## Type of Change

- [ ] Bug fix (non-breaking change that fixes an issue)
- [ ] New feature (non-breaking change that adds functionality)
- [ ] Breaking change (fix or feature that changes existing functionality)
- [ ] Documentation update

## How Has This Been Tested?

Describe the tests you ran to verify your changes.

## Checklist

- [ ] My code follows the project's style guidelines
- [ ] I have performed a self-review of my code
- [ ] I have commented my code where necessary
- [ ] I have made corresponding changes to the documentation
- [ ] My changes generate no new warnings
- [ ] I have added tests that prove my fix/feature works
- [ ] New and existing unit tests pass locally
```

---

## Troubleshooting

### Common Issues and Solutions

#### MongoDB Connection Errors

**Error:** `ServerSelectionTimeoutError: localhost:27017`

**Solutions:**

1. Verify MongoDB is running:
   ```bash
   docker compose ps mongodb
   # Or check local installation
   systemctl status mongodb
   ```

2. Check connection string in `.env`:
   ```bash
   # For Docker
   MONGODB_URI=mongodb://admin:password@mongodb:27017/
   
   # For local
   MONGODB_URI=mongodb://admin:password@localhost:27017/
   ```

3. Verify network connectivity:
   ```bash
   # Test connection
   mongosh "mongodb://admin:password@localhost:27017"
   ```

4. Check Docker network:
   ```bash
   docker network inspect meta-stamp-v3_metastamp-network
   ```

---

#### Redis Connection Failures

**Error:** `ConnectionError: Error connecting to Redis at localhost:6379`

**Solutions:**

1. Verify Redis is running:
   ```bash
   docker compose ps redis
   ```

2. Check Redis URL in `.env`:
   ```bash
   # For Docker
   REDIS_URL=redis://redis:6379/0
   
   # For local
   REDIS_URL=redis://localhost:6379/0
   ```

3. Test Redis connection:
   ```bash
   redis-cli -h localhost -p 6379 ping
   # Expected: PONG
   ```

4. Check Redis logs:
   ```bash
   docker compose logs redis
   ```

---

#### MinIO Bucket Creation Issues

**Error:** `Bucket does not exist: metastamp-assets`

**Solutions:**

1. Access MinIO Console at `http://localhost:9001`

2. Login with credentials (`minioadmin`/`minioadmin`)

3. Create bucket manually:
   - Click "Create Bucket"
   - Name: `metastamp-assets`
   - Click "Create"

4. Or create bucket via CLI:
   ```bash
   # Install MinIO client
   brew install minio/stable/mc
   
   # Configure MinIO alias
   mc alias set local http://localhost:9000 minioadmin minioadmin
   
   # Create bucket
   mc mb local/metastamp-assets
   ```

5. Verify bucket exists:
   ```bash
   mc ls local/
   ```

---

#### Auth0 Configuration Errors

**Error:** `Auth0 domain not configured, using local JWT`

**Note:** This is a warning, not an error. The system falls back to local JWT authentication when Auth0 is not configured.

**To configure Auth0:**

1. Create Auth0 account at [auth0.com](https://auth0.com)

2. Create a new API:
   - Name: META-STAMP V3 API
   - Identifier: `https://api.metastamp.com`

3. Create a new Application:
   - Type: Single Page Application
   - Note the Client ID

4. Update `.env` files:
   ```bash
   # Backend
   AUTH0_DOMAIN=your-tenant.auth0.com
   AUTH0_API_AUDIENCE=https://api.metastamp.com
   AUTH0_CLIENT_ID=your-client-id
   AUTH0_CLIENT_SECRET=your-client-secret
   
   # Frontend
   VITE_AUTH0_DOMAIN=your-tenant.auth0.com
   VITE_AUTH0_CLIENT_ID=your-client-id
   VITE_AUTH0_AUDIENCE=https://api.metastamp.com
   ```

---

#### LangChain API Key Errors

**Error:** `OpenAIError: Invalid API Key`

**Solutions:**

1. Verify API key format:
   - OpenAI: Starts with `sk-`
   - Anthropic: Starts with `sk-ant-`
   - Google: Check Google AI Studio

2. Check `.env` file:
   ```bash
   OPENAI_API_KEY=sk-your-actual-api-key
   ANTHROPIC_API_KEY=sk-ant-your-actual-api-key
   GOOGLE_API_KEY=your-google-api-key
   ```

3. Test API key:
   ```bash
   # OpenAI
   curl https://api.openai.com/v1/models \
     -H "Authorization: Bearer $OPENAI_API_KEY"
   ```

4. Switch to a different provider:
   ```bash
   DEFAULT_AI_PROVIDER=anthropic
   DEFAULT_AI_MODEL=claude-3-5-sonnet
   ```

---

#### Port Conflicts

**Error:** `Address already in use: 0.0.0.0:8000`

**Solutions:**

1. Find process using the port:
   ```bash
   # macOS/Linux
   lsof -i :8000
   
   # Windows
   netstat -ano | findstr :8000
   ```

2. Kill the process:
   ```bash
   # macOS/Linux
   kill -9 <PID>
   
   # Windows
   taskkill /PID <PID> /F
   ```

3. Use a different port:
   ```bash
   # Backend
   poetry run uvicorn app.main:app --port 8001
   
   # Frontend
   npm run dev -- --port 3001
   ```

4. Stop Docker containers using the port:
   ```bash
   docker compose down
   ```

---

#### Dependency Installation Issues

**Backend (Poetry):**

```bash
# Clear Poetry cache
poetry cache clear pypi --all

# Remove and reinstall dependencies
rm -rf .venv poetry.lock
poetry install

# Use verbose mode for debugging
poetry install -vvv
```

**Frontend (npm):**

```bash
# Clear npm cache
npm cache clean --force

# Remove and reinstall dependencies
rm -rf node_modules package-lock.json
npm install

# Use verbose mode for debugging
npm install --loglevel verbose
```

---

#### Docker Build Failures

**Error:** `failed to solve: process "/bin/sh -c ..." did not complete successfully`

**Solutions:**

1. Rebuild without cache:
   ```bash
   docker compose build --no-cache
   ```

2. Check Dockerfile syntax:
   ```bash
   docker build -t test-build ./backend
   ```

3. Increase Docker resources (in Docker Desktop settings):
   - Memory: 8GB minimum
   - CPUs: 4 minimum

4. Check disk space:
   ```bash
   docker system df
   docker system prune -a  # WARNING: Removes all unused data
   ```

---

#### Hot Reload Not Working

**Backend:**

1. Ensure `--reload` flag is set:
   ```bash
   poetry run uvicorn app.main:app --reload
   ```

2. Check if file is in watched directories

3. Use development Docker Compose:
   ```bash
   docker compose -f docker-compose.yml -f docker-compose.dev.yml up
   ```

**Frontend:**

1. Check Vite server output for errors

2. Clear Vite cache:
   ```bash
   rm -rf node_modules/.vite
   npm run dev
   ```

3. Verify file is being watched:
   ```bash
   # Should see "change detected" in Vite output
   ```

---

## Additional Resources

### Documentation

- [API Documentation](./API.md) - Complete REST API reference
- [Architecture Guide](./ARCHITECTURE.md) - System architecture overview
- [Deployment Guide](./DEPLOYMENT.md) - Production deployment instructions

### External Resources

- [FastAPI Documentation](https://fastapi.tiangolo.com/)
- [React Documentation](https://react.dev/)
- [TailwindCSS Documentation](https://tailwindcss.com/docs)
- [LangChain Documentation](https://python.langchain.com/docs/)
- [Docker Compose Documentation](https://docs.docker.com/compose/)

### Getting Help

- **Issues:** Open a GitHub issue for bugs or feature requests
- **Discussions:** Use GitHub Discussions for questions
- **Slack:** Join our development Slack channel (if available)

### Contributing

We welcome contributions! Please read our contributing guidelines before submitting pull requests.

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Write tests for new functionality
5. Ensure all tests pass
6. Submit a pull request

---

**Happy Coding!** 🚀

If you have questions or need help, don't hesitate to reach out to the team.
