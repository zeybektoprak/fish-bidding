import { useState, useEffect, useRef } from 'react'
import { useParams, Link } from 'react-router-dom'
import { api, createWebSocket } from '../api'

function statusLabel(s) {
  const map = { pending: 'Bekliyor', active: 'Satışta', sold: 'Satıldı', unsold: 'Satılmadı' }
  return map[s] || s
}

export default function SessionManager() {
  const { id } = useParams()
  const sessionId = parseInt(id)
  const [session, setSession] = useState(null)
  const [lots, setLots] = useState([])
  const [members, setMembers] = useState([])
  const [bids, setBids] = useState({})
  const [showLotForm, setShowLotForm] = useState(false)
  const [lotForm, setLotForm] = useState({ seafood_type: '', quantity: '', unit: 'kg', quality: '', base_price: '', member_id: '' })
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const wsRef = useRef(null)

  useEffect(() => {
    loadAll()
    api.getMembers().then(setMembers)
  }, [sessionId])

  useEffect(() => {
    const ws = createWebSocket(sessionId)
    wsRef.current = ws
    ws.onmessage = (e) => {
      const msg = JSON.parse(e.data)
      if (msg.type === 'bid_placed') {
        setBids((prev) => ({
          ...prev,
          [msg.lot_id]: [{ id: msg.bid_id, amount: msg.amount, customer: { name: msg.bidder_name } }, ...(prev[msg.lot_id] || [])],
        }))
      } else if (['lot_activated', 'lot_sold', 'lot_unsold'].includes(msg.type)) {
        loadLots()
      }
    }
    const ping = setInterval(() => { if (ws.readyState === WebSocket.OPEN) ws.send('ping') }, 20000)
    return () => { clearInterval(ping); ws.close() }
  }, [sessionId])

  async function loadAll() {
    const [s, l] = await Promise.all([api.getSession(sessionId), api.getLots(sessionId)])
    setSession(s)
    setLots(l)
    const activeLot = l.find((lot) => lot.status === 'active')
    if (activeLot) {
      api.getBids(activeLot.id).then((b) => setBids({ [activeLot.id]: b }))
    }
  }

  async function loadLots() {
    const l = await api.getLots(sessionId)
    setLots(l)
  }

  async function addLot(e) {
    e.preventDefault()
    setError('')
    try {
      await api.addLot(sessionId, {
        ...lotForm,
        quantity: parseFloat(lotForm.quantity),
        base_price: parseFloat(lotForm.base_price),
        member_id: parseInt(lotForm.member_id),
      })
      setShowLotForm(false)
      setLotForm({ seafood_type: '', quantity: '', unit: 'kg', quality: '', base_price: '', member_id: '' })
      setSuccess('Lot eklendi')
      loadLots()
    } catch (err) {
      setError(err.message)
    }
  }

  async function action(fn, msg) {
    setError('')
    try {
      await fn()
      setSuccess(msg)
      loadAll()
    } catch (err) {
      setError(err.message)
    }
  }

  const activeLot = lots.find((l) => l.status === 'active')
  const activeLotBids = activeLot ? (bids[activeLot.id] || []) : []
  const highestBid = activeLotBids[0]?.amount

  if (!session) return <div className="loading">Yükleniyor...</div>

  return (
    <div className="page">
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
        <Link to="/admin" style={{ color: '#4a5568', textDecoration: 'none' }}>← Geri</Link>
        <h1 className="page-title" style={{ margin: 0 }}>İhale: {session.date}</h1>
        <span className={`badge badge-${session.status}`}>
          {session.status === 'pending' ? 'Bekliyor' : session.status === 'active' ? 'Aktif' : 'Tamamlandı'}
        </span>
      </div>

      {error && <div className="alert alert-error">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}

      {/* Session controls */}
      <div className="card">
        <div className="card-title">İhale Kontrol</div>
        <div className="actions-row">
          {session.status === 'pending' && (
            <button className="btn btn-success" onClick={() => action(() => api.startAuction(sessionId), 'İhale başlatıldı!')}>
              🔔 İhaleyi Başlat
            </button>
          )}
          {session.status === 'active' && (
            <>
              {activeLot && (
                <>
                  <button className="btn btn-primary" onClick={() => action(() => api.sellLot(activeLot.id), 'Lot satıldı!')}
                    disabled={!highestBid}>
                    ✅ Sat ({highestBid ? `${highestBid} TL` : 'Teklif yok'})
                  </button>
                  <button className="btn btn-warning" onClick={() => action(() => api.markUnsold(activeLot.id), 'Lot satılmadı olarak işaretlendi')}>
                    ❌ Satılmadı
                  </button>
                </>
              )}
              <button className="btn btn-danger" onClick={() => {
                if (confirm('İhaleyi tamamlamak istediğinizden emin misiniz?'))
                  action(() => api.completeAuction(sessionId), 'İhale tamamlandı')
              }}>
                İhaleyi Bitir
              </button>
            </>
          )}
          {session.status === 'completed' && (
            <Link to={`/admin/sessions/${sessionId}/payments`}>
              <button className="btn btn-primary">💰 Ödemeleri Gör</button>
            </Link>
          )}
        </div>
      </div>

      {/* Active lot bids */}
      {activeLot && (
        <div className="auction-live">
          <div className="auction-live-header">
            <div className="live-dot" />
            <strong>Aktif Lot: {activeLot.seafood_type} — {activeLot.quantity} {activeLot.unit}</strong>
          </div>
          <div style={{ display: 'flex', gap: '2rem', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: '0.8rem', color: '#4a5568' }}>Taban Fiyat</div>
              <div style={{ fontWeight: 700 }}>{activeLot.base_price} TL</div>
            </div>
            <div>
              <div style={{ fontSize: '0.8rem', color: '#4a5568' }}>En Yüksek Teklif</div>
              <div className="current-lot-price">{highestBid ? `${highestBid} TL` : '—'}</div>
            </div>
            {highestBid && (
              <div>
                <div style={{ fontSize: '0.8rem', color: '#4a5568' }}>Teklif Veren</div>
                <div style={{ fontWeight: 700 }}>{activeLotBids[0]?.customer?.name}</div>
              </div>
            )}
          </div>
          {activeLotBids.length > 0 && (
            <div style={{ marginTop: '0.75rem' }}>
              <div style={{ fontWeight: 700, fontSize: '0.85rem', marginBottom: '0.4rem' }}>Tüm Teklifler</div>
              <ul className="bids-list">
                {activeLotBids.map((b) => (
                  <li key={b.id}>
                    <span>{b.customer.name}</span>
                    <span className="bid-amount">{b.amount} TL</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Lots table */}
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <div className="card-title" style={{ margin: 0 }}>Lotlar</div>
          {session.status !== 'completed' && (
            <button className="btn btn-primary btn-sm" onClick={() => setShowLotForm(!showLotForm)}>
              + Lot Ekle
            </button>
          )}
        </div>

        {showLotForm && (
          <form onSubmit={addLot} style={{ background: '#f7fafc', padding: '1rem', borderRadius: '8px', marginBottom: '1rem' }}>
            <div className="form-row">
              <div className="form-group">
                <label>Ürün Türü</label>
                <input value={lotForm.seafood_type} onChange={(e) => setLotForm({ ...lotForm, seafood_type: e.target.value })} required placeholder="Levrek, Dil, Kalamar..." />
              </div>
              <div className="form-group">
                <label>Kaptan (Üye)</label>
                <select value={lotForm.member_id} onChange={(e) => setLotForm({ ...lotForm, member_id: e.target.value })} required>
                  <option value="">Seçiniz</option>
                  {members.map((m) => (
                    <option key={m.id} value={m.id}>{m.boat_name} ({m.name})</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Miktar</label>
                <input type="number" step="0.1" value={lotForm.quantity} onChange={(e) => setLotForm({ ...lotForm, quantity: e.target.value })} required placeholder="1.5" />
              </div>
              <div className="form-group">
                <label>Birim</label>
                <select value={lotForm.unit} onChange={(e) => setLotForm({ ...lotForm, unit: e.target.value })}>
                  <option value="kg">kg</option>
                  <option value="adet">adet</option>
                </select>
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Kalite</label>
                <input value={lotForm.quality} onChange={(e) => setLotForm({ ...lotForm, quality: e.target.value })} placeholder="1. kalite, taze..." />
              </div>
              <div className="form-group">
                <label>Taban Fiyat (TL)</label>
                <input type="number" step="0.5" value={lotForm.base_price} onChange={(e) => setLotForm({ ...lotForm, base_price: e.target.value })} required placeholder="90" />
              </div>
            </div>
            <div className="actions-row">
              <button className="btn btn-success btn-sm" type="submit">Ekle</button>
              <button className="btn btn-secondary btn-sm" type="button" onClick={() => setShowLotForm(false)}>İptal</button>
            </div>
          </form>
        )}

        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>Ürün</th>
                <th>Miktar</th>
                <th>Kalite</th>
                <th>Taban</th>
                <th>Satış</th>
                <th>Kaptan</th>
                <th>Durum</th>
                {session.status === 'active' && <th>İşlem</th>}
              </tr>
            </thead>
            <tbody>
              {lots.map((lot, i) => (
                <tr key={lot.id} style={lot.status === 'active' ? { background: '#f0fff4', fontWeight: 700 } : {}}>
                  <td>{i + 1}</td>
                  <td>{lot.seafood_type}</td>
                  <td>{lot.quantity} {lot.unit}</td>
                  <td>{lot.quality || '-'}</td>
                  <td>{lot.base_price} TL</td>
                  <td>{lot.sold_price ? `${lot.sold_price} TL` : '-'}</td>
                  <td>{lot.member?.boat_name || lot.member?.name}</td>
                  <td><span className={`badge badge-${lot.status}`}>{statusLabel(lot.status)}</span></td>
                  {session.status === 'active' && (
                    <td>
                      {lot.status === 'pending' || lot.status === 'unsold' ? (
                        <button className="btn btn-primary btn-sm" onClick={() => action(() => api.activateLot(lot.id), 'Lot aktif edildi')}>
                          Başlat
                        </button>
                      ) : lot.status === 'pending' && session.status === 'pending' ? (
                        <button className="btn btn-danger btn-sm" onClick={() => action(() => api.deleteLot(lot.id), 'Lot silindi')}>
                          Sil
                        </button>
                      ) : null}
                    </td>
                  )}
                </tr>
              ))}
              {lots.length === 0 && (
                <tr><td colSpan={9} style={{ textAlign: 'center', color: '#718096' }}>Henüz lot yok</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
