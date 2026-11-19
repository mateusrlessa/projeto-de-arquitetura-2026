import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import CuidadorCard, { CuidadorCardSkeleton } from '../components/CuidadorCard.jsx'
import BuscaCidade from '../components/BuscaCidade.jsx'
import { Alerta, Busca } from '../components/Icones.jsx'
import { acharCidade, rotuloCidade } from '../lib/cidades.js'
import { buscarCidades, buscarCuidadores } from '../lib/dados.js'
import { plural } from '../lib/format.js'
import { useDados } from '../lib/useApi.js'

const LIMITE = 12
const CHAVE_CIDADE = 'cuidaaqui.cidade'
const inicial = { itens: [], total: 0, totalPaginas: 1, carregando: true, erro: null }

export default function Cuidadores() {
  const [params, setParams] = useSearchParams()
  const { dados: cidadesResp, carregando: carregandoCidades, erro: erroCidades, recarregar } = useDados('cidades', (signal) =>
    buscarCidades({ signal }),
  )
  const cidades = cidadesResp ?? []

  const cidadeId = Number(params.get('cidade')) || null
  const cidade = cidades.find((c) => c.id === cidadeId)

  const [pagina, setPagina] = useState(1)
  const [lista, setLista] = useState(inicial)
  const [tentativa, setTentativa] = useState(0)
  // Texto que a pessoa está digitando; null = mostrar a cidade que está valendo.
  const [cidadeTexto, setCidadeTexto] = useState(null)
  const [sugestaoEscolhida, setSugestaoEscolhida] = useState(false)
  const [avisoCidade, setAvisoCidade] = useState('')
  const textoCidade = cidadeTexto ?? (cidade ? rotuloCidade(cidade) : '')

  // Botão Voltar/Avançar do navegador também muda a cidade: o campo acompanha.
  useEffect(() => {
    setCidadeTexto(null)
    setSugestaoEscolhida(false)
    setAvisoCidade('')
  }, [cidadeId])

  useEffect(() => {
    // Sem cidade na URL, ou com um id que não existe, cai na última escolhida (ou Fortaleza).
    if ((cidadeId && cidade) || cidades.length === 0) return
    const salva = Number(localStorage.getItem(CHAVE_CIDADE))
    const padrao = cidades.find((c) => c.id === salva) ?? cidades.find((c) => c.nome === 'Fortaleza') ?? cidades[0]
    setParams({ cidade: padrao.id }, { replace: true })
  }, [cidades, cidadeId, cidade, setParams])

  useEffect(() => {
    if (!cidadeId) return
    const controle = new AbortController()
    setLista((l) => ({ ...l, carregando: true, erro: null }))
    buscarCuidadores({ cidadeId, pagina, limite: LIMITE, signal: controle.signal })
      .then(({ dados, paginacao }) =>
        setLista((l) => ({
          itens: pagina === 1 ? dados : [...l.itens, ...dados],
          total: paginacao.total,
          totalPaginas: paginacao.total_paginas,
          carregando: false,
          erro: null,
        })),
      )
      .catch((erro) => {
        if (erro.name !== 'AbortError') setLista((l) => ({ ...l, carregando: false, erro }))
      })
    return () => controle.abort()
  }, [cidadeId, pagina, tentativa])

  function trocarCidade(id) {
    localStorage.setItem(CHAVE_CIDADE, id)
    setPagina(1)
    setLista(inicial)
    setParams({ cidade: id })
  }

  // Escolher uma sugestão (clique, Enter ou Tab) troca a cidade na hora.
  function escolherCidade(escolhida) {
    setAvisoCidade('')
    // Mantém o nome escolhido no campo até a URL mudar, sem piscar o nome da cidade anterior.
    setCidadeTexto(rotuloCidade(escolhida))
    setSugestaoEscolhida(true)
    if (escolhida.id !== cidadeId) trocarCidade(escolhida.id)
  }

  // Botão Buscar, ou Enter sem sugestão marcada: usa a melhor correspondência do que foi digitado.
  function buscarCidadeDigitada(evento) {
    evento.preventDefault()
    const encontrada = acharCidade(cidades, textoCidade)
    if (encontrada) escolherCidade(encontrada)
    else setAvisoCidade(textoCidade.trim() ? 'Não encontramos essa cidade. Escolha uma das sugestões.' : 'Digite o nome da cidade.')
  }

  const cidadeNoAviso = cidade ? cidade.cidade_estado : 'sua cidade'
  const semCidades = !carregandoCidades && !erroCidades && cidades.length === 0
  const aguardandoCidade = !cidadeId && cidades.length > 0
  const primeiraCarga = carregandoCidades || aguardandoCidade || (lista.carregando && lista.itens.length === 0)

  return (
    <section className="pb-4">
      <h1 className="font-titulo text-3xl font-bold sm:text-4xl">Cuidadores em {cidade?.nome ?? (semCidades ? '' : '…')}</h1>
      <p className="mt-2 min-h-6 text-suave">
        {!primeiraCarga && !lista.erro && !semCidades &&
          (lista.total > 0
            ? `Encontramos ${lista.total} ${plural(lista.total, 'profissional qualificado', 'profissionais qualificados')} para atender sua família.`
            : 'Ainda não encontramos profissionais por aqui.')}
      </p>

      <div className="mt-5">
        <form
          className="flex w-full max-w-md items-center gap-2"
          onSubmit={buscarCidadeDigitada}
          // Se a pessoa sair do campo sem escolher nada, volta a mostrar a cidade que está valendo.
          onBlur={(e) => {
            if (!e.currentTarget.contains(e.relatedTarget) && !sugestaoEscolhida) setCidadeTexto(null)
          }}
        >
          <BuscaCidade
            id="seletor-cidade"
            compacto
            className="w-full"
            cidades={cidades}
            texto={textoCidade}
            disabled={carregandoCidades || cidades.length === 0}
            selecionarAoClicar={false}
            placeholder={semCidades ? 'Nenhuma cidade disponível' : carregandoCidades ? 'Carregando cidades…' : 'Digite sua cidade'}
            aoAlterarTexto={(texto, foiSugestao = false) => {
              setCidadeTexto(texto)
              setSugestaoEscolhida(foiSugestao)
              setAvisoCidade('')
            }}
            aoSelecionar={escolherCidade}
          />
          <button
            type="submit"
            className="flex h-11 shrink-0 items-center gap-2 rounded-xl bg-marca px-4 text-sm font-bold text-white transition hover:bg-marca-escura"
          >
            <Busca tamanho={17} />
            Buscar
          </button>
        </form>
        {avisoCidade && (
          <p role="alert" className="mt-2 text-sm text-red-600">
            {avisoCidade}
          </p>
        )}
      </div>

      <div className="mt-8">
        {erroCidades ? (
          <Erro mensagem={erroCidades.message} aoTentar={recarregar} />
        ) : lista.erro ? (
          <Erro mensagem={lista.erro.message} aoTentar={() => setTentativa((t) => t + 1)} />
        ) : semCidades ? (
          <SemResultados titulo="Nenhuma cidade disponível por enquanto" texto="Ainda não há cidades cadastradas na plataforma. Volte em breve." />
        ) : primeiraCarga ? (
          <div className="grid gap-5 md:grid-cols-2" aria-busy="true">
            {Array.from({ length: 4 }, (_, i) => (
              <CuidadorCardSkeleton key={i} />
            ))}
          </div>
        ) : lista.itens.length === 0 ? (
          <SemResultados
            titulo={`Ainda não temos cuidadores em ${cidadeNoAviso}`}
            texto="Estamos crescendo todo dia. Experimente outra cidade da região ou volte em breve."
          />
        ) : (
          <>
            <div className="grid gap-5 md:grid-cols-2">
              {lista.itens.map((c) => (
                <CuidadorCard key={c.id} cuidador={c} cidadeId={cidadeId} />
              ))}
            </div>
            {pagina < lista.totalPaginas && (
              <div className="mt-8 text-center">
                <button
                  disabled={lista.carregando}
                  onClick={() => setPagina((p) => p + 1)}
                  className="rounded-full border border-marca px-6 py-2.5 text-sm font-semibold text-marca transition hover:bg-marca-clara disabled:opacity-60"
                >
                  {lista.carregando ? 'Carregando…' : 'Ver mais cuidadores'}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </section>
  )
}

function SemResultados({ titulo, texto }) {
  return (
    <div className="mx-auto max-w-md rounded-2xl border border-dashed border-borda bg-white px-6 py-12 text-center">
      <span className="mx-auto flex size-12 items-center justify-center rounded-full bg-marca-clara text-marca">
        <Busca tamanho={22} />
      </span>
      <h2 className="mt-4 font-titulo text-xl font-semibold">{titulo}</h2>
      <p className="mt-2 text-sm text-suave">{texto}</p>
    </div>
  )
}

function Erro({ mensagem, aoTentar }) {
  return (
    <div role="alert" className="mx-auto max-w-md rounded-2xl border border-red-200 bg-red-50 px-6 py-10 text-center">
      <span className="mx-auto flex size-12 items-center justify-center rounded-full bg-red-100 text-red-600">
        <Alerta tamanho={22} />
      </span>
      <h2 className="mt-4 font-titulo text-xl font-semibold">Não foi possível carregar</h2>
      <p className="mt-2 text-sm text-suave">{mensagem}</p>
      <button onClick={aoTentar} className="mt-5 rounded-full bg-marca px-6 py-2.5 text-sm font-semibold text-white hover:bg-marca-escura">
        Tentar novamente
      </button>
    </div>
  )
}
