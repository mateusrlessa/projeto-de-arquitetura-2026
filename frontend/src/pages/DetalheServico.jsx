import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Alerta, Check, Maleta, Relogio, SetaEsquerda } from '../components/Icones.jsx'
import { TituloPagina } from '../components/Cartao.jsx'
import FormularioAvaliacao from '../components/FormularioAvaliacao.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import {
  buscarContratacao,
  confirmarContratacao,
  confirmarRealizacao,
  informarRealizacao,
} from '../lib/api.js'
import { useDados } from '../lib/useApi.js'

const ROTULOS_STATUS = {
  AGUARDANDO_CONFIRMACAO_CUIDADOR: 'Aguardando confirmação do cuidador',
  CONFIRMADA: 'Confirmada',
  AGUARDANDO_CONFIRMACAO_CONTRATANTE: 'Aguardando confirmação do contratante',
  CONCLUIDA: 'Concluída',
}

function dataHora(valor) {
  if (!valor) return 'Pendente'
  return new Date(valor).toLocaleString('pt-BR', { dateStyle: 'long', timeStyle: 'short' })
}

function Registro({ titulo, data }) {
  return (
    <li className="relative pl-7">
      <span className={`absolute left-0 top-1 flex size-4 items-center justify-center rounded-full ${data ? 'bg-marca text-white' : 'border border-borda bg-white text-suave'}`}>
        {data ? <Check tamanho={12} /> : <Relogio tamanho={12} />}
      </span>
      <p className="text-sm font-semibold">{titulo}</p>
      <p className="mt-0.5 text-xs text-suave">{dataHora(data)}</p>
    </li>
  )
}

