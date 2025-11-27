# Technical Specification

# 0. Agent Action Plan

## 0.1 Core Objective

Based on the provided requirements, the Blitzy platform understands that the objective is to build a comprehensive, end-to-end creator-protection platform called **META-STAMP V3** that serves as a global compensation foundation between AI companies and creators. The system must achieve the following core requirements:

**Primary Objectives:**

- **Asset Fingerprinting**: Implement a sophisticated multi-modal fingerprinting engine that can uniquely identify and track creative assets across text, images, audio, video, and web content through perceptual hashes, embeddings, and spectral analysis

- **AI Training Detection**: Create a detection system (Phase 1 skeleton with Phase 2 placeholders) capable of identifying when creative assets have been potentially used in AI model training datasets

- **Residual Value Calculation**: Build an AI Touch Value™ engine that estimates compensation owed to creators based on a mathematical formula incorporating model earnings, training contribution scores, usage exposure scores, and a 25% equity factor

- **Hybrid Upload Architecture**: Implement a smart upload system that handles files <10MB via direct upload and files >10MB through S3 presigned URLs with resumable multipart upload support, while enforcing strict security policies

- **Universal Dashboard**: Provide creators with a comprehensive interface showing asset status, fingerprint summaries, AI Touch Scores, value projections, wallet balances, and legal documentation previews

- **Multi-Provider AI Assistant**: Integrate a hybrid-personality AI assistant using LangChain with support for OpenAI GPT-4/5, Anthropic Claude, Google Gemini, and local models, capable of both friendly guidance and serious legal advisory functions

- **Global Scalability**: Architect the system to be extremely fast, globally accessible, scalable, legally credible, and completely siloed from external systems

**Implicit Requirements Detected:**

- **Cloud-Agnostic Design**: The system must work with any S3-compatible storage (MinIO for development, AWS S3/compatible services for production) without vendor lock-in

- **Resumable Upload Support**: Large file uploads must support interruption and resumption through S3 multipart upload protocol

- **Security-First Architecture**: Comprehensive file type validation, size restrictions (500MB max), complete rejection of dangerous file types (ZIP, executables), and URL validation

- **Authentication Flexibility**: Primary Auth0 integration with automatic fallback to local JWT stub (HS256, 24h expiry) when Auth0 is not configured

- **Phase 2 Preparation**: Strategic placement of TODO markers throughout the codebase for future AI training detection, dataset comparison, embedding drift analysis, similarity-law thresholds, and legal export capabilities

- **Development-to-Production Pipeline**: Docker Compose orchestration for local development with MongoDB, Redis, MinIO, backend, and frontend services

- **API Versioning**: All backend APIs must be versioned under `/api/v1` structure for future compatibility

- **Testing Infrastructure**: Comprehensive pytest-based testing for backend services and component testing for frontend

- **Code Quality Enforcement**: Black + Ruff for Python, ESLint + Prettier for TypeScript/React to maintain consistent code standards

**Dependencies and Prerequisites:**

- Python 3.11+ runtime environment with Poetry for dependency management
- Node.js environment with npm for frontend package management  
- MongoDB for document storage and asset metadata
- Redis for caching and session management
- S3-compatible object storage (MinIO for development)
- Auth0 account with proper configuration (or local JWT fallback)
- LangChain framework with provider-specific API keys (OpenAI, Anthropic, Google)
- Docker and Docker Compose for containerized development environment

## 0.2 Task Categorization

**Primary Task Type:** New Product Creation

This is a greenfield project building META-STAMP V3 from a minimal scaffold (basic `backend/main.py` and `frontend/app.js` placeholders). The system requires full-stack implementation with sophisticated multi-modal processing, cloud storage integration, AI/ML capabilities, and comprehensive creator-facing interfaces.

**Secondary Aspects:**

- **Infrastructure Setup**: Docker Compose orchestration with multiple services (MongoDB, Redis, MinIO, backend, frontend)

- **Security Implementation**: File upload validation, authentication system, JWT management, S3 presigned URL security

- **AI/ML Integration**: LangChain multi-provider setup, embedding generation, perceptual hashing, fingerprint analysis

- **Cloud Storage Architecture**: S3-compatible object storage with presigned URLs, multipart uploads, and resumable transfers

- **API Design**: RESTful API architecture with versioning, comprehensive endpoint coverage, and proper error handling

- **Frontend Development**: React 18 + TypeScript + Vite + TailwindCSS single-page application with real-time upload feedback

- **Data Modeling**: MongoDB schema design for assets, fingerprints, users, wallet transactions, and analytics data

- **Testing Strategy**: pytest for backend services, React Testing Library for frontend components

**Scope Classification:** Cross-Cutting System Change

This is a comprehensive system build affecting:

- **Backend Services**: Complete FastAPI application with multiple service layers (upload, fingerprinting, analytics, AI assistant, wallet, authentication)

- **Frontend Application**: Full React application with routing, state management, component library, and API integration

- **Infrastructure Layer**: Docker containers, storage services, database services, caching layer

- **External Integrations**: Auth0, LangChain providers (OpenAI, Anthropic, Google), S3-compatible storage APIs

- **Development Tooling**: Linting, formatting, testing frameworks, development servers

- **Documentation**: API documentation, deployment guides, configuration instructions

The project requires coordinated development across all layers simultaneously, with careful attention to interface contracts between frontend and backend, proper error handling at all boundaries, and comprehensive security measures at every level.

## 0.3 Special Instructions and Constraints

#### Critical Architectural Constraints (MANDATORY, DO NOT ALTER)

**Backend Requirements:**
- **Language**: Python 3.11+ (MUST NOT use other versions)
- **Framework**: FastAPI (MUST NOT choose another framework)
- **AI Integration**: LangChain with MANDATORY support for OpenAI GPT-4/5, Anthropic Claude, Google Gemini, and local models
- **Database**: MongoDB (MUST NOT use relational databases)
- **Caching**: Redis (required for session management and performance)
- **Storage**: S3-compatible object storage with MinIO for development
- **Auth**: Auth0 with JWT-based authentication, auto-generate local JWT stub (HS256, 24h expiry) if Auth0 not configured
- **Testing**: pytest framework
- **Directory Structure**: MUST use specified structure:
  ```
  backend/
    app/
      api/
        v1/
      core/
      models/
      services/
      utils/
    main.py
    requirements.txt
  ```

**Frontend Requirements:**
- **Framework**: React 18 + TypeScript + Vite (MUST NOT choose alternatives)
- **UI Library**: TailwindCSS (MUST NOT use other CSS frameworks)
- **Router**: React Router v6
- **State Management**: React Context + hooks (avoid external state libraries)
- **Directory Structure**: MUST follow:
  ```
  frontend/
    src/
      components/
      pages/
      routes/
      hooks/
      services/
      styles/
    index.html
    package.json
  ```

#### Security Constraints (NON-NEGOTIABLE)

**File Upload Security:**
- **REJECT ZIP files entirely**: No .zip, .rar, .7z, or any archive formats
- **REJECT executables**: .exe, .bin, .sh, .app, .msi, .iso, .dmg completely forbidden
- **MAX asset size**: 500 MB hard limit
- **URL validation**: Must reject URLs pointing to dangerous file types
- **Supported file types ONLY**:
  - Text: .txt, .md, .pdf
  - Images: .png, .jpg, .jpeg, .webp
  - Audio: .mp3, .wav, .aac
  - Video: .mp4, .mov, .avi
  - URLs: YouTube, Vimeo, general webpages

#### Cloud-Agnostic Design (CRITICAL)

- **MUST NOT depend on cloud-specific SDKs** (AWS, GCP, Azure)
- **MUST use S3-compatible APIs only** via boto3 with generic S3 interface
- **MUST NOT merge backend + frontend** together (separate services required)
- **MUST keep system fully siloed** from external systems except explicitly defined integrations

#### Methodological Requirements

**API Versioning:**
- All APIs MUST be versioned under `/api/v1`
- Future versions will use `/api/v2`, `/api/v3` pattern

**Phase 2 Preparation:**
- MUST implement clear TODO markers for:
  - AI training detection engine
  - Dataset comparison engine
  - Embedding drift logic
  - Similarity-law thresholds
  - Legal-export module

**Development Environment:**
- MUST include docker-compose with: backend, frontend, mongodb, redis, minio
- MUST use Poetry for backend dependencies
- MUST use npm for frontend dependencies
- MUST include ESLint + Prettier for frontend
- MUST include Black + Ruff for backend

#### Upload Architecture Requirements (HYBRID MANDATORY)

**Direct Upload (<10MB):**
- Standard FastAPI multipart/form-data endpoint
- Immediate processing and storage

**S3 Presigned Upload Flow (>10MB):**
- GET `/api/v1/upload/presigned-url` → Return S3 PUT URL
- POST `/api/v1/upload/confirmation` → Register asset in MongoDB after S3 upload
- MUST support resumable uploads via multipart S3
- Original files stored in S3/MinIO
- Metadata + fingerprints stored in MongoDB

#### Platform-Specific Upload Handling

**YouTube Integration:**
- Extract transcript using appropriate library
- Extract metadata (title, description, duration, views)
- Store URL reference and extracted content

**Vimeo Integration:**
- Extract video metadata
- Store URL reference

**General Webpage Integration:**
- Extract text content
- Store URL and processed content

**Future Integration Placeholders (MUST exist):**
- Sora 2 import placeholder endpoints
- Nano-Banana import placeholder endpoints

#### AI Touch Value™ Formula (MUST IMPLEMENT EXACTLY)

```
AI Touch Value™ = ModelEarnings × (TrainingContributionScore/100) × (UsageExposureScore/100) × EquityFactor
```

Where:
- **EquityFactor**: Fixed at 0.25 (25%)
- **ModelEarnings**: Input parameter
- **TrainingContributionScore**: 0-100 scale
- **UsageExposureScore**: 0-100 scale

#### Code Quality Standards

- **Backend**: Black formatter + Ruff linter (zero tolerance for violations)
- **Frontend**: ESLint + Prettier with TypeScript strict mode
- **Testing**: Minimum coverage expectations with pytest and React Testing Library
- **Type Safety**: Full TypeScript strict mode for frontend, Python type hints for backend

#### Performance Requirements

- System must be "extremely fast"
- Implement Redis caching for frequently accessed data
- Optimize database queries with proper indexing
- Use streaming responses for large file operations
- Implement connection pooling for database and Redis

#### Deployment Constraints

- MUST be containerized with Docker
- MUST work in docker-compose for development
- MUST be production-ready for deployment
- MUST support horizontal scaling (stateless backend design)

## 0.4 Technical Interpretation

These requirements translate to the following technical implementation strategy:

#### Backend Architecture Implementation

**To achieve a FastAPI-based backend, we will:**
- Create `backend/app/main.py` as the application entry point with FastAPI instance initialization
- Implement versioned API routing under `backend/app/api/v1/` with separate router modules for upload, fingerprint, analytics, wallet, auth, and assistant endpoints
- Configure CORS middleware to allow frontend communication
- Set up MongoDB connection using Motor (async MongoDB driver)
- Configure Redis connection for caching and session management
- Implement S3-compatible storage client using boto3 with endpoint URL configuration for MinIO/S3 flexibility

**To achieve hybrid upload architecture, we will:**
- Create `backend/app/services/upload_service.py` with logic to detect file size and route appropriately
- Implement direct upload handler in `backend/app/api/v1/upload.py` for files <10MB using FastAPI's `UploadFile`
- Create presigned URL generation endpoint that returns S3 PUT URLs with 15-minute expiration
- Implement upload confirmation endpoint that validates S3 upload success and creates MongoDB asset record
- Add multipart upload initialization, part upload, and completion endpoints for resumable large file uploads
- Create file type validation utilities in `backend/app/utils/file_validator.py` with comprehensive extension and MIME type checking

