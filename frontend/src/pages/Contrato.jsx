import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Alerta, Check, Escudo, SetaEsquerda } from '../components/Icones.jsx'
import { TituloPagina } from '../components/Cartao.jsx'
import { api, buscarPreviaTermo, criarContratacao } from '../lib/api.js'
import { useDados } from '../lib/useApi.js'

export default function Contrato() {
  const { id } = useParams()
  const navegar = useNavigate()
  const { dados, carregando, erro, recarregar } = useDados(`previa-contrato-${id}`, async (signal) => {
    const [contratante, cuidador, termo] = await Promise.all([
      api('/auth/me', { signal }),
      api(`/cuidadores/${id}`, { signal }),
      buscarPreviaTermo(id, { signal }),
    ])
    return { contratante, cuidador, termo }
  })
  const [aceitou, setAceitou] = useState(false)
  const [enviando, setEnviando] = useState(false)
  const [erroEnvio, setErroEnvio] = useState('')

  async function confirmar() {
    setEnviando(true)
    setErroEnvio('')
    try {
      const contratacao = await criarContratacao(Number(id))
      navegar(`/servicos/${contratacao.id}`, { replace: true })
    } catch (falha) {
      setErroEnvio(falha.message)
      setEnviando(false)
    }
  }

  if (carregando && !dados) {
    return <p role="status" aria-busy="true" className="py-16 text-center text-sm text-suave">Carregando o termo…</p>
  }

  if (erro) {
    return (
      <section role="alert" className="mx-auto max-w-xl rounded-2xl border border-borda bg-white p-8 text-center">
        <Alerta tamanho={24} className="mx-auto text-red-600" />
        <h1 className="mt-3 font-titulo text-xl font-semibold">Não foi possível carregar o termo</h1>
        <p className="mt-2 text-sm text-suave">{erro.message}</p>
        <button onClick={recarregar} className="mt-5 rounded-xl bg-marca px-5 py-2.5 text-sm font-semibold text-white hover:bg-marca-escura">
          Tentar novamente
        </button>
      </section>
    )
  }

  if (!dados || dados.contratante.tipo_usuario !== 'CONTRATANTE') {
    return <p role="alert" className="rounded-xl bg-red-50 p-4 text-sm text-red-700">Somente contratantes podem iniciar uma contratação.</p>
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6 pb-4">
      <Link to={`/cuidadores/${id}`} className="inline-flex items-center gap-2 text-sm font-semibold text-marca hover:text-marca-escura">
        <SetaEsquerda tamanho={16} /> Voltar ao perfil
      </Link>
      <TituloPagina icone={Escudo} titulo="Termo de Confirmação de Contratação">
        Confira o documento gerado pelo CuidaAqui antes de manifestar sua concordância.
      </TituloPagina>

      <section className="rounded-2xl border border-borda bg-white p-5 sm:p-7">
        <dl className="mb-5 grid gap-3 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-suave">Contratante</dt>
            <dd className="font-semibold">{dados.contratante.nome_completo}</dd>
          </div>
          <div>
            <dt className="text-suave">Cuidador(a)</dt>
            <dd className="font-semibold">{dados.cuidador.nome_completo}</dd>
          </div>
        </dl>
        <pre className="max-h-[65vh] overflow-y-auto whitespace-pre-wrap rounded-xl border border-borda bg-fundo p-5 font-sans text-sm leading-7 text-tinta">{dados.termo.termo_conteudo}</pre>
        <p className="mt-4 text-xs leading-relaxed text-suave">
          A confirmação registra sua manifestação de concordância e a data e hora no sistema; não é uma assinatura digital certificada.
        </p>
      </section>

      <section className="space-y-4 rounded-2xl border border-borda bg-white p-5 sm:p-7">
        <label className="flex cursor-pointer items-start gap-3 text-sm font-medium">
          <input
            type="checkbox"
            checked={aceitou}
            onChange={(evento) => setAceitou(evento.target.checked)}
            className="mt-0.5 size-4 accent-marca"
          />
          <span>Li e concordo com os termos deste documento</span>
        </label>
        {erroEnvio && <p role="alert" className="text-sm text-red-600">{erroEnvio}</p>}
        <button
          type="button"
          onClick={confirmar}
          disabled={!aceitou || enviando}
          className="inline-flex items-center gap-2 rounded-xl bg-marca px-6 py-3 text-sm font-semibold text-white transition hover:bg-marca-escura disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Check tamanho={18} />
          {enviando ? 'Registrando contratação…' : 'Confirmar contratação'}
        </button>
      </section>
    </div>
  )
}
