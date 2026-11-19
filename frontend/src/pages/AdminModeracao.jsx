import { useState } from 'react'
import { Link } from 'react-router-dom'
import { TituloPagina } from '../components/Cartao.jsx'
import Estrelas from '../components/Estrelas.jsx'
import { Escudo } from '../components/Icones.jsx'
import ModalConfirmar from '../components/ModalConfirmar.jsx'
import { api } from '../lib/api.js'
import { MOTIVOS_DENUNCIA } from '../lib/denuncias.js'
import { dataLonga, plural } from '../lib/format.js'
import { useDados } from '../lib/useApi.js'

const ROTULO_MOTIVO = Object.fromEntries(MOTIVOS_DENUNCIA)
const botao = 'rounded-lg border px-3 py-1.5 text-xs font-semibold transition'
const POR_PAGINA = 10

function Aba({ ativa, aoEscolher, contagem, children }) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={ativa}
      onClick={aoEscolher}
      className={`flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-semibold transition ${
        ativa ? 'border-marca text-marca' : 'border-transparent text-suave hover:text-tinta'
      }`}
    >
      {children}
      {contagem > 0 && <span className="rounded-full bg-red-600 px-2 py-0.5 text-[11px] text-white">{contagem}</span>}
    </button>
  )
}

function Item({ a, situacao, aoAcao }) {
  const denunciada = situacao === 'DENUNCIADAS'
  return (
    <li className="rounded-xl border border-borda bg-white p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm">
            <strong>{a.contratante_nome}</strong> <span className="text-suave">sobre</span>{' '}
            <Link to={`/cuidadores/${a.cuidador_id}`} className="font-semibold text-marca hover:underline">{a.cuidador_nome}</Link>
          </p>
          <p className="mt-0.5 text-xs text-suave">{dataLonga(a.criado_em)}</p>
        </div>
        <Estrelas nota={a.nota} tamanho={15} />
      </div>

      <p className="mt-3 whitespace-pre-line rounded-lg bg-fundo p-3 text-sm leading-relaxed">{a.comentario}</p>

      {denunciada && (
        <div className="mt-3 space-y-2 text-sm">
          <p className="flex flex-wrap items-center gap-2">
            <span className="font-semibold text-red-700">{a.total_denuncias} {plural(a.total_denuncias, 'denúncia', 'denúncias')}</span>
            {a.motivos.map((m) => (
              <span key={m.motivo} className="rounded-full bg-red-50 px-2.5 py-0.5 text-xs font-semibold text-red-700">
                {ROTULO_MOTIVO[m.motivo] ?? m.motivo}{m.quantidade > 1 ? ` · ${m.quantidade}` : ''}
              </span>
            ))}
          </p>
          {a.detalhes.length > 0 && (
            <ul className="space-y-1 text-suave">
              {a.detalhes.map((d, i) => (
                <li key={i} className="border-l-2 border-borda pl-3">“{d.detalhe}” <span className="text-xs">— {d.denunciante}</span></li>
              ))}
            </ul>
          )}
        </div>
      )}

      <div className="mt-4 flex flex-wrap gap-2">
        {denunciada ? (
          <>
            <button type="button" onClick={() => aoAcao('OCULTAR', a)} className={`${botao} border-red-200 text-red-600 hover:bg-red-50`}>
              Ocultar comentário
            </button>
            <button type="button" onClick={() => aoAcao('MANTER', a)} className={`${botao} border-borda hover:bg-fundo`}>
              Manter e descartar denúncias
            </button>
          </>
        ) : (
          <button type="button" onClick={() => aoAcao('RESTAURAR', a)} className={`${botao} border-marca/40 text-marca hover:bg-marca-clara`}>
            Restaurar comentário
          </button>
        )}
        <button type="button" onClick={() => aoAcao('EXCLUIR', a)} className={`${botao} border-red-600 bg-red-600 text-white hover:bg-red-700`}>
          Excluir permanentemente
        </button>
        <Link to={`/cuidadores/${a.cuidador_id}`} className={`${botao} border-borda hover:bg-fundo`}>Ver perfil</Link>
      </div>
    </li>
  )
}

const TEXTOS = {
  OCULTAR: {
    titulo: 'Ocultar este comentário?',
    rotulo: 'Ocultar',
    perigo: true,
    aviso: 'Ele sai do perfil e a nota deixa de contar na média. Quem escreveu não poderá publicar outro no lugar. Dá para restaurar depois.',
  },
  MANTER: {
    titulo: 'Manter este comentário?',
    rotulo: 'Manter',
    perigo: false,
    aviso: 'As denúncias abertas são descartadas e o comentário continua no perfil.',
  },
  EXCLUIR: {
    titulo: 'Excluir este comentário permanentemente?',
    rotulo: 'Excluir',
    perigo: true,
    aviso: 'O comentário, a resposta do cuidador e as denúncias são apagados do banco de dados. Não dá para desfazer. Quem escreveu poderá avaliar este cuidador de novo.',
  },
  RESTAURAR: {
    titulo: 'Restaurar este comentário?',
    rotulo: 'Restaurar',
    perigo: false,
    aviso: 'Ele volta ao perfil e a nota volta a contar na média.',
  },
}

