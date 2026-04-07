from pydantic import BaseModel, EmailStr
from typing import Optional
from datetime import datetime


class UserCreate(BaseModel):
    name: str
    email: EmailStr
    password: str
    phone: Optional[str] = None
    address: Optional[str] = None


class MemberCreate(BaseModel):
    name: str
    email: EmailStr
    password: str
    phone: Optional[str] = None
    boat_name: str


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class UserOut(BaseModel):
    id: int
    name: str
    email: str
    role: str
    phone: Optional[str] = None
    address: Optional[str] = None
    boat_name: Optional[str] = None
    model_config = {"from_attributes": True}


class Token(BaseModel):
    access_token: str
    token_type: str
    user: UserOut


class AuctionSessionCreate(BaseModel):
    date: str
    video_url: Optional[str] = None


class AuctionSessionOut(BaseModel):
    id: int
    date: str
    status: str
    video_url: Optional[str] = None
    model_config = {"from_attributes": True}


class LotCreate(BaseModel):
    seafood_type: str
    quantity: float
    unit: str = "kg"
    quality: Optional[str] = None
    base_price: float
    member_id: int


class LotOut(BaseModel):
    id: int
    session_id: int
    seafood_type: str
    quantity: float
    unit: str
    quality: Optional[str] = None
    base_price: float
    sold_price: Optional[float] = None
    status: str
    member: UserOut
    buyer: Optional[UserOut] = None
    model_config = {"from_attributes": True}


class BidCreate(BaseModel):
    amount: float


class BidOut(BaseModel):
    id: int
    lot_id: int
    amount: float
    customer: UserOut
    created_at: datetime
    model_config = {"from_attributes": True}


class PaymentItem(BaseModel):
    member: UserOut
    lots_sold: int
    gross_amount: float
    tax_amount: float
    net_amount: float


class InitAdmin(BaseModel):
    name: str
    email: EmailStr
    password: str
