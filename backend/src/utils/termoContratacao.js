export const TERMO_CONTRATACAO_VERSAO = '1.0'

const nomeParaTermo = (nome) => nome.replace(/\s+/g, ' ').trim()

export function gerarTermoContratacao({ contratante, cuidador, geradoEm }) {
  const contratanteNome = nomeParaTermo(contratante)
  const cuidadorNome = nomeParaTermo(cuidador)

  return [
    'CuidaAqui',
    'TERMO DE CONFIRMAÇÃO DE CONTRATAÇÃO DE SERVIÇOS DE CUIDADOR(A)',
    '',
    'IDENTIFICAÇÃO DAS PARTES',
    `CONTRATANTE: ${contratanteNome}`,
    `CUIDADOR(A): ${cuidadorNome}`,
    '',
    'CLÁUSULA 1ª – DO OBJETO',
    'Este termo registra a intenção de contratação de serviços de cuidado e assistência do(a) cuidador(a) identificado(a), conforme as necessidades apresentadas pelo(a) contratante.',
    '',
    'CLÁUSULA 2ª – DO ACORDO ENTRE AS PARTES',
    'O(a) contratante manifesta interesse na contratação. O(a) cuidador(a), ao confirmar este termo, manifesta sua concordância em prestar os serviços solicitados. A contratação somente será considerada confirmada na plataforma após as confirmações individuais de ambas as partes.',
    '',
    'CLÁUSULA 3ª – DAS CONDIÇÕES DA PRESTAÇÃO DOS SERVIÇOS',
    'Valores, datas, horários, duração, atividades e demais condições específicas serão definidos diretamente entre as partes, fora da plataforma CuidaAqui.',
    '',
    'CLÁUSULA 4ª – DA FINALIDADE DO REGISTRO',
    'Este documento registra na plataforma a manifestação de concordância entre as partes. A CuidaAqui não define valores, não realiza pagamentos e não estabelece condições comerciais ou operacionais da prestação dos serviços.',
    '',
    'CLÁUSULA 5ª – DA CONFIRMAÇÃO',
    'Cada parte manifesta sua concordância por meio de sua própria confirmação na plataforma. A contratação só será considerada confirmada após as duas manifestações.',
    '',
    'DECLARAÇÃO DE CONCORDÂNCIA',
    'Ao confirmar este termo, cada parte declara reconhecer a identificação da outra conforme apresentada na plataforma, concordar com o registro da contratação e estar ciente de que as condições específicas do serviço são definidas diretamente entre as partes, fora da CuidaAqui.',
    '',
    'DADOS DO REGISTRO NA PLATAFORMA',
    `Contratante: ${contratanteNome}`,
    `Cuidador(a): ${cuidadorNome}`,
    `Data e hora de geração: ${geradoEm.toISOString()}`,
    `Confirmação do contratante: CONFIRMADA em ${geradoEm.toISOString()}.`,
    'Confirmação do(a) cuidador(a): PENDENTE.',
    '',
    'Documento gerado eletronicamente pela plataforma CuidaAqui. A exibição deste termo não significa que ambas as partes já confirmaram a contratação.',
    'Modelo sujeito a revisão jurídica antes de uso oficial.',
  ].join('\n')
}
