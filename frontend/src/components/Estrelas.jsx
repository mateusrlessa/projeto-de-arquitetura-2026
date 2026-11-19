const ESTRELA = 'M12 2.5l2.94 5.96 6.56.95-4.75 4.63 1.12 6.54L12 17.5l-5.87 3.08 1.12-6.54L2.5 9.41l6.56-.95L12 2.5z'

function Fileira({ tamanho, cor }) {
  return (
    <span className="flex">
      {Array.from({ length: 5 }, (_, i) => (
        <svg key={i} width={tamanho} height={tamanho} viewBox="0 0 24 24" fill={cor} aria-hidden="true" className="shrink-0">
          <path d={ESTRELA} />
        </svg>
      ))}
    </span>
  )
}

export default function Estrelas({ nota = 0, tamanho = 16 }) {
  const largura = Math.max(0, Math.min(5, nota)) * 20
  return (
    <span className="relative inline-flex" role="img" aria-label={`Nota ${nota.toFixed(1)} de 5`}>
      <Fileira tamanho={tamanho} cor="#e3e7e6" />
      <span className="absolute inset-y-0 left-0 overflow-hidden" style={{ width: `${largura}%` }}>
        <Fileira tamanho={tamanho} cor="var(--color-estrela)" />
      </span>
    </span>
  )
}
