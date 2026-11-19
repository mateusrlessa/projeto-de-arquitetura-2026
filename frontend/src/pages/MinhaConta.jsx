import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import Campo, { estiloInput } from '../components/Campo.jsx'
import Cartao, { TituloPagina } from '../components/Cartao.jsx'
import FotoPerfil from '../components/FotoPerfil.jsx'
import { Alerta, Cadeado, Check, Contato, Envelope, Fechar, Olho, OlhoRiscado, Usuario } from '../components/Icones.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import { api } from '../lib/api.js'
import { EMAIL, erroNovaSenha } from '../lib/validacao.js'

const botaoSalvar =
  'inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-marca px-5 text-sm font-semibold text-white transition hover:bg-marca-escura disabled:opacity-70'

// Estado de um formulário pequeno: campos, erros por campo, erro geral e envio.
function useFormulario(inicial) {
  const [campos, setCampos] = useState(inicial)
  const [erros, setErros] = useState({})
  const [erroGeral, setErroGeral] = useState('')
  const [enviando, setEnviando] = useState(false)

  const alterar = (campo) => (e) => {
    setCampos((c) => ({ ...c, [campo]: e.target.value }))
    setErros((x) => ({ ...x, [campo]: undefined }))
    setErroGeral('')
  }

  // Valida, envia e distribui os erros do servidor entre os campos (nomes da API -> nomes do formulário).
  async function enviar(validar, acao, nomesDaApi = {}) {
    const encontrados = validar(campos)
    setErros(encontrados)
    setErroGeral('')
    if (Object.keys(encontrados).length) return false

    setEnviando(true)
    try {
      await acao(campos)
      return true
    } catch (falha) {
      const porCampo = {}
      for (const [campoApi, mensagem] of Object.entries(falha.campos ?? {})) {
        if (nomesDaApi[campoApi]) porCampo[nomesDaApi[campoApi]] = mensagem
      }
      // E-mail duplicado volta como 409 sem indicar o campo.
      if (falha.status === 409 && nomesDaApi.email) porCampo[nomesDaApi.email] = falha.message
      if (Object.keys(porCampo).length) setErros(porCampo)
      else setErroGeral(falha.message)
      return false
    } finally {
      setEnviando(false)
    }
  }

  return { campos, setCampos, erros, erroGeral, enviando, alterar, enviar }
}

function ErroGeral({ children }) {
  if (!children) return null
  return (
    <p role="alert" className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700">
      <Alerta tamanho={18} className="mt-0.5 shrink-0" /> {children}
    </p>
  )
}

function CampoSenha({ rotulo, erro, valor, aoAlterar, mostrar, autoComplete, placeholder }) {
  return (
    <Campo rotulo={rotulo} erro={erro}>
      <input
        type={mostrar ? 'text' : 'password'}
        value={valor}
        onChange={aoAlterar}
        autoComplete={autoComplete}
        placeholder={placeholder}
        className={estiloInput(erro)}
      />
    </Campo>
  )
}

function DadosBasicos({ usuario, aoSalvar }) {
  const form = useFormulario({ nome: usuario.nome_completo })
  const alterado = form.campos.nome.trim() !== usuario.nome_completo

  async function salvar(e) {
    e.preventDefault()
    const ok = await form.enviar(
      ({ nome }) => (nome.trim().length < 3 ? { nome: 'Informe o nome completo' } : {}),
      ({ nome }) => api(`/usuarios/${usuario.id}`, { method: 'PATCH', body: { nome_completo: nome.trim() } }),
      { nome_completo: 'nome' },
    )
    if (ok) aoSalvar('Nome atualizado com sucesso!')
  }

  return (
    <Cartao icone={Contato} titulo="Dados básicos">
      <form onSubmit={salvar} noValidate className="space-y-4">
        <ErroGeral>{form.erroGeral}</ErroGeral>
        <Campo rotulo="Nome completo" erro={form.erros.nome}>
          <input value={form.campos.nome} onChange={form.alterar('nome')} maxLength={150} autoComplete="name" className={estiloInput(form.erros.nome)} />
        </Campo>
        <button type="submit" disabled={form.enviando || !alterado} className={botaoSalvar}>
          <Check tamanho={16} /> {form.enviando ? 'Salvando…' : 'Salvar nome'}
        </button>
      </form>
    </Cartao>
  )
}