**To achieve AI integration with LangChain, we will:**
- Create `backend/app/services/ai_assistant_service.py` using LangChain's `init_chat_model` for multi-provider support
- Implement model configuration switching based on environment variables (OPENAI_API_KEY, ANTHROPIC_API_KEY, GOOGLE_API_KEY)
- Configure tool-calling capabilities for the assistant to query fingerprint data and analytics
- Implement streaming response support for real-time assistant interactions
- Create conversation context management using Redis for session state

**To achieve fingerprinting engine, we will:**
- Create `backend/app/services/fingerprinting_service.py` with separate handlers for each media type
- Implement perceptual hashing using `imagehash` library for images (pHash, aHash, dHash)
- Integrate CLIP or OpenAI embeddings via LangChain for multi-modal embedding generation
- Implement audio fingerprinting using librosa for spectral analysis
- Create video fingerprinting with frame extraction and frame-by-frame hashing
- Add metadata extraction utilities for all supported file types
- Store fingerprint data in MongoDB with asset references
- Insert Phase 2 TODO markers for AI training detection, dataset comparison, and similarity scoring

**To achieve AI Touch Value™ calculation, we will:**
- Create `backend/app/services/ai_value_service.py` implementing the exact formula
- Build predictive model inputs from user-provided data (followers, views, content hours, platform)
- Implement `/api/v1/analytics/predict` endpoint returning calculated values
- Store calculations in MongoDB for historical tracking

**To achieve authentication, we will:**
- Create `backend/app/core/auth.py` with Auth0 JWT validation middleware
- Implement fallback local JWT generation using HS256 algorithm with 24-hour expiration
- Add auth dependency injection for protected endpoints
- Create `/api/v1/auth/login`, `/api/v1/auth/logout`, and `/api/v1/auth/me` endpoints

#### Frontend Architecture Implementation

**To achieve React 18 + TypeScript + Vite application, we will:**
- Initialize Vite project with React-TS template using `npm create vite@latest`
- Configure TailwindCSS v3 with PostCSS and Autoprefixer
- Set up React Router v6 with route definitions in `frontend/src/routes/`
- Create React Context providers for authentication, upload state, and global UI state
- Implement custom hooks in `frontend/src/hooks/` for API interactions and state management

**To achieve smart uploader component, we will:**
- Create `frontend/src/components/SmartUploader.tsx` with drag-and-drop zone using HTML5 drag-and-drop API
- Implement file size detection logic that routes to appropriate upload strategy
- Build progress tracking using XMLHttpRequest or fetch with progress events
- Create resumable upload logic for multipart uploads with chunk tracking
- Implement upload status UI showing "Queued → Processing → Ready" states
- Add URL input component with platform detection (YouTube, Vimeo, general web)

**To achieve universal dashboard, we will:**
- Create `frontend/src/pages/Dashboard.tsx` as the main interface
- Build asset list component showing all uploaded assets with status badges
- Implement fingerprint summary cards displaying hash values and metadata
- Create AI Touch Score™ and AI Touch Value™ visualization components
- Build wallet preview component showing balance and pending payouts
- Add legal summary preview component with placeholder content

**To achieve AI assistant chat interface, we will:**
- Create `frontend/src/components/AIAssistant.tsx` with chat UI
- Implement streaming text response handling using Server-Sent Events or WebSocket
- Build message history display with user/assistant message distinction
- Add tool call visualization showing when assistant queries data
- Implement conversation persistence using local storage or backend API

#### Data Layer Implementation

**To achieve MongoDB data models, we will:**
- Create `backend/app/models/asset.py` with Pydantic models for asset metadata, fingerprints, and storage references
- Implement `backend/app/models/user.py` for user profiles and authentication data
- Create `backend/app/models/wallet.py` for transaction history and balance tracking
- Implement `backend/app/models/analytics.py` for AI Touch Value™ calculations and historical data

**To achieve Redis caching, we will:**
- Implement caching decorator in `backend/app/utils/cache.py`
- Cache frequently accessed asset metadata with 5-minute TTL
- Store active user sessions with 24-hour expiration
- Cache AI assistant conversation context with 1-hour TTL

#### Infrastructure Implementation

**To achieve Docker Compose orchestration, we will:**
- Create `docker-compose.yml` defining services: backend, frontend, mongodb, redis, minio
- Configure health checks for all services
- Set up named volumes for persistent data (MongoDB, MinIO)
- Define environment variable files for service configuration
- Configure networking for inter-service communication

**To achieve development environment setup, we will:**
- Create `backend/pyproject.toml` for Poetry dependency management
- Add all required Python packages with specific versions
- Create `frontend/package.json` with React, TypeScript, Vite, TailwindCSS dependencies
- Set up ESLint configuration in `frontend/.eslintrc.json`
- Configure Prettier in `frontend/.prettierrc`
- Set up Black and Ruff configuration in `backend/pyproject.toml`

#### API Endpoint Implementation

**Upload Endpoints:**
- POST `/api/v1/upload/text` - Direct text content upload
- POST `/api/v1/upload/image` - Direct image upload
- POST `/api/v1/upload/audio` - Direct audio upload
- POST `/api/v1/upload/video` - Direct video upload
- POST `/api/v1/upload/url` - URL-based content import
- GET `/api/v1/upload/presigned-url` - Generate S3 presigned PUT URL
- POST `/api/v1/upload/confirmation` - Confirm S3 upload and register asset

**Fingerprinting Endpoints:**
- POST `/api/v1/fingerprint` - Generate fingerprint for uploaded asset
- GET `/api/v1/fingerprint/{id}` - Retrieve fingerprint data

**Analytics Endpoints:**
- POST `/api/v1/analytics/predict` - Calculate AI Touch Value™

**Asset Management Endpoints:**
- GET `/api/v1/assets` - List all user assets
- GET `/api/v1/assets/{id}` - Get specific asset details
- DELETE `/api/v1/assets/{id}` - Delete asset and associated data

**Wallet Endpoints:**
- GET `/api/v1/wallet/balance` - Get current wallet balance
- GET `/api/v1/wallet/history` - Get transaction history

**AI Assistant Endpoints:**
- POST `/api/v1/assistant/ask` - Send query to AI assistant with streaming response

**Authentication Endpoints:**
- POST `/api/v1/auth/login` - Authenticate user and return JWT
- POST `/api/v1/auth/logout` - Invalidate user session
- GET `/api/v1/auth/me` - Get current user profile

#### Testing Implementation

**To achieve comprehensive testing, we will:**
- Create `backend/tests/` directory with pytest test modules
- Implement unit tests for each service module
- Create integration tests for API endpoints using TestClient
- Add fixture definitions for MongoDB and Redis test instances
- Implement frontend component tests in `frontend/src/__tests__/`
- Create E2E test scenarios for critical user flows

## 0.5 Repository Scope Discovery

#### Comprehensive File Analysis

**Current Repository Structure:**

The project begins with a minimal scaffold containing:
- `README.md` - Basic project description
- `backend/main.py` - Placeholder Python file
- `backend/pyproject.toml` - Poetry configuration (initialized)
- `frontend/app.js` - Placeholder JavaScript file
- `frontend/package.json` - npm package manifest (initialized)
- `frontend/package-lock.json` - npm dependency lock file

**Web Research Conducted:**

- <cite index="3-2">FastAPI latest stable version 0.122.0 released November 24, 2025</cite>
- <cite index="16-1">LangChain provides standard Tool Calling approach to many LLM providers like Anthropic, Cohere, Google, Mistral, and OpenAI</cite>
- <cite index="21-7,21-8">S3 presigned URL pattern: Client → FastAPI → AWS S3 (presigned URL) → Client → S3 (upload/download), with URLs valid for a limited time, usually a few minutes</cite>
- <cite index="23-1,23-2">MinIO provides S3-compatible storage for local development with upload, download, and presigned URL management</cite>
- <cite index="34-2,34-9">Tailwind CSS v4.0 includes first-party Vite plugin for tight integration and maximum performance</cite>
- <cite index="31-1">React 18 + Vite + TypeScript + TailwindCSS 3 is a proven production stack</cite>

#### Existing Infrastructure Assessment

**Python Environment:**
- Python 3.11.14 installed and activated in `.venv`
- Poetry 2.2.1 configured for dependency management
- Core dependencies installed: FastAPI 0.122.0, LangChain 1.1.0, Motor 3.7.1, Redis 7.1.0, Boto3 1.41.4
- Development tools: pytest 9.0.1, Black 25.11.0, Ruff 0.14.6

**Node.js Environment:**
- Node.js v20.19.5 available
- npm 10.8.2 configured
- React 18 and React DOM 18 installed
- TypeScript and Vite development dependencies installed
- TailwindCSS, ESLint, and Prettier configured

**Infrastructure Services (to be configured):**
- MongoDB - Document database for assets, users, wallet data
- Redis - Caching layer and session storage
- MinIO - S3-compatible object storage for development
- Docker Compose - Container orchestration

#### Complete File Inventory

**Backend Files (All require creation/modification):**

#### Core Application Files
- `backend/app/__init__.py` - Package initialization
- `backend/app/main.py` - FastAPI application entry point with middleware, CORS, and router registration
- `backend/app/config.py` - Configuration management using Pydantic Settings

#### API Layer
- `backend/app/api/__init__.py`
- `backend/app/api/v1/__init__.py`
- `backend/app/api/v1/upload.py` - Upload endpoints (text, image, audio, video, URL, presigned-url, confirmation)
- `backend/app/api/v1/fingerprint.py` - Fingerprinting endpoints
- `backend/app/api/v1/analytics.py` - AI Touch Value™ calculation endpoints
- `backend/app/api/v1/assets.py` - Asset management endpoints (list, get, delete)
- `backend/app/api/v1/wallet.py` - Wallet balance and transaction history endpoints
- `backend/app/api/v1/assistant.py` - AI assistant chat endpoints
- `backend/app/api/v1/auth.py` - Authentication endpoints (login, logout, me)

#### Core Services Layer
- `backend/app/core/__init__.py`
- `backend/app/core/auth.py` - Auth0 integration and JWT handling
- `backend/app/core/database.py` - MongoDB connection management
- `backend/app/core/redis_client.py` - Redis connection and caching utilities
- `backend/app/core/storage.py` - S3/MinIO storage client configuration

#### Models Layer
- `backend/app/models/__init__.py`
- `backend/app/models/asset.py` - Asset Pydantic models and MongoDB schemas
- `backend/app/models/user.py` - User models and authentication data
- `backend/app/models/wallet.py` - Wallet transaction and balance models
- `backend/app/models/analytics.py` - Analytics calculation models
- `backend/app/models/fingerprint.py` - Fingerprint data models

#### Services Layer
- `backend/app/services/__init__.py`
- `backend/app/services/upload_service.py` - Upload routing logic and file processing
- `backend/app/services/storage_service.py` - S3/MinIO operations (presigned URLs, multipart uploads)
- `backend/app/services/fingerprinting_service.py` - Multi-modal fingerprint generation
- `backend/app/services/ai_value_service.py` - AI Touch Value™ calculation engine
- `backend/app/services/ai_assistant_service.py` - LangChain multi-provider AI assistant
- `backend/app/services/metadata_service.py` - Metadata extraction for all file types
- `backend/app/services/url_processor_service.py` - YouTube, Vimeo, webpage content extraction

#### Utilities Layer
- `backend/app/utils/__init__.py`
- `backend/app/utils/file_validator.py` - File type and size validation
- `backend/app/utils/cache.py` - Redis caching decorators
- `backend/app/utils/logger.py` - Logging configuration
- `backend/app/utils/security.py` - Security utilities (JWT, hashing)

#### Testing Files
- `backend/tests/__init__.py`
- `backend/tests/conftest.py` - Pytest fixtures and configuration
- `backend/tests/test_upload.py` - Upload endpoint tests
- `backend/tests/test_fingerprint.py` - Fingerprinting service tests
- `backend/tests/test_analytics.py` - Analytics calculation tests
- `backend/tests/test_ai_assistant.py` - AI assistant integration tests
- `backend/tests/test_auth.py` - Authentication tests

