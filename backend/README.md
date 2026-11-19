# Backend CuidaAqui

API REST em Node.js (Express) com o CRUD de todas as tabelas de
`modelo de dados/script sql criação tabelas.sql`, seguindo
`modelo de dados/endpoints baseado no modelo de dados.txt`.

Todas as rotas ficam sob o prefixo `/api` (ex.: `http://localhost:3001/api/usuarios`).

## Como rodar

```bash
cd backend
npm install
cp .env.example .env     # no Windows (cmd): copy .env.example .env
npm run db:seed          # cria as tabelas, o ADMIN inicial e dados de exemplo
npm run dev              # http://localhost:3001
```

Ou, na raiz do projeto, `npm run dev` sobe backend e frontend juntos.

### Banco de dados

- **Sem `DATABASE_URL`** (padrão): usa o [PGlite](https://pglite.dev), um PostgreSQL
  embutido salvo em `backend/data/`. Não precisa instalar nada.
- **Com `DATABASE_URL`**: conecta num PostgreSQL de verdade
  (ex.: `postgres://usuario:senha@localhost:5432/cuidaaqui`).

Nos dois casos as tabelas são criadas automaticamente na primeira execução, a partir de
[`src/db/schema.sql`](src/db/schema.sql) (o mesmo script do modelo de dados).

| Script             | O que faz                                                        |
| ------------------ | ---------------------------------------------------------------- |
| `npm run dev`      | Sobe a API e reinicia a cada alteração                           |
| `npm start`        | Sobe a API                                                       |
| `npm run db:seed`  | Insere estados, cidades e especializações de exemplo e o ADMIN   |
| `npm run db:reset` | Apaga tudo e recria as tabelas vazias                            |

O seed cadastra os 27 estados e as 27 capitais, 8 especializações, 72 cuidadores, 8 contratantes e
141 avaliações de exemplo (senha dos usuários de exemplo: `Demo@123`).

## Testando as requisições

1. Faça login com o ADMIN do `.env` em `POST /api/auth/login` (`{ "email": ..., "senha": ... }`).
2. Cadastre um CUIDADOR e um CONTRATANTE em `POST /api/usuarios` e faça login com cada um.
3. Envie o `token_acesso` recebido no cabeçalho `Authorization: Bearer <token>`.
4. O cuidador cria o perfil em `POST /api/cuidadores` antes de usar formações, experiências,
   cidades, especializações e avaliações.

As sessões ficam no banco: reiniciar o servidor não exige novo login.

## E-mail: confirmação e recuperação de senha

Sem `SMTP_HOST` no `.env`, nenhum e-mail é enviado: o link aparece no log do servidor, assim:

```
[e-mail não enviado] Redefina sua senha do CuidaAqui | Para: maria@exemplo.com
http://localhost:5173/nova-senha#token=...
```

Para enviar de verdade, use as credenciais SMTP do seu provedor (Brevo, Mailtrap, Amazon SES,
Gmail com senha de app etc.) no `backend/.env`:

| Variável                    | O que é                                                    |
| --------------------------- | ---------------------------------------------------------- |
| `SMTP_HOST`                 | Servidor SMTP. Obrigatório em produção                     |
| `SMTP_PORTA`                | Padrão 587 (STARTTLS). Com 465, a conexão já começa em TLS |
| `SMTP_USUARIO`/`SMTP_SENHA` | Credenciais do provedor                                    |
| `EMAIL_REMETENTE`           | Remetente autorizado no provedor. Obrigatório em produção  |
| `FRONTEND_URL`              | Endereço do site usado nos links. Obrigatório em produção  |
| `TOKEN_VERIFICACAO_MINUTOS` | Validade do link de confirmação. Padrão 60                 |
| `TOKEN_RECUPERACAO_MINUTOS` | Validade do link de recuperação. Padrão 30                 |

Em produção o servidor não inicia sem `SMTP_HOST`, `EMAIL_REMETENTE` e `FRONTEND_URL`, e só envia
por conexão com TLS. O envio roda em segundo plano: se o provedor falhar, a resposta da API não muda
e o erro aparece no log.

## Login com Google

Sem `GOOGLE_CLIENT_ID` no `.env`, a tela de login mostra o botão do Google como indisponível.
Para ativar:

1. No [Google Cloud Console](https://console.cloud.google.com/apis/credentials), crie um projeto,
   configure a tela de consentimento OAuth e crie uma credencial **ID do cliente OAuth** do tipo
   **Aplicativo da Web**.
2. Em **Origens JavaScript autorizadas**, adicione `http://localhost` e `http://localhost:5173`
   (e o domínio do site em produção).
3. Copie o ID do cliente para `GOOGLE_CLIENT_ID` no `backend/.env` e reinicie o backend.

O ID do cliente é público. Esse fluxo não usa a chave secreta do cliente, então ela não deve ir
para o `.env` nem para o repositório.

## Regras implementadas

- **Autenticação**: `token_acesso` (JWT de 15 min) no cabeçalho `Authorization: Bearer ...` e
  sessão de 7 dias em um cookie `HttpOnly` e `SameSite=Strict`, usado pelo `/auth/refresh`. O token
  do cookie é trocado a cada uso e só o hash dele fica no banco. Reutilizar um token antigo encerra
  a sessão, e o logout ou a troca de senha também.
- **Google**: a credencial é validada no backend (assinatura, emissor, validade e `aud`) e exige
  e-mail verificado. O login vincula a uma conta com o mesmo e-mail só se ele estiver confirmado na
  conta, e o vínculo encerra as sessões abertas dela. Sem confirmação responde 409, e contas ADMIN
  nunca são vinculadas.
- **Confirmação de e-mail**: o cadastro envia um link de confirmação, e o login continua funcionando
  antes da confirmação. Trocar o e-mail zera a confirmação e envia um novo link. A página do link só
  confirma depois de um clique, porque verificadores de e-mail abrem links sozinhos.
- **Recuperação de senha**: o pedido responde igual exista ou não a conta. Redefinir a senha encerra
  todas as sessões e também confirma o e-mail, já que o link prova o acesso à caixa de entrada.
- **Links por e-mail**: o token é aleatório, de uso único e com validade curta. Só o hash fica no
  banco (`tokens_email`), e só o link mais recente de cada tipo vale. Token vencido, reutilizado ou
  inexistente recebe a mesma resposta 400.
- **Troca de senha ou e-mail**: quem troca a própria senha ou o próprio e-mail precisa informar
  `senha_atual`, porque quem controla o e-mail consegue recuperar a senha. Um ADMIN pode alterar esses
  dados de outra pessoa sem ela. Conta só com Google cria a senha pelo link de recuperação antes de
  trocar o e-mail.
- **Proteção contra força bruta**: limite de tentativas de login, cadastro, sessão, `senha_atual` e
  links por e-mail, por IP e por conta. O login responde igual e no mesmo tempo para e-mail
  inexistente e senha errada.
- **Produção** (`NODE_ENV=production`): o servidor não inicia sem um `JWT_SECRET` forte, com a
  `ADMIN_SENHA` de exemplo ou sem a configuração de e-mail, e o cookie só trafega por HTTPS. Com a API atrás de um proxy reverso,
  defina `TRUST_PROXY`.
- **Permissões** conforme o arquivo de endpoints: rotas ADMIN, "próprio usuário ou ADMIN",
  CONTRATANTE para avaliar e cuidador avaliado para responder.
- **Janela de edição das avaliações**: o contratante só edita ou exclui a própria avaliação nos primeiros
  minutos depois do envio (`AVALIACAO_EDICAO_MINUTOS`, padrão 10). A edição também é bloqueada depois que o
  cuidador responde. As avaliações trazem `editavel_ate` e `segundos_para_editar` (medido pelo relógio do banco).
  Fora do prazo, só um ADMIN remove o comentário. Avaliações vinculadas a contratações são inativadas, preservando
  o vínculo único com o serviço; registros históricos sem contratação podem continuar seguindo a exclusão anterior.
- **Moderação (ADMIN)**: `PATCH /avaliacoes/:id/status` com `OCULTA` tira o comentário do ar sem apagar o registro
  e o autor não consegue publicar outro no lugar. `PATCH /avaliacoes/:id/resposta/status` faz o mesmo com a resposta.
  Um ADMIN não bloqueia nem exclui outros administradores (nem a si mesmo). `GET /usuarios?busca=` procura no nome
  e no e-mail.
- **Exclusão lógica**: os `DELETE` do usuário mudam o status para `INATIVO` (ou `INATIVA` nas avaliações).
  A remoção administrativa de avaliações históricas sem contratação continua física; avaliações de serviços são inativadas.
- **Validação** dos dados com [zod](https://zod.dev), com mensagens em português; violações de
  constraints do banco (e-mail/CPF duplicado, UF inexistente...) viram erros 400/409.
- **CPF** aceito com ou sem pontuação, com validação dos dígitos, e nunca retornado no perfil
  público (só em `/cuidadores/me`).
- **Telefone** retornado em `GET /cuidadores/:id` só para usuários logados; a listagem
  `GET /cuidadores` não traz o telefone.
- **Senhas** guardadas com bcrypt; `senha_hash` nunca é retornado.
- **Foto de perfil** salva em `backend/uploads/` e servida em `/uploads/<arquivo>`.
- **Formações e experiências**: `ano_conclusao` e `cargo` são opcionais. Em um `PUT`, omitir o campo
  limpa o valor.

## Estrutura

```
src/
  server.js              inicia banco e servidor
  app.js                 Express, rotas e tratamento de erros
  config.js              variáveis do .env
  db/                    conexão (pg ou PGlite), schema.sql, seed, reset
  middlewares/           autenticação/permissões e tratamento de erros
  schemas/               validações (zod) de cada recurso
  routes/                um arquivo por recurso do arquivo de endpoints
    cuidadorRecursos.js  rotas aninhadas reaproveitadas (formações, experiências,
                         cidades e especializações do cuidador)
  utils/                 helpers de SQL, tokens, e-mail, usuários e perfis
```

## Envio de e-mail (recuperação de senha e confirmação de e-mail)

O backend envia dois e-mails: o link para **redefinir a senha** e o link para **confirmar o e-mail**. Os dois usam o mesmo
visual (HTML com versão em texto simples), definido em `src/utils/emailTemplate.js`.

Para ver como o e-mail fica, sem configurar nada:

```bash
npm run email:previa    # gera os arquivos HTML em uma pasta temporária e mostra o caminho; abra no navegador
```

Para o envio funcionar, preencha as variáveis `SMTP_*`, `EMAIL_REMETENTE` e `FRONTEND_URL` no `.env`. **Não é preciso usar o
e-mail pessoal de ninguém.** Escolha uma opção:

| Opção | Para quê | Chega em caixa de entrada real? |
|---|---|---|
| **Sem SMTP** (deixar `SMTP_HOST` vazio) | Desenvolvimento rápido: o link aparece no terminal do backend | Não |
| **Mailtrap** (sandbox) ou **Mailpit** (local) | Testes: o e-mail cai numa caixa de teste, que você abre no navegador | Não, e isso é o ideal para testar |
| **Gmail dedicado ao projeto** com *senha de app* | Demonstração com e-mail de verdade | Sim (limite de cerca de 500 por dia) |
| **Brevo, Resend, SendGrid ou Amazon SES** | Produção, com domínio próprio | Sim |

Gmail: crie uma conta só para o projeto (por exemplo `cuidaaqui.projeto@gmail.com`), ative a verificação em duas etapas e gere
uma *senha de app* em Conta Google > Segurança. Use `SMTP_HOST=smtp.gmail.com`, `SMTP_PORTA=587`, o e-mail em `SMTP_USUARIO` e a
senha de app em `SMTP_SENHA`. O Gmail envia sempre como o endereço da própria conta, então `EMAIL_REMETENTE` deve usar o mesmo.
Nunca coloque senhas no código nem no `.env.example`: o `.env` fica fora do Git.

O link do e-mail usa `FRONTEND_URL` (em desenvolvimento, `http://localhost:5173`, que só abre na máquina de quem está rodando o
projeto). Em produção, use o endereço público do site.


## Denúncia de comentários (moderação)

Qualquer usuário logado, exceto o autor do comentário e administradores, denuncia um comentário publicado
com um motivo (`OFENSIVO`, `FALSO`, `SPAM`, `DADOS_PESSOAIS`, `OUTRO`) e um detalhe opcional. Cada pessoa denuncia
um comentário uma única vez. A tabela é `denuncias_avaliacoes` (criada por `migracoes.sql`).

| Rota | Quem | O que faz |
| --- | --- | --- |
| `POST /api/avaliacoes/:id/denuncias` | logado | Registra a denúncia (`409` se já denunciou) |
| `GET /api/moderacao/avaliacoes?situacao=DENUNCIADAS\|OCULTAS` | ADMIN | Fila de comentários denunciados ou ocultos |
| `GET /api/moderacao/resumo` | ADMIN | Números do selo do menu |
| `POST /api/moderacao/avaliacoes/:id/decisao` | ADMIN | `OCULTAR` (denúncias viram procedentes) ou `MANTER` (viram improcedentes) |
| `PATCH /api/avaliacoes/:id/status` | ADMIN | `PUBLICADA` restaura um comentário oculto |

No site, o admin vê o selo vermelho no menu **Moderação** e decide na tela `/admin/moderacao`.

## Contratações

Uma contratação é um registro individual entre um CONTRATANTE e um CUIDADOR. O backend gera e
armazena o termo com os nomes obtidos do banco; a confirmação inicial do contratante é registrada
na criação e o cuidador confirma a mesma versão do documento.

| Rota | Acesso | O que faz |
| --- | --- | --- |
| `GET /api/contratacoes/termo?cuidador_id=123` | CONTRATANTE | Gera a prévia do termo oficial para leitura; não cria uma contratação. |
| `POST /api/contratacoes` | CONTRATANTE | Cria a contratação. Corpo: `{ "cuidador_id": 123, "aceite_termo": true }`. |
| `GET /api/contratacoes?status=&pagina=&limite=` | CONTRATANTE ou CUIDADOR | Lista somente contratações das quais a pessoa autenticada participa. |
| `GET /api/contratacoes/:contratacaoId` | Participante | Consulta os detalhes e o termo histórico da contratação. |
| `PATCH /api/contratacoes/:contratacaoId/confirmacao` | CUIDADOR participante | Confirma o termo e move para `CONFIRMADA`. |
| `PATCH /api/contratacoes/:contratacaoId/realizacao` | CUIDADOR participante | Informa a realização e move para `AGUARDANDO_CONFIRMACAO_CONTRATANTE`. |
| `PATCH /api/contratacoes/:contratacaoId/confirmacao-realizacao` | CONTRATANTE participante | Confirma a realização e move para `CONCLUIDA`. |

`GET /api/contratacoes/termo` recebe `cuidador_id` na query e retorna
`termo_conteudo`, `termo_versao` e `termo_gerado_em`. A prévia não cria um registro.
O `POST /api/contratacoes` retorna `201` com o registro criado; demais consultas e
transições retornam `200`. As transições não recebem dados no corpo: a identidade e
o papel do usuário autenticado definem quem pode realizá-las.

O fluxo de status é `AGUARDANDO_CONFIRMACAO_CUIDADOR` → `CONFIRMADA` →
`AGUARDANDO_CONFIRMACAO_CONTRATANTE` → `CONCLUIDA`. Transições usam atualizações condicionais
no banco; confirmações repetidas ou fora de ordem retornam conflito. Valores, datas agendadas,
horários e condições comerciais não são armazenados pela plataforma.

Erros possíveis: `400` para query, identificador ou corpo inválido; `401` para ausência de sessão
válida; `403` para tipo de usuário sem permissão; `404` para cuidador ativo inexistente ou recurso
fora do escopo do usuário; `409` para transição inválida/repetida. Os erros usam
`{ "erro": "mensagem" }`; erros de validação também podem incluir `detalhes`.

### Avaliações por contratação

Uma avaliação nova exige uma contratação `CONCLUIDA`, e a contratação deve pertencer ao contratante autenticado
e ao cuidador da rota. Cada contratação aceita uma única avaliação, inclusive após sua inativação; o mesmo par
de usuários pode avaliar serviços diferentes. Avaliações antigas permanecem sem `contratacao_id` e continuam
aparecendo normalmente.

| Rota | Acesso | O que faz |
| --- | --- | --- |
| `POST /api/cuidadores/:cuidadorId/avaliacoes` | CONTRATANTE | Cria avaliação. Corpo: `{ "contratacao_id": 123, "nota": 5, "comentario": "..." }`. |
| `GET /api/cuidadores/:cuidadorId/avaliacoes/minha?contratacao_id=123` | CONTRATANTE participante | Consulta a avaliação daquela contratação; retorna `null` se ainda não existir. Sem o parâmetro, consulta a avaliação histórica sem serviço associado. |
| `GET /api/contratacoes` e `GET /api/contratacoes/:contratacaoId` | Participante | Inclui `avaliacao_id` e `avaliacao_status` para indicar se o serviço já foi avaliado. |

O cadastro retorna `201`; leitura, edição e moderação retornam `200`; exclusão lógica feita
pelo autor retorna `204`. O backend responde `400` para nota/comentário/parâmetros inválidos
ou cuidador incompatível, `401` sem autenticação, `403` sem permissão, `404` para recurso
inexistente/fora do escopo e `409` se o serviço não estiver concluído ou já tiver avaliação.
Respostas do cuidador podem ser criadas, editadas, inativadas e reativadas nas rotas
`/api/avaliacoes/:avaliacaoId/resposta`; o ADMIN pode alterar seu status em
`PATCH /api/avaliacoes/:avaliacaoId/resposta/status`.

Exemplo de criação:

```http
POST /api/cuidadores/42/avaliacoes
Authorization: Bearer <token>
Content-Type: application/json

{
  "contratacao_id": 123,
  "nota": 5,
  "comentario": "Atendimento atencioso e cuidadoso."
}
```

Resposta `201 Created` (campos de data e edição podem variar):

```json
{
  "id": 456,
  "contratacao_id": 123,
  "cuidador_id": 42,
  "contratante_id": 7,
  "contratante_nome": "João da Silva",
  "nota": 5,
  "comentario": "Atendimento atencioso e cuidadoso.",
  "status": "PUBLICADA",
  "dentro_do_prazo": true,
  "segundos_para_editar": 600,
  "resposta": null
}
```

## Produção

- `NODE_ENV=production` recusa subir sem `JWT_SECRET` forte, `SMTP_HOST`, `EMAIL_REMETENTE`, `FRONTEND_URL` e com a `ADMIN_SENHA` de exemplo.
- O cookie de sessão é `Secure` e `SameSite=Strict`: o site e a API precisam estar em **HTTPS e no mesmo domínio**
  (um proxy reverso serve o `frontend/dist` e encaminha `/api` e `/uploads` para a API). Em `http://localhost` o navegador não guarda o cookie.
- Atrás de proxy, defina `TRUST_PROXY=1`. Use `DATABASE_URL` (PostgreSQL); o PGlite é só para desenvolvimento.
- Envio de foto: o servidor confere os primeiros bytes do arquivo (JPG, PNG ou WEBP), não só o tipo informado pelo navegador.
