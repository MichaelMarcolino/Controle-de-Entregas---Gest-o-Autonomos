# SCGE - Sistema de Controle e Gestão de Entregas

Arquivos prontos para substituir na sua pasta do projeto.

## Estrutura dos Arquivos:
- `index.html` -> Página de Login, Cadastro e Recuperação de Senha.
- `dashboard.html` -> Área logada com "Lançamentos de Hoje", "Histórico de Lançamentos" e "Resumo Geral".
- `404.html` -> Página amigável para rotas não encontradas.
- `firebase.json` -> Configuração do Firebase Hosting.
- `firestore.rules` -> Regras de segurança do Firestore para ler/escrever rotas e gastos com segurança.
- `css/style.css` -> Estilos visuais e animações.
- `js/firebase-config.js` -> Inicialização do Firebase com as suas credenciais oficiais via CDN moderna (sem build).
- `js/auth.js` -> Lógica de login, cadastro e recuperação de senha.
- `js/app.js` -> Lógica do painel: histórico em tempo real, cálculo financeiro e botão SAIR com redirecionamento correto.
- `js/animations.js` -> Efeitos de transição suave.

## Como Publicar no Firebase:
1. Abra o terminal na pasta onde estes arquivos estão.
2. Execute o comando:
   ```bash
   firebase deploy
   ```
Pronto! Seu site estará 100% online no seu domínio do Firebase.