#### Configuration Files
- `backend/.env.example` - Environment variable template
- `backend/.env` - Actual environment variables (not committed)
- `backend/pyproject.toml` - Poetry dependencies (already exists, needs content update)
- `backend/pytest.ini` - Pytest configuration
- `backend/.black.toml` - Black formatter configuration
- `backend/ruff.toml` - Ruff linter configuration
- `backend/Dockerfile` - Backend container definition
- `backend/.dockerignore` - Docker build exclusions
- `backend/requirements.txt` - Generated from Poetry for Docker builds

**Frontend Files (All require creation/modification):**

#### Core Application Files
- `frontend/src/main.tsx` - Application entry point
- `frontend/src/App.tsx` - Root component with routing
- `frontend/src/vite-env.d.ts` - Vite type definitions
- `frontend/index.html` - HTML template

#### Routing
- `frontend/src/routes/index.tsx` - Route definitions
- `frontend/src/routes/PrivateRoute.tsx` - Protected route wrapper

#### Pages
- `frontend/src/pages/Dashboard.tsx` - Main dashboard page
- `frontend/src/pages/Upload.tsx` - Upload interface page
- `frontend/src/pages/Assets.tsx` - Asset list and management page
- `frontend/src/pages/Wallet.tsx` - Wallet and earnings page
- `frontend/src/pages/Login.tsx` - Login page
- `frontend/src/pages/NotFound.tsx` - 404 error page

#### Components
- `frontend/src/components/SmartUploader.tsx` - Intelligent upload component
- `frontend/src/components/FileDropZone.tsx` - Drag-and-drop zone
- `frontend/src/components/UploadProgress.tsx` - Upload progress indicator
- `frontend/src/components/URLInput.tsx` - URL upload component
- `frontend/src/components/AssetCard.tsx` - Asset display card
- `frontend/src/components/FingerprintSummary.tsx` - Fingerprint visualization
- `frontend/src/components/AITouchScore.tsx` - AI Touch Score display
- `frontend/src/components/AITouchValue.tsx` - Value calculation display
- `frontend/src/components/WalletBalance.tsx` - Wallet balance component
- `frontend/src/components/TransactionHistory.tsx` - Transaction list
- `frontend/src/components/AIAssistant.tsx` - Chat interface component
- `frontend/src/components/ChatMessage.tsx` - Individual message component
- `frontend/src/components/Navbar.tsx` - Navigation bar
- `frontend/src/components/Sidebar.tsx` - Side navigation
- `frontend/src/components/Layout.tsx` - Page layout wrapper

#### Hooks
- `frontend/src/hooks/useAuth.tsx` - Authentication hook
- `frontend/src/hooks/useUpload.tsx` - Upload management hook
- `frontend/src/hooks/useAssets.tsx` - Asset data fetching hook
- `frontend/src/hooks/useWallet.tsx` - Wallet data hook
- `frontend/src/hooks/useAIAssistant.tsx` - AI assistant interaction hook
- `frontend/src/hooks/useWebSocket.tsx` - WebSocket connection hook

#### Services
- `frontend/src/services/api.ts` - Axios instance and API configuration
- `frontend/src/services/authService.ts` - Authentication API calls
- `frontend/src/services/uploadService.ts` - Upload API interactions
- `frontend/src/services/assetService.ts` - Asset management API
- `frontend/src/services/walletService.ts` - Wallet API calls
- `frontend/src/services/assistantService.ts` - AI assistant API
- `frontend/src/services/storageService.ts` - Local storage utilities

#### Context Providers
- `frontend/src/contexts/AuthContext.tsx` - Authentication state
- `frontend/src/contexts/UploadContext.tsx` - Upload state management
- `frontend/src/contexts/ThemeContext.tsx` - UI theme state

#### Styles
- `frontend/src/styles/index.css` - Global styles with Tailwind directives
- `frontend/src/styles/tailwind.config.js` - Tailwind configuration

#### Types
- `frontend/src/types/asset.ts` - Asset type definitions
- `frontend/src/types/user.ts` - User type definitions
- `frontend/src/types/wallet.ts` - Wallet type definitions
- `frontend/src/types/api.ts` - API response types

#### Configuration Files
- `frontend/.env.example` - Environment variable template
- `frontend/.env` - Actual environment variables (not committed)
- `frontend/vite.config.ts` - Vite configuration
- `frontend/tsconfig.json` - TypeScript configuration
- `frontend/tsconfig.node.json` - TypeScript config for Node files
- `frontend/tailwind.config.js` - Tailwind CSS configuration
- `frontend/postcss.config.js` - PostCSS configuration
- `frontend/.eslintrc.json` - ESLint configuration
- `frontend/.prettierrc` - Prettier configuration
- `frontend/Dockerfile` - Frontend container definition
- `frontend/.dockerignore` - Docker build exclusions
- `frontend/package.json` - npm dependencies (already exists, needs update)

**Infrastructure Files:**

#### Docker and Orchestration
- `docker-compose.yml` - Multi-service orchestration
- `docker-compose.dev.yml` - Development overrides
- `.dockerignore` - Global Docker exclusions
- `.gitignore` - Git exclusions

#### Documentation
- `README.md` - Project documentation (exists, needs comprehensive update)
- `docs/API.md` - API documentation
- `docs/DEPLOYMENT.md` - Deployment guide
- `docs/DEVELOPMENT.md` - Development setup guide
- `docs/ARCHITECTURE.md` - System architecture documentation

#### Scripts
- `scripts/init_db.py` - MongoDB initialization script
- `scripts/create_test_data.py` - Test data generation
- `scripts/backup.sh` - Database backup script
- `scripts/deploy.sh` - Deployment automation

#### Related File Discovery

**Files importing or depending on modified components:**
- All API route files depend on service layer modules
- All service files depend on models and core utilities
- Frontend components depend on hooks and services
- React pages depend on components and context providers

**Configuration files affected by code changes:**
- `backend/pyproject.toml` requires all service dependencies
- `frontend/package.json` requires React ecosystem packages
- `docker-compose.yml` must configure all services with proper networking
- `.env` files contain API keys and configuration for all integrations

**Documentation requiring updates:**
- `README.md` must include setup instructions for both backend and frontend
- `docs/API.md` must document all 20+ endpoints with examples
- `docs/DEPLOYMENT.md` must cover Docker deployment process
- `docs/DEVELOPMENT.md` must explain development workflow and testing

#### Search Patterns Used

Based on the task requirements, the following file patterns were identified:

**Source Code:**
- `backend/**/*.py` - All Python backend modules
- `frontend/src/**/*.tsx` - React components with TypeScript
- `frontend/src/**/*.ts` - TypeScript utilities and services

**Configuration:**
- `**/*.json` - Package manifests and configuration
- `**/*.toml` - Python project configuration
- `**/*.yml`, `**/*.yaml` - Docker Compose and CI/CD
- `**/.env*` - Environment variables

**Build/Deploy:**
- `Dockerfile*` - Container definitions
- `docker-compose*.yml` - Service orchestration
- `.dockerignore` - Build exclusions

**Testing:**
- `backend/tests/**/*test*.py` - Backend test modules
- `frontend/src/**/*.test.tsx` - Frontend component tests

**Documentation:**
- `**/*.md` - Markdown documentation
- `docs/**/*` - Comprehensive documentation

#### Infrastructure Gaps Identified

**Missing Services (to be configured in docker-compose.yml):**
- MongoDB service with persistent volume
- Redis service with configuration for caching
- MinIO service with bucket initialization
- Backend service with environment variables
- Frontend service with Vite dev server
- Nginx service for production serving (optional)

**Missing Environment Configuration:**
- Auth0 credentials (AUTH0_DOMAIN, AUTH0_CLIENT_ID, AUTH0_CLIENT_SECRET)
- LangChain API keys (OPENAI_API_KEY, ANTHROPIC_API_KEY, GOOGLE_API_KEY)
- MongoDB connection string
- Redis connection string
- S3/MinIO configuration (endpoint, access keys, bucket name)
- JWT secret key
- Frontend API base URL

## 0.6 File Transformation Mapping

#### File-by-File Execution Plan

