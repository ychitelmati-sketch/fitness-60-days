import os
from fastapi import Depends, FastAPI, Header, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session
from .database import Base, engine, get_db
from .models import UserState
from .security import issue_session, read_session, verify_telegram_init_data

Base.metadata.create_all(bind=engine)
app = FastAPI(title="60 Days Tracker API", version="2.0.0")
origins = [x.strip() for x in os.getenv("WEB_ORIGIN", "*").split(",") if x.strip()]
app.add_middleware(
    CORSMiddleware, allow_origins=origins, allow_credentials=False,
    allow_methods=["GET", "POST", "PUT", "OPTIONS"], allow_headers=["Authorization", "Content-Type"]
)

class TelegramAuth(BaseModel):
    init_data: str = Field(min_length=1, max_length=10000)

class StatePayload(BaseModel):
    state: dict = Field(default_factory=dict)

def current_user(authorization: str | None = Header(default=None)) -> str:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Authentication required")
    try:
        return read_session(authorization[7:])
    except (ValueError, RuntimeError):
        raise HTTPException(status_code=401, detail="Invalid or expired session")

@app.get("/health")
def health():
    return {"status": "ok"}

@app.post("/api/auth/telegram")
def telegram_auth(payload: TelegramAuth):
    try:
        user_id = verify_telegram_init_data(payload.init_data)
        return {"access_token": issue_session(user_id), "token_type": "bearer"}
    except (ValueError, RuntimeError):
        raise HTTPException(status_code=401, detail="Telegram authentication failed")

@app.get("/api/state")
def get_state(user_id: str = Depends(current_user), db: Session = Depends(get_db)):
    row = db.query(UserState).filter_by(telegram_user_id=user_id).first()
    return {"state": row.state if row else {}}

@app.put("/api/state")
def put_state(payload: StatePayload, user_id: str = Depends(current_user), db: Session = Depends(get_db)):
    if len(str(payload.state)) > 50000:
        raise HTTPException(status_code=413, detail="State is too large")
    row = db.query(UserState).filter_by(telegram_user_id=user_id).first()
    if row is None:
        row = UserState(telegram_user_id=user_id, state=payload.state)
        db.add(row)
    else:
        row.state = payload.state
    db.commit()
    return {"ok": True}

