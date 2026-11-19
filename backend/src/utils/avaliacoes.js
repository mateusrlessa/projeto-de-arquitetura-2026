import { queryUm } from '../db/index.js'

// Exclusão definitiva de um comentário. A resposta do cuidador sai no mesmo comando, porque a chave
// estrangeira dela não deixa apagar a avaliação antes; as denúncias saem em cascata.
// Retorna false se a avaliação não existe.
export async function apagarAvaliacao(id) {
  const { apagadas } = await queryUm(
    `WITH resposta AS (DELETE FROM respostas_avaliacoes WHERE avaliacao_id = $1),
     avaliacao AS (DELETE FROM avaliacoes_cuidadores WHERE id = $1 RETURNING id)
     SELECT COUNT(*)::int AS apagadas FROM avaliacao`,
    [id],
  )
  return apagadas > 0
}
