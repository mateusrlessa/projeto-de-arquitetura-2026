import { Link } from 'react-router-dom'
import { Alerta, Check, Maleta, Relogio } from '../components/Icones.jsx'
import { TituloPagina } from '../components/Cartao.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import { listarContratacoes } from '../lib/api.js'
import { dataLonga } from '../lib/format.js'
import { useDados } from '../lib/useApi.js'

const ROTULOS_STATUS = {
  AGUARDANDO_CONFIRMACAO_CUIDADOR: 'Aguardando confirmação do cuidador',
  CONFIRMADA: 'Confirmada',
  AGUARDANDO_CONFIRMACAO_CONTRATANTE: 'Aguardando confirmação do contratante',
  CONCLUIDA: 'Concluída',
}

function Indicador({ ok, children }) {
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${ok ? 'bg-marca-clara text-marca-escura' : 'bg-amber-50 text-amber-800'}`}>
      {ok ? <Check tamanho={14} /> : <Relogio tamanho={14} />}
      {children}
    </span>
  )
}

function EstadoLista({ mensagem, erro, aoTentar }) {
  return (
    <section className="rounded-2xl border border-borda bg-white px-6 py-12 text-center">
      {erro ? <Alerta tamanho={24} className="mx-auto text-red-600" /> : <Maleta tamanho={24} className="mx-auto text-marca" />}
      <p className="mt-3 text-sm text-suave">{mensagem}</p>
      {erro && (
        <button onClick={aoTentar} className="mt-4 rounded-xl bg-marca px-5 py-2.5 text-sm font-semibold text-white hover:bg-marca-escura">
          Tentar novamente
        </button>
      )}
    </section>
  )
}

export default function Servicos() {
  const { usuario } = useAuth()
  const ehContratante = usuario.tipo_usuario === 'CONTRATANTE'
  const { dados: contratacoes, carregando, erro, recarregar } = useDados(
    `servicos-${usuario.id}`,
    (signal) => listarContratacoes({ signal }),
  )

  return (
    <div className="space-y-6 pb-4">
      <TituloPagina icone={Maleta} titulo="Serviços">
        Acompanhe as contratações e as confirmações registradas na plataforma.
      </TituloPagina>

      {carregando && !contratacoes && (
        <div role="status" aria-busy="true" className="h-48 rounded-2xl bg-borda/70" style={{ animation: 'pulso 1.4s ease-in-out infinite' }} />
      )}
      {erro && <EstadoLista erro mensagem={erro.message} aoTentar={recarregar} />}
      {!carregando && !erro && contratacoes?.length === 0 && (
        <EstadoLista mensagem="Você ainda não tem contratações vinculadas." />
      )}
      {contratacoes?.length > 0 && (
        <ul className="space-y-4">
          {contratacoes.map((contratacao) => {
            const confirmouCuidador = Boolean(contratacao.cuidador_confirmado_em)
            const informouRealizacao = Boolean(contratacao.cuidador_informou_realizacao_em)
            const confirmouRealizacao = Boolean(contratacao.contratante_confirmou_realizacao_em)
            return (
              <li key={contratacao.id} className="rounded-2xl border border-borda bg-white p-5 shadow-sm sm:p-6">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-suave">
                      {ehContratante ? 'Cuidador(a)' : 'Contratante'}
                    </p>
                    <h2 className="mt-1 font-titulo text-xl font-semibold">
                      {ehContratante ? contratacao.cuidador_nome : contratacao.contratante_nome}
                    </h2>
                    <p className="mt-1 text-sm text-suave">Contratação em {dataLonga(contratacao.criado_em)}</p>
                  </div>
                  <span className="w-fit rounded-full bg-marca-clara px-3 py-1.5 text-xs font-semibold text-marca-escura">
                    {ROTULOS_STATUS[contratacao.status] ?? contratacao.status}
                  </span>
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  <Indicador ok={confirmouCuidador}>
                    {ehContratante
                      ? `Confirmação do cuidador: ${confirmouCuidador ? 'confirmada' : 'pendente'}`
                      : `Sua confirmação: ${confirmouCuidador ? 'registrada' : 'pendente'}`}
                  </Indicador>
                  {ehContratante && (
                    <Indicador ok={confirmouRealizacao}>
                      {confirmouRealizacao
                        ? 'Realização confirmada'
                        : informouRealizacao
                          ? 'Realização informada pelo cuidador'
                          : 'Realização ainda não informada'}
                    </Indicador>
                  )}
                  {!ehContratante && (
                    <Indicador ok={confirmouRealizacao}>
                      {confirmouRealizacao
                        ? 'Serviço concluído'
                        : informouRealizacao
                          ? 'Realização informada, aguardando contratante'
                          : 'Realização ainda não informada'}
                    </Indicador>
                  )}
                </div>
                <Link
                  to={`/servicos/${contratacao.id}`}
                  className="mt-5 inline-flex rounded-xl border border-marca px-5 py-2.5 text-sm font-semibold text-marca transition hover:bg-marca-clara"
                >
                  Consultar detalhes
                </Link>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
