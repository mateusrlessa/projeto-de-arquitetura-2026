import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import Avatar from '../components/Avatar.jsx'
import Cartao from '../components/Cartao.jsx'
import Estrelas from '../components/Estrelas.jsx'
import FormularioAvaliacao from '../components/FormularioAvaliacao.jsx'
import ModalConfirmar from '../components/ModalConfirmar.jsx'
import ModalDenuncia from '../components/ModalDenuncia.jsx'
import { Alerta, Capelo, Check, Coracao, Escudo, Lapis, Lixeira, Maleta, Mensagens, OlhoRiscado, Pessoas, Pino, Relogio, SetaEsquerda, Whatsapp } from '../components/Icones.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import { api } from '../lib/api.js'
import { ROTULOS_NOTA } from '../lib/avaliacoes.js'
import { dataLonga, linkWhatsapp, plural, primeiroNome } from '../lib/format.js'
import { buscarAvaliacoes, buscarCuidador, useModoDemo } from '../lib/dados.js'
import { useDados } from '../lib/useApi.js'

const chip = 'rounded-lg bg-marca-clara px-3 py-1.5 text-xs font-medium text-marca-escura'
const estiloContatar = 'inline-flex items-center justify-center gap-2 rounded-xl bg-whats px-10 py-3.5 font-semibold text-white shadow-sm transition hover:brightness-95'
const MENSAGEM_EXCLUIDA = 'Avaliação excluída.'

async function buscarContratacoesConcluidas(cuidadorId, signal) {
  const params = { status: 'CONCLUIDA', pagina: 1, limite: 100 }
  const primeira = await api('/contratacoes', { params, signal })
  const demais = await Promise.all(
    Array.from({ length: Math.max(0, primeira.paginacao.total_paginas - 1) }, (_, indice) =>
      api('/contratacoes', { params: { ...params, pagina: indice + 2 }, signal }),
    ),
  )
  return [primeira, ...demais]
    .flatMap((resposta) => resposta.dados)
    .filter((contratacao) => contratacao.cuidador_id === Number(cuidadorId))
}

function BotaoContatar({ cuidador: c }) {
  const { usuario } = useAuth()

  if (!usuario) {
    return (
      <>
        <Link
          to="/acesso"
          state={{ aviso: 'Para contatar um profissional, é preciso efetuar o login.', voltarPara: `/cuidadores/${c.id}` }}
          className={estiloContatar}
        >
          <Whatsapp tamanho={20} /> Contatar
        </Link>
        <p className="mt-2 text-xs text-suave">Converse diretamente com {primeiroNome(c.nome_completo)}</p>
      </>
    )
  }

  return (
    <>
      <a href={linkWhatsapp(c.telefone_whatsapp, c.nome_completo)} target="_blank" rel="noreferrer" className={estiloContatar}>
        <Whatsapp tamanho={20} /> Contatar
      </a>
      <p className="mt-2 text-xs text-suave">Converse diretamente com {primeiroNome(c.nome_completo)}</p>
    </>
  )
}

// Conta os segundos que faltam, partindo do valor medido pelo servidor.
function useSegundosRestantes(segundos) {
  const [restante, setRestante] = useState(segundos ?? 0)

  useEffect(() => {
    const fim = Date.now() + (segundos ?? 0) * 1000
    const calcular = () => Math.max(0, Math.ceil((fim - Date.now()) / 1000))
    setRestante(calcular())
    if (!segundos) return undefined
    const intervalo = setInterval(() => {
      const faltam = calcular()
      setRestante(faltam)
      if (faltam === 0) clearInterval(intervalo)
    }, 1000)
    return () => clearInterval(intervalo)
  }, [segundos])

  return restante
}

const relogio = (segundos) => `${Math.floor(segundos / 60)}:${String(segundos % 60).padStart(2, '0')}`