export default function DetalheServico() {
  const { id } = useParams()
  const { usuario } = useAuth()
  const ehCuidador = usuario.tipo_usuario === 'CUIDADOR'
  const ehContratante = usuario.tipo_usuario === 'CONTRATANTE'
  const { dados: contratacao, carregando, erro, recarregar } = useDados(
    `detalhe-servico-${id}`,
    (signal) => buscarContratacao(id, { signal }),
  )
  const [aceitou, setAceitou] = useState(false)
  const [operando, setOperando] = useState(false)
  const [avaliando, setAvaliando] = useState(false)
  const [avaliacaoEnviadaId, setAvaliacaoEnviadaId] = useState(null)
  const [mensagem, setMensagem] = useState('')
  const [erroAcao, setErroAcao] = useState('')

  async function executar(acao, sucesso) {
    setOperando(true)
    setErroAcao('')
    setMensagem('')
    try {
      await acao(id)
      setMensagem(sucesso)
      setAceitou(false)
      recarregar()
    } catch (falha) {
      setErroAcao(falha.message)
    } finally {
      setOperando(false)
    }
  }

  if (carregando && !contratacao) {
    return <p role="status" aria-busy="true" className="py-16 text-center text-sm text-suave">Carregando contratação…</p>
  }

  if (erro) {
    return (
      <section role="alert" className="mx-auto max-w-xl rounded-2xl border border-borda bg-white p-8 text-center">
        <Alerta tamanho={24} className="mx-auto text-red-600" />
        <h1 className="mt-3 font-titulo text-xl font-semibold">Não foi possível carregar a contratação</h1>
        <p className="mt-2 text-sm text-suave">{erro.message}</p>
        <div className="mt-5 flex justify-center gap-3">
          <button onClick={recarregar} className="rounded-xl bg-marca px-5 py-2.5 text-sm font-semibold text-white hover:bg-marca-escura">
            Tentar novamente
          </button>
          <Link to="/servicos" className="rounded-xl border border-marca px-5 py-2.5 text-sm font-semibold text-marca">Serviços</Link>
        </div>
      </section>
    )
  }

  if (!contratacao) return null

  const ehContratanteDaContratacao = ehContratante && Number(contratacao.contratante_id) === Number(usuario.id)
  const avaliacaoRegistrada = Boolean(contratacao.avaliacao_id) || Number(avaliacaoEnviadaId) === Number(contratacao.id)
  const podeConfirmarTermo = ehCuidador && contratacao.status === 'AGUARDANDO_CONFIRMACAO_CUIDADOR'
  const podeInformarRealizacao = ehCuidador && contratacao.status === 'CONFIRMADA'
  const podeConfirmarRealizacao = !ehCuidador && contratacao.status === 'AGUARDANDO_CONFIRMACAO_CONTRATANTE'
  const podeAvaliar = ehContratanteDaContratacao && contratacao.status === 'CONCLUIDA'

  return (
    <div className="mx-auto max-w-4xl space-y-6 pb-4">
      <Link to="/servicos" className="inline-flex items-center gap-2 text-sm font-semibold text-marca hover:text-marca-escura">
        <SetaEsquerda tamanho={16} /> Voltar a Serviços
      </Link>
      <TituloPagina icone={Maleta} titulo={`Contratação #${contratacao.id}`}>
        Acompanhe o termo e as etapas registradas para este serviço.
      </TituloPagina>

      {mensagem && <p role="status" className="rounded-xl bg-marca-clara p-4 text-sm font-medium text-marca-escura">{mensagem}</p>}
      {erroAcao && <p role="alert" className="rounded-xl bg-red-50 p-4 text-sm text-red-700">{erroAcao}</p>}

      <section className="rounded-2xl border border-borda bg-white p-5 sm:p-7">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-suave">Contratante</p>
            <p className="mt-1 font-semibold">{contratacao.contratante_nome}</p>
            <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-suave">Cuidador(a)</p>
            <Link
              to={`/cuidadores/${contratacao.cuidador_id}`}
              className="mt-1 inline-block font-semibold text-marca hover:text-marca-escura hover:underline"
            >
              {contratacao.cuidador_nome}
            </Link>
          </div>
          <span className="rounded-full bg-marca-clara px-3 py-1.5 text-xs font-semibold text-marca-escura">
            {ROTULOS_STATUS[contratacao.status] ?? contratacao.status}
          </span>
        </div>
        <p className="mt-5 text-sm text-suave">Criada em {dataHora(contratacao.criado_em)}</p>
      </section>

      <section className="rounded-2xl border border-borda bg-white p-5 sm:p-7">
        <h2 className="mb-4 font-titulo text-lg font-semibold">Termo armazenado</h2>
        <pre className="max-h-[65vh] overflow-y-auto whitespace-pre-wrap rounded-xl border border-borda bg-fundo p-5 font-sans text-sm leading-7 text-tinta">{contratacao.termo_conteudo}</pre>
        <p className="mt-4 text-xs leading-relaxed text-suave">
          As confirmações registram manifestações de concordância com data e hora na plataforma; não são assinaturas digitais certificadas.
        </p>
      </section>

      <section className="rounded-2xl border border-borda bg-white p-5 sm:p-7">
        <h2 className="mb-5 font-titulo text-lg font-semibold">Histórico da contratação</h2>
        <ol className="space-y-5 border-l border-borda pl-0">
          <Registro titulo="Contratação criada" data={contratacao.criado_em} />
          <Registro titulo="Contratante manifestou concordância" data={contratacao.contratante_confirmado_em} />
          <Registro titulo="Cuidador confirmou o termo" data={contratacao.cuidador_confirmado_em} />
          <Registro titulo="Cuidador informou a realização do serviço" data={contratacao.cuidador_informou_realizacao_em} />
          <Registro titulo="Contratante confirmou a realização" data={contratacao.contratante_confirmou_realizacao_em} />
        </ol>
      </section>

      {(podeConfirmarTermo || podeInformarRealizacao || podeConfirmarRealizacao) && (
        <section className="space-y-4 rounded-2xl border border-borda bg-white p-5 sm:p-7">
          <h2 className="font-titulo text-lg font-semibold">Próxima etapa</h2>
          {podeConfirmarTermo && (
            <label className="flex cursor-pointer items-start gap-3 text-sm font-medium">
              <input
                type="checkbox"
                checked={aceitou}
                onChange={(evento) => setAceitou(evento.target.checked)}
                className="mt-0.5 size-4 accent-marca"
              />
              <span>Li e concordo com os termos</span>
            </label>
          )}
          {podeConfirmarTermo && (
            <button
              type="button"
              disabled={!aceitou || operando}
              onClick={() => executar(confirmarContratacao, 'Sua confirmação foi registrada.')}
              className="rounded-xl bg-marca px-6 py-3 text-sm font-semibold text-white hover:bg-marca-escura disabled:cursor-not-allowed disabled:opacity-50"
            >
              {operando ? 'Registrando…' : 'Confirmar contratação'}
            </button>
          )}
          {podeInformarRealizacao && (
            <button
              type="button"
              disabled={operando}
              onClick={() => executar(informarRealizacao, 'A realização do serviço foi informada.')}
              className="rounded-xl bg-marca px-6 py-3 text-sm font-semibold text-white hover:bg-marca-escura disabled:opacity-50"
            >
              {operando ? 'Registrando…' : 'Informar realização do serviço'}
            </button>
          )}
          {podeConfirmarRealizacao && (
            <button
              type="button"
              disabled={operando}
              onClick={() => executar(confirmarRealizacao, 'A realização do serviço foi confirmada.')}
              className="rounded-xl bg-marca px-6 py-3 text-sm font-semibold text-white hover:bg-marca-escura disabled:opacity-50"
            >
              {operando ? 'Registrando…' : 'Confirmar realização do serviço'}
            </button>
          )}
        </section>
      )}

      {podeAvaliar && (
        <section className="space-y-4 rounded-2xl border border-borda bg-white p-5 sm:p-7">
          <h2 className="font-titulo text-lg font-semibold">Avaliação do serviço</h2>
          {avaliacaoRegistrada ? (
            <p role="status" className="flex items-center gap-2 rounded-xl bg-marca-clara p-4 text-sm font-medium text-marca-escura">
              <Check tamanho={18} className="shrink-0 text-marca" />
              Este serviço já foi avaliado. Não é possível publicar outra avaliação para a mesma contratação.
            </p>
          ) : avaliando ? (
            <>
              <p className="text-sm text-suave">
                Avalie {contratacao.cuidador_nome} pelo serviço concluído #{contratacao.id}.
              </p>
              <FormularioAvaliacao
                cuidador={{ id: contratacao.cuidador_id, nome_completo: contratacao.cuidador_nome }}
                contratacaoId={contratacao.id}
                aoConcluir={(texto) => {
                  setAvaliacaoEnviadaId(contratacao.id)
                  setAvaliando(false)
                  setMensagem(texto)
                  recarregar()
                }}
              />
              <button
                type="button"
                onClick={() => setAvaliando(false)}
                className="rounded-lg border border-borda px-4 py-2 text-sm font-semibold text-suave hover:bg-fundo"
              >
                Cancelar
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={() => setAvaliando(true)}
              className="rounded-xl bg-marca px-6 py-3 text-sm font-semibold text-white hover:bg-marca-escura"
            >
              Avaliar cuidador
            </button>
          )}
        </section>
      )}
    </div>
  )
}
