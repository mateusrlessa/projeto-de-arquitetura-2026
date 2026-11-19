import { useState } from 'react'
import { Link } from 'react-router-dom'
import Campo, { estiloInput } from '../components/Campo.jsx'
import { TituloPagina } from '../components/Cartao.jsx'
import CampoSenha from '../components/CampoSenha.jsx'
import { Alerta, Check, Escudo } from '../components/Icones.jsx'
import { api } from '../lib/api.js'
import { EMAIL, erroNovaSenha } from '../lib/validacao.js'

const VAZIO = { nome: '', email: '', senha: '', confirmar: '' }

function validar(campos) {
  const erros = {}
  if (campos.nome.trim().length < 3) erros.nome = 'Informe o nome completo'
  if (!EMAIL.test(campos.email.trim())) erros.email = 'Informe um e-mail válido'
  const erroSenha = erroNovaSenha(campos.senha)
  if (erroSenha) erros.senha = erroSenha
  if (campos.confirmar !== campos.senha) erros.confirmar = 'As senhas não conferem'
  return erros
}

export default function AdminNovoAdmin() {
  const [campos, setCampos] = useState(VAZIO)
  const [erros, setErros] = useState({})
  const [erroGeral, setErroGeral] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [criado, setCriado] = useState(null)

  const alterar = (campo) => (e) => {
    setCampos((c) => ({ ...c, [campo]: e.target.value }))
    setErros((x) => ({ ...x, [campo]: undefined }))
  }

  async function enviar(e) {
    e.preventDefault()
    const encontrados = validar(campos)
    setErros(encontrados)
    setErroGeral('')
    setCriado(null)
    if (Object.keys(encontrados).length) return

    setEnviando(true)
    try {
      // Não usa cadastrar() do AuthContext: ele entraria na conta nova e tiraria o admin atual da sessão.
      const novo = await api('/usuarios', {
        method: 'POST',
        body: {
          nome_completo: campos.nome.trim(),
          email: campos.email.trim().toLowerCase(),
          senha: campos.senha,
          tipo_usuario: 'ADMIN',
        },
      })
      setCriado(novo)
      setCampos(VAZIO)
    } catch (erro) {
      const doServidor = erro.campos ?? {}
      const porCampo = { nome: doServidor.nome_completo, email: doServidor.email, senha: doServidor.senha }
      if (Object.values(porCampo).some(Boolean)) setErros(porCampo)
      else setErroGeral(erro.message)
    } finally {
      setEnviando(false)
    }
  }

  return (
    <div className="mx-auto max-w-xl space-y-6 pb-4">
      <TituloPagina icone={Escudo} titulo="Novo administrador">
        Crie uma conta com acesso de administração. Só quem já é admin chega a esta tela.
      </TituloPagina>

      <p className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
        <Alerta tamanho={18} className="mt-0.5 shrink-0" />
        Administradores podem bloquear usuários, excluir contas e apagar avaliações. Crie contas só para quem realmente precisa desse acesso.
      </p>

      {criado && (
        <div role="status" className="flex items-start gap-2 rounded-xl bg-marca-clara p-4 text-sm font-medium text-marca-escura">
          <Check tamanho={18} className="mt-0.5 shrink-0 text-marca" />
          <p>
            Administrador {criado.nome_completo} criado. Enviamos um e-mail de confirmação para {criado.email}.{' '}
            <Link to="/admin/usuarios" className="font-semibold underline underline-offset-2">Ver usuários</Link>
          </p>
        </div>
      )}

      <form onSubmit={enviar} noValidate className="space-y-5 rounded-2xl border border-borda bg-white p-6 sm:p-8">
        {erroGeral && (
          <p role="alert" className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700">
            <Alerta tamanho={18} className="mt-0.5 shrink-0" /> {erroGeral}
          </p>
        )}

        <Campo rotulo="Nome completo" erro={erros.nome}>
          <input value={campos.nome} onChange={alterar('nome')} autoComplete="off" className={estiloInput(erros.nome)} />
        </Campo>

        <Campo rotulo="E-mail" erro={erros.email}>
          <input type="email" value={campos.email} onChange={alterar('email')} autoComplete="off" placeholder="admin@email.com" className={estiloInput(erros.email)} />
        </Campo>

        <div className="grid gap-5 sm:grid-cols-2">
          <CampoSenha
            rotulo="Senha"
            erro={erros.senha}
            value={campos.senha}
            onChange={alterar('senha')}
            autoComplete="new-password"
            placeholder="Mínimo de 8 caracteres"
          />
          <CampoSenha
            rotulo="Confirmar senha"
            erro={erros.confirmar}
            value={campos.confirmar}
            onChange={alterar('confirmar')}
            autoComplete="new-password"
            placeholder="Repita a senha"
          />
        </div>

        <button
          type="submit"
          disabled={enviando}
          className="h-12 w-full rounded-xl bg-marca font-semibold text-white transition hover:bg-marca-escura disabled:opacity-70"
        >
          {enviando ? 'Criando…' : 'Criar administrador'}
        </button>
      </form>
    </div>
  )
}
