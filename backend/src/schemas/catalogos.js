import { z } from 'zod'
import { STATUS_REGISTRO, paginacaoSchema, parcial, texto, textoOpcional } from './comum.js'

export const uf = z
  .string()
  .trim()
  .toUpperCase()
  .regex(/^[A-Z]{2}$/, 'UF deve ter 2 letras')

// Estados: a UF e a chave primaria, por isso so o nome pode ser alterado.
export const criarEstadoSchema = z.object({ uf, nome: texto(60) })
export const atualizarEstadoSchema = z.object({ nome: texto(60) })
export const atualizarEstadoParcialSchema = parcial(atualizarEstadoSchema)
export const filtrosEstadosSchema = z.object({ status: z.enum(STATUS_REGISTRO).optional() })

export const cidadeSchema = z.object({
  codigo_ibge: z
    .string()
    .trim()
    .regex(/^[0-9]{7}$/, 'Código IBGE deve ter 7 dígitos'),
  nome: texto(120),
  uf,
})
export const cidadeParcialSchema = parcial(cidadeSchema)
export const filtrosCidadesSchema = paginacaoSchema.extend({
  nome: z.string().trim().min(1).optional(),
  uf: uf.optional(),
  status: z.enum(STATUS_REGISTRO).optional(),
})

export const especializacaoSchema = z.object({
  nome: texto(120),
  descricao: textoOpcional(),
})
export const especializacaoParcialSchema = parcial(especializacaoSchema)
export const filtrosEspecializacoesSchema = filtrosEstadosSchema
