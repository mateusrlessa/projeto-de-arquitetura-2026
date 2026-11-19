import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import BuscaCidade from '../components/BuscaCidade.jsx'
import { Busca, Mensagens, Pessoas, Pino } from '../components/Icones.jsx'
import { acharCidade } from '../lib/cidades.js'
import { buscarCidades } from '../lib/dados.js'

const CHAVE_CIDADE = 'cuidaaqui.cidade'

export default function Inicio() {
  const navegar = useNavigate()
  const [cidades, setCidades] = useState([])
  const [cidadeTexto, setCidadeTexto] = useState('')
  const [aviso, setAviso] = useState('')
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState(null)

  useEffect(() => {
    const controle = new AbortController()

    buscarCidades({ signal: controle.signal })
      .then((lista) => {
        setCidades(lista)
      })
      .catch((erroCarregamento) => {
        if (erroCarregamento.name !== 'AbortError') setErro(erroCarregamento)
      })
      .finally(() => setCarregando(false))

    return () => controle.abort()
  }, [])

  function irParaCidade(cidade) {
    localStorage.setItem(CHAVE_CIDADE, String(cidade.id))
    navegar(`/cuidadores?cidade=${cidade.id}`)
  }

  // Botão "Buscar cuidadores" ou Enter sem sugestão marcada: usa a melhor correspondência do que foi digitado.
  function buscar(event) {
    event.preventDefault()
    const encontrada = acharCidade(cidades, cidadeTexto)
    if (encontrada) irParaCidade(encontrada)
    else setAviso(cidadeTexto.trim() ? 'Não encontramos essa cidade. Escolha uma das sugestões.' : 'Digite o nome da sua cidade.')
  }

  const populares = ['Fortaleza', 'São Paulo', 'Rio de Janeiro', 'Belo Horizonte']

  const passos = [
    {
      numero: '01',
      titulo: 'Escolha sua cidade',
      descricao: 'Selecione onde você mora para ver profissionais disponíveis na sua região.',
      icone: Pino,
    },
    {
      numero: '02',
      titulo: 'Veja os profissionais',
      descricao: 'Consulte perfis completos com avaliações, experiência e especialidades.',
      icone: Pessoas,
    },
    {
      numero: '03',
      titulo: 'Converse pelo WhatsApp',
      descricao: 'Entre em contato direto com o cuidador, sem intermediários e sem taxas.',
      icone: Mensagens,
    },
  ]

  return (
    <>
    <section className="-mx-5 min-h-[590px] px-5 py-10 sm:-mx-5 sm:py-14 lg:-mx-16 lg:px-16 lg:py-16">
      <div className="mx-auto grid max-w-6xl items-center gap-12 lg:grid-cols-[1fr_480px]">
        <div>
          <h1 className="max-w-xl font-titulo text-4xl font-bold leading-[1.05] tracking-tight text-tinta sm:text-5xl lg:text-[52px]">
            Encontre cuidadores de confiança na sua cidade
          </h1>
          <p className="mt-6 max-w-xl text-lg leading-8 text-suave">
            Profissionais qualificados para cuidar de quem você ama. Sem burocracia, combine direto pelo WhatsApp.
          </p>

          <form onSubmit={buscar} className="mt-8 max-w-[620px] rounded-2xl border border-borda bg-white p-4 shadow-sm sm:p-5">
            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-tinta">Em qual cidade você mora?</span>
              <BuscaCidade
                id="cidade-inicial"
                cidades={cidades}
                texto={cidadeTexto}
                disabled={carregando || cidades.length === 0}
                selecionarAoClicar={false}
                placeholder={erro ? 'Não foi possível carregar as cidades' : carregando ? 'Carregando cidades…' : 'Digite sua cidade'}
                aoAlterarTexto={(texto) => {
                  setCidadeTexto(texto)
                  setAviso('')
                }}
                aoSelecionar={irParaCidade}
              />
            </label>
            {aviso && (
              <p role="alert" className="mt-2 text-sm text-red-600">
                {aviso}
              </p>
            )}
            <button
              type="submit"
              disabled={carregando || cidades.length === 0}
              className="mt-4 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-marca text-base font-bold text-white transition hover:bg-marca-escura disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Busca tamanho={19} />
              Buscar cuidadores
            </button>
          </form>

          <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-2 text-sm text-suave">
            <span>Cidades populares:</span>
            {populares.map((nome) => {
              const cidade = cidades.find((item) => item.nome === nome)
              return cidade ? (
                <button
                  key={nome}
                  type="button"
                  onClick={() => irParaCidade(cidade)}
                  className="font-medium text-marca hover:text-marca-escura hover:underline"
                >
                  {nome}
                </button>
              ) : (
                <span key={nome}>{nome}</span>
              )
            })}
          </div>
        </div>

        <div className="relative mx-auto w-full max-w-[480px]">
          <div className="absolute -inset-4 -z-10 rounded-[32px] bg-marca-clara/70 blur-2xl" />
          <img
            src="/images/cuidador-tela-inicial.jpg"
            alt="Cuidadora acompanhando uma pessoa idosa"
            className="aspect-[4/3] w-full rounded-[24px] object-cover shadow-[0_18px_45px_rgba(43,52,54,0.16)]"
          />
        </div>
      </div>
    </section>

    <section className="-mx-5 bg-white px-5 py-14 sm:px-8 lg:-mx-16 lg:px-16 lg:py-16">
      <div className="mx-auto max-w-6xl">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="font-titulo text-3xl font-bold tracking-tight text-tinta sm:text-[34px]">
            Como funciona o CuidaAqui
          </h2>
          <p className="mt-3 text-base leading-6 text-suave">
            Conectamos você aos melhores profissionais de cuidado de forma simples,<br className="hidden sm:block" />
            direta e segura.
          </p>
        </div>

        <div className="mt-10 grid gap-4 md:grid-cols-3 md:gap-6">
          {passos.map((passo) => {
            const Icone = passo.icone
            return (
              <article
                key={passo.numero}
                className="relative min-h-[190px] rounded-2xl bg-white px-8 py-8 shadow-[0_10px_30px_rgba(43,52,54,0.08)] ring-1 ring-borda/40"
              >
                <span className="absolute right-6 top-5 font-titulo text-[29px] font-bold text-borda/70">
                  {passo.numero}
                </span>
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-marca-clara text-marca">
                  <Icone tamanho={22} />
                </div>
                <h3 className="mt-5 font-titulo text-xl font-bold text-tinta">
                  {passo.titulo}
                </h3>
                <p className="mt-2 text-sm leading-6 text-suave">
                  {passo.descricao}
                </p>
              </article>
            )
          })}
        </div>
      </div>
    </section>
    </>
  )
}
