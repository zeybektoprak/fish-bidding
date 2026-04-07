import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api'

export default function AdminDashboard() {
  const [sessions, setSessions] = useState([])
  const [members, setMembers] = useState([])
  const [showSessionForm, setShowSessionForm] = useState(false)
  const [showMemberForm, setShowMemberForm] = useState(false)
  const [showInitAdmin, setShowInitAdmin] = useState(false)
  const [sessionForm, setSessionForm] = useState({ date: '', video_url: '' })
  const [memberForm, setMemberForm] = useState({ name: '', email: '', password: '', phone: '', boat_name: '' })
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    const [s, m] = await Promise.all([api.getSessions(), api.getMembers()])
    setSessions(s)
    setMembers(m)
  }

  async function createSession(e) {
    e.preventDefault()
    setError('')
    try {
      await api.createSession(sessionForm)
      setShowSessionForm(false)
      setSessionForm({ date: '', video_url: '' })
      setSuccess('Oturum oluşturuldu')
      loadData()
    } catch (err) {
      setError(err.message)
    }
  }

  async function createMember(e) {
    e.preventDefault()
    setError('')
    try {
      await api.createMember(memberForm)
      setShowMemberForm(false)
      setMemberForm({ name: '', email: '', password: '', phone: '', boat_name: '' })
      setSuccess('Üye eklendi')
      loadData()
    } catch (err) {
      setError(err.message)
    }
  }

  async function deleteMember(id) {
    if (!confirm('Bu üyeyi silmek istediğinizden emin misiniz?')) return
    try {
      await api.deleteMember(id)
      setSuccess('Üye silindi')
      loadData()
    } catch (err) {
      setError(err.message)
    }
  }

  function statusLabel(s) {
    if (s === 'pending') return 'Bekliyor'
    if (s === 'active') return 'Aktif'
    if (s === 'completed') return 'Tamamlandı'
    return s
  }

  return (
    <div className="page">
      <h1 className="page-title">⚙️ Yönetim Paneli</h1>

      {error && <div className="alert alert-error">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}

      {/* Stats */}
      <div className="grid-3" style={{ marginBottom: '1.5rem' }}>
        <div className="stat-card">
          <div className="stat-value">{sessions.length}</div>
          <div className="stat-label">Toplam İhale</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{sessions.filter((s) => s.status === 'active').length}</div>
          <div className="stat-label">Aktif İhale</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{members.length}</div>
          <div className="stat-label">Kooperatif Üyesi</div>
        </div>
      </div>

      {/* Sessions */}
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <div className="card-title" style={{ margin: 0 }}>İhale Oturumları</div>
          <button className="btn btn-primary btn-sm" onClick={() => setShowSessionForm(!showSessionForm)}>
            + Yeni İhale
          </button>
        </div>

        {showSessionForm && (
          <form onSubmit={createSession} style={{ background: '#f7fafc', padding: '1rem', borderRadius: '8px', marginBottom: '1rem' }}>
            <div className="form-row">
              <div className="form-group">
                <label>Tarih</label>
                <input
                  type="date"
                  value={sessionForm.date}
                  onChange={(e) => setSessionForm({ ...sessionForm, date: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label>Video Stream URL (opsiyonel)</label>
                <input
                  type="url"
                  value={sessionForm.video_url}
                  onChange={(e) => setSessionForm({ ...sessionForm, video_url: e.target.value })}
                  placeholder="YouTube embed URL"
                />
              </div>
            </div>
            <div className="actions-row">
              <button className="btn btn-success btn-sm" type="submit">Oluştur</button>
              <button className="btn btn-secondary btn-sm" type="button" onClick={() => setShowSessionForm(false)}>İptal</button>
            </div>
          </form>
        )}

        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Tarih</th>
                <th>Durum</th>
                <th>İşlemler</th>
              </tr>
            </thead>
            <tbody>
              {sessions.map((s) => (
                <tr key={s.id}>
                  <td>{s.date}</td>
                  <td><span className={`badge badge-${s.status}`}>{statusLabel(s.status)}</span></td>
                  <td>
                    <div className="actions-row">
                      <Link to={`/admin/sessions/${s.id}`}>
                        <button className="btn btn-primary btn-sm">Yönet</button>
                      </Link>
                      {s.status === 'completed' && (
                        <Link to={`/admin/sessions/${s.id}/payments`}>
                          <button className="btn btn-secondary btn-sm">Ödemeler</button>
                        </Link>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {sessions.length === 0 && (
                <tr><td colSpan={3} style={{ textAlign: 'center', color: '#718096' }}>Henüz ihale yok</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Members */}
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <div className="card-title" style={{ margin: 0 }}>Kooperatif Üyeleri</div>
          <button className="btn btn-primary btn-sm" onClick={() => setShowMemberForm(!showMemberForm)}>
            + Üye Ekle
          </button>
        </div>

        {showMemberForm && (
          <form onSubmit={createMember} style={{ background: '#f7fafc', padding: '1rem', borderRadius: '8px', marginBottom: '1rem' }}>
            <div className="form-row">
              <div className="form-group">
                <label>Ad Soyad</label>
                <input value={memberForm.name} onChange={(e) => setMemberForm({ ...memberForm, name: e.target.value })} required />
              </div>
              <div className="form-group">
                <label>Tekne Adı</label>
                <input value={memberForm.boat_name} onChange={(e) => setMemberForm({ ...memberForm, boat_name: e.target.value })} required placeholder="Gurkan Kaptan" />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Email</label>
                <input type="email" value={memberForm.email} onChange={(e) => setMemberForm({ ...memberForm, email: e.target.value })} required />
              </div>
              <div className="form-group">
                <label>Şifre</label>
                <input type="password" value={memberForm.password} onChange={(e) => setMemberForm({ ...memberForm, password: e.target.value })} required minLength={6} />
              </div>
            </div>
            <div className="form-group">
              <label>Telefon</label>
              <input value={memberForm.phone} onChange={(e) => setMemberForm({ ...memberForm, phone: e.target.value })} placeholder="0532 xxx xx xx" />
            </div>
            <div className="actions-row">
              <button className="btn btn-success btn-sm" type="submit">Ekle</button>
              <button className="btn btn-secondary btn-sm" type="button" onClick={() => setShowMemberForm(false)}>İptal</button>
            </div>
          </form>
        )}

        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Ad Soyad</th>
                <th>Tekne Adı</th>
                <th>Telefon</th>
                <th>Email</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {members.map((m) => (
                <tr key={m.id}>
                  <td>{m.name}</td>
                  <td>{m.boat_name}</td>
                  <td>{m.phone || '-'}</td>
                  <td>{m.email}</td>
                  <td>
                    <button className="btn btn-danger btn-sm" onClick={() => deleteMember(m.id)}>Sil</button>
                  </td>
                </tr>
              ))}
              {members.length === 0 && (
                <tr><td colSpan={5} style={{ textAlign: 'center', color: '#718096' }}>Henüz üye yok</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
