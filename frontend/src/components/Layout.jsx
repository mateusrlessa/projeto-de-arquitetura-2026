import { useEffect } from 'react'
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom'
import { api } from '../lib/api.js'
import { useDados } from '../lib/useApi.js'
import { useAuth } from '../context/AuthContext.jsx'
import { useModoDemo } from '../lib/dados.js'
import { primeiroNome } from '../lib/format.js'
import AvisoEmail from './AvisoEmail.jsx'
import { Coracao } from './Icones.jsx'

const ANO = new Date().getFullYear()

function Logo({ claro = false }) {
  return (
    <Link to="/" className="flex items-center gap-1.5 font-titulo text-2xl font-semibold text-marca">
      CuidaAqui
      <Coracao tamanho={22} className={claro ? 'text-marca' : ''} />
    </Link>
  )
}

const linkCuidador = ({ isActive }) =>
  `rounded-full px-4 py-2 font-semibold transition ${isActive ? 'bg-marca-clara text-marca' : 'text-suave hover:text-marca'}`

// Menu do admin. O selo mostra quantos comentários esperam decisão e é atualizado a cada troca de tela.
function NavAdmin() {
  const { pathname } = useLocation()
  const { dados, recarregar } = useDados(`moderacao-selo-${pathname}`, (signal) => api('/moderacao/resumo', { signal }))
  // A tela de moderação avisa quando uma decisão muda o número de pendentes.
  useEffect(() => {
    window.addEventListener('moderacao-mudou', recarregar)
    return () => window.removeEventListener('moderacao-mudou', recarregar)
  }, [recarregar])
  const pendentes = dados?.denunciadas ?? 0

  return (
    <nav aria-label="Administração" className="order-last flex w-full gap-1 text-sm sm:order-none sm:w-auto">
      <NavLink to="/admin/usuarios" className={linkCuidador}>Usuários</NavLink>
      <NavLink to="/admin/moderacao" className={linkCuidador}>
        Moderação
        {pendentes > 0 && (
          <span aria-label={`${pendentes} pendentes`} className="ml-2 rounded-full bg-red-600 px-2 py-0.5 text-[11px] font-semibold text-white">{pendentes}</span>
        )}
      </NavLink>
      <NavLink to="/admin/novo-admin" className={linkCuidador}>Novo admin</NavLink>
      <NavLink to="/minha-conta" className={linkCuidador}>Minha conta</NavLink>
    </nav>
  )
}

function Cabecalho() {
  const { usuario, sair } = useAuth()

  return (
    <header className="border-b border-borda bg-white">
      <div className="mx-auto flex min-h-[76px] max-w-6xl flex-wrap items-center gap-x-4 gap-y-2 px-5 py-3">
        <div className="mr-auto">
          <Logo />
        </div>
        {usuario ? (
          <>
            <span className="hidden text-sm text-suave sm:inline">
              Olá, {primeiroNome(usuario.nome_completo)}
              {usuario.tipo_usuario === 'ADMIN' && (
                <span className="ml-2 rounded-full bg-tinta px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-white">Admin</span>
              )}
            </span>
            {/* No celular os links ficam em uma segunda linha, para não apertar o logo. */}
            {usuario.tipo_usuario === 'CUIDADOR' && (
              <nav className="order-last flex w-full gap-1 text-sm sm:order-none sm:w-auto">
                <NavLink to="/meu-perfil" className={linkCuidador}>Meu perfil</NavLink>
                <NavLink to="/avaliacoes" className={linkCuidador}>Avaliações</NavLink>
                <NavLink to="/servicos" className={linkCuidador}>Serviços</NavLink>
                <NavLink to="/minha-conta" className={linkCuidador}>Conta</NavLink>
              </nav>
            )}
            {usuario.tipo_usuario === 'CONTRATANTE' && (
              <nav className="order-last flex w-full gap-1 text-sm sm:order-none sm:w-auto">
                <NavLink to="/servicos" className={linkCuidador}>Serviços</NavLink>
                <NavLink to="/minha-conta" className={linkCuidador}>Minha conta</NavLink>
              </nav>
            )}
            {usuario.tipo_usuario === 'ADMIN' && <NavAdmin />}
            <button
              onClick={sair}
              className="rounded-full border border-marca px-5 py-2 text-sm font-semibold text-marca transition hover:bg-marca-clara"
            >
              Sair
            </button>
          </>
        ) : (
          <nav className="flex items-center gap-3 text-sm font-semibold">
            <NavLink
              to="/acesso"
              className="rounded-full border border-marca px-5 py-2 text-marca transition hover:bg-marca-clara"
            >
              Entrar
            </NavLink>
            <Link
              to="/acesso?aba=criar"
              className="rounded-full bg-marca px-5 py-2 text-white transition hover:bg-marca-escura"
            >
              Criar conta
            </Link>
          </nav>
        )}
      </div>
    </header>
  )
}

