from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from database import get_db
import models
import schemas
from security import require_admin
from ws_manager import manager

router = APIRouter(tags=["lots"])


@router.get("/auctions/{session_id}/lots", response_model=List[schemas.LotOut])
def list_lots(session_id: int, db: Session = Depends(get_db)):
    return db.query(models.Lot).filter(models.Lot.session_id == session_id).all()


@router.post("/auctions/{session_id}/lots", response_model=schemas.LotOut)
def add_lot(
    session_id: int,
    data: schemas.LotCreate,
    db: Session = Depends(get_db),
    _: models.User = Depends(require_admin),
):
    session = db.query(models.AuctionSession).filter(models.AuctionSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Oturum bulunamadı")
    member = db.query(models.User).filter(
        models.User.id == data.member_id, models.User.role == "member"
    ).first()
    if not member:
        raise HTTPException(status_code=404, detail="Üye bulunamadı")
    lot = models.Lot(
        session_id=session_id,
        seafood_type=data.seafood_type,
        quantity=data.quantity,
        unit=data.unit,
        quality=data.quality,
        base_price=data.base_price,
        member_id=data.member_id,
    )
    db.add(lot)
    db.commit()
    db.refresh(lot)
    return lot


@router.delete("/lots/{lot_id}")
def delete_lot(
    lot_id: int,
    db: Session = Depends(get_db),
    _: models.User = Depends(require_admin),
):
    lot = db.query(models.Lot).filter(models.Lot.id == lot_id).first()
    if not lot:
        raise HTTPException(status_code=404, detail="Lot bulunamadı")
    if lot.status != "pending":
        raise HTTPException(status_code=400, detail="Sadece bekleyen lotlar silinebilir")
    db.delete(lot)
    db.commit()
    return {"ok": True}


@router.patch("/lots/{lot_id}/activate", response_model=schemas.LotOut)
async def activate_lot(
    lot_id: int,
    db: Session = Depends(get_db),
    _: models.User = Depends(require_admin),
):
    lot = db.query(models.Lot).filter(models.Lot.id == lot_id).first()
    if not lot:
        raise HTTPException(status_code=404, detail="Lot bulunamadı")

    # Deactivate any other active lot in this session
    db.query(models.Lot).filter(
        models.Lot.session_id == lot.session_id,
        models.Lot.status == "active",
    ).update({"status": "pending"})

    lot.status = "active"
    db.commit()
    db.refresh(lot)

    await manager.broadcast(lot.session_id, {
        "type": "lot_activated",
        "lot_id": lot.id,
        "seafood_type": lot.seafood_type,
        "quantity": lot.quantity,
        "unit": lot.unit,
        "base_price": lot.base_price,
        "member_name": lot.member.name,
        "boat_name": lot.member.boat_name,
    })
    return lot


@router.patch("/lots/{lot_id}/sell", response_model=schemas.LotOut)
async def sell_lot(
    lot_id: int,
    db: Session = Depends(get_db),
    _: models.User = Depends(require_admin),
):
    lot = db.query(models.Lot).filter(models.Lot.id == lot_id).first()
    if not lot:
        raise HTTPException(status_code=404, detail="Lot bulunamadı")
    if lot.status != "active":
        raise HTTPException(status_code=400, detail="Lot aktif değil")

    highest_bid = (
        db.query(models.Bid)
        .filter(models.Bid.lot_id == lot_id)
        .order_by(models.Bid.amount.desc())
        .first()
    )
    if not highest_bid:
        raise HTTPException(status_code=400, detail="Hiç teklif yok")

    lot.sold_price = highest_bid.amount
    lot.buyer_id = highest_bid.customer_id
    lot.status = "sold"
    db.commit()
    db.refresh(lot)

    await manager.broadcast(lot.session_id, {
        "type": "lot_sold",
        "lot_id": lot.id,
        "sold_price": lot.sold_price,
        "buyer_name": lot.buyer.name if lot.buyer else "",
    })
    return lot


@router.patch("/lots/{lot_id}/unsold", response_model=schemas.LotOut)
async def mark_unsold(
    lot_id: int,
    db: Session = Depends(get_db),
    _: models.User = Depends(require_admin),
):
    lot = db.query(models.Lot).filter(models.Lot.id == lot_id).first()
    if not lot:
        raise HTTPException(status_code=404, detail="Lot bulunamadı")
    lot.status = "unsold"
    db.commit()
    db.refresh(lot)

    await manager.broadcast(lot.session_id, {
        "type": "lot_unsold",
        "lot_id": lot.id,
    })
    return lot
