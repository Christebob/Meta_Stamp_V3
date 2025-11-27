# META-STAMP V3 - System Architecture Documentation

## Table of Contents

1. [Overview](#1-overview)
2. [High-Level System Architecture](#2-high-level-system-architecture)
3. [Component Architecture](#3-component-architecture)
4. [Data Flow Diagrams](#4-data-flow-diagrams)
5. [Data Model Schemas](#5-data-model-schemas)
6. [Security Architecture](#6-security-architecture)
7. [Scalability Considerations](#7-scalability-considerations)
8. [Technology Stack Rationale](#8-technology-stack-rationale)
9. [Service Interaction Patterns](#9-service-interaction-patterns)
10. [Phase 2 Architectural Considerations](#10-phase-2-architectural-considerations)

---

## 1. Overview

META-STAMP V3 is a comprehensive creator-protection platform that serves as a global compensation foundation between AI companies and creators. The system provides sophisticated multi-modal fingerprinting, AI training detection (Phase 2), residual value calculation through the AI Touch Value™ engine, and a universal dashboard for creators.

### 1.1 Core Platform Objectives

- **Asset Fingerprinting**: Uniquely identify and track creative assets across text, images, audio, video, and web content
- **AI Touch Value™ Calculation**: Estimate compensation owed to creators based on mathematical formulas
- **Hybrid Upload Architecture**: Smart upload system with direct upload (<10MB) and S3 presigned URLs (>10MB)
- **Universal Dashboard**: Comprehensive creator interface for asset management and analytics
- **Multi-Provider AI Assistant**: Hybrid-personality AI assistant using LangChain with multiple LLM providers

### 1.2 Design Principles

| Principle | Description |
|-----------|-------------|
| **Cloud-Agnostic** | S3-compatible storage APIs, no vendor lock-in |
| **Security-First** | Comprehensive validation, JWT authentication, input sanitization |
| **Scalability** | Stateless backend, horizontal scaling capabilities |
| **Modularity** | Separated services with clear interfaces |
| **API-First** | RESTful versioned APIs under `/api/v1` |

---

## 2. High-Level System Architecture

### 2.1 System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                              META-STAMP V3 PLATFORM                                  │
├─────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                      │
│  ┌─────────────────────────────────────────────────────────────────────────────┐   │
│  │                           CLIENT LAYER                                       │   │
│  │  ┌─────────────────────────────────────────────────────────────────────┐    │   │
│  │  │                    React 18 + TypeScript + Vite                     │    │   │
│  │  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌───────────┐  │    │   │
│  │  │  │Dashboard │ │  Upload  │ │  Assets  │ │  Wallet  │ │    AI     │  │    │   │
│  │  │  │   Page   │ │   Page   │ │   Page   │ │   Page   │ │ Assistant │  │    │   │
│  │  │  └──────────┘ └──────────┘ └──────────┘ └──────────┘ └───────────┘  │    │   │
│  │  │                                                                     │    │   │
│  │  │  ┌──────────────────────────────────────────────────────────────┐  │    │   │
│  │  │  │  Context Providers: Auth | Upload | Theme                    │  │    │   │
│  │  │  └──────────────────────────────────────────────────────────────┘  │    │   │
│  │  └─────────────────────────────────────────────────────────────────────┘    │   │
│  └─────────────────────────────────────────────────────────────────────────────┘   │
│                                        │                                            │
│                                        │ HTTPS/REST API                             │
│                                        ▼                                            │
│  ┌─────────────────────────────────────────────────────────────────────────────┐   │
│  │                            API GATEWAY LAYER                                 │   │
│  │  ┌─────────────────────────────────────────────────────────────────────┐    │   │
│  │  │                 FastAPI Application (Python 3.11+)                   │    │   │
│  │  │  ┌──────────────────────────────────────────────────────────────┐   │    │   │
│  │  │  │  /api/v1 Router                                               │   │    │   │
│  │  │  │  ┌─────────┐ ┌───────────┐ ┌──────────┐ ┌─────────┐          │   │    │   │
│  │  │  │  │ Upload  │ │Fingerprint│ │Analytics │ │ Assets  │          │   │    │   │
│  │  │  │  └─────────┘ └───────────┘ └──────────┘ └─────────┘          │   │    │   │
│  │  │  │  ┌─────────┐ ┌───────────┐ ┌──────────┐                      │   │    │   │
│  │  │  │  │ Wallet  │ │ Assistant │ │   Auth   │                      │   │    │   │
│  │  │  │  └─────────┘ └───────────┘ └──────────┘                      │   │    │   │
│  │  │  └──────────────────────────────────────────────────────────────┘   │    │   │
│  │  │                                                                      │    │   │
│  │  │  ┌──────────────────────────────────────────────────────────────┐   │    │   │
│  │  │  │  Middleware: CORS | Auth | Logging | Error Handling          │   │    │   │
│  │  │  └──────────────────────────────────────────────────────────────┘   │    │   │
│  │  └─────────────────────────────────────────────────────────────────────┘    │   │
│  └─────────────────────────────────────────────────────────────────────────────┘   │
│                                        │                                            │
│              ┌─────────────────────────┼─────────────────────────┐                  │
│              │                         │                         │                  │
│              ▼                         ▼                         ▼                  │
│  ┌─────────────────────┐  ┌─────────────────────┐  ┌─────────────────────┐         │
│  │   SERVICE LAYER     │  │   SERVICE LAYER     │  │   SERVICE LAYER     │         │
│  │  ┌───────────────┐  │  │  ┌───────────────┐  │  │  ┌───────────────┐  │         │
│  │  │Upload Service │  │  │  │ Fingerprint   │  │  │  │ AI Assistant  │  │         │
│  │  │Storage Service│  │  │  │   Service     │  │  │  │   Service     │  │         │
│  │  │URL Processor  │  │  │  │               │  │  │  │  (LangChain)  │  │         │
│  │  └───────────────┘  │  │  └───────────────┘  │  │  └───────────────┘  │         │
│  │  ┌───────────────┐  │  │  ┌───────────────┐  │  │  ┌───────────────┐  │         │
│  │  │File Validator │  │  │  │ AI Value      │  │  │  │  Metadata     │  │         │
│  │  │               │  │  │  │   Service     │  │  │  │   Service     │  │         │
│  │  └───────────────┘  │  │  └───────────────┘  │  │  └───────────────┘  │         │
│  └─────────────────────┘  └─────────────────────┘  └─────────────────────┘         │
│              │                         │                         │                  │
│              └─────────────────────────┼─────────────────────────┘                  │
│                                        │                                            │
│                                        ▼                                            │
│  ┌─────────────────────────────────────────────────────────────────────────────┐   │
│  │                            DATA LAYER                                        │   │
│  │  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐           │   │
│  │  │     MongoDB      │  │      Redis       │  │    MinIO/S3      │           │   │
│  │  │    (Motor)       │  │   (aioredis)     │  │    (boto3)       │           │   │
│  │  │                  │  │                  │  │                  │           │   │
│  │  │ • Assets         │  │ • Session Cache  │  │ • Asset Files    │           │   │
│  │  │ • Users          │  │ • Response Cache │  │ • Thumbnails     │           │   │
│  │  │ • Fingerprints   │  │ • Conversation   │  │ • Presigned URLs │           │   │
│  │  │ • Wallet         │  │   Context        │  │                  │           │   │
│  │  │ • Analytics      │  │                  │  │                  │           │   │
│  │  └──────────────────┘  └──────────────────┘  └──────────────────┘           │   │
│  └─────────────────────────────────────────────────────────────────────────────┘   │
│                                        │                                            │
│                                        ▼                                            │
│  ┌─────────────────────────────────────────────────────────────────────────────┐   │
│  │                        EXTERNAL SERVICES                                     │   │
│  │  ┌───────────────┐  ┌───────────────┐  ┌───────────────┐  ┌───────────────┐ │   │
│  │  │    Auth0      │  │    OpenAI     │  │   Anthropic   │  │ Google Gemini │ │   │
│  │  │  (OAuth/JWT)  │  │   (GPT-4/5)   │  │   (Claude)    │  │               │ │   │
│  │  └───────────────┘  └───────────────┘  └───────────────┘  └───────────────┘ │   │
│  └─────────────────────────────────────────────────────────────────────────────┘   │
│                                                                                      │
└─────────────────────────────────────────────────────────────────────────────────────┘
```

### 2.2 Network Topology

```
┌─────────────────────────────────────────────────────────────────────┐
│                    Docker Network: metastamp_network                 │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│   ┌─────────────────┐          ┌─────────────────┐                  │
│   │    Frontend     │──────────│     Backend     │                  │
│   │   (Port 5173)   │  HTTP    │   (Port 8000)   │                  │
│   └─────────────────┘          └────────┬────────┘                  │
│                                         │                            │
│          ┌──────────────────────────────┼──────────────────┐        │
│          │                              │                  │        │
│          ▼                              ▼                  ▼        │
│   ┌─────────────┐              ┌─────────────┐      ┌───────────┐   │
│   │   MongoDB   │              │    Redis    │      │   MinIO   │   │
│   │ (Port 27017)│              │ (Port 6379) │      │(Port 9000)│   │
│   └─────────────┘              └─────────────┘      └───────────┘   │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 3. Component Architecture

### 3.1 Backend Component Structure

```
backend/
├── app/
│   ├── __init__.py
│   ├── main.py                    # FastAPI application entry point
│   ├── config.py                  # Pydantic Settings configuration
│   │
│   ├── api/
│   │   ├── __init__.py
│   │   └── v1/
│   │       ├── __init__.py        # Router aggregation
│   │       ├── upload.py          # Upload endpoints
│   │       ├── fingerprint.py     # Fingerprinting endpoints
│   │       ├── analytics.py       # AI Touch Value™ endpoints
│   │       ├── assets.py          # Asset management endpoints
│   │       ├── wallet.py          # Wallet endpoints
│   │       ├── assistant.py       # AI assistant endpoints
│   │       └── auth.py            # Authentication endpoints
│   │
│   ├── core/
│   │   ├── __init__.py
│   │   ├── auth.py                # Auth0/JWT authentication
│   │   ├── database.py            # MongoDB Motor client
│   │   ├── redis_client.py        # Redis async client
│   │   └── storage.py             # S3/MinIO boto3 client
│   │
│   ├── models/
│   │   ├── __init__.py
│   │   ├── asset.py               # Asset Pydantic models
│   │   ├── user.py                # User models
│   │   ├── wallet.py              # Wallet/transaction models
│   │   ├── analytics.py           # Analytics models
│   │   └── fingerprint.py         # Fingerprint data models
│   │
│   ├── services/
│   │   ├── __init__.py
│   │   ├── upload_service.py      # Upload routing logic
│   │   ├── storage_service.py     # S3/MinIO operations
│   │   ├── fingerprinting_service.py  # Multi-modal fingerprinting
│   │   ├── ai_value_service.py    # AI Touch Value™ calculation
│   │   ├── ai_assistant_service.py    # LangChain AI assistant
│   │   ├── metadata_service.py    # Metadata extraction
│   │   └── url_processor_service.py   # URL content extraction
│   │
│   └── utils/
│       ├── __init__.py
│       ├── file_validator.py      # File type/size validation
│       ├── cache.py               # Redis caching decorators
│       ├── logger.py              # Structured logging
│       └── security.py            # JWT/hashing utilities
│
├── tests/                         # Pytest test suite
├── Dockerfile                     # Container definition
├── pyproject.toml                 # Poetry dependencies
└── .env.example                   # Environment template
```

### 3.2 Frontend Component Structure

```
frontend/
├── src/
│   ├── main.tsx                   # Application entry point
│   ├── App.tsx                    # Root component with routing
│   ├── vite-env.d.ts             # Vite type definitions
│   │
│   ├── routes/
│   │   ├── index.tsx              # Route definitions
│   │   └── PrivateRoute.tsx       # Authentication guard
│   │
│   ├── pages/
│   │   ├── Dashboard.tsx          # Main dashboard
│   │   ├── Upload.tsx             # Upload interface
│   │   ├── Assets.tsx             # Asset list/management
│   │   ├── Wallet.tsx             # Wallet/earnings
│   │   ├── Login.tsx              # Authentication
│   │   └── NotFound.tsx           # 404 page
│   │
│   ├── components/
│   │   ├── Layout.tsx             # Page layout wrapper
│   │   ├── Navbar.tsx             # Top navigation
│   │   ├── Sidebar.tsx            # Side navigation
│   │   ├── SmartUploader.tsx      # Intelligent upload component
│   │   ├── FileDropZone.tsx       # Drag-and-drop zone
│   │   ├── UploadProgress.tsx     # Progress indicator
│   │   ├── URLInput.tsx           # URL upload component
│   │   ├── AssetCard.tsx          # Asset display card
│   │   ├── FingerprintSummary.tsx # Fingerprint visualization
│   │   ├── AITouchScore.tsx       # Score display
│   │   ├── AITouchValue.tsx       # Value calculation display
│   │   ├── WalletBalance.tsx      # Balance component
│   │   ├── TransactionHistory.tsx # Transaction list
│   │   ├── AIAssistant.tsx        # Chat interface
│   │   └── ChatMessage.tsx        # Message component
│   │
│   ├── hooks/
│   │   ├── useAuth.tsx            # Authentication hook
│   │   ├── useUpload.tsx          # Upload management
│   │   ├── useAssets.tsx          # Asset data fetching
│   │   ├── useWallet.tsx          # Wallet data
│   │   ├── useAIAssistant.tsx     # AI assistant interaction
│   │   └── useWebSocket.tsx       # WebSocket connection
│   │
│   ├── services/
│   │   ├── api.ts                 # Axios instance
│   │   ├── authService.ts         # Auth API calls
│   │   ├── uploadService.ts       # Upload API
│   │   ├── assetService.ts        # Asset management API
│   │   ├── walletService.ts       # Wallet API
│   │   ├── assistantService.ts    # AI assistant API
│   │   └── storageService.ts      # Local storage utilities
│   │
│   ├── contexts/
│   │   ├── AuthContext.tsx        # Authentication state
│   │   ├── UploadContext.tsx      # Upload state management
│   │   └── ThemeContext.tsx       # UI theme state
│   │
│   ├── types/
│   │   ├── asset.ts               # Asset type definitions
│   │   ├── user.ts                # User types
│   │   ├── wallet.ts              # Wallet types
│   │   └── api.ts                 # API response types
│   │
│   └── styles/
│       └── index.css              # Tailwind directives
│
├── index.html                     # HTML template
├── vite.config.ts                 # Vite configuration
├── tailwind.config.js             # TailwindCSS config
├── tsconfig.json                  # TypeScript config
├── package.json                   # npm dependencies
└── Dockerfile                     # Container definition
```

### 3.3 Service Dependency Graph

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         SERVICE DEPENDENCIES                             │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌────────────────────────────────────────────────────────────────┐     │
│  │                      API Layer (Routers)                        │     │
│  │  upload.py  fingerprint.py  analytics.py  assets.py  wallet.py │     │
│  │  assistant.py  auth.py                                          │     │
│  └────────────────────────────────────────────────────────────────┘     │
│                                  │                                       │
│                                  │ depends on                            │
│                                  ▼                                       │
│  ┌────────────────────────────────────────────────────────────────┐     │
│  │                      Service Layer                              │     │
│  │                                                                  │     │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │     │
│  │  │   upload     │  │  fingerprint │  │  ai_value    │          │     │
│  │  │   service    │──│    service   │──│   service    │          │     │
│  │  └──────────────┘  └──────────────┘  └──────────────┘          │     │
│  │         │                   │                │                  │     │
│  │         ▼                   ▼                ▼                  │     │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │     │
│  │  │   storage    │  │   metadata   │  │ ai_assistant │          │     │
│  │  │   service    │  │   service    │  │   service    │          │     │
│  │  └──────────────┘  └──────────────┘  └──────────────┘          │     │
│  │         │                                    │                  │     │
│  │         └──────────────────────────────────────────────────────│     │
│  │                                  │                              │     │
│  └──────────────────────────────────│──────────────────────────────┘     │
│                                     │                                    │
│                                     │ depends on                         │
│                                     ▼                                    │
│  ┌────────────────────────────────────────────────────────────────┐     │
│  │                        Core Layer                               │     │
│  │                                                                  │     │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐        │     │
│  │  │ database │  │  redis   │  │ storage  │  │   auth   │        │     │
│  │  │ (Motor)  │  │ (cache)  │  │  (S3)    │  │ (JWT)    │        │     │
│  │  └──────────┘  └──────────┘  └──────────┘  └──────────┘        │     │
│  │                                                                  │     │
│  └────────────────────────────────────────────────────────────────┘     │
│                                     │                                    │
│                                     │ depends on                         │
│                                     ▼                                    │
│  ┌────────────────────────────────────────────────────────────────┐     │
│  │                       Utility Layer                             │     │
│  │                                                                  │     │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │     │
│  │  │    file      │  │    cache     │  │   security   │          │     │
│  │  │  validator   │  │  decorator   │  │   helpers    │          │     │
│  │  └──────────────┘  └──────────────┘  └──────────────┘          │     │
│  │                                                                  │     │
│  │  ┌──────────────┐                                               │     │
│  │  │    logger    │                                               │     │
│  │  └──────────────┘                                               │     │
│  │                                                                  │     │
│  └────────────────────────────────────────────────────────────────┘     │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 4. Data Flow Diagrams

### 4.1 File Upload Flow (Direct Upload < 10MB)

```
┌──────────────────────────────────────────────────────────────────────────────────┐
│                    DIRECT UPLOAD FLOW (Files < 10MB)                              │
├──────────────────────────────────────────────────────────────────────────────────┤
│                                                                                   │
│  ┌─────────┐                                                                     │
│  │  User   │                                                                     │
│  └────┬────┘                                                                     │
│       │ 1. Select file                                                           │
│       ▼                                                                          │
│  ┌────────────────┐                                                              │
│  │ SmartUploader  │                                                              │
│  │  (Frontend)    │                                                              │
│  └───────┬────────┘                                                              │
│          │ 2. Check file size < 10MB                                             │
│          │ 3. Validate file type                                                 │
│          ▼                                                                       │
│  ┌────────────────┐     POST /api/v1/upload/{type}      ┌────────────────┐      │
│  │  uploadService │────────────────────────────────────▶│  upload.py     │      │
│  │     (API)      │     multipart/form-data             │   (Router)     │      │
│  └────────────────┘                                     └───────┬────────┘      │
│                                                                 │               │
│                                                                 │ 4. Validate   │
│                                                                 ▼               │
│                                                         ┌────────────────┐      │
│                                                         │file_validator  │      │
│                                                         │ - Extension    │      │
│                                                         │ - MIME type    │      │
│                                                         │ - Size (500MB) │      │
│                                                         └───────┬────────┘      │
│                                                                 │               │
│                                                                 │ 5. Pass      │
│                                                                 ▼               │
│                                                         ┌────────────────┐      │
│                                                         │ upload_service │      │
│                                                         └───────┬────────┘      │
│                                                                 │               │
│          ┌──────────────────────────────────────────────────────┤               │
│          │                                                      │               │
│          ▼                                                      ▼               │
│  ┌────────────────┐                                     ┌────────────────┐      │
│  │storage_service │                                     │metadata_service│      │
│  │ 6. Upload to S3│                                     │ 7. Extract     │      │
│  └───────┬────────┘                                     │    metadata    │      │
│          │                                              └───────┬────────┘      │
│          │                                                      │               │
│          └────────────────────────┬─────────────────────────────┘               │
│                                   │                                              │
│                                   ▼                                              │
│                           ┌────────────────┐                                     │
│                           │    MongoDB     │                                     │
│                           │ 8. Create      │                                     │
│                           │    asset       │                                     │
│                           │    record      │                                     │
│                           └───────┬────────┘                                     │
│                                   │                                              │
│                                   │ 9. Trigger background                        │
│                                   ▼                                              │
│                           ┌────────────────┐                                     │
│                           │  Background    │                                     │
│                           │  Fingerprint   │                                     │
│                           │  Task          │                                     │
│                           └───────┬────────┘                                     │
│                                   │                                              │
│                                   │ 10. Return asset ID                          │
│                                   ▼                                              │
│                           ┌────────────────┐                                     │
│                           │  Response:     │                                     │
│                           │  {asset_id,    │                                     │
│                           │   status,      │                                     │
│                           │   message}     │                                     │
│                           └────────────────┘                                     │
│                                                                                   │
└──────────────────────────────────────────────────────────────────────────────────┘
```

### 4.2 File Upload Flow (Presigned URL > 10MB)

```
┌──────────────────────────────────────────────────────────────────────────────────┐
│                  PRESIGNED URL UPLOAD FLOW (Files > 10MB)                         │
├──────────────────────────────────────────────────────────────────────────────────┤
│                                                                                   │
│  ┌─────────┐                                                                     │
│  │  User   │                                                                     │
│  └────┬────┘                                                                     │
│       │ 1. Select large file                                                     │
│       ▼                                                                          │
│  ┌────────────────┐                                                              │
│  │ SmartUploader  │                                                              │
│  │ 2. Detect size │                                                              │
│  │    > 10MB      │                                                              │
│  └───────┬────────┘                                                              │
│          │                                                                       │
│          │ 3. GET /api/v1/upload/presigned-url                                  │
│          │    ?filename=video.mp4&content_type=video/mp4&size=52428800          │
│          ▼                                                                       │
│  ┌────────────────┐                              ┌────────────────┐              │
│  │   Backend      │                              │storage_service │              │
│  │   upload.py    │─────────────────────────────▶│ 4. Generate    │              │
│  │                │                              │    presigned   │              │
│  │                │◀─────────────────────────────│    PUT URL     │              │
│  └───────┬────────┘  {upload_url, s3_key,       └────────────────┘              │
│          │           expires_in: 900}                                            │
│          │                                                                       │
│          │ 5. Return presigned URL                                              │
│          ▼                                                                       │
│  ┌────────────────┐                                                              │
│  │  Frontend      │                                                              │
│  │ 6. Upload      │                                                              │
│  │    directly    │                                                              │
│  │    to S3       │                                                              │
│  └───────┬────────┘                                                              │
│          │                                                                       │
│          │ 7. PUT to presigned URL                                              │
│          │    (bypasses backend)                                                 │
│          ▼                                                                       │
│  ┌────────────────┐                                                              │
│  │   MinIO/S3     │                                                              │
│  │ 8. Store file  │                                                              │
│  │    with s3_key │                                                              │
│  └───────┬────────┘                                                              │
│          │                                                                       │
│          │ 9. 200 OK                                                             │
│          ▼                                                                       │
│  ┌────────────────┐                                                              │
│  │  Frontend      │                                                              │
│  │ 10. POST       │                                                              │
│  │   /confirmation│                                                              │
│  └───────┬────────┘                                                              │
│          │                                                                       │
│          │ 11. POST /api/v1/upload/confirmation                                 │
│          │     {s3_key, filename, file_type, file_size}                         │
│          ▼                                                                       │
│  ┌────────────────┐                              ┌────────────────┐              │
│  │   Backend      │                              │storage_service │              │
│  │   upload.py    │─────────────────────────────▶│ 12. HEAD object│              │
│  │                │                              │     verify     │              │
│  │                │◀─────────────────────────────│     exists     │              │
│  └───────┬────────┘                              └────────────────┘              │
│          │                                                                       │
│          │ 13. Create asset in MongoDB                                          │
│          │ 14. Trigger fingerprinting background task                           │
│          ▼                                                                       │
│  ┌────────────────┐                                                              │
│  │  Response:     │                                                              │
│  │  {asset_id,    │                                                              │
│  │   status,      │                                                              │
│  │   message}     │                                                              │
│  └────────────────┘                                                              │
│                                                                                   │
└──────────────────────────────────────────────────────────────────────────────────┘
```

### 4.3 Multipart Upload Flow (Resumable Large Files)

```
┌──────────────────────────────────────────────────────────────────────────────────┐
│               MULTIPART UPLOAD FLOW (Resumable for Very Large Files)              │
├──────────────────────────────────────────────────────────────────────────────────┤
│                                                                                   │
│  ┌─────────┐                           ┌────────────────┐    ┌───────────────┐   │
│  │ Client  │                           │    Backend     │    │    MinIO/S3   │   │
│  └────┬────┘                           └───────┬────────┘    └───────┬───────┘   │
│       │                                        │                     │           │
│       │ 1. POST /upload/multipart/init         │                     │           │
│       │    {filename, content_type, size}      │                     │           │
│       │───────────────────────────────────────▶│                     │           │
│       │                                        │ 2. create_multipart │           │
│       │                                        │────────────────────▶│           │
│       │                                        │◀────────────────────│           │
│       │◀───────────────────────────────────────│    upload_id        │           │
│       │    {upload_id, s3_key}                 │                     │           │
│       │                                        │                     │           │
│       │ 3. Split file into 5MB chunks          │                     │           │
│       │                                        │                     │           │
│  ┌────┴────┐                                   │                     │           │
│  │  Loop   │                                   │                     │           │
│  │ for each│                                   │                     │           │
│  │  chunk  │                                   │                     │           │
│  └────┬────┘                                   │                     │           │
│       │                                        │                     │           │
│       │ 4. GET /upload/multipart/part-url      │                     │           │
│       │    {upload_id, part_number}            │                     │           │
│       │───────────────────────────────────────▶│                     │           │
│       │                                        │ 5. Generate part URL│           │
│       │◀───────────────────────────────────────│                     │           │
│       │    {presigned_url}                     │                     │           │
│       │                                        │                     │           │
│       │ 6. PUT chunk directly to S3            │                     │           │
│       │────────────────────────────────────────────────────────────▶│           │
│       │◀────────────────────────────────────────────────────────────│           │
│       │    ETag header                         │                     │           │
│       │                                        │                     │           │
│       │ 7. Store ETag locally for part         │                     │           │
│       │                                        │                     │           │
│  └────┴────┘  (repeat for all chunks)          │                     │           │
│       │                                        │                     │           │
│       │ 8. POST /upload/multipart/complete     │                     │           │
│       │    {upload_id, s3_key, parts: [{       │                     │           │
│       │      part_number, etag}, ...]}         │                     │           │
│       │───────────────────────────────────────▶│                     │           │
│       │                                        │ 9. Complete upload  │           │
│       │                                        │────────────────────▶│           │
│       │                                        │◀────────────────────│           │
│       │                                        │                     │           │
│       │                                        │ 10. Create MongoDB  │           │
│       │                                        │     asset record    │           │
│       │◀───────────────────────────────────────│                     │           │
│       │    {asset_id, status}                  │                     │           │
│                                                                                   │
│  ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─    │
│                                                                                   │
│  On Upload Failure (Resumable):                                                   │
│       │                                        │                     │           │
│       │ POST /upload/multipart/resume          │                     │           │
│       │ {upload_id, s3_key}                    │                     │           │
│       │───────────────────────────────────────▶│                     │           │
│       │                                        │ List uploaded parts │           │
│       │                                        │────────────────────▶│           │
│       │◀───────────────────────────────────────│                     │           │
│       │    {completed_parts: [...]}            │                     │           │
│       │                                        │                     │           │
│       │ Continue from next missing part        │                     │           │
│                                                                                   │
└──────────────────────────────────────────────────────────────────────────────────┘
```

### 4.4 Fingerprinting Pipeline

```
┌──────────────────────────────────────────────────────────────────────────────────┐
│                          FINGERPRINTING PIPELINE                                  │
├──────────────────────────────────────────────────────────────────────────────────┤
│                                                                                   │
│  ┌─────────────────────────────────────────────────────────────────────────────┐ │
│  │                       TRIGGER: Asset Upload Complete                         │ │
│  └─────────────────────────────────────────────────────────────────────────────┘ │
│                                         │                                         │
│                                         ▼                                         │
│  ┌─────────────────────────────────────────────────────────────────────────────┐ │
│  │                    BackgroundTasks: fingerprint_asset()                      │ │
│  └─────────────────────────────────────────────────────────────────────────────┘ │
│                                         │                                         │
│                                         ▼                                         │
│  ┌─────────────────────────────────────────────────────────────────────────────┐ │
│  │                        fingerprinting_service.py                             │ │
│  │  ┌─────────────────────────────────────────────────────────────────────┐    │ │
│  │  │  1. Detect asset type                                                │    │ │
│  │  │  2. Download from S3 to temp file                                    │    │ │
│  │  │  3. Route to appropriate handler                                     │    │ │
│  │  └─────────────────────────────────────────────────────────────────────┘    │ │
│  └─────────────────────────────────────────────────────────────────────────────┘ │
│                                         │                                         │
│           ┌─────────────────────────────┼─────────────────────────────┐          │
│           │                             │                             │          │
│           ▼                             ▼                             ▼          │
│  ┌─────────────────┐          ┌─────────────────┐          ┌─────────────────┐  │
│  │  IMAGE HANDLER  │          │  AUDIO HANDLER  │          │  VIDEO HANDLER  │  │
│  │                 │          │                 │          │                 │  │
│  │  Using:         │          │  Using:         │          │  Using:         │  │
│  │  - PIL/Pillow   │          │  - librosa      │          │  - opencv       │  │
│  │  - imagehash    │          │                 │          │  - imagehash    │  │
│  │                 │          │                 │          │                 │  │
│  │  Generate:      │          │  Generate:      │          │  Generate:      │  │
│  │  ┌───────────┐  │          │  ┌───────────┐  │          │  ┌───────────┐  │  │
│  │  │  pHash    │  │          │  │Mel Spectro│  │          │  │Frame Hash │  │  │
│  │  │(perceptual│  │          │  │  -gram    │  │          │  │(sampled   │  │  │
│  │  │  hash)    │  │          │  └───────────┘  │          │  │ @1fps)    │  │  │
│  │  └───────────┘  │          │  ┌───────────┐  │          │  └───────────┘  │  │
│  │  ┌───────────┐  │          │  │Chromagram │  │          │  ┌───────────┐  │  │
│  │  │  aHash    │  │          │  │           │  │          │  │Average    │  │  │
│  │  │ (average) │  │          │  └───────────┘  │          │  │  Hash     │  │  │
│  │  └───────────┘  │          │  ┌───────────┐  │          │  └───────────┘  │  │
│  │  ┌───────────┐  │          │  │Spectral   │  │          │  ┌───────────┐  │  │
│  │  │  dHash    │  │          │  │ Centroid  │  │          │  │Codec/     │  │  │
│  │  │(difference│  │          │  └───────────┘  │          │  │Resolution │  │  │
│  │  │   hash)   │  │          │  ┌───────────┐  │          │  │ Metadata  │  │  │
│  │  └───────────┘  │          │  │MFCC       │  │          │  └───────────┘  │  │
│  │  ┌───────────┐  │          │  │Features   │  │          │                 │  │
│  │  │EXIF       │  │          │  └───────────┘  │          │                 │  │
│  │  │Metadata   │  │          │                 │          │                 │  │
│  │  └───────────┘  │          │                 │          │                 │  │
│  └────────┬────────┘          └────────┬────────┘          └────────┬────────┘  │
│           │                            │                            │           │
│           ▼                            ▼                            ▼           │
│  ┌─────────────────────────────────────────────────────────────────────────────┐ │
│  │                       TEXT/PDF HANDLER                                       │ │
│  │  Using: pdfplumber, chardet                                                  │ │
│  │  Generate: Character count, word count, encoding, checksum                   │ │
│  └─────────────────────────────────────────────────────────────────────────────┘ │
│                                         │                                         │
│                                         ▼                                         │
│  ┌─────────────────────────────────────────────────────────────────────────────┐ │
│  │                    EMBEDDING GENERATION (Optional)                           │ │
│  │  ┌─────────────────────────────────────────────────────────────────────┐    │ │
│  │  │  LangChain Embeddings                                                │    │ │
│  │  │  - OpenAI text-embedding-ada-002                                     │    │ │
│  │  │  - Multi-modal CLIP embeddings (images)                              │    │ │
│  │  └─────────────────────────────────────────────────────────────────────┘    │ │
│  └─────────────────────────────────────────────────────────────────────────────┘ │
│                                         │                                         │
│                                         ▼                                         │
│  ┌─────────────────────────────────────────────────────────────────────────────┐ │
│  │                         STORE FINGERPRINT                                    │ │
│  │  ┌─────────────────────────────────────────────────────────────────────┐    │ │
│  │  │  MongoDB: fingerprints collection                                    │    │ │
│  │  │  {                                                                   │    │ │
│  │  │    asset_id: ObjectId,                                               │    │ │
│  │  │    perceptual_hashes: {phash, ahash, dhash},                         │    │ │
│  │  │    spectral_data: {...},                                             │    │ │
│  │  │    embeddings: [float],                                              │    │ │
│  │  │    metadata: {...},                                                  │    │ │
│  │  │    created_at: DateTime                                              │    │ │
│  │  │  }                                                                   │    │ │
│  │  └─────────────────────────────────────────────────────────────────────┘    │ │
│  └─────────────────────────────────────────────────────────────────────────────┘ │
│                                         │                                         │
│                                         ▼                                         │
│  ┌─────────────────────────────────────────────────────────────────────────────┐ │
│  │                     UPDATE ASSET STATUS → "ready"                            │ │
│  └─────────────────────────────────────────────────────────────────────────────┘ │
│                                                                                   │
│  ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─    │
│                                                                                   │
│  PHASE 2 TODO PLACEHOLDERS:                                                       │
│  ┌─────────────────────────────────────────────────────────────────────────────┐ │
│  │  # TODO Phase 2: Implement AI training detection engine                      │ │
│  │  # TODO Phase 2: Compare embeddings against known datasets                   │ │
│  │  # TODO Phase 2: Calculate embedding drift scores                            │ │
│  │  # TODO Phase 2: Apply similarity-law thresholds for legal determination     │ │
│  │  # TODO Phase 2: Generate legal-export documentation                         │ │
│  └─────────────────────────────────────────────────────────────────────────────┘ │
│                                                                                   │
└──────────────────────────────────────────────────────────────────────────────────┘
```

### 4.5 AI Touch Value™ Calculation Flow

```
┌──────────────────────────────────────────────────────────────────────────────────┐
│                       AI TOUCH VALUE™ CALCULATION FLOW                            │
├──────────────────────────────────────────────────────────────────────────────────┤
│                                                                                   │
│  ┌─────────────────────────────────────────────────────────────────────────────┐ │
│  │                              FORMULA                                         │ │
│  │                                                                               │ │
│  │   AI Touch Value™ = ModelEarnings × (TrainingContributionScore/100)          │ │
│  │                                    × (UsageExposureScore/100)                 │ │
│  │                                    × EquityFactor                             │ │
│  │                                                                               │ │
│  │   Where: EquityFactor = 0.25 (fixed 25%)                                     │ │
│  └─────────────────────────────────────────────────────────────────────────────┘ │
│                                                                                   │
│  ┌─────────┐                                                                     │
│  │  User   │                                                                     │
│  └────┬────┘                                                                     │
│       │ 1. Enter prediction parameters                                           │
│       │    - Followers count                                                     │
│       │    - Total views                                                         │
│       │    - Content hours                                                       │
│       │    - Platform (YouTube, TikTok, etc.)                                   │
│       │    - Model earnings estimate                                             │
│       ▼                                                                          │
│  ┌────────────────┐                                                              │
│  │ AITouchValue   │                                                              │
│  │   Component    │                                                              │
│  └───────┬────────┘                                                              │
│          │                                                                       │
│          │ 2. POST /api/v1/analytics/predict                                    │
│          │    {                                                                  │
│          │      followers: 100000,                                               │
│          │      views: 5000000,                                                  │
│          │      content_hours: 500,                                              │
│          │      platform: "youtube",                                             │
│          │      model_earnings: 1000000000                                       │
│          │    }                                                                  │
│          ▼                                                                       │
│  ┌────────────────┐                              ┌────────────────┐              │
│  │  analytics.py  │                              │ai_value_service│              │
│  │    (Router)    │─────────────────────────────▶│                │              │
│  └────────────────┘                              └───────┬────────┘              │
│                                                          │                       │
│                                                          │ 3. Calculate scores   │
│                                                          ▼                       │
│  ┌─────────────────────────────────────────────────────────────────────────────┐ │
│  │                        SCORE CALCULATION                                     │ │
│  │                                                                               │ │
│  │  TrainingContributionScore = f(content_hours, followers, platform_weight)    │ │
│  │                            = min(100, content_hours * 0.1 +                  │ │
│  │                                        followers/10000 * platform_multiplier)│ │
│  │                                                                               │ │
│  │  UsageExposureScore = f(views, platform_reach)                               │ │
│  │                     = min(100, views/50000 * platform_exposure_factor)       │ │
│  │                                                                               │ │
│  │  Platform Multipliers:                                                        │ │
│  │    - YouTube: 1.2 (high AI training value)                                   │ │
│  │    - TikTok: 0.8 (lower per-content value)                                   │ │
│  │    - Instagram: 1.0 (baseline)                                               │ │
│  │    - Twitter/X: 0.9                                                          │ │
│  │    - Other: 0.7                                                              │ │
│  └─────────────────────────────────────────────────────────────────────────────┘ │
│                                         │                                         │
│                                         │ 4. Apply formula                        │
│                                         ▼                                         │
│  ┌─────────────────────────────────────────────────────────────────────────────┐ │
│  │                          VALUE CALCULATION                                   │ │
│  │                                                                               │ │
│  │  Example:                                                                     │ │
│  │    model_earnings = $1,000,000,000                                           │ │
│  │    contribution_score = 75                                                    │ │
│  │    exposure_score = 60                                                        │ │
│  │    equity_factor = 0.25                                                       │ │
│  │                                                                               │ │
│  │    AI Touch Value™ = $1,000,000,000 × (75/100) × (60/100) × 0.25             │ │
│  │                    = $1,000,000,000 × 0.75 × 0.60 × 0.25                      │ │
│  │                    = $112,500,000                                             │ │
│  └─────────────────────────────────────────────────────────────────────────────┘ │
│                                         │                                         │
│                                         │ 5. Store calculation                    │
│                                         ▼                                         │
│                                 ┌────────────────┐                               │
│                                 │    MongoDB     │                               │
│                                 │   analytics    │                               │
│                                 │   collection   │                               │
│                                 └───────┬────────┘                               │
│                                         │                                         │
│                                         │ 6. Return response                      │
│                                         ▼                                         │
│  ┌─────────────────────────────────────────────────────────────────────────────┐ │
│  │  Response:                                                                   │ │
│  │  {                                                                           │ │
│  │    "calculation_id": "...",                                                  │ │
│  │    "ai_touch_value": 112500000,                                              │ │
│  │    "breakdown": {                                                            │ │
│  │      "model_earnings": 1000000000,                                           │ │
│  │      "contribution_score": 75,                                               │ │
│  │      "exposure_score": 60,                                                   │ │
│  │      "equity_factor": 0.25                                                   │ │
│  │    },                                                                        │ │
│  │    "confidence": "medium",                                                   │ │
│  │    "disclaimer": "Estimate based on provided metrics"                        │ │
│  │  }                                                                           │ │
│  └─────────────────────────────────────────────────────────────────────────────┘ │
│                                                                                   │
└──────────────────────────────────────────────────────────────────────────────────┘
```

### 4.6 AI Assistant Interaction Flow

```
┌──────────────────────────────────────────────────────────────────────────────────┐
│                        AI ASSISTANT INTERACTION FLOW                              │
├──────────────────────────────────────────────────────────────────────────────────┤
│                                                                                   │
│  ┌─────────┐                                                                     │
│  │  User   │                                                                     │
│  └────┬────┘                                                                     │
│       │ 1. Type message in chat interface                                        │
│       │    "What's my total asset value?"                                        │
│       ▼                                                                          │
│  ┌────────────────┐                                                              │
│  │ AIAssistant    │                                                              │
│  │  Component     │                                                              │
│  └───────┬────────┘                                                              │
│          │                                                                       │
│          │ 2. POST /api/v1/assistant/ask                                        │
│          │    {                                                                  │
│          │      "message": "What's my total asset value?",                       │
│          │      "conversation_id": "conv_123"                                    │
│          │    }                                                                  │
│          │    Accept: text/event-stream                                          │
│          ▼                                                                       │
│  ┌────────────────┐                                                              │
│  │  assistant.py  │                                                              │
│  │    (Router)    │                                                              │
│  └───────┬────────┘                                                              │
│          │                                                                       │
│          │ 3. Load conversation context from Redis                               │
│          ▼                                                                       │
│  ┌────────────────┐                                                              │
│  │     Redis      │                                                              │
│  │ conversation:  │                                                              │
│  │  conv_123      │                                                              │
│  │ [{role, msg}]  │                                                              │
│  └───────┬────────┘                                                              │
│          │                                                                       │
│          │ 4. Initialize LangChain model                                         │
│          ▼                                                                       │
│  ┌────────────────────────────────────────────────────────────────────────────┐ │
│  │                       ai_assistant_service.py                               │ │
│  │                                                                              │ │
│  │  ┌────────────────────────────────────────────────────────────────────┐    │ │
│  │  │  init_chat_model(                                                   │    │ │
│  │  │    model="openai:gpt-4"  # or anthropic:claude-3-5-sonnet          │    │ │
│  │  │                          # or google_vertexai:gemini-2.0-flash     │    │ │
│  │  │  )                                                                  │    │ │
│  │  └────────────────────────────────────────────────────────────────────┘    │ │
│  │                                                                              │ │
│  │  5. Bind tools to model                                                      │ │
│  │  ┌────────────────────────────────────────────────────────────────────┐    │ │
│  │  │  model.bind_tools([                                                 │    │ │
│  │  │    lookup_fingerprint,    # Query fingerprint data                  │    │ │
│  │  │    get_asset_analytics,   # Get AI Touch Value™ data                │    │ │
│  │  │    list_user_assets,      # List user's assets                      │    │ │
│  │  │    get_wallet_balance     # Get wallet information                  │    │ │
│  │  │  ])                                                                 │    │ │
│  │  └────────────────────────────────────────────────────────────────────┘    │ │
│  └────────────────────────────────────────────────────────────────────────────┘ │
│          │                                                                       │
│          │ 6. Model processes query, decides to call tool                        │
│          ▼                                                                       │
│  ┌────────────────────────────────────────────────────────────────────────────┐ │
│  │                         TOOL EXECUTION                                      │ │
│  │                                                                              │ │
│  │  LLM Response: {                                                             │ │
│  │    tool_calls: [{                                                            │ │
│  │      name: "get_asset_analytics",                                            │ │
│  │      args: {user_id: "user_123"}                                             │ │
│  │    }]                                                                        │ │
│  │  }                                                                           │ │
│  │                                                                              │ │
│  │  7. Execute tool function                                                    │ │
│  │  ┌────────────────────────────────────────────────────────────────────┐    │ │
│  │  │  async def get_asset_analytics(user_id: str):                       │    │ │
│  │  │      assets = await db.assets.find({"user_id": user_id})            │    │ │
│  │  │      analytics = await db.analytics.find({"user_id": user_id})      │    │ │
│  │  │      return {                                                       │    │ │
│  │  │        "total_assets": len(assets),                                 │    │ │
│  │  │        "total_value": sum(a.ai_touch_value for a in analytics)      │    │ │
│  │  │      }                                                              │    │ │
│  │  └────────────────────────────────────────────────────────────────────┘    │ │
│  │                                                                              │ │
│  │  Tool Result: {total_assets: 15, total_value: 2500000}                       │ │
│  └────────────────────────────────────────────────────────────────────────────┘ │
│          │                                                                       │
│          │ 8. LLM generates final response with tool result                      │
│          ▼                                                                       │
│  ┌────────────────────────────────────────────────────────────────────────────┐ │
│  │                     STREAMING RESPONSE                                      │ │
│  │                                                                              │ │
│  │  StreamingResponse (Server-Sent Events):                                     │ │
│  │                                                                              │ │
│  │  data: {"type": "tool_call", "name": "get_asset_analytics"}                  │ │
│  │  data: {"type": "tool_result", "data": {...}}                                │ │
│  │  data: {"type": "token", "content": "Based"}                                 │ │
│  │  data: {"type": "token", "content": " on"}                                   │ │
│  │  data: {"type": "token", "content": " your"}                                 │ │
│  │  data: {"type": "token", "content": " assets"}                               │ │
│  │  data: {"type": "token", "content": "..."}                                   │ │
│  │  data: {"type": "done"}                                                      │ │
│  └────────────────────────────────────────────────────────────────────────────┘ │
│          │                                                                       │
│          │ 9. Update conversation context in Redis                               │
│          ▼                                                                       │
│  ┌────────────────┐                                                              │
│  │     Redis      │                                                              │
│  │ SETEX conv_123 │                                                              │
│  │ TTL: 1 hour    │                                                              │
│  │ + new messages │                                                              │
│  └────────────────┘                                                              │
│          │                                                                       │
│          │ 10. Frontend receives streaming updates                               │
│          ▼                                                                       │
│  ┌────────────────────────────────────────────────────────────────────────────┐ │
│  │                       CLIENT-SIDE RENDERING                                 │ │
│  │                                                                              │ │
│  │  ┌──────────────────────────────────────────────────────────────────────┐  │ │
│  │  │  ChatMessage Component                                                │  │ │
│  │  │                                                                       │  │ │
│  │  │  🤖 Based on your assets, you have:                                   │  │ │
│  │  │     • 15 total assets uploaded                                        │  │ │
│  │  │     • Estimated AI Touch Value™: $2,500,000                           │  │ │
│  │  │                                                                       │  │ │
│  │  │  Would you like me to break down the value by asset type?             │  │ │
│  │  │                                                                       │  │ │
│  │  │  [Tool Used: get_asset_analytics]                                     │  │ │
│  │  └──────────────────────────────────────────────────────────────────────┘  │ │
│  └────────────────────────────────────────────────────────────────────────────┘ │
│                                                                                   │
└──────────────────────────────────────────────────────────────────────────────────┘
```

---

## 5. Data Model Schemas

### 5.1 Assets Collection

```
┌──────────────────────────────────────────────────────────────────────────────────┐
│                           ASSETS COLLECTION                                       │
├──────────────────────────────────────────────────────────────────────────────────┤
│                                                                                   │
│  Collection: assets                                                               │
│  Database: metastamp                                                              │
│                                                                                   │
│  ┌────────────────────────────────────────────────────────────────────────────┐ │
│  │  Document Schema:                                                           │ │
│  │                                                                             │ │
│  │  {                                                                          │ │
│  │    "_id": ObjectId,                   // MongoDB auto-generated ID          │ │
│  │    "user_id": ObjectId,               // Reference to users collection      │ │
│  │    "file_name": string,               // Original file name                 │ │
│  │    "file_type": enum,                 // "text"|"image"|"audio"|"video"|"url" │ │
│  │    "file_size": int64,                // Size in bytes                      │ │
│  │    "mime_type": string,               // e.g., "image/jpeg"                 │ │
│  │    "s3_key": string,                  // Storage key in S3/MinIO            │ │
│  │    "s3_bucket": string,               // Bucket name                        │ │
│  │    "upload_status": enum,             // "queued"|"processing"|"ready"|"failed" │ │
│  │    "fingerprint_id": ObjectId | null, // Reference to fingerprints         │ │
│  │    "fingerprint_status": enum,        // "pending"|"complete"|"failed"      │ │
│  │    "metadata": {                      // Type-specific metadata             │ │
│  │      "width": int,                    // For images/video                   │ │
│  │      "height": int,                   //                                    │ │
│  │      "duration": float,               // For audio/video (seconds)          │ │
│  │      "bitrate": int,                  // For audio/video                    │ │
│  │      "codec": string,                 // For audio/video                    │ │
│  │      "exif": object,                  // For images                         │ │
│  │      "page_count": int,               // For PDFs                           │ │
│  │      "word_count": int,               // For text                           │ │
│  │      "url": string                    // For URL uploads                    │ │
│  │    },                                                                       │ │
│  │    "ai_touch_score": float | null,    // 0-100 score                        │ │
│  │    "ai_touch_value": float | null,    // Calculated value in USD            │ │
│  │                                                                             │ │
│  │    // Phase 2 placeholder fields                                            │ │
│  │    "training_detected": bool | null,  // AI training detection flag         │ │
│  │    "dataset_matches": array | null,   // Matched dataset identifiers        │ │
│  │    "legal_status": string | null,     // Legal determination status         │ │
│  │                                                                             │ │
│  │    "created_at": datetime,            // Upload timestamp                   │ │
│  │    "updated_at": datetime,            // Last modification                  │ │
│  │    "deleted_at": datetime | null      // Soft delete timestamp              │ │
│  │  }                                                                          │ │
│  └────────────────────────────────────────────────────────────────────────────┘ │
│                                                                                   │
│  Indexes:                                                                         │
│  ┌────────────────────────────────────────────────────────────────────────────┐ │
│  │  • user_id: 1                     (user asset lookup)                       │ │
│  │  • created_at: -1                 (recent assets first)                     │ │
│  │  • upload_status: 1               (status filtering)                        │ │
│  │  • file_type: 1                   (type filtering)                          │ │
│  │  • {user_id: 1, created_at: -1}   (compound: user's recent assets)          │ │
│  │  • fingerprint_id: 1              (fingerprint lookup)                      │ │
│  └────────────────────────────────────────────────────────────────────────────┘ │
│                                                                                   │
└──────────────────────────────────────────────────────────────────────────────────┘
```

### 5.2 Users Collection

```
┌──────────────────────────────────────────────────────────────────────────────────┐
│                           USERS COLLECTION                                        │
├──────────────────────────────────────────────────────────────────────────────────┤
│                                                                                   │
│  Collection: users                                                                │
│  Database: metastamp                                                              │
│                                                                                   │
│  ┌────────────────────────────────────────────────────────────────────────────┐ │
│  │  Document Schema:                                                           │ │
│  │                                                                             │ │
│  │  {                                                                          │ │
│  │    "_id": ObjectId,                   // MongoDB auto-generated ID          │ │
│  │    "email": string,                   // User email (unique)                │ │
│  │    "auth0_id": string | null,         // Auth0 user identifier              │ │
│  │    "password_hash": string | null,    // Bcrypt hash (local auth only)      │ │
│  │    "auth_provider": enum,             // "auth0"|"local"                    │ │
│  │                                                                             │ │
│  │    "profile": {                                                             │ │
│  │      "display_name": string,          // Public display name                │ │
│  │      "avatar_url": string | null,     // Profile picture URL                │ │
│  │      "bio": string | null,            // Short biography                    │ │
│  │      "website": string | null,        // Personal website                   │ │
│  │      "social_links": {                // Social media profiles              │ │
│  │        "youtube": string | null,                                            │ │
│  │        "twitter": string | null,                                            │ │
│  │        "instagram": string | null,                                          │ │
│  │        "tiktok": string | null                                              │ │
│  │      }                                                                      │ │
│  │    },                                                                       │ │
│  │                                                                             │ │
│  │    "creator_metrics": {               // For AI Touch Value™ calculation    │ │
│  │      "total_followers": int,          // Aggregate follower count           │ │
│  │      "total_views": int64,            // Lifetime view count                │ │
│  │      "content_hours": float,          // Total content duration             │ │
│  │      "primary_platform": string       // Main content platform              │ │
│  │    },                                                                       │ │
│  │                                                                             │ │
│  │    "preferences": {                                                         │ │
│  │      "theme": enum,                   // "light"|"dark"|"system"            │ │
│  │      "notifications_enabled": bool,   // Email notifications                │ │
│  │      "language": string               // Preferred language (ISO 639-1)     │ │
│  │    },                                                                       │ │
│  │                                                                             │ │
│  │    "wallet_id": ObjectId,             // Reference to wallet                │ │
│  │    "is_verified": bool,               // Email verification status          │ │
│  │    "is_active": bool,                 // Account active status              │ │
│  │    "role": enum,                      // "user"|"creator"|"admin"           │ │
│  │                                                                             │ │
│  │    "created_at": datetime,            // Registration timestamp             │ │
│  │    "updated_at": datetime,            // Last profile update                │ │
│  │    "last_login_at": datetime          // Last successful login              │ │
│  │  }                                                                          │ │
│  └────────────────────────────────────────────────────────────────────────────┘ │
│                                                                                   │
│  Indexes:                                                                         │
│  ┌────────────────────────────────────────────────────────────────────────────┐ │
│  │  • email: 1                       (unique, login lookup)                    │ │
│  │  • auth0_id: 1                    (unique, sparse, Auth0 lookup)            │ │
│  │  • wallet_id: 1                   (wallet reference)                        │ │
│  │  • created_at: -1                 (recent users)                            │ │
│  └────────────────────────────────────────────────────────────────────────────┘ │
│                                                                                   │
└──────────────────────────────────────────────────────────────────────────────────┘
```

### 5.3 Fingerprints Collection

```
┌──────────────────────────────────────────────────────────────────────────────────┐
│                         FINGERPRINTS COLLECTION                                   │
├──────────────────────────────────────────────────────────────────────────────────┤
│                                                                                   │
│  Collection: fingerprints                                                         │
│  Database: metastamp                                                              │
│                                                                                   │
│  ┌────────────────────────────────────────────────────────────────────────────┐ │
│  │  Document Schema:                                                           │ │
│  │                                                                             │ │
│  │  {                                                                          │ │
│  │    "_id": ObjectId,                   // MongoDB auto-generated ID          │ │
│  │    "asset_id": ObjectId,              // Reference to assets collection     │ │
│  │    "user_id": ObjectId,               // Owner reference                    │ │
│  │    "asset_type": enum,                // "text"|"image"|"audio"|"video"     │ │
│  │                                                                             │ │
│  │    "perceptual_hashes": {             // Visual fingerprints (images/video) │ │
│  │      "phash": string | null,          // Perceptual hash (DCT-based)        │ │
│  │      "ahash": string | null,          // Average hash                       │ │
│  │      "dhash": string | null,          // Difference hash                    │ │
│  │      "whash": string | null,          // Wavelet hash (optional)            │ │
│  │      "frame_hashes": [string] | null  // Video frame hashes                 │ │
│  │    },                                                                       │ │
│  │                                                                             │ │
│  │    "spectral_data": {                 // Audio fingerprints                 │ │
│  │      "mel_spectrogram": [float] | null,    // Compressed spectral features  │ │
│  │      "chromagram": [float] | null,         // Chroma features               │ │
│  │      "spectral_centroid": float | null,    // Spectral centroid             │ │
│  │      "mfcc": [[float]] | null,             // MFCC coefficients             │ │
│  │      "tempo": float | null                 // Detected tempo (BPM)          │ │
│  │    },                                                                       │ │
│  │                                                                             │ │
│  │    "embeddings": {                    // Vector embeddings                  │ │
│  │      "model": string,                 // Embedding model used               │ │
│  │      "version": string,               // Model version                      │ │
│  │      "vector": [float],               // Embedding vector (1536 dims)       │ │
│  │      "dimensions": int                // Vector dimension count             │ │
│  │    },                                                                       │ │
│  │                                                                             │ │
│  │    "content_signature": {             // Text fingerprints                  │ │
│  │      "checksum": string,              // SHA-256 hash                       │ │
│  │      "simhash": string | null,        // Locality-sensitive hash            │ │
│  │      "word_count": int,               // Total words                        │ │
│  │      "char_count": int,               // Total characters                   │ │
│  │      "language": string               // Detected language                  │ │
│  │    },                                                                       │ │
│  │                                                                             │ │
│  │    "metadata": {                      // Extracted metadata                 │ │
│  │      "format": string,                // File format                        │ │
│  │      "quality_score": float,          // Estimated quality 0-1              │ │
│  │      "processing_time_ms": int,       // Fingerprinting duration            │ │
│  │      "raw_metadata": object           // Type-specific raw metadata         │ │
│  │    },                                                                       │ │
│  │                                                                             │ │
│  │    // Phase 2 placeholder fields                                            │ │
│  │    "similarity_matches": [{           // Matched fingerprints               │ │
│  │      "fingerprint_id": ObjectId,                                            │ │
│  │      "similarity_score": float,       // 0-1 similarity                     │ │
│  │      "match_type": string             // "exact"|"near"|"partial"           │ │
│  │    }],                                                                      │ │
│  │    "training_analysis": {             // AI training detection              │ │
│  │      "datasets_checked": [string],    // Checked dataset names              │ │
│  │      "potential_matches": int,        // Number of potential matches        │ │
│  │      "confidence": float              // Detection confidence               │ │
│  │    },                                                                       │ │
│  │                                                                             │ │
│  │    "status": enum,                    // "pending"|"complete"|"failed"      │ │
│  │    "error_message": string | null,    // Error details if failed            │ │
│  │    "created_at": datetime,            // Creation timestamp                 │ │
│  │    "updated_at": datetime             // Last update                        │ │
│  │  }                                                                          │ │
│  └────────────────────────────────────────────────────────────────────────────┘ │
│                                                                                   │
│  Indexes:                                                                         │
│  ┌────────────────────────────────────────────────────────────────────────────┐ │
│  │  • asset_id: 1                    (unique, asset lookup)                    │ │
│  │  • user_id: 1                     (user's fingerprints)                     │ │
│  │  • "perceptual_hashes.phash": 1   (similarity search)                       │ │
│  │  • status: 1                      (status filtering)                        │ │
│  │  • created_at: -1                 (recent fingerprints)                     │ │
│  └────────────────────────────────────────────────────────────────────────────┘ │
│                                                                                   │
└──────────────────────────────────────────────────────────────────────────────────┘
```

### 5.4 Wallet Collection

```
┌──────────────────────────────────────────────────────────────────────────────────┐
│                           WALLET COLLECTION                                       │
├──────────────────────────────────────────────────────────────────────────────────┤
│                                                                                   │
│  Collection: wallets                                                              │
│  Database: metastamp                                                              │
│                                                                                   │
│  ┌────────────────────────────────────────────────────────────────────────────┐ │
│  │  Document Schema:                                                           │ │
│  │                                                                             │ │
│  │  {                                                                          │ │
│  │    "_id": ObjectId,                   // MongoDB auto-generated ID          │ │
│  │    "user_id": ObjectId,               // Reference to users collection      │ │
│  │                                                                             │ │
│  │    "balance": {                                                             │ │
│  │      "available": Decimal128,         // Available balance                  │ │
│  │      "pending": Decimal128,           // Pending earnings                   │ │
│  │      "total_earned": Decimal128,      // Lifetime earnings                  │ │
│  │      "total_withdrawn": Decimal128,   // Lifetime withdrawals               │ │
│  │      "currency": string               // "USD" (default)                    │ │
│  │    },                                                                       │ │
│  │                                                                             │ │
│  │    "transactions": [{                 // Embedded transaction history       │ │
│  │      "transaction_id": string,        // Unique transaction ID              │ │
│  │      "type": enum,                    // "earning"|"payout"|"adjustment"    │ │
│  │      "amount": Decimal128,            // Transaction amount                 │ │
│  │      "description": string,           // Human-readable description         │ │
│  │      "status": enum,                  // "pending"|"completed"|"failed"     │ │
│  │      "reference": {                   // Related entity reference           │ │
│  │        "type": string,                // "asset"|"calculation"|"manual"     │ │
│  │        "id": ObjectId | null          // Related entity ID                  │ │
│  │      },                                                                     │ │
│  │      "metadata": object,              // Additional transaction data        │ │
│  │      "created_at": datetime           // Transaction timestamp              │ │
│  │    }],                                                                      │ │
│  │                                                                             │ │
│  │    "payout_settings": {               // Future: payout configuration       │ │
│  │      "method": string | null,         // "bank"|"paypal"|"crypto"           │ │
│  │      "details": object | null,        // Method-specific details            │ │
│  │      "threshold": Decimal128          // Minimum payout amount              │ │
│  │    },                                                                       │ │
│  │                                                                             │ │
│  │    "is_active": bool,                 // Wallet active status               │ │
│  │    "created_at": datetime,            // Wallet creation timestamp          │ │
│  │    "updated_at": datetime             // Last modification                  │ │
│  │  }                                                                          │ │
│  └────────────────────────────────────────────────────────────────────────────┘ │
│                                                                                   │
│  Indexes:                                                                         │
│  ┌────────────────────────────────────────────────────────────────────────────┐ │
│  │  • user_id: 1                     (unique, user wallet lookup)              │ │
│  │  • "transactions.transaction_id": 1  (transaction lookup)                   │ │
│  │  • "transactions.created_at": -1     (recent transactions)                  │ │
│  │  • updated_at: -1                    (recently modified wallets)            │ │
│  └────────────────────────────────────────────────────────────────────────────┘ │
│                                                                                   │
└──────────────────────────────────────────────────────────────────────────────────┘
```

### 5.5 Analytics Collection

```
┌──────────────────────────────────────────────────────────────────────────────────┐
│                          ANALYTICS COLLECTION                                     │
├──────────────────────────────────────────────────────────────────────────────────┤
│                                                                                   │
│  Collection: analytics                                                            │
│  Database: metastamp                                                              │
│                                                                                   │
│  ┌────────────────────────────────────────────────────────────────────────────┐ │
│  │  Document Schema:                                                           │ │
│  │                                                                             │ │
│  │  {                                                                          │ │
│  │    "_id": ObjectId,                   // MongoDB auto-generated ID          │ │
│  │    "user_id": ObjectId,               // Reference to users collection      │ │
│  │    "asset_id": ObjectId | null,       // Specific asset (optional)          │ │
│  │    "calculation_type": enum,          // "single_asset"|"portfolio"         │ │
│  │                                                                             │ │
│  │    "inputs": {                        // Calculation inputs                 │ │
│  │      "model_earnings": Decimal128,    // Estimated model earnings           │ │
│  │      "followers": int,                // Creator followers                  │ │
│  │      "views": int64,                  // Total views                        │ │
│  │      "content_hours": float,          // Content duration                   │ │
│  │      "platform": string               // Primary platform                   │ │
│  │    },                                                                       │ │
│  │                                                                             │ │
│  │    "scores": {                        // Calculated scores                  │ │
│  │      "training_contribution_score": float,  // 0-100 scale                  │ │
│  │      "usage_exposure_score": float,         // 0-100 scale                  │ │
│  │      "ai_touch_score": float                // Combined score 0-100         │ │
│  │    },                                                                       │ │
│  │                                                                             │ │
│  │    "calculation": {                   // AI Touch Value™ calculation        │ │
│  │      "equity_factor": float,          // Fixed at 0.25 (25%)                │ │
│  │      "ai_touch_value": Decimal128,    // Final calculated value             │ │
│  │      "formula_applied": string,       // Formula version used               │ │
│  │      "breakdown": {                   // Step-by-step calculation           │ │
│  │        "step1_earnings": Decimal128,                                        │ │
│  │        "step2_contribution": Decimal128,                                    │ │
│  │        "step3_exposure": Decimal128,                                        │ │
│  │        "step4_equity": Decimal128                                           │ │
│  │      }                                                                      │ │
│  │    },                                                                       │ │
│  │                                                                             │ │
│  │    "confidence": {                    // Calculation confidence             │ │
│  │      "level": enum,                   // "low"|"medium"|"high"              │ │
│  │      "factors": [string],             // Factors affecting confidence       │ │
│  │      "disclaimer": string             // Standard disclaimer text           │ │
│  │    },                                                                       │ │
│  │                                                                             │ │
│  │    "created_at": datetime,            // Calculation timestamp              │ │
│  │    "expires_at": datetime             // Validity expiration                │ │
│  │  }                                                                          │ │
│  └────────────────────────────────────────────────────────────────────────────┘ │
│                                                                                   │
│  Indexes:                                                                         │
│  ┌────────────────────────────────────────────────────────────────────────────┐ │
│  │  • user_id: 1                     (user calculations)                       │ │
│  │  • asset_id: 1                    (asset calculations)                      │ │
│  │  • created_at: -1                 (recent calculations)                     │ │
│  │  • {user_id: 1, created_at: -1}   (user's recent calculations)              │ │
│  │  • expires_at: 1                  (TTL index for auto-expiration)           │ │
│  └────────────────────────────────────────────────────────────────────────────┘ │
│                                                                                   │
└──────────────────────────────────────────────────────────────────────────────────┘
```

### 5.6 Entity Relationship Diagram

```
┌──────────────────────────────────────────────────────────────────────────────────┐
│                        ENTITY RELATIONSHIP DIAGRAM                                │
├──────────────────────────────────────────────────────────────────────────────────┤
│                                                                                   │
│                                                                                   │
│       ┌─────────────┐          1:1         ┌─────────────┐                       │
│       │   USERS     │─────────────────────▶│   WALLETS   │                       │
│       │             │                      │             │                       │
│       │ _id         │◀─────────────────────│ user_id     │                       │
│       │ email       │                      │ balance     │                       │
│       │ auth0_id    │                      │ transactions│                       │
│       │ profile     │                      └─────────────┘                       │
│       │ wallet_id   │                                                            │
│       └──────┬──────┘                                                            │
│              │                                                                   │
│              │ 1:N                                                               │
│              ▼                                                                   │
│       ┌─────────────┐          1:1         ┌─────────────┐                       │
│       │   ASSETS    │─────────────────────▶│FINGERPRINTS │                       │
│       │             │                      │             │                       │
│       │ _id         │◀─────────────────────│ asset_id    │                       │
│       │ user_id     │                      │ perceptual_ │                       │
│       │ file_name   │                      │   hashes    │                       │
│       │ fingerprint_│                      │ spectral_   │                       │
│       │   id        │                      │   data      │                       │
│       │ s3_key      │                      │ embeddings  │                       │
│       └──────┬──────┘                      └─────────────┘                       │
│              │                                                                   │
│              │ 1:N                                                               │
│              ▼                                                                   │
│       ┌─────────────┐                                                            │
│       │  ANALYTICS  │                                                            │
│       │             │                                                            │
│       │ _id         │                                                            │
│       │ user_id     │                                                            │
│       │ asset_id    │                                                            │
│       │ inputs      │                                                            │
│       │ scores      │                                                            │
│       │ calculation │                                                            │
│       └─────────────┘                                                            │
│                                                                                   │
│                                                                                   │
│   RELATIONSHIPS:                                                                  │
│   ─────────────────────────────────────────────────────────────────────────────  │
│   • Users → Wallets (1:1) - Each user has exactly one wallet                     │
│   • Users → Assets (1:N) - Each user can have many assets                        │
│   • Assets → Fingerprints (1:1) - Each asset has one fingerprint                 │
│   • Users → Analytics (1:N) - Users can have many calculations                   │
│   • Assets → Analytics (1:N) - Assets can have many calculations over time       │
│   • Wallets contain embedded transactions (denormalized for performance)         │
│                                                                                   │
└──────────────────────────────────────────────────────────────────────────────────┘
```

---

## 6. Security Architecture

### 6.1 Authentication Flow

```
┌──────────────────────────────────────────────────────────────────────────────────┐
│                          AUTHENTICATION ARCHITECTURE                              │
├──────────────────────────────────────────────────────────────────────────────────┤
│                                                                                   │
│  ┌─────────────────────────────────────────────────────────────────────────────┐ │
│  │                     PRIMARY: AUTH0 AUTHENTICATION                            │ │
│  │                                                                               │ │
│  │  ┌─────────┐      ┌─────────┐      ┌─────────┐      ┌─────────┐             │ │
│  │  │  User   │──1──▶│Frontend │──2──▶│  Auth0  │──3──▶│Frontend │             │ │
│  │  │         │      │ Login   │      │ Hosted  │      │Callback │             │ │
│  │  │         │      │  Page   │      │  Login  │      │         │             │ │
│  │  └─────────┘      └─────────┘      └─────────┘      └────┬────┘             │ │
│  │                                                          │                   │ │
│  │                                         4. Authorization │                   │ │
│  │                                            Code          │                   │ │
│  │                                                          ▼                   │ │
│  │                                                     ┌─────────┐              │ │
│  │                                                     │Frontend │              │ │
│  │                                                     │Exchange │              │ │
│  │                                                     │  Code   │              │ │
│  │                                                     └────┬────┘              │ │
│  │                                                          │                   │ │
│  │                                              5. POST     │                   │ │
│  │                                         /oauth/token     │                   │ │
│  │                                                          ▼                   │ │
│  │  ┌─────────┐                                        ┌─────────┐              │ │
│  │  │  Auth0  │◀──────────────────────────────────────│Frontend │              │ │
│  │  │  Token  │       6. {access_token, id_token,     │         │              │ │
│  │  │Endpoint │          refresh_token}               │         │              │ │
│  │  └─────────┘                                       └────┬────┘              │ │
│  │                                                         │                    │ │
│  │                           7. Store tokens in           │                    │ │
│  │                              localStorage              ▼                    │ │
│  │                                                   ┌─────────┐               │ │
│  │                                                   │ Storage │               │ │
│  │                                                   │ Service │               │ │
│  │                                                   └─────────┘               │ │
│  └─────────────────────────────────────────────────────────────────────────────┘ │
│                                                                                   │
│  ┌─────────────────────────────────────────────────────────────────────────────┐ │
│  │                    FALLBACK: LOCAL JWT AUTHENTICATION                        │ │
│  │                    (When Auth0 is not configured)                            │ │
│  │                                                                               │ │
│  │  ┌─────────┐      ┌─────────┐      ┌─────────┐      ┌─────────┐             │ │
│  │  │  User   │──1──▶│Frontend │──2──▶│ Backend │──3──▶│ Backend │             │ │
│  │  │         │      │ Login   │      │auth.py  │      │Generate │             │ │
│  │  │ Email/  │      │  Form   │      │Validate │      │Local JWT│             │ │
│  │  │Password │      │         │      │Creds    │      │(HS256)  │             │ │
│  │  └─────────┘      └─────────┘      └─────────┘      └────┬────┘             │ │
│  │                                                          │                   │ │
│  │                                                          │ 4. JWT Token     │ │
│  │                                                          │    (24h expiry)  │ │
│  │                                                          ▼                   │ │
│  │                                                     ┌─────────┐              │ │
│  │                                                     │Frontend │              │ │
│  │                                                     │Response │              │ │
│  │                                                     └─────────┘              │ │
│  │                                                                               │ │
│  │  Local JWT Structure:                                                         │ │
│  │  {                                                                            │ │
│  │    "header": {"alg": "HS256", "typ": "JWT"},                                  │ │
│  │    "payload": {                                                               │ │
│  │      "sub": "user_id",                                                        │ │
│  │      "email": "user@example.com",                                             │ │
│  │      "exp": <24_hours_from_now>,                                              │ │
│  │      "iat": <issued_at>                                                       │ │
│  │    },                                                                         │ │
│  │    "signature": HMACSHA256(header + payload, JWT_SECRET_KEY)                  │ │
│  │  }                                                                            │ │
│  └─────────────────────────────────────────────────────────────────────────────┘ │
│                                                                                   │
└──────────────────────────────────────────────────────────────────────────────────┘
```

### 6.2 Request Authentication Flow

```
┌──────────────────────────────────────────────────────────────────────────────────┐
│                       REQUEST AUTHENTICATION FLOW                                 │
├──────────────────────────────────────────────────────────────────────────────────┤
│                                                                                   │
│  ┌─────────┐      Authorization: Bearer <token>        ┌─────────┐              │
│  │Frontend │──────────────────────────────────────────▶│ Backend │              │
│  │ Request │                                           │  API    │              │
│  └─────────┘                                           └────┬────┘              │
│                                                             │                    │
│                                               ┌─────────────┴─────────────┐     │
│                                               │ auth.py: get_current_user │     │
│                                               └─────────────┬─────────────┘     │
│                                                             │                    │
│                            ┌────────────────────────────────┤                    │
│                            │                                │                    │
│                            ▼                                ▼                    │
│              ┌──────────────────────┐        ┌──────────────────────┐           │
│              │   Auth0 Validation   │        │   Local Validation   │           │
│              │   (if configured)    │        │   (fallback)         │           │
│              └──────────┬───────────┘        └──────────┬───────────┘           │
│                         │                               │                        │
│                         │                               │                        │
│           ┌─────────────┴─────────────┐   ┌─────────────┴─────────────┐         │
│           │ 1. Fetch JWKS from Auth0  │   │ 1. Decode with HS256      │         │
│           │ 2. Verify RS256 signature │   │ 2. Verify JWT_SECRET_KEY  │         │
│           │ 3. Validate claims:       │   │ 3. Validate claims:       │         │
│           │    - iss (issuer)         │   │    - exp (expiration)     │         │
│           │    - aud (audience)       │   │    - sub (user_id)        │         │
│           │    - exp (expiration)     │   │                           │         │
│           └─────────────┬─────────────┘   └─────────────┬─────────────┘         │
│                         │                               │                        │
│                         └───────────────┬───────────────┘                        │
│                                         │                                        │
│                                         ▼                                        │
│                              ┌─────────────────────┐                            │
│                              │   Extract User ID   │                            │
│                              │   from JWT payload  │                            │
│                              └──────────┬──────────┘                            │
│                                         │                                        │
│                                         ▼                                        │
│                              ┌─────────────────────┐                            │
│                              │   MongoDB: Lookup   │                            │
│                              │   User Document     │                            │
│                              └──────────┬──────────┘                            │
│                                         │                                        │
│                                         ▼                                        │
│                              ┌─────────────────────┐                            │
│                              │  Return User Object │                            │
│                              │  or Raise 401       │                            │
│                              └─────────────────────┘                            │
│                                                                                   │
└──────────────────────────────────────────────────────────────────────────────────┘
```

### 6.3 File Upload Security

```
┌──────────────────────────────────────────────────────────────────────────────────┐
│                          FILE UPLOAD SECURITY                                     │
├──────────────────────────────────────────────────────────────────────────────────┤
│                                                                                   │
│  ┌─────────────────────────────────────────────────────────────────────────────┐ │
│  │                     FILE VALIDATION PIPELINE                                 │ │
│  │                                                                               │ │
│  │   ┌───────────────┐                                                          │ │
│  │   │ Incoming File │                                                          │ │
│  │   └───────┬───────┘                                                          │ │
│  │           │                                                                   │ │
│  │           ▼                                                                   │ │
│  │   ┌───────────────────────────────────────────────────────────────────┐      │ │
│  │   │  STEP 1: Extension Validation                                      │      │ │
│  │   │                                                                    │      │ │
│  │   │  ALLOWED:                          REJECTED (413 Error):           │      │ │
│  │   │  ├── Text: .txt, .md, .pdf        ├── Archives: .zip, .rar, .7z    │      │ │
│  │   │  ├── Images: .png, .jpg,          ├── Executables: .exe, .bin,     │      │ │
│  │   │  │          .jpeg, .webp          │               .sh, .app        │      │ │
│  │   │  ├── Audio: .mp3, .wav, .aac      ├── Disk Images: .iso, .dmg      │      │ │
│  │   │  └── Video: .mp4, .mov, .avi      └── Installers: .msi             │      │ │
│  │   └───────────────────────────────────────────────────────────────────┘      │ │
│  │           │                                                                   │ │
│  │           ▼ PASS                                                             │ │
│  │   ┌───────────────────────────────────────────────────────────────────┐      │ │
│  │   │  STEP 2: MIME Type Validation                                      │      │ │
│  │   │                                                                    │      │ │
│  │   │  • Read file magic bytes (first 8-16 bytes)                        │      │ │
│  │   │  • Compare against expected MIME type signatures                   │      │ │
│  │   │  • Reject mismatched extension/content (e.g., .jpg containing EXE) │      │ │
│  │   │                                                                    │      │ │
│  │   │  MIME Type Map:                                                    │      │ │
│  │   │    .png  → image/png      (89 50 4E 47)                           │      │ │
│  │   │    .jpg  → image/jpeg     (FF D8 FF)                              │      │ │
│  │   │    .pdf  → application/pdf (%PDF)                                 │      │ │
│  │   │    .mp3  → audio/mpeg     (FF FB or ID3)                          │      │ │
│  │   │    .mp4  → video/mp4      (ftyp)                                  │      │ │
│  │   └───────────────────────────────────────────────────────────────────┘      │ │
│  │           │                                                                   │ │
│  │           ▼ PASS                                                             │ │
│  │   ┌───────────────────────────────────────────────────────────────────┐      │ │
│  │   │  STEP 3: Size Validation                                           │      │ │
│  │   │                                                                    │      │ │
│  │   │  • Maximum file size: 500 MB (524,288,000 bytes)                   │      │ │
│  │   │  • Enforced at:                                                    │      │ │
│  │   │    - FastAPI request body limit                                    │      │ │
│  │   │    - Presigned URL policy                                          │      │ │
│  │   │    - S3 bucket policy                                              │      │ │
│  │   │                                                                    │      │ │
│  │   │  if file_size > 500_000_000:                                       │      │ │
│  │   │      raise HTTPException(413, "File too large")                    │      │ │
│  │   └───────────────────────────────────────────────────────────────────┘      │ │
│  │           │                                                                   │ │
│  │           ▼ PASS                                                             │ │
│  │   ┌───────────────────────────────────────────────────────────────────┐      │ │
│  │   │  STEP 4: Filename Sanitization                                     │      │ │
│  │   │                                                                    │      │ │
│  │   │  • Remove path traversal characters (../, ..\)                     │      │ │
│  │   │  • Replace special characters with underscores                     │      │ │
│  │   │  • Limit filename length to 255 characters                         │      │ │
│  │   │  • Generate UUID-based storage key                                 │      │ │
│  │   │                                                                    │      │ │
│  │   │  original: "../../../etc/passwd.txt"                               │      │ │
│  │   │  sanitized: "etc_passwd.txt"                                       │      │ │
│  │   │  s3_key: "uploads/{user_id}/{uuid}_{sanitized}"                    │      │ │
│  │   └───────────────────────────────────────────────────────────────────┘      │ │
│  │           │                                                                   │ │
│  │           ▼ PASS                                                             │ │
│  │   ┌───────────────┐                                                          │ │
│  │   │ PROCEED WITH  │                                                          │ │
│  │   │    UPLOAD     │                                                          │ │
│  │   └───────────────┘                                                          │ │
│  │                                                                               │ │
│  └─────────────────────────────────────────────────────────────────────────────┘ │
│                                                                                   │
└──────────────────────────────────────────────────────────────────────────────────┘
```

### 6.4 Presigned URL Security

```
┌──────────────────────────────────────────────────────────────────────────────────┐
│                         PRESIGNED URL SECURITY                                    │
├──────────────────────────────────────────────────────────────────────────────────┤
│                                                                                   │
│  ┌─────────────────────────────────────────────────────────────────────────────┐ │
│  │                    PRESIGNED URL GENERATION                                  │ │
│  │                                                                               │ │
│  │  Parameters enforced in presigned URL:                                        │ │
│  │                                                                               │ │
│  │  s3_client.generate_presigned_url(                                           │ │
│  │      ClientMethod='put_object',                                              │ │
│  │      Params={                                                                │ │
│  │          'Bucket': bucket_name,                                              │ │
│  │          'Key': f"uploads/{user_id}/{uuid}_{filename}",                      │ │
│  │          'ContentType': validated_mime_type,     # Enforced type             │ │
│  │          'ContentLength': file_size,             # Enforced size             │ │
│  │      },                                                                      │ │
│  │      ExpiresIn=900  # 15 minutes expiration                                  │ │
│  │  )                                                                           │ │
│  │                                                                               │ │
│  └─────────────────────────────────────────────────────────────────────────────┘ │
│                                                                                   │
│  ┌─────────────────────────────────────────────────────────────────────────────┐ │
│  │                    SECURITY CONSTRAINTS                                      │ │
│  │                                                                               │ │
│  │  ┌─────────────────────────────────────────────────────────────────────┐    │ │
│  │  │  Time-Based Security:                                                │    │ │
│  │  │  • URL expires after 15 minutes (900 seconds)                        │    │ │
│  │  │  • Prevents replay attacks with old URLs                             │    │ │
│  │  │  • Forces re-validation for each upload attempt                      │    │ │
│  │  └─────────────────────────────────────────────────────────────────────┘    │ │
│  │                                                                               │ │
│  │  ┌─────────────────────────────────────────────────────────────────────┐    │ │
│  │  │  Content-Type Enforcement:                                           │    │ │
│  │  │  • Presigned URL locked to specific MIME type                        │    │ │
│  │  │  • S3 rejects mismatched Content-Type header                         │    │ │
│  │  │  • Prevents uploading disguised files                                │    │ │
│  │  └─────────────────────────────────────────────────────────────────────┘    │ │
│  │                                                                               │ │
│  │  ┌─────────────────────────────────────────────────────────────────────┐    │ │
│  │  │  Size Enforcement:                                                   │    │ │
│  │  │  • Content-Length must match declared size                           │    │ │
│  │  │  • Backend validates size before generating URL                      │    │ │
│  │  │  • S3 bucket policy enforces maximum 500MB                           │    │ │
│  │  └─────────────────────────────────────────────────────────────────────┘    │ │
│  │                                                                               │ │
│  │  ┌─────────────────────────────────────────────────────────────────────┐    │ │
│  │  │  Key Path Security:                                                  │    │ │
│  │  │  • S3 key includes user_id namespace                                 │    │ │
│  │  │  • UUID prefix prevents collisions                                   │    │ │
│  │  │  • Users cannot access other users' upload paths                     │    │ │
│  │  └─────────────────────────────────────────────────────────────────────┘    │ │
│  │                                                                               │ │
│  └─────────────────────────────────────────────────────────────────────────────┘ │
│                                                                                   │
│  ┌─────────────────────────────────────────────────────────────────────────────┐ │
│  │                    UPLOAD CONFIRMATION VALIDATION                            │ │
│  │                                                                               │ │
│  │  POST /api/v1/upload/confirmation                                            │ │
│  │                                                                               │ │
│  │  1. Verify s3_key belongs to authenticated user                              │ │
│  │  2. HEAD object to confirm file exists in S3                                 │ │
│  │  3. Validate actual file size matches declared size                          │ │
│  │  4. Validate Content-Type from S3 metadata                                   │ │
│  │  5. Only then create asset record in MongoDB                                 │ │
│  │                                                                               │ │
│  │  Security Checks:                                                             │ │
│  │  ┌────────────────────────────────────────────────────────────────────┐     │ │
│  │  │  if not s3_key.startswith(f"uploads/{user_id}/"):                  │     │ │
│  │  │      raise HTTPException(403, "Unauthorized access to resource")   │     │ │
│  │  │                                                                    │     │ │
│  │  │  s3_head = s3_client.head_object(Bucket=bucket, Key=s3_key)        │     │ │
│  │  │  if s3_head is None:                                               │     │ │
│  │  │      raise HTTPException(404, "File not found in storage")         │     │ │
│  │  │                                                                    │     │ │
│  │  │  if s3_head['ContentLength'] != declared_size:                     │     │ │
│  │  │      raise HTTPException(400, "Size mismatch")                     │     │ │
│  │  └────────────────────────────────────────────────────────────────────┘     │ │
│  │                                                                               │ │
│  └─────────────────────────────────────────────────────────────────────────────┘ │
│                                                                                   │
└──────────────────────────────────────────────────────────────────────────────────┘
```

### 6.5 Input Sanitization

```
┌──────────────────────────────────────────────────────────────────────────────────┐
│                          INPUT SANITIZATION                                       │
├──────────────────────────────────────────────────────────────────────────────────┤
│                                                                                   │
│  ┌─────────────────────────────────────────────────────────────────────────────┐ │
│  │                  SANITIZATION LAYERS                                         │ │
│  │                                                                               │ │
│  │  Layer 1: Pydantic Models (Type Validation)                                   │ │
│  │  ┌─────────────────────────────────────────────────────────────────────┐    │ │
│  │  │  class AssetCreate(BaseModel):                                       │    │ │
│  │  │      file_name: str = Field(..., max_length=255)                     │    │ │
│  │  │      file_type: FileTypeEnum                                         │    │ │
│  │  │      file_size: int = Field(..., gt=0, le=500_000_000)               │    │ │
│  │  │                                                                      │    │ │
│  │  │      @validator('file_name')                                         │    │ │
│  │  │      def sanitize_filename(cls, v):                                  │    │ │
│  │  │          # Remove path components                                    │    │ │
│  │  │          v = os.path.basename(v)                                     │    │ │
│  │  │          # Remove null bytes and special chars                       │    │ │
│  │  │          v = re.sub(r'[<>:"/\\|?*\x00-\x1f]', '_', v)               │    │ │
│  │  │          return v                                                    │    │ │
│  │  └─────────────────────────────────────────────────────────────────────┘    │ │
│  │                                                                               │ │
│  │  Layer 2: MongoDB Query Sanitization                                          │ │
│  │  ┌─────────────────────────────────────────────────────────────────────┐    │ │
│  │  │  # Always use parameterized queries via Motor                        │    │ │
│  │  │  # NEVER construct queries with string concatenation                 │    │ │
│  │  │                                                                      │    │ │
│  │  │  # ✓ SAFE                                                           │    │ │
│  │  │  await db.assets.find_one({"_id": ObjectId(asset_id)})               │    │ │
│  │  │                                                                      │    │ │
│  │  │  # ✗ UNSAFE (never do this)                                         │    │ │
│  │  │  await db.assets.find_one(f"{{'_id': '{asset_id}'}}")                │    │ │
│  │  │                                                                      │    │ │
│  │  │  # ObjectId validation prevents injection                            │    │ │
│  │  │  try:                                                                │    │ │
│  │  │      oid = ObjectId(asset_id)                                        │    │ │
│  │  │  except InvalidId:                                                   │    │ │
│  │  │      raise HTTPException(400, "Invalid ID format")                   │    │ │
│  │  └─────────────────────────────────────────────────────────────────────┘    │ │
│  │                                                                               │ │
│  │  Layer 3: URL Validation                                                      │ │
│  │  ┌─────────────────────────────────────────────────────────────────────┐    │ │
│  │  │  ALLOWED_URL_SCHEMES = {'http', 'https'}                             │    │ │
│  │  │  ALLOWED_URL_HOSTS = {                                               │    │ │
│  │  │      'youtube.com', 'www.youtube.com', 'youtu.be',                   │    │ │
│  │  │      'vimeo.com', 'www.vimeo.com'                                    │    │ │
│  │  │  }                                                                   │    │ │
│  │  │                                                                      │    │ │
│  │  │  def validate_url(url: str) -> bool:                                 │    │ │
│  │  │      parsed = urlparse(url)                                          │    │ │
│  │  │                                                                      │    │ │
│  │  │      # Check scheme                                                  │    │ │
│  │  │      if parsed.scheme not in ALLOWED_URL_SCHEMES:                    │    │ │
│  │  │          return False                                                │    │ │
│  │  │                                                                      │    │ │
│  │  │      # Block local/private IPs                                       │    │ │
│  │  │      if is_private_ip(parsed.hostname):                              │    │ │
│  │  │          return False                                                │    │ │
│  │  │                                                                      │    │ │
│  │  │      # Check for dangerous file extensions in URL path               │    │ │
│  │  │      if has_dangerous_extension(parsed.path):                        │    │ │
│  │  │          return False                                                │    │ │
│  │  │                                                                      │    │ │
│  │  │      return True                                                     │    │ │
│  │  └─────────────────────────────────────────────────────────────────────┘    │ │
│  │                                                                               │ │
│  │  Layer 4: AI Assistant Input Sanitization                                     │ │
│  │  ┌─────────────────────────────────────────────────────────────────────┐    │ │
│  │  │  # Limit message length                                              │    │ │
│  │  │  MAX_MESSAGE_LENGTH = 4000                                           │    │ │
│  │  │                                                                      │    │ │
│  │  │  # Rate limiting (per user)                                          │    │ │
│  │  │  MAX_REQUESTS_PER_MINUTE = 10                                        │    │ │
│  │  │                                                                      │    │ │
│  │  │  # Context injection prevention                                      │    │ │
│  │  │  def sanitize_user_message(message: str) -> str:                     │    │ │
│  │  │      # Strip potential prompt injection patterns                     │    │ │
│  │  │      message = message[:MAX_MESSAGE_LENGTH]                          │    │ │
│  │  │      # Remove control characters                                     │    │ │
│  │  │      message = re.sub(r'[\x00-\x08\x0b\x0c\x0e-\x1f]', '', message)  │    │ │
│  │  │      return message                                                  │    │ │
│  │  └─────────────────────────────────────────────────────────────────────┘    │ │
│  │                                                                               │ │
│  └─────────────────────────────────────────────────────────────────────────────┘ │
│                                                                                   │
└──────────────────────────────────────────────────────────────────────────────────┘
```

---

## 7. Scalability Considerations

### 7.1 Stateless Backend Design

```
┌──────────────────────────────────────────────────────────────────────────────────┐
│                        STATELESS BACKEND DESIGN                                   │
├──────────────────────────────────────────────────────────────────────────────────┤
│                                                                                   │
│  ┌─────────────────────────────────────────────────────────────────────────────┐ │
│  │                     STATELESS ARCHITECTURE                                   │ │
│  │                                                                               │ │
│  │  ┌───────────────────────────────────────────────────────────────────────┐  │ │
│  │  │                        LOAD BALANCER                                   │  │ │
│  │  │                    (Round Robin / Least Connections)                   │  │ │
│  │  └───────────────────────────────────────────────────────────────────────┘  │ │
│  │                               │                                              │ │
│  │          ┌────────────────────┼────────────────────┐                        │ │
│  │          │                    │                    │                        │ │
│  │          ▼                    ▼                    ▼                        │ │
│  │  ┌─────────────┐      ┌─────────────┐      ┌─────────────┐                  │ │
│  │  │  Backend    │      │  Backend    │      │  Backend    │                  │ │
│  │  │  Instance 1 │      │  Instance 2 │      │  Instance N │                  │ │
│  │  │             │      │             │      │             │                  │ │
│  │  │  Uvicorn    │      │  Uvicorn    │      │  Uvicorn    │                  │ │
│  │  │  4 workers  │      │  4 workers  │      │  4 workers  │                  │ │
│  │  └──────┬──────┘      └──────┬──────┘      └──────┬──────┘                  │ │
│  │         │                    │                    │                         │ │
│  │         └────────────────────┼────────────────────┘                         │ │
│  │                              │                                              │ │
│  │                              ▼                                              │ │
│  │  ┌───────────────────────────────────────────────────────────────────────┐  │ │
│  │  │                    SHARED STATE LAYER                                  │  │ │
│  │  │                                                                        │  │ │
│  │  │   ┌─────────────┐  ┌─────────────┐  ┌─────────────┐                   │  │ │
│  │  │   │   MongoDB   │  │    Redis    │  │   MinIO/S3  │                   │  │ │
│  │  │   │   Cluster   │  │   Cluster   │  │   Cluster   │                   │  │ │
│  │  │   └─────────────┘  └─────────────┘  └─────────────┘                   │  │ │
│  │  │                                                                        │  │ │
│  │  └───────────────────────────────────────────────────────────────────────┘  │ │
│  │                                                                               │ │
│  └─────────────────────────────────────────────────────────────────────────────┘ │
│                                                                                   │
│  ┌─────────────────────────────────────────────────────────────────────────────┐ │
│  │                     STATELESS PRINCIPLES                                     │ │
│  │                                                                               │ │
│  │  ✓ No in-memory session storage                                              │ │
│  │    → Sessions stored in Redis with TTL                                       │ │
│  │                                                                               │ │
│  │  ✓ No local file storage                                                     │ │
│  │    → All files stored in S3/MinIO                                            │ │
│  │    → Temp files cleaned immediately after processing                         │ │
│  │                                                                               │ │
│  │  ✓ No instance-specific state                                                │ │
│  │    → Configuration from environment variables                                │ │
│  │    → All state externalized to MongoDB/Redis                                 │ │
│  │                                                                               │ │
│  │  ✓ Request routing independence                                              │ │
│  │    → Any instance can handle any request                                     │ │
│  │    → No sticky sessions required                                             │ │
│  │                                                                               │ │
│  │  ✓ Graceful shutdown support                                                 │ │
│  │    → Complete in-flight requests                                             │ │
│  │    → Release database connections                                            │ │
│  │                                                                               │ │
│  └─────────────────────────────────────────────────────────────────────────────┘ │
│                                                                                   │
└──────────────────────────────────────────────────────────────────────────────────┘
```

### 7.2 Redis Caching Strategy

```
┌──────────────────────────────────────────────────────────────────────────────────┐
│                          REDIS CACHING STRATEGY                                   │
├──────────────────────────────────────────────────────────────────────────────────┤
│                                                                                   │
│  ┌─────────────────────────────────────────────────────────────────────────────┐ │
│  │                        CACHE KEY PATTERNS                                    │ │
│  │                                                                               │ │
│  │  Session Cache:                                                               │ │
│  │  ┌────────────────────────────────────────────────────────────────────────┐ │ │
│  │  │  Key:    session:{user_id}                                              │ │ │
│  │  │  Value:  JSON {user_data, permissions, last_activity}                   │ │ │
│  │  │  TTL:    24 hours (86400 seconds)                                       │ │ │
│  │  │  Usage:  Avoid MongoDB lookup for authenticated requests                │ │ │
│  │  └────────────────────────────────────────────────────────────────────────┘ │ │
│  │                                                                               │ │
│  │  Asset Metadata Cache:                                                        │ │
│  │  ┌────────────────────────────────────────────────────────────────────────┐ │ │
│  │  │  Key:    asset:{asset_id}                                               │ │ │
│  │  │  Value:  JSON {asset_metadata without embeddings}                       │ │ │
│  │  │  TTL:    5 minutes (300 seconds)                                        │ │ │
│  │  │  Usage:  Frequently accessed asset details                              │ │ │
│  │  └────────────────────────────────────────────────────────────────────────┘ │ │
│  │                                                                               │ │
│  │  Fingerprint Cache:                                                           │ │
│  │  ┌────────────────────────────────────────────────────────────────────────┐ │ │
│  │  │  Key:    fingerprint:{asset_id}                                         │ │ │
│  │  │  Value:  JSON {hashes, metadata} (without large embeddings)             │ │ │
│  │  │  TTL:    1 hour (3600 seconds)                                          │ │ │
│  │  │  Usage:  Fingerprint display without full vector retrieval              │ │ │
│  │  └────────────────────────────────────────────────────────────────────────┘ │ │
│  │                                                                               │ │
│  │  Conversation Context Cache:                                                  │ │
│  │  ┌────────────────────────────────────────────────────────────────────────┐ │ │
│  │  │  Key:    conversation:{conversation_id}                                 │ │ │
│  │  │  Value:  JSON [{role, content, timestamp}, ...]                         │ │ │
│  │  │  TTL:    1 hour (3600 seconds)                                          │ │ │
│  │  │  Usage:  AI assistant conversation history                              │ │ │
│  │  └────────────────────────────────────────────────────────────────────────┘ │ │
│  │                                                                               │ │
│  │  User Assets List Cache:                                                      │ │
│  │  ┌────────────────────────────────────────────────────────────────────────┐ │ │
│  │  │  Key:    user_assets:{user_id}:page:{page}                              │ │ │
│  │  │  Value:  JSON [asset_ids...]                                            │ │ │
│  │  │  TTL:    2 minutes (120 seconds)                                        │ │ │
│  │  │  Usage:  Paginated asset list for dashboard                             │ │ │
│  │  └────────────────────────────────────────────────────────────────────────┘ │ │
│  │                                                                               │ │
│  └─────────────────────────────────────────────────────────────────────────────┘ │
│                                                                                   │
│  ┌─────────────────────────────────────────────────────────────────────────────┐ │
│  │                      CACHING DECORATOR PATTERN                               │ │
│  │                                                                               │ │
│  │  @cache(ttl=300, key_prefix="asset")                                         │ │
│  │  async def get_asset(asset_id: str) -> Asset:                                │ │
│  │      return await db.assets.find_one({"_id": ObjectId(asset_id)})            │ │
│  │                                                                               │ │
│  │  Implementation:                                                              │ │
│  │  ┌────────────────────────────────────────────────────────────────────────┐ │ │
│  │  │  def cache(ttl: int, key_prefix: str):                                  │ │ │
│  │  │      def decorator(func):                                               │ │ │
│  │  │          @wraps(func)                                                   │ │ │
│  │  │          async def wrapper(*args, **kwargs):                            │ │ │
│  │  │              cache_key = f"{key_prefix}:{args[0]}"                      │ │ │
│  │  │                                                                         │ │ │
│  │  │              # Try cache first                                          │ │ │
│  │  │              cached = await redis.get(cache_key)                        │ │ │
│  │  │              if cached:                                                 │ │ │
│  │  │                  return json.loads(cached)                              │ │ │
│  │  │                                                                         │ │ │
│  │  │              # Execute function                                         │ │ │
│  │  │              result = await func(*args, **kwargs)                       │ │ │
│  │  │                                                                         │ │ │
│  │  │              # Store in cache                                           │ │ │
│  │  │              await redis.setex(cache_key, ttl, json.dumps(result))      │ │ │
│  │  │                                                                         │ │ │
│  │  │              return result                                              │ │ │
│  │  │          return wrapper                                                 │ │ │
│  │  │      return decorator                                                   │ │ │
│  │  └────────────────────────────────────────────────────────────────────────┘ │ │
│  │                                                                               │ │
│  └─────────────────────────────────────────────────────────────────────────────┘ │
│                                                                                   │
│  ┌─────────────────────────────────────────────────────────────────────────────┐ │
│  │                      CACHE INVALIDATION                                      │ │
│  │                                                                               │ │
│  │  On Asset Update:                                                             │ │
│  │    await redis.delete(f"asset:{asset_id}")                                   │ │
│  │    await redis.delete(f"fingerprint:{asset_id}")                             │ │
│  │    await redis.delete(f"user_assets:{user_id}:*")  # Pattern delete          │ │
│  │                                                                               │ │
│  │  On User Update:                                                              │ │
│  │    await redis.delete(f"session:{user_id}")                                  │ │
│  │                                                                               │ │
│  │  On Fingerprint Complete:                                                     │ │
│  │    await redis.delete(f"asset:{asset_id}")         # Refresh asset status    │ │
│  │                                                                               │ │
│  └─────────────────────────────────────────────────────────────────────────────┘ │
│                                                                                   │
└──────────────────────────────────────────────────────────────────────────────────┘
```

### 7.3 MongoDB Indexing Strategy

```
┌──────────────────────────────────────────────────────────────────────────────────┐
│                        MONGODB INDEXING STRATEGY                                  │
├──────────────────────────────────────────────────────────────────────────────────┤
│                                                                                   │
│  ┌─────────────────────────────────────────────────────────────────────────────┐ │
│  │                        INDEX DEFINITIONS                                     │ │
│  │                                                                               │ │
│  │  assets collection:                                                           │ │
│  │  ┌────────────────────────────────────────────────────────────────────────┐ │ │
│  │  │  // Primary query: User's assets, newest first                          │ │ │
│  │  │  db.assets.createIndex({user_id: 1, created_at: -1})                    │ │ │
│  │  │                                                                          │ │ │
│  │  │  // Filter by status                                                     │ │ │
│  │  │  db.assets.createIndex({upload_status: 1})                              │ │ │
│  │  │                                                                          │ │ │
│  │  │  // Filter by type                                                       │ │ │
│  │  │  db.assets.createIndex({file_type: 1})                                  │ │ │
│  │  │                                                                          │ │ │
│  │  │  // Fingerprint lookup                                                   │ │ │
│  │  │  db.assets.createIndex({fingerprint_id: 1}, {sparse: true})             │ │ │
│  │  │                                                                          │ │ │
│  │  │  // Combined filter for dashboard                                        │ │ │
│  │  │  db.assets.createIndex({                                                 │ │ │
│  │  │      user_id: 1, file_type: 1, upload_status: 1, created_at: -1         │ │ │
│  │  │  })                                                                      │ │ │
│  │  └────────────────────────────────────────────────────────────────────────┘ │ │
│  │                                                                               │ │
│  │  users collection:                                                            │ │
│  │  ┌────────────────────────────────────────────────────────────────────────┐ │ │
│  │  │  // Email lookup (login)                                                 │ │ │
│  │  │  db.users.createIndex({email: 1}, {unique: true})                       │ │ │
│  │  │                                                                          │ │ │
│  │  │  // Auth0 ID lookup                                                      │ │ │
│  │  │  db.users.createIndex({auth0_id: 1}, {unique: true, sparse: true})      │ │ │
│  │  │                                                                          │ │ │
│  │  │  // Wallet reference                                                     │ │ │
│  │  │  db.users.createIndex({wallet_id: 1})                                   │ │ │
│  │  └────────────────────────────────────────────────────────────────────────┘ │ │
│  │                                                                               │ │
│  │  fingerprints collection:                                                     │ │
│  │  ┌────────────────────────────────────────────────────────────────────────┐ │ │
│  │  │  // Asset fingerprint lookup                                             │ │ │
│  │  │  db.fingerprints.createIndex({asset_id: 1}, {unique: true})             │ │ │
│  │  │                                                                          │ │ │
│  │  │  // User's fingerprints                                                  │ │ │
│  │  │  db.fingerprints.createIndex({user_id: 1})                              │ │ │
│  │  │                                                                          │ │ │
│  │  │  // Perceptual hash similarity search                                    │ │ │
│  │  │  db.fingerprints.createIndex({"perceptual_hashes.phash": 1})            │ │ │
│  │  │                                                                          │ │ │
│  │  │  // Status filtering                                                     │ │ │
│  │  │  db.fingerprints.createIndex({status: 1})                               │ │ │
│  │  └────────────────────────────────────────────────────────────────────────┘ │ │
│  │                                                                               │ │
│  │  wallets collection:                                                          │ │
│  │  ┌────────────────────────────────────────────────────────────────────────┐ │ │
│  │  │  // User wallet lookup                                                   │ │ │
│  │  │  db.wallets.createIndex({user_id: 1}, {unique: true})                   │ │ │
│  │  │                                                                          │ │ │
│  │  │  // Transaction lookup                                                   │ │ │
│  │  │  db.wallets.createIndex({"transactions.transaction_id": 1})             │ │ │
│  │  │                                                                          │ │ │
│  │  │  // Recent transactions                                                  │ │ │
│  │  │  db.wallets.createIndex({"transactions.created_at": -1})                │ │ │
│  │  └────────────────────────────────────────────────────────────────────────┘ │ │
│  │                                                                               │ │
│  │  analytics collection:                                                        │ │
│  │  ┌────────────────────────────────────────────────────────────────────────┐ │ │
│  │  │  // User analytics history                                               │ │ │
│  │  │  db.analytics.createIndex({user_id: 1, created_at: -1})                 │ │ │
│  │  │                                                                          │ │ │
│  │  │  // Asset-specific analytics                                             │ │ │
│  │  │  db.analytics.createIndex({asset_id: 1}, {sparse: true})                │ │ │
│  │  │                                                                          │ │ │
│  │  │  // TTL index for auto-expiration                                        │ │ │
│  │  │  db.analytics.createIndex(                                               │ │ │
│  │  │      {expires_at: 1},                                                    │ │ │
│  │  │      {expireAfterSeconds: 0}                                             │ │ │
│  │  │  )                                                                       │ │ │
│  │  └────────────────────────────────────────────────────────────────────────┘ │ │
│  │                                                                               │ │
│  └─────────────────────────────────────────────────────────────────────────────┘ │
│                                                                                   │
│  ┌─────────────────────────────────────────────────────────────────────────────┐ │
│  │                      QUERY OPTIMIZATION PATTERNS                             │ │
│  │                                                                               │ │
│  │  Use Projection to Reduce Transfer:                                           │ │
│  │  ┌────────────────────────────────────────────────────────────────────────┐ │ │
│  │  │  # Only fetch needed fields                                              │ │ │
│  │  │  await db.assets.find(                                                   │ │ │
│  │  │      {"user_id": user_id},                                               │ │ │
│  │  │      {"_id": 1, "file_name": 1, "upload_status": 1, "created_at": 1}     │ │ │
│  │  │  )                                                                       │ │ │
│  │  └────────────────────────────────────────────────────────────────────────┘ │ │
│  │                                                                               │ │
│  │  Use Covered Queries When Possible:                                           │ │
│  │  ┌────────────────────────────────────────────────────────────────────────┐ │ │
│  │  │  # Query satisfied entirely from index                                   │ │ │
│  │  │  # Index: {user_id: 1, created_at: -1}                                   │ │ │
│  │  │  await db.assets.find(                                                   │ │ │
│  │  │      {"user_id": user_id},                                               │ │ │
│  │  │      {"_id": 0, "user_id": 1, "created_at": 1}                           │ │ │
│  │  │  ).hint({"user_id": 1, "created_at": -1})                                │ │ │
│  │  └────────────────────────────────────────────────────────────────────────┘ │ │
│  │                                                                               │ │
│  │  Pagination with Skip/Limit:                                                  │ │
│  │  ┌────────────────────────────────────────────────────────────────────────┐ │ │
│  │  │  PAGE_SIZE = 20                                                          │ │ │
│  │  │                                                                          │ │ │
│  │  │  await db.assets.find({"user_id": user_id})                              │ │ │
│  │  │      .sort("created_at", -1)                                             │ │ │
│  │  │      .skip(page * PAGE_SIZE)                                             │ │ │
│  │  │      .limit(PAGE_SIZE)                                                   │ │ │
│  │  │      .to_list(PAGE_SIZE)                                                 │ │ │
│  │  └────────────────────────────────────────────────────────────────────────┘ │ │
│  │                                                                               │ │
│  └─────────────────────────────────────────────────────────────────────────────┘ │
│                                                                                   │
└──────────────────────────────────────────────────────────────────────────────────┘
```

### 7.4 Horizontal Scaling Capabilities

```
┌──────────────────────────────────────────────────────────────────────────────────┐
│                     HORIZONTAL SCALING CAPABILITIES                               │
├──────────────────────────────────────────────────────────────────────────────────┤
│                                                                                   │
│  ┌─────────────────────────────────────────────────────────────────────────────┐ │
│  │                      SCALING ARCHITECTURE                                    │ │
│  │                                                                               │ │
│  │                        ┌─────────────────┐                                   │ │
│  │                        │   CDN (Future)  │                                   │ │
│  │                        │  Static Assets  │                                   │ │
│  │                        └────────┬────────┘                                   │ │
│  │                                 │                                            │ │
│  │                        ┌────────▼────────┐                                   │ │
│  │                        │  Load Balancer  │                                   │ │
│  │                        │   (nginx/HAProxy)│                                  │ │
│  │                        └────────┬────────┘                                   │ │
│  │                                 │                                            │ │
│  │  ┌──────────────────────────────┼──────────────────────────────┐            │ │
│  │  │                              │                              │            │ │
│  │  ▼                              ▼                              ▼            │ │
│  │  ┌─────────┐              ┌─────────┐              ┌─────────┐              │ │
│  │  │Backend 1│              │Backend 2│              │Backend N│              │ │
│  │  │ Pod/    │              │ Pod/    │              │ Pod/    │              │ │
│  │  │Container│              │Container│              │Container│              │ │
│  │  └────┬────┘              └────┬────┘              └────┬────┘              │ │
│  │       │                        │                        │                   │ │
│  │       └────────────────────────┼────────────────────────┘                   │ │
│  │                                │                                            │ │
│  │  ┌─────────────────────────────┼─────────────────────────────┐              │ │
│  │  │                             │                             │              │ │
│  │  ▼                             ▼                             ▼              │ │
│  │  ┌─────────────────┐   ┌─────────────────┐   ┌─────────────────┐           │ │
│  │  │  MongoDB        │   │  Redis          │   │  S3/MinIO       │           │ │
│  │  │  Replica Set    │   │  Cluster        │   │  Distributed    │           │ │
│  │  │                 │   │                 │   │                 │           │ │
│  │  │  ┌───┐ ┌───┐   │   │  ┌───┐ ┌───┐   │   │  ┌───┐ ┌───┐   │           │ │
│  │  │  │Pri│→│Sec│   │   │  │M1 │ │M2 │   │   │  │N1 │ │N2 │   │           │ │
│  │  │  └───┘ └───┘   │   │  └───┘ └───┘   │   │  └───┘ └───┘   │           │ │
│  │  │       ↓        │   │       ↓        │   │       ↓        │           │ │
│  │  │     ┌───┐      │   │     ┌───┐      │   │     ┌───┐      │           │ │
│  │  │     │Sec│      │   │     │M3 │      │   │     │NN │      │           │ │
│  │  │     └───┘      │   │     └───┘      │   │     └───┘      │           │ │
│  │  └─────────────────┘   └─────────────────┘   └─────────────────┘           │ │
│  │                                                                               │ │
│  └─────────────────────────────────────────────────────────────────────────────┘ │
│                                                                                   │
│  ┌─────────────────────────────────────────────────────────────────────────────┐ │
│  │                   SCALING CONSIDERATIONS BY TIER                             │ │
│  │                                                                               │ │
│  │  Backend Tier:                                                                │ │
│  │  ┌────────────────────────────────────────────────────────────────────────┐ │ │
│  │  │  • Scale horizontally by adding container instances                     │ │ │
│  │  │  • Each instance runs Uvicorn with 4 workers (CPU-bound)                │ │ │
│  │  │  • Auto-scale based on CPU utilization (target: 70%)                    │ │ │
│  │  │  • Health checks on /health endpoint                                    │ │ │
│  │  │  • Graceful shutdown with connection draining                           │ │ │
│  │  └────────────────────────────────────────────────────────────────────────┘ │ │
│  │                                                                               │ │
│  │  Database Tier (MongoDB):                                                     │ │
│  │  ┌────────────────────────────────────────────────────────────────────────┐ │ │
│  │  │  • Replica set for high availability (1 primary + 2 secondaries)        │ │ │
│  │  │  • Read preference: secondaryPreferred for read-heavy operations        │ │ │
│  │  │  • Sharding for collections exceeding 100GB (future)                    │ │ │
│  │  │  • Shard key for assets: {user_id: "hashed"}                            │ │ │
│  │  └────────────────────────────────────────────────────────────────────────┘ │ │
│  │                                                                               │ │
│  │  Cache Tier (Redis):                                                          │ │
│  │  ┌────────────────────────────────────────────────────────────────────────┐ │ │
│  │  │  • Redis Cluster mode for distributed caching                           │ │ │
│  │  │  • 3+ master nodes with replicas                                        │ │ │
│  │  │  • Key distribution via consistent hashing                              │ │ │
│  │  │  • Pub/Sub for cache invalidation across nodes                          │ │ │
│  │  └────────────────────────────────────────────────────────────────────────┘ │ │
│  │                                                                               │ │
│  │  Storage Tier (S3/MinIO):                                                     │ │
│  │  ┌────────────────────────────────────────────────────────────────────────┐ │ │
│  │  │  • MinIO distributed mode for production                                │ │ │
│  │  │  • Multiple nodes with erasure coding                                   │ │ │
│  │  │  • Or AWS S3 with Transfer Acceleration                                 │ │ │
│  │  │  • CDN for asset delivery (CloudFront, Cloudflare)                      │ │ │
│  │  └────────────────────────────────────────────────────────────────────────┘ │ │
│  │                                                                               │ │
│  └─────────────────────────────────────────────────────────────────────────────┘ │
│                                                                                   │
└──────────────────────────────────────────────────────────────────────────────────┘
```

---

## 8. Technology Stack Rationale

### 8.1 Backend Technology Choices

| Technology | Choice | Rationale |
|------------|--------|-----------|
| **Language** | Python 3.11+ | Rich AI/ML ecosystem, async support, rapid development |
| **Framework** | FastAPI | High performance async, automatic OpenAPI docs, Pydantic integration |
| **ASGI Server** | Uvicorn | Production-grade, uvloop for performance, multiple workers |
| **Database** | MongoDB | Flexible schema for varied asset types, horizontal scaling |
| **MongoDB Driver** | Motor | Native async support, connection pooling |
| **Cache** | Redis | Sub-millisecond latency, Pub/Sub, distributed support |
| **Object Storage** | S3-compatible | Cloud-agnostic, presigned URLs, multipart upload |
| **AI Framework** | LangChain | Multi-provider abstraction, tool calling, streaming |
| **Auth** | Auth0 + JWT | Enterprise-grade security, OAuth 2.0 standard |
| **Image Processing** | Pillow + imagehash | Industry-standard, perceptual hashing support |
| **Audio Processing** | librosa | Comprehensive spectral analysis capabilities |
| **Video Processing** | OpenCV | Frame extraction, extensive format support |

### 8.2 Frontend Technology Choices

| Technology | Choice | Rationale |
|------------|--------|-----------|
| **Framework** | React 18 | Component model, concurrent features, large ecosystem |
| **Language** | TypeScript | Type safety, better IDE support, reduced runtime errors |
| **Build Tool** | Vite | Fast HMR, ES modules, optimized production builds |
| **Styling** | TailwindCSS | Utility-first, consistent design system, small bundle |
| **Routing** | React Router v6 | Data loading, nested routes, declarative navigation |
| **State** | Context + Hooks | Built-in, avoids external dependencies, sufficient for scope |
| **HTTP Client** | Axios | Interceptors, request/response transforms, wide support |
| **Testing** | Vitest + RTL | Vite-native testing, React best practices |

### 8.3 Infrastructure Technology Choices

| Technology | Choice | Rationale |
|------------|--------|-----------|
| **Containerization** | Docker | Consistent environments, isolation, portability |
| **Orchestration** | Docker Compose | Development simplicity, production-ready |
| **Dev Storage** | MinIO | S3-compatible, local development, no cloud dependency |
| **Database** | MongoDB 8.0 | Latest features, improved performance |
| **Cache** | Redis 7.4 | Functions, improved replication, ACL support |
| **Reverse Proxy** | nginx (production) | SSL termination, static serving, load balancing |

### 8.4 Technology Decision Matrix

```
┌──────────────────────────────────────────────────────────────────────────────────┐
│                      TECHNOLOGY DECISION MATRIX                                   │
├──────────────────────────────────────────────────────────────────────────────────┤
│                                                                                   │
│  Factor          │ Weight │ FastAPI │ Django │ Flask │ Express                   │
│  ─────────────────────────────────────────────────────────────────────────────   │
│  Async Support   │  25%   │   ★★★★★ │  ★★★☆☆ │ ★★★☆☆ │  ★★★★☆                   │
│  AI/ML Ecosystem │  20%   │   ★★★★★ │  ★★★★★ │ ★★★★★ │  ★★★☆☆                   │
│  Performance     │  20%   │   ★★★★★ │  ★★★☆☆ │ ★★★★☆ │  ★★★★★                   │
│  Dev Experience  │  15%   │   ★★★★★ │  ★★★★☆ │ ★★★★☆ │  ★★★★☆                   │
│  Type Safety     │  10%   │   ★★★★★ │  ★★★☆☆ │ ★★☆☆☆ │  ★★★★☆                   │
│  Documentation   │  10%   │   ★★★★★ │  ★★★★★ │ ★★★★☆ │  ★★★★☆                   │
│  ─────────────────────────────────────────────────────────────────────────────   │
│  TOTAL           │ 100%   │   4.85  │  3.90  │  3.80 │   3.95                   │
│                                                                                   │
│  Winner: FastAPI ✓                                                               │
│                                                                                   │
│  ─────────────────────────────────────────────────────────────────────────────   │
│                                                                                   │
│  Factor          │ Weight │ MongoDB │ PostgreSQL │ MySQL │ DynamoDB              │
│  ─────────────────────────────────────────────────────────────────────────────   │
│  Schema Flex     │  25%   │   ★★★★★ │   ★★★☆☆   │ ★★★☆☆ │  ★★★★☆                │
│  Horizontal Scale│  20%   │   ★★★★★ │   ★★★☆☆   │ ★★★☆☆ │  ★★★★★                │
│  Document Model  │  20%   │   ★★★★★ │   ★★★★☆   │ ★★★☆☆ │  ★★★★★                │
│  Python Support  │  15%   │   ★★★★★ │   ★★★★★   │ ★★★★★ │  ★★★★☆                │
│  Cloud Agnostic  │  10%   │   ★★★★★ │   ★★★★★   │ ★★★★★ │  ★☆☆☆☆                │
│  Operational     │  10%   │   ★★★★☆ │   ★★★★★   │ ★★★★☆ │  ★★★★☆                │
│  ─────────────────────────────────────────────────────────────────────────────   │
│  TOTAL           │ 100%   │   4.75  │   3.85    │  3.45 │   4.00                │
│                                                                                   │
│  Winner: MongoDB ✓                                                               │
│                                                                                   │
│  ─────────────────────────────────────────────────────────────────────────────   │
│                                                                                   │
│  Factor          │ Weight │ React 18 │ Vue 3 │ Angular │ Svelte                  │
│  ─────────────────────────────────────────────────────────────────────────────   │
│  Ecosystem Size  │  20%   │   ★★★★★ │ ★★★★☆ │ ★★★★☆ │  ★★★☆☆                   │
│  TypeScript      │  20%   │   ★★★★★ │ ★★★★★ │ ★★★★★ │  ★★★★☆                   │
│  Performance     │  20%   │   ★★★★☆ │ ★★★★☆ │ ★★★★☆ │  ★★★★★                   │
│  Learning Curve  │  15%   │   ★★★★☆ │ ★★★★★ │ ★★★☆☆ │  ★★★★★                   │
│  Community       │  15%   │   ★★★★★ │ ★★★★☆ │ ★★★★☆ │  ★★★☆☆                   │
│  Hiring Pool     │  10%   │   ★★★★★ │ ★★★★☆ │ ★★★★★ │  ★★☆☆☆                   │
│  ─────────────────────────────────────────────────────────────────────────────   │
│  TOTAL           │ 100%   │   4.55  │  4.30 │  4.10 │   4.00                   │
│                                                                                   │
│  Winner: React 18 ✓                                                              │
│                                                                                   │
└──────────────────────────────────────────────────────────────────────────────────┘
```

---

## 9. Service Interaction Patterns

### 9.1 Frontend-Backend API Communication

```
┌──────────────────────────────────────────────────────────────────────────────────┐
│                   FRONTEND-BACKEND API COMMUNICATION                              │
├──────────────────────────────────────────────────────────────────────────────────┤
│                                                                                   │
│  ┌─────────────────────────────────────────────────────────────────────────────┐ │
│  │                      API CLIENT CONFIGURATION                                │ │
│  │                                                                               │ │
│  │  // services/api.ts                                                          │ │
│  │  const apiClient = axios.create({                                            │ │
│  │    baseURL: import.meta.env.VITE_API_URL,  // http://localhost:8000          │ │
│  │    timeout: 30000,                                                           │ │
│  │    headers: {                                                                │ │
│  │      'Content-Type': 'application/json',                                     │ │
│  │    },                                                                        │ │
│  │  });                                                                         │ │
│  │                                                                               │ │
│  │  // Auth interceptor                                                         │ │
│  │  apiClient.interceptors.request.use((config) => {                            │ │
│  │    const token = localStorage.getItem('access_token');                       │ │
│  │    if (token) {                                                              │ │
│  │      config.headers.Authorization = `Bearer ${token}`;                       │ │
│  │    }                                                                         │ │
│  │    return config;                                                            │ │
│  │  });                                                                         │ │
│  │                                                                               │ │
│  │  // Error interceptor                                                        │ │
│  │  apiClient.interceptors.response.use(                                        │ │
│  │    (response) => response,                                                   │ │
│  │    (error) => {                                                              │ │
│  │      if (error.response?.status === 401) {                                   │ │
│  │        // Redirect to login                                                  │ │
│  │        window.location.href = '/login';                                      │ │
│  │      }                                                                       │ │
│  │      return Promise.reject(error);                                           │ │
│  │    }                                                                         │ │
│  │  );                                                                          │ │
│  │                                                                               │ │
│  └─────────────────────────────────────────────────────────────────────────────┘ │
│                                                                                   │
│  ┌─────────────────────────────────────────────────────────────────────────────┐ │
│  │                     REQUEST/RESPONSE FLOW                                    │ │
│  │                                                                               │ │
│  │  Frontend                    Network                    Backend              │ │
│  │  ────────                    ───────                    ───────              │ │
│  │                                                                               │ │
│  │  ┌─────────┐                                                                 │ │
│  │  │ Service │  axios.get('/api/v1/assets')                                    │ │
│  │  │ Method  │ ───────────────────────────────▶                                │ │
│  │  └─────────┘                                                                 │ │
│  │       │                                                                      │ │
│  │       ▼                                                                      │ │
│  │  ┌─────────┐                                                                 │ │
│  │  │  Auth   │  + Authorization: Bearer <jwt>                                  │ │
│  │  │Intercept│ ───────────────────────────────▶                                │ │
│  │  └─────────┘                                        ┌─────────┐              │ │
│  │                                                     │  CORS   │              │ │
│  │                                                     │Middleware│             │ │
│  │                                                     └────┬────┘              │ │
│  │                                                          │                   │ │
│  │                                                     ┌────▼────┐              │ │
│  │                                                     │  Auth   │              │ │
│  │                                                     │  Check  │              │ │
│  │                                                     └────┬────┘              │ │
│  │                                                          │                   │ │
│  │                                                     ┌────▼────┐              │ │
│  │                                                     │ Router  │              │ │
│  │                                                     │Handler  │              │ │
│  │                                                     └────┬────┘              │ │
│  │                                                          │                   │ │
│  │                               ◀──────────────────────────┘                   │ │
│  │       ┌─────────┐            {data: [...], status: 200}                      │ │
│  │       │Response │                                                            │ │
│  │       │Handler  │                                                            │ │
│  │       └────┬────┘                                                            │ │
│  │            │                                                                 │ │
│  │            ▼                                                                 │ │
│  │       ┌─────────┐                                                            │ │
│  │       │Component│                                                            │ │
│  │       │ State   │                                                            │ │
│  │       └─────────┘                                                            │ │
│  │                                                                               │ │
│  └─────────────────────────────────────────────────────────────────────────────┘ │
│                                                                                   │
└──────────────────────────────────────────────────────────────────────────────────┘
```

### 9.2 Backend-Storage Presigned URL Flow

```
┌──────────────────────────────────────────────────────────────────────────────────┐
│                    BACKEND-STORAGE PRESIGNED URL FLOW                             │
├──────────────────────────────────────────────────────────────────────────────────┤
│                                                                                   │
│  ┌─────────────────────────────────────────────────────────────────────────────┐ │
│  │                     PRESIGNED URL GENERATION                                 │ │
│  │                                                                               │ │
│  │  // storage_service.py                                                       │ │
│  │                                                                               │ │
│  │  class StorageService:                                                       │ │
│  │      def __init__(self):                                                     │ │
│  │          self.s3_client = boto3.client(                                      │ │
│  │              's3',                                                           │ │
│  │              endpoint_url=settings.S3_ENDPOINT,  # MinIO or S3               │ │
│  │              aws_access_key_id=settings.S3_ACCESS_KEY,                       │ │
│  │              aws_secret_access_key=settings.S3_SECRET_KEY,                   │ │
│  │              region_name=settings.S3_REGION,                                 │ │
│  │              config=Config(signature_version='s3v4')                         │ │
│  │          )                                                                   │ │
│  │                                                                               │ │
│  │      def generate_presigned_upload_url(                                      │ │
│  │          self,                                                               │ │
│  │          s3_key: str,                                                        │ │
│  │          content_type: str,                                                  │ │
│  │          file_size: int,                                                     │ │
│  │          expires_in: int = 900                                               │ │
│  │      ) -> str:                                                               │ │
│  │          return self.s3_client.generate_presigned_url(                       │ │
│  │              'put_object',                                                   │ │
│  │              Params={                                                        │ │
│  │                  'Bucket': settings.S3_BUCKET,                               │ │
│  │                  'Key': s3_key,                                              │ │
│  │                  'ContentType': content_type,                                │ │
│  │                  'ContentLength': file_size,                                 │ │
│  │              },                                                              │ │
│  │              ExpiresIn=expires_in                                            │ │
│  │          )                                                                   │ │
│  │                                                                               │ │
│  └─────────────────────────────────────────────────────────────────────────────┘ │
│                                                                                   │
│  ┌─────────────────────────────────────────────────────────────────────────────┐ │
│  │                     INTERACTION SEQUENCE                                     │ │
│  │                                                                               │ │
│  │  Frontend          Backend           S3/MinIO                                │ │
│  │  ────────          ───────           ────────                                │ │
│  │      │                 │                 │                                   │ │
│  │      │ GET /presigned  │                 │                                   │ │
│  │      │ ?filename=x.mp4 │                 │                                   │ │
│  │      │ &size=50000000  │                 │                                   │ │
│  │      │─────────────────▶                 │                                   │ │
│  │      │                 │                 │                                   │ │
│  │      │                 │  generate_presigned_url()                           │ │
│  │      │                 │  (no S3 call, local signing)                        │ │
│  │      │                 │                 │                                   │ │
│  │      │◀─────────────────                 │                                   │ │
│  │      │ {upload_url,    │                 │                                   │ │
│  │      │  s3_key}        │                 │                                   │ │
│  │      │                 │                 │                                   │ │
│  │      │                 │                 │                                   │ │
│  │      │  PUT upload_url │                 │                                   │ │
│  │      │  + file content │                 │                                   │ │
│  │      │─────────────────────────────────▶│                                   │ │
│  │      │                 │                 │ Verify signature                  │ │
│  │      │                 │                 │ Verify content-type               │ │
│  │      │                 │                 │ Store file                        │ │
│  │      │◀─────────────────────────────────│                                   │ │
│  │      │ 200 OK          │                 │                                   │ │
│  │      │                 │                 │                                   │ │
│  │      │ POST /confirmation               │                                   │ │
│  │      │ {s3_key, size}  │                 │                                   │ │
│  │      │─────────────────▶                 │                                   │ │
│  │      │                 │  HEAD object    │                                   │ │
│  │      │                 │─────────────────▶                                   │ │
│  │      │                 │◀─────────────────                                   │ │
│  │      │                 │  (verify exists)                                    │ │
│  │      │                 │                 │                                   │ │
│  │      │                 │  MongoDB: Create asset record                       │ │
│  │      │                 │                 │                                   │ │
│  │      │◀─────────────────                 │                                   │ │
│  │      │ {asset_id}      │                 │                                   │ │
│  │      │                 │                 │                                   │ │
│  │                                                                               │ │
│  └─────────────────────────────────────────────────────────────────────────────┘ │
│                                                                                   │
└──────────────────────────────────────────────────────────────────────────────────┘
```

### 9.3 Backend-Database Async Operations

```
┌──────────────────────────────────────────────────────────────────────────────────┐
│                    BACKEND-DATABASE ASYNC OPERATIONS                              │
├──────────────────────────────────────────────────────────────────────────────────┤
│                                                                                   │
│  ┌─────────────────────────────────────────────────────────────────────────────┐ │
│  │                    MOTOR ASYNC CLIENT SETUP                                  │ │
│  │                                                                               │ │
│  │  // core/database.py                                                         │ │
│  │                                                                               │ │
│  │  from motor.motor_asyncio import AsyncIOMotorClient                          │ │
│  │                                                                               │ │
│  │  class Database:                                                             │ │
│  │      client: AsyncIOMotorClient = None                                       │ │
│  │      db = None                                                               │ │
│  │                                                                               │ │
│  │      @classmethod                                                            │ │
│  │      async def connect(cls):                                                 │ │
│  │          cls.client = AsyncIOMotorClient(                                    │ │
│  │              settings.MONGODB_URI,                                           │ │
│  │              minPoolSize=10,                                                 │ │
│  │              maxPoolSize=100,                                                │ │
│  │              serverSelectionTimeoutMS=5000,                                  │ │
│  │          )                                                                   │ │
│  │          cls.db = cls.client[settings.MONGODB_DATABASE]                      │ │
│  │                                                                               │ │
│  │          # Verify connection                                                 │ │
│  │          await cls.client.admin.command('ping')                              │ │
│  │                                                                               │ │
│  │      @classmethod                                                            │ │
│  │      async def disconnect(cls):                                              │ │
│  │          if cls.client:                                                      │ │
│  │              cls.client.close()                                              │ │
│  │                                                                               │ │
│  │      @classmethod                                                            │ │
│  │      def get_collection(cls, name: str):                                     │ │
│  │          return cls.db[name]                                                 │ │
│  │                                                                               │ │
│  └─────────────────────────────────────────────────────────────────────────────┘ │
│                                                                                   │
│  ┌─────────────────────────────────────────────────────────────────────────────┐ │
│  │                    ASYNC QUERY PATTERNS                                      │ │
│  │                                                                               │ │
│  │  // services/asset_service.py                                                │ │
│  │                                                                               │ │
│  │  class AssetService:                                                         │ │
│  │      def __init__(self):                                                     │ │
│  │          self.collection = Database.get_collection('assets')                 │ │
│  │                                                                               │ │
│  │      async def create(self, asset_data: AssetCreate) -> Asset:               │ │
│  │          """Non-blocking insert operation"""                                 │ │
│  │          result = await self.collection.insert_one(                          │ │
│  │              asset_data.dict()                                               │ │
│  │          )                                                                   │ │
│  │          return await self.get_by_id(result.inserted_id)                     │ │
│  │                                                                               │ │
│  │      async def get_by_id(self, asset_id: str) -> Asset | None:               │ │
│  │          """Non-blocking find operation with caching"""                      │ │
│  │          # Check cache first                                                 │ │
│  │          cached = await redis.get(f"asset:{asset_id}")                       │ │
│  │          if cached:                                                          │ │
│  │              return Asset.parse_raw(cached)                                  │ │
│  │                                                                               │ │
│  │          # Query database                                                    │ │
│  │          doc = await self.collection.find_one(                               │ │
│  │              {"_id": ObjectId(asset_id)}                                     │ │
│  │          )                                                                   │ │
│  │                                                                               │ │
│  │          if doc:                                                             │ │
│  │              asset = Asset(**doc)                                            │ │
│  │              # Cache for 5 minutes                                           │ │
│  │              await redis.setex(                                              │ │
│  │                  f"asset:{asset_id}",                                        │ │
│  │                  300,                                                        │ │
│  │                  asset.json()                                                │ │
│  │              )                                                               │ │
│  │              return asset                                                    │ │
│  │          return None                                                         │ │
│  │                                                                               │ │
│  │      async def list_by_user(                                                 │ │
│  │          self,                                                               │ │
│  │          user_id: str,                                                       │ │
│  │          skip: int = 0,                                                      │ │
│  │          limit: int = 20                                                     │ │
│  │      ) -> List[Asset]:                                                       │ │
│  │          """Paginated async cursor iteration"""                              │ │
│  │          cursor = self.collection.find(                                      │ │
│  │              {"user_id": ObjectId(user_id)},                                 │ │
│  │              {"embeddings": 0}  # Exclude large fields                       │ │
│  │          ).sort("created_at", -1).skip(skip).limit(limit)                    │ │
│  │                                                                               │ │
│  │          return [Asset(**doc) async for doc in cursor]                       │ │
│  │                                                                               │ │
│  └─────────────────────────────────────────────────────────────────────────────┘ │
│                                                                                   │
│  ┌─────────────────────────────────────────────────────────────────────────────┐ │
│  │                    REQUEST LIFECYCLE                                         │ │
│  │                                                                               │ │
│  │   Request              Event Loop          Motor              MongoDB        │ │
│  │   Handler                                  (async)                           │ │
│  │      │                     │                  │                   │          │ │
│  │      │  await get_asset()  │                  │                   │          │ │
│  │      │─────────────────────▶                  │                   │          │ │
│  │      │                     │  find_one()      │                   │          │ │
│  │      │                     │─────────────────▶│                   │          │ │
│  │      │                     │                  │  query            │          │ │
│  │      │  (handler yields)   │                  │─────────────────▶│          │ │
│  │      │◀ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─│                  │                   │          │ │
│  │      │                     │                  │                   │          │ │
│  │      │  (other requests    │                  │                   │          │ │
│  │      │   processed)        │                  │                   │          │ │
│  │      │                     │                  │                   │          │ │
│  │      │                     │                  │  result           │          │ │
│  │      │                     │                  │◀─────────────────│          │ │
│  │      │                     │◀─────────────────│                   │          │ │
│  │      │◀─────────────────────                  │                   │          │ │
│  │      │  (handler resumes)  │                  │                   │          │ │
│  │      │  with Asset         │                  │                   │          │ │
│  │      │                     │                  │                   │          │ │
│  │                                                                               │ │
│  └─────────────────────────────────────────────────────────────────────────────┘ │
│                                                                                   │
└──────────────────────────────────────────────────────────────────────────────────┘
```

### 9.4 Backend-AI Provider Tool Calling

```
┌──────────────────────────────────────────────────────────────────────────────────┐
│                    BACKEND-AI PROVIDER TOOL CALLING                               │
├──────────────────────────────────────────────────────────────────────────────────┤
│                                                                                   │
│  ┌─────────────────────────────────────────────────────────────────────────────┐ │
│  │                    LANGCHAIN TOOL SETUP                                      │ │
│  │                                                                               │ │
│  │  // services/ai_assistant_service.py                                         │ │
│  │                                                                               │ │
│  │  from langchain.chat_models import init_chat_model                           │ │
│  │  from langchain_core.tools import tool                                       │ │
│  │                                                                               │ │
│  │  @tool                                                                       │ │
│  │  async def lookup_fingerprint(asset_id: str) -> dict:                        │ │
│  │      """Look up fingerprint data for an asset.                               │ │
│  │                                                                               │ │
│  │      Args:                                                                   │ │
│  │          asset_id: The unique identifier of the asset                        │ │
│  │                                                                               │ │
│  │      Returns:                                                                │ │
│  │          Fingerprint data including hashes and metadata                      │ │
│  │      """                                                                     │ │
│  │      fingerprint = await fingerprint_service.get_by_asset_id(asset_id)       │ │
│  │      return fingerprint.dict() if fingerprint else {"error": "Not found"}    │ │
│  │                                                                               │ │
│  │  @tool                                                                       │ │
│  │  async def get_asset_analytics(user_id: str) -> dict:                        │ │
│  │      """Get analytics summary for a user's assets.                           │ │
│  │                                                                               │ │
│  │      Args:                                                                   │ │
│  │          user_id: The user's unique identifier                               │ │
│  │                                                                               │ │
│  │      Returns:                                                                │ │
│  │          Summary including total assets and estimated value                  │ │
│  │      """                                                                     │ │
│  │      assets = await asset_service.list_by_user(user_id)                      │ │
│  │      analytics = await analytics_service.get_latest(user_id)                 │ │
│  │      return {                                                                │ │
│  │          "total_assets": len(assets),                                        │ │
│  │          "total_value": analytics.ai_touch_value if analytics else 0         │ │
│  │      }                                                                       │ │
│  │                                                                               │ │
│  │  @tool                                                                       │ │
│  │  async def get_wallet_balance(user_id: str) -> dict:                         │ │
│  │      """Get wallet balance for a user.                                       │ │
│  │                                                                               │ │
│  │      Args:                                                                   │ │
│  │          user_id: The user's unique identifier                               │ │
│  │                                                                               │ │
│  │      Returns:                                                                │ │
│  │          Wallet balance information                                          │ │
│  │      """                                                                     │ │
│  │      wallet = await wallet_service.get_by_user_id(user_id)                   │ │
│  │      return wallet.balance.dict() if wallet else {"error": "Not found"}      │ │
│  │                                                                               │ │
│  └─────────────────────────────────────────────────────────────────────────────┘ │
│                                                                                   │
│  ┌─────────────────────────────────────────────────────────────────────────────┐ │
│  │                    MODEL INITIALIZATION                                      │ │
│  │                                                                               │ │
│  │  class AIAssistantService:                                                   │ │
│  │      def __init__(self):                                                     │ │
│  │          # Initialize based on available API keys                            │ │
│  │          provider = self._select_provider()                                  │ │
│  │          self.model = init_chat_model(provider)                              │ │
│  │                                                                               │ │
│  │          # Bind tools to model                                               │ │
│  │          self.tools = [                                                      │ │
│  │              lookup_fingerprint,                                             │ │
│  │              get_asset_analytics,                                            │ │
│  │              get_wallet_balance,                                             │ │
│  │          ]                                                                   │ │
│  │          self.model_with_tools = self.model.bind_tools(self.tools)           │ │
│  │                                                                               │ │
│  │      def _select_provider(self) -> str:                                      │ │
│  │          """Select provider based on available API keys"""                   │ │
│  │          if settings.OPENAI_API_KEY:                                         │ │
│  │              return "openai:gpt-4"                                           │ │
│  │          elif settings.ANTHROPIC_API_KEY:                                    │ │
│  │              return "anthropic:claude-3-5-sonnet-20241022"                   │ │
│  │          elif settings.GOOGLE_API_KEY:                                       │ │
│  │              return "google_vertexai:gemini-2.0-flash"                       │ │
│  │          else:                                                               │ │
│  │              raise ValueError("No AI provider API key configured")           │ │
│  │                                                                               │ │
│  └─────────────────────────────────────────────────────────────────────────────┘ │
│                                                                                   │
│  ┌─────────────────────────────────────────────────────────────────────────────┐ │
│  │                    TOOL CALLING FLOW                                         │ │
│  │                                                                               │ │
│  │  async def process_message(                                                  │ │
│  │      self,                                                                   │ │
│  │      message: str,                                                           │ │
│  │      user_id: str,                                                           │ │
│  │      conversation_id: str                                                    │ │
│  │  ) -> AsyncGenerator[str, None]:                                             │ │
│  │      """Process message with tool calling support"""                         │ │
│  │                                                                               │ │
│  │      # Load conversation context                                             │ │
│  │      messages = await self._load_context(conversation_id)                    │ │
│  │      messages.append(HumanMessage(content=message))                          │ │
│  │                                                                               │ │
│  │      # First LLM call - may include tool calls                               │ │
│  │      response = await self.model_with_tools.ainvoke(messages)                │ │
│  │                                                                               │ │
│  │      # Check for tool calls                                                  │ │
│  │      if response.tool_calls:                                                 │ │
│  │          # Execute tools                                                     │ │
│  │          for tool_call in response.tool_calls:                               │ │
│  │              yield json.dumps({                                              │ │
│  │                  "type": "tool_call",                                        │ │
│  │                  "name": tool_call["name"]                                   │ │
│  │              })                                                              │ │
│  │                                                                               │ │
│  │              # Execute the tool                                              │ │
│  │              tool_func = self._get_tool(tool_call["name"])                   │ │
│  │              result = await tool_func.ainvoke(tool_call["args"])             │ │
│  │                                                                               │ │
│  │              yield json.dumps({                                              │ │
│  │                  "type": "tool_result",                                      │ │
│  │                  "data": result                                              │ │
│  │              })                                                              │ │
│  │                                                                               │ │
│  │              # Add tool result to messages                                   │ │
│  │              messages.append(ToolMessage(                                    │ │
│  │                  content=json.dumps(result),                                 │ │
│  │                  tool_call_id=tool_call["id"]                                │ │
│  │              ))                                                              │ │
│  │                                                                               │ │
│  │          # Second LLM call with tool results                                 │ │
│  │          async for chunk in self.model.astream(messages):                    │ │
│  │              if chunk.content:                                               │ │
│  │                  yield json.dumps({                                          │ │
│  │                      "type": "token",                                        │ │
│  │                      "content": chunk.content                                │ │
│  │                  })                                                          │ │
│  │      else:                                                                   │ │
│  │          # No tool calls, stream response directly                           │ │
│  │          async for chunk in self.model.astream(messages):                    │ │
│  │              if chunk.content:                                               │ │
│  │                  yield json.dumps({                                          │ │
│  │                      "type": "token",                                        │ │
│  │                      "content": chunk.content                                │ │
│  │                  })                                                          │ │
│  │                                                                               │ │
│  │      yield json.dumps({"type": "done"})                                      │ │
│  │                                                                               │ │
│  │      # Save updated context                                                  │ │
│  │      await self._save_context(conversation_id, messages)                     │ │
│  │                                                                               │ │
│  └─────────────────────────────────────────────────────────────────────────────┘ │
│                                                                                   │
└──────────────────────────────────────────────────────────────────────────────────┘
```

---

## 10. Phase 2 Architectural Considerations

### 10.1 Future Enhancement Placeholders

The current architecture includes strategic placeholder points for Phase 2 capabilities:

```
┌──────────────────────────────────────────────────────────────────────────────────┐
│                    PHASE 2 ENHANCEMENT POINTS                                     │
├──────────────────────────────────────────────────────────────────────────────────┤
│                                                                                   │
│  ┌─────────────────────────────────────────────────────────────────────────────┐ │
│  │                    AI TRAINING DETECTION ENGINE                              │ │
│  │                                                                               │ │
│  │  Location: fingerprinting_service.py                                         │ │
│  │                                                                               │ │
│  │  # TODO Phase 2: Implement AI training detection engine                      │ │
│  │  async def detect_ai_training(fingerprint_id: str) -> TrainingDetectionResult:│ │
│  │      """                                                                     │ │
│  │      Analyze fingerprint against known AI training datasets.                 │ │
│  │                                                                               │ │
│  │      Phase 2 Implementation:                                                 │ │
│  │      1. Load fingerprint embeddings                                          │ │
│  │      2. Query vector similarity against dataset embeddings                   │ │
│  │      3. Apply similarity-law thresholds                                      │ │
│  │      4. Generate confidence scores                                           │ │
│  │      5. Store detection results                                              │ │
│  │      """                                                                     │ │
│  │      raise NotImplementedError("Phase 2 feature")                            │ │
│  │                                                                               │ │
│  └─────────────────────────────────────────────────────────────────────────────┘ │
│                                                                                   │
│  ┌─────────────────────────────────────────────────────────────────────────────┐ │
│  │                    DATASET COMPARISON ENGINE                                 │ │
│  │                                                                               │ │
│  │  Location: fingerprinting_service.py                                         │ │
│  │                                                                               │ │
│  │  # TODO Phase 2: Compare embeddings against known datasets                   │ │
│  │  async def compare_against_datasets(                                         │ │
│  │      embedding: List[float],                                                 │ │
│  │      threshold: float = 0.85                                                 │ │
│  │  ) -> List[DatasetMatch]:                                                    │ │
│  │      """                                                                     │ │
│  │      Compare embedding vector against known AI training dataset signatures.  │ │
│  │                                                                               │ │
│  │      Phase 2 Implementation:                                                 │ │
│  │      1. Connect to dataset signature database                                │ │
│  │      2. Perform ANN (Approximate Nearest Neighbor) search                    │ │
│  │      3. Filter by similarity threshold                                       │ │
│  │      4. Return matched dataset identifiers                                   │ │
│  │      """                                                                     │ │
│  │      raise NotImplementedError("Phase 2 feature")                            │ │
│  │                                                                               │ │
│  └─────────────────────────────────────────────────────────────────────────────┘ │
│                                                                                   │
│  ┌─────────────────────────────────────────────────────────────────────────────┐ │
│  │                    EMBEDDING DRIFT ANALYSIS                                  │ │
│  │                                                                               │ │
│  │  Location: fingerprinting_service.py                                         │ │
│  │                                                                               │ │
│  │  # TODO Phase 2: Calculate embedding drift scores                            │ │
│  │  async def calculate_embedding_drift(                                        │ │
│  │      original_embedding: List[float],                                        │ │
│  │      model_output_embedding: List[float]                                     │ │
│  │  ) -> DriftAnalysis:                                                         │ │
│  │      """                                                                     │ │
│  │      Measure embedding drift between original content and AI model outputs.  │ │
│  │                                                                               │ │
│  │      Phase 2 Implementation:                                                 │ │
│  │      1. Calculate cosine similarity                                          │ │
│  │      2. Measure euclidean distance                                           │ │
│  │      3. Analyze dimensional drift patterns                                   │ │
│  │      4. Generate drift score and explanation                                 │ │
│  │      """                                                                     │ │
│  │      raise NotImplementedError("Phase 2 feature")                            │ │
│  │                                                                               │ │
│  └─────────────────────────────────────────────────────────────────────────────┘ │
│                                                                                   │
│  ┌─────────────────────────────────────────────────────────────────────────────┐ │
│  │                    SIMILARITY-LAW THRESHOLDS                                 │ │
│  │                                                                               │ │
│  │  Location: fingerprinting_service.py                                         │ │
│  │                                                                               │ │
│  │  # TODO Phase 2: Apply similarity-law thresholds for legal determination     │ │
│  │  async def apply_legal_thresholds(                                           │ │
│  │      similarity_score: float,                                                │ │
│  │      jurisdiction: str = "US"                                                │ │
│  │  ) -> LegalDetermination:                                                    │ │
│  │      """                                                                     │ │
│  │      Apply jurisdiction-specific similarity thresholds for legal analysis.   │ │
│  │                                                                               │ │
│  │      Phase 2 Implementation:                                                 │ │
│  │      1. Load jurisdiction-specific threshold rules                           │ │
│  │      2. Apply threshold to similarity score                                  │ │
│  │      3. Generate legal determination with confidence                         │ │
│  │      4. Include relevant case law references                                 │ │
│  │      """                                                                     │ │
│  │      raise NotImplementedError("Phase 2 feature")                            │ │
│  │                                                                               │ │
│  └─────────────────────────────────────────────────────────────────────────────┘ │
│                                                                                   │
│  ┌─────────────────────────────────────────────────────────────────────────────┐ │
│  │                    LEGAL EXPORT MODULE                                       │ │
│  │                                                                               │ │
│  │  Location: services/legal_export_service.py (new file)                       │ │
│  │                                                                               │ │
│  │  # TODO Phase 2: Generate legal-export documentation                         │ │
│  │  async def generate_legal_export(                                            │ │
│  │      asset_id: str,                                                          │ │
│  │      detection_results: TrainingDetectionResult                              │ │
│  │  ) -> LegalExportPackage:                                                    │ │
│  │      """                                                                     │ │
│  │      Generate court-ready documentation package for legal proceedings.       │ │
│  │                                                                               │ │
│  │      Phase 2 Implementation:                                                 │ │
│  │      1. Compile asset metadata and fingerprints                              │ │
│  │      2. Include detection analysis results                                   │ │
│  │      3. Generate chain-of-custody documentation                              │ │
│  │      4. Create PDF report with cryptographic signatures                      │ │
│  │      5. Package supporting evidence files                                    │ │
│  │      """                                                                     │ │
│  │      raise NotImplementedError("Phase 2 feature")                            │ │
│  │                                                                               │ │
│  └─────────────────────────────────────────────────────────────────────────────┘ │
│                                                                                   │
└──────────────────────────────────────────────────────────────────────────────────┘
```

### 10.2 Database Schema Extensions for Phase 2

The current database schemas include reserved fields for Phase 2 functionality:

```python
# In assets collection
"training_detected": bool | null,      # Phase 2: AI training detection flag
"dataset_matches": array | null,       # Phase 2: Matched dataset identifiers
"legal_status": string | null,         # Phase 2: Legal determination status

# In fingerprints collection
"similarity_matches": [{               # Phase 2: Matched fingerprints
    "fingerprint_id": ObjectId,
    "similarity_score": float,
    "match_type": string
}],
"training_analysis": {                 # Phase 2: AI training detection
    "datasets_checked": [string],
    "potential_matches": int,
    "confidence": float
}
```

### 10.3 Future API Endpoints

Reserved endpoint paths for Phase 2:

- `POST /api/v1/detection/analyze` - Trigger AI training detection analysis
- `GET /api/v1/detection/{asset_id}` - Get detection results
- `POST /api/v1/legal/export` - Generate legal documentation package
- `GET /api/v1/legal/report/{asset_id}` - Download legal report

---

## Document Information

| Property | Value |
|----------|-------|
| **Document Version** | 1.0.0 |
| **Last Updated** | 2025 |
| **Platform** | META-STAMP V3 |
| **Author** | System Architecture Team |
| **Status** | Production Ready |

---

*This document provides a comprehensive overview of the META-STAMP V3 system architecture. For implementation details, refer to the source code and API documentation.*