| Target File | Transformation | Source File/Reference | Purpose/Changes |
|-------------|----------------|----------------------|-----------------|
| **INFRASTRUCTURE & DOCKER** | | | |
| docker-compose.yml | CREATE | N/A | Define services: backend (FastAPI), frontend (Vite), mongodb, redis, minio with health checks, volumes, and networking |
| docker-compose.dev.yml | CREATE | docker-compose.yml | Development overrides with volume mounts for hot-reload and exposed ports for debugging |
| .dockerignore | CREATE | N/A | Exclude .git, .venv, node_modules, __pycache__, *.pyc, .env from Docker builds |
| .gitignore | CREATE | N/A | Exclude .env, .venv, node_modules, __pycache__, *.pyc, .DS_Store, dist/, build/, *.log |
| **BACKEND - CORE APPLICATION** | | | |
| backend/app/__init__.py | CREATE | N/A | Empty package marker for app module |
| backend/app/main.py | UPDATE | backend/main.py | Transform placeholder into FastAPI application with CORS, middleware, router registration, startup/shutdown events |
| backend/app/config.py | CREATE | N/A | Pydantic Settings class for environment variables (MongoDB URI, Redis URL, S3 config, Auth0 credentials, API keys) |
| backend/Dockerfile | CREATE | N/A | Multi-stage Docker build: install Poetry, copy dependencies, install packages, copy source, expose port 8000, CMD uvicorn |
| backend/.dockerignore | CREATE | .dockerignore | Backend-specific exclusions |
| backend/.env.example | CREATE | N/A | Template with all required environment variables and example values |
| backend/pytest.ini | CREATE | N/A | Configure pytest with asyncio mode, test discovery patterns, coverage settings |
| backend/pyproject.toml | UPDATE | backend/pyproject.toml | Add project metadata, scripts for running app, Black/Ruff configuration, tool settings |
| backend/ruff.toml | CREATE | N/A | Ruff linter rules, line length 100, select rules E, F, I, exclude migrations and tests from certain rules |
| **BACKEND - CORE SERVICES** | | | |
| backend/app/core/__init__.py | CREATE | N/A | Package marker |
| backend/app/core/auth.py | CREATE | N/A | Auth0 JWT validation, local JWT generation fallback, authentication dependencies for FastAPI |
| backend/app/core/database.py | CREATE | N/A | Motor async MongoDB client initialization, connection pooling, health check, database and collection getters |
| backend/app/core/redis_client.py | CREATE | N/A | Redis async client setup, connection validation, get/set/delete operations, TTL management |
| backend/app/core/storage.py | CREATE | N/A | Boto3 S3 client configuration with endpoint URL support for MinIO, presigned URL generation methods |
| **BACKEND - MODELS** | | | |
| backend/app/models/__init__.py | CREATE | N/A | Package marker, export all models |
| backend/app/models/asset.py | CREATE | N/A | Asset Pydantic model (id, user_id, file_name, file_type, file_size, s3_key, upload_status, created_at, fingerprint_id) |
| backend/app/models/user.py | CREATE | N/A | User model (id, email, auth0_id, created_at, last_login) |
| backend/app/models/wallet.py | CREATE | N/A | WalletBalance and Transaction models (user_id, balance, currency, transactions with amount, type, timestamp) |
| backend/app/models/analytics.py | CREATE | N/A | AITouchValueCalculation model (asset_id, model_earnings, contribution_score, exposure_score, calculated_value, timestamp) |
| backend/app/models/fingerprint.py | CREATE | N/A | Fingerprint model (id, asset_id, perceptual_hashes, embeddings, spectral_data, metadata, created_at) |
| **BACKEND - API ROUTES** | | | |
| backend/app/api/__init__.py | CREATE | N/A | Package marker |
| backend/app/api/v1/__init__.py | CREATE | N/A | Create APIRouter, include all sub-routers |
| backend/app/api/v1/upload.py | CREATE | N/A | Endpoints: POST /text, /image, /audio, /video, /url, GET /presigned-url, POST /confirmation with file validation and routing logic |
| backend/app/api/v1/fingerprint.py | CREATE | N/A | Endpoints: POST /{asset_id}/fingerprint, GET /{fingerprint_id} with async processing |
| backend/app/api/v1/analytics.py | CREATE | N/A | Endpoint: POST /predict with AI Touch Value™ calculation using formula and input validation |
| backend/app/api/v1/assets.py | CREATE | N/A | Endpoints: GET /, GET /{asset_id}, DELETE /{asset_id} with pagination and filtering |
| backend/app/api/v1/wallet.py | CREATE | N/A | Endpoints: GET /balance, GET /history with user authentication and transaction filtering |
| backend/app/api/v1/assistant.py | CREATE | N/A | Endpoint: POST /ask with streaming response using Server-Sent Events, LangChain integration |
| backend/app/api/v1/auth.py | CREATE | N/A | Endpoints: POST /login (Auth0 or local), POST /logout, GET /me with JWT handling |
| **BACKEND - SERVICES** | | | |
| backend/app/services/__init__.py | CREATE | N/A | Package marker |
| backend/app/services/upload_service.py | CREATE | N/A | File size detection, route to direct or presigned upload, file type validation, metadata extraction initialization |
| backend/app/services/storage_service.py | CREATE | N/A | S3 presigned URL generation (PUT for upload), multipart upload initiation/completion, file upload/download, bucket operations |
| backend/app/services/fingerprinting_service.py | CREATE | N/A | Multi-modal fingerprinting: image (pHash, aHash, dHash), audio (spectral analysis), video (frame extraction), embeddings via LangChain, TODO markers for Phase 2 |
| backend/app/services/ai_value_service.py | CREATE | N/A | Implement formula: AI Touch Value™ = ModelEarnings × (TrainingContributionScore/100) × (UsageExposureScore/100) × 0.25, input validation and calculation logic |
| backend/app/services/ai_assistant_service.py | CREATE | N/A | LangChain init_chat_model with OpenAI/Anthropic/Google support, tool calling setup (fingerprint lookup, analytics query), conversation context management in Redis |
| backend/app/services/metadata_service.py | CREATE | N/A | Extract metadata from images (EXIF), audio (duration, bitrate), video (resolution, codec, duration), PDFs (author, pages), text files (encoding, size) |
| backend/app/services/url_processor_service.py | CREATE | N/A | YouTube transcript extraction (youtube-transcript-api), Vimeo metadata, webpage scraping (BeautifulSoup), URL validation |
| **BACKEND - UTILITIES** | | | |
| backend/app/utils/__init__.py | CREATE | N/A | Package marker |
| backend/app/utils/file_validator.py | CREATE | N/A | Validate file extensions against whitelist, check MIME types, enforce 500MB size limit, reject ZIP and executables, sanitize filenames |
| backend/app/utils/cache.py | CREATE | N/A | Redis caching decorator with TTL, cache key generation, async cache get/set/delete operations |
| backend/app/utils/logger.py | CREATE | N/A | Configure structured logging with uvicorn logger, log rotation, JSON formatting for production |
| backend/app/utils/security.py | CREATE | N/A | JWT token generation/validation (HS256), password hashing with bcrypt, secure random string generation |
| **BACKEND - TESTS** | | | |
| backend/tests/__init__.py | CREATE | N/A | Package marker |
| backend/tests/conftest.py | CREATE | N/A | Pytest fixtures: test MongoDB, test Redis, test S3 client, FastAPI TestClient, mock Auth0, async event loop |
| backend/tests/test_upload.py | CREATE | N/A | Test all upload endpoints, file validation, presigned URL generation, multipart upload flow, error cases |
| backend/tests/test_fingerprint.py | CREATE | N/A | Test fingerprint generation for each media type, hash calculation accuracy, embedding generation, error handling |
| backend/tests/test_analytics.py | CREATE | N/A | Test AI Touch Value™ calculation formula, input validation, edge cases (zero values, negative numbers) |
| backend/tests/test_ai_assistant.py | CREATE | N/A | Test LangChain integration, multi-provider switching, tool calling, streaming responses, context management |
| backend/tests/test_auth.py | CREATE | N/A | Test Auth0 JWT validation, local JWT generation, token expiration, authentication dependencies |
| **FRONTEND - CORE** | | | |
| frontend/src/main.tsx | CREATE | frontend/app.js | Transform to TypeScript React entry point with React 18 createRoot, router provider, context providers, global styles |
| frontend/src/App.tsx | CREATE | N/A | Root component with BrowserRouter, Routes, protected routes, layout wrapper, error boundary |
| frontend/src/vite-env.d.ts | CREATE | N/A | Vite type definitions reference |
| frontend/index.html | CREATE | N/A | HTML template with root div, Vite script, meta tags, title |
| frontend/vite.config.ts | CREATE | N/A | Vite configuration: React plugin, path aliases (@/), proxy API to backend, build settings |
| frontend/tsconfig.json | CREATE | N/A | TypeScript compiler options: strict mode, JSX preserve, module ESNext, path mappings |
| frontend/tsconfig.node.json | CREATE | N/A | TypeScript config for Vite config file |
| frontend/Dockerfile | CREATE | N/A | Multi-stage: install dependencies, build production bundle, serve with nginx |
| frontend/.dockerignore | CREATE | .dockerignore | Frontend-specific exclusions |
| frontend/.env.example | CREATE | N/A | VITE_API_URL, VITE_AUTH0_DOMAIN, VITE_AUTH0_CLIENT_ID template |
| **FRONTEND - STYLING** | | | |
| frontend/src/styles/index.css | CREATE | N/A | Tailwind directives (@tailwind base/components/utilities), custom CSS variables, global styles |
| frontend/tailwind.config.js | CREATE | N/A | Tailwind v3 configuration: content paths, theme extensions, custom colors, plugins |
| frontend/postcss.config.js | CREATE | N/A | PostCSS with tailwindcss and autoprefixer plugins |
| frontend/.eslintrc.json | CREATE | N/A | ESLint configuration: TypeScript parser, React plugin, recommended rules, import sorting |
| frontend/.prettierrc | CREATE | N/A | Prettier configuration: semi, singleQuote, tabWidth, printWidth, trailingComma |
| **FRONTEND - ROUTING** | | | |
| frontend/src/routes/index.tsx | CREATE | N/A | Route definitions: /, /dashboard, /upload, /assets, /wallet, /login with lazy loading |
| frontend/src/routes/PrivateRoute.tsx | CREATE | N/A | Authentication guard component checking auth state, redirect to /login if not authenticated |
| **FRONTEND - PAGES** | | | |
| frontend/src/pages/Dashboard.tsx | CREATE | N/A | Main dashboard with asset stats, recent uploads, AI Touch Score summary, quick actions |
| frontend/src/pages/Upload.tsx | CREATE | N/A | Upload interface with SmartUploader component, URL input, drag-drop zone, progress tracking |
| frontend/src/pages/Assets.tsx | CREATE | N/A | Asset list with filtering, sorting, pagination, AssetCard components, delete actions |
| frontend/src/pages/Wallet.tsx | CREATE | N/A | Wallet balance display, AI Touch Value™ projections, transaction history, payout status |
| frontend/src/pages/Login.tsx | CREATE | N/A | Login form with Auth0 integration, local auth fallback, error handling, redirect after login |
| frontend/src/pages/NotFound.tsx | CREATE | N/A | 404 error page with navigation link to home |
| **FRONTEND - COMPONENTS** | | | |
| frontend/src/components/Layout.tsx | CREATE | N/A | Page layout with Navbar, Sidebar (conditional), main content area, footer |
| frontend/src/components/Navbar.tsx | CREATE | N/A | Top navigation with logo, user menu, notifications, logout button |
| frontend/src/components/Sidebar.tsx | CREATE | N/A | Side navigation with Dashboard, Upload, Assets, Wallet links, collapsible on mobile |
| frontend/src/components/SmartUploader.tsx | CREATE | N/A | Intelligent uploader detecting file size, routing to direct/presigned upload, progress tracking, error handling |
| frontend/src/components/FileDropZone.tsx | CREATE | N/A | Drag-and-drop zone with HTML5 drag events, file validation, visual feedback, multiple file support |
| frontend/src/components/UploadProgress.tsx | CREATE | N/A | Progress bar with percentage, estimated time remaining, cancel button, status messages |
| frontend/src/components/URLInput.tsx | CREATE | N/A | URL input field with platform detection (YouTube/Vimeo/web), validation, submit handler |
| frontend/src/components/AssetCard.tsx | CREATE | N/A | Asset display card with thumbnail, metadata, fingerprint status, AI Touch Score, action buttons |
| frontend/src/components/FingerprintSummary.tsx | CREATE | N/A | Fingerprint visualization with hash values, embedding summary, metadata display |
| frontend/src/components/AITouchScore.tsx | CREATE | N/A | AI Touch Score display with circular progress, color coding, explanation tooltip |
| frontend/src/components/AITouchValue.tsx | CREATE | N/A | AI Touch Value™ calculation display with formula breakdown, input adjustments, projections |
| frontend/src/components/WalletBalance.tsx | CREATE | N/A | Balance display with currency symbol, pending earnings, total earned, visual chart |
| frontend/src/components/TransactionHistory.tsx | CREATE | N/A | Transaction list with date, amount, type, status, pagination, filtering |
| frontend/src/components/AIAssistant.tsx | CREATE | N/A | Chat interface with message list, input field, send button, streaming response handling, tool call visualization |
| frontend/src/components/ChatMessage.tsx | CREATE | N/A | Individual message bubble with user/assistant distinction, timestamp, markdown rendering |
| **FRONTEND - HOOKS** | | | |
| frontend/src/hooks/useAuth.tsx | CREATE | N/A | Authentication hook exposing user, login, logout, isAuthenticated, isLoading, token management |
| frontend/src/hooks/useUpload.tsx | CREATE | N/A | Upload management hook with file queue, upload function, progress tracking, error handling, cancel ability |
| frontend/src/hooks/useAssets.tsx | CREATE | N/A | Asset fetching hook with pagination, filtering, sorting, refetch function, loading/error states |
| frontend/src/hooks/useWallet.tsx | CREATE | N/A | Wallet data hook fetching balance, transaction history, pending payouts with auto-refresh |
| frontend/src/hooks/useAIAssistant.tsx | CREATE | N/A | AI assistant hook managing conversation, sending messages, handling streaming responses, context |
| frontend/src/hooks/useWebSocket.tsx | CREATE | N/A | WebSocket connection hook for real-time updates (upload progress, processing status) |
| **FRONTEND - SERVICES** | | | |
| frontend/src/services/api.ts | CREATE | N/A | Axios instance with base URL, auth interceptor adding JWT, error interceptor handling 401/403, retry logic |
| frontend/src/services/authService.ts | CREATE | N/A | Login, logout, getCurrentUser, refreshToken functions calling backend auth endpoints |
| frontend/src/services/uploadService.ts | CREATE | N/A | Upload functions: direct upload, presigned URL flow, multipart upload, URL submission |
| frontend/src/services/assetService.ts | CREATE | N/A | Asset management: getAssets, getAsset, deleteAsset, getFingerprint functions |
| frontend/src/services/walletService.ts | CREATE | N/A | Wallet API calls: getBalance, getTransactionHistory |
| frontend/src/services/assistantService.ts | CREATE | N/A | AI assistant API: sendMessage with streaming support, conversation history retrieval |
| frontend/src/services/storageService.ts | CREATE | N/A | Local storage utilities: get/set/remove token, user preferences, upload queue persistence |
| **FRONTEND - CONTEXTS** | | | |
| frontend/src/contexts/AuthContext.tsx | CREATE | N/A | Auth context provider managing user state, authentication status, login/logout methods |
| frontend/src/contexts/UploadContext.tsx | CREATE | N/A | Upload context managing active uploads, queue, progress tracking, global upload state |
| frontend/src/contexts/ThemeContext.tsx | CREATE | N/A | Theme context for light/dark mode toggle, preference persistence |
| **FRONTEND - TYPES** | | | |
| frontend/src/types/asset.ts | CREATE | N/A | Asset, Fingerprint, UploadStatus, FileType TypeScript interfaces |
| frontend/src/types/user.ts | CREATE | N/A | User, AuthState TypeScript interfaces |
| frontend/src/types/wallet.ts | CREATE | N/A | WalletBalance, Transaction, TransactionType TypeScript interfaces |
| frontend/src/types/api.ts | CREATE | N/A | APIResponse, PaginatedResponse, APIError TypeScript interfaces |
| **DOCUMENTATION** | | | |
| README.md | UPDATE | README.md | Comprehensive project documentation: overview, features, architecture, setup instructions, running with Docker, development workflow |
| docs/API.md | CREATE | N/A | Complete API documentation for all 20+ endpoints with request/response examples, authentication requirements, error codes |
| docs/DEPLOYMENT.md | CREATE | N/A | Deployment guide covering Docker Compose, environment configuration, production considerations, scaling strategies |
| docs/DEVELOPMENT.md | CREATE | N/A | Development setup guide: prerequisites, environment setup, running locally, testing, code quality tools, contribution guidelines |
| docs/ARCHITECTURE.md | CREATE | N/A | System architecture documentation with diagrams: component overview, data flow, service interactions, security model |
| **SCRIPTS** | | | |
| scripts/init_db.py | CREATE | N/A | MongoDB initialization: create databases, collections, indexes, seed admin user |
| scripts/create_test_data.py | CREATE | N/A | Generate test data: sample assets, fingerprints, wallet transactions for development |
| scripts/backup.sh | CREATE | N/A | Bash script for MongoDB backup with timestamp, compression, S3 upload |
| scripts/deploy.sh | CREATE | N/A | Deployment automation: pull latest, build containers, run migrations, restart services |