export default function AdminModeracao() {
  const [situacao, setSituacao] = useState('DENUNCIADAS')
  const [pagina, setPagina] = useState(1)
  const [acao, setAcao] = useState(null)
  const [aviso, setAviso] = useState('')

  const { dados, carregando, erro, recarregar } = useDados(`moderacao-${situacao}-${pagina}`, (signal) =>
    api('/moderacao/avaliacoes', { params: { situacao, pagina, limite: POR_PAGINA }, signal }),
  )
  const { dados: resumo, recarregar: recarregarResumo } = useDados('moderacao-resumo', (signal) => api('/moderacao/resumo', { signal }))

  const itens = dados?.dados ?? []
  const totalPaginas = dados?.paginacao.total_paginas ?? 1

  function escolher(nova) {
    setSituacao(nova)
    setPagina(1)
    setAviso('')
  }

  async function executar() {
    const { tipo, avaliacao } = acao
    if (tipo === 'EXCLUIR') {
      await api(`/moderacao/avaliacoes/${avaliacao.id}`, { method: 'DELETE' })
    } else if (tipo === 'RESTAURAR') {
      await api(`/avaliacoes/${avaliacao.id}/status`, { method: 'PATCH', body: { status: 'PUBLICADA' } })
    } else {
      await api(`/moderacao/avaliacoes/${avaliacao.id}/decisao`, { method: 'POST', body: { decisao: tipo } })
    }
    setAviso(
      { OCULTAR: 'Comentário ocultado.', MANTER: 'Denúncias descartadas. O comentário continua no perfil.', RESTAURAR: 'Comentário restaurado.', EXCLUIR: 'Comentário excluído permanentemente.' }[tipo],
    )
    setAcao(null)
    if (pagina > 1 && itens.length === 1) setPagina(pagina - 1)
    recarregar()
    recarregarResumo()
    window.dispatchEvent(new Event('moderacao-mudou'))
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <TituloPagina icone={Escudo} titulo="Moderação">
        Comentários denunciados por usuários e comentários que já foram ocultados.
      </TituloPagina>

      <div role="tablist" aria-label="Situação" className="flex border-b border-borda">
        <Aba ativa={situacao === 'DENUNCIADAS'} aoEscolher={() => escolher('DENUNCIADAS')} contagem={resumo?.denunciadas}>Denunciados</Aba>
        <Aba ativa={situacao === 'OCULTAS'} aoEscolher={() => escolher('OCULTAS')}>Ocultos{resumo ? ` (${resumo.ocultas})` : ''}</Aba>
      </div>

      {aviso && <p role="status" className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm text-emerald-800">{aviso}</p>}
      {erro && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-700">{erro.message}</p>}

      {carregando && !dados ? (
        <p className="py-10 text-center text-sm text-suave">Carregando…</p>
      ) : itens.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-borda bg-white py-12 text-center text-sm text-suave">
          {situacao === 'DENUNCIADAS' ? 'Nenhum comentário denunciado no momento.' : 'Nenhum comentário oculto.'}
        </p>
      ) : (
        <ul className="space-y-4">
          {itens.map((a) => <Item key={a.id} a={a} situacao={situacao} aoAcao={(tipo, av) => setAcao({ tipo, avaliacao: av })} />)}
        </ul>
      )}

      {totalPaginas > 1 && (
        <div className="flex items-center justify-between text-sm">
          <button type="button" disabled={pagina <= 1} onClick={() => setPagina(pagina - 1)} className={`${botao} border-borda disabled:opacity-40`}>Anterior</button>
          <span className="text-suave">Página {pagina} de {totalPaginas}</span>
          <button type="button" disabled={pagina >= totalPaginas} onClick={() => setPagina(pagina + 1)} className={`${botao} border-borda disabled:opacity-40`}>Próxima</button>
        </div>
      )}

      {acao && (
        <ModalConfirmar
          titulo={TEXTOS[acao.tipo].titulo}
          rotuloConfirmar={TEXTOS[acao.tipo].rotulo}
          perigo={TEXTOS[acao.tipo].perigo}
          aoConfirmar={executar}
          aoFechar={() => setAcao(null)}
        >
          <blockquote className="max-h-40 overflow-y-auto whitespace-pre-line rounded-lg border-l-4 border-borda bg-fundo p-3 text-tinta">{acao.avaliacao.comentario}</blockquote>
          <p>{TEXTOS[acao.tipo].aviso}</p>
        </ModalConfirmar>
      )}
    </div>
  )
}
