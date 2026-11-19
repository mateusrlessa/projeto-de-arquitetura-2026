import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'

export default function SomenteContratante() {
  const { usuario } = useAuth()
  const location = useLocation()
  const voltarPara = `${location.pathname}${location.search}${location.hash}`

  if (!usuario) return <Navigate to="/acesso" replace state={{ voltarPara }} />
  if (usuario.tipo_usuario !== 'CONTRATANTE') return <Navigate to="/" replace />
  return <Outlet />
}
