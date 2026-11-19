const foto = (genero, n) => `https://randomuser.me/api/portraits/${genero}/${n}.jpg`

export const CIDADES_DEMO = [
  { id: 1, codigo_ibge: '2304400', nome: 'Fortaleza', uf: 'CE', cidade_estado: 'Fortaleza - CE' },
  { id: 2, codigo_ibge: '2303709', nome: 'Caucaia', uf: 'CE', cidade_estado: 'Caucaia - CE' },
  { id: 3, codigo_ibge: '2307650', nome: 'Maracanaú', uf: 'CE', cidade_estado: 'Maracanaú - CE' },
]

const [FORTALEZA, CAUCAIA, MARACANAU] = CIDADES_DEMO.map(({ id, nome, uf }) => ({ id, nome, uf }))
const esp = (id, nome) => ({ id, nome })
const IDOSOS = esp(1, 'Idosos')
const ALZHEIMER = esp(2, 'Alzheimer')
const POS_OPERATORIO = esp(3, 'Pós-operatório')
const CRIANCAS = esp(4, 'Crianças')
const PCD = esp(5, 'PCD')
const ACAMADOS = esp(6, 'Acamados')
const RECEM_NASCIDOS = esp(7, 'Recém-nascidos')
const MOBILIDADE = esp(8, 'Mobilidade reduzida')

const formacao = (id, nome_curso, nome_instituicao) => ({ id, nome_curso, nome_instituicao })
const experiencia = (id, nome_local_trabalho, descricao, ano_inicio, ano_fim = null) => ({ id, nome_local_trabalho, descricao, ano_inicio, ano_fim })
const avaliacao = (id, contratante_nome, nota, criado_em, comentario, resposta = null) => ({
  id,
  contratante_nome,
  nota,
  criado_em,
  comentario,
  resposta: resposta && { resposta },
})

