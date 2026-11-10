# ⚽ GO4ALL — Bolão Democrático & Gestão de Apostas Coletivas

> **Plataforma Full Stack de apostas em grupo, governança democrática de banca, previsões em tempo real e leitura automatizada de bilhetes com Inteligência Artificial Multimodal.**

🌐 **Aplicação em Produção:** [https://go4all.vercel.app](https://go4all.vercel.app)

---

## 📌 Visão Geral do Projeto

O **GO4ALL** nasceu para solucionar um problema real de coordenação em grupos de amigos que apostam juntos: desorganização no controle de banca, falta de consenso nas entradas e fricção no cadastro manual de bilhetes complexos.

A plataforma combina dados esportivos em tempo real, votação com quorum democrático, palpites de placar entre membros e extração inteligente de bilhetes de apostas a partir de capturas de tela usando IA.

---

## 🚀 Tecnologias Utilizadas

- **Frontend & Full Stack Framework:** [Next.js](https://nextjs.org) (App Router, Server Actions, Server-Side Rendering)
- **Linguagem:** TypeScript
- **Estilização & UI:** Tailwind CSS, Lucide Icons, Glassmorphism design system
- **Backend & Database:** [Supabase](https://supabase.com) (PostgreSQL, Realtime WebSocket Channels, Row Level Security)
- **Inteligência Artificial:** Google Gemini Multimodal Vision API (`gemini-2.5-flash`)
- **Dados Esportivos:** [The Odds API](https://the-odds-api.com) (Odds e cronograma de partidas da Copa do Mundo / futebol internacional)

---

## 🤖 Engenharia com IA: Como o Antigravity foi Utilizado e Conduzido

Este projeto foi desenvolvido utilizando o **Antigravity** (Google DeepMind) como agente parceiro de programação (*pair programmer*). Mais do que gerar código avulso, o desenvolvimento seguiu princípios claros de **direcionamento de agente**:

1. **Desenvolvimento Orientado a Especificações (*Spec-Driven Development*):**
   - O projeto foi fatiado em ciclos fechados de entrega: Modelagem relacional -> Sincronização Realtime -> Integração Multimodal -> Refatoração de UX/UI.
   - O agente recebia limites claros de contexto e regras de negócio antes de qualquer alteração de código.

2. **Engenharia de Prompt para Visão Multimodal (OCR Esportivo):**
   - Condução e refinamento de prompts para o **Gemini Flash** ler prints de casas de apostas (Betano/Bet365), isolar odds, mercados e identificar automaticamente os times envolvidos, retornando payloads JSON estritamente validados.

3. **Depuração e Investigação Colaborativa:**
   - Uso do agente para rastrear discrepâncias de fuso horário (UTC vs. LocalTime) entre respostas de APIs externas e renderização no servidor Next.js.

---

## 💡 Decisões Próprias do Desenvolvedor (Liderança Técnica & Produto)

Embora o Antigravity tenha atuado na execução técnica, as seguintes decisões estruturais e de produto foram tomadas **exclusivamente pelo desenvolvedor**:

* **Pivot de Engajamento (Enquete de Vencedor ➔ Palpite de Placar):**
  Identifiquei que a enquete binária ("Quem vai vencer?") gerava pouco engajamento. Decidi transformar a mecânica em um painel gamificado de palpites de placar exato, onde o palpite do usuário só revela os palpites dos amigos após o envio, estimulando a participação.

* **Tratamento de Edge Cases de Tempo Real (Janela Deslizante de 2 Horas):**
  Ao testar jogos noturnos que atravessavam a meia-noite, percebi que o filtro tradicional de `commence_time > now` ocultava partidas que estavam acontecendo naquele exato momento. Defini a regra de uma janela deslizante de 2 horas retroativas tanto no Client quanto no Server Component para manter partidas ao vivo acessíveis.

* **Arquitetura de Vínculo Automático por Entidades (IA + Partidas):**
  Para evitar que propostas criadas via upload de print ficassem desvinculadas das partidas existentes, projetei o fluxo onde a IA extrai os nomes dos times e o sistema busca dinamicamente correspondência na grade do dia, associando a aposta automaticamente sem clique manual.

* **Regras de Governança e Quorum da Banca:**
  Definição matemática da regra de aprovação (mínimo de 3 votos a favor para aprovar, desempate 2x2 com rejeição preventiva e ferramentas de auditoria/forçar aprovação em casos excepcionais).

* **Design System & Identidade Visual:**
  Padronização de um tema escuro imersivo com efeitos de *glassmorphism*, ajustando contrastes e unificando a paleta cromática em tons de azul/índigo para evitar ruído visual e transmitir modernidade.

---

## ✨ Funcionalidades Principais

- 📊 **Painel de Partidas:** Visualização de odds ao vivo, mercados H2H e status de jogos em andamento.
- 🎯 **Palpite de Placar com Sincronização Realtime:** Predição de placares entre amigos com atualização instantânea via WebSockets do Supabase.
- 🗳️ **Mesa de Votação Democrática:** Proposta de apostas em dinheiro real da banca coletiva com votação e contagem de votos transparente.
- 📸 **Upload Inteligente de Bilhete (OCR com Gemini):** Envio do print da aposta com preenchimento automático de odds, mercado e jogo relacionado.
- 💰 **Extrato e Gestão de Banca:** Histórico de entradas, saques e saldo consolidado.

---

## 🛠️ Configuração e Execução Local

### 1. Clonar o Repositório
```bash
git clone https://github.com/pLopess/go4all.git
cd go4all
```

### 2. Instalar Dependências
```bash
npm install
```

### 3. Variáveis de Ambiente
Copie o arquivo de exemplo e configure suas chaves:
```bash
cp .env.example .env.local
```
Preencha as seguintes chaves no seu `.env.local`:
- `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Credenciais do projeto Supabase.
- `SUPABASE_SERVICE_ROLE_KEY`: Chave de serviço para operações administrativas.
- `ODDS_API_KEY`: Chave da [The Odds API](https://the-odds-api.com).
- `GEMINI_API_KEY`: Chave de API do [Google AI Studio](https://aistudio.google.com).
- `NEXT_PUBLIC_GROUP_MEMBERS`: Lista de membros do bolão (ex: `Lopes,Carlos,Igor,Mouse`).

### 4. Banco de Dados
Execute o script SQL disponível em `supabase/schema.sql` no SQL Editor do seu painel Supabase para criar as tabelas e políticas de Realtime.

### 5. Iniciar o Servidor de Desenvolvimento
```bash
npm run dev
```
Acesse [http://localhost:3000](http://localhost:3000) no seu navegador.
