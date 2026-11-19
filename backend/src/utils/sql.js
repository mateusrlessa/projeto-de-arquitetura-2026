import { query } from '../db/index.js'
import { AppError } from './erros.js'

// Converte um parametro de rota em id inteiro positivo.
export function idParam(valor, nome = 'id') {
  const id = Number(valor)
  if (!Number.isSafeInteger(id) || id <= 0) {
    throw new AppError(400, `Parâmetro ${nome} inválido`)
  }
  return id
}

// Monta e executa um UPDATE apenas com os campos informados.
// As chaves de `dados` vem sempre de um schema zod, nunca direto do cliente.
export async function atualizar(tabela, dados, where, retorno = '*') {
  const campos = Object.entries(dados).filter(([, v]) => v !== undefined)
  if (campos.length === 0) throw new AppError(400, 'Nenhum campo para atualizar')

  const params = campos.map(([, v]) => v)
  const sets = campos.map(([coluna], i) => `${coluna} = $${i + 1}`)
  const condicoes = Object.keys(where).map((coluna, i) => `${coluna} = $${params.length + i + 1}`)
  params.push(...Object.values(where))

  const { rows } = await query(
    `UPDATE ${tabela} SET ${sets.join(', ')}, atualizado_em = CURRENT_TIMESTAMP
     WHERE ${condicoes.join(' AND ')} RETURNING ${retorno}`,
    params,
  )
  return rows[0] ?? null
}

// Monta a resposta paginada padrao das listagens.
export function paginado(dados, total, { pagina, limite }) {
  return {
    dados,
    paginacao: { pagina, limite, total, total_paginas: Math.ceil(total / limite) },
  }
}
