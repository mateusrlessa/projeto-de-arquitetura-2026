import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'

// Protege as telas do cuidador. Quem não entrou volta para cá depois do login.
export default function SomenteCuidador() {
  const { usuario } = useAuth()
  const { pathname } = useLocation()

  if (!usuario) return <Navigate to="/acesso" replace state={{ voltarPara: pathname }} />
  if (usuario.tipo_usuario !== 'CUIDADOR') return <Navigate to="/" replace />
  return <Outlet />
}
