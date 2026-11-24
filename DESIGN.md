# Pandora School — Direção visual

## Overview
Projeto acadêmico com cinco áreas: Tecnologia, Engenharia, Administração, Saúde e Design. A landing original mantém a Sakura, as experiências em Three.js e a identidade institucional. Os portais autenticados priorizam a rotina de aluno e professor, não uma vitrine de software. Manter ambas as paletas existentes: Pandora e FIAP.

## Colors
Ouro e osso sobre carvão são elementos de marca, não obrigatoriedade para cada ícone, cartão, título e progresso. Reutilizar tokens em `src/styles/palette-tokens.css` e `src/styles/tailwind.css`: `--primary`, `--card`, `--border`, `--muted-foreground`. Não inserir hex nem novo sistema de cores em telas isoladas.

## Typography
Bricolage Grotesque para títulos, Hanken Grotesk para corpo e JetBrains Mono apenas para dados utilitários. Títulos nomeiam tarefas reais; evitar slogans genéricos como “Seu semestre, em foco” ou “Por onde começar?”.

## Layout
O aluno precisa encontrar aulas, disciplinas, notas, atividades e avisos sem atravessar cards decorativos. O professor precisa avaliar entregas e comunicar com clareza. Preservar navegação, dados e funções existentes.

## Elevation & Depth
Preferir superfícies planas e bordas discretas nos portais. Sombras leves somente quando separam camadas. Sem barras douradas em todo cartão, glow de progressos ou ícones decorativos girando. O 3D expressivo permanece na landing e na **carteirinha estudantil**. A carteirinha é uma peça de identidade, com holograma, flutuação, brilho e inclinação no toque. Os cards de notas e indicadores seguem sóbrios.

## Shapes
Cantos moderados em cards funcionais; listas e divisórias quando há muitos itens. Evitar pílulas ornamentais como cabeçalhos.

## Components
`StatCard` é componente compartilhado de métricas; `PageHeader` é cabeçalho único; `Sidebar` mantém navegação desktop e mobile. `DashboardContent` continua consumindo dados reais do Supabase sem mudanças de regras ou autenticação.

## Do's and Don'ts
- Preservar foco acessível, contraste, estados vazios, responsividade e redução de movimento.
- Remover brilhos gratuitos, gradientes aninhados, rótulos duplicados, selos em todo elemento e texto que não informa. **Exceção deliberada:** a carteirinha estudantil mantém ornamentos e movimento, com suporte a movimento reduzido.
- Não introduzir biblioteca visual nova nem reescrever a landing por essa revisão.

Referências de processo (inspiração, não dependências): https://github.com/pbakaus/impeccable, https://github.com/heydamir/unslop e https://github.com/anthropics/skills/tree/main/skills/frontend-design.
