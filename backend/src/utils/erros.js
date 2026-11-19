export class AppError extends Error {
  constructor(status, mensagem, detalhes) {
    super(mensagem)
    this.status = status
    this.detalhes = detalhes
  }
}

export const naoEncontrado = (recurso) => new AppError(404, `${recurso} não encontrado(a)`)
export const proibido = (mensagem = 'Você não tem permissão para esta ação') =>
  new AppError(403, mensagem)
