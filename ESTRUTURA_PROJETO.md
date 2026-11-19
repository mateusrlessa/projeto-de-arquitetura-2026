# Estrutura do Projeto CuidaAqui

## Visão geral

Aplicação web para encontrar cuidadores, consultar perfis e avaliações, gerenciar
contratações e administrar usuários e moderação. O frontend usa React/Vite; o backend
oferece uma API REST em Express.

## Raiz do repositório

- `README.md` — Identifica o grupo responsável pelo projeto.
- `package.json` — Comandos da raiz para iniciar, compilar e operar os subprojetos.
- `package-lock.json` — Versões resolvidas das dependências da raiz.
- `.gitignore` — Arquivos e diretórios excluídos do controle de versão.
- `cuidaaqui-insomnia.json` — Coleção de requisições da API para importar no Insomnia.
- `ESTRUTURA_PROJETO.md` — Este inventário de diretórios, páginas e módulos.

### `modelo de dados/`

- `diagrama de entidades Projeto Arquitetura CuidaAqui.png` — Diagrama visual das entidades e seus relacionamentos.
- `endpoints baseado no modelo de dados.txt` — Especificação textual dos endpoints da API.
- `script sql criação tabelas.sql` — Script SQL de criação das tabelas do modelo.

## Frontend — `frontend/`

- `README.md` — Notas iniciais do frontend (template React/Vite).
- `package.json` — Dependências e comandos de desenvolvimento, build e lint.
- `package-lock.json` — Versões resolvidas das dependências do frontend.
- `.oxlintrc.json` — Configuração do linter Oxlint.
- `.gitignore` — Arquivos locais ignorados no frontend.
- `index.html` — Documento HTML que hospeda a aplicação React.
- `vite.config.js` — Configuração do Vite e integração com React/Tailwind.
- `images/cuidador-tela-inicial.jpg` — Imagem usada como recurso visual do frontend.
- `public/favicon.svg` — Ícone do site.
- `public/images/cuidador-tela-inicial.jpg` — Imagem pública utilizada pela interface.
- `public/images/cuidadora-placeholder.svg` — Imagem padrão quando não há foto de perfil.

### `frontend/src/`

- `main.jsx` — Inicializa o React, provedores e montagem da aplicação.
- `App.jsx` — Define as rotas das páginas e seus requisitos de acesso.
- `index.css` — Estilos globais e configuração visual compartilhada.

#### Páginas — `frontend/src/pages/`

- `Inicio.jsx` — Página inicial e entrada para a busca de cuidadores. Rota: `/`.
- `Cuidadores.jsx` — Lista e filtra cuidadores. Rota: `/cuidadores`.
- `PerfilCuidador.jsx` — Exibe o perfil e as avaliações; permite consultar avaliações próprias e encaminha para a avaliação vinculada a um serviço concluído. Rota: `/cuidadores/:id`.
- `Contrato.jsx` — Apresenta a prévia oficial do termo e inicia a contratação após concordância. Rota protegida para CONTRATANTES: `/cuidadores/:id/contratar`.
- `Servicos.jsx` — Lista as contratações do usuário autenticado. Rota para CONTRATANTES e CUIDADORES: `/servicos`.
- `DetalheServico.jsx` — Exibe termo, partes, histórico e ações da contratação, incluindo avaliação após a conclusão. Rota para participantes: `/servicos/:id`.
- `Acesso.jsx` — Login e cadastro de usuário. Rota: `/acesso`.
- `RecuperarSenha.jsx` — Solicita link para redefinir a senha. Rota: `/recuperar-senha`.
- `NovaSenha.jsx` — Define uma nova senha usando o link recebido. Rota: `/nova-senha`.
- `VerificarEmail.jsx` — Confirma o e-mail a partir do link enviado. Rota: `/verificar-email`.
- `MinhaConta.jsx` — Permite consultar e alterar dados da conta. Rota: `/minha-conta`.
- `MeuPerfil.jsx` — Edita o perfil profissional do cuidador. Rota: `/meu-perfil`.
- `Avaliacoes.jsx` — Consulta, edita e responde avaliações recebidas pelo cuidador. Rota: `/avaliacoes`.
- `AdminUsuarios.jsx` — Pesquisa e administra contas de usuário. Rota: `/admin/usuarios`.
- `AdminModeracao.jsx` — Analisa denúncias e modera avaliações. Rota: `/admin/moderacao`.
- `AdminNovoAdmin.jsx` — Cadastra um novo administrador. Rota: `/admin/novo-admin`.
- `EmBreve.jsx` — Tela de fallback para rotas ainda não implementadas.

