import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Alerta } from '../components/Icones.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import { api } from '../lib/api.js'
import { lerTokenDoLink } from '../lib/validacao.js'

export default function VerificarEmail() {
  const { hash } = useLocation()
  const token = lerTokenDoLink(hash)
  const { usuario, recarregarUsuario } = useAuth()

  const [enviando, setEnviando] = useState(false)
  const [concluido, setConcluido] = useState(false)
  const [erro, setErro] = useState(token ? '' : 'Este link é inválido ou expirou.')
  const [linkValido, setLinkValido] = useState(Boolean(token))

  // A confirmação depende de um clique, e não de só abrir a página: verificadores de e-mail abrem os
  // links sozinhos e confirmariam uma conta criada por outra pessoa com este endereço.
  async function confirmar() {
    setErro('')
    setEnviando(true)
    try {
      await api('/auth/verificacao-email/confirmar', { method: 'POST', body: { token }, auth: false })
      setConcluido(true)
      await recarregarUsuario().catch(() => {})
    } catch (falha) {
      setErro(falha.message)
      if (falha.status === 400) setLinkValido(false)
    } finally {
      setEnviando(false)
    }
  }

  return (
    <section className="mx-auto max-w-md rounded-2xl border border-borda bg-white p-6 sm:p-8">
      <h1 className="mb-3 font-titulo text-2xl font-bold">Confirmar e-mail</h1>

      {erro && (
        <div className="space-y-4">
          <p role="alert" className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700">
            <Alerta tamanho={18} className="mt-0.5 shrink-0" /> {erro}
          </p>
          <p className="text-sm text-suave">
            {usuario ? 'Peça um novo link no aviso no topo da página.' : 'Entre na sua conta para pedir um novo link.'}
          </p>
        </div>
      )}

      {concluido ? (
        <div className="space-y-5">
          <p role="status" className="text-sm text-suave">Seu e-mail foi confirmado. Obrigado!</p>
          <Link to={usuario ? '/cuidadores' : '/acesso'} className="flex h-12 items-center justify-center rounded-xl bg-marca font-semibold text-white transition hover:bg-marca-escura">
            {usuario ? 'Continuar' : 'Ir para o login'}
          </Link>
        </div>
      ) : (
        linkValido && (
          <div className="mt-3 space-y-5">
            <p className="text-sm text-suave">Clique no botão para confirmar que este e-mail é seu. Se você não criou uma conta no CuidaAqui, feche esta página.</p>
            <button
              type="button"
              onClick={confirmar}
              disabled={enviando}
              className="h-12 w-full rounded-xl bg-marca font-semibold text-white transition hover:bg-marca-escura disabled:opacity-70"
            >
              {enviando ? 'Confirmando…' : 'Confirmar meu e-mail'}
            </button>
          </div>
        )
      )}
    </section>
  )
}
