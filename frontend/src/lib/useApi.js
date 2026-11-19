import { useCallback, useEffect, useRef, useState } from 'react'

// Executa buscar(signal) sempre que a chave muda. Chave null não busca.
export function useDados(chave, buscar) {
  const [estado, setEstado] = useState({ dados: null, carregando: chave !== null, erro: null })
  const [tentativa, setTentativa] = useState(0)
  const buscarRef = useRef(buscar)

  useEffect(() => {
    buscarRef.current = buscar
  })

  useEffect(() => {
    if (chave === null) return
    const controle = new AbortController()
    setEstado((e) => ({ ...e, carregando: true, erro: null }))
    buscarRef
      .current(controle.signal)
      .then((dados) => setEstado({ dados, carregando: false, erro: null }))
      .catch((erro) => {
        if (erro.name !== 'AbortError') setEstado({ dados: null, carregando: false, erro })
      })
    return () => controle.abort()
  }, [chave, tentativa])

  const recarregar = useCallback(() => setTentativa((t) => t + 1), [])
  return { ...estado, recarregar }
}
