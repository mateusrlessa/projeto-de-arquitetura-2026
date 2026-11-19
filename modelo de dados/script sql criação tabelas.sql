-- ============================================================
-- 0. CRIACAO DOS TIPOS ENUM
-- ============================================================

-- Status específicos para contas de usuarios.
CREATE TYPE status_usuario_enum AS ENUM (
    'ATIVO',
    'INATIVO',
    'BLOQUEADO'
);

-- Status para os demais registros do sistema.
CREATE TYPE status_registro_enum AS ENUM (
    'ATIVO',
    'INATIVO'
);


-- ============================================================
-- 1. TABELA DE USUARIOS
-- ============================================================

CREATE TABLE usuarios (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,

    nome_completo VARCHAR(150) NOT NULL,

    email VARCHAR(254) NOT NULL,

    senha_hash VARCHAR(255) NOT NULL,

    tipo_usuario VARCHAR(20) NOT NULL,

    foto_perfil_storage_key VARCHAR(500),

    status status_usuario_enum NOT NULL DEFAULT 'ATIVO',

    bloqueado_em TIMESTAMP WITH TIME ZONE,

    motivo_bloqueio TEXT,

    criado_em TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,

    atualizado_em TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT chk_usuarios_tipo
        CHECK (tipo_usuario IN ('CUIDADOR', 'CONTRATANTE', 'ADMIN')),

    CONSTRAINT chk_usuarios_email
        CHECK (email = BTRIM(email))
);

-- Impede o cadastro de e-mails duplicados,
-- independentemente de letras maiusculas ou minusculas.
CREATE UNIQUE INDEX uq_usuarios_email
    ON usuarios (LOWER(email));


-- ============================================================
-- 2. TABELA DE ESTADOS
-- ============================================================

CREATE TABLE estados (
    uf VARCHAR(2) PRIMARY KEY,

    nome VARCHAR(60) NOT NULL UNIQUE,

    status status_registro_enum NOT NULL DEFAULT 'ATIVO',

    criado_em TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,

    atualizado_em TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT chk_estados_uf
        CHECK (uf ~ '^[A-Z]{2}$')
);


-- ============================================================
-- 3. TABELA DE CIDADES
-- ============================================================

CREATE TABLE cidades (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,

    codigo_ibge VARCHAR(7) NOT NULL UNIQUE,

    nome VARCHAR(120) NOT NULL,

    uf VARCHAR(2) NOT NULL,

    status status_registro_enum NOT NULL DEFAULT 'ATIVO',

    criado_em TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,

    atualizado_em TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_cidades_estados
        FOREIGN KEY (uf)
        REFERENCES estados(uf)
        ON DELETE RESTRICT,

    CONSTRAINT uq_cidades_nome_uf
        UNIQUE (nome, uf),

    CONSTRAINT chk_cidades_codigo_ibge
        CHECK (codigo_ibge ~ '^[0-9]{7}$')
);


-- ============================================================
-- 4. TABELA DE ESPECIALIZACOES
-- ============================================================

CREATE TABLE especializacoes (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,

    nome VARCHAR(120) NOT NULL UNIQUE,

    descricao TEXT,

    status status_registro_enum NOT NULL DEFAULT 'ATIVO',

    criado_em TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,

    atualizado_em TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);


-- ============================================================
-- 5. TABELA DE PERFIS DOS CUIDADORES
-- ============================================================

CREATE TABLE perfis_cuidadores (
    usuario_id BIGINT PRIMARY KEY,

    cpf VARCHAR(11) NOT NULL UNIQUE,

    telefone_whatsapp VARCHAR(20) NOT NULL,

    anos_experiencia SMALLINT NOT NULL,

    funcao VARCHAR(120) NOT NULL,

    sobre_mim TEXT,

    status status_registro_enum NOT NULL DEFAULT 'ATIVO',

    criado_em TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,

    atualizado_em TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_perfis_cuidadores_usuarios
        FOREIGN KEY (usuario_id)
        REFERENCES usuarios(id)
        ON DELETE RESTRICT,

    CONSTRAINT chk_cuidadores_anos_experiencia
        CHECK (anos_experiencia >= 0),

    CONSTRAINT chk_cuidadores_cpf
        CHECK (cpf ~ '^[0-9]{11}$')
);


