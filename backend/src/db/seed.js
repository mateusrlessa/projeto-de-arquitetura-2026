import { garantirAdmin } from './admin.js'
import { fecharBanco, iniciarBanco, query, queryUm } from './index.js'
import { gerarHashSenha } from '../utils/usuarios.js'

const ESTADOS = [
  ['AC', 'Acre'],
  ['AL', 'Alagoas'],
  ['AP', 'Amapá'],
  ['AM', 'Amazonas'],
  ['BA', 'Bahia'],
  ['CE', 'Ceará'],
  ['DF', 'Distrito Federal'],
  ['ES', 'Espírito Santo'],
  ['GO', 'Goiás'],
  ['MA', 'Maranhão'],
  ['MT', 'Mato Grosso'],
  ['MS', 'Mato Grosso do Sul'],
  ['MG', 'Minas Gerais'],
  ['PA', 'Pará'],
  ['PB', 'Paraíba'],
  ['PR', 'Paraná'],
  ['PE', 'Pernambuco'],
  ['PI', 'Piauí'],
  ['RJ', 'Rio de Janeiro'],
  ['RN', 'Rio Grande do Norte'],
  ['RS', 'Rio Grande do Sul'],
  ['RO', 'Rondônia'],
  ['RR', 'Roraima'],
  ['SC', 'Santa Catarina'],
  ['SP', 'São Paulo'],
  ['SE', 'Sergipe'],
  ['TO', 'Tocantins'],
]

const CIDADES = [
  ['1200401', 'Rio Branco', 'AC'],
  ['2704302', 'Maceió', 'AL'],
  ['1600303', 'Macapá', 'AP'],
  ['1302603', 'Manaus', 'AM'],
  ['2927408', 'Salvador', 'BA'],
  ['2304400', 'Fortaleza', 'CE'],
  ['5300108', 'Brasília', 'DF'],
  ['3205309', 'Vitória', 'ES'],
  ['5208707', 'Goiânia', 'GO'],
  ['2111300', 'São Luís', 'MA'],
  ['5103403', 'Cuiabá', 'MT'],
  ['5002704', 'Campo Grande', 'MS'],
  ['3106200', 'Belo Horizonte', 'MG'],
  ['1501402', 'Belém', 'PA'],
  ['2507507', 'João Pessoa', 'PB'],
  ['4106902', 'Curitiba', 'PR'],
  ['2611606', 'Recife', 'PE'],
  ['2211001', 'Teresina', 'PI'],
  ['3304557', 'Rio de Janeiro', 'RJ'],
  ['2408102', 'Natal', 'RN'],
  ['4314902', 'Porto Alegre', 'RS'],
  ['1100205', 'Porto Velho', 'RO'],
  ['1400100', 'Boa Vista', 'RR'],
  ['4205407', 'Florianópolis', 'SC'],
  ['3550308', 'São Paulo', 'SP'],
  ['2800308', 'Aracaju', 'SE'],
  ['1721000', 'Palmas', 'TO'],
]

const CIDADES_CEARA = [
  ['2303709', 'Caucaia', 'CE'],
  ['2303931', 'Chorozinho', 'CE'],
  ['2304285', 'Eusébio', 'CE'],
  ['2312908', 'Sobral', 'CE'],
  ['2307304', 'Juazeiro do Norte', 'CE'],
]

const ESPECIALIZACOES = [
  ['Cuidados com idosos', 'Acompanhamento e auxílio nas atividades diárias de pessoas idosas.'],
  ['Alzheimer e demências', 'Cuidado de pessoas com Alzheimer e outras demências.'],
  ['Pós-operatório', 'Acompanhamento na recuperação após cirurgias.'],
  ['Cuidados paliativos', 'Conforto e qualidade de vida para pacientes em tratamento paliativo.'],
  ['Crianças', 'Acompanhamento seguro e afetivo de crianças em casa.'],
  ['PCD', 'Cuidados para pessoas com deficiência, respeitando autonomia e dignidade.'],
  ['Acamados', 'Assistência e prevenção de complicações para pessoas acamadas.'],
  ['Mobilidade reduzida', 'Apoio em deslocamentos, higiene, alimentação e atividades do dia a dia.'],
]

const NOMES = [
  'Ana Paula Souza', 'Carlos Eduardo Lima', 'Mariana Oliveira', 'João Ferreira',
  'Beatriz Santos', 'Rafael Almeida', 'Camila Rocha', 'Lucas Martins',
  'Juliana Pereira', 'André Costa', 'Fernanda Ribeiro', 'Ricardo Nunes',
  'Patrícia Gomes', 'Bruno Carvalho', 'Larissa Mendes', 'Eduardo Barbosa',
  'Amanda Araújo', 'Thiago Castro', 'Renata Dias', 'Felipe Monteiro',
  'Aline Cardoso', 'Rodrigo Teixeira', 'Tatiana Ramos', 'Marcelo Azevedo',
  'Vanessa Freitas', 'Paulo Henrique Nogueira', 'Bianca Torres',
]

