from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from database import get_db
import models
import schemas
from security import require_admin, get_password_hash

router = APIRouter(prefix="/members", tags=["members"])


@router.get("", response_model=List[schemas.UserOut])
def list_members(db: Session = Depends(get_db)):
    return db.query(models.User).filter(models.User.role == "member").all()


@router.post("", response_model=schemas.UserOut)
def create_member(
    data: schemas.MemberCreate,
    db: Session = Depends(get_db),
    _: models.User = Depends(require_admin),
):
    existing = db.query(models.User).filter(models.User.email == data.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="Bu email zaten kayıtlı")
    member = models.User(
        name=data.name,
        email=data.email,
        hashed_password=get_password_hash(data.password),
        role="member",
        phone=data.phone,
        boat_name=data.boat_name,
    )
    db.add(member)
    db.commit()
    db.refresh(member)
    return member


@router.delete("/{member_id}")
def delete_member(
    member_id: int,
    db: Session = Depends(get_db),
    _: models.User = Depends(require_admin),
):
    member = db.query(models.User).filter(
        models.User.id == member_id, models.User.role == "member"
    ).first()
    if not member:
        raise HTTPException(status_code=404, detail="Üye bulunamadı")
    db.delete(member)
    db.commit()
    return {"ok": True}