-- ============================================================
-- 6. TABELA DE FORMACOES E CURSOS
-- ============================================================

CREATE TABLE formacoes_cursos (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,

    cuidador_id BIGINT NOT NULL,

    nome_instituicao VARCHAR(180) NOT NULL,

    nome_curso VARCHAR(180) NOT NULL,

    status status_registro_enum NOT NULL DEFAULT 'ATIVO',

    criado_em TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,

    atualizado_em TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_formacoes_cuidador
        FOREIGN KEY (cuidador_id)
        REFERENCES perfis_cuidadores(usuario_id)
        ON DELETE RESTRICT
);


-- ============================================================
-- 7. TABELA DE EXPERIENCIAS PROFISSIONAIS
-- ============================================================

CREATE TABLE experiencias_profissionais (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,

    cuidador_id BIGINT NOT NULL,

    nome_local_trabalho VARCHAR(180) NOT NULL,

    descricao TEXT,

    ano_inicio SMALLINT NOT NULL,

    ano_fim SMALLINT,

    status status_registro_enum NOT NULL DEFAULT 'ATIVO',

    criado_em TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,

    atualizado_em TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_experiencias_cuidador
        FOREIGN KEY (cuidador_id)
        REFERENCES perfis_cuidadores(usuario_id)
        ON DELETE RESTRICT,

    CONSTRAINT chk_experiencias_periodo
        CHECK (
            ano_fim IS NULL
            OR ano_fim >= ano_inicio
        )
);


-- ============================================================
-- 8. TABELA DE RELACIONAMENTO CUIDADOR X CIDADES
-- ============================================================

CREATE TABLE cuidador_cidades (
    cuidador_id BIGINT NOT NULL,

    cidade_id BIGINT NOT NULL,

    status status_registro_enum NOT NULL DEFAULT 'ATIVO',

    criado_em TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,

    atualizado_em TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (cuidador_id, cidade_id),

    CONSTRAINT fk_cuidador_cidades_perfil
        FOREIGN KEY (cuidador_id)
        REFERENCES perfis_cuidadores(usuario_id)
        ON DELETE RESTRICT,

    CONSTRAINT fk_cuidador_cidades_cidade
        FOREIGN KEY (cidade_id)
        REFERENCES cidades(id)
        ON DELETE RESTRICT
);


-- ============================================================
-- 9. TABELA DE RELACIONAMENTO CUIDADOR X ESPECIALIZACOES
-- ============================================================

CREATE TABLE cuidador_especializacoes (
    cuidador_id BIGINT NOT NULL,

    especializacao_id BIGINT NOT NULL,

    status status_registro_enum NOT NULL DEFAULT 'ATIVO',

    criado_em TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,

    atualizado_em TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (cuidador_id, especializacao_id),

    CONSTRAINT fk_cuidador_especializacoes_perfil
        FOREIGN KEY (cuidador_id)
        REFERENCES perfis_cuidadores(usuario_id)
        ON DELETE RESTRICT,

    CONSTRAINT fk_cuidador_especializacoes_especializacao
        FOREIGN KEY (especializacao_id)
        REFERENCES especializacoes(id)
        ON DELETE RESTRICT
);


-- ============================================================
-- 10. ENUM DE STATUS DAS AVALIACOES
-- ============================================================

CREATE TYPE status_avaliacao_enum AS ENUM (
    'PUBLICADA',
    'OCULTA',
    'INATIVA'
);


-- ============================================================
-- 11. TABELA DE AVALIACOES DOS CUIDADORES
-- ============================================================

