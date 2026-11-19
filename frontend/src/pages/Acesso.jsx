import { useRef, useState } from 'react'
import { Navigate, useLocation, useNavigate, useNavigationType, useSearchParams } from 'react-router-dom'
import BotaoGoogle from '../components/BotaoGoogle.jsx'
import Campo, { estiloInput } from '../components/Campo.jsx'
import { Alerta, Coracao, Escudo, Olho, OlhoRiscado, Pessoas } from '../components/Icones.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import { EMAIL, erroNovaSenha } from '../lib/validacao.js'

const TIPOS = [
  { valor: 'CONTRATANTE', titulo: 'Contratante', legenda: 'Busco cuidado', icone: Pessoas },
  { valor: 'CUIDADOR', titulo: 'Cuidador', legenda: 'Ofereço cuidado', icone: Coracao },
]

const ABAS = [
  ['entrar', 'Entrar'],
  ['criar', 'Criar conta'],
]

// O cuidador vai para o próprio perfil e o admin para a lista de usuários. Os demais voltam à página de onde vieram ou à inicial.
function destinoDe(conta, voltarPara) {
  if (conta.tipo_usuario === 'CUIDADOR') return '/meu-perfil'
  if (conta.tipo_usuario === 'ADMIN') return voltarPara ?? '/admin/usuarios'
  return voltarPara ?? '/'
}

function validar(campos, modo) {
  const erros = {}
  const erroSenha = modo === 'criar' && erroNovaSenha(campos.senha)
  if (modo === 'criar' && campos.nome.trim().length < 3) erros.nome = 'Informe seu nome completo'
  if (!EMAIL.test(campos.email.trim())) erros.email = 'Informe um e-mail válido'
  if (!campos.senha) erros.senha = 'Informe sua senha'
  else if (erroSenha) erros.senha = erroSenha
  if (modo === 'criar' && campos.confirmar !== campos.senha) erros.confirmar = 'As senhas não conferem'
  return erros
}

export default function Acesso() {
  const { usuario } = useAuth()
  const [jaLogado] = useState(Boolean(usuario))
  const [params] = useSearchParams()
  const abaDaUrl = params.get('aba') === 'criar' ? 'criar' : 'entrar'
  const [ativa, setAtiva] = useState(abaDaUrl)
  // O e-mail digitado acompanha a pessoa ao trocar de aba.
  const [email, setEmail] = useState('')
  // O foco só vai para o primeiro campo depois de uma troca feita pela pessoa, não ao abrir a página.
  const [focarCampo, setFocarCampo] = useState(false)
  const abas = useRef({})
  const local = useLocation()
  const navegar = useNavigate()
  const tipoNavegacao = useNavigationType()

  // Os links "Entrar" e "Criar conta" do menu abrem esta mesma página: a cada clique neles
  // (mesmo já estando aqui), a aba volta a seguir o endereço.
  const [ultimaNavegacao, setUltimaNavegacao] = useState(local.key)
  if (local.key !== ultimaNavegacao) {
    setUltimaNavegacao(local.key)
    if (tipoNavegacao === 'PUSH') setAtiva(abaDaUrl)
  }

  const { aviso, voltarPara } = local.state ?? {}

  // Só redireciona quem já chegou logado. No login, quem navega é o formulário.
  if (jaLogado) return <Navigate to={destinoDe(usuario, voltarPara)} replace />

  function escolher(chave) {
    setFocarCampo(true)
    setAtiva(chave)
  }

  // Setas, Home e End movem entre as abas, como em qualquer lista de abas.
  function aoTeclar(e) {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(e.key)) return
    e.preventDefault()
    const atual = ABAS.findIndex(([chave]) => chave === ativa)
    const proxima =
      e.key === 'Home' ? 0 : e.key === 'End' ? ABAS.length - 1 : (atual + (e.key === 'ArrowRight' ? 1 : -1) + ABAS.length) % ABAS.length
    const [chave] = ABAS[proxima]
    setFocarCampo(false)
    setAtiva(chave)
    abas.current[chave]?.focus()
  }

  return (
    <div className="mx-auto max-w-md pb-4">
      {/* Tirar o aviso do state evita que ele reapareça ao recarregar a página. */}
      {aviso && <ModalAviso mensagem={aviso} aoFechar={() => navegar(local, { replace: true, state: { voltarPara } })} />}

      <div className="text-center">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-marca-clara px-3 py-1 text-xs font-semibold uppercase tracking-wide text-marca">
          <Coracao tamanho={14} /> Bem-vindo ao CuidaAqui
        </span>
        <h1 className="mt-4 font-titulo text-3xl font-bold sm:text-4xl">Cuidado começa com confiança</h1>
        <p className="mt-3 text-suave">Acesse sua conta ou crie um perfil para encontrar e oferecer cuidados com segurança.</p>
      </div>

      <div className="mt-8 overflow-hidden rounded-2xl border border-borda bg-white">
        <div className="px-6 pt-6 sm:px-8 sm:pt-8">
          <div role="tablist" aria-label="Entrar ou criar conta" onKeyDown={aoTeclar} className="grid grid-cols-2 gap-1 rounded-xl bg-fundo p-1 text-sm font-semibold">
            {ABAS.map(([chave, rotulo]) => (
              <button
                key={chave}
                ref={(el) => {
                  abas.current[chave] = el
                }}
                id={`aba-${chave}`}
                type="button"
                role="tab"
                aria-selected={ativa === chave}
                aria-controls={`painel-${chave}`}
                tabIndex={ativa === chave ? 0 : -1}
                onClick={() => escolher(chave)}
                className={`rounded-lg py-2.5 transition ${ativa === chave ? 'bg-white text-marca shadow-sm' : 'text-suave hover:text-marca'}`}
              >
                {rotulo}
              </button>
            ))}
          </div>
        </div>

        <div key={ativa} role="tabpanel" id={`painel-${ativa}`} aria-labelledby={`aba-${ativa}`} style={{ animation: 'aparecer 0.18s ease-out' }}>
          <Formulario
            modo={ativa}
            voltarPara={voltarPara}
            emailInicial={email}
            aoAlterarEmail={setEmail}
            autoFocar={focarCampo}
            aoTrocarAba={() => escolher(ativa === 'entrar' ? 'criar' : 'entrar')}
          />
        </div>
      </div>

      <p className="mt-6 flex items-center justify-center gap-2 text-xs text-suave">
        <Escudo tamanho={16} className="text-marca" /> Seus dados são protegidos e usados somente para conectar pessoas e cuidados.
      </p>
    </div>
  )
}

