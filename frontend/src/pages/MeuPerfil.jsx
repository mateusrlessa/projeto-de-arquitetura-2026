import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import BuscaCidade from '../components/BuscaCidade.jsx'
import Campo, { estiloInput, estiloTextarea } from '../components/Campo.jsx'
import FotoPerfil from '../components/FotoPerfil.jsx'
import Cartao, { TituloPagina } from '../components/Cartao.jsx'
import {
  Alerta,
  Capelo,
  Check,
  Contato,
  Coracao,
  Fechar,
  Lapis,
  LinkExterno,
  Lixeira,
  Maleta,
  Mais,
  Pessoas,
  Pino,
  Relogio,
  Usuario,
} from '../components/Icones.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import { api } from '../lib/api.js'
import { plural } from '../lib/format.js'
import { useDados } from '../lib/useApi.js'

const TELEFONE = /^\+?[0-9 ()-]{8,20}$/
const ANO_ATUAL = new Date().getFullYear()

// Campos sempre na mesma ordem: a comparação com o que está salvo usa o JSON de cada item.
const paraFormacao = ({ id, nome_curso, nome_instituicao, ano_conclusao }) => ({ id, nome_curso, nome_instituicao, ano_conclusao })
const paraExperiencia = ({ id, cargo, nome_local_trabalho, descricao, ano_inicio, ano_fim }) => ({
  id,
  cargo,
  nome_local_trabalho,
  descricao,
  ano_inicio,
  ano_fim,
})

function paraRascunho(perfil, usuario) {
  return {
    nome_completo: perfil?.nome_completo ?? usuario.nome_completo,
    cpf: '',
    telefone_whatsapp: perfil?.telefone_whatsapp ?? '',
    anos_experiencia: perfil ? String(perfil.anos_experiencia) : '',
    funcao: perfil?.funcao ?? '',
    sobre_mim: perfil?.sobre_mim ?? '',
    formacoes: (perfil?.formacoes ?? []).map(paraFormacao),
    experiencias: (perfil?.experiencias ?? []).map(paraExperiencia),
    cidades: perfil?.cidades ?? [],
    especializacoes: (perfil?.especializacoes ?? []).map((e) => e.id),
  }
}

const camposDoPerfil = (r) => ({
  telefone_whatsapp: r.telefone_whatsapp.trim(),
  anos_experiencia: Number(r.anos_experiencia),
  funcao: r.funcao.trim(),
  sobre_mim: r.sobre_mim.trim() || null,
})

function validar(r, temPerfil) {
  const erros = {}
  if (!r.nome_completo.trim()) erros.nome_completo = 'Informe seu nome completo'
  if (!TELEFONE.test(r.telefone_whatsapp.trim())) erros.telefone_whatsapp = 'Informe um telefone válido, com DDD'
  if (!temPerfil && r.cpf.replace(/\D/g, '').length !== 11) erros.cpf = 'Informe os 11 dígitos do CPF'
  const anos = Number(r.anos_experiencia)
  if (r.anos_experiencia === '' || !Number.isInteger(anos) || anos < 0 || anos > 80) {
    erros.anos_experiencia = 'Informe um número de 0 a 80'
  }
  if (!r.funcao.trim()) erros.funcao = 'Informe sua função'
  return erros
}

// Envia só o que mudou. Itens novos recebem o id real, para não serem criados de novo se outro envio falhar.
async function sincronizarRegistros(caminho, antes, depois) {
  for (const item of antes) {
    if (!depois.some((d) => d.id === item.id)) await api(`${caminho}/${item.id}`, { method: 'DELETE' })
  }
  for (const item of depois) {
    const anterior = antes.find((a) => a.id === item.id)
    const { id, ...corpo } = item
    if (!anterior) item.id = (await api(caminho, { method: 'POST', body: corpo })).id
    else if (JSON.stringify(anterior) !== JSON.stringify(item)) await api(`${caminho}/${id}`, { method: 'PUT', body: corpo })
  }
}