const FUNCOES = [
  'Técnica de Enfermagem', 'Enfermeiro', 'Cuidadora de idosos',
  'Cuidador domiciliar', 'Babá e cuidadora infantil', 'Técnico em enfermagem',
  'Cuidadora PCD', 'Auxiliar de enfermagem', 'Cuidadora paliativa',
]

const TELEFONE = '(85) 98415-1191'

const CONTRATANTES_DEMO = [
  'Helena Vasconcelos', 'Otávio Queiroz', 'Sandra Moreira', 'Gustavo Pacheco',
  'Lívia Cavalcante', 'Roberto Siqueira', 'Cláudia Bezerra', 'Henrique Tavares',
]

const AVALIACOES_DEMO = [
  [5, 'Atendimento atencioso do início ao fim. Minha mãe se sentiu segura e criou um vínculo muito bonito com a pessoa que cuidou dela.'],
  [5, 'Muita pontualidade, organização e carinho no dia a dia. Recomendo para quem precisa de cuidado em casa.'],
  [4, 'Muito cuidado com a rotina e os horários dos remédios. A comunicação com a família poderia ser um pouco mais frequente.'],
  [5, 'Trouxe tranquilidade para toda a família durante a recuperação do meu pai. Sempre nos manteve informados.'],
  [3, 'Bom atendimento no dia a dia, mas tivemos alguns atrasos nas primeiras semanas. Depois a rotina melhorou.'],
  [5, 'Paciência e respeito com meu avô em todos os momentos. Fez diferença real na nossa casa.'],
  [4, 'Experiência muito boa. Ajudou com a alimentação e a mobilidade, sempre explicando o que estava fazendo.'],
  [2, 'O cuidado foi correto, mas houve desencontro de horários e precisamos reorganizar a rotina algumas vezes.'],
  [5, 'Muita responsabilidade e gentileza. Seguiu todas as orientações médicas e deixou tudo registrado para a família.'],
  [4, 'Atendimento humano e dedicado. Voltaríamos a contratar quando precisarmos.'],
]

function gerarCpf(indice) {
  const base = String(500000000 + indice).slice(-9)
  const calcularDigito = (digitos, pesoInicial) => {
    const soma = [...digitos].reduce((total, digito, posicao) => total + Number(digito) * (pesoInicial - posicao), 0)
    const resto = (soma * 10) % 11
    return resto === 10 ? 0 : resto
  }
  const digito1 = calcularDigito(base, 10)
  const digito2 = calcularDigito(base + digito1, 11)
  return base + String(digito1) + String(digito2)
}

// Dados de exemplo dos catalogos. Pode ser executado mais de uma vez.
await iniciarBanco()
await garantirAdmin()

// Remove somente cuidadores e dados dependentes criados por este seed.
// Isso permite corrigir um seed anterior e evita manter perfis intermediários duplicados.
const cuidadoresDemo = await query(
  "SELECT id FROM usuarios WHERE tipo_usuario = 'CUIDADOR' AND email LIKE '%@demo.cuidaaqui.com.br'",
)
for (const { id } of cuidadoresDemo.rows) {
  await query(
    `DELETE FROM respostas_avaliacoes
     WHERE avaliacao_id IN (
       SELECT id FROM avaliacoes_cuidadores WHERE contratante_id = $1 OR cuidador_id = $1
     )`,
    [id],
  )
  await query(
    'DELETE FROM avaliacoes_cuidadores WHERE contratante_id = $1 OR cuidador_id = $1',
    [id],
  )
  await query('DELETE FROM formacoes_cursos WHERE cuidador_id = $1', [id])
  await query('DELETE FROM experiencias_profissionais WHERE cuidador_id = $1', [id])
  await query('DELETE FROM cuidador_cidades WHERE cuidador_id = $1', [id])
  await query('DELETE FROM cuidador_especializacoes WHERE cuidador_id = $1', [id])
  await query('DELETE FROM perfis_cuidadores WHERE usuario_id = $1', [id])
  await query('DELETE FROM usuarios WHERE id = $1', [id])
}

