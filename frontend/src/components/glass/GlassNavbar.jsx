import { Link, useNavigate } from 'react-router-dom'
import GlassButton from './GlassButton'

// Public marketing nav — Landing/Features/Login/Signup. The authenticated
// shell uses GlassSidebar instead, not this.
export default function GlassNavbar() {
  const navigate = useNavigate()
  return (
    <header className="public-navbar mono">
      <Link to="/" className="public-navbar-brand">
        <span className="brand-mark" aria-hidden="true" />
        <div>
          <p className="public-navbar-brand-title">SPAMSHIELD</p>
          <p className="public-navbar-brand-subtitle">AI MESSAGE SECURITY</p>
        </div>
      </Link>
      <nav className="public-navbar-links" aria-label="Site">
        <Link to="/">Home</Link>
        <Link to="/features">Features</Link>
      </nav>
      <div className="public-navbar-actions">
        <GlassButton variant="ghost" onClick={() => navigate('/login')}>
          LOG IN
        </GlassButton>
        <GlassButton variant="primary" onClick={() => navigate('/signup')}>
          GET STARTED
        </GlassButton>
      </div>
    </header>
  )
}
