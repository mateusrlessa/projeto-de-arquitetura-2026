import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import Avatar from '../components/Avatar.jsx'
import { estiloTextarea } from '../components/Campo.jsx'
import { TituloPagina } from '../components/Cartao.jsx'
import Estrelas from '../components/Estrelas.jsx'
import { Alerta, Chevron, Mensagens, Responder, Tendencia } from '../components/Icones.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import { api } from '../lib/api.js'
import { dataLonga, plural, primeiroNome } from '../lib/format.js'
import { useDados } from '../lib/useApi.js'

const POR_PAGINA = 20
const LIMITE_RESPOSTA = 500

const ORDENACOES = {
  recentes: { rotulo: 'Mais recentes', ordenar: 'data', ordem: 'desc' },
  antigas: { rotulo: 'Mais antigas', ordenar: 'data', ordem: 'asc' },
  maiores: { rotulo: 'Maiores notas', ordenar: 'nota', ordem: 'desc' },
  menores: { rotulo: 'Menores notas', ordenar: 'nota', ordem: 'asc' },
}

const percentual = (parte, total) => (total ? Math.round((parte / total) * 100) : 0)

export default function Avaliacoes() {
  const { usuario } = useAuth()
  const { dados: resumo, carregando, erro, recarregar } = useDados('resumo-avaliacoes', (signal) =>
    api(`/cuidadores/${usuario.id}/avaliacoes/resumo`, { signal }),
  )

  return (
    <div className="space-y-6 pb-4">
      <TituloPagina icone={Mensagens} titulo="Avaliações">
        Acompanhe o que as famílias dizem sobre seu cuidado e responda aos comentários.
      </TituloPagina>

      {carregando && <div aria-busy="true" className="h-52 rounded-2xl bg-borda/70" style={{ animation: 'pulso 1.4s ease-in-out infinite' }} />}
      {erro?.status === 404 && <SemPerfil />}
      {erro && erro.status !== 404 && <Falha mensagem={erro.message} aoTentar={recarregar} />}
      {resumo && (
        <>
          <Resumo resumo={resumo} />
          <Comentarios cuidadorId={usuario.id} nomeCuidador={usuario.nome_completo} />
        </>
      )}
    </div>
  )
}

function SemPerfil() {
  return (
    <section className="rounded-2xl border border-borda bg-white px-6 py-12 text-center">
      <h2 className="font-titulo text-xl font-semibold">Você ainda não tem um perfil de cuidador</h2>
      <p className="mt-2 text-sm text-suave">Crie seu perfil para aparecer nas buscas e receber avaliações das famílias.</p>
      <Link to="/meu-perfil" className="mt-5 inline-block rounded-xl bg-marca px-6 py-3 text-sm font-semibold text-white hover:bg-marca-escura">
        Criar meu perfil
      </Link>
    </section>
  )
}

function Falha({ mensagem, aoTentar }) {
  return (
    <div role="alert" className="rounded-2xl border border-borda bg-white px-6 py-10 text-center">
      <span className="mx-auto flex size-12 items-center justify-center rounded-full bg-red-100 text-red-600">
        <Alerta tamanho={22} />
      </span>
      <p className="mt-4 text-sm text-suave">{mensagem}</p>
      <button onClick={aoTentar} className="mt-4 rounded-full bg-marca px-5 py-2 text-sm font-semibold text-white hover:bg-marca-escura">
        Tentar novamente
      </button>
    </div>
  )
}

