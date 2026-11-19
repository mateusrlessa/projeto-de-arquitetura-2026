import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import Avatar from '../components/Avatar.jsx'
import { estiloInput, estiloTextarea } from '../components/Campo.jsx'
import { TituloPagina } from '../components/Cartao.jsx'
import { Busca, Check, Mais, Pessoas } from '../components/Icones.jsx'
import ModalConfirmar from '../components/ModalConfirmar.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import { api } from '../lib/api.js'
import { plural } from '../lib/format.js'
import { useDados } from '../lib/useApi.js'

const POR_PAGINA = 20
const ATRASO_BUSCA_MS = 300
const SUGESTOES_MOTIVO = ['Comentário ofensivo', 'Perfil falso', 'Violação dos termos de uso']

const TIPOS = [
  ['', 'Todos'],
  ['CUIDADOR', 'Cuidadores'],
  ['CONTRATANTE', 'Contratantes'],
  ['ADMIN', 'Admins'],
]
const STATUS = [
  ['', 'Todos'],
  ['ATIVO', 'Ativos'],
  ['BLOQUEADO', 'Bloqueados'],
  ['INATIVO', 'Inativos'],
]

const ROTULO_TIPO = { CUIDADOR: 'Cuidador', CONTRATANTE: 'Contratante', ADMIN: 'Admin' }
const ROTULO_STATUS = { ATIVO: 'Ativo', BLOQUEADO: 'Bloqueado', INATIVO: 'Inativo' }
const COR_TIPO = {
  CUIDADOR: 'bg-marca-clara text-marca-escura',
  CONTRATANTE: 'bg-amber-50 text-amber-800',
  ADMIN: 'bg-tinta text-white',
}
const COR_STATUS = {
  ATIVO: 'bg-emerald-50 text-emerald-700',
  BLOQUEADO: 'bg-red-50 text-red-700',
  INATIVO: 'bg-borda/70 text-suave',
}

const data = (iso) => new Date(iso).toLocaleDateString('pt-BR')