async function sincronizarVinculos(caminho, antes, depois) {
  for (const id of antes) if (!depois.includes(id)) await api(`${caminho}/${id}`, { method: 'DELETE' })
  for (const id of depois) if (!antes.includes(id)) await api(`${caminho}/${id}`, { method: 'PUT' })
}

const idsDasCidades = (cidades) => cidades.map((c) => c.id)

export default function MeuPerfil() {
  const { dados, carregando, erro, recarregar } = useDados('meu-perfil', async (signal) => {
    const [perfil, cidades, especializacoes] = await Promise.all([
      // Cuidador recém-cadastrado ainda não tem perfil: a primeira gravação cria.
      api('/cuidadores/me', { signal }).catch((falha) => {
        if (falha.status === 404) return null
        throw falha
      }),
      api('/cidades', { params: { status: 'ATIVO', limite: 100 }, signal }),
      api('/especializacoes', { params: { status: 'ATIVO' }, signal }),
    ])
    return { perfil, cidades: cidades.dados, especializacoes }
  })

  if (carregando) return <Esqueleto />
  if (erro) {
    return (
      <div role="alert" className="mx-auto max-w-md rounded-2xl border border-borda bg-white px-6 py-12 text-center">
        <span className="mx-auto flex size-12 items-center justify-center rounded-full bg-red-100 text-red-600">
          <Alerta tamanho={22} />
        </span>
        <h1 className="mt-4 font-titulo text-xl font-semibold">Não foi possível carregar seu perfil</h1>
        <p className="mt-2 text-sm text-suave">{erro.message}</p>
        <button onClick={recarregar} className="mt-5 rounded-full bg-marca px-5 py-2 text-sm font-semibold text-white hover:bg-marca-escura">
          Tentar novamente
        </button>
      </div>
    )
  }

  return <Formulario perfilInicial={dados.perfil} cidades={dados.cidades} especializacoes={dados.especializacoes} />
}

