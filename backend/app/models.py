from sqlalchemy import Column, DateTime, Integer, JSON, String, func
from .database import Base

class UserState(Base):
    __tablename__ = "user_states"
    id = Column(Integer, primary_key=True)
    telegram_user_id = Column(String(64), unique=True, index=True, nullable=False)
    state = Column(JSON, nullable=False, default=dict)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
