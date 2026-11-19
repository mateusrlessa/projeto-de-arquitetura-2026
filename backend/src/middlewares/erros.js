import multer from 'multer'
import { ZodError } from 'zod'
import { AppError } from '../utils/erros.js'

// Mensagens para as constraints do banco que o cliente pode violar.
const MENSAGENS_CONSTRAINTS = {
  uq_usuarios_email: 'E-mail já cadastrado',
  estados_pkey: 'Já existe um estado com essa UF',
  estados_nome_key: 'Já existe um estado com esse nome',
  cidades_codigo_ibge_key: 'Já existe uma cidade com esse código IBGE',
  uq_cidades_nome_uf: 'Já existe uma cidade com esse nome nessa UF',
  especializacoes_nome_key: 'Já existe uma especialização com esse nome',
  perfis_cuidadores_pkey: 'Esse usuário já possui perfil de cuidador',
  perfis_cuidadores_cpf_key: 'CPF já cadastrado',
  respostas_avaliacoes_avaliacao_id_key: 'Essa avaliação já possui resposta',
  uq_avaliacoes_legadas_contratante_cuidador: 'Você já avaliou este cuidador',
  uq_avaliacoes_contratacao: 'Esta contratação já possui uma avaliação',
  fk_cidades_estados: 'UF não cadastrada',
  chk_estados_uf: 'UF deve ter 2 letras maiúsculas',
  chk_cidades_codigo_ibge: 'Código IBGE deve ter 7 dígitos',
  chk_cuidadores_cpf: 'CPF deve ter 11 dígitos',
  chk_cuidadores_anos_experiencia: 'Anos de experiência não pode ser negativo',
  chk_experiencias_periodo: 'Ano de fim deve ser maior ou igual ao ano de início',
  chk_avaliacoes_nota: 'Nota deve estar entre 1 e 5',
  chk_avaliacoes_autoria: 'O cuidador não pode avaliar a si mesmo',
}

// Codigos de erro do PostgreSQL -> status HTTP.
const STATUS_PG = {
  23505: 409, // unique_violation
  23503: 400, // foreign_key_violation
  23514: 400, // check_violation
  '22P02': 400, // invalid_text_representation
  22001: 400, // string_data_right_truncation
  22003: 400, // numeric_value_out_of_range
}

export function rotaNaoEncontrada(req, res) {
  res.status(404).json({ erro: `Rota ${req.method} ${req.path} não encontrada` })
}

// eslint-disable-next-line no-unused-vars
export function tratarErros(err, req, res, next) {
  if (err instanceof AppError) {
    return res.status(err.status).json({ erro: err.message, detalhes: err.detalhes })
  }

  if (err instanceof ZodError) {
    return res.status(400).json({
      erro: 'Dados inválidos',
      detalhes: err.issues.map((i) => ({ campo: i.path.join('.') || null, mensagem: i.message })),
    })
  }

  if (err instanceof multer.MulterError) {
    const mensagem = err.code === 'LIMIT_FILE_SIZE' ? 'Arquivo maior que 5 MB' : err.message
    return res.status(400).json({ erro: mensagem })
  }

  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ erro: 'JSON inválido no corpo da requisição' })
  }

  if (STATUS_PG[err.code]) {
    return res.status(STATUS_PG[err.code]).json({
      erro: MENSAGENS_CONSTRAINTS[err.constraint] || err.message,
    })
  }

  console.error(err)
  res.status(500).json({ erro: 'Erro interno do servidor' })
}
