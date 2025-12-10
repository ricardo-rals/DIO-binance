# 🏛️ DASI Gov: Governança Estudantil Descentralizada

## 💡 Descrição do Projeto (Materialização da DAO)

Este projeto teórico visa criar uma **Decentralized Autonomous Organization (DAO)** para o Diretório Acadêmico de Sistemas de Informação (**DASI**). O objetivo é substituir as estruturas tradicionais e centralizadas de gestão e eleição por um modelo de **governança transparente e auditável**.

A DASI Gov usará *smart contracts* e ferramentas Web3 para garantir que cada estudante matriculado tenha voz e voto direto nas decisões críticas do Diretório Acadêmico.

### 🎯 Proposta de Valor e Entregas

* **Entrega Principal:** Implementar um sistema de **Votação e Eleições 100% Auditáveis**. Todas as eleições (chapa do DASI, representantes de turma, colegiado) e decisões de verba serão registradas na *blockchain*, impossibilitando manipulação de resultados.
* **Transparência Financeira:** Gerenciamento da tesouraria do DASI por uma carteira MultiSig, onde todo o fluxo de caixa e gastos são públicos para os membros.
* **Participação Direta:** Qualquer aluno pode criar uma proposta, e todos os membros podem votar nela, democratizando o processo decisório do Diretório.

---

## 🛠️ Tecnologias Utilizadas

| Categoria | Tecnologia | Função |
|-----------|------------|--------|
| **Blockchain** | Polygon | Rede blockchain para deploy dos smart contracts e tokens |
| **Smart Contracts** | Solidity | Linguagem para desenvolvimento dos contratos de governança |
| **Token** | ERC-20 | Padrão para o token de governança $DASI |
| **Governança** | Snapshot | Plataforma de votação off-chain |
| **Tesouraria** | Gnosis Safe | Carteira MultiSig para gestão de fundos |
| **Gerenciamento** | Dework | Plataforma para gerenciar tarefas e bounties |
| **Comunidade** | Discord + Collab Land | Hub de comunicação com verificação de token |
| **Divulgação** | Twitter/Instagram | Canais de comunicação e transparência |

---

## 🏗️ Estrutura de Criação da DASI Gov (Os 10 Passos)

Seguimos os passos sugeridos para a criação de uma DAO, aplicando-os ao contexto acadêmico:

### 1. Nomenclatura e Missão (Passos 1 e 2)

* **Nome da DAO:** **DASI Gov**
* **Declaração de Missão:** "Capacitar e descentralizar o poder de voto dos estudantes de Sistemas de Informação, utilizando a tecnologia *blockchain* para garantir eleições justas, gestão de verbas transparente e uma plataforma democrática para a definição de prioridades acadêmicas e eventos."

### 2. Definição da Entrega (Passo 3)

* A entrega são os **serviços de governança**. **A DASI Gov fornece a infraestrutura para a tomada de decisões, garantindo que o resultado da votação seja imutável e transparente**.

### 3. Construção da Comunidade (Passos 4, 5 e 6)

| **Ação** | **Ferramenta / Estratégia** | **Justificativa no Projeto** |
|----------|----------------------------|------------------------------|
| **Crie um servidor Discord** | Discord + **Collab Land** | Principal *hub* de comunicação para debates de propostas. O Collab Land restringe o acesso aos canais de votação apenas a detentores do token $DASI. |
| **Crie uma conta no Twitter** | Twitter/Instagram | **Publicidade e divulgação dos resultados de votação e do sucesso das entregas (eventos, novas políticas)**. |
| **Convide as pessoas a participar** | **Onboarding Documentado** | **Criar um procedimento claro para a entrada de calouros e a distribuição inicial do token $DASI para educá-los sobre os processos de voto**. |

### 4. Governança e Financiamento (Passos 7, 8 e 9)

| **Ação** | **Ferramenta / Estratégia** | **Detalhamento da Implementação** |
|----------|----------------------------|-----------------------------------|
| **Lance um token de governança** | **Token $DASI** (ERC-20, Polygon) | **O poder de voto é distribuído 1 token = 1 aluno**, vinculando o token à matrícula. O token é usado para votar nas propostas e projetos. |
| **Crie um mecanismo de financiamento** | **Gnosis Safe (Carteira MultiSig)** | A tesouraria do DASI é uma carteira MultiSig, exigindo múltiplas assinaturas de membros eleitos do Diretório (ex: 4 de 7) para liberar qualquer fundo. **Isso garante a gestão controlada e eficaz**. |
| **Configure o Snapshot para votar** | **Snapshot + Dework** | **Snapshot** será a plataforma de votação *off-chain*. **Dework** será usado para gerenciar tarefas e recompensar os alunos por contribuições (Ex: *Bounties* para criar *designs* de camisetas), registrando o trabalho na Web3. |

