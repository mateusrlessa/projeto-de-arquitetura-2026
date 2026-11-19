import { useState } from 'react'
import Campo, { estiloTextarea } from './Campo.jsx'
import Estrelas from './Estrelas.jsx'
import { Check } from './Icones.jsx'
import { api } from '../lib/api.js'
import { ROTULOS_NOTA } from '../lib/avaliacoes.js'
import { primeiroNome } from '../lib/format.js'

const LIMITE_COMENTARIO = 500

function SeletorNota({ nota, erro, aoEscolher }) {
  const [sobre, setSobre] = useState(0)
  const exibida = sobre || nota

  return (
    <fieldset>
      <legend className="mb-1.5 block text-sm font-semibold">Sua nota</legend>
      <div className="flex items-center gap-3">
        <div
          className="relative inline-flex rounded-md focus-within:ring-2 focus-within:ring-marca/30"
          onMouseLeave={() => setSobre(0)}
        >
          <Estrelas nota={exibida} tamanho={32} />
          <div className="absolute inset-0 grid grid-cols-5">
            {[1, 2, 3, 4, 5].map((valor) => (
              <label key={valor} className="cursor-pointer" onMouseEnter={() => setSobre(valor)}>
                <input
                  type="radio"
                  name="nota"
                  value={valor}
                  checked={nota === valor}
                  onChange={() => aoEscolher(valor)}
                  className="sr-only"
                />
                <span className="sr-only">{valor} de 5: {ROTULOS_NOTA[valor]}</span>
              </label>
            ))}
          </div>
        </div>
        <span className="text-sm text-suave">{ROTULOS_NOTA[exibida] ?? 'Escolha de 1 a 5 estrelas'}</span>
      </div>
      {erro && <p role="alert" className="mt-1.5 text-xs text-red-600">{erro}</p>}
    </fieldset>
  )
}

export default function FormularioAvaliacao({ cuidador, avaliacao, contratacaoId, aoConcluir }) {
  const [nota, setNota] = useState(avaliacao?.nota ?? 0)
  const [comentario, setComentario] = useState(avaliacao?.comentario ?? '')
  const [erros, setErros] = useState({})
  const [enviando, setEnviando] = useState(false)
  const [publicada, setPublicada] = useState(false)
  const editando = Boolean(avaliacao)

  async function publicar(evento) {
    evento.preventDefault()
    const texto = comentario.trim()
    const faltando = {
      nota: nota ? undefined : 'Escolha uma nota de 1 a 5.',
      comentario: texto ? undefined : 'Escreva um comentário sobre o atendimento.',
    }
    setErros(faltando)
    if (faltando.nota || faltando.comentario) return

    setEnviando(true)
    try {
      if (editando) {
        await api(`/cuidadores/${cuidador.id}/avaliacoes/${avaliacao.id}`, {
          method: 'PUT',
          body: { nota, comentario: texto },
        })
      } else {
        await api(`/cuidadores/${cuidador.id}/avaliacoes`, {
          method: 'POST',
          body: { contratacao_id: contratacaoId, nota, comentario: texto },
        })
      }
      setPublicada(true)
      aoConcluir(editando ? 'Avaliação atualizada.' : 'Avaliação publicada. Obrigado por compartilhar sua experiência!')
    } catch (falha) {
      const campos = falha.campos ?? {}
      const { nota: erroNota, comentario: erroComentario } = campos
      setErros({ nota: erroNota, comentario: erroComentario, geral: erroNota || erroComentario ? undefined : falha.message })
      setEnviando(false)
    }
  }

  if (publicada) {
    return (
      <p role="status" className="flex items-center gap-2 rounded-xl bg-marca-clara p-4 text-sm font-medium text-marca-escura">
        <Check tamanho={18} className="shrink-0 text-marca" />
        {editando ? 'Avaliação atualizada.' : 'Avaliação publicada. Obrigado por compartilhar sua experiência!'}
      </p>
    )
  }

  return (
    <form onSubmit={publicar} noValidate className="space-y-4">
      <SeletorNota
        nota={nota}
        erro={erros.nota}
        aoEscolher={(valor) => {
          setNota(valor)
          setErros((atual) => ({ ...atual, nota: undefined }))
        }}
      />
      <Campo rotulo="Seu comentário" erro={erros.comentario}>
        <textarea
          rows={4}
          maxLength={LIMITE_COMENTARIO}
          value={comentario}
          onChange={(evento) => {
            setComentario(evento.target.value)
            setErros((atual) => ({ ...atual, comentario: undefined }))
          }}
          placeholder={`Como foi o atendimento de ${primeiroNome(cuidador.nome_completo)}?`}
          className={estiloTextarea(erros.comentario)}
        />
      </Campo>
      {erros.geral && <p role="alert" className="text-sm text-red-600">{erros.geral}</p>}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <span className="text-xs text-suave">{comentario.length} de {LIMITE_COMENTARIO} caracteres</span>
        <button
          type="submit"
          disabled={enviando}
          className="rounded-lg bg-marca px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-marca-escura disabled:opacity-60"
        >
          {enviando ? (editando ? 'Salvando…' : 'Publicando…') : (editando ? 'Salvar alterações' : 'Publicar avaliação')}
        </button>
      </div>
    </form>
  )
}