function Formulario({ perfilInicial, cidades, especializacoes }) {
  const { usuario, recarregarUsuario } = useAuth()
  const [temPerfil, setTemPerfil] = useState(Boolean(perfilInicial))
  const [salvo, setSalvo] = useState(() => paraRascunho(perfilInicial, usuario))
  const [rascunho, setRascunho] = useState(salvo)
  // Só um item é editado por vez: { tipo, id, campos, erros }.
  const [editor, setEditor] = useState(null)
  const [erros, setErros] = useState({})
  const [erroGeral, setErroGeral] = useState('')
  const [aviso, setAviso] = useState('')
  const [salvando, setSalvando] = useState(false)
  const proximoIdTemporario = useRef(-1)

  const alterado = JSON.stringify(salvo) !== JSON.stringify(rascunho) || Boolean(editor)

  useEffect(() => {
    if (!alterado) return
    const avisarSaida = (e) => e.preventDefault()
    window.addEventListener('beforeunload', avisarSaida)
    return () => window.removeEventListener('beforeunload', avisarSaida)
  }, [alterado])

  useEffect(() => {
    if (!aviso) return
    const espera = setTimeout(() => setAviso(''), 5000)
    return () => clearTimeout(espera)
  }, [aviso])

  function atualizarRascunho(mudancas) {
    setRascunho((r) => ({ ...r, ...mudancas }))
    setErroGeral('')
  }

  const alterarCampo = (campo) => (e) => {
    atualizarRascunho({ [campo]: e.target.value })
    setErros((x) => ({ ...x, [campo]: undefined }))
  }

  function concluirEditor(lista, normalizar, valores) {
    const id = editor.id ?? proximoIdTemporario.current--
    const item = normalizar({ ...valores, id })
    atualizarRascunho({
      [lista]: editor.id === null ? [...rascunho[lista], item] : rascunho[lista].map((i) => (i.id === id ? item : i)),
    })
    setEditor(null)
  }

  async function salvar() {
    if (editor) {
      setErroGeral('Conclua ou cancele a edição aberta antes de salvar.')
      return
    }
    const encontrados = validar(rascunho, temPerfil)
    setErros(encontrados)
    if (Object.keys(encontrados).length) {
      setErroGeral('Confira os campos destacados.')
      return
    }

    setErroGeral('')
    setSalvando(true)
    const atual = structuredClone(rascunho)
    const base = `/cuidadores/${usuario.id}`
    try {
      if (atual.nome_completo.trim() !== salvo.nome_completo) {
        await api(`/usuarios/${usuario.id}`, { method: 'PATCH', body: { nome_completo: atual.nome_completo.trim() } })
      }
      if (!temPerfil) {
        await api('/cuidadores', { method: 'POST', body: { ...camposDoPerfil(atual), cpf: atual.cpf } })
      } else if (JSON.stringify(camposDoPerfil(atual)) !== JSON.stringify(camposDoPerfil(salvo))) {
        await api(base, { method: 'PATCH', body: camposDoPerfil(atual) })
      }
      await sincronizarRegistros(`${base}/formacoes`, salvo.formacoes, atual.formacoes)
      await sincronizarRegistros(`${base}/experiencias`, salvo.experiencias, atual.experiencias)
      await sincronizarVinculos(`${base}/cidades`, idsDasCidades(salvo.cidades), idsDasCidades(atual.cidades))
      await sincronizarVinculos(`${base}/especializacoes`, salvo.especializacoes, atual.especializacoes)

      const novo = paraRascunho(await api('/cuidadores/me'), usuario)
      setTemPerfil(true)
      setSalvo(novo)
      setRascunho(novo)
      setAviso(temPerfil ? 'Perfil atualizado com sucesso!' : 'Perfil criado com sucesso!')
      await recarregarUsuario().catch(() => {})
    } catch (falha) {
      const temErroDeCampo = Object.keys(falha.campos ?? {}).length > 0
      if (temErroDeCampo) setErros(falha.campos)
      setErroGeral(temErroDeCampo ? 'Confira os campos destacados.' : falha.message)
      // Parte do envio pode ter sido gravada: a próxima tentativa compara com o que está no servidor.
      const servidor = await api('/cuidadores/me').catch(() => null)
      if (servidor) {
        setTemPerfil(true)
        setSalvo(paraRascunho(servidor, usuario))
        setRascunho({ ...atual, cpf: '' })
      }
    } finally {
      setSalvando(false)
    }
  }

  const experienciasOrdenadas = [...rascunho.experiencias].sort((a, b) => b.ano_inicio - a.ano_inicio)
  const anos = Number(rascunho.anos_experiencia)

  return (
    <div className="space-y-6 pb-4">
      <TituloPagina icone={Usuario} titulo="Meu perfil">
        Mantenha suas informações atualizadas e apresente seu cuidado às famílias.
      </TituloPagina>

      {aviso && (
        <p
          role="status"
          className="fixed right-4 top-4 z-40 flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700 shadow-lg"
        >
          <Check tamanho={18} /> {aviso}
          <button type="button" onClick={() => setAviso('')} aria-label="Fechar aviso" className="ml-1">
            <Fechar tamanho={16} />
          </button>
        </p>
      )}

      {!temPerfil && (
        <p className="rounded-xl bg-marca-clara px-4 py-3 text-sm text-marca-escura">
          Preencha seus dados e salve para criar seu perfil e aparecer nas buscas das famílias.
        </p>
      )}

      <div className="grid items-start gap-6 lg:grid-cols-[1fr_2fr]">
        <FotoPerfil usuario={usuario} aoAtualizar={recarregarUsuario} aoAvisar={setAviso} />

        <Cartao icone={Contato} titulo="Dados básicos">
          <div className="grid gap-4 sm:grid-cols-[1.4fr_1fr]">
            <Campo rotulo="Nome completo" erro={erros.nome_completo}>
              <input value={rascunho.nome_completo} onChange={alterarCampo('nome_completo')} maxLength={150} autoComplete="name" className={estiloInput(erros.nome_completo)} />
            </Campo>
            <Campo rotulo="WhatsApp" erro={erros.telefone_whatsapp}>
              <input type="tel" value={rascunho.telefone_whatsapp} onChange={alterarCampo('telefone_whatsapp')} maxLength={20} autoComplete="tel" placeholder="(85) 99999-9999" className={estiloInput(erros.telefone_whatsapp)} />
            </Campo>
            {!temPerfil && (
              <Campo rotulo="CPF" erro={erros.cpf}>
                <input value={rascunho.cpf} onChange={alterarCampo('cpf')} inputMode="numeric" maxLength={14} placeholder="000.000.000-00" className={estiloInput(erros.cpf)} />
              </Campo>
            )}
          </div>
          <p className="mt-3 text-xs text-suave">
            As famílias usarão este número para entrar em contato com você.
            {!temPerfil && ' O CPF não aparece no seu perfil público.'}
          </p>
        </Cartao>
      </div>

      <div className="grid items-start gap-6 lg:grid-cols-[1fr_380px]">
        <div className="space-y-6">
          <Cartao icone={Capelo} titulo="Formação e cursos">
            <ul className="space-y-3">
              {rascunho.formacoes.map((f) =>
                editor?.tipo === 'formacao' && editor.id === f.id ? (
                  <li key={f.id}>
                    <EditorFormacao editor={editor} aoAlterar={setEditor} aoCancelar={() => setEditor(null)} aoConcluir={(v) => concluirEditor('formacoes', paraFormacao, v)} />
                  </li>
                ) : (
                  <ItemLista
                    key={f.id}
                    titulo={f.nome_curso}
                    canto={f.ano_conclusao && <span className="rounded-md bg-marca-clara px-2 py-0.5 text-xs font-semibold text-marca">{f.ano_conclusao}</span>}
                    aoEditar={() => setEditor({ tipo: 'formacao', id: f.id, campos: { ...f, ano_conclusao: f.ano_conclusao ?? '' }, erros: {} })}
                    aoRemover={() => atualizarRascunho({ formacoes: rascunho.formacoes.filter((x) => x.id !== f.id) })}
                  >
                    <p className="mt-0.5 text-sm text-suave">{f.nome_instituicao}</p>
                  </ItemLista>
                ),
              )}
            </ul>
            {rascunho.formacoes.length === 0 && editor?.tipo !== 'formacao' && <ListaVazia>Nenhuma formação cadastrada.</ListaVazia>}
            {editor?.tipo === 'formacao' && editor.id === null ? (
              <div className="mt-3">
                <EditorFormacao editor={editor} aoAlterar={setEditor} aoCancelar={() => setEditor(null)} aoConcluir={(v) => concluirEditor('formacoes', paraFormacao, v)} />
              </div>
            ) : (
              <BotaoAdicionar disabled={Boolean(editor)} onClick={() => setEditor({ tipo: 'formacao', id: null, campos: { nome_curso: '', nome_instituicao: '', ano_conclusao: '' }, erros: {} })}>
                Adicionar formação
              </BotaoAdicionar>
            )}
          </Cartao>

          <Cartao icone={Coracao} titulo="Sobre mim">
            <textarea
              rows={5}
              value={rascunho.sobre_mim}
              onChange={alterarCampo('sobre_mim')}
              aria-label="Sobre mim"
              className={estiloTextarea(erros.sobre_mim)}
            />
            {erros.sobre_mim && <p role="alert" className="mt-1.5 text-xs text-red-600">{erros.sobre_mim}</p>}
            <p className="mt-3 text-xs text-suave">Conte às famílias como você cuida e o que valoriza no seu trabalho.</p>
          </Cartao>

          <Cartao icone={Maleta} titulo="Experiências">
            <ul className="space-y-3">
              {experienciasOrdenadas.map((x) =>
                editor?.tipo === 'experiencia' && editor.id === x.id ? (
                  <li key={x.id}>
                    <EditorExperiencia editor={editor} aoAlterar={setEditor} aoCancelar={() => setEditor(null)} aoConcluir={(v) => concluirEditor('experiencias', paraExperiencia, v)} />
                  </li>
                ) : (
                  <ItemLista
                    key={x.id}
                    titulo={x.cargo ?? x.nome_local_trabalho}
                    canto={<span className="whitespace-nowrap text-xs text-suave">{x.ano_inicio} — {x.ano_fim ?? 'atual'}</span>}
                    aoEditar={() => setEditor({ tipo: 'experiencia', id: x.id, campos: { ...x, cargo: x.cargo ?? '', descricao: x.descricao ?? '', ano_fim: x.ano_fim ?? '', atual: x.ano_fim === null }, erros: {} })}
                    aoRemover={() => atualizarRascunho({ experiencias: rascunho.experiencias.filter((i) => i.id !== x.id) })}
                  >
                    {x.cargo && <p className="mt-1 text-sm text-marca">{x.nome_local_trabalho}</p>}
                    {x.descricao && <p className="mt-1.5 text-sm leading-relaxed text-suave">{x.descricao}</p>}
                  </ItemLista>
                ),
              )}
            </ul>
            {rascunho.experiencias.length === 0 && editor?.tipo !== 'experiencia' && <ListaVazia>Nenhuma experiência cadastrada.</ListaVazia>}
            {editor?.tipo === 'experiencia' && editor.id === null ? (
              <div className="mt-3">
                <EditorExperiencia editor={editor} aoAlterar={setEditor} aoCancelar={() => setEditor(null)} aoConcluir={(v) => concluirEditor('experiencias', paraExperiencia, v)} />
              </div>
            ) : (
              <BotaoAdicionar
                disabled={Boolean(editor)}
                onClick={() => setEditor({ tipo: 'experiencia', id: null, campos: { cargo: '', nome_local_trabalho: '', descricao: '', ano_inicio: '', ano_fim: '', atual: false }, erros: {} })}
              >
                Adicionar experiência
              </BotaoAdicionar>
            )}
          </Cartao>
        </div>

        <aside className="space-y-6">
          <Cartao icone={Relogio} titulo="Tempo de experiência">
            <div className="space-y-4">
              <Campo rotulo="Anos de experiência" erro={erros.anos_experiencia}>
                <div className="relative">
                  <input type="number" min={0} max={80} value={rascunho.anos_experiencia} onChange={alterarCampo('anos_experiencia')} className={`${estiloInput(erros.anos_experiencia)} pr-16`} />
                  <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-sm text-suave">{plural(anos, 'ano', 'anos')}</span>
                </div>
              </Campo>
              <Campo rotulo="Função" erro={erros.funcao}>
                <input value={rascunho.funcao} onChange={alterarCampo('funcao')} maxLength={120} placeholder="Ex.: Técnica de enfermagem" className={estiloInput(erros.funcao)} />
              </Campo>
            </div>
            {rascunho.anos_experiencia !== '' && rascunho.funcao.trim() && (
              <p className="mt-3 text-xs text-suave">{anos} {plural(anos, 'ano', 'anos')} como {rascunho.funcao.trim().toLowerCase()}</p>
            )}
          </Cartao>

          <Regioes cidades={cidades} selecionadas={rascunho.cidades} aoAlterar={(lista) => atualizarRascunho({ cidades: lista })} />

          <Especializacoes catalogo={especializacoes} selecionadas={rascunho.especializacoes} aoAlterar={(lista) => atualizarRascunho({ especializacoes: lista })} />
        </aside>
      </div>

      <footer className="border-t border-borda pt-5">
        {erroGeral && (
          <p role="alert" className="mb-4 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700">
            <Alerta tamanho={18} className="mt-0.5 shrink-0" /> {erroGeral}
          </p>
        )}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-suave">
            {alterado ? 'Você tem alterações que ainda não foram salvas.' : 'Essas informações aparecem no seu perfil público.'}
          </p>
          <div className="flex flex-col gap-3 sm:flex-row">
            {temPerfil && (
              <Link
                to={`/cuidadores/${usuario.id}`}
                target="_blank"
                className="inline-flex h-12 items-center justify-center gap-2 rounded-xl border border-marca px-5 text-sm font-semibold text-marca transition hover:bg-marca-clara"
              >
                <LinkExterno tamanho={16} /> Ver meu perfil público
              </Link>
            )}
            <button
              type="button"
              onClick={salvar}
              disabled={salvando}
              className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-marca px-6 text-sm font-semibold text-white transition hover:bg-marca-escura disabled:opacity-70"
            >
              <Check tamanho={16} /> {salvando ? 'Salvando…' : temPerfil ? 'Salvar alterações' : 'Criar meu perfil'}
            </button>
          </div>
        </div>
      </footer>
    </div>
  )
}