function MinhaAvaliacao({ avaliacao: a, nome, cuidador, aoAtualizar }) {
  const [editando, setEditando] = useState(false)
  const [excluindo, setExcluindo] = useState(false)
  const restante = useSegundosRestantes(a.segundos_para_editar)
  const respondida = Boolean(a.resposta)
  const noPrazo = restante > 0
  const podeEditar = noPrazo && !respondida

  async function excluir() {
    await api(`/cuidadores/${cuidador.id}/avaliacoes/${a.id}`, { method: 'DELETE' })
    setExcluindo(false)
    aoAtualizar(a.contratacao_id ? `${MENSAGEM_EXCLUIDA} Este serviço não poderá receber outra avaliação.` : MENSAGEM_EXCLUIDA)
  }

  if (a.status === 'INATIVA') {
    return <p className="text-sm text-suave">Esta avaliação foi excluída e não pode ser publicada novamente para este serviço.</p>
  }

  if (editando) {
    return (
      <div className="space-y-4">
        <p role="status" className={`flex items-center gap-2 text-xs ${noPrazo ? 'text-suave' : 'font-medium text-red-600'}`}>
          <Relogio tamanho={14} />
          {noPrazo ? `Você pode salvar alterações por mais ${relogio(restante)}.` : 'O prazo terminou: não é mais possível salvar alterações.'}
        </p>
        <FormularioAvaliacao
          cuidador={cuidador}
          avaliacao={a}
          aoConcluir={(mensagem) => {
            setEditando(false)
            aoAtualizar(mensagem)
          }}
        />
      </div>
    )
  }

  return (
    <>
      <p className="flex items-center gap-2 text-sm font-medium">
        <Estrelas nota={a.nota} tamanho={18} /> {ROTULOS_NOTA[a.nota]}
      </p>
      <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-suave">{a.comentario}</p>
      <p className="mt-3 text-xs text-suave">
        {a.contratacao_id
          ? 'Esta avaliação está vinculada a um serviço concluído. Cada serviço pode receber uma avaliação.'
          : `Você já publicou uma avaliação histórica para ${nome}.`}
      </p>

      {podeEditar ? (
        <>
          <p role="status" className="mt-3 flex items-center gap-2 text-xs font-medium text-marca-escura">
            <Relogio tamanho={14} /> Você pode editar ou excluir por mais {relogio(restante)}.
          </p>
          <div className="mt-3 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => setEditando(true)}
              className="inline-flex items-center gap-2 rounded-lg border border-borda px-4 py-2 text-sm font-semibold text-marca transition hover:bg-marca-clara"
            >
              <Lapis tamanho={16} /> Editar minha avaliação
            </button>
            <button
              type="button"
              onClick={() => setExcluindo(true)}
              className="inline-flex items-center gap-2 rounded-lg border border-red-200 px-4 py-2 text-sm font-semibold text-red-600 transition hover:bg-red-50"
            >
              <Lixeira tamanho={16} /> Excluir
            </button>
          </div>
        </>
      ) : (
        <p className="mt-3 flex items-center gap-2 text-xs text-suave">
          <Relogio tamanho={14} />
          {respondida ? `${nome} já respondeu, então a avaliação não pode mais ser editada.` : 'O prazo para editar ou excluir esta avaliação terminou.'}
        </p>
      )}

      {excluindo && (
        <ModalConfirmar
          titulo="Excluir sua avaliação?"
          rotuloConfirmar="Excluir avaliação"
          perigo
          aoConfirmar={excluir}
          aoFechar={() => setExcluindo(false)}
        >
          <p>
            {a.contratacao_id
              ? `Ela deixa de aparecer no perfil de ${nome}, mas este serviço não poderá receber outra avaliação.`
              : `Ela deixa de aparecer no perfil de ${nome}. Para avaliar novamente, será necessário concluir outro serviço.`}
          </p>
        </ModalConfirmar>
      )}
    </>
  )
}

function AvaliacaoDaContratacao({ cuidador, contratacaoId, aoPublicar }) {
  const { dados, carregando, erro, recarregar } = useDados(
    `minha-avaliacao-${cuidador.id}-${contratacaoId}`,
    (signal) =>
      api(`/cuidadores/${cuidador.id}/avaliacoes/minha`, {
        params: { contratacao_id: contratacaoId },
        signal,
      }),
  )
  const [mensagem, setMensagem] = useState('')

  function aoAtualizar(texto) {
    setMensagem(texto ?? '')
    recarregar()
    aoPublicar()
  }

  if (carregando) return <p role="status" className="text-sm text-suave">Carregando avaliação do serviço…</p>
  if (erro) return <p role="alert" className="text-sm text-red-600">{erro.message}</p>

  return (
    <>
      {mensagem && dados && (
        <p role="status" className="mb-4 flex items-center gap-2 rounded-xl bg-marca-clara p-3 text-sm font-medium text-marca-escura">
          <Check tamanho={18} className="shrink-0 text-marca" />
          {mensagem}
        </p>
      )}
      {dados ? (
        <MinhaAvaliacao avaliacao={dados} nome={primeiroNome(cuidador.nome_completo)} cuidador={cuidador} aoAtualizar={aoAtualizar} />
      ) : (
        <div>
          <p className="text-sm text-suave">A avaliação deste serviço é feita nos detalhes da contratação.</p>
          <Link
            to={`/servicos/${contratacaoId}`}
            className="mt-3 inline-flex rounded-xl bg-marca px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-marca-escura"
          >
            Abrir serviço para avaliar
          </Link>
        </div>
      )}
    </>
  )
}