CREATE TABLE avaliacoes_cuidadores (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,

    contratante_id BIGINT NOT NULL,

    cuidador_id BIGINT NOT NULL,

    nota SMALLINT NOT NULL,

    comentario VARCHAR(500) NOT NULL,

    status status_avaliacao_enum NOT NULL DEFAULT 'PUBLICADA',

    criado_em TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,

    atualizado_em TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_avaliacoes_contratante
        FOREIGN KEY (contratante_id)
        REFERENCES usuarios(id)
        ON DELETE RESTRICT,

    CONSTRAINT fk_avaliacoes_cuidador
        FOREIGN KEY (cuidador_id)
        REFERENCES perfis_cuidadores(usuario_id)
        ON DELETE RESTRICT,

    CONSTRAINT chk_avaliacoes_nota
        CHECK (nota BETWEEN 1 AND 5),

    CONSTRAINT chk_avaliacoes_comentario
        CHECK (
            CHAR_LENGTH(BTRIM(comentario)) BETWEEN 1 AND 500
        ),

    CONSTRAINT chk_avaliacoes_autoria
        CHECK (contratante_id <> cuidador_id)
);


-- ============================================================
-- 12. TABELA DE RESPOSTAS DAS AVALIACOES
-- ============================================================

CREATE TABLE respostas_avaliacoes (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,

    avaliacao_id BIGINT NOT NULL UNIQUE,

    resposta VARCHAR(500) NOT NULL,

    status status_registro_enum NOT NULL DEFAULT 'ATIVO',

    criado_em TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,

    atualizado_em TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_respostas_avaliacao
        FOREIGN KEY (avaliacao_id)
        REFERENCES avaliacoes_cuidadores(id)
        ON DELETE RESTRICT,

    CONSTRAINT chk_respostas_avaliacoes_texto
        CHECK (
            CHAR_LENGTH(BTRIM(resposta)) BETWEEN 1 AND 500
        )
);


-- ============================================================
-- 13. INDICES DAS AVALIACOES E RESPOSTAS
-- ============================================================

-- Pesquisa das avaliacoes de um cuidador.
CREATE INDEX idx_avaliacoes_cuidador_status
    ON avaliacoes_cuidadores(cuidador_id, status, criado_em DESC);


-- Consulta das avaliacoes escritas por um contratante.
CREATE INDEX idx_avaliacoes_contratante
    ON avaliacoes_cuidadores(contratante_id, criado_em DESC);


-- Pesquisa das respostas de uma avaliacao.
CREATE INDEX idx_respostas_avaliacao_status
    ON respostas_avaliacoes(avaliacao_id, status);

-- ============================================================
-- 14. INDICES ADICIONAIS
-- ============================================================

-- Pesquisa de usuarios por tipo e status.
CREATE INDEX idx_usuarios_tipo_status
    ON usuarios(tipo_usuario, status);


-- Pesquisa de perfis de cuidadores por status.
CREATE INDEX idx_perfis_cuidadores_status
    ON perfis_cuidadores(status);


-- Consulta das formacoes ativas de um cuidador.
CREATE INDEX idx_formacoes_cuidador_status
    ON formacoes_cursos(cuidador_id, status);


-- Consulta das experiencias ativas de um cuidador.
CREATE INDEX idx_experiencias_cuidador_status
    ON experiencias_profissionais(cuidador_id, status);


-- Pesquisa de cuidadores ativos por cidade.
CREATE INDEX idx_cuidador_cidades_cidade
    ON cuidador_cidades(cidade_id, cuidador_id)
    WHERE status = 'ATIVO';


-- Pesquisa de cuidadores ativos por especializacao.
CREATE INDEX idx_cuidador_especializacoes_especializacao
    ON cuidador_especializacoes(especializacao_id, cuidador_id)
    WHERE status = 'ATIVO';


-- ============================================================
-- 15. CONTRATACOES DE SERVICOS
-- ============================================================