function ItemLista({ titulo, canto, aoEditar, aoRemover, children }) {
  return (
    <li className="rounded-xl border border-borda p-4">
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-semibold">{titulo}</p>
        {canto}
      </div>
      {children}
      <div className="mt-2 flex gap-4 text-xs font-medium">
        <button type="button" onClick={aoEditar} aria-label={`Editar ${titulo}`} className="inline-flex items-center gap-1 text-marca hover:text-marca-escura">
          <Lapis tamanho={14} /> Editar
        </button>
        <button type="button" onClick={aoRemover} aria-label={`Remover ${titulo}`} className="inline-flex items-center gap-1 text-red-700 hover:text-red-800">
          <Lixeira tamanho={14} /> Remover
        </button>
      </div>
    </li>
  )
}

const ListaVazia = ({ children }) => <p className="text-sm text-suave">{children}</p>

function BotaoAdicionar({ children, ...props }) {
  return (
    <button
      type="button"
      {...props}
      className="mt-4 inline-flex items-center gap-2 rounded-lg border border-marca px-4 py-2 text-sm font-semibold text-marca transition hover:bg-marca-clara disabled:opacity-50"
    >
      <Mais tamanho={16} /> {children}
    </button>
  )
}

function CaixaEditor({ aoCancelar, rotulo, aoConfirmar, children }) {
  return (
    <div className="space-y-4 rounded-xl border border-marca/50 bg-marca-clara/30 p-4">
      {children}
      <div className="flex justify-end gap-2">
        <button type="button" onClick={aoCancelar} className="rounded-lg px-4 py-2 text-sm font-semibold text-suave hover:text-tinta">
          Cancelar
        </button>
        <button type="button" onClick={aoConfirmar} className="rounded-lg bg-marca px-4 py-2 text-sm font-semibold text-white hover:bg-marca-escura">
          {rotulo}
        </button>
      </div>
    </div>
  )
}

