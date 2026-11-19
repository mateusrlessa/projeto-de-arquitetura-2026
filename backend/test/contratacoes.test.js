import assert from 'node:assert/strict'
import { describe, test } from 'node:test'
import { api, cadastrar, cadastrarCuidadorComPerfil } from './ajudantes.js'

describe('contratações', () => {
  test('cria uma contratação independente e gera o termo com nomes do banco', async () => {
    const contratante = await cadastrar('CONTRATANTE', { nome: 'Família CuidaAqui' })
    const cuidador = await cadastrarCuidadorComPerfil()

    const previa = await api('GET', `/contratacoes/termo?cuidador_id=${cuidador.usuario.id}`, {
      token: contratante.token,
    })
    assert.equal(previa.status, 200)
    assert.match(previa.corpo.termo_conteudo, /CONTRATANTE: Família CuidaAqui/)
    assert.match(previa.corpo.termo_conteudo, /CUIDADOR\(A\): Cuida Dora/)
    assert.equal(previa.corpo.termo_versao, '1.0')

    const semLogin = await api('POST', '/contratacoes', {
      corpo: { cuidador_id: cuidador.usuario.id, aceite_termo: true },
    })
    assert.equal(semLogin.status, 401)

    const porCuidador = await api('POST', '/contratacoes', {
      token: cuidador.token,
      corpo: { cuidador_id: cuidador.usuario.id, aceite_termo: true },
    })
    assert.equal(porCuidador.status, 403)
    assert.equal((await api('GET', `/contratacoes/termo?cuidador_id=${cuidador.usuario.id}`, { token: cuidador.token })).status, 403)

    const paraSiMesmo = await api('POST', '/contratacoes', {
      token: contratante.token,
      corpo: { cuidador_id: contratante.usuario.id, aceite_termo: true },
    })
    assert.equal(paraSiMesmo.status, 404)

    const semAceite = await api('POST', '/contratacoes', {
      token: contratante.token,
      corpo: { cuidador_id: cuidador.usuario.id, aceite_termo: false },
    })
    assert.equal(semAceite.status, 400)

    const criada = await api('POST', '/contratacoes', {
      token: contratante.token,
      corpo: {
        cuidador_id: cuidador.usuario.id,
        aceite_termo: true,
        contratante_nome: 'Nome forjado',
      },
    })
    assert.equal(criada.status, 201)
    assert.equal(criada.corpo.contratante_id, contratante.usuario.id)
    assert.equal(criada.corpo.cuidador_id, cuidador.usuario.id)
    assert.equal(criada.corpo.status, 'AGUARDANDO_CONFIRMACAO_CUIDADOR')
    assert.ok(criada.corpo.contratante_confirmado_em)
    assert.equal(criada.corpo.cuidador_confirmado_em, null)
    assert.equal(criada.corpo.termo_versao, '1.0')
    const geradoEm = new Date(criada.corpo.termo_gerado_em).toISOString()
    assert.equal(new Date(criada.corpo.contratante_confirmado_em).toISOString(), geradoEm)
    assert.ok(criada.corpo.termo_conteudo.includes(geradoEm))
    assert.match(criada.corpo.termo_conteudo, /CONTRATANTE: Família CuidaAqui/)
    assert.match(criada.corpo.termo_conteudo, /CUIDADOR\(A\): Cuida Dora/)
    assert.doesNotMatch(criada.corpo.termo_conteudo, /Nome forjado/)
    assert.match(criada.corpo.termo_conteudo, /fora da plataforma CuidaAqui/)

    const repetida = await api('POST', '/contratacoes', {
      token: contratante.token,
      corpo: { cuidador_id: cuidador.usuario.id, aceite_termo: true },
    })
    assert.equal(repetida.status, 201)
    assert.notEqual(repetida.corpo.id, criada.corpo.id)

    const detalhes = await api('GET', `/contratacoes/${criada.corpo.id}`, { token: cuidador.token })
    assert.equal(detalhes.status, 200)
    assert.equal(detalhes.corpo.termo_conteudo, criada.corpo.termo_conteudo)

    const cuidadorInexistente = await api('POST', '/contratacoes', {
      token: contratante.token,
      corpo: { cuidador_id: 999999, aceite_termo: true },
    })
    assert.equal(cuidadorInexistente.status, 404)

  })

  test('lista somente serviços do participante e aplica filtros de status', async () => {
    const contratante = await cadastrar('CONTRATANTE')
    const terceiro = await cadastrar('CONTRATANTE')
    const cuidador = await cadastrarCuidadorComPerfil()
    const outroCuidador = await cadastrarCuidadorComPerfil()

    const criada = await api('POST', '/contratacoes', {
      token: contratante.token,
      corpo: { cuidador_id: cuidador.usuario.id, aceite_termo: true },
    })
    assert.equal(criada.status, 201)
    const deOutroParticipante = await api('POST', '/contratacoes', {
      token: terceiro.token,
      corpo: { cuidador_id: outroCuidador.usuario.id, aceite_termo: true },
    })
    assert.equal(deOutroParticipante.status, 201)

    const listaContratante = await api('GET', '/contratacoes', { token: contratante.token })
    assert.equal(listaContratante.status, 200)
    assert.deepEqual(listaContratante.corpo.dados.map((x) => x.id), [criada.corpo.id])

    const listaCuidador = await api('GET', '/contratacoes', { token: cuidador.token })
    assert.deepEqual(listaCuidador.corpo.dados.map((x) => x.id), [criada.corpo.id])

    const listaTerceiro = await api('GET', '/contratacoes', { token: terceiro.token })
    assert.deepEqual(listaTerceiro.corpo.dados.map((x) => x.id), [deOutroParticipante.corpo.id])
    const listaOutroCuidador = await api('GET', '/contratacoes', { token: outroCuidador.token })
    assert.deepEqual(listaOutroCuidador.corpo.dados.map((x) => x.id), [deOutroParticipante.corpo.id])
    assert.equal((await api('GET', `/contratacoes/${criada.corpo.id}`, { token: terceiro.token })).status, 404)
    assert.equal((await api('GET', `/contratacoes/${criada.corpo.id}`, { token: outroCuidador.token })).status, 404)

    const filtrada = await api('GET', '/contratacoes?status=CONCLUIDA', { token: contratante.token })
    assert.deepEqual(filtrada.corpo.dados, [])
    assert.equal((await api('GET', '/contratacoes?status=INVALIDO', { token: contratante.token })).status, 400)
  })

  test('só permite as transições na ordem e pelos participantes corretos', async () => {
    const contratante = await cadastrar('CONTRATANTE')
    const outroContratante = await cadastrar('CONTRATANTE')
    const cuidador = await cadastrarCuidadorComPerfil()
    const outroCuidador = await cadastrarCuidadorComPerfil()
    const criada = await api('POST', '/contratacoes', {
      token: contratante.token,
      corpo: { cuidador_id: cuidador.usuario.id, aceite_termo: true },
    })
    const base = `/contratacoes/${criada.corpo.id}`

    assert.equal((await api('PATCH', `${base}/confirmacao`, { token: contratante.token })).status, 403)
    assert.equal((await api('PATCH', `${base}/confirmacao`, { token: outroCuidador.token })).status, 404)
    assert.equal((await api('PATCH', `${base}/realizacao`, { token: cuidador.token })).status, 409)
    assert.equal((await api('PATCH', `${base}/confirmacao-realizacao`, { token: contratante.token })).status, 409)

    const concorrentes = await Promise.all([
      api('PATCH', `${base}/confirmacao`, { token: cuidador.token }),
      api('PATCH', `${base}/confirmacao`, { token: cuidador.token }),
    ])
    assert.deepEqual(concorrentes.map((x) => x.status).sort(), [200, 409])
    const confirmada = concorrentes.find((x) => x.status === 200)
    assert.equal(confirmada.status, 200)
    assert.equal(confirmada.corpo.status, 'CONFIRMADA')
    assert.ok(confirmada.corpo.cuidador_confirmado_em)
    assert.equal((await api('PATCH', `${base}/confirmacao`, { token: cuidador.token })).status, 409)

    assert.equal((await api('PATCH', `${base}/realizacao`, { token: outroCuidador.token })).status, 404)
    assert.equal((await api('PATCH', `${base}/realizacao`, { token: outroContratante.token })).status, 403)

    const realizada = await api('PATCH', `${base}/realizacao`, { token: cuidador.token })
    assert.equal(realizada.status, 200)
    assert.equal(realizada.corpo.status, 'AGUARDANDO_CONFIRMACAO_CONTRATANTE')
    assert.ok(realizada.corpo.cuidador_informou_realizacao_em)
    assert.equal((await api('PATCH', `${base}/realizacao`, { token: cuidador.token })).status, 409)
    assert.equal((await api('PATCH', `${base}/confirmacao-realizacao`, { token: outroContratante.token })).status, 404)

    const concluida = await api('PATCH', `${base}/confirmacao-realizacao`, { token: contratante.token })
    assert.equal(concluida.status, 200)
    assert.equal(concluida.corpo.status, 'CONCLUIDA')
    assert.ok(concluida.corpo.contratante_confirmou_realizacao_em)
    assert.equal((await api('PATCH', `${base}/confirmacao-realizacao`, { token: contratante.token })).status, 409)
  })

  test('a migração pode ser reexecutada sem apagar contratações', async () => {
    const contratante = await cadastrar('CONTRATANTE')
    const cuidador = await cadastrarCuidadorComPerfil()
    const criada = await api('POST', '/contratacoes', {
      token: contratante.token,
      corpo: { cuidador_id: cuidador.usuario.id, aceite_termo: true },
    })
    const banco = await import('../src/db/index.js')

    await banco.fecharBanco()
    await banco.iniciarBanco()

    const preservada = await banco.queryUm('SELECT termo_conteudo, status FROM contratacoes WHERE id = $1', [
      criada.corpo.id,
    ])
    assert.equal(preservada.status, 'AGUARDANDO_CONFIRMACAO_CUIDADOR')
    assert.equal(preservada.termo_conteudo, criada.corpo.termo_conteudo)
  })
})
