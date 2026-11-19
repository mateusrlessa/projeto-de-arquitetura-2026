import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'

// Protege as telas de qualquer usuário logado. Quem não entrou volta para cá depois do login.
export default function SomenteLogado() {
  const { usuario } = useAuth()
  const { pathname } = useLocation()

  if (!usuario) return <Navigate to="/acesso" replace state={{ voltarPara: pathname }} />
  return <Outlet />
}
