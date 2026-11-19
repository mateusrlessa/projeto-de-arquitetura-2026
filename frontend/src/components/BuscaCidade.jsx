import { useEffect, useId, useMemo, useRef, useState } from 'react'
import { filtrarCidades, normalizar, rotuloCidade } from '../lib/cidades.js'
import { Pino } from './Icones.jsx'

const LIMITE_SUGESTOES = 8

// Campo de cidade com preenchimento automático: ao digitar "for", a primeira sugestão aparece completando o
// texto em cinza ("Fortaleza - CE") e Enter, Tab ou a seta para a direita aceitam.
export default function BuscaCidade({
  cidades,
  texto,
  aoAlterarTexto,
  aoSelecionar,
  selecionarAoClicar = true,
  placeholder = 'Digite o nome da cidade',
  disabled = false,
  compacto = false,
  className = '',
  id,
}) {
  const idAutomatico = useId()
  const base = id ?? idAutomatico
  const entrada = useRef(null)
  const lista = useRef(null)
  const focoPorMouse = useRef(false)
  const [aberta, setAberta] = useState(false)
  const [indice, setIndice] = useState(null)

  const termo = normalizar(texto)
  const sugestoes = useMemo(() => filtrarCidades(cidades, texto, LIMITE_SUGESTOES), [cidades, texto])
  // Enquanto a pessoa digita, a primeira sugestão já vem marcada: é ela que o Enter aceita.
  const ativo = sugestoes.length === 0 ? -1 : (indice ?? (termo ? 0 : -1))

  // Texto que falta para completar a sugestão marcada, só quando ela começa exatamente com o que foi digitado.
  const alvo = ativo >= 0 ? rotuloCidade(sugestoes[ativo]) : ''
  const completa = aberta && texto !== '' && alvo.length > texto.length && normalizar(alvo.slice(0, texto.length)) === termo
  const resto = completa ? alvo.slice(texto.length) : ''

  useEffect(() => {
    lista.current?.querySelector('[aria-selected="true"]')?.scrollIntoView({ block: 'nearest' })
  }, [ativo])

  function escolher(cidade, notificarSelecao = true) {
    aoAlterarTexto(rotuloCidade(cidade), true)
    if (notificarSelecao) aoSelecionar(cidade)
    setAberta(false)
    setIndice(null)
    // O texto escolhido fica selecionado: digitar outra cidade em seguida substitui, em vez de acrescentar.
    requestAnimationFrame(() => entrada.current?.select())
  }

  function aoTeclar(evento) {
    const { key } = evento
    if (key === 'ArrowDown' || key === 'ArrowUp') {
      if (sugestoes.length === 0) return
      evento.preventDefault()
      setAberta(true)
      const passo = key === 'ArrowDown' ? 1 : -1
      setIndice((ativo + passo + sugestoes.length) % sugestoes.length)
    } else if (key === 'Enter' && aberta && ativo >= 0) {
      evento.preventDefault()
      escolher(sugestoes[ativo])
    } else if ((key === 'Tab' && !evento.shiftKey && resto) || (key === 'ArrowRight' && resto && evento.currentTarget.selectionStart === texto.length)) {
      evento.preventDefault()
      escolher(sugestoes[ativo])
    } else if (key === 'Escape') {
      // Sem o preventDefault, o campo "search" do navegador também apagaria o texto.
      evento.preventDefault()
      setAberta(false)
    }
  }

  const alturaEPadding = compacto ? 'h-11 pl-10' : 'h-12 pl-11'

  return (
    <div className={`relative ${className}`}>
      <Pino tamanho={18} className="pointer-events-none absolute left-4 top-1/2 z-10 -translate-y-1/2 text-marca" />
      <input
        ref={entrada}
        id={base}
        type="search"
        autoComplete="off"
        autoCapitalize="off"
        spellCheck={false}
        role="combobox"
        aria-expanded={aberta && (sugestoes.length > 0 || Boolean(termo))}
        aria-autocomplete="both"
        aria-controls={`${base}-sugestoes`}
        aria-activedescendant={aberta && ativo >= 0 ? `${base}-op-${ativo}` : undefined}
        value={texto}
        disabled={disabled}
        onMouseDown={() => {
          focoPorMouse.current = document.activeElement !== entrada.current
        }}
        onFocus={(e) => {
          setAberta(true)
          // Ao entrar no campo, o texto vem selecionado: digitar outra cidade substitui a atual.
          if (!focoPorMouse.current) e.target.select()
        }}
        onMouseUp={(e) => {
          if (focoPorMouse.current) {
            e.preventDefault()
            e.target.select()
            focoPorMouse.current = false
          }
        }}
        onBlur={() => {
          setAberta(false)
          setIndice(null)
        }}
        onChange={(e) => {
          aoAlterarTexto(e.target.value)
          setIndice(null)
          setAberta(true)
        }}
        onKeyDown={aoTeclar}
        placeholder={placeholder}
        className={`${alturaEPadding} w-full rounded-xl border border-borda bg-white pr-4 text-sm text-tinta outline-none transition placeholder:text-suave focus:border-marca focus:ring-2 focus:ring-marca/20 disabled:cursor-not-allowed disabled:opacity-60`}
      />

      {/* Completa o que foi digitado em cinza, por cima do campo. A parte já digitada fica invisível. */}
      {resto && (
        <div aria-hidden="true" className={`pointer-events-none absolute inset-0 flex items-center overflow-hidden whitespace-pre border border-transparent pr-4 text-sm ${compacto ? 'pl-10' : 'pl-11'}`}>
          <span className="invisible">{texto}</span>
          <span className="text-suave/60">{resto}</span>
        </div>
      )}

      {aberta && !disabled && (sugestoes.length > 0 || termo) && (
        <ul
          ref={lista}
          id={`${base}-sugestoes`}
          role="listbox"
          // Clicar na barra de rolagem não pode tirar o foco do campo (isso fecharia a lista).
          onMouseDown={(e) => e.preventDefault()}
          className="absolute left-0 right-0 top-[calc(100%+6px)] z-30 max-h-64 overflow-y-auto rounded-xl border border-borda bg-white py-1 shadow-lg"
        >
          {sugestoes.length === 0 && (
            <li role="presentation" className="px-4 py-3 text-sm text-suave">
              Nenhuma cidade encontrada para “{texto.trim()}”.
            </li>
          )}
          {sugestoes.map((cidade, i) => (
            <li
              key={cidade.id}
              id={`${base}-op-${i}`}
              role="option"
              aria-selected={i === ativo}
              onClick={() => escolher(cidade, selecionarAoClicar)}
              className={`flex cursor-pointer items-center gap-2 px-4 py-3 text-left text-sm transition ${
                i === ativo ? 'bg-marca-clara text-marca-escura' : 'text-tinta hover:bg-marca-clara/60'
              }`}
            >
              <Pino tamanho={15} className="shrink-0 text-marca" />
              <span>{destacar(rotuloCidade(cidade), termo)}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

// Deixa em negrito o trecho que combina com o que foi digitado.
function destacar(rotulo, termo) {
  const inicio = termo ? normalizar(rotulo).indexOf(termo) : -1
  if (inicio < 0) return rotulo
  const fim = inicio + termo.length
  return (
    <>
      {rotulo.slice(0, inicio)}
      <strong className="font-semibold">{rotulo.slice(inicio, fim)}</strong>
      {rotulo.slice(fim)}
    </>
  )
}
