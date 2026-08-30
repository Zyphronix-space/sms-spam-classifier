function Row({ label, ok }) {
  return (
    <li>
      <span>{label}</span>
      <span className={ok ? 'text-success' : 'text-accent'}>
        <span className={`status-dot ${ok ? 'status-dot--ok' : 'status-dot--down'}`} aria-hidden="true" />
        {ok ? 'ONLINE' : 'OFFLINE'}
      </span>
    </li>
  )
}

export default function SystemStatus({ health }) {
  const gatewayOk = health?.gateway === 'online'
  const backendOk = health?.backend === 'online'
  const dbOk = health?.database === 'connected'

  return (
    <section className="panel status" aria-labelledby="status-heading">
      <h2 id="status-heading" className="panel-title mono">
        SYSTEM STATUS
      </h2>
      <ul className="status-list mono">
        <Row label="GATEWAY" ok={gatewayOk} />
        <Row label="BACKEND" ok={backendOk} />
        <Row label="ML ENGINE" ok={backendOk} />
        <Row label="DATABASE" ok={dbOk} />
      </ul>

      <div className="divider" />

      <h3 className="panel-subtitle mono">GATEWAY SECURITY</h3>
      <ul className="status-list mono">
        <li>
          <span>API AUTH</span>
          <span className="text-success">ACTIVE</span>
        </li>
        <li>
          <span>REQUEST VALIDATION</span>
          <span className="text-success">ACTIVE</span>
        </li>
        <li>
          <span>UPSTREAM FORWARDING</span>
          <span className="text-success">ACTIVE</span>
        </li>
      </ul>
      <p className="text-faint">Architecture capabilities enforced by the gateway, not live per-request measurements.</p>
    </section>
  )
}
