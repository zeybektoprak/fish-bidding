import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { api } from '../api'

export default function Payments() {
  const { id } = useParams()
  const [payments, setPayments] = useState([])
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([api.getPayments(id), api.getSession(id)]).then(([p, s]) => {
      setPayments(p)
      setSession(s)
      setLoading(false)
    })
  }, [id])

  const totalGross = payments.reduce((sum, p) => sum + p.gross_amount, 0)
  const totalNet = payments.reduce((sum, p) => sum + p.net_amount, 0)

  if (loading) return <div className="loading">Yükleniyor...</div>

  return (
    <div className="page">
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
        <Link to={`/admin/sessions/${id}`} style={{ color: '#4a5568', textDecoration: 'none' }}>← Geri</Link>
        <h1 className="page-title" style={{ margin: 0 }}>
          💰 Ödeme Özeti — {session?.date}
        </h1>
      </div>

      <div className="grid-2" style={{ marginBottom: '1.5rem' }}>
        <div className="stat-card">
          <div className="stat-value">{totalGross.toFixed(2)} TL</div>
          <div className="stat-label">Toplam Brüt Satış</div>
        </div>
        <div className="stat-card">
          <div className="stat-value" style={{ color: '#276749' }}>{totalNet.toFixed(2)} TL</div>
          <div className="stat-label">Toplam Net (Vergi Sonrası)</div>
        </div>
      </div>

      <div className="card">
        <div className="card-title">Kaptan Bazında Ödemeler (%18 KDV Hariç)</div>
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Kaptan</th>
                <th>Tekne</th>
                <th>Satılan Lot</th>
                <th>Brüt Tutar</th>
                <th>Vergi (%18)</th>
                <th>Net Tutar</th>
              </tr>
            </thead>
            <tbody>
              {payments.map((p) => (
                <tr key={p.member.id}>
                  <td>{p.member.name}</td>
                  <td>{p.member.boat_name || '-'}</td>
                  <td style={{ textAlign: 'center' }}>{p.lots_sold}</td>
                  <td>{p.gross_amount.toFixed(2)} TL</td>
                  <td style={{ color: '#c53030' }}>- {p.tax_amount.toFixed(2)} TL</td>
                  <td style={{ fontWeight: 700, color: '#276749' }}>{p.net_amount.toFixed(2)} TL</td>
                </tr>
              ))}
              {payments.length === 0 && (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', color: '#718096' }}>
                    Henüz satılan ürün yok
                  </td>
                </tr>
              )}
            </tbody>
            {payments.length > 0 && (
              <tfoot>
                <tr style={{ background: '#edf2f7', fontWeight: 700 }}>
                  <td colSpan={3}>TOPLAM</td>
                  <td>{totalGross.toFixed(2)} TL</td>
                  <td style={{ color: '#c53030' }}>- {(totalGross - totalNet).toFixed(2)} TL</td>
                  <td style={{ color: '#276749' }}>{totalNet.toFixed(2)} TL</td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>
    </div>
  )
}
