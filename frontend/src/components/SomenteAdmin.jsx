import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'

// Protege as telas de administração. A API também confere o tipo de usuário em cada rota.
export default function SomenteAdmin() {
  const { usuario } = useAuth()
  const { pathname } = useLocation()

  if (!usuario) return <Navigate to="/acesso" replace state={{ voltarPara: pathname }} />
  if (usuario.tipo_usuario !== 'ADMIN') return <Navigate to="/" replace />
  return <Outlet />
}