function usarCamposDoEditor(editor, aoAlterar) {
  return (campo) => (e) => {
    const valor = e.target.type === 'checkbox' ? e.target.checked : e.target.value
    aoAlterar({ ...editor, campos: { ...editor.campos, [campo]: valor }, erros: { ...editor.erros, [campo]: undefined } })
  }
}

const anoValido = (valor) => Number.isInteger(Number(valor)) && Number(valor) >= 1900 && Number(valor) <= ANO_ATUAL
const ERRO_ANO = `Use um ano entre 1900 e ${ANO_ATUAL}`

function EditorFormacao({ editor, aoAlterar, aoCancelar, aoConcluir }) {
  const { campos, erros } = editor
  const alterar = usarCamposDoEditor(editor, aoAlterar)

  function concluir() {
    const encontrados = {}
    if (!campos.nome_curso.trim()) encontrados.nome_curso = 'Informe o curso'
    if (!campos.nome_instituicao.trim()) encontrados.nome_instituicao = 'Informe a instituição'
    if (campos.ano_conclusao !== '' && !anoValido(campos.ano_conclusao)) encontrados.ano_conclusao = ERRO_ANO
    if (Object.keys(encontrados).length) {
      aoAlterar({ ...editor, erros: encontrados })
      return
    }
    aoConcluir({
      nome_curso: campos.nome_curso.trim(),
      nome_instituicao: campos.nome_instituicao.trim(),
      ano_conclusao: campos.ano_conclusao === '' ? null : Number(campos.ano_conclusao),
    })
  }

  return (
    <CaixaEditor aoCancelar={aoCancelar} aoConfirmar={concluir} rotulo={editor.id === null ? 'Adicionar' : 'Concluir'}>
      <Campo rotulo="Curso" erro={erros.nome_curso}>
        <input autoFocus value={campos.nome_curso} onChange={alterar('nome_curso')} maxLength={180} className={estiloInput(erros.nome_curso)} />
      </Campo>
      <div className="grid gap-4 sm:grid-cols-[1fr_140px]">
        <Campo rotulo="Instituição" erro={erros.nome_instituicao}>
          <input value={campos.nome_instituicao} onChange={alterar('nome_instituicao')} maxLength={180} className={estiloInput(erros.nome_instituicao)} />
        </Campo>
        <Campo rotulo="Ano de conclusão" erro={erros.ano_conclusao}>
          <input type="number" value={campos.ano_conclusao} onChange={alterar('ano_conclusao')} placeholder="Opcional" className={estiloInput(erros.ano_conclusao)} />
        </Campo>
      </div>
    </CaixaEditor>
  )
}

