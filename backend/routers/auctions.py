from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from database import get_db
import models
import schemas
from security import require_admin

router = APIRouter(prefix="/auctions", tags=["auctions"])


@router.get("", response_model=List[schemas.AuctionSessionOut])
def list_sessions(db: Session = Depends(get_db)):
    return db.query(models.AuctionSession).order_by(models.AuctionSession.id.desc()).all()


@router.post("", response_model=schemas.AuctionSessionOut)
def create_session(
    data: schemas.AuctionSessionCreate,
    db: Session = Depends(get_db),
    _: models.User = Depends(require_admin),
):
    session = models.AuctionSession(date=data.date, video_url=data.video_url)
    db.add(session)
    db.commit()
    db.refresh(session)
    return session


@router.get("/{session_id}", response_model=schemas.AuctionSessionOut)
def get_session(session_id: int, db: Session = Depends(get_db)):
    session = db.query(models.AuctionSession).filter(models.AuctionSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Oturum bulunamadı")
    return session


@router.patch("/{session_id}/start", response_model=schemas.AuctionSessionOut)
def start_auction(
    session_id: int,
    db: Session = Depends(get_db),
    _: models.User = Depends(require_admin),
):
    session = db.query(models.AuctionSession).filter(models.AuctionSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Oturum bulunamadı")
    if session.status != "pending":
        raise HTTPException(status_code=400, detail="Oturum zaten başladı veya tamamlandı")
    session.status = "active"
    db.commit()
    db.refresh(session)
    return session


@router.patch("/{session_id}/complete", response_model=schemas.AuctionSessionOut)
def complete_auction(
    session_id: int,
    db: Session = Depends(get_db),
    _: models.User = Depends(require_admin),
):
    session = db.query(models.AuctionSession).filter(models.AuctionSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Oturum bulunamadı")
    session.status = "completed"
    db.commit()
    db.refresh(session)
    return session
