"""
Services module for META-STAMP V3 backend application.

This package contains all business logic service classes that implement
the core functionality of the META-STAMP platform:

- upload_service: Hybrid upload routing (direct <10MB, presigned URL >10MB)
- storage_service: S3-compatible storage operations with MinIO/AWS S3
- fingerprinting_service: Multi-modal asset fingerprinting engine
- ai_value_service: AI Touch Value™ calculation engine
- ai_assistant_service: LangChain multi-provider AI assistant
- metadata_service: Comprehensive file metadata extraction
- url_processor_service: YouTube, Vimeo, and webpage content extraction

All services follow async patterns for non-blocking operations and are
designed for dependency injection through FastAPI's dependency system.
"""