function EditorExperiencia({ editor, aoAlterar, aoCancelar, aoConcluir }) {
  const { campos, erros } = editor
  const alterar = usarCamposDoEditor(editor, aoAlterar)

  function concluir() {
    const encontrados = {}
    if (!campos.nome_local_trabalho.trim()) encontrados.nome_local_trabalho = 'Informe o local de trabalho'
    if (!anoValido(campos.ano_inicio) || campos.ano_inicio === '') encontrados.ano_inicio = ERRO_ANO
    if (!campos.atual) {
      if (campos.ano_fim === '' || !anoValido(campos.ano_fim)) encontrados.ano_fim = ERRO_ANO
      else if (Number(campos.ano_fim) < Number(campos.ano_inicio)) encontrados.ano_fim = 'Não pode ser antes do início'
    }
    if (Object.keys(encontrados).length) {
      aoAlterar({ ...editor, erros: encontrados })
      return
    }
    aoConcluir({
      cargo: campos.cargo.trim() || null,
      nome_local_trabalho: campos.nome_local_trabalho.trim(),
      descricao: campos.descricao.trim() || null,
      ano_inicio: Number(campos.ano_inicio),
      ano_fim: campos.atual ? null : Number(campos.ano_fim),
    })
  }

  return (
    <CaixaEditor aoCancelar={aoCancelar} aoConfirmar={concluir} rotulo={editor.id === null ? 'Adicionar' : 'Concluir'}>
      <div className="grid gap-4 sm:grid-cols-2">
        <Campo rotulo="Cargo" erro={erros.cargo}>
          <input autoFocus value={campos.cargo} onChange={alterar('cargo')} maxLength={120} placeholder="Ex.: Técnica de enfermagem" className={estiloInput(erros.cargo)} />
        </Campo>
        <Campo rotulo="Local de trabalho" erro={erros.nome_local_trabalho}>
          <input value={campos.nome_local_trabalho} onChange={alterar('nome_local_trabalho')} maxLength={180} className={estiloInput(erros.nome_local_trabalho)} />
        </Campo>
        <Campo rotulo="Ano de início" erro={erros.ano_inicio}>
          <input type="number" value={campos.ano_inicio} onChange={alterar('ano_inicio')} className={estiloInput(erros.ano_inicio)} />
        </Campo>
        <Campo rotulo="Ano de fim" erro={erros.ano_fim}>
          <input type="number" value={campos.atual ? '' : campos.ano_fim} disabled={campos.atual} onChange={alterar('ano_fim')} className={`${estiloInput(erros.ano_fim)} disabled:bg-fundo`} />
        </Campo>
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={campos.atual} onChange={alterar('atual')} className="size-4 accent-marca" /> Trabalho aqui atualmente
      </label>
      <Campo rotulo="Descrição">
        <textarea rows={3} value={campos.descricao} onChange={alterar('descricao')} className={estiloTextarea()} />
      </Campo>
    </CaixaEditor>
  )
}