#### Componentes — `frontend/src/components/`

- `Layout.jsx` — Estrutura comum, cabeçalho, navegação e rodapé.
- `Avatar.jsx` — Exibe avatar com iniciais ou imagem de perfil.
- `AvisoEmail.jsx` — Apresenta aviso sobre confirmação do e-mail.
- `BotaoGoogle.jsx` — Integra o botão de autenticação do Google.
- `BuscaCidade.jsx` — Campo de busca e seleção de cidade.
- `Campo.jsx` — Elementos de formulário com rótulo e erro.
- `Cartao.jsx` — Cartões e títulos visuais reutilizáveis.
- `CuidadorCard.jsx` — Cartão de resumo de um cuidador.
- `Estrelas.jsx` — Apresenta nota em estrelas.
- `FormularioAvaliacao.jsx` — Formulário reutilizável de avaliação vinculada a uma contratação concluída.
- `FotoPerfil.jsx` — Visualiza, envia ou remove foto de perfil.
- `Icones.jsx` — Exporta os ícones SVG usados na interface.
- `ModalConfirmar.jsx` — Modal genérico para confirmar uma ação.
- `ModalDenuncia.jsx` — Formulário modal para denunciar avaliação.
- `SomenteAdmin.jsx` — Restringe rotas/conteúdo a administradores.
- `SomenteContratante.jsx` — Restringe a rota de contratação a contratantes autenticados.
- `SomenteCuidador.jsx` — Restringe rotas/conteúdo a cuidadores.
- `SomenteLogado.jsx` — Restringe rotas/conteúdo a usuários autenticados.
- `SomenteParticipante.jsx` — Restringe Serviços e seus detalhes a contratantes e cuidadores autenticados.

#### Contexto e utilitários

`frontend/src/context/`

- `AuthContext.jsx` — Compartilha estado e operações de autenticação no frontend.

`frontend/src/lib/`

- `api.js` — Cliente HTTP, sessão, renovação e erros da API.
- `avaliacoes.js` — Rótulos das notas usadas no fluxo de avaliações.
- `cidades.js` — Normaliza, pesquisa e formata opções de cidade.
- `dados.js` — Funções de consulta e seleção de dados reais ou demonstrativos.
- `demo.js` — Dados locais de demonstração para cidades e cuidadores.
- `denuncias.js` — Opções e constantes usadas no fluxo de denúncias.
- `format.js` — Formatação de nomes, fotos, datas e contatos.
- `useApi.js` — Hook para carregar e acompanhar dados da API.
- `validacao.js` — Validações de senha e leitura de token de link.

## Backend — `backend/`

- `README.md` — Instruções de execução, configuração e regras da API.
- `package.json` — Dependências e comandos do servidor, banco, e-mail e testes.
- `package-lock.json` — Versões resolvidas das dependências do backend.
- `.env.example` — Exemplo das variáveis de ambiente necessárias.
- `.gitignore` — Mantém arquivos locais como `.env`, dados e uploads fora do Git.

### `backend/src/`

- `server.js` — Inicializa o banco e inicia o servidor HTTP.
- `app.js` — Configura o Express, middlewares, rotas e erros.
- `config.js` — Carrega e valida configurações e variáveis de ambiente.

#### Banco de dados — `backend/src/db/`

- `index.js` — Conecta ao PostgreSQL/PGlite e oferece funções de consulta.
- `admin.js` — Garante a criação ou atualização da conta ADMIN inicial.
- `schema.sql` — Define tabelas, restrições e estrutura inicial do banco.
- `migracoes.sql` — Aplica alterações incrementais, incluindo autenticação, avaliações, moderação e contratações.
- `seed.js` — Preenche o banco com administrador e dados de demonstração.
- `reset.js` — Recria as tabelas para reiniciar o banco de desenvolvimento.