CREATE TABLE contratacoes (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    contratante_id BIGINT NOT NULL REFERENCES usuarios(id) ON DELETE RESTRICT,
    cuidador_id BIGINT NOT NULL REFERENCES perfis_cuidadores(usuario_id) ON DELETE RESTRICT,
    termo_conteudo TEXT NOT NULL,
    termo_versao VARCHAR(20) NOT NULL,
    termo_gerado_em TIMESTAMP WITH TIME ZONE NOT NULL,
    contratante_confirmado_em TIMESTAMP WITH TIME ZONE NOT NULL,
    cuidador_confirmado_em TIMESTAMP WITH TIME ZONE,
    cuidador_informou_realizacao_em TIMESTAMP WITH TIME ZONE,
    contratante_confirmou_realizacao_em TIMESTAMP WITH TIME ZONE,
    status VARCHAR(48) NOT NULL DEFAULT 'AGUARDANDO_CONFIRMACAO_CUIDADOR',
    criado_em TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    atualizado_em TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT chk_contratacoes_partes
        CHECK (contratante_id <> cuidador_id),

    CONSTRAINT chk_contratacoes_status
        CHECK (status IN (
            'AGUARDANDO_CONFIRMACAO_CUIDADOR',
            'CONFIRMADA',
            'AGUARDANDO_CONFIRMACAO_CONTRATANTE',
            'CONCLUIDA'
        )),

    CONSTRAINT chk_contratacoes_etapa
        CHECK (
            (status = 'AGUARDANDO_CONFIRMACAO_CUIDADOR'
                AND cuidador_confirmado_em IS NULL
                AND cuidador_informou_realizacao_em IS NULL
                AND contratante_confirmou_realizacao_em IS NULL)
            OR
            (status = 'CONFIRMADA'
                AND cuidador_confirmado_em IS NOT NULL
                AND cuidador_informou_realizacao_em IS NULL
                AND contratante_confirmou_realizacao_em IS NULL)
            OR
            (status = 'AGUARDANDO_CONFIRMACAO_CONTRATANTE'
                AND cuidador_confirmado_em IS NOT NULL
                AND cuidador_informou_realizacao_em IS NOT NULL
                AND contratante_confirmou_realizacao_em IS NULL)
            OR
            (status = 'CONCLUIDA'
                AND cuidador_confirmado_em IS NOT NULL
                AND cuidador_informou_realizacao_em IS NOT NULL
                AND contratante_confirmou_realizacao_em IS NOT NULL)
        )
);

CREATE INDEX idx_contratacoes_contratante_status_criado
    ON contratacoes (contratante_id, status, criado_em DESC);

CREATE INDEX idx_contratacoes_cuidador_status_criado
    ON contratacoes (cuidador_id, status, criado_em DESC);

-- Avaliações novas ficam vinculadas a um serviço; registros antigos permanecem válidos.
ALTER TABLE avaliacoes_cuidadores
    ADD COLUMN contratacao_id BIGINT;

ALTER TABLE avaliacoes_cuidadores
    ADD CONSTRAINT fk_avaliacoes_contratacao
    FOREIGN KEY (contratacao_id)
    REFERENCES contratacoes(id)
    ON DELETE RESTRICT;

CREATE UNIQUE INDEX uq_avaliacoes_legadas_contratante_cuidador
    ON avaliacoes_cuidadores (contratante_id, cuidador_id)
    WHERE contratacao_id IS NULL AND status <> 'INATIVA';

CREATE UNIQUE INDEX uq_avaliacoes_contratacao
    ON avaliacoes_cuidadores (contratacao_id)
    WHERE contratacao_id IS NOT NULL;


-- ============================================================
-- LOGIN COM GOOGLE E SESSOES
-- O backend aplica estes comandos em backend/src/db/migracoes.sql.
-- ============================================================

-- Contas do Google nao tem senha: toda conta precisa de pelo menos uma das credenciais.
ALTER TABLE usuarios ALTER COLUMN senha_hash DROP NOT NULL;
ALTER TABLE usuarios ADD COLUMN google_sub VARCHAR(255);

ALTER TABLE usuarios ADD CONSTRAINT chk_usuarios_credencial
    CHECK (senha_hash IS NOT NULL OR google_sub IS NOT NULL);

