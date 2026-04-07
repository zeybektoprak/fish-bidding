from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from database import Base


class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    role = Column(String, default="customer")  # admin, member, customer
    phone = Column(String, nullable=True)
    address = Column(String, nullable=True)
    boat_name = Column(String, nullable=True)  # only for members
    created_at = Column(DateTime, server_default=func.now())


class AuctionSession(Base):
    __tablename__ = "auction_sessions"
    id = Column(Integer, primary_key=True, index=True)
    date = Column(String, nullable=False)
    status = Column(String, default="pending")  # pending, active, completed
    video_url = Column(String, nullable=True)
    created_at = Column(DateTime, server_default=func.now())
    lots = relationship("Lot", back_populates="session")


class Lot(Base):
    __tablename__ = "lots"
    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(Integer, ForeignKey("auction_sessions.id"), nullable=False)
    seafood_type = Column(String, nullable=False)
    quantity = Column(Float, nullable=False)
    unit = Column(String, default="kg")  # kg or piece
    quality = Column(String, nullable=True)
    base_price = Column(Float, nullable=False)
    sold_price = Column(Float, nullable=True)
    member_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    buyer_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    status = Column(String, default="pending")  # pending, active, sold, unsold
    created_at = Column(DateTime, server_default=func.now())

    session = relationship("AuctionSession", back_populates="lots")
    member = relationship("User", foreign_keys=[member_id])
    buyer = relationship("User", foreign_keys=[buyer_id])
    bids = relationship("Bid", back_populates="lot")


class Bid(Base):
    __tablename__ = "bids"
    id = Column(Integer, primary_key=True, index=True)
    lot_id = Column(Integer, ForeignKey("lots.id"), nullable=False)
    customer_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    amount = Column(Float, nullable=False)
    created_at = Column(DateTime, server_default=func.now())

    lot = relationship("Lot", back_populates="bids")
    customer = relationship("User")