function Regioes({ cidades, selecionadas, aoAlterar }) {
  const [texto, setTexto] = useState('')
  const disponiveis = cidades.filter((c) => !selecionadas.some((s) => s.id === c.id))

  return (
    <Cartao icone={Pino} titulo="Regiões de atuação">
      <BuscaCidade
        cidades={disponiveis}
        texto={texto}
        aoAlterarTexto={setTexto}
        aoSelecionar={(cidade) => {
          aoAlterar([...selecionadas, { id: cidade.id, nome: cidade.nome, uf: cidade.uf }])
          setTexto('')
        }}
        placeholder="Adicionar cidade"
        id="adicionar-cidade"
      />
      {selecionadas.length > 0 && (
        <ul className="mt-4 flex flex-wrap gap-2">
          {selecionadas.map((c) => (
            <li key={c.id} className="flex items-center gap-1.5 rounded-lg bg-marca-clara px-2.5 py-1.5 text-xs font-medium text-marca-escura">
              {c.nome}
              <button type="button" onClick={() => aoAlterar(selecionadas.filter((s) => s.id !== c.id))} aria-label={`Remover ${c.nome}`} className="hover:text-red-700">
                <Fechar tamanho={13} />
              </button>
            </li>
          ))}
        </ul>
      )}
      <p className="mt-3 text-xs text-suave">Selecione as cidades onde você atende.</p>
    </Cartao>
  )
}

