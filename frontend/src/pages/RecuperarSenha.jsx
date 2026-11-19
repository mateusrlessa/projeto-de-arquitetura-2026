import { useState } from 'react'
import { Link } from 'react-router-dom'
import Campo, { estiloInput } from '../components/Campo.jsx'
import { Alerta } from '../components/Icones.jsx'
import { api } from '../lib/api.js'
import { EMAIL } from '../lib/validacao.js'

export default function RecuperarSenha() {
  const [email, setEmail] = useState('')
  const [erro, setErro] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [resposta, setResposta] = useState('')

  async function enviar(e) {
    e.preventDefault()
    if (!EMAIL.test(email.trim())) {
      setErro('Informe um e-mail válido')
      return
    }

    setErro('')
    setEnviando(true)
    try {
      const { mensagem } = await api('/auth/recuperacao-senha/solicitar', {
        method: 'POST',
        body: { email: email.trim().toLowerCase() },
        auth: false,
      })
      setResposta(mensagem)
    } catch (falha) {
      setErro(falha.message)
    } finally {
      setEnviando(false)
    }
  }

  return (
    <section className="mx-auto max-w-md rounded-2xl border border-borda bg-white p-6 sm:p-8">
      <h1 className="font-titulo text-2xl font-bold">Recuperar senha</h1>

      {resposta ? (
        <div className="mt-3 space-y-5">
          <p role="status" className="text-sm text-suave">
            {resposta} Confira também a caixa de spam.
          </p>
          <Link to="/acesso" className="block text-sm font-semibold text-marca hover:text-marca-escura">
            Voltar para o login
          </Link>
        </div>
      ) : (
        <form onSubmit={enviar} noValidate className="mt-3 space-y-5">
          <p className="text-sm text-suave">Informe o e-mail da sua conta para receber um link de redefinição de senha.</p>

          <Campo rotulo="E-mail" erro={erro}>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              placeholder="seu@email.com"
              className={estiloInput(erro)}
            />
          </Campo>

          <button
            type="submit"
            disabled={enviando}
            className="h-12 w-full rounded-xl bg-marca font-semibold text-white transition hover:bg-marca-escura disabled:opacity-70"
          >
            {enviando ? 'Enviando…' : 'Enviar link'}
          </button>

          <Link to="/acesso" className="block text-center text-sm font-semibold text-marca hover:text-marca-escura">
            Voltar para o login
          </Link>
        </form>
      )}
    </section>
  )
}

// Reaproveitado pela tela de nova senha quando o link não serve mais.
export function LinkInvalido({ mensagem = 'Este link é inválido ou expirou.' }) {
  return (
    <div className="space-y-5">
      <p role="alert" className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700">
        <Alerta tamanho={18} className="mt-0.5 shrink-0" /> {mensagem}
      </p>
      <Link to="/recuperar-senha" className="block text-sm font-semibold text-marca hover:text-marca-escura">
        Solicitar um novo link
      </Link>
    </div>
  )
}
