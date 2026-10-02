# Configurar o Painel de Vida (uma vez só)

O painel usa o **mesmo projeto Firebase** do app de finanças (`our-finance-7e979`),
mas com login Google e dados isolados por conta. São 3 passos no
[console do Firebase](https://console.firebase.google.com/project/our-finance-7e979).

## 1. Ativar o login com Google

1. Menu da esquerda → **Authentication** → aba **Sign-in method**
2. Clique em **Adicionar novo provedor** → **Google** → ative → escolha seu e-mail
   como e-mail de suporte → **Salvar**

(O login anônimo do app de finanças continua ativo; um não interfere no outro.)

## 2. Autorizar o endereço do site

1. Ainda em **Authentication** → aba **Settings** → **Authorized domains**
2. Clique em **Add domain** e adicione: `imkaua.github.io`

Sem isso, o botão "Entrar com Google" mostra o erro de domínio não autorizado.

## 3. Trocar as regras do banco (Firestore)

Menu da esquerda → **Firestore Database** → aba **Regras**. Substitua tudo por
(troque `SEU_EMAIL@gmail.com` pelo e-mail da sua conta Google):

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // App de finanças antigo (continua igual)
    match /financas-sync/{code} {
      allow read, write: if request.auth != null;
    }

    // Painel de Vida: cada pessoa só lê e grava os próprios dados,
    // e só a sua conta Google pode usar o painel.
    match /users/{uid}/{document=**} {
      allow read, write: if request.auth != null
        && request.auth.uid == uid
        && request.auth.token.firebase.sign_in_provider == 'google.com'
        && request.auth.token.email == 'SEU_EMAIL@gmail.com'
        && request.auth.token.email_verified == true;
    }
  }
}
```

Clique em **Publicar**.

Por que restringir ao seu e-mail: o site é público. Sem essa linha, qualquer pessoa
poderia criar uma conta e gastar a cota gratuita do seu Firebase. Ela não veria
seus dados, mas o seu painel poderia parar de funcionar.

## Testar sem login

Abra o endereço com `?demo` no final
(ex.: `https://imkaua.github.io/Finan-as-Pessoais/painel-vida/?demo`). Os dados
ficam só naquele navegador e não se misturam com a sua conta.

## Instalar no celular

- **iPhone (Safari):** botão compartilhar → "Adicionar à Tela de Início"
- **Android (Chrome):** menu ⋮ → "Instalar app" / "Adicionar à tela inicial"