#### New Files Detail

All files listed in the transformation mapping above require creation from scratch, with the following exceptions:

**Files to Modify:**
- `backend/main.py` - Transform placeholder into full FastAPI application
- `backend/pyproject.toml` - Add project metadata, scripts, and tool configuration
- `frontend/app.js` - Delete and replace with TypeScript React entry point
- `frontend/package.json` - Update scripts, add dependencies
- `README.md` - Replace minimal content with comprehensive documentation

**Key Implementation Priorities:**

1. **Backend Core** (backend/app/main.py, core/, models/): Foundation for all services
2. **Storage Layer** (storage_service.py, core/storage.py): Enable file uploads immediately
3. **Upload API** (api/v1/upload.py, services/upload_service.py): Core user-facing functionality
4. **Frontend Foundation** (main.tsx, App.tsx, routes/): UI framework
5. **Smart Uploader** (SmartUploader.tsx, useUpload.tsx): Primary user interaction
6. **Authentication** (auth.py, auth.py, AuthContext.tsx): Secure access
7. **Fingerprinting** (fingerprinting_service.py, api/v1/fingerprint.py): Core platform feature
8. **AI Assistant** (ai_assistant_service.py, AIAssistant.tsx): Differentiating feature
9. **Docker Orchestration** (docker-compose.yml): Development environment
10. **Documentation** (README.md, docs/*.md): Developer onboarding

#### Cross-File Dependencies

**Backend Dependencies:**
- All API routes depend on services (upload_service, storage_service, etc.)
- All services depend on core modules (database, redis_client, storage)
- All services depend on models for type safety
- All services depend on utils for validation, caching, logging
- Main.py depends on all routers for registration

**Frontend Dependencies:**
- All pages depend on components for UI elements
- All components depend on hooks for data and state
- All hooks depend on services for API calls
- All services depend on api.ts for HTTP client
- App.tsx depends on contexts, routes, and Layout

**Configuration Dependencies:**
- docker-compose.yml depends on all Dockerfiles
- Environment files (.env) required by both backend config.py and frontend services
- package.json drives frontend dependency installation
- pyproject.toml drives backend dependency installation

#### Wildcard Patterns for Future Files

- `backend/app/api/v2/**/*.py` - Future API version 2 endpoints
- `backend/app/services/*_service.py` - Additional service modules
- `frontend/src/components/**/*.tsx` - Additional reusable components
- `frontend/src/pages/**/*.tsx` - Additional page routes
- `docs/**/*.md` - Additional documentation as system grows

## 0.7 Dependency Inventory

#### Key Private and Public Packages

#### Backend Dependencies (Python/PyPI)

| Registry | Package Name | Version | Purpose |
|----------|--------------|---------|---------|
| PyPI | fastapi | 0.122.0 | Web framework for building APIs with automatic OpenAPI documentation |
| PyPI | uvicorn | 0.38.0 | ASGI server for running FastAPI application with WebSocket support |
| PyPI | pydantic | 2.12.4 | Data validation and settings management using Python type annotations |
| PyPI | pydantic-settings | 2.12.0 | Settings management from environment variables |
| PyPI | motor | 3.7.1 | Async MongoDB driver for Python, compatible with asyncio |
| PyPI | pymongo | 4.15.4 | Synchronous MongoDB driver (Motor dependency) |
| PyPI | redis | 7.1.0 | Async Redis client for caching and session management |
| PyPI | boto3 | 1.41.4 | AWS SDK for Python - S3-compatible storage operations |
| PyPI | python-jose | 3.5.0 | JWT token encoding and decoding |
| PyPI | passlib | 1.7.4 | Password hashing utilities |
| PyPI | bcrypt | 5.0.0 | Password hashing algorithm (Passlib backend) |
| PyPI | python-multipart | 0.0.20 | Multipart form data parser for file uploads |
| PyPI | aiofiles | 25.1.0 | Async file I/O operations |
| PyPI | langchain | 1.1.0 | Framework for developing LLM-powered applications |
| PyPI | langchain-openai | 1.1.0 | OpenAI integration for LangChain (GPT-4/5 support) |
| PyPI | langchain-anthropic | 1.2.0 | Anthropic Claude integration for LangChain |
| PyPI | langchain-google-genai | 3.2.0 | Google Gemini integration for LangChain |
| PyPI | pillow | 12.0.0 | Image processing library for metadata extraction |
| PyPI | imagehash | 4.3.2 | Perceptual image hashing (pHash, aHash, dHash) |
| PyPI | librosa | 0.11.0 | Audio analysis and spectral fingerprinting |
| PyPI | opencv-python-headless | 4.12.0.88 | Computer vision library for video processing (no GUI) |
| PyPI | requests | 2.32.5 | HTTP library for URL content fetching |
| PyPI | pyyaml | 6.0.3 | YAML configuration file parsing |
| PyPI | pytest | 9.0.1 | Testing framework |
| PyPI | pytest-asyncio | 1.3.0 | Pytest plugin for async test support |
| PyPI | pytest-cov | 7.0.0 | Code coverage reporting for pytest |
| PyPI | httpx | 0.28.1 | Async HTTP client for testing FastAPI endpoints |
| PyPI | black | 25.11.0 | Code formatter |
| PyPI | ruff | 0.14.6 | Fast Python linter |
| PyPI | mypy | 1.18.2 | Static type checker |
| PyPI | youtube-transcript-api | (to be added) | YouTube transcript extraction |
| PyPI | beautifulsoup4 | (to be added) | Web scraping for URL content |
| PyPI | lxml | (to be added) | HTML/XML parsing (BeautifulSoup backend) |

#### Frontend Dependencies (npm)

| Registry | Package Name | Version | Purpose |
|----------|--------------|---------|---------|
| npm | react | 18.3.1 | UI library for building component-based interfaces |
| npm | react-dom | 18.3.1 | React renderer for web browsers |
| npm | react-router-dom | 6.28.1 | Client-side routing for single-page applications |
| npm | @types/react | 18.3.18 | TypeScript type definitions for React |
| npm | @types/react-dom | 18.3.5 | TypeScript type definitions for ReactDOM |
| npm | typescript | 5.7.3 | TypeScript compiler and language support |
| npm | vite | 6.2.1 | Fast build tool and development server |
| npm | @vitejs/plugin-react | 4.3.4 | Vite plugin for React with Fast Refresh |
| npm | tailwindcss | 3.4.17 | Utility-first CSS framework |
| npm | postcss | 8.4.49 | CSS transformation tool (Tailwind dependency) |
| npm | autoprefixer | 10.4.20 | PostCSS plugin for vendor prefixes |
| npm | eslint | 9.18.0 | JavaScript/TypeScript linter |
| npm | prettier | 3.4.2 | Code formatter |
| npm | eslint-config-prettier | 9.1.0 | Disable ESLint rules that conflict with Prettier |
| npm | @typescript-eslint/eslint-plugin | 8.20.0 | TypeScript-specific linting rules |
| npm | @typescript-eslint/parser | 8.20.0 | ESLint parser for TypeScript |
| npm | axios | 1.7.9 | Promise-based HTTP client |
| npm | @testing-library/react | 16.3.0 | React component testing utilities |
| npm | @testing-library/jest-dom | 6.6.3 | Custom Jest matchers for DOM testing |
| npm | vitest | 3.0.0 | Vite-native testing framework |

#### Infrastructure Dependencies

| Registry | Package Name | Version | Purpose |
|----------|--------------|---------|---------|
| Docker Hub | mongo | 8.0 | MongoDB database server |
| Docker Hub | redis | 7.4-alpine | Redis cache and session store |
| Docker Hub | minio/minio | latest | S3-compatible object storage |
| Docker Hub | python | 3.11-slim | Python runtime base image |
| Docker Hub | node | 20-alpine | Node.js runtime for frontend builds |
| Docker Hub | nginx | 1.27-alpine | Web server for frontend production serving |

#### Dependency Updates

**New Dependencies to Add:**

Backend additions required:
- youtube-transcript-api: ^0.6.1 - Extract transcripts from YouTube videos
- beautifulsoup4: ^4.12.3 - Parse HTML content from URLs
- lxml: ^5.1.0 - High-performance XML/HTML parser
- python-dotenv: 1.2.1 - Load environment variables from .env files (already installed via pydantic-settings)

Frontend additions required:
- axios: ^1.7.9 - HTTP client for API calls
- @testing-library/react: ^16.3.0 - Component testing
- vitest: ^3.0.0 - Test runner

**Dependencies to Update:**

No updates required - all dependencies are at their latest stable versions as of the project initialization.

**Dependencies to Remove:**

- `frontend/app.js` will be removed and replaced with TypeScript/React implementation
- No backend dependencies require removal

**Import/Reference Updates:**

Backend import transformations:
- Old: `from fastapi import FastAPI` (remains unchanged)
- New: All new service imports following pattern `from app.services.{service}_service import {ServiceClass}`
- New: All model imports following pattern `from app.models.{model} import {ModelClass}`
- New: LangChain imports: `from langchain.chat_models import init_chat_model`

Frontend import transformations:
- Old: None (starting fresh with TypeScript)
- New: All imports using path alias: `import { Component } from '@/components/Component'`
- New: API service imports: `import { apiClient } from '@/services/api'`
- New: Hook imports: `import { useAuth } from '@/hooks/useAuth'`

Files requiring import updates:
- `backend/app/main.py` - Import all routers from api.v1
- `backend/app/api/v1/__init__.py` - Import and register all route modules
- All backend service files - Import core utilities, models, and dependencies
- `frontend/src/App.tsx` - Import all contexts, routes, and layout components
- All frontend page components - Import required components and hooks

#### Version Management Strategy

**Backend (Poetry):**
- Use semantic versioning with caret (^) for minor updates: `^0.122.0` allows 0.122.x to 0.x.x
- Lock exact versions in poetry.lock for reproducible builds
- Python version constraint: `^3.11` (3.11.0 to <4.0.0)

**Frontend (npm):**
- Use semantic versioning with caret (^) for minor updates
- Lock exact versions in package-lock.json for reproducible builds
- Node.js version: >=20.0.0 (specified in package.json engines)

**Docker Images:**
- Pin major versions for stability: `mongo:8.0`, `redis:7.4-alpine`
- Use specific Python version: `python:3.11-slim`
- Use specific Node version: `node:20-alpine`
- Review and update quarterly for security patches

**AI Provider SDKs:**
- LangChain packages use flexible versioning to receive compatibility updates
- Monitor breaking changes in provider APIs (OpenAI, Anthropic, Google)
- Test multi-provider compatibility after any LangChain update

## 0.8 Implementation Design

#### Technical Approach

**Primary Objectives with Implementation Approach:**

**1. Achieve hybrid upload architecture by:**
- Creating `storage_service.py` with presigned URL generation using boto3's `generate_presigned_url` method with 15-minute expiration
- Implementing size detection in `upload_service.py` that routes files <10MB to direct upload handler using FastAPI's `UploadFile` streaming
- Building multipart upload flow: initiate with `create_multipart_upload`, track ETags from part uploads, complete with `complete_multipart_upload`
- Adding upload confirmation endpoint that verifies S3 object existence via `head_object` before creating MongoDB asset record
- Rationale: Direct uploads minimize backend load for small files, while presigned URLs enable client-to-S3 direct transfer for large files without backend bottleneck

**2. Achieve multi-modal fingerprinting by:**
- Creating separate handler methods in `fingerprinting_service.py` for each media type (process_image, process_audio, process_video, process_text)
- Implementing image fingerprinting with imagehash library generating pHash (perceptual), aHash (average), dHash (difference) for robustness against transformations
- Adding audio fingerprinting using librosa's mel-spectrogram extraction and chromagram analysis for spectral signatures
- Implementing video fingerprinting with opencv frame extraction at 1-second intervals, applying image hashing to representative frames
- Integrating LangChain's OpenAI embeddings for multi-modal semantic similarity detection
- Storing all fingerprint data in MongoDB fingerprint collection with asset_id references
- Rationale: Multiple hashing algorithms provide redundancy; spectral analysis captures audio uniqueness; frame sampling enables efficient video processing

**3. Achieve AI Touch Value™ calculation by:**
- Implementing exact formula in `ai_value_service.py`: `value = model_earnings * (contribution_score / 100) * (exposure_score / 100) * 0.25`
- Validating inputs: model_earnings ≥ 0, contribution_score 0-100, exposure_score 0-100
- Building predictive model using user metrics (followers, content hours, views, platform) to estimate contribution and exposure scores
- Storing calculation history in analytics collection for trend analysis
- Rationale: Fixed 25% equity factor ensures consistent creator compensation; score normalization (0-100) simplifies interpretation

**4. Achieve LangChain multi-provider support by:**
- Using `init_chat_model` with provider:model format: "openai:gpt-4", "anthropic:claude-3-5-sonnet", "google_vertexai:gemini-2.0-flash"
- Configuring provider selection via environment variable or API parameter for runtime switching
- Implementing tool calling with `.bind_tools()` method to enable assistant to query fingerprint data and analytics
- Managing conversation context in Redis with 1-hour TTL, storing message history as JSON array
- Adding streaming response support using FastAPI's StreamingResponse with Server-Sent Events
- Rationale: Provider abstraction enables flexibility; tool calling enhances assistant capabilities; Redis context enables multi-turn conversations

**5. Achieve secure authentication by:**
- Integrating Auth0 JWT validation using python-jose with RS256 algorithm verification against Auth0 public key
- Implementing fallback local JWT generation using HS256 with SECRET_KEY from environment when Auth0 unavailable
- Creating FastAPI dependency `get_current_user` that extracts JWT from Authorization header, validates, and returns user object
- Adding token refresh endpoint with sliding expiration
- Rationale: Auth0 provides enterprise-grade security; local fallback enables development without Auth0 configuration; JWT dependencies simplify route protection

**6. Achieve React frontend architecture by:**
- Structuring application with feature-based organization: pages, components, hooks, services, contexts
- Implementing React Router v6 with lazy loading for code splitting: `const Dashboard = lazy(() => import('@/pages/Dashboard'))`
- Creating custom hooks for data fetching with loading/error states, automatic retry, and caching
- Using Context API for global state (auth, theme, upload queue) to avoid prop drilling
- Applying TailwindCSS utility classes for responsive design with mobile-first approach
- Rationale: Feature organization improves maintainability; lazy loading reduces initial bundle; custom hooks encapsulate logic; Context avoids external state management complexity

#### Logical Implementation Flow

**First, establish storage foundation by:**
- Configuring S3-compatible client in `core/storage.py` with boto3, supporting MinIO (development) and AWS S3 (production) via endpoint URL configuration
- Creating MinIO buckets in docker-compose startup script with policies allowing presigned URL access
- Implementing storage service methods: generate_presigned_url, upload_file, download_file, delete_file, initiate_multipart_upload
- Testing storage operations with pytest fixtures mocking boto3 client

**Next, integrate upload functionality by:**
- Building upload service that determines routing based on file size threshold (10MB)
- Implementing direct upload endpoint receiving multipart form data, validating file type/size, streaming to temporary location, uploading to S3, creating asset record
- Creating presigned URL endpoint generating signed PUT URL with content-type restriction and size limit
- Adding confirmation endpoint validating S3 upload success via HEAD request, extracting metadata, creating asset record
- Implementing file validator rejecting dangerous extensions (.zip, .exe, etc.) and enforcing 500MB limit

**Next, implement fingerprinting engine by:**
- Creating fingerprinting service with async task processing using FastAPI BackgroundTasks
- Implementing image handler: load image with PIL, resize to standard dimensions, generate pHash/aHash/dHash, extract EXIF metadata, generate CLIP embeddings
- Adding audio handler: load audio with librosa, extract mel-spectrogram, compute chromagram, calculate spectral centroid, generate embeddings
- Building video handler: extract frames at 1-second intervals with opencv, apply image hashing to frames, compute average hash, extract codec/resolution metadata
- Creating fingerprint model storing all hash types, embeddings, metadata, and asset_id reference
- Adding TODO markers: `# TODO Phase 2: Compare embeddings against known AI training datasets`, `# TODO Phase 2: Implement similarity threshold detection`

**Next, build AI Touch Value™ engine by:**
- Implementing calculation service with input validation and formula application
- Creating analytics model storing calculation inputs, outputs, timestamp for historical tracking
- Building prediction endpoint accepting user metrics (followers, views, hours, platform) and returning estimated value
- Adding frontend visualization component displaying formula breakdown and value projection

**Next, integrate AI assistant by:**
- Configuring LangChain with multi-provider support using environment-based provider selection
- Implementing conversation service managing context in Redis with message history
- Creating tool functions for fingerprint lookup and analytics query that assistant can invoke
- Building streaming endpoint using FastAPI StreamingResponse yielding chunks from LangChain
- Adding frontend chat component handling streaming responses with incremental message updates

**Finally, ensure quality by:**
- Writing comprehensive tests for each service with pytest and TestClient
- Implementing frontend component tests with React Testing Library
- Adding Docker Compose orchestration for integrated testing environment
- Configuring Black, Ruff, ESLint, Prettier for code quality enforcement
- Creating CI/CD pipeline hooks for automated testing and linting

#### Component Impact Analysis

**Direct Modifications Required:**

**Core Backend Services:**
- `app/main.py`: Configure FastAPI app with CORS middleware allowing frontend origin, add exception handlers for 404/500, register all v1 routers, add startup event for database connection, shutdown event for cleanup
- `app/core/database.py`: Initialize Motor client with connection pooling (min 10, max 100), implement health check pinging MongoDB, provide getters for database and collections
- `app/core/redis_client.py`: Create Redis async client with decode_responses=True, implement connection retry logic, provide caching decorators
- `app/core/storage.py`: Configure boto3 S3 client with endpoint_url from environment supporting MinIO, implement presigned URL generation with configurable expiration
- `app/core/auth.py`: Implement Auth0 JWT validation using JWKs, add local JWT generation fallback, create FastAPI Depends injectable for route protection

**Service Layer:**
- `app/services/upload_service.py`: Implement file size detection, route to appropriate upload method, coordinate with storage and validation services
- `app/services/storage_service.py`: Wrap boto3 operations in async methods, implement multipart upload flow, handle errors with custom exceptions
- `app/services/fingerprinting_service.py`: Create async fingerprint generation methods for each media type, integrate embedding models, store results in MongoDB
- `app/services/ai_value_service.py`: Implement calculation formula with input validation, store results, provide historical trend analysis
- `app/services/ai_assistant_service.py`: Configure LangChain provider switching, implement tool calling, manage conversation context in Redis

**API Layer:**
- `app/api/v1/upload.py`: Define 7 upload endpoints with proper request/response models, implement file validation, return appropriate status codes (200, 400, 413, 415)
- `app/api/v1/fingerprint.py`: Create async fingerprint generation endpoint triggering background task, provide status check endpoint
- `app/api/v1/analytics.py`: Implement prediction endpoint with input validation, return calculation breakdown
- `app/api/v1/assets.py`: Build CRUD endpoints with pagination using skip/limit, implement filtering by file_type/status
- `app/api/v1/wallet.py`: Create balance and history endpoints requiring authentication
- `app/api/v1/assistant.py`: Implement streaming chat endpoint using Server-Sent Events
- `app/api/v1/auth.py`: Build login endpoint validating credentials, logout clearing Redis session, me endpoint returning current user

**Frontend Core:**
- `src/main.tsx`: Initialize React 18 app with createRoot, wrap with AuthContext, UploadContext, BrowserRouter
- `src/App.tsx`: Define route structure with lazy-loaded pages, implement PrivateRoute wrapper, add error boundary
- `src/services/api.ts`: Configure axios with baseURL from environment, add auth interceptor attaching JWT, implement error handling interceptor

**Frontend Components:**
- `src/components/SmartUploader.tsx`: Detect file size, show appropriate UI (direct upload progress or presigned URL flow), handle errors with user-friendly messages
- `src/components/FileDropZone.tsx`: Implement HTML5 drag-and-drop events, show drop target highlight, validate dropped files, trigger upload
- `src/components/AIAssistant.tsx`: Build chat interface with message list, input field, streaming response handler updating UI incrementally

**Indirect Impacts and Dependencies:**

**Data Model Changes:**
- Asset model requires fields for all metadata types (image EXIF, audio properties, video specs)
- Fingerprint model needs flexible structure supporting multiple hash types and embedding formats
- User model requires auth0_id field for external authentication integration
- Wallet model needs transaction type enum (earning, payout, adjustment)

**Configuration Impact:**
- Environment variables must be loaded in config.py and validated at startup
- Docker Compose must configure service networking with proper DNS names
- MinIO requires bucket creation and policy configuration in startup script
- MongoDB needs indexes on frequently queried fields (user_id, created_at, asset_id)

**Testing Impact:**
- Test fixtures must provide MongoDB and Redis test instances
- S3 operations require mocking boto3 client to avoid external dependencies
- Authentication tests need mock JWT tokens with various expiration scenarios
- Frontend tests require mocked API responses with MSW (Mock Service Worker)

#### New Components Introduction

**Storage Abstraction Layer:**
- Component: `core/storage.py` with StorageClient class
- Responsibility: Abstract S3/MinIO operations, provide consistent interface for presigned URLs, multipart uploads, object management
- Rationale: Enables cloud-agnostic design, simplifies service layer code, centralizes error handling

**Fingerprint Processing Pipeline:**
- Component: `services/fingerprinting_service.py` with FingerprintingService class
- Responsibility: Orchestrate multi-modal fingerprint generation, coordinate hash calculation and embedding generation, store results
- Rationale: Centralized fingerprinting logic ensures consistency, background processing prevents blocking, modular design enables adding new algorithms

**AI Assistant Orchestrator:**
- Component: `services/ai_assistant_service.py` with AIAssistantService class
- Responsibility: Manage LangChain provider configuration, handle tool calling, maintain conversation context
- Rationale: Abstracts LLM complexity from API layer, enables provider switching without code changes, centralizes context management

**Upload Router Component:**
- Component: `services/upload_service.py` with UploadRouter class  
- Responsibility: Determine upload strategy based on file size, coordinate validation and storage operations
- Rationale: Single responsibility for upload routing, simplifies API endpoint code, enables adding new upload strategies

#### Critical Implementation Details

**Design Patterns:**
- **Repository Pattern**: Used in service layer accessing MongoDB collections through abstracted methods
- **Factory Pattern**: Applied in ai_assistant_service for LangChain provider instantiation based on configuration
- **Decorator Pattern**: Used in caching utilities wrapping service methods with Redis caching
- **Strategy Pattern**: Implemented in upload routing choosing between direct and presigned URL strategies

**Key Algorithms:**
- **Perceptual Hashing**: imagehash library implementing pHash algorithm computing discrete cosine transform, producing hash resistant to minor image modifications
- **Spectral Fingerprinting**: librosa mel-spectrogram extraction creating frequency-time representation of audio, capturing timbral characteristics
- **Frame Sampling**: opencv-based video processing extracting frames at regular intervals (1 second), applying image hashing to representative frames
- **AI Touch Value™ Calculation**: Multiplicative formula ensuring all factors contribute proportionally, 25% equity factor applied as fixed industry-standard creator compensation rate

**Integration Strategies:**
- **Auth0 Integration**: OAuth 2.0 flow with PKCE for frontend, JWT validation in backend using Auth0 public keys, fallback to local JWT for development
- **LangChain Integration**: Provider abstraction layer supporting multiple LLM providers, tool calling for data retrieval, streaming responses for real-time interaction
- **S3 Integration**: Presigned URL pattern enabling direct client-to-S3 transfer, multipart upload for large files with resumable capability
- **MongoDB Integration**: Motor async driver for non-blocking database operations, change streams for real-time updates (future enhancement)
- **Redis Integration**: Pub/Sub for real-time notifications (future), caching with TTL for frequently accessed data, session storage for authentication

**Data Flow Modifications:**
- **Upload Flow**: Client → Backend (size check) → S3 (via presigned URL if >10MB) → Backend (confirmation) → MongoDB (asset record) → Background (fingerprinting)
- **Fingerprint Flow**: Background task → Download from S3 → Generate hashes → Generate embeddings → Store in MongoDB → Update asset status
- **Analytics Flow**: Client → Backend (user metrics) → Calculation service → Formula application → MongoDB storage → Response with breakdown
- **Assistant Flow**: Client → Backend (message) → LangChain (processing) → Tool execution (if needed) → Streaming response → Client (incremental updates)

**Error Handling and Edge Cases:**
- **Upload Failures**: Retry logic with exponential backoff, partial upload cleanup, user notification with actionable error messages
- **Fingerprinting Errors**: Skip unsupported formats gracefully, log errors for investigation, mark asset as "processing_failed" with reason
- **Authentication Edge Cases**: Handle expired tokens with refresh flow, invalid tokens with 401 response, missing tokens with clear error messages
- **Provider Failures**: Implement circuit breaker for LLM providers, fallback to alternative providers, cache responses to reduce API calls
- **Storage Errors**: Implement retry for transient S3 errors, cleanup partial uploads on failure, validate presigned URL expiration

**Performance and Security Considerations:**
- **Performance Optimizations**: Redis caching with strategic TTL (5 minutes for metadata, 1 hour for fingerprints), MongoDB connection pooling, lazy loading frontend routes, image resizing before fingerprinting
- **Security Measures**: File type validation with MIME checking, size limits strictly enforced, presigned URL expiration (15 minutes), JWT short expiration with refresh, input sanitization for all user data, SQL injection prevention (using MongoDB parameterized queries)
- **Scalability Considerations**: Stateless backend design enabling horizontal scaling, background task processing preventing blocking, Redis for distributed caching, S3 for distributed storage, MongoDB sharding capability

## 0.9 Scope Boundaries

#### Exhaustively In Scope

**Backend Source Code Changes:**
- `backend/app/**/*.py` - All Python application modules including:
  - `main.py` - FastAPI application entry point and configuration
  - `config.py` - Environment-based settings management
  - `core/*.py` - Database, Redis, storage, and authentication core services
  - `models/*.py` - Pydantic data models for assets, users, wallet, analytics, fingerprints
  - `api/v1/*.py` - All API endpoint implementations (upload, fingerprint, analytics, assets, wallet, assistant, auth)
  - `services/*.py` - Business logic services (upload, storage, fingerprinting, AI value, AI assistant, metadata extraction, URL processing)
  - `utils/*.py` - Utility functions (file validation, caching, logging, security)
- `backend/tests/**/*.py` - Complete test suite with unit and integration tests
- `backend/__init__.py` files - Package markers throughout directory structure

**Backend Configuration Updates:**
- `backend/pyproject.toml` - Poetry project metadata, dependencies, tool configurations (Black, Ruff)
- `backend/.env.example` - Environment variable template with all required keys
- `backend/pytest.ini` - Pytest configuration for test discovery and execution
- `backend/ruff.toml` - Linter rules and exclusions
- `backend/Dockerfile` - Multi-stage Docker build for production deployment
- `backend/.dockerignore` - Build exclusions (.venv, __pycache__, .env)
- `backend/requirements.txt` - Generated from Poetry for Docker builds

**Frontend Source Code Changes:**
- `frontend/src/**/*.tsx` - All TypeScript React components:
  - `main.tsx` - Application entry point with React 18 initialization
  - `App.tsx` - Root component with routing and context providers
  - `routes/*.tsx` - Route definitions and private route wrapper
  - `pages/*.tsx` - Dashboard, Upload, Assets, Wallet, Login, NotFound pages
  - `components/*.tsx` - Reusable UI components (SmartUploader, FileDropZone, UploadProgress, AIAssistant, AssetCard, etc.)
  - `hooks/*.tsx` - Custom React hooks (useAuth, useUpload, useAssets, useWallet, useAIAssistant, useWebSocket)
  - `contexts/*.tsx` - Context providers (AuthContext, UploadContext, ThemeContext)
- `frontend/src/**/*.ts` - TypeScript utilities and services:
  - `services/*.ts` - API clients (api, authService, uploadService, assetService, walletService, assistantService, storageService)
  - `types/*.ts` - TypeScript type definitions (asset, user, wallet, api)
- `frontend/src/styles/index.css` - Global styles with Tailwind directives

**Frontend Configuration Updates:**
- `frontend/vite.config.ts` - Vite build configuration with plugins and path aliases
- `frontend/tsconfig.json` - TypeScript compiler options for application code
- `frontend/tsconfig.node.json` - TypeScript configuration for Node.js files (Vite config)
- `frontend/tailwind.config.js` - TailwindCSS configuration with theme customization
- `frontend/postcss.config.js` - PostCSS with Tailwind and Autoprefixer
- `frontend/.eslintrc.json` - ESLint rules and TypeScript parser configuration
- `frontend/.prettierrc` - Code formatting rules
- `frontend/package.json` - npm dependencies and scripts (dev, build, preview, lint, test)
- `frontend/index.html` - HTML entry point template
- `frontend/Dockerfile` - Multi-stage build for production with nginx serving
- `frontend/.dockerignore` - Frontend-specific build exclusions
- `frontend/.env.example` - Frontend environment variable template (API URL, Auth0 config)

**Infrastructure and Orchestration:**
- `docker-compose.yml` - Service definitions for backend, frontend, MongoDB, Redis, MinIO with:
  - Network configuration for inter-service communication
  - Volume definitions for persistent data (MongoDB data, MinIO data)
  - Environment variable configurations
  - Health check definitions
  - Port mappings for all services
- `docker-compose.dev.yml` - Development-specific overrides (hot-reload volumes, debug ports)
- `.gitignore` - Repository-wide exclusions (.env files, build artifacts, IDE files)

**Documentation Updates:**
- `README.md` - Complete project overview including:
  - System description and key features
  - Architecture overview
  - Prerequisites and installation instructions
  - Docker Compose setup and running
  - Development workflow
  - Testing procedures
  - Environment configuration
  - API endpoint summary
  - Contributing guidelines
- `docs/API.md` - Comprehensive API documentation:
  - All 20+ endpoint specifications
  - Request/response examples with sample payloads
  - Authentication requirements for each endpoint
  - Error response codes and meanings
  - Rate limiting information
- `docs/DEPLOYMENT.md` - Deployment procedures:
  - Environment preparation
  - Docker Compose production setup
  - Environment variable configuration
  - Database initialization
  - Backup and recovery procedures
  - Scaling strategies
  - Monitoring setup
- `docs/DEVELOPMENT.md` - Developer onboarding:
  - Local development environment setup
  - Running services independently
  - Code quality tools usage (Black, Ruff, ESLint, Prettier)
  - Testing guidelines
  - Git workflow and branching strategy
  - Troubleshooting common issues
- `docs/ARCHITECTURE.md` - System architecture documentation:
  - High-level architecture diagram
  - Component interaction flows
  - Data models and relationships
  - Security architecture
  - Scalability considerations
  - Technology stack rationale

**Automation Scripts:**
- `scripts/init_db.py` - MongoDB initialization:
  - Database and collection creation
  - Index creation for optimized queries
  - Admin user seeding
  - Validation rules setup
- `scripts/create_test_data.py` - Test data generation:
  - Sample users, assets, fingerprints
  - Wallet transactions
  - Analytics calculations
- `scripts/backup.sh` - Database backup automation:
  - MongoDB dump with timestamp
  - Compression and archival
  - Optional S3 upload
- `scripts/deploy.sh` - Deployment automation:
  - Git pull latest code
  - Docker image rebuilding
  - Database migration execution
  - Service restart with zero downtime

**Testing Infrastructure:**
- `backend/tests/conftest.py` - Pytest fixtures:
  - Test MongoDB instance setup
  - Test Redis instance setup
  - Mock S3 client
  - TestClient for FastAPI
  - Mock Auth0 tokens
- `backend/tests/test_*.py` - Backend test modules:
  - Unit tests for all service methods
  - Integration tests for API endpoints
  - Mock-based testing for external dependencies
- `frontend/src/**/*.test.tsx` - Frontend component tests:
  - Component rendering tests
  - User interaction tests
  - API integration tests with mocked responses

#### Explicitly Out of Scope

**Phase 2 Functionality (Marked with TODOs):**
- AI training detection engine implementation
- Dataset comparison engine comparing fingerprints against known AI training datasets
- Embedding drift analysis for detecting model training patterns
- Similarity-law threshold algorithms for legal determination
- Legal evidence export module generating court-ready documentation
- Automated compensation calculation based on detected training usage
- Blockchain integration for immutable proof of ownership

**Real Payment Processing:**
- Actual wallet funding mechanisms
- Payment gateway integrations (Stripe, PayPal, etc.)
- Real money transfers to creator accounts
- Tax reporting and 1099 generation
- Payout approval workflows
- Banking API integrations

**Advanced Authentication Features:**
- Multi-factor authentication (MFA/2FA)
- Social login providers beyond Auth0 (Google, GitHub, etc.)
- Role-based access control (RBAC) with granular permissions
- User invitation and team management
- API key generation for programmatic access
- OAuth 2.0 provider implementation for third-party integrations

**Performance Optimizations Beyond MVP:**
- Database query optimization beyond basic indexing
- Advanced caching strategies (cache warming, invalidation patterns)
- CDN integration for static asset delivery
- Image optimization and WebP conversion
- Service worker for offline capability
- Database read replicas for scaling
- Elasticsearch integration for advanced search

**Advanced Features Not in Initial Requirements:**
- Batch upload processing for multiple files
- Asset versioning and history tracking
- Collaborative features (sharing, commenting)
- Advanced analytics dashboard with custom reporting
- Real-time notifications via WebSocket
- Mobile applications (iOS, Android)
- Desktop applications (Electron)
- Public API for third-party integrations
- Webhook system for event notifications

**Deployment Enhancements:**
- Kubernetes orchestration
- Auto-scaling configurations
- Multi-region deployment
- Blue-green deployment strategy
- Canary releases
- Infrastructure as Code (Terraform, CloudFormation)
- CI/CD pipeline automation (GitHub Actions, GitLab CI)

**Additional AI Features:**
- Additional AI model providers beyond OpenAI, Anthropic, Google
- Fine-tuned models specific to creator content analysis
- Custom embedding models trained on creator datasets
- AI-powered content recommendations
- Automated tagging and categorization
- Sentiment analysis on creator content
- Trend prediction for creator earnings

**Enhanced Security Features:**
- Penetration testing and security audits
- DDoS protection integration
- Rate limiting with Redis
- API abuse detection
- Content security policy (CSP) headers
- GDPR compliance tools (data export, deletion requests)
- SOC 2 compliance implementation

**Items Explicitly Excluded by User Instructions:**
- Alternative backend frameworks (Django, Flask, Express)
- Alternative frontend frameworks (Vue, Angular, Svelte)
- Cloud-specific SDKs (AWS SDK direct usage beyond S3-compatible interface)
- Merged backend/frontend monolith architecture
- Alternative databases (PostgreSQL, MySQL, Cassandra)
- Alternative authentication providers (Firebase Auth, Cognito)

#### Scope Validation Checklist

**Included in Scope:**
- ✅ Complete FastAPI backend with all specified endpoints
- ✅ React 18 + TypeScript + Vite frontend with all specified pages
- ✅ MongoDB for data persistence
- ✅ Redis for caching and sessions
- ✅ MinIO/S3 for object storage
- ✅ Auth0 integration with local JWT fallback
- ✅ LangChain multi-provider AI assistant
- ✅ Multi-modal fingerprinting (images, audio, video, text)
- ✅ AI Touch Value™ calculation engine
- ✅ Hybrid upload architecture (direct + presigned URLs)
- ✅ Docker Compose orchestration
- ✅ Comprehensive testing infrastructure
- ✅ Complete documentation suite
- ✅ Code quality tooling (Black, Ruff, ESLint, Prettier)

**Explicitly Not Included:**
- ❌ Real payment processing
- ❌ Advanced authentication (MFA, RBAC)
- ❌ Phase 2 AI training detection
- ❌ Production-grade scalability (Kubernetes, auto-scaling)
- ❌ Mobile/desktop applications
- ❌ Advanced analytics beyond AI Touch Value™
- ❌ Public API for third-parties
- ❌ Multi-region deployment
- ❌ Additional LLM providers beyond specified four

## 0.10 Execution Parameters

#### Special Execution Instructions

**Process-Specific Requirements:**

1. **Architecture Adherence (MANDATORY)**:
   - MUST use Python 3.11+ with FastAPI - no alternatives permitted
   - MUST use React 18 + TypeScript + Vite for frontend - no framework substitutions
   - MUST implement exactly as specified in section 0.3 Special Instructions and Constraints
   - MUST follow directory structure exactly as defined (backend/app/, frontend/src/)
   - MUST use Poetry for backend dependency management (not pip, pipenv, or others)
   - MUST use npm for frontend package management (not yarn or pnpm)

2. **Security Requirements (NON-NEGOTIABLE)**:
   - File upload validation MUST reject .zip, .rar, .7z, .exe, .bin, .sh, .app, .msi, .iso, .dmg
   - File size limit MUST be enforced at 500MB maximum
   - MUST implement comprehensive MIME type checking beyond extension validation
   - Presigned URLs MUST expire within 15 minutes
   - JWT tokens MUST use HS256 for local fallback with 24-hour expiration
   - Auth0 integration MUST validate JWT signatures using public keys
   - All passwords MUST be hashed using bcrypt with minimum 12 rounds

3. **LangChain Integration Requirements**:
   - MUST support OpenAI GPT-4/5 via langchain-openai
   - MUST support Anthropic Claude via langchain-anthropic  
   - MUST support Google Gemini via langchain-google-genai
   - MUST support local/lite models via standard LangChain interface
   - Provider selection MUST be configurable via environment variables
   - Tool calling MUST be implemented for fingerprint and analytics queries
   - Streaming responses MUST use Server-Sent Events for real-time updates

4. **Upload Architecture Requirements**:
   - Files <10MB MUST use direct upload via FastAPI multipart/form-data
   - Files >10MB MUST use S3 presigned URL flow:
     1. GET /api/v1/upload/presigned-url returns signed PUT URL
     2. Client uploads directly to S3 using presigned URL
     3. POST /api/v1/upload/confirmation validates and registers asset
   - Multipart upload MUST be supported for resumable large file transfers
   - Upload confirmation MUST verify S3 object existence before creating MongoDB record

5. **Phase 2 Preparation Requirements**:
   - MUST include TODO markers in fingerprinting_service.py for:
     - `# TODO Phase 2: Implement AI training detection engine`
     - `# TODO Phase 2: Compare embeddings against known datasets`
     - `# TODO Phase 2: Calculate embedding drift scores`
     - `# TODO Phase 2: Apply similarity-law thresholds for legal determination`
     - `# TODO Phase 2: Generate legal-export documentation`
   - Phase 2 functions MUST be defined as stubs returning NotImplementedError
   - Database schema MUST include fields for future Phase 2 data (training_detected, dataset_matches, legal_status)

6. **Testing Requirements**:
   - Backend MUST have pytest coverage for all services and API endpoints
   - Frontend MUST have component tests using React Testing Library
   - Test fixtures MUST mock external dependencies (MongoDB, Redis, S3, Auth0)
   - Integration tests MUST use TestClient for API endpoint testing
   - Test data generation script MUST create realistic sample data

7. **Code Quality Requirements**:
   - Backend code MUST be formatted with Black (line length 100)
   - Backend code MUST pass Ruff linting with configured rules
   - Frontend code MUST pass ESLint with TypeScript parser
   - Frontend code MUST be formatted with Prettier
   - All Python code MUST include type hints
   - All TypeScript code MUST use strict mode
   - Pre-commit hooks SHOULD be configured for automatic formatting/linting

#### Tools and Platforms

**Required Development Tools:**
- **Python 3.11+**: Explicitly installed and configured in virtual environment
- **Poetry 2.2.1**: Installed for backend dependency management
- **Node.js 20+**: Required for frontend development
- **npm 10+**: Package manager for frontend dependencies
- **Docker**: Container runtime for service orchestration
- **Docker Compose**: Multi-service orchestration tool
- **Git**: Version control system

**Development Environment:**
- **Code Editor**: VS Code recommended with extensions:
  - Python extension for debugging and IntelliSense
  - ESLint extension for frontend linting
  - Prettier extension for code formatting
  - Docker extension for container management
- **Terminal**: Bash or zsh for script execution
- **Database Client**: MongoDB Compass for database inspection
- **API Testing**: Postman or curl for endpoint testing
- **S3 Client**: MinIO Console (http://localhost:9001) or AWS CLI

**Excluded Tools:**
- Cloud-specific CLIs (AWS CLI, gcloud, az) except for S3-compatible operations
- Alternative dependency managers (pip, pipenv, conda, yarn, pnpm)
- Alternative containerization tools (Podman, Buildah)
- Non-approved code formatters/linters

**Platform Constraints:**
- MUST run on Linux, macOS, or Windows with WSL2
- Docker Compose MUST support version 3.8+ syntax
- MongoDB MUST be version 8.0+
- Redis MUST be version 7.4+
- Python MUST be 3.11+ (not 3.10 or 3.12+)
- Node.js MUST be 20+ (LTS version)

#### Quality and Style Requirements

**Backend Code Style:**
- Line length: 100 characters (Black configuration)
- Indentation: 4 spaces
- Import sorting: Standard library → Third-party → Local (Ruff isort rules)
- Docstrings: Google style for functions and classes
- Type hints: Required for all function signatures
- Async/await: Prefer async for I/O-bound operations
- Error handling: Raise custom exceptions with descriptive messages
- Logging: Use structured logging with context

**Frontend Code Style:**
- Line length: 80 characters (Prettier configuration)
- Indentation: 2 spaces
- Quotes: Single quotes for strings
- Semicolons: Required
- Trailing commas: Always in multi-line
- Component naming: PascalCase for components, camelCase for utilities
- File naming: PascalCase for component files (.tsx), camelCase for utilities (.ts)
- Import sorting: React → External libraries → Internal imports → Styles

**Documentation Standards:**
- README MUST include quick start guide reachable in <5 minutes
- API documentation MUST include curl examples for every endpoint
- Code comments MUST explain "why" not "what"
- Complex algorithms MUST include inline documentation
- Architecture decisions MUST be documented with rationale
- Environment variables MUST be documented with descriptions and examples

#### Code Review and Approval Requirements

**Quality Gates:**
- All code MUST pass Black formatting (backend)
- All code MUST pass Ruff linting with zero errors (backend)
- All code MUST pass ESLint with zero errors (frontend)
- All code MUST pass Prettier formatting (frontend)
- All tests MUST pass in isolation and in full suite
- Test coverage SHOULD exceed 80% for core services
- No hardcoded credentials or secrets in code
- No console.log statements in production frontend code
- No commented-out code blocks in final implementation

**Deployment and Rollout Considerations:**
- Development environment MUST run via `docker-compose up` command
- All services MUST have health checks defined
- Database migrations MUST be reversible
- Environment-specific configurations MUST use .env files
- Secrets MUST never be committed to version control
- Docker images MUST use multi-stage builds for optimization
- Production builds MUST minimize bundle sizes (frontend)
- Backend MUST serve with Uvicorn using multiple workers

#### Constraints and Boundaries

**Technical Constraints:**
- Maximum file upload size: 500 MB (enforced at validation, presigned URL, and S3 policy levels)
- Presigned URL expiration: 15 minutes
- JWT token expiration: 24 hours (local), Auth0-defined (production)
- Redis cache TTL: 5 minutes (metadata), 1 hour (fingerprints), 1 hour (conversation context)
- MongoDB connection pool: 10-100 connections
- Maximum concurrent uploads per user: 5 (enforced via frontend queue)
- API rate limiting: Not implemented in MVP (future enhancement)

**Process Constraints:**
- All database operations MUST use async Motor driver
- All S3 operations MUST use boto3 with async wrappers
- All Redis operations MUST use async redis client
- Long-running operations (fingerprinting) MUST use FastAPI BackgroundTasks
- Large responses MUST use streaming (assistant chat, large file downloads)

**Output Constraints:**
- API responses MUST return JSON with consistent structure: `{data, error, status}`
- Error responses MUST include error code, message, and optional details
- Timestamps MUST use ISO 8601 format with UTC timezone
- File sizes MUST be reported in bytes
- Monetary values MUST use decimal type with 2 decimal places

**Timeline and Dependency Constraints:**
- No external timeline constraints - focus on completeness and quality
- Database initialization MUST complete before application starts
- MinIO buckets MUST be created before upload functionality is available
- Redis MUST be available before application starts (caching is critical)
- Auth0 MUST be configured OR local JWT fallback must activate automatically

#### Compatibility Requirements

**Browser Compatibility:**
- Chrome/Edge 100+
- Firefox 100+
- Safari 15+
- No Internet Explorer support

**API Compatibility:**
- All endpoints MUST be versioned (/api/v1)
- Response format MUST remain consistent within major version
- Breaking changes MUST increment API version
- Deprecated endpoints MUST return warnings in response headers

**Backward Compatibility:**
- Database schema changes MUST support migration from previous state
- Environment variable changes MUST be documented in changelog
- Configuration file format MUST remain backward compatible or provide migration script

#### Execution Success Criteria

**Completion Checklist:**
- ✅ All files in transformation mapping (section 0.6) are created
- ✅ Docker Compose successfully starts all services
- ✅ Backend API responds to health check endpoint
- ✅ Frontend loads in browser without errors
- ✅ File upload works for all supported types (<10MB and >10MB)
- ✅ Fingerprinting generates results for sample assets
- ✅ AI Touch Value™ calculation returns results
- ✅ AI assistant responds to queries with proper provider
- ✅ Authentication works with local JWT fallback
- ✅ All pytest tests pass
- ✅ All frontend component tests pass
- ✅ Code quality checks (Black, Ruff, ESLint, Prettier) pass
- ✅ Documentation is complete and accurate
- ✅ No critical security vulnerabilities
- ✅ No hardcoded credentials or secrets

