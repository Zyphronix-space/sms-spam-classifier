import { Link } from 'react-router-dom'

export default function Privacy() {
  return (
    <section className="section legal-page">
      <h1 className="section-title legal-title">Privacy Policy</h1>
      <p className="text-faint legal-updated">Last updated: September 9, 2026</p>

      <p className="text-muted">
        SpamShield is an individual student portfolio project built and operated by Stephan
        Wasalathanthrige, not a registered company. This page explains what personal information
        the platform collects, why, and what you can do about it. Contact:{' '}
        <a href="mailto:stephanwasalathanthrige@gmail.com">stephanwasalathanthrige@gmail.com</a>.
      </p>

      <h2 className="panel-title mono">Information we collect</h2>
      <ul className="legal-list text-muted">
        <li>
          <strong>Account information:</strong> the email address and password you register with.
          Your password is hashed and is never stored or transmitted in plain text.
        </li>
        <li>
          <strong>Message content:</strong> any SMS text you submit through Analyze, Batch
          Analysis, or edit in History, so it can be classified and, if you are signed in, saved
          to your account.
        </li>
        <li>
          <strong>Feedback:</strong> any correction you submit marking a prediction as correct or
          incorrect, and what the actual classification should have been.
        </li>
        <li>
          <strong>Uploaded files:</strong> CSV files you upload for batch analysis, processed to
          produce your results.
        </li>
      </ul>

      <h2 className="panel-title mono">Why we collect it</h2>
      <p className="text-muted">
        Each item above exists to run a specific feature you use directly: signing in, saving and
        searching your message history, running batch scans, and the feedback loop that shows you
        your own self-reported accuracy. Nothing is collected for advertising or resold to anyone.
      </p>

      <h2 className="panel-title mono">Technical information</h2>
      <p className="text-muted">
        Login, registration, and password-reset requests are rate-limited by IP address to block
        automated abuse. The IP address is held only in the server's memory for this purpose,
        is never written to the database, and clears automatically after the rate-limit window
        or on server restart.
      </p>

      <h2 className="panel-title mono">Cookies and local storage</h2>
      <p className="text-muted">
        The platform sets one cookie: an HttpOnly session cookie used to keep you signed in. It is
        strictly necessary for the account features to work and carries no tracking or analytics
        purpose. Your browser also stores your light/dark theme choice in local storage on your
        own device; it is never sent to any server. See the{' '}
        <Link to="/cookies">Cookie Policy</Link> for details.
      </p>

      <h2 className="panel-title mono">Third parties</h2>
      <p className="text-muted">
        SpamShield does not use analytics, advertising, or tracking scripts, and does not share
        data with any third party. No email delivery provider is configured for this project: the
        password-reset link is shown directly in the app instead of being emailed (labeled "demo
        mode" on that screen). The application runs on infrastructure the author manages (backend
        API and database) and static hosting for the frontend.
      </p>

      <h2 className="panel-title mono">Data retention</h2>
      <p className="text-muted">
        Your messages, feedback, and account remain stored until you remove them. You can delete
        individual messages from History, and you can permanently delete your account and all
        associated data at any time from Settings &gt; Security.
      </p>

      <h2 className="panel-title mono">Data security</h2>
      <p className="text-muted">
        Passwords are hashed, the session cookie is HttpOnly and scoped with SameSite protection,
        and authentication routes are rate-limited. This is a student portfolio project and has
        not undergone a professional third-party security audit; treat it as a demo, not a
        production system for sensitive information.
      </p>

      <h2 className="panel-title mono">Your rights</h2>
      <p className="text-muted">
        You can view and correct your data directly in the product (edit or delete messages,
        change your password) and delete your account and all associated data at any time from
        Settings. For any other request about your data, contact{' '}
        <a href="mailto:stephanwasalathanthrige@gmail.com">stephanwasalathanthrige@gmail.com</a>.
      </p>

      <h2 className="panel-title mono">Children</h2>
      <p className="text-muted">This project is not directed at children and is not designed to collect data from them.</p>

      <h2 className="panel-title mono">Changes to this policy</h2>
      <p className="text-muted">
        This policy may be updated as the project changes. Material changes will be reflected on
        this page with an updated date above.
      </p>
    </section>
  )
}
