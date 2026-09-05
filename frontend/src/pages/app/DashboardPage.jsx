import { useSession } from '../../lib/session'
import Dashboard from '../../components/Dashboard'

export default function DashboardPage() {
  const { dataRefreshKey } = useSession()
  return <Dashboard refreshKey={dataRefreshKey} />
}
