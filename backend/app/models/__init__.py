"""
Models Package for META-STAMP V3.

This package provides Pydantic models for the META-STAMP V3 platform,
including data models for assets, users, wallet/transactions, analytics,
and fingerprinting.

All models are designed for MongoDB compatibility with proper ObjectId
handling via _id alias support and datetime serialization.

Models Overview:
    - Asset: Creative asset metadata and storage references
    - User: User authentication and profile data
    - WalletBalance: User wallet balance and earnings tracking
    - Transaction: Individual financial transaction records
    - AITouchValueCalculation: AI Touch Value™ calculation results
    - Fingerprint: Multi-modal asset fingerprinting data

Example Usage:
    ```python
    from app.models import Asset, User, WalletBalance, Transaction
    from app.models import AITouchValueCalculation, Fingerprint
    from app.models import FileType, UploadStatus, TransactionType
    
    # Create a new asset
    asset = Asset(
        user_id="user123",
        file_name="artwork.png",
        file_type=FileType.IMAGE,
        file_size=1024000,
        mime_type="image/png",
        s3_key="uploads/artwork.png",
        s3_bucket="meta-stamp"
    )
    
    # Create a transaction
    transaction = Transaction(
        user_id="user123",
        transaction_type=TransactionType.EARNING,
        amount=Decimal("50.00"),
        description="AI Touch Value™ earning"
    )
    ```

Per Agent Action Plan section 0.6 transformation mapping for
backend/app/models/__init__.py as package marker that exports all models.
"""

__version__ = "1.0.0"

# =============================================================================
# ASSET MODELS
# =============================================================================
from app.models.asset import (
    Asset,
    AssetCreate,
    AssetResponse,
    FileType,
    ProcessingStatus,
    UploadStatus,
    # Constants
    DANGEROUS_EXTENSIONS,
    MAX_FILE_SIZE_BYTES,
    SUPPORTED_EXTENSIONS,
    SUPPORTED_MIME_TYPES,
)

# =============================================================================
# USER MODELS
# =============================================================================
from app.models.user import (
    TokenResponse,
    User,
    UserCreate,
    UserLogin,
    UserResponse,
    UserUpdate,
    # Constants
    SUPPORTED_PLATFORMS,
)

# =============================================================================
# WALLET MODELS
# =============================================================================
from app.models.wallet import (
    Transaction,
    TransactionStatus,
    TransactionType,
    WalletBalance,
    # Constants
    MINIMUM_PAYOUT_THRESHOLD,
    SUPPORTED_CURRENCIES,
)

# =============================================================================
# ANALYTICS MODELS
# =============================================================================
from app.models.analytics import (
    AITouchValueCalculation,
    # Constants
    EQUITY_FACTOR,
)

# =============================================================================
# FINGERPRINT MODELS
# =============================================================================
from app.models.fingerprint import (
    Fingerprint,
    FingerprintType,
    ProcessingStatus as FingerprintProcessingStatus,
)

# =============================================================================
# PUBLIC API
# =============================================================================

__all__ = [
    # Version
    "__version__",
    
    # Asset models and enums
    "Asset",
    "AssetCreate",
    "AssetResponse",
    "FileType",
    "UploadStatus",
    "ProcessingStatus",
    
    # Asset constants
    "MAX_FILE_SIZE_BYTES",
    "SUPPORTED_EXTENSIONS",
    "SUPPORTED_MIME_TYPES",
    "DANGEROUS_EXTENSIONS",
    
    # User models
    "User",
    "UserCreate",
    "UserLogin",
    "UserResponse",
    "UserUpdate",
    "TokenResponse",
    
    # User constants
    "SUPPORTED_PLATFORMS",
    
    # Wallet models and enums
    "WalletBalance",
    "Transaction",
    "TransactionType",
    "TransactionStatus",
    
    # Wallet constants
    "MINIMUM_PAYOUT_THRESHOLD",
    "SUPPORTED_CURRENCIES",
    
    # Analytics models
    "AITouchValueCalculation",
    
    # Analytics constants
    "EQUITY_FACTOR",
    
    # Fingerprint models and enums
    "Fingerprint",
    "FingerprintType",
    "FingerprintProcessingStatus",
]
