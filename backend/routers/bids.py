from fastapi import APIRouter, Depends, HTTPException, WebSocket, WebSocketDisconnect
from sqlalchemy.orm import Session
from typing import List
from database import get_db, SessionLocal
import models
import schemas
from security import get_current_user
from ws_manager import manager

router = APIRouter(tags=["bids"])


@router.get("/lots/{lot_id}/bids", response_model=List[schemas.BidOut])
def list_bids(lot_id: int, db: Session = Depends(get_db)):
    return (
        db.query(models.Bid)
        .filter(models.Bid.lot_id == lot_id)
        .order_by(models.Bid.amount.desc())
        .all()
    )


@router.post("/lots/{lot_id}/bids", response_model=schemas.BidOut)
async def place_bid(
    lot_id: int,
    bid_data: schemas.BidCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    if current_user.role == "member":
        raise HTTPException(status_code=403, detail="Üyeler teklif veremez")

    lot = db.query(models.Lot).filter(models.Lot.id == lot_id).first()
    if not lot:
        raise HTTPException(status_code=404, detail="Lot bulunamadı")
    if lot.status != "active":
        raise HTTPException(status_code=400, detail="Bu lot şu an aktif değil")
    if bid_data.amount < lot.base_price:
        raise HTTPException(
            status_code=400,
            detail=f"Teklif taban fiyatın ({lot.base_price} TL) altında olamaz",
        )

    highest = (
        db.query(models.Bid)
        .filter(models.Bid.lot_id == lot_id)
        .order_by(models.Bid.amount.desc())
        .first()
    )
    if highest and bid_data.amount <= highest.amount:
        raise HTTPException(
            status_code=400,
            detail=f"Teklif mevcut en yüksek tekliften ({highest.amount} TL) yüksek olmalı",
        )

    bid = models.Bid(lot_id=lot_id, customer_id=current_user.id, amount=bid_data.amount)
    db.add(bid)
    db.commit()
    db.refresh(bid)

    await manager.broadcast(lot.session_id, {
        "type": "bid_placed",
        "lot_id": lot_id,
        "amount": bid.amount,
        "bidder_name": current_user.name,
        "bid_id": bid.id,
    })
    return bid


@router.websocket("/ws/auction/{session_id}")
async def auction_websocket(websocket: WebSocket, session_id: int):
    await manager.connect(websocket, session_id)
    try:
        while True:
            # Keep connection alive; clients send pings
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(websocket, session_id)
