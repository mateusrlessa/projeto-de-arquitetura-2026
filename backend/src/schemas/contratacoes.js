import { z } from 'zod'
import { paginacaoSchema } from './comum.js'

export const STATUS_CONTRATACAO = [
  'AGUARDANDO_CONFIRMACAO_CUIDADOR',
  'CONFIRMADA',
  'AGUARDANDO_CONFIRMACAO_CONTRATANTE',
  'CONCLUIDA',
]

export const criarContratacaoSchema = z.object({
  cuidador_id: z.coerce.number().int().positive(),
  aceite_termo: z.literal(true),
})

export const termoContratacaoSchema = z.object({
  cuidador_id: z.coerce.number().int().positive(),
})

export const filtrosContratacoesSchema = paginacaoSchema.extend({
  status: z.enum(STATUS_CONTRATACAO).optional(),
})
