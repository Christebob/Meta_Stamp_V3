# META-STAMP V3

> A Global Compensation Foundation Between AI Companies and Creators

[![Python 3.11+](https://img.shields.io/badge/python-3.11+-blue.svg)](https://www.python.org/downloads/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.122.0-009688.svg)](https://fastapi.tiangolo.com/)
[![React 18](https://img.shields.io/badge/React-18.3.1-61DAFB.svg)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-3178C6.svg)](https://www.typescriptlang.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

---

## Table of Contents

- [Overview](#overview)
- [Key Features](#key-features)
- [Architecture](#architecture)
- [Prerequisites](#prerequisites)
- [Quick Start](#quick-start)
- [Development Workflow](#development-workflow)
- [Environment Configuration](#environment-configuration)
- [API Endpoints](#api-endpoints)
- [Project Structure](#project-structure)
- [Testing](#testing)
- [Code Quality](#code-quality)
- [Contributing](#contributing)
- [Security](#security)
- [Phase 2 Roadmap](#phase-2-roadmap)
- [Documentation](#documentation)
- [License](#license)

---

## Overview

**META-STAMP V3** is a comprehensive, end-to-end creator-protection platform designed to serve as a global compensation foundation between AI companies and creators. The system provides sophisticated tools for tracking, fingerprinting, and valuing creative assets in the context of AI training and usage.

The platform enables creators to:
- **Register and protect** their creative works through multi-modal fingerprinting
- **Track potential AI usage** of their content (Phase 2)
- **Calculate fair compensation** using the proprietary AI Touch Value™ formula
- **Manage earnings** through an integrated wallet system
- **Receive guidance** from an AI-powered assistant

META-STAMP V3 is built with a cloud-agnostic architecture, ensuring flexibility in deployment while maintaining enterprise-grade security and scalability.

---

## Key Features

### 🔐 Multi-Modal Fingerprinting Engine
Uniquely identify and track creative assets across multiple content types:
- **Text**: Document analysis and content hashing
- **Images**: Perceptual hashing (pHash, aHash, dHash) and CLIP embeddings
- **Audio**: Spectral analysis using mel-spectrograms and chromagrams
- **Video**: Frame extraction and temporal fingerprinting
- **Web Content**: URL-based content extraction (YouTube, Vimeo, webpages)

### 🤖 AI Training Detection (Phase 2)
Placeholder infrastructure for future capabilities:
- Dataset comparison engine
- Embedding drift analysis
- Similarity-law threshold detection
- Legal evidence documentation

### 💰 AI Touch Value™ Calculation
Proprietary compensation estimation engine:
```
AI Touch Value™ = ModelEarnings × (TrainingContributionScore/100) × (UsageExposureScore/100) × EquityFactor
```
- **EquityFactor**: Fixed at 0.25 (25% creator equity)
- Real-time value projections based on creator metrics

### 📤 Hybrid Upload Architecture
Smart file handling optimized for all file sizes:
- **Direct Upload** (<10MB): Standard multipart/form-data processing
- **Presigned URL Upload** (>10MB): S3-compatible direct upload with resumable multipart support
- **URL Import**: YouTube transcript extraction, Vimeo metadata, webpage scraping

### 📊 Universal Dashboard
Comprehensive creator interface featuring:
- Asset status and management
- Fingerprint summaries and visualizations
- AI Touch Score™ display
- Value projections and analytics
- Wallet balance and transaction history
- Legal documentation previews (Phase 2)

### 🧠 Multi-Provider AI Assistant
LangChain-powered intelligent assistant supporting:
- **OpenAI GPT-4/5**: Advanced reasoning and analysis
- **Anthropic Claude**: Nuanced conversation and guidance
- **Google Gemini**: Multi-modal understanding
- **Local Models**: Privacy-focused alternatives
- Tool calling for real-time data queries
- Streaming responses for interactive experience

---

## Architecture

META-STAMP V3 follows a modern microservices architecture with clear separation of concerns:

```
┌─────────────────────────────────────────────────────────────────────────┐
│                              Client Layer                                │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │         React 18 + TypeScript + Vite + TailwindCSS              │   │
│  │    (Dashboard, Uploader, Wallet, AI Assistant Components)       │   │
│  └─────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                              API Layer                                   │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │              FastAPI + Uvicorn (Python 3.11+)                   │   │
│  │         /api/v1 (Upload, Fingerprint, Analytics, Auth)         │   │
│  └─────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
          ┌─────────────────────────┼─────────────────────────┐
          ▼                         ▼                         ▼
┌───────────────────┐   ┌───────────────────┐   ┌───────────────────┐
│     MongoDB       │   │      Redis        │   │   MinIO/S3        │
│  (Document Store) │   │  (Cache/Session)  │   │ (Object Storage)  │
│   - Assets        │   │   - Sessions      │   │  - Original Files │
│   - Fingerprints  │   │   - Cache         │   │  - Multipart      │
│   - Users         │   │   - AI Context    │   │    Uploads        │
│   - Transactions  │   │                   │   │                   │
└───────────────────┘   └───────────────────┘   └───────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                         AI/ML Integration                                │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                     LangChain Framework                          │   │
│  │   ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐       │   │
│  │   │  OpenAI  │  │Anthropic │  │  Google  │  │  Local   │       │   │
│  │   │ GPT-4/5  │  │  Claude  │  │  Gemini  │  │  Models  │       │   │
│  │   └──────────┘  └──────────┘  └──────────┘  └──────────┘       │   │
│  └─────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────┘
```

### Technology Stack

| Component | Technology | Purpose |
|-----------|------------|---------|
| **Backend Framework** | FastAPI 0.122.0 | Async API with auto-generated OpenAPI docs |
| **Frontend Framework** | React 18 + TypeScript | Component-based UI with type safety |
| **Build Tool** | Vite 6.2 | Fast development server and optimized builds |
| **CSS Framework** | TailwindCSS 3.4 | Utility-first styling |
| **Database** | MongoDB 8.0 | Document storage for assets and metadata |
| **Cache** | Redis 7.4 | Session management and caching |
| **Object Storage** | MinIO / S3 | File storage with presigned URL support |
| **AI Framework** | LangChain 1.1 | Multi-provider LLM integration |
| **Authentication** | Auth0 + JWT | Enterprise auth with local fallback |

---

## Prerequisites

Before you begin, ensure you have the following installed:

| Requirement | Version | Purpose |
|-------------|---------|---------|
| **Python** | 3.11+ | Backend runtime |
| **Poetry** | 2.2+ | Python dependency management |
| **Node.js** | 20+ | Frontend runtime |
| **npm** | 10+ | Frontend package management |
| **Docker** | 24+ | Container runtime |
| **Docker Compose** | 2.20+ | Multi-service orchestration |

### Optional Requirements

| Requirement | Purpose |
|-------------|---------|
| **Auth0 Account** | Production authentication (local JWT fallback available) |
| **OpenAI API Key** | GPT-4/5 AI assistant integration |
| **Anthropic API Key** | Claude AI assistant integration |
| **Google API Key** | Gemini AI assistant integration |

---

## Quick Start

### 1. Clone the Repository

```bash
git clone https://github.com/your-org/meta-stamp-v3.git
cd meta-stamp-v3
```

### 2. Configure Environment Variables

Copy the example environment files and configure them:

```bash
# Backend configuration
cp backend/.env.example backend/.env

# Frontend configuration
cp frontend/.env.example frontend/.env
```

Edit the `.env` files with your configuration (see [Environment Configuration](#environment-configuration) for details).

### 3. Start with Docker Compose

```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Check service status
docker-compose ps
```

### 4. Access the Application

| Service | URL | Description |
|---------|-----|-------------|
| **Frontend** | http://localhost:3000 | Main application |
| **Backend API** | http://localhost:8000 | REST API |
| **API Documentation** | http://localhost:8000/docs | Swagger UI |
| **MinIO Console** | http://localhost:9001 | S3 storage admin |

### 5. Verify Installation

```bash
# Check backend health
curl http://localhost:8000/health

# Expected response:
# {"status": "healthy", "version": "3.0.0"}
```

---

## Development Workflow

### Backend Development (Python/FastAPI)

```bash
cd backend

# Install dependencies with Poetry
poetry install

# Activate virtual environment
poetry shell

# Run development server with hot-reload
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

# Run tests
pytest -v

# Run tests with coverage
pytest --cov=app --cov-report=html

# Format code
black .

# Lint code
ruff check .

# Type checking
mypy app
```

### Frontend Development (React/TypeScript)

```bash
cd frontend

# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Run tests
npm run test

# Lint code
npm run lint

# Format code
npm run format
```

### Running Services Locally (Without Docker)

For local development without Docker, you'll need to run infrastructure services separately:

```bash
# Terminal 1: Start MongoDB
mongod --dbpath ./data/db

# Terminal 2: Start Redis
redis-server

# Terminal 3: Start MinIO
minio server ./data/minio --console-address ":9001"

# Terminal 4: Start Backend
cd backend && poetry run uvicorn app.main:app --reload

# Terminal 5: Start Frontend
cd frontend && npm run dev
```

---

## Environment Configuration

### Backend Environment Variables (`backend/.env`)

```bash
# Application
APP_NAME=meta-stamp-v3
APP_ENV=development
DEBUG=true
SECRET_KEY=your-secret-key-min-32-characters-long

# MongoDB
MONGODB_URI=mongodb://localhost:27017
MONGODB_DATABASE=metastamp

# Redis
REDIS_URL=redis://localhost:6379/0

# S3/MinIO Storage
S3_ENDPOINT_URL=http://localhost:9000
S3_ACCESS_KEY=minioadmin
S3_SECRET_KEY=minioadmin
S3_BUCKET_NAME=metastamp-assets
S3_REGION=us-east-1

# Authentication (Auth0)
# Leave empty to use local JWT fallback
AUTH0_DOMAIN=your-tenant.auth0.com
AUTH0_CLIENT_ID=your-client-id
AUTH0_CLIENT_SECRET=your-client-secret
AUTH0_AUDIENCE=https://api.metastamp.com

# LangChain AI Providers (at least one required for AI assistant)
OPENAI_API_KEY=sk-your-openai-key
ANTHROPIC_API_KEY=sk-ant-your-anthropic-key
GOOGLE_API_KEY=your-google-api-key

# Default AI Provider (openai, anthropic, google, local)
DEFAULT_AI_PROVIDER=openai
DEFAULT_AI_MODEL=gpt-4

# Upload Limits
MAX_UPLOAD_SIZE_MB=500
PRESIGNED_URL_EXPIRY_SECONDS=900
DIRECT_UPLOAD_THRESHOLD_MB=10
```

### Frontend Environment Variables (`frontend/.env`)

```bash
# API Configuration
VITE_API_URL=http://localhost:8000/api/v1

# Auth0 Configuration
VITE_AUTH0_DOMAIN=your-tenant.auth0.com
VITE_AUTH0_CLIENT_ID=your-client-id
VITE_AUTH0_AUDIENCE=https://api.metastamp.com

# Feature Flags
VITE_ENABLE_AI_ASSISTANT=true
VITE_ENABLE_WALLET=true
```

### Auth0 Configuration

If using Auth0 for production authentication:

1. Create an Auth0 application (Single Page Application for frontend, Machine to Machine for backend)
2. Configure allowed callback URLs: `http://localhost:3000/callback`
3. Configure allowed logout URLs: `http://localhost:3000`
4. Configure allowed web origins: `http://localhost:3000`
5. Create an API in Auth0 and note the identifier (audience)
6. Update `.env` files with your Auth0 credentials

**Note**: If Auth0 is not configured, the system automatically falls back to local JWT authentication with HS256 algorithm and 24-hour token expiration.

---

## API Endpoints

All API endpoints are versioned under `/api/v1`. For complete documentation, see [docs/API.md](docs/API.md) or visit the Swagger UI at http://localhost:8000/docs.

### Upload Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/upload/text` | Upload text content directly |
| `POST` | `/upload/image` | Upload image files |
| `POST` | `/upload/audio` | Upload audio files |
| `POST` | `/upload/video` | Upload video files |
| `POST` | `/upload/url` | Import content from URL |
| `GET` | `/upload/presigned-url` | Get S3 presigned URL for large uploads |
| `POST` | `/upload/confirmation` | Confirm S3 upload completion |

### Fingerprinting Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/fingerprint/{asset_id}` | Generate fingerprint for asset |
| `GET` | `/fingerprint/{fingerprint_id}` | Retrieve fingerprint data |

### Analytics Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/analytics/predict` | Calculate AI Touch Value™ |

### Asset Management Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/assets` | List all user assets (paginated) |
| `GET` | `/assets/{asset_id}` | Get specific asset details |
| `DELETE` | `/assets/{asset_id}` | Delete asset and associated data |

### Wallet Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/wallet/balance` | Get current wallet balance |
| `GET` | `/wallet/history` | Get transaction history |

### AI Assistant Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/assistant/ask` | Send query to AI assistant (streaming) |

### Authentication Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/auth/login` | Authenticate and receive JWT |
| `POST` | `/auth/logout` | Invalidate session |
| `GET` | `/auth/me` | Get current user profile |

---

## Project Structure

```
meta-stamp-v3/
├── backend/
│   ├── app/
│   │   ├── api/
│   │   │   └── v1/
│   │   │       ├── __init__.py
│   │   │       ├── upload.py          # Upload endpoints
│   │   │       ├── fingerprint.py     # Fingerprinting endpoints
│   │   │       ├── analytics.py       # AI Touch Value™ endpoints
│   │   │       ├── assets.py          # Asset management
│   │   │       ├── wallet.py          # Wallet endpoints
│   │   │       ├── assistant.py       # AI assistant endpoints
│   │   │       └── auth.py            # Authentication endpoints
│   │   ├── core/
│   │   │   ├── __init__.py
│   │   │   ├── auth.py                # Auth0/JWT handling
│   │   │   ├── database.py            # MongoDB connection
│   │   │   ├── redis_client.py        # Redis operations
│   │   │   └── storage.py             # S3/MinIO client
│   │   ├── models/
│   │   │   ├── __init__.py
│   │   │   ├── asset.py               # Asset models
│   │   │   ├── user.py                # User models
│   │   │   ├── wallet.py              # Wallet models
│   │   │   ├── analytics.py           # Analytics models
│   │   │   └── fingerprint.py         # Fingerprint models
│   │   ├── services/
│   │   │   ├── __init__.py
│   │   │   ├── upload_service.py      # Upload routing logic
│   │   │   ├── storage_service.py     # S3 operations
│   │   │   ├── fingerprinting_service.py  # Multi-modal fingerprinting
│   │   │   ├── ai_value_service.py    # AI Touch Value™ calculation
│   │   │   ├── ai_assistant_service.py    # LangChain integration
│   │   │   ├── metadata_service.py    # Metadata extraction
│   │   │   └── url_processor_service.py   # URL content extraction
│   │   ├── utils/
│   │   │   ├── __init__.py
│   │   │   ├── file_validator.py      # File validation
│   │   │   ├── cache.py               # Redis caching
│   │   │   ├── logger.py              # Logging configuration
│   │   │   └── security.py            # Security utilities
│   │   ├── __init__.py
│   │   ├── main.py                    # FastAPI application
│   │   └── config.py                  # Configuration management
│   ├── tests/
│   │   ├── __init__.py
│   │   ├── conftest.py                # Pytest fixtures
│   │   ├── test_upload.py
│   │   ├── test_fingerprint.py
│   │   ├── test_analytics.py
│   │   ├── test_ai_assistant.py
│   │   └── test_auth.py
│   ├── .env.example
│   ├── pyproject.toml                 # Poetry configuration
│   ├── pytest.ini
│   ├── ruff.toml
│   ├── Dockerfile
│   └── requirements.txt               # Generated for Docker
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── SmartUploader.tsx      # Intelligent uploader
│   │   │   ├── FileDropZone.tsx       # Drag-and-drop
│   │   │   ├── UploadProgress.tsx     # Progress indicator
│   │   │   ├── URLInput.tsx           # URL import
│   │   │   ├── AssetCard.tsx          # Asset display
│   │   │   ├── FingerprintSummary.tsx # Fingerprint display
│   │   │   ├── AITouchScore.tsx       # Score display
│   │   │   ├── AITouchValue.tsx       # Value display
│   │   │   ├── WalletBalance.tsx      # Balance display
│   │   │   ├── TransactionHistory.tsx # Transaction list
│   │   │   ├── AIAssistant.tsx        # Chat interface
│   │   │   ├── ChatMessage.tsx        # Chat message
│   │   │   ├── Navbar.tsx             # Navigation bar
│   │   │   ├── Sidebar.tsx            # Side navigation
│   │   │   └── Layout.tsx             # Page layout
│   │   ├── pages/
│   │   │   ├── Dashboard.tsx          # Main dashboard
│   │   │   ├── Upload.tsx             # Upload interface
│   │   │   ├── Assets.tsx             # Asset management
│   │   │   ├── Wallet.tsx             # Wallet page
│   │   │   ├── Login.tsx              # Login page
│   │   │   └── NotFound.tsx           # 404 page
│   │   ├── routes/
│   │   │   ├── index.tsx              # Route definitions
│   │   │   └── PrivateRoute.tsx       # Auth guard
│   │   ├── hooks/
│   │   │   ├── useAuth.tsx            # Authentication hook
│   │   │   ├── useUpload.tsx          # Upload management
│   │   │   ├── useAssets.tsx          # Asset data
│   │   │   ├── useWallet.tsx          # Wallet data
│   │   │   ├── useAIAssistant.tsx     # AI interaction
│   │   │   └── useWebSocket.tsx       # Real-time updates
│   │   ├── services/
│   │   │   ├── api.ts                 # Axios configuration
│   │   │   ├── authService.ts         # Auth API calls
│   │   │   ├── uploadService.ts       # Upload API
│   │   │   ├── assetService.ts        # Asset API
│   │   │   ├── walletService.ts       # Wallet API
│   │   │   ├── assistantService.ts    # AI assistant API
│   │   │   └── storageService.ts      # Local storage
│   │   ├── contexts/
│   │   │   ├── AuthContext.tsx        # Auth state
│   │   │   ├── UploadContext.tsx      # Upload state
│   │   │   └── ThemeContext.tsx       # Theme state
│   │   ├── types/
│   │   │   ├── asset.ts               # Asset types
│   │   │   ├── user.ts                # User types
│   │   │   ├── wallet.ts              # Wallet types
│   │   │   └── api.ts                 # API types
│   │   ├── styles/
│   │   │   └── index.css              # Global styles
│   │   ├── main.tsx                   # Entry point
│   │   ├── App.tsx                    # Root component
│   │   └── vite-env.d.ts              # Vite types
│   ├── .env.example
│   ├── vite.config.ts
│   ├── tsconfig.json
│   ├── tsconfig.node.json
│   ├── tailwind.config.js
│   ├── postcss.config.js
│   ├── .eslintrc.json
│   ├── .prettierrc
│   ├── package.json
│   ├── Dockerfile
│   └── index.html
│
├── docs/
│   ├── API.md                         # API documentation
│   ├── DEPLOYMENT.md                  # Deployment guide
│   ├── DEVELOPMENT.md                 # Development guide
│   └── ARCHITECTURE.md                # Architecture docs
│
├── scripts/
│   ├── init_db.py                     # Database initialization
│   ├── create_test_data.py            # Test data generation
│   ├── backup.sh                      # Backup automation
│   └── deploy.sh                      # Deployment script
│
├── docker-compose.yml                 # Service orchestration
├── docker-compose.dev.yml             # Development overrides
├── .gitignore
└── README.md
```

---

## Testing

### Backend Testing (pytest)

```bash
cd backend

# Run all tests
pytest -v

# Run specific test file
pytest tests/test_upload.py -v

# Run with coverage report
pytest --cov=app --cov-report=html --cov-report=term-missing

# Run async tests
pytest -v --asyncio-mode=auto

# Run with parallel execution
pytest -n auto
```

### Frontend Testing (Vitest + React Testing Library)

```bash
cd frontend

# Run all tests
npm run test

# Run tests in watch mode
npm run test:watch

# Run with coverage
npm run test:coverage

# Run specific test file
npm run test -- src/components/SmartUploader.test.tsx
```

### Test Coverage Requirements

| Component | Target Coverage |
|-----------|-----------------|
| Backend Services | 80%+ |
| Backend API Endpoints | 90%+ |
| Frontend Components | 70%+ |
| Frontend Hooks | 80%+ |

---

## Code Quality

### Backend (Python)

#### Black (Formatter)
```bash
# Format all Python files
black .

# Check without modifying
black --check .

# Show diff of changes
black --diff .
```

#### Ruff (Linter)
```bash
# Lint all files
ruff check .

# Auto-fix issues
ruff check --fix .

# Show detailed errors
ruff check --show-source .
```

#### MyPy (Type Checker)
```bash
# Run type checking
mypy app

# With strict mode
mypy app --strict
```

### Frontend (TypeScript)

#### ESLint
```bash
# Lint all files
npm run lint

# Auto-fix issues
npm run lint -- --fix
```

#### Prettier
```bash
# Format all files
npm run format

# Check formatting
npx prettier --check "src/**/*.{ts,tsx,css}"
```

### Pre-commit Hooks (Recommended)

Install pre-commit hooks to automatically run quality checks:

```bash
# Install pre-commit
pip install pre-commit

# Install hooks
pre-commit install

# Run manually on all files
pre-commit run --all-files
```

---

## Contributing

We welcome contributions to META-STAMP V3! Please follow these guidelines:

### Code Style

- **Python**: Follow PEP 8, enforced by Black (line length: 100) and Ruff
- **TypeScript**: Follow ESLint configuration with Prettier formatting
- **Commits**: Use conventional commits format (`feat:`, `fix:`, `docs:`, etc.)

### Pull Request Process

1. **Fork** the repository and create a feature branch
2. **Implement** your changes following our code style guidelines
3. **Write tests** for new functionality (maintain coverage targets)
4. **Run** all quality checks locally:
   ```bash
   # Backend
   cd backend && black . && ruff check . && pytest
   
   # Frontend
   cd frontend && npm run lint && npm run test
   ```
5. **Update documentation** if adding new features
6. **Submit** a pull request with a clear description

### Testing Requirements

- All new features must include unit tests
- Bug fixes should include regression tests
- Integration tests required for API endpoints
- UI components should have rendering tests

### Commit Message Format

```
<type>(<scope>): <description>

[optional body]

[optional footer]
```

Types: `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`

Example:
```
feat(upload): add resumable multipart upload support

- Implement S3 multipart upload initiation
- Add part tracking with ETags
- Support upload resume from last completed part

Closes #123
```

---

## Security

### File Upload Restrictions

META-STAMP V3 enforces strict file upload security:

#### Blocked File Types (REJECTED)
- **Archives**: `.zip`, `.rar`, `.7z`, `.tar`, `.gz`
- **Executables**: `.exe`, `.bin`, `.sh`, `.app`, `.msi`, `.iso`, `.dmg`
- **Scripts**: `.bat`, `.cmd`, `.ps1`

#### Allowed File Types
- **Text**: `.txt`, `.md`, `.pdf`
- **Images**: `.png`, `.jpg`, `.jpeg`, `.webp`
- **Audio**: `.mp3`, `.wav`, `.aac`
- **Video**: `.mp4`, `.mov`, `.avi`

#### Size Limits
- **Maximum file size**: 500 MB
- **Direct upload threshold**: 10 MB (larger files use presigned URLs)
- **Presigned URL expiration**: 15 minutes

### Authentication

- **Production**: Auth0 with RS256 JWT validation
- **Development**: Local JWT with HS256 (24-hour expiration)
- **All API routes** (except health/docs) require valid JWT
- **Token refresh** supported with sliding expiration

### Data Protection

- All passwords hashed with bcrypt (12+ rounds)
- Sensitive data encrypted at rest in MongoDB
- S3/MinIO presigned URLs for secure file access
- CORS configured to allow only trusted origins
- Input sanitization on all user-provided data

### Reporting Security Issues

If you discover a security vulnerability, please email security@metastamp.com instead of creating a public issue.

---

## Phase 2 Roadmap

The following features are planned for Phase 2 development and have placeholder infrastructure in the current codebase:

### AI Training Detection Engine
- Compare fingerprints against known AI training datasets
- Detect potential unauthorized usage of creator content
- Generate confidence scores for training detection

### Dataset Comparison Engine
- Integration with public AI dataset registries
- Embedding similarity matching at scale
- Batch processing for large creator portfolios

### Embedding Drift Analysis
- Track how creator content may have influenced model behavior
- Temporal analysis of embedding changes
- Pattern recognition for training signals

### Similarity-Law Thresholds
- Legal precedent-based similarity determination
- Jurisdiction-aware threshold configuration
- Expert review workflow integration

### Legal Export Module
- Court-ready documentation generation
- Chain of custody evidence packaging
- Expert witness report templates
- Timestamped proof of ownership

### Enhanced Compensation Features
- Automated compensation calculation based on detected usage
- Multi-party payment distribution
- Blockchain integration for immutable records
- Settlement proposal generation

---

## Documentation

Detailed documentation is available in the `docs/` folder:

| Document | Description |
|----------|-------------|
| [API.md](docs/API.md) | Complete API reference with examples |
| [DEPLOYMENT.md](docs/DEPLOYMENT.md) | Production deployment guide |
| [DEVELOPMENT.md](docs/DEVELOPMENT.md) | Local development setup |
| [ARCHITECTURE.md](docs/ARCHITECTURE.md) | System architecture overview |

### Quick Links

- **API Documentation (Swagger)**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc
- **OpenAPI JSON**: http://localhost:8000/openapi.json

---

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## Support

- **Documentation**: [docs/](docs/)
- **Issues**: [GitHub Issues](https://github.com/your-org/meta-stamp-v3/issues)
- **Discussions**: [GitHub Discussions](https://github.com/your-org/meta-stamp-v3/discussions)
- **Email**: support@metastamp.com

---

<p align="center">
  <strong>META-STAMP V3</strong> - Protecting Creators in the Age of AI
</p>