function AvaliarCuidador({ cuidador: c, aoPublicar }) {
  const { usuario } = useAuth()
  const modoDemo = useModoDemo()
  const nome1 = primeiroNome(c.nome_completo)
  const ehContratante = usuario?.tipo_usuario === 'CONTRATANTE'
  const { dados: contratacoes, carregando: carregandoContratacoes, erro: erroContratacoes } = useDados(
    ehContratante && !modoDemo ? `contratacoes-concluidas-${usuario.id}-${c.id}` : null,
    (signal) => buscarContratacoesConcluidas(c.id, signal),
  )
  const { dados: avaliacaoLegada, carregando: carregandoLegada, recarregar: recarregarLegada } = useDados(
    ehContratante && !modoDemo ? `minha-avaliacao-legada-${c.id}` : null,
    (signal) => api(`/cuidadores/${c.id}/avaliacoes/minha`, { signal }),
  )
  const [servicoSelecionado, setServicoSelecionado] = useState(null)
  const servicos = (contratacoes ?? []).filter((contratacao) => contratacao.cuidador_id === c.id)
  const escolhaAtiva = servicoSelecionado ?? (
    carregandoContratacoes ? null : String(servicos[0]?.id ?? 'legada')
  )
  const servicoId = escolhaAtiva && escolhaAtiva !== 'legada' ? Number(escolhaAtiva) : null
  const minha = ehContratante ? avaliacaoLegada : null
  const carregando = carregandoContratacoes || (!servicoId && carregandoLegada)
  const temAvaliacaoSelecionada = servicoId
    ? Boolean(servicos.find((servico) => servico.id === servicoId)?.avaliacao_id)
    : Boolean(minha)
  // Confirmação da última ação (publicar, editar, excluir). O formulário some assim que a avaliação chega do servidor.
  const [mensagem, setMensagem] = useState('')
  // Só a primeira busca esconde o cartão. Nas seguintes (depois de publicar, editar ou excluir) ele fica na tela.
  const [primeiraBuscaFeita, setPrimeiraBuscaFeita] = useState(false)

  useEffect(() => {
    if (!carregando) setPrimeiraBuscaFeita(true)
  }, [carregando])

  // Depois de qualquer mudança, busca de novo a avaliação do usuário e atualiza o perfil e a lista de avaliações.
  function aoMudar(texto) {
    setMensagem(texto ?? '')
    recarregarLegada()
    aoPublicar()
  }

  // Os dados de exemplo não existem no servidor, e só contratantes podem avaliar.
  if (modoDemo || (usuario && !ehContratante)) return null
  // Espera a resposta para não mostrar o formulário por um instante a quem já avaliou.
  if (ehContratante && carregando && !primeiraBuscaFeita) return null

  return (
    <Cartao icone={Lapis} titulo={temAvaliacaoSelecionada ? 'Sua avaliação' : `Avaliações de ${nome1}`}>
      {servicos.length > 0 && (
        <div className="mb-4">
          <label htmlFor={`servico-avaliacao-${c.id}`} className="mb-1.5 block text-sm font-semibold">Serviço concluído</label>
          <select
            id={`servico-avaliacao-${c.id}`}
            value={escolhaAtiva ?? ''}
            onChange={(e) => {
              setServicoSelecionado(e.target.value)
              setMensagem('')
            }}
            className="w-full rounded-xl border border-borda bg-white px-3 py-2.5 text-sm"
          >
            {servicos.map((servico) => (
              <option key={servico.id} value={String(servico.id)}>
                Serviço #{servico.id} — concluído em {new Date(servico.contratante_confirmou_realizacao_em).toLocaleDateString('pt-BR')}
                {servico.avaliacao_id ? ' — já avaliado' : ''}
              </option>
            ))}
            {avaliacaoLegada && <option value="legada">Avaliação histórica (sem serviço vinculado)</option>}
          </select>
        </div>
      )}
      {/* Depois de publicar ou editar, o aviso aparece junto da avaliação. O formulário já tem o seu próprio aviso enquanto espera. */}
      {mensagem && (minha || mensagem.startsWith(MENSAGEM_EXCLUIDA)) && (
        <p role="status" className="mb-4 flex items-center gap-2 rounded-xl bg-marca-clara p-3 text-sm font-medium text-marca-escura">
          <Check tamanho={18} className="shrink-0 text-marca" />
          {mensagem}
        </p>
      )}
      {servicoId ? (
        <AvaliacaoDaContratacao
          key={servicoId}
          cuidador={c}
          contratacaoId={servicoId}
          aoPublicar={aoPublicar}
        />
      ) : minha ? (
        <MinhaAvaliacao avaliacao={minha} nome={nome1} cuidador={c} aoAtualizar={aoMudar} />
      ) : usuario && escolhaAtiva === 'legada' && servicos.length > 0 ? (
        <>
          {erroContratacoes && <p role="alert" className="text-sm text-red-600">{erroContratacoes.message}</p>}
          <p className="text-sm text-suave">Abra os detalhes de um serviço concluído para avaliar.</p>
        </>
      ) : usuario && !servicos.length ? (
        <>
          {erroContratacoes && <p role="alert" className="text-sm text-red-600">{erroContratacoes.message}</p>}
          <p className="text-sm text-suave">Após concluir um serviço com {nome1}, a avaliação ficará disponível nos detalhes da contratação.</p>
          <Link to="/servicos" className="mt-3 inline-flex rounded-xl border border-marca px-5 py-2.5 text-sm font-semibold text-marca hover:bg-marca-clara">
            Ver serviços
          </Link>
        </>
      ) : (
        <p className="text-sm text-suave">As avaliações são publicadas nos detalhes de uma contratação concluída.</p>
      )}
    </Cartao>
  )
}

