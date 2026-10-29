import logging
from typing import AsyncGenerator
from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from app.core.config import settings
from app.db.models import Base

logger = logging.getLogger(__name__)

database_url = settings.get_effective_database_url()

# Handle sqlite connect args if applicable
connect_args = {}
if database_url.startswith("sqlite"):
    connect_args = {"check_same_thread": False}

engine = create_async_engine(
    database_url,
    echo=False,
    connect_args=connect_args,
)

AsyncSessionLocal = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False,
)


async def init_db() -> None:
    """
    Initializes database schema, creates missing tables, and applies
    non-destructive schema migrations for existing SQLite databases.
    Includes connection retry logic for cloud database provisioning.
    """
    import asyncio
    max_retries = 5
    for attempt in range(1, max_retries + 1):
        try:
            logger.info("Initializing database schema (attempt %d/%d)...", attempt, max_retries)
            async with engine.begin() as conn:
                await conn.run_sync(Base.metadata.create_all)

                def check_and_migrate(connection):
                    try:
                        if connection.dialect.name == "sqlite":
                            res = connection.execute(text("PRAGMA table_info(call_sessions)"))
                            columns = [row[1] for row in res.fetchall()]
                            if columns and "contact_id" not in columns:
                                connection.execute(
                                    text("ALTER TABLE call_sessions ADD COLUMN contact_id VARCHAR(36)")
                                )
                                logger.info("Migrated call_sessions table: added contact_id column")
                            if columns and "provider_call_id" not in columns:
                                connection.execute(
                                    text("ALTER TABLE call_sessions ADD COLUMN provider_call_id VARCHAR(100)")
                                )
                                logger.info("Migrated call_sessions table: added provider_call_id column")
                            if columns and "telephony_provider" not in columns:
                                connection.execute(
                                    text("ALTER TABLE call_sessions ADD COLUMN telephony_provider VARCHAR(50) DEFAULT 'mock'")
                                )
                                logger.info("Migrated call_sessions table: added telephony_provider column")
                    except Exception as exc:
                        logger.debug("Schema migration notice: %s", exc)

                await conn.run_sync(check_and_migrate)

            logger.info("Database schema initialized successfully (%s)", database_url.split("@")[-1])
            return
        except Exception as exc:
            logger.warning("Database initialization attempt %d encountered error: %s", attempt, exc)
            if attempt < max_retries:
                await asyncio.sleep(2 * attempt)
            else:
                logger.error("Database connection could not be established after %d attempts. Server will proceed to allow health checks.", max_retries)



async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """
    FastAPI dependency that yields an active database session and guarantees
    cleanup upon request completion.
    """
    async with AsyncSessionLocal() as session:
        try:
            yield session
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()