for (const [uf, nome] of ESTADOS) {
  await query('INSERT INTO estados (uf, nome) VALUES ($1, $2) ON CONFLICT DO NOTHING', [uf, nome])
}
for (const [codigo, nome, uf] of [...CIDADES, ...CIDADES_CEARA]) {
  await query('INSERT INTO cidades (codigo_ibge, nome, uf) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING', [codigo, nome, uf])
}
for (const [nome, descricao] of ESPECIALIZACOES) {
  await query('INSERT INTO especializacoes (nome, descricao) VALUES ($1, $2) ON CONFLICT DO NOTHING', [nome, descricao])
}

const senhaHash = await gerarHashSenha('Demo@123')
let cuidadoresCriados = 0

async function criarCuidador({ codigoIbge, nomeCidade, uf, indice, cpfIndice, sufixoEmail }) {
  const nome = NOMES[indice % NOMES.length]
  const email = `cuidador.${sufixoEmail}.${uf.toLowerCase()}.${codigoIbge}@demo.cuidaaqui.com.br`
  let usuario = await queryUm('SELECT id FROM usuarios WHERE LOWER(email) = LOWER($1)', [email])

  if (!usuario) {
    usuario = await queryUm(
      `INSERT INTO usuarios (nome_completo, email, senha_hash, tipo_usuario)
       VALUES ($1, $2, $3, 'CUIDADOR') RETURNING id`,
      [nome, email, senhaHash],
    )
    cuidadoresCriados += 1
  }

  const anosExperiencia = 1 + ((indice * 3) % 18)
  const idade = 24 + ((indice * 4) % 39)
  const funcao = FUNCOES[indice % FUNCOES.length]
  const sobreMim = `Tenho ${idade} anos e atuo como ${funcao.toLowerCase().replace(/^uma /, '')} há ${anosExperiencia} anos. Minha experiência em ${nomeCidade} inclui atendimento humanizado, organização da rotina, apoio nas atividades diárias e cuidado seguro para cada família.`
  const cpf = gerarCpf(cpfIndice)

  await query(
    `INSERT INTO perfis_cuidadores
       (usuario_id, cpf, telefone_whatsapp, anos_experiencia, funcao, sobre_mim)
     VALUES ($1, $2, $3, $4, $5, $6)
     ON CONFLICT (usuario_id) DO UPDATE
     SET telefone_whatsapp = EXCLUDED.telefone_whatsapp`,
    [usuario.id, cpf, TELEFONE, anosExperiencia, funcao, sobreMim],
  )

  const cidade = await queryUm('SELECT id FROM cidades WHERE codigo_ibge = $1', [codigoIbge])
  await query(
    `INSERT INTO cuidador_cidades (cuidador_id, cidade_id)
     VALUES ($1, $2) ON CONFLICT DO NOTHING`,
    [usuario.id, cidade.id],
  )

  const especializacaoPrincipal = await queryUm(
    'SELECT id FROM especializacoes WHERE nome = $1',
    [ESPECIALIZACOES[indice % ESPECIALIZACOES.length][0]],
  )
  await query(
    `INSERT INTO cuidador_especializacoes (cuidador_id, especializacao_id)
     VALUES ($1, $2) ON CONFLICT DO NOTHING`,
    [usuario.id, especializacaoPrincipal.id],
  )

  const segundaEspecialidade = ESPECIALIZACOES[(indice + 3) % ESPECIALIZACOES.length][0]
  const especializacaoSecundaria = await queryUm(
    'SELECT id FROM especializacoes WHERE nome = $1',
    [segundaEspecialidade],
  )
  await query(
    `INSERT INTO cuidador_especializacoes (cuidador_id, especializacao_id)
     VALUES ($1, $2) ON CONFLICT DO NOTHING`,
    [usuario.id, especializacaoSecundaria.id],
  )

  const formacaoExiste = await queryUm(
    'SELECT id FROM formacoes_cursos WHERE cuidador_id = $1 LIMIT 1',
    [usuario.id],
  )
  if (!formacaoExiste) {
    await query(
      `INSERT INTO formacoes_cursos (cuidador_id, nome_instituicao, nome_curso)
       VALUES ($1, $2, $3)`,
      [
        usuario.id,
        indice % 2 === 0 ? 'Instituto de Formação em Cuidados' : 'Escola Técnica de Saúde',
        indice % 3 === 0 ? 'Cuidados Domiciliares' : 'Primeiros Socorros e Suporte Básico de Vida',
      ],
    )
  }

  const experienciaExiste = await queryUm(
    'SELECT id FROM experiencias_profissionais WHERE cuidador_id = $1 LIMIT 1',
    [usuario.id],
  )
  if (!experienciaExiste) {
    await query(
      `INSERT INTO experiencias_profissionais
         (cuidador_id, nome_local_trabalho, descricao, ano_inicio, ano_fim)
       VALUES ($1, $2, $3, $4, NULL)`,
      [
        usuario.id,
        `Atendimento domiciliar — ${nomeCidade}, ${uf}`,
        `Acompanhamento de rotina, apoio à alimentação, higiene, mobilidade e administração de cuidados conforme orientação da família.`,
        2026 - anosExperiencia,
      ],
    )
  }
}

