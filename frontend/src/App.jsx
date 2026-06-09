import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import CVAnalyzerPage from './pages/CVAnalyzerPage'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<CVAnalyzerPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
