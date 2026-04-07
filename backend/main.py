from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from database import engine, Base
from routers import auth, members, auctions, lots, bids, payments

Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="Balıklıova Balık İhalesi Sistemi",
    description="Balıklıova Deniz Ürünleri Kooperatifi - Online Balık İhalesi",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(members.router)
app.include_router(auctions.router)
app.include_router(lots.router)
app.include_router(bids.router)
app.include_router(payments.router)


@app.get("/")
def root():
    return {"message": "Balıklıova Balık İhalesi Sistemi API"}