function Formulario({ modo, voltarPara, emailInicial, aoAlterarEmail, autoFocar, aoTrocarAba }) {
  const criar = modo === 'criar'
  const { entrar, cadastrar, entrarComGoogle } = useAuth()
  const navegar = useNavigate()

  const [tipo, setTipo] = useState('CONTRATANTE')
  const [campos, setCampos] = useState({ nome: '', email: emailInicial, senha: '', confirmar: '' })
  const [mostrar, setMostrar] = useState(false)
  const [erros, setErros] = useState({})
  const [erroGeral, setErroGeral] = useState('')
  const [enviando, setEnviando] = useState(false)

  const alterar = (campo) => (e) => {
    setCampos((c) => ({ ...c, [campo]: e.target.value }))
    if (campo === 'email') aoAlterarEmail(e.target.value)
    setErros((x) => ({ ...x, [campo]: undefined }))
  }

  const concluir = (conta) => navegar(destinoDe(conta, voltarPara), { replace: true })
  const concluirLogin = () => navegar('/', { replace: true })

  async function enviarGoogle(credencial) {
    setErroGeral('')
    setEnviando(true)
    try {
      // Ao entrar, o tipo vem da conta. Só o cadastro informa o tipo escolhido.
      const conta = await entrarComGoogle(credencial, criar ? tipo : undefined)
      if (criar) concluir(conta)
      else concluirLogin()
    } catch (erro) {
      setErroGeral(erro.message)
    } finally {
      setEnviando(false)
    }
  }

  async function enviar(e) {
    e.preventDefault()
    const encontrados = validar(campos, modo)
    setErros(encontrados)
    setErroGeral('')
    if (Object.keys(encontrados).length) return

    setEnviando(true)
    try {
      const email = campos.email.trim().toLowerCase()
      const conta = criar
        ? await cadastrar({ nome: campos.nome.trim(), email, senha: campos.senha, tipo })
        : await entrar(email, campos.senha)
      if (criar) concluir(conta)
      else concluirLogin()
    } catch (erro) {
      const doServidor = erro.campos ?? {}
      const porCampo = { nome: doServidor.nome_completo, email: doServidor.email, senha: doServidor.senha }
      if (Object.values(porCampo).some(Boolean)) setErros(porCampo)
      else setErroGeral(erro.status === 401 ? 'E-mail ou senha incorretos.' : erro.message)
    } finally {
      setEnviando(false)
    }
  }

  return (
    <form onSubmit={enviar} noValidate className="space-y-5 p-6 sm:p-8">
      <div>
        <h2 className="font-titulo text-xl font-semibold">{criar ? 'Crie seu perfil' : 'Acesse sua conta'}</h2>
        <p className="mt-1 text-sm text-suave">{criar ? 'Leva só alguns minutos para começar.' : 'Que bom ter você por aqui novamente.'}</p>
      </div>

      {erroGeral && (
        <p role="alert" className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700">
          <Alerta tamanho={18} className="mt-0.5 shrink-0" /> {erroGeral}
        </p>
      )}

      {criar && (
        <fieldset>
          <legend className="mb-2 text-sm font-semibold">Eu sou</legend>
          <div className="grid grid-cols-2 gap-3">
            {TIPOS.map(({ valor, titulo, legenda, icone: Icone }) => (
              <label
                key={valor}
                className={`flex cursor-pointer items-center gap-3 rounded-xl border p-3 transition has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-marca/40 ${
                  tipo === valor ? 'border-marca bg-marca-clara' : 'border-borda hover:border-marca/50'
                }`}
              >
                <input type="radio" name="tipo" value={valor} checked={tipo === valor} onChange={() => setTipo(valor)} className="sr-only" />
                <span className={`flex size-9 shrink-0 items-center justify-center rounded-lg ${tipo === valor ? 'bg-marca text-white' : 'bg-marca-clara text-marca'}`}>
                  <Icone tamanho={18} />
                </span>
                <span className="leading-tight">
                  <span className="block text-sm font-semibold">{titulo}</span>
                  <span className="text-xs text-suave">{legenda}</span>
                </span>
              </label>
            ))}
          </div>
        </fieldset>
      )}

      {criar && (
        <Campo rotulo="Nome" erro={erros.nome}>
          <input value={campos.nome} onChange={alterar('nome')} autoFocus={autoFocar} autoComplete="name" placeholder="Seu nome completo" className={estiloInput(erros.nome)} />
        </Campo>
      )}

      <Campo rotulo="E-mail" erro={erros.email}>
        <input type="email" value={campos.email} onChange={alterar('email')} autoFocus={autoFocar && !criar} autoComplete="email" placeholder="seu@email.com" className={estiloInput(erros.email)} />
      </Campo>

      <div className={criar ? 'grid gap-5 sm:grid-cols-2' : ''}>
        <Campo rotulo="Senha" erro={erros.senha}>
          <div className="relative">
            <input
              type={mostrar ? 'text' : 'password'}
              value={campos.senha}
              onChange={alterar('senha')}
              autoComplete={criar ? 'new-password' : 'current-password'}
              placeholder={criar ? 'Mínimo de 8 caracteres' : '••••••••'}
              className={`${estiloInput(erros.senha)} pr-11`}
            />
            <button
              type="button"
              onClick={() => setMostrar((m) => !m)}
              aria-label={mostrar ? 'Ocultar senha' : 'Mostrar senha'}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-suave hover:text-tinta"
            >
              {mostrar ? <OlhoRiscado /> : <Olho />}
            </button>
          </div>
        </Campo>
        {criar && (
          <Campo rotulo="Confirmar senha" erro={erros.confirmar}>
            <input
              type={mostrar ? 'text' : 'password'}
              value={campos.confirmar}
              onChange={alterar('confirmar')}
              autoComplete="new-password"
              placeholder="Repita a senha"
              className={estiloInput(erros.confirmar)}
            />
          </Campo>
        )}
      </div>

      {!criar && (
        <div className="text-right">
          <button type="button" onClick={() => navegar('/recuperar-senha')} className="text-sm font-semibold text-marca hover:text-marca-escura">
            Esqueci minha senha
          </button>
        </div>
      )}

      <button
        type="submit"
        disabled={enviando}
        className="h-12 w-full rounded-xl bg-marca font-semibold text-white transition hover:bg-marca-escura disabled:opacity-70"
      >
        {enviando ? (criar ? 'Criando conta…' : 'Entrando…') : criar ? 'Criar conta' : 'Entrar'}
      </button>

      <div className="flex items-center gap-3 text-xs text-suave">
        <span className="h-px flex-1 bg-borda" /> ou <span className="h-px flex-1 bg-borda" />
      </div>

      <BotaoGoogle texto={criar ? 'signup_with' : 'continue_with'} aoAutenticar={enviarGoogle} />

      <p className="text-center text-sm text-suave">
        {criar ? 'Já tem conta?' : 'Ainda não tem conta?'}{' '}
        <button type="button" onClick={aoTrocarAba} className="font-semibold text-marca hover:text-marca-escura">
          {criar ? 'Entrar' : 'Criar conta'}
        </button>
      </p>
    </form>
  )
}

function ModalAviso({ mensagem, aoFechar }) {
  return (
    <div
      className="fixed inset-0 z-20 flex items-center justify-center bg-tinta/50 p-4"
      onClick={aoFechar}
      onKeyDown={(e) => e.key === 'Escape' && aoFechar()}
    >
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="aviso-mensagem"
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-sm rounded-2xl bg-white p-6 text-center shadow-xl"
      >
        <span className="mx-auto flex size-12 items-center justify-center rounded-full bg-marca-clara text-marca">
          <Alerta tamanho={22} />
        </span>
        <p id="aviso-mensagem" className="mt-4 font-medium">{mensagem}</p>
        <button
          type="button"
          autoFocus
          onClick={aoFechar}
          className="mt-5 h-11 w-full rounded-xl bg-marca font-semibold text-white transition hover:bg-marca-escura"
        >
          Entendi
        </button>
      </div>
    </div>
  )
}