function Resumo({ resumo }) {
  const total = resumo.total_avaliacoes
  const media = resumo.nota_media ?? 0
  const positivas = percentual(resumo.por_nota[4] + resumo.por_nota[5], total)

  return (
    <section className="grid items-center gap-6 rounded-2xl border border-borda bg-white p-6 shadow-sm lg:grid-cols-[280px_1fr_220px] lg:p-7">
      <div className="text-center lg:border-r lg:border-borda lg:pr-6">
        <p className="font-titulo text-6xl font-bold">
          {media.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
        </p>
        <div className="mt-2 flex justify-center">
          <Estrelas nota={media} tamanho={22} />
        </div>
        <p className="mt-2 text-sm text-suave">
          {total ? `Com base em ${total} ${plural(total, 'avaliação', 'avaliações')}` : 'Você ainda não recebeu avaliações'}
        </p>
      </div>

      <ul className="space-y-2.5">
        {[5, 4, 3, 2, 1].map((nota) => {
          const quantidade = resumo.por_nota[nota]
          const parte = percentual(quantidade, total)
          return (
            <li key={nota} className="grid grid-cols-[28px_1fr_28px_36px] items-center gap-3 text-xs">
              <span className="flex items-center gap-1 font-semibold">
                {nota} <span className="text-estrela" aria-hidden="true">★</span>
              </span>
              <span className="h-2 overflow-hidden rounded-full bg-marca-clara">
                <span
                  className="block h-full rounded-full bg-marca"
                  style={{ width: `${parte}%`, minWidth: quantidade ? 6 : 0 }}
                />
              </span>
              <span className="text-right text-suave">{quantidade}</span>
              <span className="text-right text-suave">{parte}%</span>
            </li>
          )
        })}
      </ul>

      {total > 0 && (
        <aside className="rounded-xl bg-marca-clara p-5">
          <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-marca">
            <Tendencia tamanho={18} /> {positivas >= 80 ? 'Ótimo trabalho' : 'Seu resumo'}
          </p>
          <p className="mt-2 text-sm leading-relaxed text-suave">
            {positivas}% das famílias deram 4 ou 5 estrelas ao seu atendimento.
          </p>
        </aside>
      )}
    </section>
  )
}

function Comentarios({ cuidadorId, nomeCuidador }) {
  const [ordenacao, setOrdenacao] = useState('recentes')
  const [pagina, setPagina] = useState(1)
  const [lista, setLista] = useState({ itens: [], total: 0, carregando: true, erro: null })
  const [respondendo, setRespondendo] = useState(null)
  const [tentativa, setTentativa] = useState(0)

  useEffect(() => {
    const controle = new AbortController()
    const { ordenar, ordem } = ORDENACOES[ordenacao]

    api(`/cuidadores/${cuidadorId}/avaliacoes`, {
      params: { ordenar, ordem, pagina, limite: POR_PAGINA },
      signal: controle.signal,
    })
      .then(({ dados, paginacao }) =>
        setLista((atual) => ({
          itens: pagina === 1 ? dados : [...atual.itens, ...dados],
          total: paginacao.total,
          carregando: false,
          erro: null,
        })),
      )
      .catch((erro) => {
        if (erro.name !== 'AbortError') setLista((atual) => ({ ...atual, carregando: false, erro }))
      })
    return () => controle.abort()
  }, [cuidadorId, ordenacao, pagina, tentativa])

  function alterarOrdenacao(nova) {
    setLista((atual) => ({ ...atual, carregando: true, erro: null }))
    setOrdenacao(nova)
    setPagina(1)
  }

  function carregarMais() {
    setLista((atual) => ({ ...atual, carregando: true, erro: null }))
    setPagina((p) => p + 1)
  }

  function tentarDeNovo() {
    setLista((atual) => ({ ...atual, carregando: true, erro: null }))
    setTentativa((t) => t + 1)
  }

  function aoResponder(avaliacaoId, resposta) {
    setLista((atual) => ({
      ...atual,
      itens: atual.itens.map((a) => (a.id === avaliacaoId ? { ...a, resposta } : a)),
    }))
    setRespondendo(null)
  }

  return (
    <section className="pt-2">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-titulo text-xl font-semibold">Comentários das famílias</h2>
        <label className="relative">
          <span className="sr-only">Ordenar comentários</span>
          <select
            value={ordenacao}
            onChange={(e) => alterarOrdenacao(e.target.value)}
            className="h-9 appearance-none rounded-lg border border-borda bg-white pl-3 pr-9 text-xs text-suave focus:border-marca focus:outline-none focus:ring-2 focus:ring-marca/30"
          >
            {Object.entries(ORDENACOES).map(([chave, { rotulo }]) => (
              <option key={chave} value={chave}>{rotulo}</option>
            ))}
          </select>
          <Chevron tamanho={14} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-suave" />
        </label>
      </div>

      {lista.erro && <Falha mensagem={lista.erro.message} aoTentar={tentarDeNovo} />}

      {!lista.erro && !lista.carregando && lista.itens.length === 0 && (
        <p className="rounded-2xl border border-borda bg-white px-6 py-12 text-center text-sm text-suave">
          As avaliações das famílias aparecerão aqui.
        </p>
      )}

      <ul className="space-y-4">
        {lista.itens.map((avaliacao) => (
          <CartaoAvaliacao
            key={avaliacao.id}
            avaliacao={avaliacao}
            nomeCuidador={nomeCuidador}
            aberto={respondendo === avaliacao.id}
            aoAlternar={() => setRespondendo((id) => (id === avaliacao.id ? null : avaliacao.id))}
            aoResponder={(resposta) => aoResponder(avaliacao.id, resposta)}
          />
        ))}
      </ul>

      {lista.carregando && <p className="py-6 text-center text-sm text-suave">Carregando avaliações…</p>}

      {!lista.carregando && !lista.erro && lista.itens.length < lista.total && (
        <div className="mt-5 text-center">
          <button
            onClick={carregarMais}
            className="rounded-xl border border-marca px-6 py-2.5 text-sm font-semibold text-marca transition hover:bg-marca-clara"
          >
            Carregar mais avaliações
          </button>
        </div>
      )}
    </section>
  )
}

function CartaoAvaliacao({ avaliacao: a, nomeCuidador, aberto, aoAlternar, aoResponder }) {
  const situacao = aberto ? 'Respondendo agora' : a.resposta ? 'Respondida' : 'Sem resposta'
  const acao = aberto ? 'Cancelar' : a.resposta ? 'Editar resposta' : 'Responder'

  return (
    <li className="rounded-2xl border border-borda bg-white p-5 sm:p-6">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <Avatar nome={a.contratante_nome} tamanho={44} />
          <div>
            <p className="text-sm font-semibold">{a.contratante_nome}</p>
            <p className="text-xs text-suave">{dataLonga(a.criado_em)}</p>
            {a.contratacao_id && (
              <Link
                to={`/servicos/${a.contratacao_id}`}
                className="mt-1 inline-block text-xs font-medium text-marca hover:text-marca-escura hover:underline"
              >
                Serviço #{a.contratacao_id}
              </Link>
            )}
          </div>
        </div>
        <Estrelas nota={a.nota} tamanho={17} />
      </div>

      <p className="mt-4 whitespace-pre-line text-sm leading-relaxed text-suave">{a.comentario}</p>

      {a.resposta && !aberto && (
        <div className="mt-4 flex gap-3 rounded-lg border-l-4 border-marca bg-marca-clara/70 p-4">
          <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-marca text-white">
            <Responder tamanho={16} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold text-marca">Resposta de {primeiroNome(nomeCuidador)}</p>
            <p className="mt-1 whitespace-pre-line text-sm leading-relaxed text-suave">{a.resposta.resposta}</p>
          </div>
          <button
            type="button"
            onClick={aoAlternar}
            className="inline-flex shrink-0 items-center gap-1.5 self-start rounded-full border border-marca px-3 py-1.5 text-xs font-semibold text-marca transition hover:bg-white"
          >
            <Responder tamanho={13} /> Editar
          </button>
        </div>
      )}

      {aberto && <FormularioResposta avaliacao={a} aoResponder={aoResponder} aoCancelar={aoAlternar} />}

      <div className="mt-4 flex items-center justify-between gap-3">
        <span className="text-xs text-suave">{situacao}</span>
        {!a.resposta && (
          <button
            type="button"
            onClick={aoAlternar}
            aria-expanded={aberto}
            className="inline-flex items-center gap-2 rounded-full border border-marca px-4 py-1.5 text-xs font-semibold text-marca transition hover:bg-marca-clara"
          >
            {!aberto && <Responder tamanho={14} />} {acao}
          </button>
        )}
      </div>
    </li>
  )
}

function FormularioResposta({ avaliacao: a, aoResponder, aoCancelar }) {
  const [texto, setTexto] = useState(a.resposta?.resposta ?? '')
  const [erro, setErro] = useState('')
  const [enviando, setEnviando] = useState(false)

  async function publicar(e) {
    e.preventDefault()
    setErro('')
    setEnviando(true)
    try {
      const resposta = await api(`/avaliacoes/${a.id}/resposta`, {
        method: a.resposta ? 'PATCH' : 'POST',
        body: { resposta: texto.trim() },
      })
      aoResponder(resposta)
    } catch (falha) {
      setErro(falha.campos?.resposta ?? falha.message)
      setEnviando(false)
    }
  }

  return (
    <form onSubmit={publicar} className="mt-4 rounded-xl border border-borda bg-fundo/50 p-4">
      <label className="block">
        <span className="mb-2 block text-xs font-semibold">Sua resposta</span>
        <textarea
          autoFocus
          rows={3}
          maxLength={LIMITE_RESPOSTA}
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          placeholder={`${primeiroNome(a.contratante_nome)}, muito obrigada pela confiança…`}
          className={estiloTextarea(erro)}
        />
      </label>
      {erro && <p role="alert" className="mt-2 text-xs text-red-600">{erro}</p>}
      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
        <span className="text-xs text-suave">{texto.length} de {LIMITE_RESPOSTA} caracteres</span>
        <div className="flex items-center gap-2">
          {a.resposta && (
            <button
              type="button"
              onClick={aoCancelar}
              disabled={enviando}
              className="rounded-lg border border-borda px-4 py-2 text-sm font-semibold text-suave transition hover:bg-white disabled:opacity-60"
            >
              Cancelar
            </button>
          )}
          <button
            type="submit"
            disabled={enviando || !texto.trim()}
            className="rounded-lg bg-marca px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-marca-escura disabled:opacity-60"
          >
            {enviando ? 'Publicando…' : a.resposta ? 'Salvar resposta' : 'Publicar resposta'}
          </button>
        </div>
      </div>
    </form>
  )
}