CREATE UNIQUE INDEX uq_usuarios_google_sub
    ON usuarios (google_sub);

-- Sessoes de login. O token do cookie nunca e salvo, so o hash SHA-256 dele.
CREATE TABLE sessoes (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    usuario_id BIGINT NOT NULL REFERENCES usuarios (id) ON DELETE CASCADE,
    token_hash CHAR(64) NOT NULL UNIQUE,
    token_hash_anterior CHAR(64),
    rotacionado_em TIMESTAMPTZ,
    expira_em TIMESTAMPTZ NOT NULL,
    revogada_em TIMESTAMPTZ,
    criado_em TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_sessoes_usuario ON sessoes (usuario_id);
CREATE INDEX idx_sessoes_token_anterior ON sessoes (token_hash_anterior);
CREATE INDEX idx_sessoes_expira_em ON sessoes (expira_em);


-- ============================================================
-- CONFIRMACAO DE E-MAIL E RECUPERACAO DE SENHA
-- O backend aplica estes comandos em backend/src/db/migracoes.sql.
-- ============================================================

-- Data em que o dono da conta confirmou o e-mail. O Google ja confirma o e-mail de quem entra por ele.
ALTER TABLE usuarios ADD COLUMN email_verificado_em TIMESTAMPTZ;
UPDATE usuarios SET email_verificado_em = CURRENT_TIMESTAMP WHERE google_sub IS NOT NULL;

-- Tokens dos links enviados por e-mail. O token nunca e salvo, so o hash SHA-256 dele, e a linha
-- e apagada no uso. O e-mail de destino fica junto: o link deixa de valer se a conta trocar de e-mail.
CREATE TABLE tokens_email (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    usuario_id BIGINT NOT NULL REFERENCES usuarios (id) ON DELETE CASCADE,
    finalidade VARCHAR(20) NOT NULL,
    token_hash CHAR(64) NOT NULL UNIQUE,
    email VARCHAR(254) NOT NULL,
    expira_em TIMESTAMPTZ NOT NULL,
    criado_em TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT chk_tokens_email_finalidade
        CHECK (finalidade IN ('VERIFICAR_EMAIL', 'RECUPERAR_SENHA'))
);

CREATE INDEX idx_tokens_email_usuario ON tokens_email (usuario_id);
CREATE INDEX idx_tokens_email_expira_em ON tokens_email (expira_em);


-- ============================================================
-- DADOS OPCIONAIS DO PERFIL DO CUIDADOR
-- O backend aplica estes comandos em backend/src/db/migracoes.sql.
-- ============================================================

ALTER TABLE formacoes_cursos ADD COLUMN ano_conclusao SMALLINT;
ALTER TABLE experiencias_profissionais ADD COLUMN cargo VARCHAR(120);


-- exemplo consulta de "cidade - uf" para campo pesquisa: 

SELECT
    c.id,
    c.nome || ' - ' || e.uf AS cidade_estado
FROM cidades c
INNER JOIN estados e
    ON e.uf = c.uf
WHERE c.nome ILIKE '%' || $1 || '%'
ORDER BY c.nome, e.uf
LIMIT 10;

-- exemplo consulta de cuidadores

SELECT DISTINCT
    u.id,
    u.nome_completo,
    u.foto_perfil_storage_key,
    pc.telefone_whatsapp,
    pc.funcao,
    pc.anos_experiencia,
    pc.sobre_mim,
    c.nome AS cidade,
    e.uf
FROM usuarios u

INNER JOIN perfis_cuidadores pc
    ON pc.usuario_id = u.id

INNER JOIN cuidador_cidades cc
    ON cc.cuidador_id = pc.usuario_id

INNER JOIN cidades c
    ON c.id = cc.cidade_id

INNER JOIN estados e
    ON e.uf = c.uf

WHERE
    u.tipo_usuario = 'CUIDADOR'
    AND c.nome = 'Fortaleza'
    AND e.uf = 'CE'

ORDER BY u.nome_completo;


