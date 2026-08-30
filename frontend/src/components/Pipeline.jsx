export default function Pipeline({ health }) {
  const gatewayOk = health?.gateway === 'online'
  const backendOk = health?.backend === 'online'
  const dbOk = health?.database === 'connected'

  return (
    <section className="panel pipeline" aria-labelledby="pipeline-heading">
      <h2 id="pipeline-heading" className="panel-title mono">
        REQUEST PIPELINE
      </h2>
      <div className="pipeline-diagram mono">
        <div className={`pipeline-node ${gatewayOk ? 'pipeline-node--ok' : 'pipeline-node--down'}`}>REACT</div>
        <div className="pipeline-arrow" aria-hidden="true">
          ↓
        </div>
        <div className={`pipeline-node ${gatewayOk ? 'pipeline-node--ok' : 'pipeline-node--down'}`}>
          BALLERINA GATEWAY
          <span className="pipeline-node-detail">API KEY · VALIDATION</span>
        </div>
        <div className="pipeline-arrow" aria-hidden="true">
          ↓
        </div>
        <div className={`pipeline-node ${backendOk ? 'pipeline-node--ok' : 'pipeline-node--down'}`}>FASTAPI</div>
        <div className="pipeline-arrow" aria-hidden="true">
          ↓
        </div>
        <div className="pipeline-branch-row">
          <div className={`pipeline-node pipeline-node--sub ${backendOk ? 'pipeline-node--ok' : 'pipeline-node--down'}`}>
            ML ENGINE
            <span className="pipeline-node-detail">TF-IDF → NAIVE BAYES</span>
          </div>
          <div className={`pipeline-node pipeline-node--sub ${dbOk ? 'pipeline-node--ok' : 'pipeline-node--down'}`}>
            POSTGRESQL
            <span className="pipeline-node-detail">USERS · SCANS · MODEL METADATA</span>
          </div>
        </div>
        <div className="pipeline-arrow" aria-hidden="true">
          ↓
        </div>
        <div className="pipeline-node pipeline-node--final">PREDICTION</div>
      </div>
      <p className="text-faint">
        The gateway checks the API key and validates the request body before forwarding to FastAPI, which runs
        inference and — for logged-in users — persists scan metadata to PostgreSQL. This diagram summarizes the
        real architecture; it is not a live per-request trace.
      </p>
    </section>
  )
}
