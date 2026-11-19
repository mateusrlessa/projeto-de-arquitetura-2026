import { z } from 'zod'
import { paginacaoSchema } from './comum.js'

export const MOTIVOS_DENUNCIA = ['OFENSIVO', 'SPAM', 'FALSO', 'DADOS_PESSOAIS', 'OUTRO']

export const denunciaSchema = z.object({
  motivo: z.enum(MOTIVOS_DENUNCIA),
  detalhe: z.string().trim().max(300).optional(),
})

export const decisaoSchema = z.object({ decisao: z.enum(['OCULTAR', 'MANTER']) })

export const filtrosModeracaoSchema = paginacaoSchema.extend({
  situacao: z.enum(['DENUNCIADAS', 'OCULTAS']).default('DENUNCIADAS'),
})
