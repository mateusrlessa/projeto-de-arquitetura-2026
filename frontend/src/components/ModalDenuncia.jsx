import { useState } from 'react'
import { estiloTextarea } from './Campo.jsx'
import ModalConfirmar from './ModalConfirmar.jsx'
import { api } from '../lib/api.js'
import { MOTIVOS_DENUNCIA } from '../lib/denuncias.js'


// Denúncia de um comentário. Se já foi denunciado por esta pessoa, o servidor avisa e o aviso aparece aqui.
export default function ModalDenuncia({ avaliacao, aoEnviar, aoFechar }) {
  const [motivo, setMotivo] = useState('')
  const [detalhe, setDetalhe] = useState('')

  async function enviar() {
    try {
      await api(`/avaliacoes/${avaliacao.id}/denuncias`, { method: 'POST', body: { motivo, detalhe: detalhe.trim() || undefined } })
    } catch (erro) {
      // Quem já denunciou não precisa fazer nada: o resultado final é o mesmo.
      if (erro.status !== 409) throw erro
    }
    aoEnviar(avaliacao.id)
  }

  return (
    <ModalConfirmar titulo="Denunciar este comentário" rotuloConfirmar="Enviar denúncia" perigo bloqueado={!motivo} aoConfirmar={enviar} aoFechar={aoFechar}>
      <blockquote className="max-h-32 overflow-y-auto whitespace-pre-line rounded-lg border-l-4 border-borda bg-fundo p-3 text-tinta">
        {avaliacao.comentario}
      </blockquote>
      <fieldset>
        <legend className="mb-2 font-medium text-tinta">Por que você está denunciando?</legend>
        <div className="space-y-1">
          {MOTIVOS_DENUNCIA.map(([chave, texto]) => (
            <label key={chave} className="flex cursor-pointer items-center gap-2.5 rounded-lg px-2 py-1.5 hover:bg-fundo">
              <input
                type="radio"
                name="motivo-denuncia"
                value={chave}
                checked={motivo === chave}
                onChange={() => setMotivo(chave)}
                className="size-4 accent-[#358a90]"
              />
              <span className="text-tinta">{texto}</span>
            </label>
          ))}
        </div>
      </fieldset>
      <label className="block">
        <span className="mb-1.5 block text-tinta">Quer explicar melhor? <span className="text-suave">(opcional)</span></span>
        <textarea value={detalhe} onChange={(e) => setDetalhe(e.target.value)} maxLength={300} rows={3} className={estiloTextarea(false)} />
        <span className="mt-1 block text-right text-xs text-suave">{detalhe.length}/300</span>
      </label>
      <p>A equipe analisa a denúncia. A outra pessoa não vê quem denunciou.</p>
    </ModalConfirmar>
  )
}