#### Middlewares — `backend/src/middlewares/`

- `auth.js` — Autentica usuários e aplica permissões por tipo/propriedade.
- `erros.js` — Padroniza respostas para rotas inexistentes e erros da API.
- `limites.js` — Limita tentativas de autenticação, cadastro e operações sensíveis.

#### Rotas — `backend/src/routes/`

Todas as rotas da API são montadas sob o prefixo `/api`.

- `auth.js` — Login, Google, sessão, logout, verificação e recuperação de senha.
- `usuarios.js` — Cadastro, consulta, atualização, status e foto de usuários.
- `cuidadores.js` — Busca e manutenção de perfis e recursos de cuidadores.
- `contratacoes.js` — Criação, consulta e avanço do ciclo de vida das contratações.
- `cuidadorRecursos.js` — Cria rotas reutilizáveis para formações, experiências e vínculos de cidades/especializações.
- `avaliacoes.js` — Consulta, criação, edição, resposta e exclusão de avaliações.
- `moderacao.js` — Denúncias, fila e decisões administrativas de moderação.
- `cidades.js` — Consulta e manutenção do catálogo de cidades.
- `estados.js` — Consulta e manutenção do catálogo de estados.
- `especializacoes.js` — Consulta e manutenção do catálogo de especializações.

#### Validação — `backend/src/schemas/`

- `comum.js` — Regras compartilhadas para status, texto e paginação.
- `usuarios.js` — Validação de cadastro, login, conta e filtros de usuários.
- `cuidadores.js` — Validação de perfil, formação, experiência e avaliação.
- `contratacoes.js` — Validação da criação e dos filtros das contratações.
- `catalogos.js` — Validação de estados, cidades e especializações.
- `moderacao.js` — Validação de denúncias, filtros e decisões administrativas.

#### Serviços e auxiliares — `backend/src/utils/`

- `avaliacoes.js` — Operações auxiliares relacionadas à remoção de avaliações.
- `termoContratacao.js` — Gera o termo versionado com os nomes das partes obtidos pelo backend.
- `email.js` — Envio em segundo plano de e-mails de verificação e recuperação.
- `emailTemplate.js` — Monta o conteúdo HTML e texto dos e-mails transacionais.
- `previaEmail.js` — Gera arquivos de prévia dos modelos de e-mail.
- `erros.js` — Define erros da aplicação e respostas padronizadas.
- `google.js` — Valida credenciais de login emitidas pelo Google.
- `perfis.js` — Controla visibilidade e permissão de gerenciamento de perfis.
- `sql.js` — Auxilia na validação de IDs, atualização e paginação SQL.
- `tokens.js` — Gera, valida e revoga tokens de acesso, sessão e e-mail.
- `usuarios.js` — Funções de usuário, hash e verificação de senha.

### Testes automatizados — `backend/test/`

- `ajudantes.js` — Funções auxiliares compartilhadas pelos testes.
- `auth.test.js` — Testes de autenticação, sessão e fluxos de acesso.
- `avaliacoes.test.js` — Testes de vínculo com contratações, avaliações históricas, respostas e moderação.
- `contratacoes.test.js` — Testes de criação, privacidade, confirmações e transições de contratações.
- `emails.test.js` — Testes de verificação de e-mail e recuperação de senha.
- `minhaConta.test.js` — Testes de operações da conta do usuário.

## Recursos de execução

- `backend/data/` — Dados locais do PGlite; arquivos gerados em execução.
- `backend/uploads/` — Fotos de perfil enviadas; arquivos gerados em execução.
- `frontend/dist/` — Saída gerada pelo comando de build do frontend.

## Comandos mais usados

Na raiz do projeto:

```bash
npm run dev       # Inicia frontend e backend em desenvolvimento
npm run build     # Gera a versão compilada do frontend
npm run db:seed   # Popula o banco com dados de demonstração
npm run db:reset  # Recria as tabelas do banco
```

Comandos adicionais do backend estão definidos em `backend/package.json`, incluindo
testes (`npm test`) e prévia dos e-mails (`npm run email:previa`).
