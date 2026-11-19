// Só indica que vale a pena tentar restaurar a sessão. O que autentica é o cookie HttpOnly,
// que o JavaScript não lê; o token de acesso fica apenas na memória.
const CHAVE_LOGADO = 'cuidaaqui.logado'
const TEMPO_LIMITE_MS = 15_000
const TEMPO_LIMITE_RESTAURAR_MS = 5_000

export class ApiError extends Error {
  constructor(status, mensagem, detalhes = []) {
    super(mensagem)
    this.status = status
    this.detalhes = detalhes
  }

  // { campo: mensagem } a partir dos detalhes de validação do backend.
  get campos() {
    return Object.fromEntries((this.detalhes ?? []).filter((d) => d.campo).map((d) => [d.campo, d.mensagem]))
  }
}

let sessao = null
const ouvintes = new Set()

// Sessões antigas guardavam os tokens aqui: apaga o que tiver sobrado no navegador.
try {
  localStorage.removeItem('cuidaaqui.sessao')
} catch {
  // Sem acesso ao localStorage, a sessão vale só até recarregar a página.
}

export const lerSessao = () => sessao

export function assinarSessao(ouvinte) {
  ouvintes.add(ouvinte)
  return () => ouvintes.delete(ouvinte)
}

export function salvarSessao(nova) {
  sessao = nova
  try {
    if (nova) localStorage.setItem(CHAVE_LOGADO, '1')
    else localStorage.removeItem(CHAVE_LOGADO)
  } catch {
    // Sem acesso ao localStorage, a sessão vale só até recarregar a página.
  }
  ouvintes.forEach((fn) => fn())
}

function montarUrl(caminho, params) {
  const filtrados = Object.entries(params ?? {}).filter(([, v]) => v !== undefined && v !== null && v !== '')
  const query = new URLSearchParams(filtrados).toString()
  return `/api${caminho}${query ? `?${query}` : ''}`
}

async function enviar(caminho, { method = 'GET', body, params, signal, token }) {
  const limite = AbortSignal.timeout(TEMPO_LIMITE_MS)
  // Em envios de arquivo, o navegador define o Content-Type com o separador das partes.
  const ehArquivo = body instanceof FormData
  let resposta
  try {
    resposta = await fetch(montarUrl(caminho, params), {
      method,
      signal: signal ? AbortSignal.any([signal, limite]) : limite,
      headers: {
        ...(body && !ehArquivo ? { 'Content-Type': 'application/json' } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: ehArquivo ? body : body ? JSON.stringify(body) : undefined,
    })
  } catch (erro) {
    if (signal?.aborted) throw erro
    const demorou = erro.name === 'TimeoutError'
    throw new ApiError(0, demorou ? 'O servidor demorou demais para responder.' : 'Não foi possível conectar ao servidor. Verifique se o backend está rodando.')
  }

  if (resposta.status === 204) return null
  const dados = await resposta.json().catch(() => null)
  if (!resposta.ok) throw new ApiError(resposta.status, dados?.erro ?? 'Não foi possível concluir a operação', dados?.detalhes)
  return dados
}

// O backend troca o token do cookie a cada renovação. Se várias requisições
// receberem 401 ao mesmo tempo, todas precisam aguardar a mesma renovação.
let renovacao = null

function renovarSessao() {
  renovacao ??= enviar('/auth/refresh', { method: 'POST' })
    .then(({ token_acesso, usuario }) => {
      salvarSessao({ token_acesso, usuario })
      return token_acesso
    })
    .catch((erro) => {
      // Falha de rede ou do servidor não encerra a sessão: o cookie continua válido.
      if (erro.status === 401) salvarSessao(null)
      throw erro
    })
    .finally(() => {
      renovacao = null
    })
  return renovacao
}

// Recupera a sessão ao abrir o site. Não espera além do limite para não travar a primeira tela.
export function restaurarSessao() {
  let logado = false
  try {
    logado = localStorage.getItem(CHAVE_LOGADO) === '1'
  } catch {
    // Sem acesso ao localStorage, segue como visitante.
  }
  if (!logado) return Promise.resolve()

  const limite = new Promise((resolve) => setTimeout(resolve, TEMPO_LIMITE_RESTAURAR_MS))
  return Promise.race([renovarSessao().catch(() => {}), limite])
}

export async function api(caminho, opcoes = {}) {
  const { auth = true, ...resto } = opcoes
  const tokenInicial = auth ? sessao?.token_acesso : undefined

  try {
    return await enviar(caminho, { ...resto, token: tokenInicial })
  } catch (erro) {
    if (erro.status !== 401 || !tokenInicial) throw erro
    // Se a sessão acabou, repete sem token: rotas públicas funcionam e as protegidas devolvem o erro certo.
    const novoToken = sessao?.token_acesso !== tokenInicial ? sessao?.token_acesso : await renovarSessao().catch(() => undefined)
    return enviar(caminho, { ...resto, token: novoToken })
  }
}

export const listarContratacoes = async ({ signal } = {}) => {
  const params = { limite: 100, pagina: 1 }
  const primeira = await api('/contratacoes', { params, signal })
  const demais = await Promise.all(
    Array.from({ length: Math.max(0, primeira.paginacao.total_paginas - 1) }, (_, indice) =>
      api('/contratacoes', { params: { ...params, pagina: indice + 2 }, signal }),
    ),
  )
  return [primeira, ...demais].flatMap((resposta) => resposta.dados)
}

export const buscarPreviaTermo = (cuidadorId, { signal } = {}) =>
  api('/contratacoes/termo', { params: { cuidador_id: cuidadorId }, signal })

export const criarContratacao = (cuidadorId) =>
  api('/contratacoes', { method: 'POST', body: { cuidador_id: cuidadorId, aceite_termo: true } })

export const buscarContratacao = (id, { signal } = {}) => api(`/contratacoes/${id}`, { signal })

export const confirmarContratacao = (id) => api(`/contratacoes/${id}/confirmacao`, { method: 'PATCH' })

export const informarRealizacao = (id) => api(`/contratacoes/${id}/realizacao`, { method: 'PATCH' })

export const confirmarRealizacao = (id) => api(`/contratacoes/${id}/confirmacao-realizacao`, { method: 'PATCH' })
