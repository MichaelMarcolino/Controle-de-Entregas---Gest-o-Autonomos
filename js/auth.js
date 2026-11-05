// Módulo de Autenticação universal (funciona com ou sem servidor web)
document.addEventListener('DOMContentLoaded', () => {
  const isFileProtocol = window.location.protocol === 'file:';

  // Elementos da interface
  const btnNavLogin = document.getElementById('btn-login');
  const btnNavCadastro = document.getElementById('btn-cadastro');
  const formLogin = document.getElementById('form-login');
  const formCadastro = document.getElementById('form-cadastro');
  const formRecuperar = document.getElementById('form-recuperar');
  const btnEsqueciSenha = document.getElementById('btn-esqueci-senha');
  const btnVoltarLogin = document.getElementById('btn-voltar-login');

  const btnEntrar = document.getElementById('btn-entrar');
  const btnCriarConta = document.getElementById('btn-criar-conta');
  const btnEnviarRecuperacao = document.getElementById('btn-enviar-recuperacao');

  // Mensagens na tela
  function exibirAlerta(container, mensagem, tipo = 'erro') {
    if (!container) return;
    const alertaAntigo = container.querySelector('.alerta');
    if (alertaAntigo) alertaAntigo.remove();

    const alerta = document.createElement('div');
    alerta.className = `alerta alerta-${tipo}`;
    alerta.innerHTML = `<span>${tipo === 'erro' ? '⚠️' : '✅'}</span> <span>${mensagem}</span>`;
    container.insertBefore(alerta, container.querySelector('form'));
  }

  // Se o usuário abriu com 2 cliques em file://, avisa sobre ambiente local
  if (isFileProtocol) {
    console.info('Aberto via arquivo local. Para conexão completa com Firebase, use Live Server ou firebase deploy.');
  }

  // Verifica se o Firebase Auth está disponível
  if (typeof firebase !== 'undefined' && firebase.auth) {
    try {
      firebase.auth().onAuthStateChanged((user) => {
        if (user || localStorage.getItem('scge_guest_session')) {
          window.location.href = 'dashboard.html';
        }
      });
    } catch (e) {
      console.warn('Auth state check:', e);
    }
  }

  // Alternância entre formulários
  function mostrarFormulario(formParaMostrar) {
    [formLogin, formCadastro, formRecuperar].forEach(f => {
      if (f) {
        f.classList.remove('active');
        const alerta = f.querySelector('.alerta');
        if (alerta) alerta.remove();
      }
    });
    if (formParaMostrar) {
      formParaMostrar.classList.add('active');
    }

    if (btnNavLogin && btnNavCadastro) {
      if (formParaMostrar === formLogin) {
        btnNavLogin.classList.add('active');
        btnNavCadastro.classList.remove('active');
      } else if (formParaMostrar === formCadastro) {
        btnNavCadastro.classList.add('active');
        btnNavLogin.classList.remove('active');
      } else {
        btnNavLogin.classList.remove('active');
        btnNavCadastro.classList.remove('active');
      }
    }
  }

  if (btnNavLogin) btnNavLogin.addEventListener('click', () => mostrarFormulario(formLogin));
  if (btnNavCadastro) btnNavCadastro.addEventListener('click', () => mostrarFormulario(formCadastro));
  if (btnEsqueciSenha) btnEsqueciSenha.addEventListener('click', (e) => {
    e.preventDefault();
    mostrarFormulario(formRecuperar);
  });
  if (btnVoltarLogin) btnVoltarLogin.addEventListener('click', (e) => {
    e.preventDefault();
    mostrarFormulario(formLogin);
  });

  // AÇÃO 1: Login
  async function executarLogin() {
    const email = document.getElementById('email')?.value.trim();
    const password = document.getElementById('password')?.value;

    if (!email || !password) {
      exibirAlerta(formLogin, 'Por favor, informe e-mail e senha.');
      return;
    }

    // Se estiver em file:// ou offline e sem firebase carregado, entra em modo local
    if (typeof firebase === 'undefined' || !firebase.auth || isFileProtocol) {
      localStorage.setItem('scge_guest_session', JSON.stringify({ email: email || 'piloto@scge.com', displayName: 'Entregador' }));
      window.location.href = 'dashboard.html';
      return;
    }

    try {
      btnEntrar.disabled = true;
      btnEntrar.textContent = 'Acessando...';
      localStorage.removeItem('scge_guest_session');

      await firebase.auth().signInWithEmailAndPassword(email, password);
      window.location.href = 'dashboard.html';
    } catch (error) {
      let msg = 'Erro ao realizar login.';
      if (error.code === 'auth/invalid-credential' || error.code === 'auth/wrong-password' || error.code === 'auth/user-not-found') {
        msg = 'E-mail ou senha incorretos.';
      } else if (error.code === 'auth/invalid-email') {
        msg = 'Formato de e-mail inválido.';
      } else if (error.code === 'auth/too-many-requests') {
        msg = 'Muitas tentativas. Aguarde alguns instantes.';
      }
      exibirAlerta(formLogin, msg, 'erro');
    } finally {
      btnEntrar.disabled = false;
      btnEntrar.textContent = 'Acessar';
    }
  }

  if (btnEntrar) btnEntrar.addEventListener('click', executarLogin);
  document.getElementById('login-form')?.addEventListener('submit', (e) => {
    e.preventDefault();
    executarLogin();
  });

  // AÇÃO 2: Cadastro
  async function executarCadastro() {
    const email = document.getElementById('email-cadastro')?.value.trim();
    const password = document.getElementById('password-cadastro')?.value;

    if (!email || !password) {
      exibirAlerta(formCadastro, 'Preencha todos os campos para cadastrar.');
      return;
    }
    if (password.length < 6) {
      exibirAlerta(formCadastro, 'A senha deve conter no mínimo 6 dígitos.');
      return;
    }

    if (typeof firebase === 'undefined' || !firebase.auth || isFileProtocol) {
      localStorage.setItem('scge_guest_session', JSON.stringify({ email, displayName: 'Entregador' }));
      window.location.href = 'dashboard.html';
      return;
    }

    try {
      btnCriarConta.disabled = true;
      btnCriarConta.textContent = 'Cadastrando...';
      localStorage.removeItem('scge_guest_session');

      await firebase.auth().createUserWithEmailAndPassword(email, password);
      window.location.href = 'dashboard.html';
    } catch (error) {
      let msg = 'Erro ao criar conta.';
      if (error.code === 'auth/email-already-in-use') {
        msg = 'Este e-mail já está cadastrado no sistema.';
      } else if (error.code === 'auth/weak-password') {
        msg = 'A senha precisa ter pelo menos 6 caracteres.';
      } else if (error.code === 'auth/invalid-email') {
        msg = 'E-mail inválido.';
      }
      exibirAlerta(formCadastro, msg, 'erro');
    } finally {
      btnCriarConta.disabled = false;
      btnCriarConta.textContent = 'Cadastrar';
    }
  }

  if (btnCriarConta) btnCriarConta.addEventListener('click', executarCadastro);
  document.getElementById('cadastro-form')?.addEventListener('submit', (e) => {
    e.preventDefault();
    executarCadastro();
  });

  // AÇÃO 3: Recuperação de senha
  async function executarRecuperacao() {
    const email = document.getElementById('email-recuperar')?.value.trim();

    if (!email) {
      exibirAlerta(formRecuperar, 'Digite seu e-mail cadastrado.');
      return;
    }

    if (typeof firebase === 'undefined' || !firebase.auth) {
      exibirAlerta(formRecuperar, 'Simulação: Link enviado com sucesso!', 'sucesso');
      return;
    }

    try {
      btnEnviarRecuperacao.disabled = true;
      btnEnviarRecuperacao.textContent = 'Enviando...';

      await firebase.auth().sendPasswordResetEmail(email);
      exibirAlerta(formRecuperar, 'Link de redefinição enviado para seu e-mail!', 'sucesso');
    } catch (error) {
      let msg = 'Erro ao enviar e-mail de recuperação.';
      if (error.code === 'auth/user-not-found') {
        msg = 'Nenhum cadastro encontrado com este e-mail.';
      }
      exibirAlerta(formRecuperar, msg, 'erro');
    } finally {
      btnEnviarRecuperacao.disabled = false;
      btnEnviarRecuperacao.textContent = 'Enviar Link';
    }
  }

  if (btnEnviarRecuperacao) btnEnviarRecuperacao.addEventListener('click', executarRecuperacao);
  document.getElementById('recuperar-form')?.addEventListener('submit', (e) => {
    e.preventDefault();
    executarRecuperacao();
  });
});
