from typing import List, Optional
from datetime import datetime
from pydantic import BaseModel, EmailStr, Field


class UserBase(BaseModel):
    spotify_id: str = Field(..., description="Spotify unique user ID")
    display_name: Optional[str] = None
    email: Optional[EmailStr] = None
    profile_image_url: Optional[str] = None


class UserCreate(UserBase):
    access_token: Optional[str] = None
    refresh_token: Optional[str] = None


class UserDB(UserBase):
    id: str | None = None
    saved_playlists: List[dict] = []
    access_token: Optional[str] = None
    refresh_token: Optional[str] = None
    token_expires_at: Optional[datetime] = None
    profile_image_url: Optional[str] = None


class TokenResponse(BaseModel):
    token: str


class MeResponse(UserBase):
    saved_playlists: List[dict] = []
    profile_image_url: Optional[str] = None


class GeneratePlaylistRequest(BaseModel):
    current_mood: str
    goal_mood: str
    conversation_context: Optional[str] = None
    timestamp: Optional[int] = None


class SavePlaylistRequest(BaseModel):
    name: str
    track_uris: List[str] = []
    tracks: List[dict] | None = None  # optional: [{"uri": str | None, "title": str, "artist": str}]


