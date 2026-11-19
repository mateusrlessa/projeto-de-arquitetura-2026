import assert from 'node:assert/strict'
import { before, describe, test } from 'node:test'
import { ADMIN, api, cadastrar, cadastrarCuidadorComPerfil, entrar, query } from './ajudantes.js'

async function contratarEConcluir(contratante, cuidador) {
  const criada = await api('POST', '/contratacoes', {
    token: contratante.token,
    corpo: { cuidador_id: cuidador.usuario.id, aceite_termo: true },
  })
  assert.equal(criada.status, 201)
  const base = `/contratacoes/${criada.corpo.id}`
  assert.equal((await api('PATCH', `${base}/confirmacao`, { token: cuidador.token })).status, 200)
  assert.equal((await api('PATCH', `${base}/realizacao`, { token: cuidador.token })).status, 200)
  assert.equal((await api('PATCH', `${base}/confirmacao-realizacao`, { token: contratante.token })).status, 200)
  return criada.corpo.id
}

// Simula que a avaliação foi enviada há mais tempo que a janela de edição (10 minutos nos testes).
const envelhecer = (id) =>
  query("UPDATE avaliacoes_cuidadores SET criado_em = criado_em - INTERVAL '11 minutes' WHERE id = $1", [id])

describe('avaliações', () => {
  let cuidador
  let base

  before(async () => {
    cuidador = await cadastrarCuidadorComPerfil(1)
    base = `/cuidadores/${cuidador.usuario.id}/avaliacoes`
  })

  test('o perfil do cuidador aparece na busca, sem CPF nem telefone', async () => {
    const lista = await api('GET', '/cuidadores')
    assert.equal(lista.status, 200)
    const item = lista.corpo.dados.find((c) => c.id === cuidador.usuario.id)
    assert.ok(item, 'cuidador listado')
    assert.equal('cpf' in item, false)
    assert.equal('telefone_whatsapp' in item, false)
  })

  test('migração preserva avaliações antigas e remove unicidade incompatível por par', async () => {
    const contratante = await cadastrar('CONTRATANTE')
    const cuidadorMigracao = await cadastrarCuidadorComPerfil(5)
    await query(
      `INSERT INTO avaliacoes_cuidadores (contratante_id, cuidador_id, nota, comentario)
       VALUES ($1, $2, 4, 'Avaliação anterior à migração')`,
      [contratante.usuario.id, cuidadorMigracao.usuario.id],
    )
    await query(
      'CREATE UNIQUE INDEX uq_avaliacoes_contratante_cuidador ON avaliacoes_cuidadores (contratante_id, cuidador_id)',
    )

    const banco = await import('../src/db/index.js')
    await banco.fecharBanco()
    await banco.iniciarBanco()

    const indiceAntigo = await query(
      "SELECT indexname FROM pg_indexes WHERE indexname = 'uq_avaliacoes_contratante_cuidador'",
    )
    assert.equal(indiceAntigo.rows.length, 0)
    const historica = await query(
      `SELECT comentario FROM avaliacoes_cuidadores
       WHERE contratante_id = $1 AND cuidador_id = $2 AND contratacao_id IS NULL`,
      [contratante.usuario.id, cuidadorMigracao.usuario.id],
    )
    assert.equal(historica.rows[0].comentario, 'Avaliação anterior à migração')

    const primeiraContratacao = await contratarEConcluir(contratante, cuidadorMigracao)
    const baseMigracao = `/cuidadores/${cuidadorMigracao.usuario.id}/avaliacoes`
    const primeira = await api('POST', baseMigracao, {
      token: contratante.token,
      corpo: { contratacao_id: primeiraContratacao, nota: 5, comentario: 'Primeiro serviço após migração' },
    })
    assert.equal(primeira.status, 201)

    const segundaContratacao = await contratarEConcluir(contratante, cuidadorMigracao)
    const segunda = await api('POST', baseMigracao, {
      token: contratante.token,
      corpo: { contratacao_id: segundaContratacao, nota: 4, comentario: 'Segundo serviço após migração' },
    })
    assert.equal(segunda.status, 201)
  })

  test('cada avaliação exige contratação concluída, pertence ao contratante e é única por serviço', async () => {
    const outroCuidador = await cadastrarCuidadorComPerfil(2)
    const contratante = await cadastrar('CONTRATANTE')
    const outroContratante = await cadastrar('CONTRATANTE')
    const pendente = await api('POST', '/contratacoes', {
      token: contratante.token,
      corpo: { cuidador_id: cuidador.usuario.id, aceite_termo: true },
    })
    const idConcluida = await contratarEConcluir(contratante, cuidador)

    assert.equal((await api('POST', base, {
      token: cuidador.token,
      corpo: { contratacao_id: idConcluida, nota: 5, comentario: 'Ótima' },
    })).status, 403)
    assert.equal((await api('POST', base, {
      corpo: { contratacao_id: idConcluida, nota: 5, comentario: 'Ótima' },
    })).status, 401)
    assert.equal((await api('POST', base, {
      token: contratante.token,
      corpo: { nota: 5, comentario: 'Sem serviço' },
    })).status, 400)
    assert.equal((await api('POST', base, {
      token: contratante.token,
      corpo: { contratacao_id: pendente.corpo.id, nota: 5, comentario: 'Ainda não terminou' },
    })).status, 409)
    assert.equal((await api('POST', base, {
      token: outroContratante.token,
      corpo: { contratacao_id: idConcluida, nota: 5, comentario: 'De outra pessoa' },
    })).status, 403)
    assert.equal((await api('POST', `/cuidadores/${outroCuidador.usuario.id}/avaliacoes`, {
      token: contratante.token,
      corpo: { contratacao_id: idConcluida, nota: 5, comentario: 'Cuidador diferente' },
    })).status, 400)

    const concorrentes = await Promise.all([
      api('POST', base, {
        token: contratante.token,
        corpo: { contratacao_id: idConcluida, nota: 5, comentario: 'Muito atenciosa' },
      }),
      api('POST', base, {
        token: contratante.token,
        corpo: { contratacao_id: idConcluida, nota: 4, comentario: 'A mesma contratação' },
      }),
    ])
    assert.deepEqual(concorrentes.map((resposta) => resposta.status).sort(), [201, 409])
    const criada = concorrentes.find((resposta) => resposta.status === 201)
    assert.equal(criada.corpo.status, 'PUBLICADA')
    assert.equal(criada.corpo.contratacao_id, idConcluida)

    const outroServico = await contratarEConcluir(contratante, cuidador)
    const segunda = await api('POST', base, {
      token: contratante.token,
      corpo: { contratacao_id: outroServico, nota: 4, comentario: 'Outro serviço' },
    })
    assert.equal(segunda.status, 201)
    assert.notEqual(segunda.corpo.id, criada.corpo.id)

    const minha = await api('GET', `${base}/minha?contratacao_id=${idConcluida}`, { token: contratante.token })
    assert.equal(minha.corpo.id, criada.corpo.id)
    assert.equal((await api('GET', `${base}/minha?contratacao_id=${idConcluida}`, { token: outroContratante.token })).status, 404)

    const detalhes = await api('GET', `/contratacoes/${idConcluida}`, { token: contratante.token })
    assert.equal(detalhes.corpo.avaliacao_id, criada.corpo.id)
    assert.equal(detalhes.corpo.avaliacao_status, 'PUBLICADA')
    const resumo = await api('GET', `${base}/resumo`)
    assert.equal(resumo.corpo.total_avaliacoes, 2)
    assert.equal(resumo.corpo.nota_media, 4.5)

    assert.equal((await api('DELETE', `${base}/${criada.corpo.id}`, { token: contratante.token })).status, 204)
    assert.equal((await api('GET', `${base}/minha?contratacao_id=${idConcluida}`, { token: contratante.token })).corpo.status, 'INATIVA')
    assert.equal((await api('POST', base, {
      token: contratante.token,
      corpo: { contratacao_id: idConcluida, nota: 5, comentario: 'Recriar avaliação' },
    })).status, 409)
  })

  test('avaliações históricas continuam públicas e não impedem avaliar uma contratação nova', async () => {
    const contratante = await cadastrar('CONTRATANTE')
    await query(
      `INSERT INTO avaliacoes_cuidadores (contratante_id, cuidador_id, nota, comentario)
       VALUES ($1, $2, 3, 'Avaliação histórica')`,
      [contratante.usuario.id, cuidador.usuario.id],
    )

    const publica = await api('GET', base)
    assert.equal(publica.corpo.dados.some((avaliacao) => avaliacao.comentario === 'Avaliação histórica'), true)
    const contratacaoId = await contratarEConcluir(contratante, cuidador)
    const nova = await api('POST', base, {
      token: contratante.token,
      corpo: { contratacao_id: contratacaoId, nota: 5, comentario: 'Novo serviço' },
    })
    assert.equal(nova.status, 201)
    assert.equal(nova.corpo.contratacao_id, contratacaoId)

    const banco = await import('../src/db/index.js')
    await banco.fecharBanco()
    await banco.iniciarBanco()
    const preservadas = await banco.query(
      `SELECT contratacao_id, comentario
       FROM avaliacoes_cuidadores
       WHERE contratante_id = $1 AND cuidador_id = $2
       ORDER BY id`,
      [contratante.usuario.id, cuidador.usuario.id],
    )
    assert.deepEqual(
      preservadas.rows.map(({ contratacao_id: id, comentario }) => ({ id, comentario })),
      [
        { id: null, comentario: 'Avaliação histórica' },
        { id: contratacaoId, comentario: 'Novo serviço' },
      ],
    )
  })

  test('o autor edita dentro do prazo e perde a edição depois dele', async () => {
    const contratante = await cadastrar('CONTRATANTE')
    const contratacaoId = await contratarEConcluir(contratante, cuidador)
    const { corpo: avaliacao } = await api('POST', base, {
      token: contratante.token,
      corpo: { contratacao_id: contratacaoId, nota: 3, comentario: 'Boa' },
    })

    const editada = await api('PATCH', `${base}/${avaliacao.id}`, { token: contratante.token, corpo: { nota: 4 } })
    assert.equal(editada.status, 200)
    assert.equal(editada.corpo.nota, 4)

    await envelhecer(avaliacao.id)
    const tarde = await api('PATCH', `${base}/${avaliacao.id}`, { token: contratante.token, corpo: { nota: 1 } })
    assert.equal(tarde.status, 403)
    assert.equal((await api('DELETE', `${base}/${avaliacao.id}`, { token: contratante.token })).status, 403)
  })

  test('outra pessoa não edita a avaliação', async () => {
    const autor = await cadastrar('CONTRATANTE')
    const outro = await cadastrar('CONTRATANTE')
    const contratacaoId = await contratarEConcluir(autor, cuidador)
    const { corpo: avaliacao } = await api('POST', base, {
      token: autor.token,
      corpo: { contratacao_id: contratacaoId, nota: 2, comentario: 'Regular' },
    })
    const resposta = await api('PATCH', `${base}/${avaliacao.id}`, { token: outro.token, corpo: { nota: 5 } })
    assert.equal(resposta.status, 403)
  })

  test('cuidador pode responder, editar e reativar resposta; ADMIN pode moderar o status', async () => {
    const autor = await cadastrar('CONTRATANTE')
    const contratacaoId = await contratarEConcluir(autor, cuidador)
    const { corpo: avaliacao } = await api('POST', base, {
      token: autor.token,
      corpo: { contratacao_id: contratacaoId, nota: 5, comentario: 'Ótimo atendimento' },
    })
    const caminho = `/avaliacoes/${avaliacao.id}/resposta`

    const criada = await api('POST', caminho, { token: cuidador.token, corpo: { resposta: 'Muito obrigada!' } })
    assert.equal(criada.status, 201)
    assert.equal(criada.corpo.status, 'ATIVO')

    const publicada = await api('GET', base)
    assert.equal(
      publicada.corpo.dados.find((item) => item.id === avaliacao.id).resposta.resposta,
      'Muito obrigada!',
    )
    assert.equal((await api('PATCH', `${base}/${avaliacao.id}`, {
      token: autor.token,
      corpo: { comentario: 'Editar após resposta' },
    })).status, 403)

    const editada = await api('PATCH', caminho, { token: cuidador.token, corpo: { resposta: 'Agradecemos!' } })
    assert.equal(editada.status, 200)
    assert.equal(editada.corpo.resposta, 'Agradecemos!')
    assert.equal((await api('DELETE', caminho, { token: cuidador.token })).corpo.status, 'INATIVO')
    assert.equal((await api('GET', base)).corpo.dados.find((item) => item.id === avaliacao.id).resposta, null)
    assert.equal((await api('POST', caminho, { token: cuidador.token, corpo: { resposta: 'Nova resposta' } })).status, 409)

    const reativada = await api('PUT', caminho, { token: cuidador.token, corpo: { resposta: 'Resposta revisada' } })
    assert.equal(reativada.status, 200)
    assert.equal(reativada.corpo.status, 'ATIVO')
    assert.equal(reativada.corpo.resposta, 'Resposta revisada')

    const admin = await entrar(ADMIN.email, ADMIN.senha)
    const moderada = await api('PATCH', `${caminho}/status`, {
      token: admin.token,
      corpo: { status: 'INATIVO' },
    })
    assert.equal(moderada.status, 200)
    assert.equal(moderada.corpo.status, 'INATIVO')
    assert.equal((await api('GET', base)).corpo.dados.find((item) => item.id === avaliacao.id).resposta, null)
  })
})