function TrocarEmail({ usuario, aoSalvar }) {
  const form = useFormulario({ email: '', senhaAtual: '' })
  const [mostrar, setMostrar] = useState(false)

  async function salvar(e) {
    e.preventDefault()
    const novo = form.campos.email.trim().toLowerCase()
    const ok = await form.enviar(
      ({ senhaAtual }) => {
        const erros = {}
        if (!EMAIL.test(novo)) erros.email = 'Informe um e-mail válido'
        else if (novo === usuario.email.toLowerCase()) erros.email = 'Este já é o seu e-mail'
        if (!senhaAtual) erros.senhaAtual = 'Informe sua senha atual'
        return erros
      },
      ({ senhaAtual }) => api(`/usuarios/${usuario.id}`, { method: 'PATCH', body: { email: novo, senha_atual: senhaAtual } }),
      { email: 'email', senha_atual: 'senhaAtual' },
    )
    if (ok) {
      form.setCampos({ email: '', senhaAtual: '' })
      aoSalvar(`E-mail alterado. Enviamos um link de confirmação para ${novo}.`)
    }
  }

  return (
    <Cartao icone={Envelope} titulo="E-mail">
      <p className="mb-4 text-sm text-suave">
        E-mail atual: <strong className="font-semibold text-tinta">{usuario.email}</strong>
        {usuario.email_verificado_em ? ' (confirmado)' : ' (aguardando confirmação)'}
      </p>
      <form onSubmit={salvar} noValidate className="space-y-4">
        <ErroGeral>{form.erroGeral}</ErroGeral>
        <Campo rotulo="Novo e-mail" erro={form.erros.email}>
          <input type="email" value={form.campos.email} onChange={form.alterar('email')} autoComplete="email" placeholder="nome@email.com" className={estiloInput(form.erros.email)} />
        </Campo>
        <CampoSenha
          rotulo="Senha atual"
          erro={form.erros.senhaAtual}
          valor={form.campos.senhaAtual}
          aoAlterar={form.alterar('senhaAtual')}
          mostrar={mostrar}
          autoComplete="current-password"
          placeholder="Para confirmar que é você"
        />
        <div className="flex flex-wrap items-center gap-4">
          <button type="submit" disabled={form.enviando} className={botaoSalvar}>
            <Check tamanho={16} /> {form.enviando ? 'Salvando…' : 'Trocar e-mail'}
          </button>
          <BotaoMostrar mostrar={mostrar} aoAlternar={() => setMostrar((m) => !m)} />
        </div>
        <p className="text-xs text-suave">O novo endereço precisa ser confirmado pelo link que enviaremos para ele.</p>
      </form>
    </Cartao>
  )
}

