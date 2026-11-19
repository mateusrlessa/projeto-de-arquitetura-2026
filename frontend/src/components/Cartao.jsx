export function SeloIcone({ icone: Icone, tamanho = 18, className = 'size-9' }) {
  return (
    <span className={`flex shrink-0 items-center justify-center rounded-lg bg-marca-clara text-marca ${className}`}>
      <Icone tamanho={tamanho} />
    </span>
  )
}

export default function Cartao({ icone, titulo, className = '', children }) {
  return (
    <section className={`rounded-2xl border border-borda bg-white p-6 ${className}`}>
      <h2 className="mb-4 flex items-center gap-3 font-titulo text-lg font-medium">
        <SeloIcone icone={icone} />
        {titulo}
      </h2>
      {children}
    </section>
  )
}

export function TituloPagina({ icone, titulo, children }) {
  return (
    <header>
      <h1 className="flex items-center gap-3 font-titulo text-3xl font-bold">
        <SeloIcone icone={icone} tamanho={20} className="size-10" />
        {titulo}
      </h1>
      <p className="mt-2 text-sm text-suave">{children}</p>
    </header>
  )
}