function Selo({ cor, children }) {
  return <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${cor}`}>{children}</span>
}

function Chips({ rotulo, opcoes, valor, aoEscolher }) {
  return (
    <div role="group" aria-label={rotulo} className="flex flex-wrap items-center gap-2">
      <span className="mr-1 text-xs font-semibold uppercase tracking-wide text-suave">{rotulo}</span>
      {opcoes.map(([chave, texto]) => (
        <button
          key={chave}
          type="button"
          aria-pressed={valor === chave}
          onClick={() => aoEscolher(chave)}
          className={`rounded-full border px-3.5 py-1.5 text-sm font-medium transition ${
            valor === chave ? 'border-marca bg-marca-clara text-marca-escura' : 'border-borda bg-white text-suave hover:border-marca/50'
          }`}
        >
          {texto}
        </button>
      ))}
    </div>
  )
}

const botao = 'rounded-lg border px-3 py-1.5 text-xs font-semibold transition'

function Acoes({ usuario: u, eu, aoEscolher }) {
  // Administradores (e a própria conta) não são bloqueados nem excluídos por aqui.
  if (u.tipo_usuario === 'ADMIN' || u.id === eu) return <span className="text-xs text-suave">Protegido</span>

  return (
    <div className="flex flex-wrap gap-2">
      {/* O id do cuidador é o mesmo id do usuário. Funciona também para conta bloqueada ou inativa. */}
      {u.tipo_usuario === 'CUIDADOR' && u.tem_perfil_cuidador && (
        <Link to={`/cuidadores/${u.id}`} className={`${botao} border-marca/40 text-marca hover:bg-marca-clara`}>
          Ver perfil
        </Link>
      )}
      {u.status === 'ATIVO' && (
        <button type="button" onClick={() => aoEscolher('bloquear', u)} className={`${botao} border-borda hover:bg-fundo`}>
          Bloquear
        </button>
      )}
      {u.status === 'BLOQUEADO' && (
        <button type="button" onClick={() => aoEscolher('ativar', u)} className={`${botao} border-borda hover:bg-fundo`}>
          Desbloquear
        </button>
      )}
      {u.status === 'INATIVO' && (
        <button type="button" onClick={() => aoEscolher('ativar', u)} className={`${botao} border-borda hover:bg-fundo`}>
          Reativar
        </button>
      )}
      {u.status !== 'INATIVO' && (
        <button type="button" onClick={() => aoEscolher('excluir', u)} className={`${botao} border-red-200 text-red-600 hover:bg-red-50`}>
          Excluir
        </button>
      )}
    </div>
  )
}

function Identidade({ usuario: u }) {
  return (
    <div className="flex min-w-0 items-center gap-3">
      <Avatar nome={u.nome_completo} chave={u.foto_perfil_storage_key} tamanho={40} />
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold">{u.nome_completo}</p>
        <p className="truncate text-xs text-suave">{u.email}</p>
        {u.status === 'BLOQUEADO' && u.motivo_bloqueio && (
          <p className="mt-0.5 truncate text-xs text-red-600">Motivo: {u.motivo_bloqueio}</p>
        )}
      </div>
    </div>
  )
}

export default function AdminUsuarios() {
  const { usuario: eu } = useAuth()
  const [texto, setTexto] = useState('')
  const [busca, setBusca] = useState('')
  const [tipo, setTipo] = useState('')
  const [status, setStatus] = useState('')
  const [pagina, setPagina] = useState(1)
  const [acao, setAcao] = useState(null)
  const [motivo, setMotivo] = useState('')
  const [aviso, setAviso] = useState(null)

  // Espera a pessoa parar de digitar para não consultar a API a cada letra.
  useEffect(() => {
    const espera = setTimeout(() => {
      setBusca(texto.trim())
      setPagina(1)
    }, ATRASO_BUSCA_MS)
    return () => clearTimeout(espera)
  }, [texto])

  useEffect(() => {
    if (!aviso) return
    const espera = setTimeout(() => setAviso(null), 8000)
    return () => clearTimeout(espera)
  }, [aviso])

  const { dados, carregando, erro, recarregar } = useDados(`usuarios-${busca}-${tipo}-${status}-${pagina}`, (signal) =>
    api('/usuarios', { params: { busca, tipo_usuario: tipo, status, pagina, limite: POR_PAGINA }, signal }),
  )

  const lista = dados?.dados ?? []
  const total = dados?.paginacao.total ?? 0
  const totalPaginas = dados?.paginacao.total_paginas ?? 1

  const filtrar = (definir) => (valor) => {
    definir(valor)
    setPagina(1)
  }

  function escolherAcao(tipoAcao, usuario) {
    setMotivo('')
    setAcao({ tipo: tipoAcao, usuario })
  }

  const mudarStatus = (id, novo, motivoBloqueio) =>
    api(`/usuarios/${id}/status`, { method: 'PATCH', body: { status: novo, motivo_bloqueio: motivoBloqueio || undefined } })

  async function executar() {
    const { tipo: tipoAcao, usuario: u } = acao
    let mensagem
    if (tipoAcao === 'bloquear') {
      await mudarStatus(u.id, 'BLOQUEADO', motivo.trim())
      mensagem = `${u.nome_completo} foi bloqueado(a).`
    } else if (tipoAcao === 'excluir') {
      await api(`/usuarios/${u.id}`, { method: 'DELETE' })
      mensagem = `${u.nome_completo} foi excluído(a).`
    } else {
      await mudarStatus(u.id, 'ATIVO')
      mensagem = `${u.nome_completo} voltou a ter acesso.`
    }

    setAcao(null)
    setAviso({
      texto: mensagem,
      // Bloquear e excluir não apagam nada: dá para voltar atrás por alguns segundos.
      desfazer: tipoAcao === 'ativar' ? null : async () => {
        await mudarStatus(u.id, 'ATIVO')
        setAviso({ texto: 'Ação desfeita.' })
        recarregar()
      },
    })
    recarregar()
  }

  const modais = {
    bloquear: {
      titulo: (u) => `Bloquear ${u.nome_completo}?`,
      botao: 'Bloquear usuário',
      perigo: true,
    },
    excluir: {
      titulo: (u) => `Excluir ${u.nome_completo}?`,
      botao: 'Excluir usuário',
      perigo: true,
    },
    ativar: {
      titulo: (u) => `${u.status === 'BLOQUEADO' ? 'Desbloquear' : 'Reativar'} ${u.nome_completo}?`,
      botao: 'Confirmar',
      perigo: false,
    },
  }

  return (
    <div className="space-y-6 pb-4">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <TituloPagina icone={Pessoas} titulo="Usuários">
          Encontre qualquer conta da plataforma, seja cuidador, contratante ou admin, e bloqueie ou exclua quando necessário.
        </TituloPagina>
        <Link
          to="/admin/novo-admin"
          className="inline-flex items-center gap-2 rounded-full bg-marca px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-marca-escura"
        >
          <Mais tamanho={16} /> Novo admin
        </Link>
      </div>

      <section className="space-y-4 rounded-2xl border border-borda bg-white p-5">
        <label className="relative block">
          <span className="sr-only">Buscar por nome ou e-mail</span>
          <Busca tamanho={18} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-suave" />
          <input
            type="search"
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            placeholder="Buscar por nome ou e-mail"
            className={`${estiloInput(false)} pl-11`}
          />
        </label>
        <Chips rotulo="Tipo" opcoes={TIPOS} valor={tipo} aoEscolher={filtrar(setTipo)} />
        <Chips rotulo="Status" opcoes={STATUS} valor={status} aoEscolher={filtrar(setStatus)} />
      </section>

      {aviso && (
        <p role="status" className="flex flex-wrap items-center gap-3 rounded-xl bg-marca-clara px-4 py-3 text-sm font-medium text-marca-escura">
          <Check tamanho={18} className="shrink-0 text-marca" />
          <span className="mr-auto">{aviso.texto}</span>
          {aviso.desfazer && (
            <button
              type="button"
              onClick={() => aviso.desfazer().catch((falha) => setAviso({ texto: falha.message }))}
              className="font-semibold underline underline-offset-2"
            >
              Desfazer
            </button>
          )}
        </p>
      )}

      {erro && (
        <div role="alert" className="rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-700">
          {erro.message}{' '}
          <button type="button" onClick={recarregar} className="font-semibold underline">Tentar de novo</button>
        </div>
      )}

      {!dados && carregando && (
        <div aria-busy="true" className="h-64 rounded-2xl bg-borda/70" style={{ animation: 'pulso 1.4s ease-in-out infinite' }} />
      )}

      {dados && (
        <section className={`rounded-2xl border border-borda bg-white transition-opacity ${carregando ? 'opacity-60' : ''}`}>
          <p className="border-b border-borda px-5 py-3 text-sm text-suave" aria-live="polite">
            {total} {plural(total, 'usuário', 'usuários')}
          </p>

          {lista.length === 0 ? (
            <p className="px-5 py-12 text-center text-sm text-suave">Nenhum usuário encontrado com esses filtros.</p>
          ) : (
            <>
              <div className="hidden overflow-x-auto md:block">
                <table className="w-full text-left">
                  <thead className="text-xs uppercase tracking-wide text-suave">
                    <tr>
                      <th scope="col" className="px-5 py-3 font-semibold">Usuário</th>
                      <th scope="col" className="px-3 py-3 font-semibold">Tipo</th>
                      <th scope="col" className="px-3 py-3 font-semibold">Status</th>
                      <th scope="col" className="px-3 py-3 font-semibold">Cadastro</th>
                      <th scope="col" className="px-5 py-3 font-semibold">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-borda">
                    {lista.map((u) => (
                      <tr key={u.id}>
                        <td className="max-w-xs px-5 py-3"><Identidade usuario={u} /></td>
                        <td className="px-3 py-3"><Selo cor={COR_TIPO[u.tipo_usuario]}>{ROTULO_TIPO[u.tipo_usuario]}</Selo></td>
                        <td className="px-3 py-3"><Selo cor={COR_STATUS[u.status]}>{ROTULO_STATUS[u.status]}</Selo></td>
                        <td className="whitespace-nowrap px-3 py-3 text-sm text-suave">{data(u.criado_em)}</td>
                        <td className="px-5 py-3"><Acoes usuario={u} eu={eu.id} aoEscolher={escolherAcao} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <ul className="divide-y divide-borda md:hidden">
                {lista.map((u) => (
                  <li key={u.id} className="space-y-2 px-4 py-3">
                    <div className="flex items-start justify-between gap-3">
                      <Identidade usuario={u} />
                      <div className="flex shrink-0 flex-col items-end gap-1">
                        <Selo cor={COR_TIPO[u.tipo_usuario]}>{ROTULO_TIPO[u.tipo_usuario]}</Selo>
                        <Selo cor={COR_STATUS[u.status]}>{ROTULO_STATUS[u.status]}</Selo>
                      </div>
                    </div>
                    <Acoes usuario={u} eu={eu.id} aoEscolher={escolherAcao} />
                  </li>
                ))}
              </ul>
            </>
          )}

          {totalPaginas > 1 && (
            <nav aria-label="Páginas" className="flex items-center justify-between gap-3 border-t border-borda px-5 py-3 text-sm">
              <button
                type="button"
                disabled={pagina <= 1}
                onClick={() => setPagina((p) => p - 1)}
                className="rounded-lg border border-borda px-4 py-2 font-semibold transition hover:bg-fundo disabled:opacity-40"
              >
                Anterior
              </button>
              <span className="text-suave">Página {pagina} de {totalPaginas}</span>
              <button
                type="button"
                disabled={pagina >= totalPaginas}
                onClick={() => setPagina((p) => p + 1)}
                className="rounded-lg border border-borda px-4 py-2 font-semibold transition hover:bg-fundo disabled:opacity-40"
              >
                Próxima
              </button>
            </nav>
          )}
        </section>
      )}

      {acao && (
        <ModalConfirmar
          titulo={modais[acao.tipo].titulo(acao.usuario)}
          rotuloConfirmar={modais[acao.tipo].botao}
          perigo={modais[acao.tipo].perigo}
          confirmarTexto={acao.tipo === 'excluir' ? acao.usuario.email : undefined}
          aoConfirmar={executar}
          aoFechar={() => setAcao(null)}
        >
          {acao.tipo === 'bloquear' && (
            <>
              <p>
                Esta pessoa não poderá entrar na plataforma, e se for cuidador, o perfil deixa de aparecer na busca. O e-mail
                e o CPF dela também não poderão ser usados para criar outra conta, até ela ser desbloqueada.
              </p>
              <div>
                <label htmlFor="motivo-bloqueio" className="mb-1.5 block font-semibold text-tinta">Motivo (opcional)</label>
                <textarea
                  id="motivo-bloqueio"
                  rows={2}
                  value={motivo}
                  onChange={(e) => setMotivo(e.target.value)}
                  maxLength={300}
                  className={estiloTextarea(false)}
                />
                <div className="mt-2 flex flex-wrap gap-2">
                  {SUGESTOES_MOTIVO.map((sugestao) => (
                    <button
                      key={sugestao}
                      type="button"
                      onClick={() => setMotivo(sugestao)}
                      className="rounded-full border border-borda px-3 py-1 text-xs font-medium transition hover:border-marca/50"
                    >
                      {sugestao}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}
          {acao.tipo === 'excluir' && (
            <p>
              A conta será desativada: a pessoa não poderá mais entrar e, se for cuidador, o perfil sai da busca. Nada é apagado do
              sistema: você pode reativar a conta depois, e se a pessoa se cadastrar de novo com o mesmo e-mail, a conta antiga
              volta com os dados dela.
            </p>
          )}
          {acao.tipo === 'ativar' && <p>A pessoa volta a poder entrar na plataforma com o e-mail e a senha dela.</p>}
        </ModalConfirmar>
      )}
    </div>
  )
}
