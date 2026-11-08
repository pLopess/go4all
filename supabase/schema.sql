-- Picks do Cupom ativo (compartilhado em tempo real entre todos)
CREATE TABLE cupom_picks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id TEXT NOT NULL,
  home_team TEXT NOT NULL,
  away_team TEXT NOT NULL,
  market_type TEXT NOT NULL,      -- '1X2' | 'BTTS' | 'OVER_UNDER' | 'DUPLA_CHANCE' | 'HANDICAP'
  selection TEXT NOT NULL,        -- 'home' | 'draw' | 'away' | 'sim' | 'nao' | 'over' | 'under'
  selection_label TEXT NOT NULL,  -- 'Brasil ganha' | 'Empate' | 'Ambas marcam' | etc
  odd DECIMAL(6,2) NOT NULL,
  added_by TEXT NOT NULL,         -- nome do membro
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Propostas criadas a partir do cupom
CREATE TABLE proposals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  proposed_by TEXT NOT NULL,
  status TEXT DEFAULT 'voting',   -- 'voting' | 'approved' | 'rejected' | 'placed' | 'won' | 'lost' | 'void'
  combined_odd DECIMAL(8,2) NOT NULL,
  amount DECIMAL(8,2),
  potential_return DECIMAL(8,2),
  result_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Snapshot das picks de cada proposta
CREATE TABLE proposal_picks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  proposal_id UUID REFERENCES proposals(id) ON DELETE CASCADE,
  game_id TEXT NOT NULL,
  home_team TEXT NOT NULL,
  away_team TEXT NOT NULL,
  market_type TEXT NOT NULL,
  selection TEXT NOT NULL,
  selection_label TEXT NOT NULL,
  odd DECIMAL(6,2) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Votos por proposta
CREATE TABLE votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  proposal_id UUID REFERENCES proposals(id) ON DELETE CASCADE,
  member_name TEXT NOT NULL,
  vote TEXT NOT NULL,  -- 'yes' | 'no'
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(proposal_id, member_name)
);

-- Movimentações da banca
CREATE TABLE bankroll_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  proposal_id UUID REFERENCES proposals(id) ON DELETE SET NULL,
  type TEXT NOT NULL,             -- 'initial' | 'bet' | 'win' | 'loss' | 'void_refund'
  amount DECIMAL(8,2) NOT NULL,   -- positivo = entrada, negativo = saída
  balance_after DECIMAL(8,2) NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Cache de análises do Gemini
CREATE TABLE ai_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cache_key TEXT UNIQUE NOT NULL,
  response JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL
);

-- Sessões ativas por dispositivo
CREATE TABLE active_sessions (
  member_name TEXT PRIMARY KEY,           -- 'Lopes' | 'Carlos' | 'Igor' | 'Mouse'
  device_id   TEXT NOT NULL,              -- UUID gerado no localStorage
  last_seen   TIMESTAMPTZ DEFAULT now()   -- atualizado a cada 10 min pelo app
);

-- HABILITAR REALTIME
DROP PUBLICATION IF EXISTS supabase_realtime;
CREATE PUBLICATION supabase_realtime;
ALTER PUBLICATION supabase_realtime ADD TABLE cupom_picks;
ALTER PUBLICATION supabase_realtime ADD TABLE proposals;
ALTER PUBLICATION supabase_realtime ADD TABLE votes;
ALTER PUBLICATION supabase_realtime ADD TABLE active_sessions;

-- POLÍTICAS DE SEGURANÇA (RLS)
ALTER TABLE cupom_picks ENABLE ROW LEVEL SECURITY;
ALTER TABLE proposals ENABLE ROW LEVEL SECURITY;
ALTER TABLE proposal_picks ENABLE ROW LEVEL SECURITY;
ALTER TABLE votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE bankroll_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE active_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow anon full access to cupom_picks" ON cupom_picks FOR ALL USING (true);
CREATE POLICY "Allow anon full access to proposals" ON proposals FOR ALL USING (true);
CREATE POLICY "Allow anon full access to proposal_picks" ON proposal_picks FOR ALL USING (true);
CREATE POLICY "Allow anon full access to votes" ON votes FOR ALL USING (true);
CREATE POLICY "Allow anon full access to bankroll_transactions" ON bankroll_transactions FOR ALL USING (true);
CREATE POLICY "Allow anon full access to ai_cache" ON ai_cache FOR ALL USING (true);
CREATE POLICY "Allow anon full access to active_sessions" ON active_sessions FOR ALL USING (true);

-- SEED DE DADOS INICIAIS
INSERT INTO bankroll_transactions (type, amount, balance_after, description)
VALUES ('initial', 138.25, 138.25, 'Saldo atual do grupo — histórico anterior a inserir');