describe('denúncia e moderação', () => {
  test('denúncia vai para a fila do admin, que oculta o comentário', async () => {
    const cuidador = await cadastrarCuidadorComPerfil(3)
    const base = `/cuidadores/${cuidador.usuario.id}/avaliacoes`
    const autor = await cadastrar('CONTRATANTE')
    const denunciante = await cadastrar('CONTRATANTE')
    const admin = await entrar(ADMIN.email, ADMIN.senha)
    const contratacaoId = await contratarEConcluir(autor, cuidador)

    const { corpo: avaliacao } = await api('POST', base, {
      token: autor.token,
      corpo: { contratacao_id: contratacaoId, nota: 1, comentario: 'Comentário ofensivo' },
    })
    const caminhoDenuncia = `/avaliacoes/${avaliacao.id}/denuncias`

    assert.equal((await api('POST', caminhoDenuncia, { token: autor.token, corpo: { motivo: 'OFENSIVO' } })).status, 403)
    assert.equal((await api('POST', caminhoDenuncia, { token: admin.token, corpo: { motivo: 'OFENSIVO' } })).status, 403)

    const denuncia = await api('POST', caminhoDenuncia, { token: denunciante.token, corpo: { motivo: 'OFENSIVO', detalhe: 'Xingamento' } })
    assert.equal(denuncia.status, 201)
    assert.equal((await api('POST', caminhoDenuncia, { token: denunciante.token, corpo: { motivo: 'SPAM' } })).status, 409)
    assert.equal((await api('POST', caminhoDenuncia, { token: cuidador.token, corpo: { motivo: 'FALSO' } })).status, 201)

    assert.equal((await api('GET', '/moderacao/avaliacoes', { token: denunciante.token })).status, 403)

    const fila = await api('GET', '/moderacao/avaliacoes', { token: admin.token })
    const item = fila.corpo.dados.find((a) => a.id === avaliacao.id)
    assert.equal(item.total_denuncias, 2)
    assert.equal((await api('GET', '/moderacao/resumo', { token: admin.token })).corpo.denunciadas, 1)

    const decisao = await api('POST', `/moderacao/avaliacoes/${avaliacao.id}/decisao`, {
      token: admin.token,
      corpo: { decisao: 'OCULTAR' },
    })
    assert.equal(decisao.status, 200)
    assert.equal(decisao.corpo.denuncias_resolvidas, 2)

    const publicas = await api('GET', base)
    assert.equal(publicas.corpo.dados.some((a) => a.id === avaliacao.id), false)
    assert.equal((await api('GET', '/moderacao/resumo', { token: admin.token })).corpo.ocultas, 1)
    assert.equal((await api('POST', base, {
      token: autor.token,
      corpo: { contratacao_id: contratacaoId, nota: 1, comentario: 'De novo' },
    })).status, 409)

    const restaurada = await api('PATCH', `/avaliacoes/${avaliacao.id}/status`, {
      token: admin.token,
      corpo: { status: 'PUBLICADA' },
    })
    assert.equal(restaurada.status, 200)
    assert.equal((await api('GET', base)).corpo.dados.some((a) => a.id === avaliacao.id), true)
  })

  test('a exclusão administrativa mantém reservada a avaliação do serviço', async () => {
    const cuidador = await cadastrarCuidadorComPerfil(4)
    const contratante = await cadastrar('CONTRATANTE')
    const contratacaoId = await contratarEConcluir(contratante, cuidador)
    const caminho = `/cuidadores/${cuidador.usuario.id}/avaliacoes`
    const criada = await api('POST', caminho, {
      token: contratante.token,
      corpo: { contratacao_id: contratacaoId, nota: 5, comentario: 'Bom serviço' },
    })
    const admin = await entrar(ADMIN.email, ADMIN.senha)

    assert.equal((await api('DELETE', `/moderacao/avaliacoes/${criada.corpo.id}`, { token: admin.token })).status, 204)
    assert.equal((await api('POST', caminho, {
      token: contratante.token,
      corpo: { contratacao_id: contratacaoId, nota: 4, comentario: 'Outra avaliação' },
    })).status, 409)
  })
})
