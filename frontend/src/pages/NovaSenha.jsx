import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import CampoSenha from '../components/CampoSenha.jsx'
import { api, salvarSessao } from '../lib/api.js'
import { erroNovaSenha, lerTokenDoLink } from '../lib/validacao.js'
import { LinkInvalido } from './RecuperarSenha.jsx'

export default function NovaSenha() {
  const { hash } = useLocation()
  const token = lerTokenDoLink(hash)

  const [senha, setSenha] = useState('')
  const [confirmar, setConfirmar] = useState('')
  const [erros, setErros] = useState({})
  const [enviando, setEnviando] = useState(false)
  const [estado, setEstado] = useState(token ? 'formulario' : 'invalido')
  const [erroLink, setErroLink] = useState()

  async function enviar(e) {
    e.preventDefault()
    const encontrados = {}
    const erroSenha = erroNovaSenha(senha)
    if (erroSenha) encontrados.senha = erroSenha
    if (confirmar !== senha) encontrados.confirmar = 'As senhas não conferem'
    setErros(encontrados)
    if (Object.keys(encontrados).length) return

    setEnviando(true)
    try {
      await api('/auth/recuperacao-senha/confirmar', { method: 'POST', body: { token, senha }, auth: false })
      // O backend encerra todas as sessões da conta, inclusive a deste navegador.
      salvarSessao(null)
      setEstado('concluido')
    } catch (falha) {
      if (falha.status === 400 && !falha.campos.senha) {
        setErroLink(falha.message)
        setEstado('invalido')
      } else {
        setErros({ senha: falha.campos.senha ?? falha.message })
      }
    } finally {
      setEnviando(false)
    }
  }

  return (
    <section className="mx-auto max-w-md rounded-2xl border border-borda bg-white p-6 sm:p-8">
      <h1 className="mb-3 font-titulo text-2xl font-bold">Criar nova senha</h1>

      {estado === 'invalido' && <LinkInvalido mensagem={erroLink} />}

      {estado === 'concluido' && (
        <div className="space-y-5">
          <p role="status" className="text-sm text-suave">Sua senha foi redefinida. Entre novamente com a nova senha.</p>
          <Link to="/acesso" className="flex h-12 items-center justify-center rounded-xl bg-marca font-semibold text-white transition hover:bg-marca-escura">
            Ir para o login
          </Link>
        </div>
      )}

      {estado === 'formulario' && (
        <form onSubmit={enviar} noValidate className="space-y-5">
          <CampoSenha
            rotulo="Nova senha"
            erro={erros.senha}
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
            autoComplete="new-password"
            placeholder="Mínimo de 8 caracteres"
          />

          <CampoSenha
            rotulo="Confirmar nova senha"
            erro={erros.confirmar}
            value={confirmar}
            onChange={(e) => setConfirmar(e.target.value)}
            autoComplete="new-password"
            placeholder="Repita a senha"
          />

          <button
            type="submit"
            disabled={enviando}
            className="h-12 w-full rounded-xl bg-marca font-semibold text-white transition hover:bg-marca-escura disabled:opacity-70"
          >
            {enviando ? 'Salvando…' : 'Salvar nova senha'}
          </button>
        </form>
      )}
    </section>
  )
}
