from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from database import get_db
import models
import schemas

TAX_RATE = 0.18

router = APIRouter(prefix="/auctions", tags=["payments"])


@router.get("/{session_id}/payments", response_model=List[schemas.PaymentItem])
def get_payments(session_id: int, db: Session = Depends(get_db)):
    session = db.query(models.AuctionSession).filter(models.AuctionSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Oturum bulunamadı")

    sold_lots = (
        db.query(models.Lot)
        .filter(models.Lot.session_id == session_id, models.Lot.status == "sold")
        .all()
    )

    member_map: dict[int, dict] = {}
    for lot in sold_lots:
        mid = lot.member_id
        if mid not in member_map:
            member_map[mid] = {"member": lot.member, "lots_sold": 0, "gross_amount": 0.0}
        member_map[mid]["lots_sold"] += 1
        member_map[mid]["gross_amount"] += lot.sold_price or 0.0

    result = []
    for data in member_map.values():
        gross = data["gross_amount"]
        tax = gross * TAX_RATE
        result.append(
            schemas.PaymentItem(
                member=data["member"],
                lots_sold=data["lots_sold"],
                gross_amount=gross,
                tax_amount=tax,
                net_amount=gross - tax,
            )
        )
    return result
