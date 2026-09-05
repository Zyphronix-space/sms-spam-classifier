import { useSearchParams } from 'react-router-dom'
import { useSession } from '../../lib/session'
import MessageHistory from '../../components/MessageHistory'

export default function HistoryPage() {
  const { dataRefreshKey } = useSession()
  const [searchParams, setSearchParams] = useSearchParams()
  const openMessageId = searchParams.get('open')

  return (
    <MessageHistory
      refreshKey={dataRefreshKey}
      openMessageId={openMessageId}
      onOpenedMessage={() => setSearchParams({}, { replace: true })}
    />
  )
}
