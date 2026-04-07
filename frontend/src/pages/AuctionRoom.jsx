import { useState, useEffect, useRef, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { api, createWebSocket } from '../api'

function statusLabel(s) {
  if (s === 'pending') return 'Bekliyor'
  if (s === 'active') return 'Aktif'
  if (s === 'sold') return 'Satıldı'
  if (s === 'unsold') return 'Satılmadı'
  return s
}

export default function AuctionRoom({ user }) {
  const [sessions, setSessions] = useState([])
  const [activeSession, setActiveSession] = useState(null)
  const [lots, setLots] = useState([])
  const [currentLot, setCurrentLot] = useState(null)
  const [bids, setBids] = useState([])
  const [bidAmount, setBidAmount] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [wsStatus, setWsStatus] = useState('disconnected')
  const wsRef = useRef(null)

  // Load sessions
  useEffect(() => {
    api.getSessions().then((data) => {
      setSessions(data)
      const active = data.find((s) => s.status === 'active')
      if (active) setActiveSession(active)
    })
  }, [])

  // Load lots when active session changes
  useEffect(() => {
    if (!activeSession) return
    api.getLots(activeSession.id).then((data) => {
      setLots(data)
      const activeLot = data.find((l) => l.status === 'active')
      if (activeLot) {
        setCurrentLot(activeLot)
        api.getBids(activeLot.id).then(setBids)
      }
    })
  }, [activeSession])

  // WebSocket
  useEffect(() => {
    if (!activeSession) return
    const ws = createWebSocket(activeSession.id)
    wsRef.current = ws

    ws.onopen = () => setWsStatus('connected')
    ws.onclose = () => setWsStatus('disconnected')

    ws.onmessage = (e) => {
      const msg = JSON.parse(e.data)
      if (msg.type === 'lot_activated') {
        setCurrentLot({
          id: msg.lot_id,
          seafood_type: msg.seafood_type,
          quantity: msg.quantity,
          unit: msg.unit,
          base_price: msg.base_price,
          member: { name: msg.member_name, boat_name: msg.boat_name },
          status: 'active',
        })
        setBids([])
        setBidAmount('')
        setError('')
        setLots((prev) =>
          prev.map((l) =>
            l.id === msg.lot_id ? { ...l, status: 'active' } : l.status === 'active' ? { ...l, status: 'pending' } : l
          )
        )
      } else if (msg.type === 'bid_placed') {
        setBids((prev) => [
          { id: msg.bid_id, amount: msg.amount, customer: { name: msg.bidder_name } },
          ...prev,
        ])
      } else if (msg.type === 'lot_sold') {
        setCurrentLot((prev) =>
          prev?.id === msg.lot_id ? { ...prev, status: 'sold', sold_price: msg.sold_price } : prev
        )
        setLots((prev) =>
          prev.map((l) =>
            l.id === msg.lot_id ? { ...l, status: 'sold', sold_price: msg.sold_price } : l
          )
        )
      } else if (msg.type === 'lot_unsold') {
        setCurrentLot((prev) =>
          prev?.id === msg.lot_id ? { ...prev, status: 'unsold' } : prev
        )
        setLots((prev) =>
          prev.map((l) => (l.id === msg.lot_id ? { ...l, status: 'unsold' } : l))
        )
      }
    }

    // Keep-alive ping
    const ping = setInterval(() => {
      if (ws.readyState === WebSocket.OPEN) ws.send('ping')
    }, 20000)

    return () => {
      clearInterval(ping)
      ws.close()
    }
  }, [activeSession])

  async function handleBid(e) {
    e.preventDefault()
    setError('')
    setSuccess('')
    const amount = parseFloat(bidAmount)
    if (!amount || isNaN(amount)) return setError('Geçerli bir tutar giriniz')
    try {
      await api.placeBid(currentLot.id, amount)
      setSuccess(`${amount} TL teklifiniz alındı!`)
      setBidAmount('')
    } catch (err) {
      setError(err.message)
    }
  }

  const topBid = bids[0]?.amount

  return (
    <div className="page">
      <h1 className="page-title">🐟 Canlı Açık Artırma</h1>

      {/* Active session live view */}
      {activeSession ? (
        <>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
            <span className="badge badge-active">Canlı</span>
            <span style={{ color: '#4a5568' }}>
              {activeSession.date} tarihli ihale
            </span>
            <span style={{ marginLeft: 'auto', fontSize: '0.8rem', color: wsStatus === 'connected' ? '#276749' : '#c53030' }}>
              ● {wsStatus === 'connected' ? 'Bağlı' : 'Bağlantı kesik'}
            </span>
          </div>

          {/* Video stream */}
          {activeSession.video_url && (
            <div className="card" style={{ padding: 0, overflow: 'hidden', marginBottom: '1.5rem' }}>
              <div className="video-embed">
                <iframe
                  src={activeSession.video_url}
                  allowFullScreen
                  title="İhale Yayını"
                />
              </div>
            </div>
          )}

          {/* Current lot */}
          {currentLot && currentLot.status === 'active' ? (
            <div className="auction-live">
              <div className="auction-live-header">
                <div className="live-dot" />
                <strong style={{ fontSize: '1.1rem' }}>Şu An Satışta</strong>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                <div>
                  <div style={{ fontSize: '0.8rem', color: '#4a5568' }}>Ürün</div>
                  <div style={{ fontSize: '1.4rem', fontWeight: 800 }}>{currentLot.seafood_type}</div>
                  <div style={{ color: '#718096' }}>{currentLot.quantity} {currentLot.unit} · {currentLot.member?.boat_name || currentLot.member?.name}</div>
                </div>
                <div>
                  <div style={{ fontSize: '0.8rem', color: '#4a5568' }}>En Yüksek Teklif</div>
                  <div className="current-lot-price">
                    {topBid ? `${topBid} TL` : `${currentLot.base_price} TL (taban)`}
                  </div>
                </div>
              </div>

              {user && user.role !== 'member' ? (
                <form onSubmit={handleBid}>
                  {error && <div className="alert alert-error">{error}</div>}
                  {success && <div className="alert alert-success">{success}</div>}
                  <div className="bid-input-row">
                    <input
                      type="number"
                      value={bidAmount}
                      onChange={(e) => setBidAmount(e.target.value)}
                      placeholder={`Min: ${topBid ? topBid + 1 : currentLot.base_price} TL`}
                      min={topBid ? topBid + 1 : currentLot.base_price}
                      step="0.5"
                    />
                    <button className="btn btn-success" type="submit">Teklif Ver</button>
                  </div>
                </form>
              ) : !user ? (
                <div className="alert alert-info">
                  Teklif vermek için <Link to="/login">giriş yapın</Link> veya <Link to="/register">kayıt olun</Link>.
                </div>
              ) : null}

              {/* Bids list */}
              {bids.length > 0 && (
                <div style={{ marginTop: '1rem' }}>
                  <div style={{ fontWeight: 700, marginBottom: '0.5rem', fontSize: '0.85rem' }}>Teklifler</div>
                  <ul className="bids-list">
                    {bids.slice(0, 8).map((b) => (
                      <li key={b.id}>
                        <span>{b.customer.name}</span>
                        <span className="bid-amount">{b.amount} TL</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ) : currentLot?.status === 'sold' ? (
            <div className="card" style={{ borderLeft: '4px solid #276749' }}>
              <strong>✅ {currentLot.seafood_type}</strong> {currentLot.sold_price} TL'ye satıldı. Sonraki lot bekleniyor...
            </div>
          ) : (
            <div className="alert alert-info">Henüz aktif lot yok. Admin bir ürünü başlatacak...</div>
          )}

          {/* All lots table */}
          <div className="card">
            <div className="card-title">Tüm Lotlar</div>
            <div className="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Ürün</th>
                    <th>Miktar</th>
                    <th>Taban Fiyat</th>
                    <th>Satış Fiyatı</th>
                    <th>Kaptan</th>
                    <th>Durum</th>
                  </tr>
                </thead>
                <tbody>
                  {lots.map((lot, i) => (
                    <tr key={lot.id} style={lot.status === 'active' ? { background: '#f0fff4' } : {}}>
                      <td>{i + 1}</td>
                      <td>{lot.seafood_type}</td>
                      <td>{lot.quantity} {lot.unit}</td>
                      <td>{lot.base_price} TL</td>
                      <td>{lot.sold_price ? `${lot.sold_price} TL` : '-'}</td>
                      <td>{lot.member?.boat_name || lot.member?.name}</td>
                      <td><span className={`badge badge-${lot.status}`}>{statusLabel(lot.status)}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : (
        <>
          <div className="alert alert-info">Şu an aktif ihale yok.</div>
          {sessions.length > 0 && (
            <div className="card">
              <div className="card-title">Geçmiş İhaleler</div>
              <div className="table-wrapper">
                <table>
                  <thead>
                    <tr><th>Tarih</th><th>Durum</th></tr>
                  </thead>
                  <tbody>
                    {sessions.map((s) => (
                      <tr key={s.id}>
                        <td>{s.date}</td>
                        <td><span className={`badge badge-${s.status}`}>{s.status === 'completed' ? 'Tamamlandı' : s.status === 'pending' ? 'Bekliyor' : 'Aktif'}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