function TrocarSenha({ usuario, aoSalvar }) {
  const { entrar, sair } = useAuth()
  const form = useFormulario({ senhaAtual: '', nova: '', confirmar: '' })
  const [mostrar, setMostrar] = useState(false)

  async function salvar(e) {
    e.preventDefault()
    const ok = await form.enviar(
      ({ senhaAtual, nova, confirmar }) => {
        const erros = {}
        if (!senhaAtual) erros.senhaAtual = 'Informe sua senha atual'
        const erroSenha = erroNovaSenha(nova)
        if (erroSenha) erros.nova = erroSenha
        else if (nova === senhaAtual) erros.nova = 'A nova senha deve ser diferente da atual'
        if (confirmar !== nova) erros.confirmar = 'As senhas não conferem'
        return erros
      },
      async ({ senhaAtual, nova }) => {
        await api(`/usuarios/${usuario.id}`, { method: 'PATCH', body: { senha: nova, senha_atual: senhaAtual } })
        // Trocar a senha encerra todas as sessões, inclusive esta: entra de novo com a senha nova.
        try {
          await entrar(usuario.email, nova)
        } catch {
          // A senha já mudou, mas a sessão atual acabou: volta para a tela de login.
          await sair()
        }
      },
      { senha_atual: 'senhaAtual', senha: 'nova' },
    )
    if (ok) {
      form.setCampos({ senhaAtual: '', nova: '', confirmar: '' })
      aoSalvar('Senha alterada. As outras sessões abertas da sua conta foram encerradas.')
    }
  }

  return (
    <Cartao icone={Cadeado} titulo="Senha">
      <form onSubmit={salvar} noValidate className="space-y-4">
        <ErroGeral>{form.erroGeral}</ErroGeral>
        <CampoSenha
          rotulo="Senha atual"
          erro={form.erros.senhaAtual}
          valor={form.campos.senhaAtual}
          aoAlterar={form.alterar('senhaAtual')}
          mostrar={mostrar}
          autoComplete="current-password"
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <CampoSenha
            rotulo="Nova senha"
            erro={form.erros.nova}
            valor={form.campos.nova}
            aoAlterar={form.alterar('nova')}
            mostrar={mostrar}
            autoComplete="new-password"
            placeholder="Mínimo de 8 caracteres"
          />
          <CampoSenha
            rotulo="Confirmar nova senha"
            erro={form.erros.confirmar}
            valor={form.campos.confirmar}
            aoAlterar={form.alterar('confirmar')}
            mostrar={mostrar}
            autoComplete="new-password"
            placeholder="Repita a nova senha"
          />
        </div>
        <div className="flex flex-wrap items-center gap-4">
          <button type="submit" disabled={form.enviando} className={botaoSalvar}>
            <Check tamanho={16} /> {form.enviando ? 'Salvando…' : 'Trocar senha'}
          </button>
          <BotaoMostrar mostrar={mostrar} aoAlternar={() => setMostrar((m) => !m)} />
        </div>
        <p className="text-xs text-suave">
          Entrou só com o Google e ainda não tem senha? Crie uma em{' '}
          <Link to="/recuperar-senha" className="font-semibold text-marca underline underline-offset-2">Esqueci minha senha</Link>.
        </p>
      </form>
    </Cartao>
  )
}

function BotaoMostrar({ mostrar, aoAlternar }) {
  return (
    <button type="button" onClick={aoAlternar} className="inline-flex items-center gap-1.5 text-sm font-medium text-suave hover:text-tinta">
      {mostrar ? <OlhoRiscado tamanho={16} /> : <Olho tamanho={16} />}
      {mostrar ? 'Ocultar senhas' : 'Mostrar senhas'}
    </button>
  )
}

export default function MinhaConta() {
  const { usuario, recarregarUsuario } = useAuth()
  const [aviso, setAviso] = useState('')

  useEffect(() => {
    if (!aviso) return
    const espera = setTimeout(() => setAviso(''), 6000)
    return () => clearTimeout(espera)
  }, [aviso])

  async function aoSalvar(mensagem) {
    setAviso(mensagem)
    await recarregarUsuario().catch(() => {})
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6 pb-4">
      <TituloPagina icone={Usuario} titulo="Minha conta">
        Altere seu nome, foto, e-mail e senha de acesso.
        {usuario.tipo_usuario === 'CUIDADOR' && (
          <>
            {' '}Os dados do perfil profissional ficam em{' '}
            <Link to="/meu-perfil" className="font-semibold text-marca underline underline-offset-2">Meu perfil</Link>.
          </>
        )}
      </TituloPagina>

      {aviso && (
        <p
          role="status"
          className="fixed right-4 top-4 z-40 flex max-w-sm items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700 shadow-lg"
        >
          <Check tamanho={18} className="shrink-0" /> {aviso}
          <button type="button" onClick={() => setAviso('')} aria-label="Fechar aviso" className="ml-1">
            <Fechar tamanho={16} />
          </button>
        </p>
      )}

      <div className="grid items-start gap-6 md:grid-cols-2">
        <FotoPerfil usuario={usuario} aoAtualizar={recarregarUsuario} aoAvisar={setAviso} />
        {/* A chave recria o formulário quando o nome muda em outra tela. */}
        <DadosBasicos key={usuario.nome_completo} usuario={usuario} aoSalvar={aoSalvar} />
      </div>
      <TrocarEmail usuario={usuario} aoSalvar={aoSalvar} />
      <TrocarSenha usuario={usuario} aoSalvar={aoSalvar} />
    </div>
  )
}
