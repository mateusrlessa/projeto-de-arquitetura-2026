import { useSyncExternalStore } from 'react'
import { api, ApiError } from './api.js'
import { CIDADES_DEMO, CUIDADORES_DEMO } from './demo.js'

// Se o servidor estiver fora do ar ou ainda sem dados, as telas usam dados de exemplo.
let demo = false
const ouvintes = new Set()

function ativarDemo() {
  if (demo) return
  demo = true
  ouvintes.forEach((fn) => fn())
}

export const useModoDemo = () =>
  useSyncExternalStore(
    (fn) => {
      ouvintes.add(fn)
      return () => ouvintes.delete(fn)
    },
    () => demo,
  )

const servidorIndisponivel = (erro) => erro.status === 0 || erro.status >= 500

async function comFallback(real, exemplo) {
  if (demo) return exemplo()
  try {
    return await real()
  } catch (erro) {
    if (!servidorIndisponivel(erro)) throw erro
    ativarDemo()
    return exemplo()
  }
}

// A API entrega no máximo 100 cidades por página: lê todas, senão as cidades depois da 100ª nunca apareceriam na busca.
async function todasAsCidades(signal) {
  const buscarPagina = (pagina) => api('/cidades', { params: { status: 'ATIVO', limite: 100, pagina }, signal })
  const primeira = await buscarPagina(1)
  const demais = await Promise.all(Array.from({ length: Math.max(0, primeira.paginacao.total_paginas - 1) }, (_, i) => buscarPagina(i + 2)))
  return [primeira, ...demais].flatMap((resposta) => resposta.dados)
}

export const buscarCidades = ({ signal } = {}) =>
  comFallback(
    async () => {
      const [cidades, cuidadores] = await Promise.all([todasAsCidades(signal), api('/cuidadores', { params: { limite: 1 }, signal })])
      if (cidades.length === 0 || Number(cuidadores.paginacao.total) === 0) {
        ativarDemo()
        return CIDADES_DEMO
      }
      return cidades
    },
    () => CIDADES_DEMO,
  )

// A listagem não traz as formações, então buscamos o perfil de cada cuidador da página.
async function comFormacoes(dados, signal) {
  const perfis = await Promise.all(
    dados.map((c) =>
      api(`/cuidadores/${c.id}`, { signal })
        .then((perfil) => perfil.formacoes)
        .catch((erro) => {
          if (erro.name === 'AbortError') throw erro
          return []
        }),
    ),
  )
  return dados.map((c, i) => ({ ...c, formacoes: perfis[i] }))
}

export const buscarCuidadores = ({ cidadeId, pagina, limite, signal }) =>
  comFallback(
    async () => {
      const resposta = await api('/cuidadores', { params: { cidade_id: cidadeId, pagina, limite }, signal })
      return { ...resposta, dados: await comFormacoes(resposta.dados, signal) }
    },
    () => {
      const todos = CUIDADORES_DEMO.filter((c) => c.cidades.some((x) => x.id === cidadeId))
      const inicio = (pagina - 1) * limite
      return {
        dados: todos.slice(inicio, inicio + limite),
        paginacao: { pagina, limite, total: todos.length, total_paginas: Math.max(1, Math.ceil(todos.length / limite)) },
      }
    },
  )

export const buscarCuidador = (id, { signal } = {}) =>
  comFallback(
    () => api(`/cuidadores/${id}`, { signal }),
    () => {
      const cuidador = CUIDADORES_DEMO.find((c) => c.id === Number(id))
      if (!cuidador) throw new ApiError(404, 'Cuidador não encontrado')
      return cuidador
    },
  )

export const buscarAvaliacoes = (id, { signal } = {}) =>
  comFallback(
    async () => (await api(`/cuidadores/${id}/avaliacoes`, { params: { limite: 20 }, signal })).dados,
    () => CUIDADORES_DEMO.find((c) => c.id === Number(id))?.avaliacoes ?? [],
  )
