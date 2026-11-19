import { useState } from 'react'
import Campo, { estiloInput } from './Campo.jsx'
import { Olho, OlhoRiscado } from './Icones.jsx'

// Campo de senha com o botão de olho. Cada campo controla a própria visibilidade.
export default function CampoSenha({ rotulo, erro, value, onChange, autoComplete, placeholder, autoFocus }) {
  const [mostrar, setMostrar] = useState(false)

  return (
    <Campo rotulo={rotulo} erro={erro}>
      <div className="relative">
        <input
          type={mostrar ? 'text' : 'password'}
          value={value}
          onChange={onChange}
          autoComplete={autoComplete}
          placeholder={placeholder}
          autoFocus={autoFocus}
          className={`${estiloInput(erro)} pr-11`}
        />
        <button
          type="button"
          onClick={() => setMostrar((m) => !m)}
          aria-label={mostrar ? 'Ocultar senha' : 'Mostrar senha'}
          className="absolute right-3 top-1/2 -translate-y-1/2 rounded text-suave hover:text-tinta focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-marca/30"
        >
          {mostrar ? <OlhoRiscado /> : <Olho />}
        </button>
      </div>
    </Campo>
  )
}
