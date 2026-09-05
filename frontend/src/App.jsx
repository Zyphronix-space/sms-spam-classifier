import { Navigate, Route, Routes } from 'react-router-dom'
import './App.css'
import { ToastProvider } from './components/Toast'
import { RequireAdmin, RequireAuth, SessionProvider } from './lib/session'

import PublicLayout from './pages/public/PublicLayout'
import Landing from './pages/public/Landing'
import Features from './pages/public/Features'
import Login from './pages/public/Login'
import Signup from './pages/public/Signup'
import ForgotPassword from './pages/public/ForgotPassword'
import ResetPassword from './pages/public/ResetPassword'

import AppLayout from './pages/app/AppLayout'
import DashboardPage from './pages/app/DashboardPage'
import AnalyzePage from './pages/app/AnalyzePage'
import HistoryPage from './pages/app/HistoryPage'
import BatchPage from './pages/app/BatchPage'
import AnalyticsPage from './pages/app/AnalyticsPage'
import ModelPerformancePage from './pages/app/ModelPerformancePage'
import FeedbackPageRoute from './pages/app/FeedbackPageRoute'
import SettingsPage from './pages/app/SettingsPage'
import AdminPage from './pages/app/AdminPage'

function App() {
  return (
    <ToastProvider>
      <SessionProvider>
        <Routes>
          <Route element={<PublicLayout />}>
            <Route index element={<Landing />} />
            <Route path="features" element={<Features />} />
            <Route path="login" element={<Login />} />
            <Route path="signup" element={<Signup />} />
            <Route path="forgot-password" element={<ForgotPassword />} />
            <Route path="reset-password" element={<ResetPassword />} />
          </Route>

          <Route
            path="/app"
            element={
              <RequireAuth>
                <AppLayout />
              </RequireAuth>
            }
          >
            <Route index element={<Navigate to="dashboard" replace />} />
            <Route path="dashboard" element={<DashboardPage />} />
            <Route path="analyze" element={<AnalyzePage />} />
            <Route path="history" element={<HistoryPage />} />
            <Route path="batch" element={<BatchPage />} />
            <Route path="analytics" element={<AnalyticsPage />} />
            <Route path="model-performance" element={<ModelPerformancePage />} />
            <Route path="feedback" element={<FeedbackPageRoute />} />
            <Route path="settings" element={<SettingsPage />} />
            <Route
              path="admin"
              element={
                <RequireAdmin>
                  <AdminPage />
                </RequireAdmin>
              }
            />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </SessionProvider>
    </ToastProvider>
  )
}

export default App
