import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { api } from '../api'

export default function Register({ onLogin }) {
  const [form, setForm] = useState({
    name: '', email: '', password: '', phone: '', address: '',
  })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const data = await api.register(form)
      localStorage.setItem('token', data.access_token)
      localStorage.setItem('user', JSON.stringify(data.user))
      onLogin(data.user)
      navigate('/')
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  function set(key) {
    return (e) => setForm({ ...form, [key]: e.target.value })
  }

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h1>Kayıt Ol</h1>
        <p>Açık artırmaya katılmak için hesap oluştur</p>
        {error && <div className="alert alert-error">{error}</div>}
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Ad Soyad</label>
            <input value={form.name} onChange={set('name')} required placeholder="Ahmet Yılmaz" />
          </div>
          <div className="form-group">
            <label>Email</label>
            <input type="email" value={form.email} onChange={set('email')} required placeholder="ornek@email.com" />
          </div>
          <div className="form-group">
            <label>Şifre</label>
            <input type="password" value={form.password} onChange={set('password')} required placeholder="En az 6 karakter" minLength={6} />
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Telefon</label>
              <input value={form.phone} onChange={set('phone')} placeholder="0532 xxx xx xx" />
            </div>
            <div className="form-group">
              <label>Adres</label>
              <input value={form.address} onChange={set('address')} placeholder="İlçe, Şehir" />
            </div>
          </div>
          <button className="btn btn-primary" type="submit" disabled={loading}>
            {loading ? 'Kayıt yapılıyor...' : 'Kayıt Ol'}
          </button>
        </form>
        <div className="auth-link">
          Zaten hesabın var mı? <Link to="/login">Giriş yap</Link>
        </div>
      </div>
    </div>
  )
}
