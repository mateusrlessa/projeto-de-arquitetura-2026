import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'

export default function SomenteParticipante() {
  const { usuario } = useAuth()
  const location = useLocation()
  const voltarPara = `${location.pathname}${location.search}${location.hash}`

  if (!usuario) return <Navigate to="/acesso" replace state={{ voltarPara }} />
  if (!['CONTRATANTE', 'CUIDADOR'].includes(usuario.tipo_usuario)) return <Navigate to="/" replace />
  return <Outlet />
}
