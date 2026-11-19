import { useEffect, useRef, useState } from 'react'
import { api } from '../lib/api.js'

const URL_SCRIPT = 'https://accounts.google.com/gsi/client'
const LARGURA_MAXIMA = 400
const LARGURA_MINIMA = 200
// Margens da página e do formulário, usadas quando o botão está em uma aba ainda oculta.
const MARGENS_LATERAIS = 90

let carregamento = null
let aoReceberCredencial = null

function carregarScript() {
  return new Promise((resolve, reject) => {
    const script = document.createElement('script')
    script.src = URL_SCRIPT
    script.async = true
    script.onload = resolve
    script.onerror = reject
    document.head.append(script)
  })
}

// O Google só permite uma inicialização por página, então os botões compartilham a mesma.
// O clique em cada botão define quem recebe a credencial.
function carregarGoogle() {
  carregamento ??= (async () => {
    const { google_client_id: clientId } = await api('/auth/config', { auth: false })
    if (!clientId) return null
    if (!window.google?.accounts?.id) await carregarScript()

    const gsi = window.google.accounts.id
    gsi.initialize({ client_id: clientId, callback: ({ credential }) => aoReceberCredencial?.(credential) })
    return gsi
  })().catch(() => {
    carregamento = null
    return null
  })
  return carregamento
}

export default function BotaoGoogle({ texto = 'continue_with', aoAutenticar }) {
  const alvo = useRef(null)
  const aoAutenticarRef = useRef(aoAutenticar)
  const [estado, setEstado] = useState('carregando')

  useEffect(() => {
    aoAutenticarRef.current = aoAutenticar
  })

  useEffect(() => {
    const controle = new AbortController()
    carregarGoogle().then((gsi) => {
      if (controle.signal.aborted) return
      setEstado(gsi ? 'pronto' : 'indisponivel')
      if (!gsi) return

      const disponivel = alvo.current.offsetWidth || window.innerWidth - MARGENS_LATERAIS
      gsi.renderButton(alvo.current, {
        theme: 'outline',
        size: 'large',
        shape: 'pill',
        text: texto,
        locale: 'pt-BR',
        width: Math.max(LARGURA_MINIMA, Math.min(LARGURA_MAXIMA, disponivel)),
        click_listener: () => {
          aoReceberCredencial = (credencial) => aoAutenticarRef.current(credencial)
        },
      })
    })
    return () => controle.abort()
  }, [texto])

  if (estado === 'indisponivel') {
    return (
      <button
        type="button"
        disabled
        className="flex h-12 w-full cursor-not-allowed items-center justify-center gap-3 rounded-xl border border-borda text-sm font-semibold text-suave opacity-70"
      >
        <LogoGoogle /> Login com Google indisponível
      </button>
    )
  }

  return <div ref={alvo} className="flex min-h-11 w-full justify-center" />
}

function LogoGoogle() {
  return (
    <svg width="20" height="20" viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#EA4335" d="M24 9.500c3.500 0 6.600 1.200 9.100 3.600l6.800-6.800C35.800 2.400 30.300 0 24 0 14.600 0 6.500 5.400 2.600 13.200l7.900 6.100C12.400 13.600 17.700 9.500 24 9.500z" />
      <path fill="#4285F4" d="M46.500 24.500c0-1.600-.1-3.100-.4-4.500H24v9h12.700c-.6 3-2.300 5.500-4.800 7.200l7.600 5.900c4.400-4.100 7-10.100 7-17.600z" />
      <path fill="#FBBC05" d="M10.500 28.700A14.500 14.500 0 0 1 9.500 24c0-1.600.3-3.200.8-4.700l-7.900-6.100A24 24 0 0 0 0 24c0 3.900.9 7.500 2.600 10.800l7.900-6.100z" />
      <path fill="#34A853" d="M24 48c6.500 0 11.900-2.100 15.900-5.800l-7.600-5.900c-2.100 1.400-4.800 2.300-8.300 2.300-6.300 0-11.600-4.100-13.500-9.800l-7.900 6.100C6.500 42.600 14.600 48 24 48z" />
    </svg>
  )
}
