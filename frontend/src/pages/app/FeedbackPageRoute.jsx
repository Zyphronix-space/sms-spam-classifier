import { useNavigate } from 'react-router-dom'
import { useSession } from '../../lib/session'
import FeedbackPage from '../../components/FeedbackPage'

export default function FeedbackPageRoute() {
  const { dataRefreshKey } = useSession()
  const navigate = useNavigate()
  return <FeedbackPage refreshKey={dataRefreshKey} onOpenMessage={(id) => navigate(`/app/history?open=${id}`)} />
}
