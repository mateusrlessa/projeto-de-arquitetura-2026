import { createContext, useCallback, useContext, useMemo, useSyncExternalStore } from 'react'
import { useNavigate } from 'react-router-dom'
import { api, assinarSessao, lerSessao, salvarSessao } from '../lib/api.js'

const AuthContext = createContext(null)

function iniciarSessao({ token_acesso, usuario }) {
  salvarSessao({ token_acesso, usuario })
  return usuario
}

export function AuthProvider({ children }) {
  const sessao = useSyncExternalStore(assinarSessao, lerSessao)
  const navegar = useNavigate()

  const entrar = useCallback(async (email, senha) => {
    return iniciarSessao(await api('/auth/login', { method: 'POST', body: { email, senha }, auth: false }))
  }, [])

  const cadastrar = useCallback(
    async ({ nome, email, senha, tipo }) => {
      await api('/usuarios', {
        method: 'POST',
        body: { nome_completo: nome, email, senha, tipo_usuario: tipo },
        auth: false,
      })
      return entrar(email, senha)
    },
    [entrar],
  )

  // O backend valida a credencial com o Google e, no primeiro acesso, cria a conta com o tipo informado.
  const entrarComGoogle = useCallback(async (credencial, tipo) => {
    return iniciarSessao(
      await api('/auth/google', { method: 'POST', body: { credencial, tipo_usuario: tipo }, auth: false }),
    )
  }, [])

  const sair = useCallback(() => {
    const revogarSessao = api('/auth/logout', { method: 'POST' }).catch(() => {})
    salvarSessao(null)
    navegar('/', { replace: true })
    return revogarSessao
  }, [navegar])

  const recarregarUsuario = useCallback(async () => {
    if (!lerSessao()) return
    const usuario = await api('/auth/me')
    salvarSessao({ ...lerSessao(), usuario })
  }, [])

  const valor = useMemo(
    () => ({ usuario: sessao?.usuario ?? null, entrar, cadastrar, entrarComGoogle, sair, recarregarUsuario }),
    [sessao, entrar, cadastrar, entrarComGoogle, sair, recarregarUsuario],
  )

  return <AuthContext value={valor}>{children}</AuthContext>
}

export function useAuth() {
  const contexto = useContext(AuthContext)
  if (!contexto) throw new Error('useAuth precisa estar dentro de AuthProvider')
  return contexto
}