const linkRodape = 'text-sm text-white/60 transition hover:text-white'

function Rodape() {
  return (
    <footer className="mt-16 bg-tinta text-white">
      <div className="mx-auto max-w-6xl px-5 py-12">
        <div className="flex flex-col gap-10 md:flex-row md:justify-between">
          <div className="max-w-xs space-y-3">
            <Logo claro />
            <p className="text-sm leading-relaxed text-white/60">
              Conectando com amor e respeito quem precisa de cuidados com profissionais qualificados em todo o Brasil.
            </p>
          </div>
          <div className="flex gap-16">
            <div className="space-y-3">
              <h3 className="text-sm font-semibold">Para Famílias</h3>
              <ul className="space-y-2">
                <li><Link className={linkRodape} to="/cuidadores">Buscar Cuidadores</Link></li>
                <li><Link className={linkRodape} to="/guia-de-seguranca">Guia de Segurança</Link></li>
                <li><Link className={linkRodape} to="/depoimentos">Depoimentos</Link></li>
              </ul>
            </div>
            <div className="space-y-3">
              <h3 className="text-sm font-semibold">Para Profissionais</h3>
              <ul className="space-y-2">
                <li><Link className={linkRodape} to="/acesso?aba=criar">Cadastrar Perfil</Link></li>
                <li><Link className={linkRodape} to="/dicas-de-atendimento">Dicas de Atendimento</Link></li>
                <li><Link className={linkRodape} to="/suporte">Suporte</Link></li>
              </ul>
            </div>
          </div>
        </div>
        <div className="mt-10 flex flex-col gap-3 border-t border-white/10 pt-6 text-sm text-white/60 sm:flex-row sm:justify-between">
          <p>CuidaAqui © {ANO} — Todos os direitos reservados</p>
          <div className="flex gap-6">
            <Link className="hover:text-white" to="/sobre">Sobre</Link>
            <Link className="hover:text-white" to="/termos-de-uso">Termos de uso</Link>
            <Link className="hover:text-white" to="/contato">Contato</Link>
          </div>
        </div>
      </div>
    </footer>
  )
}

export default function Layout() {
  // O hash entra na chave porque abrir outro link de e-mail na mesma aba só muda o token depois do #.
  const { pathname, hash } = useLocation()
  const modoDemo = useModoDemo()
  return (
    <div className="flex min-h-screen flex-col">
      <Cabecalho />
      <AvisoEmail />
      {modoDemo && (
        <p className="bg-marca-clara px-5 py-2 text-center text-xs text-marca-escura">
          Exibindo dados de exemplo: o servidor não retornou cuidadores cadastrados.
        </p>
      )}
      <main key={`${pathname}${hash}`} className="mx-auto w-full max-w-6xl flex-1 px-5 pt-10">
        <Outlet />
      </main>
      <Rodape />
    </div>
  )
}
