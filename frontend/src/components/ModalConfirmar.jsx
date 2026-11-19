import { useEffect, useId, useRef, useState } from 'react'
import { estiloInput } from './Campo.jsx'
import { Alerta } from './Icones.jsx'

const FOCAVEIS = 'button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [href]'

// Confirmação de ações sensíveis. Com `confirmarTexto`, o botão só habilita depois de digitar esse texto.
// `bloqueado` mantém o botão desabilitado até o chamador liberar (ex.: falta escolher uma opção).
// `aoConfirmar` recebe o que foi digitado em `children` pelo próprio chamador; se lançar erro, a mensagem aparece aqui.
export default function ModalConfirmar({
  titulo,
  rotuloConfirmar,
  perigo = false,
  bloqueado = false,
  confirmarTexto,
  aoConfirmar,
  aoFechar,
  children,
}) {
  const id = useId()
  const caixa = useRef(null)
  const [digitado, setDigitado] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [erro, setErro] = useState('')

  const liberado = !bloqueado && (!confirmarTexto || digitado.trim().toLowerCase() === confirmarTexto.toLowerCase())

  useEffect(() => {
    const anterior = document.activeElement
    caixa.current?.querySelector(FOCAVEIS)?.focus()
    return () => anterior?.focus?.()
  }, [])

  function aoTeclar(e) {
    if (e.key === 'Escape' && !enviando) return aoFechar()
    if (e.key !== 'Tab') return
    // Mantém o foco dentro do modal.
    const itens = [...caixa.current.querySelectorAll(FOCAVEIS)]
    if (!itens.length) return
    const primeiro = itens[0]
    const ultimo = itens[itens.length - 1]
    if (e.shiftKey && document.activeElement === primeiro) {
      e.preventDefault()
      ultimo.focus()
    } else if (!e.shiftKey && document.activeElement === ultimo) {
      e.preventDefault()
      primeiro.focus()
    }
  }

  async function confirmar(e) {
    e.preventDefault()
    if (!liberado || enviando) return
    setErro('')
    setEnviando(true)
    try {
      await aoConfirmar()
    } catch (falha) {
      setErro(falha.message || 'Não foi possível concluir a ação.')
      setEnviando(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-30 flex items-center justify-center bg-tinta/50 p-4"
      onMouseDown={(e) => e.target === e.currentTarget && !enviando && aoFechar()}
      onKeyDown={aoTeclar}
    >
      <form
        ref={caixa}
        onSubmit={confirmar}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={`${id}-titulo`}
        className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl"
        style={{ animation: 'aparecer 0.15s ease-out' }}
      >
        <div className="flex items-start gap-3">
          <span className={`flex size-10 shrink-0 items-center justify-center rounded-full ${perigo ? 'bg-red-50 text-red-600' : 'bg-marca-clara text-marca'}`}>
            <Alerta tamanho={20} />
          </span>
          <h2 id={`${id}-titulo`} className="pt-1.5 font-titulo text-lg font-semibold leading-snug">{titulo}</h2>
        </div>

        <div className="mt-4 space-y-4 text-sm text-suave">{children}</div>

        {confirmarTexto && (
          <label className="mt-4 block text-sm">
            <span className="mb-1.5 block text-suave">
              Para confirmar, digite <strong className="break-all text-tinta">{confirmarTexto}</strong>
            </span>
            <input value={digitado} onChange={(e) => setDigitado(e.target.value)} autoComplete="off" className={estiloInput(false)} />
          </label>
        )}

        {erro && <p role="alert" className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{erro}</p>}

        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={aoFechar}
            disabled={enviando}
            className="h-11 rounded-xl border border-borda px-5 text-sm font-semibold transition hover:bg-fundo disabled:opacity-60"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={!liberado || enviando}
            className={`h-11 rounded-xl px-5 text-sm font-semibold text-white transition disabled:opacity-50 ${perigo ? 'bg-red-600 hover:bg-red-700' : 'bg-marca hover:bg-marca-escura'}`}
          >
            {enviando ? 'Aguarde…' : rotuloConfirmar}
          </button>
        </div>
      </form>
    </div>
  )
}
