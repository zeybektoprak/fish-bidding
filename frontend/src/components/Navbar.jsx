import { Link, useNavigate } from 'react-router-dom'

export default function Navbar({ user, onLogout }) {
  const navigate = useNavigate()

  function handleLogout() {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    onLogout()
    navigate('/login')
  }

  return (
    <nav className="navbar">
      <Link to="/" className="navbar-brand">
        🐟 Balıklıova İhalesi
      </Link>
      <div className="navbar-links">
        <Link to="/">Açık Artırma</Link>
        {user?.role === 'admin' && <Link to="/admin">Yönetim</Link>}
        {user ? (
          <>
            <span style={{ color: '#bee3f8', fontSize: '0.85rem' }}>
              {user.name} ({user.role === 'admin' ? 'Admin' : user.role === 'member' ? 'Üye' : 'Müşteri'})
            </span>
            <button className="btn btn-outline btn-sm" onClick={handleLogout}>
              Çıkış
            </button>
          </>
        ) : (
          <>
            <Link to="/login">Giriş</Link>
            <Link to="/register">
              <button className="btn btn-primary btn-sm">Kayıt Ol</button>
            </Link>
          </>
        )}
      </div>
    </nav>
  )
}
