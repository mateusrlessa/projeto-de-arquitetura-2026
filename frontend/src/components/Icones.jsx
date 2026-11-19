const base = { width: 18, height: 18, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': true }

const criar = (caminho) =>
  function Icone({ tamanho = 18, className }) {
    return (
      <svg {...base} width={tamanho} height={tamanho} className={className}>
        {caminho}
      </svg>
    )
  }

export const Coracao = criar(<path d="M12 20s-7-4.35-9-9.2C1.8 7.6 3.6 4.5 6.8 4.5c1.9 0 3.4 1 5.2 3 1.8-2 3.3-3 5.2-3 3.2 0 5 3.1 3.8 6.3C19 15.65 12 20 12 20z" />)
export const Pino = criar(<><path d="M12 21s-6.5-5.6-6.5-11a6.5 6.5 0 1 1 13 0c0 5.4-6.5 11-6.5 11z" /><circle cx="12" cy="10" r="2.3" /></>)
export const Seta = criar(<path d="M5 12h14M13 6l6 6-6 6" />)
export const SetaEsquerda = criar(<path d="M19 12H5M11 6l-6 6 6 6" />)
export const Chevron = criar(<path d="M6 9l6 6 6-6" />)
export const Check = criar(<path d="M5 12.5l4.5 4.5L19 7.5" />)
export const Olho = criar(<><path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z" /><circle cx="12" cy="12" r="3" /></>)
export const OlhoRiscado = criar(<><path d="M3 3l18 18M10.6 5.1A9.8 9.8 0 0 1 12 5c6.4 0 10 7 10 7a17 17 0 0 1-3.2 4M6.5 6.6A17 17 0 0 0 2 12s3.6 7 10 7a9.6 9.6 0 0 0 4-.9M9.9 9.9a3 3 0 0 0 4.2 4.2" /></>)
export const Escudo = criar(<><path d="M12 3l7 3v5c0 4.6-3 8.2-7 10-4-1.8-7-5.4-7-10V6l7-3z" /><path d="M9 12l2.2 2.2L15 10.5" /></>)
export const Relogio = criar(<><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>)
export const Capelo = criar(<><path d="M2 9l10-5 10 5-10 5L2 9z" /><path d="M6 11.5V16c0 1.2 2.7 2.5 6 2.5s6-1.3 6-2.5v-4.5" /></>)
export const Pessoas = criar(<><circle cx="9" cy="8" r="3.2" /><path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6M16 5a3 3 0 0 1 0 6M18 14.4c1.8.8 3 2.6 3 5.6" /></>)
export const Maleta = criar(<><rect x="3" y="7" width="18" height="13" rx="2" /><path d="M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2M12 11v5M9.5 13.5h5" /></>)
export const Mensagens = criar(<path d="M4 5h16v10H9l-5 4V5z" />)
export const Fechar = criar(<path d="M6 6l12 12M18 6L6 18" />)
export const Alerta = criar(<><circle cx="12" cy="12" r="9" /><path d="M12 7.5v5M12 16h.01" /></>)
export const Busca = criar(<><circle cx="11" cy="11" r="6.5" /><path d="M16 16l4.5 4.5" /></>)
export const Camera = criar(<><path d="M3 8.5A1.5 1.5 0 0 1 4.5 7H8l1.5-2.5h5L16 7h3.5A1.5 1.5 0 0 1 21 8.5v9a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 3 17.5v-9z" /><circle cx="12" cy="13" r="3.3" /></>)
export const Contato = criar(<><rect x="4" y="3" width="16" height="18" rx="2.5" /><circle cx="12" cy="10" r="2.8" /><path d="M7.5 18c.5-2.5 2.3-4 4.5-4s4 1.5 4.5 4" /></>)
export const Usuario = criar(<><circle cx="12" cy="8" r="4" /><path d="M4.5 21c.6-4.2 3.6-7 7.5-7s6.9 2.8 7.5 7" /></>)
export const Lapis = criar(<><path d="M4 20l1-4.5L16.5 4a2.1 2.1 0 0 1 3 3L8 18.5 4 20z" /><path d="M14.5 6l3 3" /></>)
export const Lixeira = criar(<><path d="M4 7h16M9.5 7V4.5h5V7M6.5 7l1 13h9l1-13M10 11v5.5M14 11v5.5" /></>)
export const Mais = criar(<path d="M12 5v14M5 12h14" />)
export const LinkExterno = criar(<><path d="M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5" /><path d="M14 4h6v6M20 4l-9.5 9.5" /></>)
export const Tendencia = criar(<><path d="M3 17l6-6 4 4 8-8" /><path d="M15 7h6v6" /></>)
export const Responder = criar(<><path d="M9 7l-5 5 5 5" /><path d="M4 12h10a6 6 0 0 1 6 6v1" /></>)

export const Whatsapp = criar(<path d="M7.9 20A9 9 0 1 0 4 16.1L2 22l5.9-2zM9 9.5c0 3 2.5 5.5 5.5 5.5l1.2-1.4-2-1-.9.7a3.600 3.6 3.6 0 0 1-1.6-1.6l.7-.9-1-2L9 9.5z" />)
export const Cadeado = criar(<><rect x="5" y="10.5" width="14" height="10" rx="2" /><path d="M8 10.5V7.5a4 4 0 0 1 8 0v3M12 14.5v2.5" /></>)
export const Envelope = criar(<><rect x="3" y="5" width="18" height="14" rx="2" /><path d="M3.5 6.5l8.5 6.5 8.5-6.5" /></>)
