import { useState } from 'react'
import { fotoUrl, iniciais } from '../lib/format.js'

export default function Avatar({ nome, chave, tamanho = 56, className = '' }) {
  const [falhou, setFalhou] = useState(false)
  const url = fotoUrl(chave)
  const estilo = { width: tamanho, height: tamanho, fontSize: tamanho * 0.32 }

  if (!url || falhou) {
    return (
      <span
        style={estilo}
        className={`flex shrink-0 items-center justify-center rounded-full bg-marca-clara font-titulo font-semibold text-marca ${className}`}
        aria-hidden="true"
      >
        {iniciais(nome)}
      </span>
    )
  }

  return (
    <img
      src={url}
      alt={nome}
      style={{ width: tamanho, height: tamanho }}
      className={`shrink-0 rounded-full object-cover ${className}`}
      onError={() => setFalhou(true)}
    />
  )
}
