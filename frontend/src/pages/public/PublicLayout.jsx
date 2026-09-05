import { Outlet } from 'react-router-dom'
import GlassNavbar from '../../components/glass/GlassNavbar'

export default function PublicLayout() {
  return (
    <div className="public-shell">
      <GlassNavbar />
      <main className="public-main">
        <Outlet />
      </main>
      <footer className="public-footer mono">
        SPAMSHIELD · TF-IDF + Multinomial Naive Bayes · UCI SMS Spam Collection
      </footer>
    </div>
  )
}
