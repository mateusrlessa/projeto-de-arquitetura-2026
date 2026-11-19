import { useState } from 'react'
import { useAuth } from '../context/AuthContext.jsx'
import { api } from '../lib/api.js'

// Lembra quem ainda não confirmou o e-mail e permite pedir um novo link.
export default function AvisoEmail() {
  const { usuario } = useAuth()
  const [mensagem, setMensagem] = useState('')
  const [enviando, setEnviando] = useState(false)

  // Administradores são criados por outro admin ou pelo .env, então não precisam confirmar o e-mail.
  if (!usuario || usuario.email_verificado_em || usuario.tipo_usuario === 'ADMIN') return null

  async function reenviar() {
    setEnviando(true)
    try {
      const resposta = await api('/auth/verificacao-email/solicitar', { method: 'POST' })
      setMensagem(resposta.mensagem)
    } catch (falha) {
      setMensagem(falha.message)
    } finally {
      setEnviando(false)
    }
  }

  return (
    <p className="bg-marca-clara px-5 py-2 text-center text-xs text-marca-escura">
      {mensagem || `Confirme seu e-mail pelo link que enviamos para ${usuario.email}.`}{' '}
      {!mensagem && (
        <button type="button" onClick={reenviar} disabled={enviando} className="font-semibold underline disabled:opacity-70">
          {enviando ? 'Enviando…' : 'Reenviar link'}
        </button>
      )}
    </p>
  )
}