function Especializacoes({ catalogo, selecionadas, aoAlterar }) {
  const alternar = (id) => aoAlterar(selecionadas.includes(id) ? selecionadas.filter((x) => x !== id) : [...selecionadas, id])
  const total = selecionadas.length

  return (
    <Cartao icone={Pessoas} titulo="Especializações / Quem eu cuido">
      <p className="mb-3 text-sm text-suave">Selecione os públicos que você atende.</p>
      <ul className="flex flex-wrap gap-2">
        {catalogo.map((e) => {
          const ativa = selecionadas.includes(e.id)
          return (
            <li key={e.id}>
              <button
                type="button"
                aria-pressed={ativa}
                onClick={() => alternar(e.id)}
                className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition ${
                  ativa ? 'border-marca bg-marca-clara text-marca-escura' : 'border-borda text-suave hover:border-marca/50'
                }`}
              >
                {ativa ? <Check tamanho={14} /> : <Mais tamanho={14} />} {e.nome}
              </button>
            </li>
          )
        })}
      </ul>
      <p className="mt-4 border-t border-borda pt-3 text-xs text-suave">
        {total} {plural(total, 'especialização selecionada', 'especializações selecionadas')}
      </p>
    </Cartao>
  )
}

function Esqueleto() {
  return (
    <div className="space-y-6" aria-busy="true" style={{ animation: 'pulso 1.4s ease-in-out infinite' }}>
      <div className="h-12 w-64 rounded bg-borda" />
      <div className="grid gap-6 lg:grid-cols-[1fr_2fr]">
        <div className="h-44 rounded-2xl bg-borda/70" />
        <div className="h-44 rounded-2xl bg-borda/70" />
      </div>
      <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
        <div className="h-96 rounded-2xl bg-borda/70" />
        <div className="h-96 rounded-2xl bg-borda/70" />
      </div>
    </div>
  )
}