### 5. Aspecto Legal (Passo 10)

* **Crie uma LLC:** A DASI Gov criaria uma LLC (na teoria, em uma jurisdição amigável a DAOs como Wyoming, EUA).
* **Função:** A LLC atuaria como a entidade legal para interagir com a reitoria da faculdade e instituições financeiras (bancos), fornecendo um "escudo" legal e delimitando a responsabilidade dos membros do DASI.

---

## 🏛️ Arquitetura e Funcionamento

### Fluxo de Governança

1. **Criação de Proposta:** Qualquer membro detentor do token $DASI pode criar uma proposta no Snapshot.
2. **Período de Debate:** A proposta é discutida no Discord, com acesso restrito via Collab Land.
3. **Votação:** Membros votam usando seus tokens $DASI (1 token = 1 voto).
4. **Execução:** Propostas aprovadas são executadas através da carteira MultiSig (Gnosis Safe).
5. **Transparência:** Todas as decisões e transações são registradas na blockchain e visíveis publicamente.

### Mecanismo de Votação

* **Quórum:** 50% + 1 dos tokens $DASI válidos
* **Período de Votação:** Configurável por proposta (ex: 7 dias)
* **Registro:** Todas as votações são registradas na blockchain para auditoria

### Gestão Financeira

* **Carteira MultiSig:** Gnosis Safe com configuração 4 de 7 assinaturas
* **Transparência:** Todos os ativos e transações são públicos
* **Aprovação:** Gastos requerem aprovação via votação na DAO

---

## 🚀 Próximos Passos

### Fase 1: Desenvolvimento

- [ ] Desenvolvimento dos smart contracts em Solidity
- [ ] Deploy do token $DASI na rede Polygon
- [ ] Configuração da carteira MultiSig (Gnosis Safe)
- [ ] Integração com Snapshot

### Fase 2: Comunidade

- [ ] Criação do servidor Discord
- [ ] Configuração do Collab Land
- [ ] Criação de contas nas redes sociais
- [ ] Documentação do processo de onboarding

### Fase 3: Implementação

- [ ] Distribuição inicial dos tokens $DASI
- [ ] Primeira proposta de votação piloto
- [ ] Migração da tesouraria para a carteira MultiSig
- [ ] Treinamento dos membros do DASI

### Fase 4: Legal

- [ ] Pesquisa sobre jurisdições amigáveis a DAOs
- [ ] Criação da LLC (se aplicável)
- [ ] Documentação legal e compliance

---

## 📊 Exemplos de Casos de Uso

### Eleição de Chapa DASI

* **Proposta:** Escolha entre Chapa A ou Chapa B para o próximo mandato
* **Processo:** Votação no Snapshot com quórum de 50% + 1
* **Resultado:** Registrado na blockchain de forma imutável

### Aprovação de Orçamento

* **Proposta:** Aprovar gasto de R$ 3.000 para Semana Acadêmica
* **Processo:** Debate no Discord, votação no Snapshot
* **Execução:** Após aprovação, fundos liberados via MultiSig

### Bounties e Contribuições

* **Proposta:** Criar design de camiseta do DASI
* **Processo:** Tarefa criada no Dework, recompensa em $DASI ou USDC
* **Resultado:** Trabalho registrado na Web3, recompensa distribuída

---

## 🤝 Contribuição

Este é um projeto teórico desenvolvido como parte do Bootcamp Blockchain Developer com Solidity 2025 da DIO. Para contribuir:

1. Entenda a estrutura da DAO e os 10 passos
2. Proponha melhorias através de discussões no Discord
3. Participe das votações e governança
4. Contribua com código, documentação ou design

---

## 📝 Observações

* Este projeto é uma **proposta teórica** de implementação de uma DAO para o contexto acadêmico
* A implementação real requereria aprovação institucional e adequação legal
* Todas as tecnologias mencionadas são ferramentas reais e amplamente utilizadas no ecossistema Web3

---

**Desenvolvido como parte do Bootcamp Blockchain Developer com Solidity 2025 - DIO** 🚀
