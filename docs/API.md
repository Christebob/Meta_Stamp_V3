# META-STAMP V3 API Documentation

Complete REST API documentation for the META-STAMP V3 creator protection platform.

## Table of Contents

- [Overview](#overview)
- [Base URL](#base-url)
- [API Versioning](#api-versioning)
- [Authentication](#authentication)
- [Error Handling](#error-handling)
- [File Upload Validation](#file-upload-validation)
- [Rate Limiting](#rate-limiting)
- [Endpoints](#endpoints)
  - [Authentication](#authentication-endpoints)
  - [Upload](#upload-endpoints)
  - [Fingerprinting](#fingerprinting-endpoints)
  - [Analytics](#analytics-endpoints)
  - [Assets](#assets-endpoints)
  - [Wallet](#wallet-endpoints)
  - [AI Assistant](#ai-assistant-endpoints)

---

## Overview

The META-STAMP V3 API provides programmatic access to the creator protection platform, enabling asset fingerprinting, AI training detection (Phase 2), and residual value calculation through the AI Touch Value™ engine.

**Key Features:**
- Multi-modal asset fingerprinting (text, images, audio, video)
- Hybrid upload architecture (direct upload for <10MB, S3 presigned URLs for >10MB)
- AI Touch Value™ compensation calculations
- Multi-provider AI assistant (OpenAI, Anthropic, Google)
- Secure JWT-based authentication

---

## Base URL

All API endpoints are accessible at:

```
Development: http://localhost:8000/api/v1
Production:  https://api.meta-stamp.com/api/v1
```

---

## API Versioning

The API uses URL-based versioning to ensure backward compatibility:

| Version | Status | Base Path |
|---------|--------|-----------|
| v1 | Current | `/api/v1` |
| v2 | Planned | `/api/v2` |

**Versioning Strategy:**
- Major versions are indicated in the URL path
- Minor updates within a version maintain backward compatibility
- Breaking changes result in a new major version
- Deprecated endpoints return `X-Deprecated: true` header with migration guidance

---

## Authentication

The API uses JWT (JSON Web Token) Bearer authentication. Tokens can be obtained through:

1. **Auth0 Integration** (Production) - OAuth 2.0 flow with Auth0 provider
2. **Local JWT Fallback** (Development) - HS256 tokens with 24-hour expiration

### Authentication Header

Include the JWT token in the `Authorization` header for all protected endpoints:

```http
Authorization: Bearer <your_jwt_token>
```

### Token Structure

```json
{
  "sub": "user_id",
  "email": "user@example.com",
  "exp": 1700000000,
  "iat": 1699913600,
  "iss": "meta-stamp-v3"
}
```

### Endpoint Protection Levels

| Level | Description |
|-------|-------------|
| **Public** | No authentication required |
| **Protected** | Valid JWT token required |

---

## Error Handling

All API errors follow a consistent response format:

### Error Response Structure

```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error message",
    "details": {
      "field": "Additional context or validation errors"
    }
  }
}
```

### HTTP Status Codes

| Code | Name | Description |
|------|------|-------------|
| `200` | OK | Request successful |
| `201` | Created | Resource created successfully |
| `400` | Bad Request | Invalid request parameters or body |
| `401` | Unauthorized | Missing or invalid authentication token |
| `403` | Forbidden | Insufficient permissions for the requested resource |
| `404` | Not Found | Requested resource does not exist |
| `413` | Payload Too Large | File exceeds maximum size limit (500MB) |
| `415` | Unsupported Media Type | File type not supported or rejected |
| `422` | Unprocessable Entity | Request body validation failed |
| `429` | Too Many Requests | Rate limit exceeded (future implementation) |
| `500` | Internal Server Error | Unexpected server error |

### Error Code Reference

| Error Code | HTTP Status | Description |
|------------|-------------|-------------|
| `INVALID_TOKEN` | 401 | JWT token is invalid or expired |
| `MISSING_TOKEN` | 401 | Authorization header not provided |
| `FORBIDDEN` | 403 | User lacks permission for this action |
| `NOT_FOUND` | 404 | Resource not found |
| `FILE_TOO_LARGE` | 413 | File exceeds 500MB limit |
| `INVALID_FILE_TYPE` | 415 | File type not allowed |
| `DANGEROUS_FILE_TYPE` | 415 | Rejected file type (ZIP, executable) |
| `VALIDATION_ERROR` | 422 | Request validation failed |
| `UPLOAD_FAILED` | 500 | File upload processing failed |
| `FINGERPRINT_FAILED` | 500 | Fingerprint generation failed |
| `INTERNAL_ERROR` | 500 | Unexpected server error |

---

## File Upload Validation

### Maximum File Size

**Hard Limit: 500 MB**

Files exceeding this limit will be rejected with a `413 Payload Too Large` error.

### Supported File Types

| Category | Extensions | MIME Types |
|----------|------------|------------|
| **Text** | `.txt`, `.md`, `.pdf` | `text/plain`, `text/markdown`, `application/pdf` |
| **Images** | `.png`, `.jpg`, `.jpeg`, `.webp` | `image/png`, `image/jpeg`, `image/webp` |
| **Audio** | `.mp3`, `.wav`, `.aac` | `audio/mpeg`, `audio/wav`, `audio/aac` |
| **Video** | `.mp4`, `.mov`, `.avi` | `video/mp4`, `video/quicktime`, `video/x-msvideo` |

### Rejected File Types (Non-Negotiable)

The following file types are **completely rejected** for security reasons:

| Category | Extensions |
|----------|------------|
| **Archives** | `.zip`, `.rar`, `.7z`, `.tar`, `.gz`, `.bz2` |
| **Executables** | `.exe`, `.bin`, `.sh`, `.app`, `.msi`, `.bat`, `.cmd` |
| **Disk Images** | `.iso`, `.dmg`, `.img` |
| **Scripts** | `.js`, `.py`, `.rb`, `.php` (as uploads, not URLs) |

### URL Validation

Supported URL sources for content import:

| Platform | URL Pattern |
|----------|-------------|
| **YouTube** | `youtube.com/watch?v=*`, `youtu.be/*` |
| **Vimeo** | `vimeo.com/*` |
| **General Web** | Any valid HTTPS URL |

URLs pointing to dangerous file types (executables, archives) are rejected.

---

## Rate Limiting

> **Note:** Rate limiting is not implemented in the MVP release. Future versions will include:
> - Per-user request limits
> - Endpoint-specific throttling
> - Response headers: `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`

---

## Endpoints

---

## Authentication Endpoints

### POST /api/v1/auth/login

Authenticate user and obtain JWT token.

**Authentication:** Public

**Request Headers:**
```http
Content-Type: application/json
```

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "secure_password_123"
}
```

**Response (200 OK):**
```json
{
  "data": {
    "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "token_type": "bearer",
    "expires_in": 86400,
    "user": {
      "id": "user_123abc",
      "email": "user@example.com",
      "created_at": "2024-01-15T10:30:00Z"
    }
  }
}
```

**Response (401 Unauthorized):**
```json
{
  "error": {
    "code": "INVALID_CREDENTIALS",
    "message": "Invalid email or password",
    "details": null
  }
}
```

**curl Example:**
```bash
curl -X POST http://localhost:8000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "secure_password_123"
  }'
```

---

### POST /api/v1/auth/logout

Invalidate current user session.

**Authentication:** Protected

**Request Headers:**
```http
Authorization: Bearer <your_jwt_token>
```

**Request Body:** None

**Response (200 OK):**
```json
{
  "data": {
    "message": "Successfully logged out"
  }
}
```

**Response (401 Unauthorized):**
```json
{
  "error": {
    "code": "INVALID_TOKEN",
    "message": "Token is invalid or expired",
    "details": null
  }
}
```

**curl Example:**
```bash
curl -X POST http://localhost:8000/api/v1/auth/logout \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

---

### GET /api/v1/auth/me

Get current authenticated user profile.

**Authentication:** Protected

**Request Headers:**
```http
Authorization: Bearer <your_jwt_token>
```

**Response (200 OK):**
```json
{
  "data": {
    "id": "user_123abc",
    "email": "user@example.com",
    "auth0_id": "auth0|123456789",
    "created_at": "2024-01-15T10:30:00Z",
    "last_login": "2024-11-26T08:00:00Z"
  }
}
```

**Response (401 Unauthorized):**
```json
{
  "error": {
    "code": "MISSING_TOKEN",
    "message": "Authorization header is required",
    "details": null
  }
}
```

**curl Example:**
```bash
curl -X GET http://localhost:8000/api/v1/auth/me \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

---

## Upload Endpoints

### Upload Architecture Overview

META-STAMP V3 uses a hybrid upload architecture:

| File Size | Method | Flow |
|-----------|--------|------|
| **< 10 MB** | Direct Upload | Client → Backend → S3 |
| **≥ 10 MB** | Presigned URL | Client → Backend (get URL) → S3 (direct) → Backend (confirm) |

---

### POST /api/v1/upload/text

Upload text content directly (files < 10MB).

**Authentication:** Protected

**Request Headers:**
```http
Authorization: Bearer <your_jwt_token>
Content-Type: multipart/form-data
```

**Request Body (multipart/form-data):**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `file` | File | Yes | Text file (.txt, .md, .pdf) |
| `title` | String | No | Asset title |
| `description` | String | No | Asset description |

**Response (201 Created):**
```json
{
  "data": {
    "asset_id": "asset_abc123def456",
    "file_name": "my_document.txt",
    "file_type": "text",
    "file_size": 15420,
    "s3_key": "assets/user_123/asset_abc123def456/my_document.txt",
    "upload_status": "completed",
    "created_at": "2024-11-26T10:30:00Z",
    "fingerprint_status": "pending"
  }
}
```

**Response (413 Payload Too Large):**
```json
{
  "error": {
    "code": "FILE_TOO_LARGE",
    "message": "File size exceeds maximum limit of 500MB",
    "details": {
      "max_size_bytes": 524288000,
      "received_size_bytes": 600000000
    }
  }
}
```

**Response (415 Unsupported Media Type):**
```json
{
  "error": {
    "code": "INVALID_FILE_TYPE",
    "message": "File type not supported",
    "details": {
      "received_type": ".docx",
      "supported_types": [".txt", ".md", ".pdf"]
    }
  }
}
```

**curl Example:**
```bash
curl -X POST http://localhost:8000/api/v1/upload/text \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -F "file=@/path/to/document.txt" \
  -F "title=My Document" \
  -F "description=Important text content"
```

---

### POST /api/v1/upload/image

Upload image content directly (files < 10MB).

**Authentication:** Protected

**Request Headers:**
```http
Authorization: Bearer <your_jwt_token>
Content-Type: multipart/form-data
```

**Request Body (multipart/form-data):**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `file` | File | Yes | Image file (.png, .jpg, .jpeg, .webp) |
| `title` | String | No | Asset title |
| `description` | String | No | Asset description |

**Response (201 Created):**
```json
{
  "data": {
    "asset_id": "asset_img789xyz",
    "file_name": "artwork.png",
    "file_type": "image",
    "file_size": 2458000,
    "s3_key": "assets/user_123/asset_img789xyz/artwork.png",
    "upload_status": "completed",
    "created_at": "2024-11-26T10:35:00Z",
    "fingerprint_status": "pending",
    "metadata": {
      "width": 1920,
      "height": 1080,
      "format": "PNG",
      "color_mode": "RGBA"
    }
  }
}
```

**Response (415 Unsupported Media Type):**
```json
{
  "error": {
    "code": "DANGEROUS_FILE_TYPE",
    "message": "File type is not allowed for security reasons",
    "details": {
      "received_extension": ".exe",
      "reason": "Executable files are prohibited"
    }
  }
}
```

**curl Example:**
```bash
curl -X POST http://localhost:8000/api/v1/upload/image \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -F "file=@/path/to/artwork.png" \
  -F "title=My Artwork" \
  -F "description=Digital illustration"
```

---

### POST /api/v1/upload/audio

Upload audio content directly (files < 10MB).

**Authentication:** Protected

**Request Headers:**
```http
Authorization: Bearer <your_jwt_token>
Content-Type: multipart/form-data
```

**Request Body (multipart/form-data):**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `file` | File | Yes | Audio file (.mp3, .wav, .aac) |
| `title` | String | No | Asset title |
| `description` | String | No | Asset description |

**Response (201 Created):**
```json
{
  "data": {
    "asset_id": "asset_aud456klm",
    "file_name": "podcast_episode.mp3",
    "file_type": "audio",
    "file_size": 8500000,
    "s3_key": "assets/user_123/asset_aud456klm/podcast_episode.mp3",
    "upload_status": "completed",
    "created_at": "2024-11-26T10:40:00Z",
    "fingerprint_status": "pending",
    "metadata": {
      "duration_seconds": 1845,
      "bitrate": 320,
      "sample_rate": 44100,
      "channels": 2
    }
  }
}
```

**curl Example:**
```bash
curl -X POST http://localhost:8000/api/v1/upload/audio \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -F "file=@/path/to/podcast_episode.mp3" \
  -F "title=Podcast Episode 42" \
  -F "description=Weekly podcast recording"
```

---

### POST /api/v1/upload/video

Upload video content directly (files < 10MB).

**Authentication:** Protected

**Request Headers:**
```http
Authorization: Bearer <your_jwt_token>
Content-Type: multipart/form-data
```

**Request Body (multipart/form-data):**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `file` | File | Yes | Video file (.mp4, .mov, .avi) |
| `title` | String | No | Asset title |
| `description` | String | No | Asset description |

**Response (201 Created):**
```json
{
  "data": {
    "asset_id": "asset_vid321nop",
    "file_name": "short_clip.mp4",
    "file_type": "video",
    "file_size": 9800000,
    "s3_key": "assets/user_123/asset_vid321nop/short_clip.mp4",
    "upload_status": "completed",
    "created_at": "2024-11-26T10:45:00Z",
    "fingerprint_status": "pending",
    "metadata": {
      "duration_seconds": 45,
      "width": 1920,
      "height": 1080,
      "codec": "h264",
      "fps": 30
    }
  }
}
```

**curl Example:**
```bash
curl -X POST http://localhost:8000/api/v1/upload/video \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -F "file=@/path/to/short_clip.mp4" \
  -F "title=Short Video Clip" \
  -F "description=Demo video content"
```

---

### POST /api/v1/upload/url

Import content from URL (YouTube, Vimeo, web pages).

**Authentication:** Protected

**Request Headers:**
```http
Authorization: Bearer <your_jwt_token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
  "title": "My YouTube Video",
  "description": "Video content for protection"
}
```

**Response (201 Created) - YouTube:**
```json
{
  "data": {
    "asset_id": "asset_url789qrs",
    "url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    "platform": "youtube",
    "file_type": "url",
    "upload_status": "completed",
    "created_at": "2024-11-26T10:50:00Z",
    "fingerprint_status": "pending",
    "metadata": {
      "title": "Original Video Title",
      "description": "Video description from YouTube",
      "duration_seconds": 212,
      "view_count": 1500000,
      "channel": "Channel Name",
      "transcript_available": true
    }
  }
}
```

**Response (201 Created) - Web Page:**
```json
{
  "data": {
    "asset_id": "asset_web456tuv",
    "url": "https://example.com/blog/my-article",
    "platform": "webpage",
    "file_type": "url",
    "upload_status": "completed",
    "created_at": "2024-11-26T10:55:00Z",
    "fingerprint_status": "pending",
    "metadata": {
      "page_title": "Article Title",
      "text_length": 5420,
      "extracted_at": "2024-11-26T10:55:00Z"
    }
  }
}
```

**Response (400 Bad Request):**
```json
{
  "error": {
    "code": "INVALID_URL",
    "message": "URL is not valid or not accessible",
    "details": {
      "url": "https://invalid-url",
      "reason": "Unable to resolve domain"
    }
  }
}
```

**curl Example:**
```bash
curl -X POST http://localhost:8000/api/v1/upload/url \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    "title": "My Video Content",
    "description": "Protected video content"
  }'
```

---

### GET /api/v1/upload/presigned-url

Generate S3 presigned URL for large file uploads (≥ 10MB).

**Authentication:** Protected

**Request Headers:**
```http
Authorization: Bearer <your_jwt_token>
```

**Query Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `file_name` | String | Yes | Original file name |
| `file_type` | String | Yes | File category: `text`, `image`, `audio`, `video` |
| `content_type` | String | Yes | MIME type of the file |
| `file_size` | Integer | Yes | File size in bytes |

**Response (200 OK):**
```json
{
  "data": {
    "upload_id": "upload_pre123abc",
    "presigned_url": "https://s3.amazonaws.com/meta-stamp-assets/...",
    "s3_key": "assets/user_123/upload_pre123abc/large_video.mp4",
    "expires_at": "2024-11-26T11:15:00Z",
    "expires_in_seconds": 900,
    "max_file_size": 524288000,
    "allowed_content_type": "video/mp4",
    "method": "PUT"
  }
}
```

**Response (413 Payload Too Large):**
```json
{
  "error": {
    "code": "FILE_TOO_LARGE",
    "message": "Requested file size exceeds maximum limit",
    "details": {
      "requested_size": 600000000,
      "max_size": 524288000
    }
  }
}
```

**Response (415 Unsupported Media Type):**
```json
{
  "error": {
    "code": "INVALID_FILE_TYPE",
    "message": "Content type not supported",
    "details": {
      "requested_type": "application/zip",
      "reason": "Archive files are not allowed"
    }
  }
}
```

**curl Example:**
```bash
curl -X GET "http://localhost:8000/api/v1/upload/presigned-url?file_name=large_video.mp4&file_type=video&content_type=video/mp4&file_size=150000000" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

**Using the Presigned URL:**
```bash
# Upload file directly to S3 using the presigned URL
curl -X PUT "<presigned_url_from_response>" \
  -H "Content-Type: video/mp4" \
  --data-binary @/path/to/large_video.mp4
```

---

### POST /api/v1/upload/confirmation

Confirm S3 upload completion and register asset in database.

**Authentication:** Protected

**Request Headers:**
```http
Authorization: Bearer <your_jwt_token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "upload_id": "upload_pre123abc",
  "s3_key": "assets/user_123/upload_pre123abc/large_video.mp4",
  "title": "Large Video File",
  "description": "High-quality video content"
}
```

**Response (201 Created):**
```json
{
  "data": {
    "asset_id": "asset_lg789xyz",
    "file_name": "large_video.mp4",
    "file_type": "video",
    "file_size": 150000000,
    "s3_key": "assets/user_123/upload_pre123abc/large_video.mp4",
    "upload_status": "completed",
    "created_at": "2024-11-26T11:10:00Z",
    "fingerprint_status": "pending",
    "metadata": {
      "duration_seconds": 3600,
      "width": 3840,
      "height": 2160,
      "codec": "h265",
      "fps": 60
    }
  }
}
```

**Response (400 Bad Request):**
```json
{
  "error": {
    "code": "UPLOAD_NOT_FOUND",
    "message": "S3 object not found at specified key",
    "details": {
      "s3_key": "assets/user_123/upload_pre123abc/large_video.mp4",
      "reason": "File was not uploaded or presigned URL expired"
    }
  }
}
```

**Response (404 Not Found):**
```json
{
  "error": {
    "code": "INVALID_UPLOAD_ID",
    "message": "Upload ID not found or expired",
    "details": {
      "upload_id": "upload_pre123abc"
    }
  }
}
```

**curl Example:**
```bash
curl -X POST http://localhost:8000/api/v1/upload/confirmation \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "Content-Type: application/json" \
  -d '{
    "upload_id": "upload_pre123abc",
    "s3_key": "assets/user_123/upload_pre123abc/large_video.mp4",
    "title": "Large Video File",
    "description": "High-quality video content"
  }'
```

---

## Fingerprinting Endpoints

### POST /api/v1/fingerprint/{asset_id}

Generate fingerprint for an uploaded asset. Fingerprinting runs as a background task.

**Authentication:** Protected

**Path Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `asset_id` | String | Yes | ID of the asset to fingerprint |

**Request Headers:**
```http
Authorization: Bearer <your_jwt_token>
```

**Request Body:** None

**Response (202 Accepted):**
```json
{
  "data": {
    "fingerprint_id": "fp_abc123xyz",
    "asset_id": "asset_img789xyz",
    "status": "processing",
    "message": "Fingerprint generation started",
    "estimated_completion_seconds": 30
  }
}
```

**Response (404 Not Found):**
```json
{
  "error": {
    "code": "NOT_FOUND",
    "message": "Asset not found",
    "details": {
      "asset_id": "asset_invalid"
    }
  }
}
```

**Response (400 Bad Request):**
```json
{
  "error": {
    "code": "FINGERPRINT_EXISTS",
    "message": "Fingerprint already exists for this asset",
    "details": {
      "fingerprint_id": "fp_existing123",
      "created_at": "2024-11-25T10:00:00Z"
    }
  }
}
```

**curl Example:**
```bash
curl -X POST http://localhost:8000/api/v1/fingerprint/asset_img789xyz \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

---

### GET /api/v1/fingerprint/{id}

Retrieve fingerprint data for an asset.

**Authentication:** Protected

**Path Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | String | Yes | Fingerprint ID |

**Request Headers:**
```http
Authorization: Bearer <your_jwt_token>
```

**Response (200 OK) - Image Fingerprint:**
```json
{
  "data": {
    "fingerprint_id": "fp_abc123xyz",
    "asset_id": "asset_img789xyz",
    "status": "completed",
    "created_at": "2024-11-26T11:00:00Z",
    "completed_at": "2024-11-26T11:00:15Z",
    "perceptual_hashes": {
      "phash": "d4c4d4e4e4e4d4c4",
      "ahash": "ffffc3c3c3c3ffff",
      "dhash": "3c3c3c7e7e3c3c3c"
    },
    "embeddings": {
      "model": "openai/clip-vit-base-patch32",
      "vector_dimension": 512,
      "vector_preview": [0.0123, -0.0456, 0.0789, "..."]
    },
    "metadata": {
      "file_type": "image",
      "width": 1920,
      "height": 1080,
      "format": "PNG"
    }
  }
}
```

**Response (200 OK) - Audio Fingerprint:**
```json
{
  "data": {
    "fingerprint_id": "fp_aud456klm",
    "asset_id": "asset_aud456klm",
    "status": "completed",
    "created_at": "2024-11-26T11:05:00Z",
    "completed_at": "2024-11-26T11:05:45Z",
    "spectral_data": {
      "mel_spectrogram_shape": [128, 862],
      "chromagram_shape": [12, 862],
      "spectral_centroid_mean": 2145.67,
      "spectral_bandwidth_mean": 1856.23
    },
    "embeddings": {
      "model": "openai/whisper-base",
      "vector_dimension": 384,
      "vector_preview": [0.0234, -0.0567, 0.0891, "..."]
    },
    "metadata": {
      "file_type": "audio",
      "duration_seconds": 1845,
      "sample_rate": 44100
    }
  }
}
```

**Response (200 OK) - Processing Status:**
```json
{
  "data": {
    "fingerprint_id": "fp_pending789",
    "asset_id": "asset_vid321nop",
    "status": "processing",
    "created_at": "2024-11-26T11:10:00Z",
    "progress_percent": 45,
    "message": "Extracting video frames..."
  }
}
```

**Response (404 Not Found):**
```json
{
  "error": {
    "code": "NOT_FOUND",
    "message": "Fingerprint not found",
    "details": {
      "fingerprint_id": "fp_invalid"
    }
  }
}
```

**curl Example:**
```bash
curl -X GET http://localhost:8000/api/v1/fingerprint/fp_abc123xyz \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

---

## Analytics Endpoints

### POST /api/v1/analytics/predict

Calculate AI Touch Value™ for an asset based on the formula:

```
AI Touch Value™ = ModelEarnings × (TrainingContributionScore/100) × (UsageExposureScore/100) × EquityFactor
```

Where **EquityFactor = 0.25 (25%)**

**Authentication:** Protected

**Request Headers:**
```http
Authorization: Bearer <your_jwt_token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "asset_id": "asset_img789xyz",
  "model_earnings": 1000000.00,
  "training_contribution_score": 75,
  "usage_exposure_score": 60,
  "metadata": {
    "followers": 150000,
    "total_views": 5000000,
    "content_hours": 250,
    "platform": "youtube"
  }
}
```

**Input Validation:**
| Field | Type | Range | Description |
|-------|------|-------|-------------|
| `model_earnings` | Float | ≥ 0 | Total earnings of the AI model using the asset |
| `training_contribution_score` | Integer | 0-100 | How much the asset contributed to training |
| `usage_exposure_score` | Integer | 0-100 | How exposed the asset is in model outputs |

**Response (200 OK):**
```json
{
  "data": {
    "calculation_id": "calc_abc123",
    "asset_id": "asset_img789xyz",
    "ai_touch_value": 112500.00,
    "currency": "USD",
    "formula_breakdown": {
      "model_earnings": 1000000.00,
      "training_contribution_score": 75,
      "usage_exposure_score": 60,
      "equity_factor": 0.25,
      "calculation": "1000000.00 × (75/100) × (60/100) × 0.25 = 112500.00"
    },
    "calculated_at": "2024-11-26T11:20:00Z",
    "metadata": {
      "followers": 150000,
      "total_views": 5000000,
      "content_hours": 250,
      "platform": "youtube"
    }
  }
}
```

**Response (400 Bad Request):**
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid input parameters",
    "details": {
      "training_contribution_score": "Must be between 0 and 100",
      "model_earnings": "Must be a non-negative number"
    }
  }
}
```

**Response (404 Not Found):**
```json
{
  "error": {
    "code": "NOT_FOUND",
    "message": "Asset not found",
    "details": {
      "asset_id": "asset_invalid"
    }
  }
}
```

**curl Example:**
```bash
curl -X POST http://localhost:8000/api/v1/analytics/predict \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "Content-Type: application/json" \
  -d '{
    "asset_id": "asset_img789xyz",
    "model_earnings": 1000000.00,
    "training_contribution_score": 75,
    "usage_exposure_score": 60,
    "metadata": {
      "followers": 150000,
      "total_views": 5000000,
      "content_hours": 250,
      "platform": "youtube"
    }
  }'
```

---

## Assets Endpoints

### GET /api/v1/assets

List all assets for the authenticated user with pagination and filtering.

**Authentication:** Protected

**Request Headers:**
```http
Authorization: Bearer <your_jwt_token>
```

**Query Parameters:**
| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `page` | Integer | No | 1 | Page number (1-indexed) |
| `limit` | Integer | No | 20 | Items per page (max 100) |
| `file_type` | String | No | all | Filter by: `text`, `image`, `audio`, `video`, `url` |
| `status` | String | No | all | Filter by: `pending`, `processing`, `completed`, `failed` |
| `sort_by` | String | No | created_at | Sort field: `created_at`, `file_name`, `file_size` |
| `order` | String | No | desc | Sort order: `asc`, `desc` |

**Response (200 OK):**
```json
{
  "data": {
    "assets": [
      {
        "asset_id": "asset_img789xyz",
        "file_name": "artwork.png",
        "file_type": "image",
        "file_size": 2458000,
        "upload_status": "completed",
        "fingerprint_status": "completed",
        "created_at": "2024-11-26T10:35:00Z",
        "ai_touch_score": 78.5
      },
      {
        "asset_id": "asset_aud456klm",
        "file_name": "podcast_episode.mp3",
        "file_type": "audio",
        "file_size": 8500000,
        "upload_status": "completed",
        "fingerprint_status": "processing",
        "created_at": "2024-11-26T10:40:00Z",
        "ai_touch_score": null
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total_items": 42,
      "total_pages": 3,
      "has_next": true,
      "has_prev": false
    }
  }
}
```

**curl Example:**
```bash
curl -X GET "http://localhost:8000/api/v1/assets?page=1&limit=20&file_type=image&status=completed" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

---

### GET /api/v1/assets/{id}

Get detailed information about a specific asset.

**Authentication:** Protected

**Path Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | String | Yes | Asset ID |

**Request Headers:**
```http
Authorization: Bearer <your_jwt_token>
```

**Response (200 OK):**
```json
{
  "data": {
    "asset_id": "asset_img789xyz",
    "user_id": "user_123abc",
    "file_name": "artwork.png",
    "file_type": "image",
    "file_size": 2458000,
    "s3_key": "assets/user_123/asset_img789xyz/artwork.png",
    "upload_status": "completed",
    "fingerprint_status": "completed",
    "created_at": "2024-11-26T10:35:00Z",
    "updated_at": "2024-11-26T10:35:30Z",
    "title": "My Artwork",
    "description": "Digital illustration",
    "metadata": {
      "width": 1920,
      "height": 1080,
      "format": "PNG",
      "color_mode": "RGBA",
      "exif": {
        "software": "Adobe Photoshop",
        "created_date": "2024-11-25T15:00:00Z"
      }
    },
    "fingerprint": {
      "fingerprint_id": "fp_abc123xyz",
      "status": "completed",
      "perceptual_hashes": {
        "phash": "d4c4d4e4e4e4d4c4",
        "ahash": "ffffc3c3c3c3ffff",
        "dhash": "3c3c3c7e7e3c3c3c"
      }
    },
    "ai_touch_score": 78.5,
    "ai_touch_value": {
      "calculated_value": 112500.00,
      "currency": "USD",
      "last_calculated": "2024-11-26T11:20:00Z"
    }
  }
}
```

**Response (403 Forbidden):**
```json
{
  "error": {
    "code": "FORBIDDEN",
    "message": "You do not have permission to access this asset",
    "details": {
      "asset_id": "asset_other_user"
    }
  }
}
```

**Response (404 Not Found):**
```json
{
  "error": {
    "code": "NOT_FOUND",
    "message": "Asset not found",
    "details": {
      "asset_id": "asset_invalid"
    }
  }
}
```

**curl Example:**
```bash
curl -X GET http://localhost:8000/api/v1/assets/asset_img789xyz \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

---

### DELETE /api/v1/assets/{id}

Delete an asset and all associated data (fingerprints, analytics).

**Authentication:** Protected

**Path Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | String | Yes | Asset ID |

**Request Headers:**
```http
Authorization: Bearer <your_jwt_token>
```

**Response (200 OK):**
```json
{
  "data": {
    "message": "Asset deleted successfully",
    "asset_id": "asset_img789xyz",
    "deleted_items": {
      "asset": true,
      "s3_object": true,
      "fingerprint": true,
      "analytics": true
    }
  }
}
```

**Response (403 Forbidden):**
```json
{
  "error": {
    "code": "FORBIDDEN",
    "message": "You do not have permission to delete this asset",
    "details": {
      "asset_id": "asset_other_user"
    }
  }
}
```

**Response (404 Not Found):**
```json
{
  "error": {
    "code": "NOT_FOUND",
    "message": "Asset not found",
    "details": {
      "asset_id": "asset_invalid"
    }
  }
}
```

**curl Example:**
```bash
curl -X DELETE http://localhost:8000/api/v1/assets/asset_img789xyz \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

---

## Wallet Endpoints

### GET /api/v1/wallet/balance

Get current wallet balance for the authenticated user.

**Authentication:** Protected

**Request Headers:**
```http
Authorization: Bearer <your_jwt_token>
```

**Response (200 OK):**
```json
{
  "data": {
    "user_id": "user_123abc",
    "balance": {
      "available": 5250.75,
      "pending": 1125.00,
      "total_earned": 12500.50,
      "currency": "USD"
    },
    "last_payout": {
      "amount": 2500.00,
      "date": "2024-11-01T00:00:00Z",
      "status": "completed"
    },
    "next_payout": {
      "estimated_amount": 1125.00,
      "scheduled_date": "2024-12-01T00:00:00Z"
    },
    "updated_at": "2024-11-26T11:30:00Z"
  }
}
```

**curl Example:**
```bash
curl -X GET http://localhost:8000/api/v1/wallet/balance \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

---

### GET /api/v1/wallet/history

Get transaction history for the authenticated user.

**Authentication:** Protected

**Request Headers:**
```http
Authorization: Bearer <your_jwt_token>
```

**Query Parameters:**
| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `page` | Integer | No | 1 | Page number (1-indexed) |
| `limit` | Integer | No | 20 | Items per page (max 100) |
| `type` | String | No | all | Filter by: `earning`, `payout`, `adjustment` |
| `start_date` | String | No | - | ISO 8601 date filter (inclusive) |
| `end_date` | String | No | - | ISO 8601 date filter (inclusive) |

**Response (200 OK):**
```json
{
  "data": {
    "transactions": [
      {
        "transaction_id": "txn_abc123",
        "type": "earning",
        "amount": 112.50,
        "currency": "USD",
        "description": "AI Touch Value™ compensation - artwork.png",
        "asset_id": "asset_img789xyz",
        "status": "completed",
        "created_at": "2024-11-26T11:20:00Z"
      },
      {
        "transaction_id": "txn_def456",
        "type": "payout",
        "amount": -2500.00,
        "currency": "USD",
        "description": "Monthly payout - November 2024",
        "asset_id": null,
        "status": "completed",
        "created_at": "2024-11-01T00:00:00Z"
      },
      {
        "transaction_id": "txn_ghi789",
        "type": "adjustment",
        "amount": 50.00,
        "currency": "USD",
        "description": "Correction - podcast_episode.mp3 recalculation",
        "asset_id": "asset_aud456klm",
        "status": "completed",
        "created_at": "2024-10-28T14:30:00Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total_items": 156,
      "total_pages": 8,
      "has_next": true,
      "has_prev": false
    },
    "summary": {
      "total_earnings": 12500.50,
      "total_payouts": 7250.00,
      "total_adjustments": 50.25,
      "period_start": "2024-01-01T00:00:00Z",
      "period_end": "2024-11-26T23:59:59Z"
    }
  }
}
```

**curl Example:**
```bash
curl -X GET "http://localhost:8000/api/v1/wallet/history?page=1&limit=20&type=earning&start_date=2024-11-01" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

---

## AI Assistant Endpoints

### POST /api/v1/assistant/ask

Send a message to the AI assistant and receive a streaming response.

**Authentication:** Protected

**Request Headers:**
```http
Authorization: Bearer <your_jwt_token>
Content-Type: application/json
Accept: text/event-stream
```

**Request Body:**
```json
{
  "message": "How is my artwork.png being used in AI training?",
  "conversation_id": "conv_abc123",
  "context": {
    "asset_id": "asset_img789xyz"
  }
}
```

**Request Parameters:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `message` | String | Yes | User's message to the assistant |
| `conversation_id` | String | No | Continue existing conversation (optional) |
| `context.asset_id` | String | No | Focus on a specific asset |
| `provider` | String | No | Override default: `openai`, `anthropic`, `google` |

**Response (200 OK) - Server-Sent Events:**

The response is streamed using Server-Sent Events (SSE):

```
event: message_start
data: {"conversation_id": "conv_abc123", "message_id": "msg_xyz789"}

event: content_delta
data: {"delta": "Based on the fingerprint analysis of your artwork.png, "}

event: content_delta
data: {"delta": "I can see that the perceptual hash (d4c4d4e4e4e4d4c4) "}

event: content_delta
data: {"delta": "indicates unique visual characteristics. "}

event: tool_call
data: {"tool": "get_fingerprint", "input": {"asset_id": "asset_img789xyz"}, "result": "completed"}

event: content_delta
data: {"delta": "Your AI Touch Score™ is currently 78.5, "}

event: content_delta
data: {"delta": "with an estimated AI Touch Value™ of $112,500.00."}

event: message_end
data: {"message_id": "msg_xyz789", "finish_reason": "stop", "usage": {"input_tokens": 45, "output_tokens": 87}}
```

**Non-Streaming Response (200 OK):**

Add `Accept: application/json` header for non-streaming response:

```json
{
  "data": {
    "conversation_id": "conv_abc123",
    "message_id": "msg_xyz789",
    "content": "Based on the fingerprint analysis of your artwork.png, I can see that the perceptual hash (d4c4d4e4e4e4d4c4) indicates unique visual characteristics. Your AI Touch Score™ is currently 78.5, with an estimated AI Touch Value™ of $112,500.00.",
    "tool_calls": [
      {
        "tool": "get_fingerprint",
        "input": {"asset_id": "asset_img789xyz"},
        "result": "completed"
      }
    ],
    "usage": {
      "input_tokens": 45,
      "output_tokens": 87
    },
    "created_at": "2024-11-26T11:35:00Z"
  }
}
```

**Response (400 Bad Request):**
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Message content is required",
    "details": {
      "message": "Field cannot be empty"
    }
  }
}
```

**Response (500 Internal Server Error):**
```json
{
  "error": {
    "code": "ASSISTANT_ERROR",
    "message": "Failed to process request with AI provider",
    "details": {
      "provider": "openai",
      "reason": "Rate limit exceeded"
    }
  }
}
```

**curl Example (Streaming):**
```bash
curl -X POST http://localhost:8000/api/v1/assistant/ask \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "Content-Type: application/json" \
  -H "Accept: text/event-stream" \
  -d '{
    "message": "How is my artwork.png being used in AI training?",
    "context": {
      "asset_id": "asset_img789xyz"
    }
  }' \
  --no-buffer
```

**curl Example (Non-Streaming):**
```bash
curl -X POST http://localhost:8000/api/v1/assistant/ask \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -d '{
    "message": "What is my total AI Touch Value?",
    "provider": "anthropic"
  }'
```

---

## Health Check Endpoint

### GET /api/v1/health

Check API health and service status.

**Authentication:** Public

**Response (200 OK):**
```json
{
  "data": {
    "status": "healthy",
    "version": "1.0.0",
    "timestamp": "2024-11-26T11:40:00Z",
    "services": {
      "database": "connected",
      "redis": "connected",
      "storage": "connected"
    }
  }
}
```

**Response (503 Service Unavailable):**
```json
{
  "error": {
    "code": "SERVICE_UNAVAILABLE",
    "message": "One or more services are unavailable",
    "details": {
      "database": "connected",
      "redis": "disconnected",
      "storage": "connected"
    }
  }
}
```

**curl Example:**
```bash
curl -X GET http://localhost:8000/api/v1/health
```

---

## Future Endpoints (Phase 2 Placeholders)

The following endpoints are planned for Phase 2 implementation:

### AI Training Detection

```
POST /api/v1/detection/scan/{asset_id}    # Scan for AI training usage
GET  /api/v1/detection/results/{id}       # Get detection results
```

### Dataset Comparison

```
POST /api/v1/datasets/compare             # Compare against known datasets
GET  /api/v1/datasets/matches/{asset_id}  # Get dataset matches
```

### Legal Export

```
POST /api/v1/legal/export/{asset_id}      # Generate legal documentation
GET  /api/v1/legal/reports/{id}           # Download legal report
```

### Platform Import Placeholders

```
POST /api/v1/import/sora2                 # Import from Sora 2
POST /api/v1/import/nano-banana           # Import from Nano-Banana
```

---

## SDK and Client Libraries

Official client libraries will be available for:

- **Python**: `pip install meta-stamp-client`
- **JavaScript/TypeScript**: `npm install @meta-stamp/client`
- **Go**: `go get github.com/meta-stamp/go-client`

_(Coming soon)_

---

## Changelog

### v1.0.0 (2024-11-26)

- Initial API release
- Upload endpoints (text, image, audio, video, URL)
- Presigned URL flow for large files
- Fingerprinting endpoints
- AI Touch Value™ analytics
- Asset management
- Wallet balance and history
- AI assistant with streaming support
- JWT authentication with Auth0 and local fallback

---

## Support

For API support and questions:

- **Documentation Issues**: Open a GitHub issue
- **Technical Support**: support@meta-stamp.com
- **API Status**: https://status.meta-stamp.com

---

*META-STAMP V3 API Documentation - Version 1.0.0*
