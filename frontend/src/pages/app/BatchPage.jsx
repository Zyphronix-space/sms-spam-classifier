import { useSession } from '../../lib/session'
import BatchScanner from '../../components/BatchScanner'

export default function BatchPage() {
  const { refreshData } = useSession()
  return <BatchScanner onSaved={refreshData} />
}
