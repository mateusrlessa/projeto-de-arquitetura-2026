// Busca de cidades usada pelo seletor da Home, da listagem e do perfil do cuidador.

export const normalizar = (texto) =>
  texto
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()

export const rotuloCidade = (cidade) => cidade.cidade_estado || `${cidade.nome} - ${cidade.uf}`

// Cidades que combinam com o que a pessoa digitou, da melhor para a pior correspondência:
// 1) nome igual, 2) começa com o texto ("for" -> Fortaleza), 3) outra palavra começa com o texto
// ("paulo" -> São Paulo), 4) o texto aparece em qualquer parte. Acentos e maiúsculas não importam.
export function filtrarCidades(cidades, texto, limite = 8) {
  const termo = normalizar(texto)
  if (!termo) return cidades.slice(0, limite)

  const encontradas = []
  for (const cidade of cidades) {
    const nome = normalizar(cidade.nome)
    const rotulo = normalizar(rotuloCidade(cidade))
    let pontos
    if (nome === termo || rotulo === termo) pontos = 0
    else if (rotulo.startsWith(termo)) pontos = 1
    else if (nome.split(/[\s-]+/).some((palavra) => palavra.startsWith(termo))) pontos = 2
    else if (rotulo.includes(termo)) pontos = 3
    else continue
    encontradas.push({ cidade, pontos })
  }

  return encontradas
    .sort((a, b) => a.pontos - b.pontos || a.cidade.nome.localeCompare(b.cidade.nome, 'pt-BR') || a.cidade.uf.localeCompare(b.cidade.uf))
    .slice(0, limite)
    .map(({ cidade }) => cidade)
}

// Cidade que o texto indica: a correspondência exata ou, se for só um começo ("rec"), a melhor sugestão.
// Texto em branco não indica cidade nenhuma.
export const acharCidade = (cidades, texto) => (normalizar(texto) ? (filtrarCidades(cidades, texto, 1)[0] ?? null) : null)
