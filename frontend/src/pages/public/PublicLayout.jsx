import { Link, Outlet } from 'react-router-dom'
import GlassNavbar from '../../components/glass/GlassNavbar'

export default function PublicLayout() {
  return (
    <div className="public-shell">
      <GlassNavbar />
      <main className="public-main">
        <Outlet />
      </main>
      <footer className="public-footer mono">
        <p>SPAMSHIELD &middot; TF-IDF + Multinomial Naive Bayes &middot; UCI SMS Spam Collection</p>
        <nav className="public-footer-links" aria-label="Legal">
          <Link to="/privacy">Privacy Policy</Link>
          <Link to="/terms">Terms and Conditions</Link>
          <Link to="/cookies">Cookie Policy</Link>
        </nav>
      </footer>
    </div>
  )
}
