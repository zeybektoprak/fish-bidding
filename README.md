# Balıklıova Fish Auction System

A web application built for Balıklıova Seafood Cooperative to run and manage a live auction flow.

- **Backend:** FastAPI + SQLAlchemy + SQLite
- **Frontend:** React + Vite
- **Live updates:** WebSocket (lot activation, bids, sold/unsold)

## Project Structure

- `backend/` FastAPI app
- `frontend/` React (Vite) app
- `start.sh` script that starts backend + frontend together

## Requirements

- **Python:** 3.10+ (preferably 3.10.x)
- **Node.js:** 18+ (with npm)

> Note: `start.sh` uses `pyenv` and `/opt/homebrew/bin/npm`. If your setup differs, adjust the script accordingly (see "Troubleshooting" below).

## Quick Start (Recommended)

1) Make the script executable:

```bash
chmod +x start.sh
```

2) Start the application:

```bash
./start.sh
```

- Frontend: http://localhost:5173
- API Docs (Swagger): http://localhost:8000/docs
- Initial setup: http://localhost:5173/setup

Stop with `Ctrl + C` in the terminal.

## Manual Setup & Run

### 1) Backend

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

On first run, the backend automatically creates the SQLite database:

- DB file: `backend/auction.db`

To reset (deletes all data), remove `backend/auction.db`.

### 2) Frontend

```bash
cd frontend
npm install
npm run dev
```

The frontend runs at `http://localhost:5173` and connects to the backend at `http://localhost:8000`.

## First-Time Setup (Create Admin)

When the system is installed for the first time, the admin account is created **only once**:

1) Open: http://localhost:5173/setup
2) Fill the admin form and click "Create Admin Account".
3) Admin panel: http://localhost:5173/admin

> Note: If an admin already exists, calling `/setup` again will return the backend error message `"Admin zaten mevcut"` (Turkish for "Admin already exists").

## Roles & Flow

- **Admin**
  - Creates auction sessions
  - Adds cooperative members (captain/boat)
  - Adds lots inside a session
  - Activates a lot and watches incoming bids
  - Marks a lot as “sold” / “unsold”
  - Completes the auction session and views the payment summary

- **Customer (customer)**
  - Registers / logs in
  - Places bids for the currently active lot in the live auction

- **Member (member)**
  - Is created by the admin
  - Represents the seller side for lots (captain/boat)
  - **Cannot place bids**

## Live Updates (WebSocket)

The frontend connects to this WebSocket endpoint on the live auction screens:

- `ws://localhost:8000/ws/auction/{sessionId}`

The following events are broadcast on this channel:

- `lot_activated`
- `bid_placed`
- `lot_sold`
- `lot_unsold`

## Payments

After completing an auction session, the admin can open the "Payments" screen for that session.

- Tax rate is fixed in the backend: **18%**

## Troubleshooting

### If the port is already in use

Change the backend port:

```bash
uvicorn main:app --reload --port 8001
```

In that case, you must also update the frontend base URL since it is hardcoded in `frontend/src/api.js` (`BASE_URL`).

### `pyenv: command not found`

Remove the `pyenv` line from `start.sh`, or install `pyenv`.

### Your `npm` path is different

In `start.sh`, replace `/opt/homebrew/bin/npm` with whatever works on your machine (often just `npm`).

## Security Note

This project is meant for development/demo use. For production, you should at least review and update:

- JWT `SECRET_KEY` (currently hardcoded in the backend)
- CORS allowed origins
- HTTPS and secure deployment configuration
