export const estiloInput = (erro) =>
  `h-12 w-full rounded-xl border bg-white px-4 text-sm placeholder:text-suave/70 focus:outline-none focus:ring-2 ${
    erro ? 'border-red-400 focus:ring-red-200' : 'border-borda focus:border-marca focus:ring-marca/30'
  }`

export const estiloTextarea = (erro) =>
  `w-full rounded-xl border bg-white px-4 py-3 text-sm leading-relaxed placeholder:text-suave/70 focus:outline-none focus:ring-2 ${
    erro ? 'border-red-400 focus:ring-red-200' : 'border-borda focus:border-marca focus:ring-marca/30'
  }`

export default function Campo({ rotulo, erro, children }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-semibold">{rotulo}</span>
      {children}
      {erro && <span role="alert" className="mt-1.5 block text-xs text-red-600">{erro}</span>}
    </label>
  )
}
