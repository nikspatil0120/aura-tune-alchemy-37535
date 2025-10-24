import os
from typing import Optional

from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase
from pydantic import BaseModel
from dotenv import load_dotenv


load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), ".env"))

_client: Optional[AsyncIOMotorClient] = None
_db: Optional[AsyncIOMotorDatabase] = None


def get_database() -> AsyncIOMotorDatabase:
    global _client, _db
    if _db is not None:
        return _db
    mongo_uri = os.getenv("MONGO_URI")
    if not mongo_uri:
        raise RuntimeError("MONGO_URI is not set in backend/.env")
    db_name_env = os.getenv("MONGO_DB_NAME")
    _client = AsyncIOMotorClient(mongo_uri, uuidRepresentation="standard")
    # Use database from env or URI path, else default
    if db_name_env:
        db_name = db_name_env
    else:
        try:
            default_db = _client.get_default_database()
            db_name = default_db.name if default_db is not None else "auratune"
        except Exception:
            db_name = "auratune"
    _db = _client[db_name]
    return _db


def get_users_collection():
    return get_database()["users"]


