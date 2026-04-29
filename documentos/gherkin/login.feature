Funcionalidade: Login de usuário
    @test-login
    Cenário: Realizar login na aplicação web Exeplo
        Dado que acesso a url "APP_LOGIN_URL", 
        Quando insiro um nome de usuário "standard_user" no campo "Username"
        E senha "secret_sauce"
        E clicar no botão "Login"
        Então devo ser redirecionado para a página inicial

    Cenário: Login com senha incorreta
        Dado que o usuário está na página de login
        Quando ele preenche o campo "email" com "usuario@email.com"
        E preenche o campo "senha" com "senhaErrada"
        E clica no botão "Entrar"
        Então deve visualizar a mensagem de erro "Email ou senha inválidos"
        E deve permanecer na página de login

    Cenário: Login com senha incorreta
        Dado que o usuário está na página de login
        Quando ele preenche o campo "email" com "usuario@email.com"
        E preenche o campo "senha" com "senhaErrada"
        E clica no botão "Entrar"
        Então deve visualizar a mensagem de erro "Email ou senha inválidos"
        E deve permanecer na página de login