const TEXTOS_ADMIN = {
  ocultar: {
    titulo: 'Ocultar este comentário?',
    rotulo: 'Ocultar comentário',
    aviso: (autor) =>
      `O comentário de ${autor} deixa de aparecer no perfil e a nota sai da média. Ele fica guardado na aba Ocultos da Moderação, onde dá para restaurar. Quem escreveu não poderá publicar outro no lugar.`,
  },
  excluir: {
    titulo: 'Excluir este comentário?',
    rotulo: 'Excluir comentário',
    aviso: (autor, avaliacao) =>
      avaliacao.contratacao_id
        ? `A avaliação de ${autor} será retirada do perfil e não poderá ser recriada para este serviço.`
        : `O comentário de ${autor}, a resposta e as denúncias são apagados do banco de dados. Não dá para desfazer.`,
  },
  resposta: {
    titulo: 'Apagar esta resposta?',
    rotulo: 'Apagar resposta',
    aviso: () => 'A resposta deixa de aparecer no perfil.',
  },
}

export default function PerfilCuidador() {
  const { id } = useParams()
  const { dados: c, carregando, erro, recarregar } = useDados(`perfil-${id}`, (signal) => buscarCuidador(id, { signal }))
  const { dados: avaliacoesResp, recarregar: recarregarAvaliacoes } = useDados(`avaliacoes-${id}`, (signal) => buscarAvaliacoes(id, { signal }))
  const avaliacoes = avaliacoesResp ?? []
  const { usuario } = useAuth()
  const modoDemo = useModoDemo()
  const ehAdmin = usuario?.tipo_usuario === 'ADMIN' && !modoDemo
  // Ação do admin a confirmar: { avaliacao, alvo: 'ocultar' | 'excluir' | 'resposta' }.
  const [apagando, setApagando] = useState(null)
  // Comentário que a pessoa está denunciando e os que ela já denunciou nesta visita.
  const [denunciando, setDenunciando] = useState(null)
  const [denunciados, setDenunciados] = useState(() => new Set())
  const podeDenunciar = Boolean(usuario) && usuario.tipo_usuario !== 'ADMIN' && !modoDemo
  const podeContratar = usuario?.tipo_usuario === 'CONTRATANTE' && Number(usuario.id) !== Number(c?.id) && !modoDemo

  async function apagar() {
    const { avaliacao, alvo } = apagando
    if (alvo === 'resposta') {
      await api(`/avaliacoes/${avaliacao.id}/resposta/status`, { method: 'PATCH', body: { status: 'INATIVO' } })
    } else if (alvo === 'excluir') {
      // Exclusão definitiva: apaga o comentário, a resposta e as denúncias do banco.
      await api(`/moderacao/avaliacoes/${avaliacao.id}`, { method: 'DELETE' })
    } else {
      // OCULTA tira o comentário do ar e guarda o registro; dá para restaurar na tela de Moderação.
      await api(`/avaliacoes/${avaliacao.id}/status`, { method: 'PATCH', body: { status: 'OCULTA' } })
    }
    window.dispatchEvent(new Event('moderacao-mudou'))
    setApagando(null)
    recarregar()
    recarregarAvaliacoes()
  }

  // Ao recarregar o mesmo perfil, mantém a página na tela para não perder a posição nem o formulário.
  if (carregando && String(c?.id) !== id) return <Esqueleto />

  if (erro) {
    const naoEncontrado = erro.status === 404
    return (
      <div role="alert" className="mx-auto max-w-md rounded-2xl border border-borda bg-white px-6 py-12 text-center">
        <span className="mx-auto flex size-12 items-center justify-center rounded-full bg-red-100 text-red-600">
          <Alerta tamanho={22} />
        </span>
        <h1 className="mt-4 font-titulo text-xl font-semibold">
          {naoEncontrado ? 'Perfil não encontrado' : 'Não foi possível carregar o perfil'}
        </h1>
        <p className="mt-2 text-sm text-suave">{naoEncontrado ? 'Esse cuidador não está mais disponível.' : erro.message}</p>
        <div className="mt-5 flex justify-center gap-3">
          {!naoEncontrado && (
            <button onClick={recarregar} className="rounded-full bg-marca px-5 py-2 text-sm font-semibold text-white hover:bg-marca-escura">
              Tentar novamente
            </button>
          )}
          <Link to="/cuidadores" className="rounded-full border border-marca px-5 py-2 text-sm font-semibold text-marca hover:bg-marca-clara">
            Ver cuidadores
          </Link>
        </div>
      </div>
    )
  }

  const nome1 = primeiroNome(c.nome_completo)
  const nota = c.nota_media
  const cidade = c.cidades[0]

  return (
    <div className="space-y-6 pb-4">
      <Link to="/cuidadores" className="inline-flex items-center gap-2 text-sm font-semibold text-marca hover:text-marca-escura">
        <SetaEsquerda tamanho={16} /> Voltar aos resultados
      </Link>

      <header className="flex flex-col gap-6 rounded-2xl border border-borda bg-white p-6 sm:flex-row sm:items-center sm:p-8">
        <Avatar nome={c.nome_completo} chave={c.foto_perfil_storage_key} tamanho={140} className="ring-4 ring-marca-clara" />
        <div className="flex-1 space-y-1.5">
          <h1 className="font-titulo text-3xl font-bold sm:text-4xl">{c.nome_completo}</h1>
          <p className="text-lg font-medium text-suave">{c.funcao}</p>
          {cidade && (
            <p className="flex items-center gap-1.5 text-sm text-suave">
              <Pino tamanho={16} className="text-marca" /> {cidade.nome} - {cidade.uf}
            </p>
          )}
          <p className="flex items-center gap-2 text-sm">
            {nota ? (
              <>
                <Estrelas nota={nota} tamanho={18} />
                <strong>{nota.toFixed(1)}</strong>
                <span className="text-suave">{c.total_avaliacoes} {plural(c.total_avaliacoes, 'avaliação', 'avaliações')}</span>
              </>
            ) : (
              <span className="text-suave">Ainda sem avaliações</span>
            )}
          </p>
        </div>
        <div className="text-center sm:text-right">
          <BotaoContatar cuidador={c} />
          {podeContratar && (
            <Link
              to={`/cuidadores/${c.id}/contratar`}
              className="mt-3 inline-flex w-full items-center justify-center rounded-xl bg-marca px-8 py-3.5 font-semibold text-white shadow-sm transition hover:bg-marca-escura"
            >
              Contratar
            </Link>
          )}
        </div>
      </header>

      <div className="grid items-start gap-6 lg:grid-cols-[1fr_380px]">
        <div className="space-y-6">
          {c.sobre_mim && (
            <Cartao icone={Coracao} titulo="Sobre mim">
              <p className="leading-relaxed text-suave">{c.sobre_mim}</p>
            </Cartao>
          )}

          {c.formacoes.length > 0 && (
            <Cartao icone={Capelo} titulo="Formação e cursos">
              <ul className="divide-y divide-borda">
                {c.formacoes.map((f) => (
                  <li key={f.id} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
                    <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-marca-clara text-marca">
                      <Check tamanho={16} />
                    </span>
                    <div className="flex-1">
                      <p className="text-sm font-semibold">{f.nome_curso}</p>
                      <p className="text-sm text-suave">{f.nome_instituicao}</p>
                    </div>
                    {f.ano_conclusao && <span className={chip}>{f.ano_conclusao}</span>}
                  </li>
                ))}
              </ul>
            </Cartao>
          )}

          {c.experiencias.length > 0 && (
            <Cartao icone={Maleta} titulo="Experiências">
              <ol className="space-y-6 border-l border-borda pl-6">
                {c.experiencias.map((x) => (
                  <li key={x.id} className="relative">
                    <span className="absolute -left-[29px] top-1.5 size-2.5 rounded-full bg-marca" />
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <h3 className="font-semibold text-marca-escura">{x.cargo ?? x.nome_local_trabalho}</h3>
                      <span className="text-sm text-suave">
                        {x.ano_inicio} — {x.ano_fim ?? 'atual'}
                      </span>
                    </div>
                    {x.cargo && <p className="text-sm font-medium text-marca">{x.nome_local_trabalho}</p>}
                    {x.descricao && <p className="mt-1 text-sm leading-relaxed text-suave">{x.descricao}</p>}
                  </li>
                ))}
              </ol>
            </Cartao>
          )}
        </div>

        <aside className="space-y-6">
          <Cartao icone={Relogio} titulo="Tempo de experiência">
            <div className="rounded-xl bg-marca-clara p-5">
              <p className="font-titulo text-3xl font-semibold text-marca">
                {c.anos_experiencia} {plural(c.anos_experiencia, 'ano', 'anos')}
              </p>
              <p className="mt-1 text-sm">como {c.funcao.toLowerCase()}</p>
            </div>
          </Cartao>

          {c.especializacoes.length > 0 && (
            <Cartao icone={Pessoas} titulo="Especializações / Quem eu cuido">
              <ul className="flex flex-wrap gap-2">
                {c.especializacoes.map((e) => (
                  <li key={e.id} className={chip}>{e.nome}</li>
                ))}
              </ul>
            </Cartao>
          )}

          {c.cidades.length > 0 && (
            <Cartao icone={Pino} titulo="Regiões de atuação">
              <p className="mb-3 text-sm text-suave">Atendimento domiciliar nas cidades abaixo.</p>
              <ul className="flex flex-wrap gap-2">
                {c.cidades.map((x) => (
                  <li key={x.id} className={chip}>{x.nome}</li>
                ))}
              </ul>
            </Cartao>
          )}

          <p className="flex items-center gap-3 rounded-2xl border border-borda bg-white px-5 py-4 text-xs text-suave">
            <Escudo tamanho={22} className="shrink-0 text-marca" />
            Perfil e formação informados pela profissional.
          </p>
        </aside>
      </div>

      <AvaliarCuidador
        key={c.id}
        cuidador={c}
        aoPublicar={() => {
          recarregar()
          recarregarAvaliacoes()
        }}
      />

      <section className="rounded-2xl border border-borda bg-white p-6">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-borda pb-4">
          <h2 className="flex items-center gap-3 font-titulo text-lg font-medium">
            <span className="flex size-9 items-center justify-center rounded-lg bg-marca-clara text-marca">
              <Mensagens tamanho={18} />
            </span>
            Avaliações
          </h2>
          {nota && (
            <p className="flex items-center gap-2 text-sm">
              <strong className="font-titulo text-2xl">{nota.toFixed(1)}</strong>
              <Estrelas nota={nota} />
              <span className="text-suave">{c.total_avaliacoes} {plural(c.total_avaliacoes, 'avaliação', 'avaliações')}</span>
            </p>
          )}
        </div>

        {avaliacoes.length === 0 ? (
          <p className="py-8 text-center text-sm text-suave">{nome1} ainda não recebeu avaliações.</p>
        ) : (
          <ul className="mt-5 space-y-4">
            {avaliacoes.map((a) => (
              <li key={a.id} className="rounded-xl border border-borda p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <Avatar nome={a.contratante_nome} tamanho={40} />
                    <div>
                      <p className="text-sm font-medium">{a.contratante_nome}</p>
                      <p className="text-xs text-suave">{dataLonga(a.criado_em)}</p>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <Estrelas nota={a.nota} tamanho={15} />
                    {podeDenunciar && usuario.id !== a.contratante_id &&
                      (denunciados.has(a.id) ? (
                        <span role="status" className="inline-flex items-center gap-1.5 text-xs font-medium text-suave"><Check tamanho={13} /> Denúncia enviada</span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setDenunciando(a)}
                          className="inline-flex items-center gap-1.5 text-xs font-medium text-suave transition hover:text-red-600 hover:underline"
                        >
                          <Alerta tamanho={13} /> Denunciar
                        </button>
                      ))}
                    {ehAdmin && (
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => setApagando({ avaliacao: a, alvo: 'ocultar' })}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-borda px-2.5 py-1 text-xs font-semibold text-tinta transition hover:bg-fundo"
                        >
                          <OlhoRiscado tamanho={14} /> Ocultar
                        </button>
                        <button
                          type="button"
                          onClick={() => setApagando({ avaliacao: a, alvo: 'excluir' })}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 px-2.5 py-1 text-xs font-semibold text-red-600 transition hover:bg-red-50"
                        >
                          <Lixeira tamanho={14} /> Excluir
                        </button>
                      </div>
                    )}
                  </div>
                </div>
                <p className="mt-4 whitespace-pre-line text-sm leading-relaxed text-suave">{a.comentario}</p>
                {a.resposta && (
                  <div className="mt-4 rounded-lg border-l-4 border-marca bg-marca-clara/60 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <p className="text-xs font-medium text-marca">Resposta de {nome1}</p>
                      {ehAdmin && (
                        <button
                          type="button"
                          onClick={() => setApagando({ avaliacao: a, alvo: 'resposta' })}
                          className="inline-flex items-center gap-1.5 text-xs font-semibold text-red-600 hover:underline"
                        >
                          <Lixeira tamanho={13} /> Apagar resposta
                        </button>
                      )}
                    </div>
                    <p className="mt-1 text-sm text-suave">{a.resposta.resposta}</p>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      {denunciando && (
        <ModalDenuncia
          avaliacao={denunciando}
          aoEnviar={(idAvaliacao) => {
            setDenunciados((atual) => new Set(atual).add(idAvaliacao))
            setDenunciando(null)
          }}
          aoFechar={() => setDenunciando(null)}
        />
      )}

      {apagando && (
        <ModalConfirmar
          titulo={TEXTOS_ADMIN[apagando.alvo].titulo}
          rotuloConfirmar={TEXTOS_ADMIN[apagando.alvo].rotulo}
          perigo={apagando.alvo !== 'ocultar'}
          aoConfirmar={apagar}
          aoFechar={() => setApagando(null)}
        >
          <blockquote className="max-h-40 overflow-y-auto whitespace-pre-line rounded-lg border-l-4 border-borda bg-fundo p-3 text-tinta">
            {apagando.alvo === 'resposta' ? apagando.avaliacao.resposta.resposta : apagando.avaliacao.comentario}
          </blockquote>
          <p>{TEXTOS_ADMIN[apagando.alvo].aviso(apagando.avaliacao.contratante_nome, apagando.avaliacao)}</p>
        </ModalConfirmar>
      )}
    </div>
  )
}

function Esqueleto() {
  return (
    <div className="space-y-6" aria-busy="true" style={{ animation: 'pulso 1.4s ease-in-out infinite' }}>
      <div className="h-5 w-40 rounded bg-borda" />
      <div className="h-48 rounded-2xl bg-borda/70" />
      <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
        <div className="h-72 rounded-2xl bg-borda/70" />
        <div className="h-72 rounded-2xl bg-borda/70" />
      </div>
    </div>
  )
}