for (let indice = 0; indice < CIDADES.length; indice += 1) {
  const [codigoIbge, nomeCidade, uf] = CIDADES[indice]
  await criarCuidador({
    codigoIbge,
    nomeCidade,
    uf,
    indice,
    cpfIndice: indice + 1,
    sufixoEmail: 'original',
  })
}

for (let indice = 0; indice < CIDADES.length; indice += 1) {
  const [codigoIbge, nomeCidade, uf] = CIDADES[indice]
  if (uf === 'CE') continue
  await criarCuidador({
    codigoIbge,
    nomeCidade,
    uf,
    indice: indice + 27,
    cpfIndice: 100 + indice,
    sufixoEmail: 'capital2',
  })
}

const CUIDADORES_CEARA_ADICIONAIS = [
  ['2304400', 'Fortaleza', 4],
  ['2303709', 'Caucaia', 4],
  ['2303931', 'Chorozinho', 3],
  ['2304285', 'Eusébio', 3],
  ['2312908', 'Sobral', 3],
  ['2307304', 'Juazeiro do Norte', 2],
]

let indiceCeara = 0
for (const [codigoIbge, nomeCidade, quantidade] of CUIDADORES_CEARA_ADICIONAIS) {
  for (let n = 1; n <= quantidade; n += 1) {
    indiceCeara += 1
    await criarCuidador({
      codigoIbge,
      nomeCidade,
      uf: 'CE',
      indice: 53 + indiceCeara,
      cpfIndice: 200 + indiceCeara,
      sufixoEmail: `ceara${indiceCeara}`,
    })
  }
}

// Os contratantes de exemplo são mantidos entre execuções. As avaliações dos cuidadores
// de exemplo foram apagadas na limpeza do início, então rodar de novo não as duplica.
const contratantesDemo = []
for (let n = 0; n < CONTRATANTES_DEMO.length; n += 1) {
  const email = `contratante.${n + 1}@demo.cuidaaqui.com.br`
  const contratante =
    (await queryUm('SELECT id FROM usuarios WHERE LOWER(email) = LOWER($1)', [email])) ??
    (await queryUm(
      `INSERT INTO usuarios (nome_completo, email, senha_hash, tipo_usuario)
       VALUES ($1, $2, $3, 'CONTRATANTE') RETURNING id`,
      [CONTRATANTES_DEMO[n], email, senhaHash],
    ))
  contratantesDemo.push(contratante.id)
}

const cuidadoresAvaliados = await query(
  "SELECT id FROM usuarios WHERE tipo_usuario = 'CUIDADOR' AND email LIKE '%@demo.cuidaaqui.com.br' ORDER BY id",
)
let avaliacoesCriadas = 0
for (const [indice, { id: cuidadorId }] of cuidadoresAvaliados.rows.entries()) {
  // De 0 a 4 avaliações por cuidador, para também haver perfis ainda sem nenhuma.
  for (let n = 0; n < indice % 5; n += 1) {
    const [nota, comentario] = AVALIACOES_DEMO[(indice * 3 + n) % AVALIACOES_DEMO.length]
    const diasAtras = (indice * 7 + n * 37) % 300
    await query(
      `INSERT INTO avaliacoes_cuidadores (contratante_id, cuidador_id, nota, comentario, criado_em, atualizado_em)
       VALUES ($1, $2, $3, $4,
         CURRENT_TIMESTAMP - make_interval(days => $5),
         CURRENT_TIMESTAMP - make_interval(days => $5))`,
      [contratantesDemo[(indice + n) % contratantesDemo.length], cuidadorId, nota, comentario, diasAtras],
    )
    avaliacoesCriadas += 1
  }
}

console.log(
  `Seed concluído: ${ESTADOS.length} estados, ${CIDADES.length} capitais, ` +
  `${ESPECIALIZACOES.length} especializações, 20 cuidadores no Ceará, ` +
  `2 cuidadores em cada uma das outras capitais e 72 cuidadores no total ` +
  `(${cuidadoresCriados} novos), ${contratantesDemo.length} contratantes e ` +
  `${avaliacoesCriadas} avaliações de exemplo.`,
)
await fecharBanco()
