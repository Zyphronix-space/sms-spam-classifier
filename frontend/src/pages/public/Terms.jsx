export default function Terms() {
  return (
    <section className="section legal-page">
      <h1 className="section-title legal-title">Terms and Conditions</h1>
      <p className="text-faint legal-updated">Last updated: September 9, 2026</p>

      <p className="text-muted">
        SpamShield is an individual student portfolio project built and operated by Stephan
        Wasalathanthrige, demonstrating a full-stack SMS spam classification platform. It is not a
        commercial product, and these terms are written for a demo project, not a registered
        business. By creating an account or using the site, you agree to the terms below. This
        page is not a substitute for legal advice.
      </p>

      <h2 className="panel-title mono">Use of the platform</h2>
      <p className="text-muted">
        You may create an account, submit messages for classification, upload CSV files for batch
        analysis, and submit feedback on predictions. Accounts are personal; do not share your
        login credentials.
      </p>

      <h2 className="panel-title mono">Acceptable use</h2>
      <ul className="legal-list text-muted">
        <li>Do not submit unlawful content or content that infringes someone else's rights.</li>
        <li>Do not attempt to bypass the rate limiter, scrape the service at scale, or otherwise abuse the API.</li>
        <li>Do not attempt to gain unauthorized access to other accounts or the underlying infrastructure.</li>
      </ul>

      <h2 className="panel-title mono">Accuracy of predictions</h2>
      <p className="text-muted">
        Spam/ham predictions are produced by a Multinomial Naive Bayes model trained on the UCI SMS
        Spam Collection dataset. Model performance metrics shown in the app come from that
        evaluation run. No prediction is guaranteed to be correct, and the platform should not be
        relied on as the sole basis for a decision with real consequences.
      </p>

      <h2 className="panel-title mono">Intellectual property</h2>
      <p className="text-muted">
        The site's design, code, and the trained model are the author's work, built for portfolio
        purposes. The training dataset is the publicly available UCI SMS Spam Collection. You
        retain ownership of the message text you submit; by submitting it, you allow the platform
        to store and process it to provide the service back to you (classification, history,
        feedback tracking).
      </p>

      <h2 className="panel-title mono">Payments and refunds</h2>
      <p className="text-muted">This platform is free to use. It does not process payments, so no refund terms apply.</p>

      <h2 className="panel-title mono">Availability</h2>
      <p className="text-muted">
        This is a demo project, not a production service with an uptime guarantee. Features,
        availability, and hosting may change, pause, or be removed at any time without notice.
      </p>

      <h2 className="panel-title mono">Third-party services</h2>
      <p className="text-muted">
        The application is served through infrastructure the author manages: a FastAPI backend, a
        Ballerina API gateway, a PostgreSQL database, and static frontend hosting. No third-party
        analytics, advertising, or email-delivery service is used.
      </p>

      <h2 className="panel-title mono">Limitation of liability</h2>
      <p className="text-muted">
        The platform is provided "as is," without warranties of any kind. To the fullest extent
        permitted by law, the author is not liable for any loss or damage arising from use of the
        platform, including decisions made based on a classification result.
      </p>

      <h2 className="panel-title mono">Changes</h2>
      <p className="text-muted">
        These terms may be updated as the project changes. Continued use of the platform after a
        change constitutes acceptance of the updated terms.
      </p>

      <h2 className="panel-title mono">Governing law</h2>
      <p className="text-muted">
        These terms are intended to be interpreted under the laws of Sri Lanka, where the author
        is based. This has not been reviewed by a lawyer and should be confirmed before this
        project is used for anything beyond a personal portfolio demo.
      </p>

      <h2 className="panel-title mono">Contact</h2>
      <p className="text-muted">
        Questions about these terms: <a href="mailto:stephanwasalathanthrige@gmail.com">stephanwasalathanthrige@gmail.com</a>.
      </p>
    </section>
  )
}