export const CUIDADORES_DEMO = [
  {
    id: 1,
    nome_completo: 'Ana Paula Souza',
    foto_perfil_storage_key: foto('women', 44),
    funcao: 'Técnica de Enfermagem',
    anos_experiencia: 8,
    nota_media: 4.9,
    total_avaliacoes: 32,
    telefone_whatsapp: '(85) 98812-4471',
    sobre_mim:
      'Sou técnica de enfermagem e cuidadora por vocação. Há oito anos acompanho pessoas idosas e suas famílias com escuta, paciência e respeito às rotinas de cada lar. Meu cuidado combina atenção aos detalhes, segurança e acolhimento, para que cada pessoa se sinta confortável, autônoma e verdadeiramente amparada.',
    cidades: [FORTALEZA, MARACANAU, CAUCAIA],
    especializacoes: [IDOSOS, ALZHEIMER, POS_OPERATORIO, MOBILIDADE],
    formacoes: [
      formacao(1, 'Técnico em Enfermagem', 'Escola de Saúde Pública do Ceará'),
      formacao(2, 'Cuidados à Pessoa com Alzheimer', 'Instituto de Geriatria e Gerontologia do Ceará'),
      formacao(3, 'Primeiros Socorros e Suporte Básico de Vida', 'Cruz Vermelha Brasileira — Ceará'),
    ],
    experiencias: [
      experiencia(1, 'Atendimento familiar — Fortaleza, CE', 'Acompanhamento diário de pessoa idosa com Alzheimer, organização de medicação prescrita, apoio à higiene, alimentação e mobilidade, além de registro da rotina para a família.', 2021),
      experiencia(2, 'Residencial Bem Viver — Fortaleza, CE', 'Cuidados integrais a residentes idosos, aferição de sinais vitais, suporte em atividades diárias e trabalho conjunto com enfermagem, fisioterapia e familiares.', 2016, 2021),
    ],
    avaliacoes: [
      avaliacao(1, 'Marina Costa', 5, '2026-09-18T15:00:00-03:00', 'Ana cuidou da minha mãe durante a recuperação de uma cirurgia. Foi extremamente atenciosa, pontual e cuidadosa com todas as orientações médicas. Minha mãe se sentiu segura e muito bem acolhida.', 'Marina, agradeço muito pela confiança e pelo carinho. Foi uma alegria acompanhar a recuperação da dona Lúcia e ver sua evolução a cada dia. Um abraço para toda a família!'),
      avaliacao(2, 'Ricardo Alves', 5, '2026-08-02T15:00:00-03:00', 'Profissional muito preparada e humana. Ana criou uma rotina tranquila para o meu pai, sempre nos manteve informados e demonstrou bastante experiência com Alzheimer. Recomendo sem hesitar.'),
      avaliacao(3, 'Beatriz Sales', 5, '2026-06-14T15:00:00-03:00', 'Desde o primeiro contato, Ana foi gentil e profissional. Teve muita paciência com a minha avó e ajudou em toda a rotina de alimentação, mobilidade e companhia. Fez diferença para nossa família.'),
    ],
  },
  {
    id: 2,
    nome_completo: 'Carlos Eduardo Lima',
    foto_perfil_storage_key: foto('men', 32),
    funcao: 'Enfermeiro',
    anos_experiencia: 6,
    nota_media: 4.8,
    total_avaliacoes: 21,
    telefone_whatsapp: '(85) 99743-2208',
    sobre_mim: 'Enfermeiro com experiência em atendimento domiciliar. Acompanho idosos e pacientes em recuperação cirúrgica, cuidando de curativos, medicação e orientação à família.',
    cidades: [FORTALEZA, CAUCAIA],
    especializacoes: [IDOSOS, POS_OPERATORIO],
    formacoes: [
      formacao(4, 'Bacharel em Enfermagem', 'Universidade de Fortaleza (UNIFOR)'),
      formacao(5, 'Curativos e Cuidados com Feridas', 'Conselho Regional de Enfermagem do Ceará'),
    ],
    experiencias: [
      experiencia(3, 'Home care Vida Plena — Fortaleza, CE', 'Atendimento domiciliar a pacientes idosos e em pós-operatório, com curativos, administração de medicação e relatórios para a equipe médica.', 2021),
      experiencia(4, 'Hospital Distrital Gonzaga Mota — Fortaleza, CE', 'Assistência de enfermagem em enfermaria cirúrgica.', 2020, 2021),
    ],
    avaliacoes: [
      avaliacao(4, 'Paulo Henrique Nogueira', 5, '2026-09-30T10:00:00-03:00', 'Cuidou do meu pai depois da cirurgia no quadril com muita atenção. Curativos sempre no horário e orientações claras para a família.'),
      avaliacao(5, 'Camila Rodrigues', 5, '2026-08-21T10:00:00-03:00', 'Muito profissional e tranquilo. Passou segurança para toda a família desde o primeiro dia.'),
    ],
  },
  {
    id: 3,
    nome_completo: 'Mariana Oliveira',
    foto_perfil_storage_key: foto('women', 68),
    funcao: 'Babá e cuidadora infantil',
    anos_experiencia: 5,
    nota_media: 4.7,
    total_avaliacoes: 15,
    telefone_whatsapp: '(85) 98655-1932',
    sobre_mim: 'Pedagoga e babá, gosto de unir cuidado e brincadeira. Acompanho crianças em casa e na rotina escolar, sempre em diálogo com os pais.',
    cidades: [FORTALEZA],
    especializacoes: [CRIANCAS],
    formacoes: [
      formacao(6, 'Pedagogia', 'Universidade Estadual do Ceará (UECE)'),
      formacao(7, 'Curso de Primeiros Socorros', 'Cruz Vermelha Brasileira — Ceará'),
    ],
    experiencias: [
      experiencia(5, 'Família Albuquerque — Fortaleza, CE', 'Cuidado de duas crianças (4 e 7 anos), organização da rotina, alimentação e apoio às tarefas escolares.', 2022),
      experiencia(6, 'Espaço Pequenos Passos — Fortaleza, CE', 'Auxiliar em educação infantil.', 2021, 2022),
    ],
    avaliacoes: [
      avaliacao(6, 'Luciana Barbosa', 5, '2026-09-12T18:00:00-03:00', 'Meus filhos adoram a Mariana. Ela organiza a rotina, ajuda nas tarefas e sempre manda notícias durante o dia.'),
    ],
  },
  {
    id: 4,
    nome_completo: 'Joana Ferreira',
    foto_perfil_storage_key: null,
    funcao: 'Cuidadora',
    anos_experiencia: 4,
    nota_media: 4.5,
    total_avaliacoes: 9,
    telefone_whatsapp: '(85) 98801-7764',
    sobre_mim: 'Cuidadora de pessoas com deficiência, com foco em autonomia e dignidade no dia a dia.',
    cidades: [FORTALEZA, MARACANAU],
    especializacoes: [PCD, MOBILIDADE],
    formacoes: [formacao(8, 'Curso de Cuidador de PCD', 'Instituto Cearense de Capacitação')],
    experiencias: [experiencia(7, 'Atendimento familiar — Fortaleza, CE', 'Apoio em higiene, alimentação e deslocamento de pessoa com paralisia cerebral.', 2022)],
    avaliacoes: [
      avaliacao(7, 'Fábio Teixeira', 5, '2026-07-25T09:00:00-03:00', 'Muito paciente e cuidadosa com meu irmão. Respeita o tempo dele e incentiva a autonomia.'),
    ],
  },
  {
    id: 5,
    nome_completo: 'Roberto Alves',
    foto_perfil_storage_key: foto('men', 75),
    funcao: 'Cuidador',
    anos_experiencia: 3,
    nota_media: 4.2,
    total_avaliacoes: 6,
    telefone_whatsapp: '(85) 99620-4415',
    sobre_mim: 'Cuidador de idosos, atento e pontual. Atuo em plantões diurnos e noturnos, com experiência em pacientes acamados.',
    cidades: [FORTALEZA],
    especializacoes: [IDOSOS, ACAMADOS],
    formacoes: [formacao(9, 'Curso de Cuidador de Idosos', 'SENAC Ceará')],
    experiencias: [experiencia(8, 'Atendimento familiar — Fortaleza, CE', 'Cuidados diários com idoso acamado: banho no leito, mudança de decúbito e alimentação.', 2023)],
    avaliacoes: [
      avaliacao(8, 'Rafael Menezes', 4, '2026-08-10T20:00:00-03:00', 'Cuidou bem do meu avô nos plantões da noite. Só gostaria de receber mais relatórios da rotina.'),
    ],
  },
  {
    id: 6,
    nome_completo: 'Fernanda Costa',
    foto_perfil_storage_key: null,
    funcao: 'Cuidadora',
    anos_experiencia: 2,
    nota_media: 3.8,
    total_avaliacoes: 4,
    telefone_whatsapp: '(85) 98734-9051',
    sobre_mim: 'Auxiliar de enfermagem em início de carreira como cuidadora, com carinho especial por bebês e crianças pequenas.',
    cidades: [FORTALEZA],
    especializacoes: [RECEM_NASCIDOS, CRIANCAS],
    formacoes: [formacao(10, 'Auxiliar de Enfermagem', 'Escola Técnica de Saúde de Fortaleza')],
    experiencias: [experiencia(9, 'Atendimento familiar — Fortaleza, CE', 'Cuidados com recém-nascido: banho, amamentação assistida e rotina de sono.', 2024)],
    avaliacoes: [
      avaliacao(9, 'Aline Freitas', 4, '2026-09-02T14:00:00-03:00', 'Cuidadosa com o bebê, mas tivemos dificuldade de alinhar alguns horários no início.'),
    ],
  },
]
