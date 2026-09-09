export default function Cookies() {
  return (
    <section className="section legal-page">
      <h1 className="section-title legal-title">Cookie Policy</h1>
      <p className="text-faint legal-updated">Last updated: September 9, 2026</p>

      <p className="text-muted">
        SpamShield uses exactly one cookie and one piece of local storage. Neither is used for
        advertising, cross-site tracking, or analytics, so the site does not show a cookie consent
        banner: both are either strictly necessary or a non-tracking local preference.
      </p>

      <h2 className="panel-title mono">Session cookie (strictly necessary)</h2>
      <p className="text-muted">
        When you log in, the backend sets one HttpOnly session cookie so the platform can recognize
        you on later requests. It is required for account features (history, batch results,
        feedback, settings) to work at all, cannot be read by page scripts, and is cleared when you
        log out. Because it is strictly necessary for a service you explicitly requested (signing
        in), it does not require consent under typical cookie-law exemptions.
      </p>

      <h2 className="panel-title mono">Local storage (preference, not a cookie)</h2>
      <p className="text-muted">
        Your browser stores your light/dark/system theme choice in local storage, on your device
        only. It is never transmitted to any server and does not identify or track you.
      </p>

      <h2 className="panel-title mono">What SpamShield does not use</h2>
      <p className="text-muted">
        No analytics cookies, no advertising cookies, no third-party tracking cookies, and no
        social-media embeds are used anywhere on this site.
      </p>

      <h2 className="panel-title mono">Managing cookies and local storage</h2>
      <p className="text-muted">
        You can clear the session cookie at any time by logging out, or by clearing cookies for
        this site in your browser settings (this will sign you out). Clearing local storage will
        reset your theme choice to "system." Blocking cookies entirely will prevent you from
        staying signed in.
      </p>
    </section>
  )
}
