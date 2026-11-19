import { useRef, useState } from 'react'
import { api } from '../lib/api.js'
import Avatar from './Avatar.jsx'
import Cartao from './Cartao.jsx'
import { Camera } from './Icones.jsx'

const TIPOS_FOTO = ['image/jpeg', 'image/png', 'image/webp']
const TAMANHO_MAXIMO_FOTO = 5 * 1024 * 1024

// Usado em "Meu perfil" (cuidador) e em "Minha conta" (contratante e admin).
export default function FotoPerfil({ usuario, aoAtualizar, aoAvisar }) {
  const entrada = useRef(null)
  const [chave, setChave] = useState(usuario.foto_perfil_storage_key)
  const [erro, setErro] = useState('')
  const [enviando, setEnviando] = useState(false)

  async function enviar(e) {
    const arquivo = e.target.files[0]
    e.target.value = ''
    if (!arquivo) return
    if (!TIPOS_FOTO.includes(arquivo.type)) {
      setErro('A foto deve ser JPG, PNG ou WEBP.')
      return
    }
    if (arquivo.size > TAMANHO_MAXIMO_FOTO) {
      setErro('A foto deve ter até 5 MB.')
      return
    }

    setErro('')
    setEnviando(true)
    try {
      const corpo = new FormData()
      corpo.append('foto', arquivo)
      const { foto_perfil_storage_key: nova } = await api(`/usuarios/${usuario.id}/foto-perfil`, { method: 'PUT', body: corpo })
      setChave(nova)
      aoAvisar('Foto atualizada com sucesso!')
      await aoAtualizar().catch(() => {})
    } catch (falha) {
      setErro(falha.message)
    } finally {
      setEnviando(false)
    }
  }

  return (
    <Cartao icone={Camera} titulo="Foto de perfil" className="h-full">
      <div className="flex items-center gap-5">
        <Avatar key={chave} nome={usuario.nome_completo} chave={chave} tamanho={96} className="ring-4 ring-marca-clara" />
        <div>
          <input ref={entrada} type="file" accept={TIPOS_FOTO.join(',')} onChange={enviar} className="sr-only" aria-label="Escolher foto de perfil" tabIndex={-1} />
          <button
            type="button"
            onClick={() => entrada.current.click()}
            disabled={enviando}
            className="rounded-lg border border-marca px-3.5 py-2 text-sm font-semibold text-marca transition hover:bg-marca-clara disabled:opacity-70"
          >
            {enviando ? 'Enviando…' : 'Alterar foto'}
          </button>
          <p className="mt-2 text-xs text-suave">JPG, PNG ou WEBP, até 5 MB.</p>
          {erro && <p role="alert" className="mt-1 text-xs text-red-600">{erro}</p>}
        </div>
      </div>
    </Cartao>
  )
}
