from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # Database
    DATABASE_URL: str = "postgresql+asyncpg://neondb_owner:npg_DpNFA4GkY8Le@ep-royal-violet-an41s3uz-pooler.c-6.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require"

    # JWT
    SECRET_KEY: str = "change-me-in-production-at-least-32-chars!!!"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30

    # Plaid
    PLAID_CLIENT_ID: str = ""
    PLAID_SECRET: str = ""
    PLAID_ENV: str = "sandbox"

    # Groq
    GROQ_API_KEY: str = ""

    # Encryption
    ENCRYPTION_KEY: str = ""


settings = Settings()
