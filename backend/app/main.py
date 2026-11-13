from fastapi import Depends, FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session
from .database import Base, engine, get_db
from .models import CheckIn

Base.metadata.create_all(bind=engine)
app = FastAPI(title="Трекер 60 дней API", version="1.0.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

class CheckInInput(BaseModel):
    user_id: str = Field(min_length=1, max_length=128)
    day_number: int = Field(ge=1, le=60)

@app.get("/health")
def health():
    return {"status": "ok"}

@app.get("/api/progress/{user_id}")
def progress(user_id: str, db: Session = Depends(get_db)):
    rows = db.query(CheckIn.day_number).filter(CheckIn.user_id == user_id).order_by(CheckIn.day_number).all()
    days = [row[0] for row in rows]
    return {"user_id": user_id, "days": days, "completed": len(days), "total": 60}

@app.post("/api/check-ins")
def add_check_in(payload: CheckInInput, db: Session = Depends(get_db)):
    exists = db.query(CheckIn).filter_by(user_id=payload.user_id, day_number=payload.day_number).first()
    if exists:
        return {"ok": True, "day_number": payload.day_number, "already_completed": True}
    row = CheckIn(user_id=payload.user_id, day_number=payload.day_number)
    db.add(row)
    db.commit()
    return {"ok": True, "day_number": payload.day_number}

@app.delete("/api/check-ins/{user_id}/{day_number}")
def remove_check_in(user_id: str, day_number: int, db: Session = Depends(get_db)):
    if day_number < 1 or day_number > 60:
        raise HTTPException(status_code=400, detail="day_number must be between 1 and 60")
    row = db.query(CheckIn).filter_by(user_id=user_id, day_number=day_number).first()
    if row:
        db.delete(row)
        db.commit()
    return {"ok": True, "day_number": day_number}
