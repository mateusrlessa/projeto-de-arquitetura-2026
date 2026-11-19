import { Link } from 'react-router-dom'
import { plural } from '../lib/format.js'
import Avatar from './Avatar.jsx'
import { Pino } from './Icones.jsx'
import Estrelas from './Estrelas.jsx'

export default function CuidadorCard({ cuidador: c, cidadeId }) {
  const cidade = c.cidades.find((x) => x.id === cidadeId) ?? c.cidades[0]
  const formacao = c.formacoes?.[0]?.nome_curso
  const nota = c.nota_media

  return (
    <article className="flex flex-col overflow-hidden rounded-2xl border border-borda bg-white">
      <div className="flex-1 space-y-3 p-5">
        <div className="flex items-center gap-3">
          <Avatar nome={c.nome_completo} chave={c.foto_perfil_storage_key} tamanho={56} />
          <div className="min-w-0">
            <h2 className="truncate font-titulo text-base font-semibold">{c.nome_completo}</h2>
            {cidade && (
              <p className="flex items-center gap-1 text-sm text-suave">
                <Pino tamanho={14} />
                {cidade.nome} - {cidade.uf}
              </p>
            )}
          </div>
        </div>

        <div className="space-y-1 text-sm text-suave">
          {formacao && (
            <p>
              <strong className="font-semibold text-tinta">Formação:</strong> {formacao}
            </p>
          )}
          <p>
            <strong className="font-semibold text-tinta">Experiência:</strong> {c.anos_experiencia}{' '}
            {plural(c.anos_experiencia, 'ano', 'anos')} como {c.funcao.toLowerCase()}
          </p>
        </div>

        {c.especializacoes.length > 0 && (
          <div>
            <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide">Especializações:</p>
            <ul className="flex flex-wrap gap-1.5">
              {c.especializacoes.map((e) => (
                <li key={e.id} className="rounded-md bg-marca-clara px-2 py-0.5 text-xs font-medium text-marca-escura">
                  {e.nome}
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="flex items-center gap-2 text-sm">
          {nota ? (
            <>
              <Estrelas nota={nota} />
              <strong className="font-semibold">{nota.toFixed(1)}</strong>
              <span className="text-xs text-suave">({c.total_avaliacoes})</span>
            </>
          ) : (
            <span className="text-xs text-suave">Ainda sem avaliações</span>
          )}
        </div>
      </div>

      <Link
        to={`/cuidadores/${c.id}`}
        className="border-t border-marca/60 py-3 text-center text-sm font-semibold text-marca transition hover:bg-marca-clara focus-visible:bg-marca-clara focus-visible:outline-none"
      >
        Ver Perfil
      </Link>
    </article>
  )
}

export function CuidadorCardSkeleton() {
  return (
    <div className="space-y-4 rounded-2xl border border-borda bg-white p-5" style={{ animation: 'pulso 1.4s ease-in-out infinite' }}>
      <div className="flex items-center gap-3">
        <div className="size-14 rounded-full bg-borda" />
        <div className="space-y-2">
          <div className="h-4 w-36 rounded bg-borda" />
          <div className="h-3 w-24 rounded bg-borda" />
        </div>
      </div>
      <div className="h-3 w-3/4 rounded bg-borda" />
      <div className="h-3 w-2/3 rounded bg-borda" />
      <div className="flex gap-2">
        <div className="h-5 w-16 rounded bg-borda" />
        <div className="h-5 w-16 rounded bg-borda" />
      </div>
    </div>
  )
}
