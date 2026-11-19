-- Alterações feitas depois do schema.sql. Rodam a cada inicialização, então
-- precisam ser seguras para executar várias vezes e não podem apagar dados.

-- Contas do Google não têm senha: toda conta precisa de pelo menos uma das credenciais.
ALTER TABLE usuarios ALTER COLUMN senha_hash DROP NOT NULL;
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS google_sub VARCHAR(255);

ALTER TABLE usuarios DROP CONSTRAINT IF EXISTS chk_usuarios_credencial;
ALTER TABLE usuarios ADD CONSTRAINT chk_usuarios_credencial
    CHECK (senha_hash IS NOT NULL OR google_sub IS NOT NULL);

CREATE UNIQUE INDEX IF NOT EXISTS uq_usuarios_google_sub
    ON usuarios (google_sub);

-- Sessões de login. O token do cookie nunca é salvo, só o hash SHA-256 dele.
CREATE TABLE IF NOT EXISTS sessoes (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    usuario_id BIGINT NOT NULL REFERENCES usuarios (id) ON DELETE CASCADE,
    token_hash CHAR(64) NOT NULL UNIQUE,
    token_hash_anterior CHAR(64),
    rotacionado_em TIMESTAMPTZ,
    expira_em TIMESTAMPTZ NOT NULL,
    revogada_em TIMESTAMPTZ,
    criado_em TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_sessoes_usuario ON sessoes (usuario_id);
CREATE INDEX IF NOT EXISTS idx_sessoes_token_anterior ON sessoes (token_hash_anterior);
CREATE INDEX IF NOT EXISTS idx_sessoes_expira_em ON sessoes (expira_em);

-- Data em que o dono da conta confirmou o e-mail. O Google já confirma o e-mail de quem entra por ele.
-- Marca as contas do Google só ao criar a coluna: depois disso, trocar o e-mail zera a confirmação,
-- e repetir a marcação a cada inicialização desfaria isso.
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = current_schema() AND table_name = 'usuarios' AND column_name = 'email_verificado_em'
    ) THEN
        ALTER TABLE usuarios ADD COLUMN email_verificado_em TIMESTAMPTZ;
        UPDATE usuarios SET email_verificado_em = CURRENT_TIMESTAMP WHERE google_sub IS NOT NULL;
    END IF;
END $$;

-- Tokens dos links enviados por e-mail. O token nunca é salvo, só o hash SHA-256 dele, e a linha
-- é apagada no uso. O e-mail de destino fica junto: o link deixa de valer se a conta trocar de e-mail.
CREATE TABLE IF NOT EXISTS tokens_email (
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

CREATE INDEX IF NOT EXISTS idx_tokens_email_usuario ON tokens_email (usuario_id);
CREATE INDEX IF NOT EXISTS idx_tokens_email_expira_em ON tokens_email (expira_em);

-- Dados opcionais exibidos no perfil do cuidador.
ALTER TABLE formacoes_cursos ADD COLUMN IF NOT EXISTS ano_conclusao SMALLINT;
ALTER TABLE experiencias_profissionais ADD COLUMN IF NOT EXISTS cargo VARCHAR(120);

-- Denúncias de comentários: qualquer usuário logado (menos o autor) pode denunciar; o admin decide.
CREATE TABLE IF NOT EXISTS denuncias_avaliacoes (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    avaliacao_id BIGINT NOT NULL REFERENCES avaliacoes_cuidadores(id) ON DELETE CASCADE,
    denunciante_id BIGINT NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    motivo VARCHAR(20) NOT NULL,
    detalhe VARCHAR(300),
    status VARCHAR(20) NOT NULL DEFAULT 'ABERTA',
    resolvida_por BIGINT REFERENCES usuarios(id) ON DELETE SET NULL,
    resolvida_em TIMESTAMP WITH TIME ZONE,
    criado_em TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_denuncias_motivo CHECK (motivo IN ('OFENSIVO', 'SPAM', 'FALSO', 'DADOS_PESSOAIS', 'OUTRO')),
    CONSTRAINT chk_denuncias_status CHECK (status IN ('ABERTA', 'PROCEDENTE', 'IMPROCEDENTE')),
    CONSTRAINT uq_denuncias_avaliacao_denunciante UNIQUE (avaliacao_id, denunciante_id)
);
CREATE INDEX IF NOT EXISTS idx_denuncias_abertas ON denuncias_avaliacoes (avaliacao_id) WHERE status = 'ABERTA';

-- Contratacoes individuais: mantem o termo e as confirmacoes como historico imutavel.
CREATE TABLE IF NOT EXISTS contratacoes (
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

CREATE INDEX IF NOT EXISTS idx_contratacoes_contratante_status_criado
    ON contratacoes (contratante_id, status, criado_em DESC);

CREATE INDEX IF NOT EXISTS idx_contratacoes_cuidador_status_criado
    ON contratacoes (cuidador_id, status, criado_em DESC);

-- Avaliações antigas permanecem sem contratação. Novas avaliações são vinculadas ao serviço.
ALTER TABLE avaliacoes_cuidadores
    ADD COLUMN IF NOT EXISTS contratacao_id BIGINT;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'fk_avaliacoes_contratacao'
          AND conrelid = 'avaliacoes_cuidadores'::regclass
    ) THEN
        ALTER TABLE avaliacoes_cuidadores
            ADD CONSTRAINT fk_avaliacoes_contratacao
            FOREIGN KEY (contratacao_id)
            REFERENCES contratacoes(id)
            ON DELETE RESTRICT;
    END IF;
END $$;

-- Remove a unicidade por par, que impediria avaliações de contratações diferentes.
DROP INDEX IF EXISTS uq_avaliacoes_contratante_cuidador;

-- Mantém a regra histórica entre avaliações sem contratação, sem bloquear avaliações por serviço.
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM avaliacoes_cuidadores
        WHERE contratacao_id IS NULL AND status <> 'INATIVA'
        GROUP BY contratante_id, cuidador_id
        HAVING COUNT(*) > 1
    ) THEN
        RAISE WARNING 'Há avaliações legadas repetidas do mesmo contratante para o cuidador: índice de legado não criado.';
    ELSE
        CREATE UNIQUE INDEX IF NOT EXISTS uq_avaliacoes_legadas_contratante_cuidador
            ON avaliacoes_cuidadores (contratante_id, cuidador_id)
            WHERE contratacao_id IS NULL AND status <> 'INATIVA';
    END IF;
END $$;

-- A unicidade vale também para avaliações INATIVAS, reservando uma avaliação por contratação.
CREATE UNIQUE INDEX IF NOT EXISTS uq_avaliacoes_contratacao
    ON avaliacoes_cuidadores (contratacao_id)
    WHERE contratacao_id IS NOT NULL;
