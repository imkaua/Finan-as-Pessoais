# Configurar a sincronização entre aparelhos

Isso é um passo único, feito uma vez. Depois disso, todo mundo que usar o site
já vai poder sincronizar.

## 1. Criar o projeto no Firebase (gratuito)

1. Acesse `console.firebase.google.com` e entre com uma conta Google
2. Clique em **"Criar projeto"** (ou "Add project")
3. Dê um nome (ex: "minhas-financas") e siga o assistente até o fim (pode
   desativar o Google Analytics, não é necessário)

## 2. Ativar o banco de dados (Firestore)

1. No menu da esquerda, clique em **"Firestore Database"** (ou "Compilação" → "Firestore Database")
2. Clique em **"Criar banco de dados"**
3. Escolha o modo **produção** e uma localização (qualquer uma serve, ex: `southamerica-east1` para o Brasil)
4. Depois de criado, vá na aba **"Regras"** (Rules) e substitua o conteúdo por:

   ```
   rules_version = '2';
   service cloud.firestore {
     match /databases/{database}/documents {
       match /financas-sync/{code} {
         allow read, write: if request.auth != null;
       }
     }
   }
   ```

5. Clique em **"Publicar"**

## 3. Ativar login anônimo

1. No menu da esquerda, clique em **"Authentication"**
2. Clique em **"Get started"** (se for a primeira vez)
3. Na aba **"Sign-in method"**, clique em **"Anonymous"** e ative (toggle)
4. Salve

## 4. Pegar as chaves de configuração

1. Clique na engrenagem ⚙️ ao lado de "Project Overview" → **"Configurações do projeto"**
2. Role até **"Seus apps"** e clique no ícone **`</>`** (Web) para criar um app
3. Dê um apelido (ex: "site") e clique em **"Registrar app"**
4. Vai aparecer um bloco de código com um objeto parecido com este:

   ```js
   const firebaseConfig = {
     apiKey: "AIza...",
     authDomain: "minhas-financas-xxxx.firebaseapp.com",
     projectId: "minhas-financas-xxxx",
     storageBucket: "minhas-financas-xxxx.appspot.com",
     messagingSenderId: "123456789",
     appId: "1:123456789:web:abcdef",
   };
   ```

5. **Copie esse bloco inteiro** e me envie aqui na conversa (esses valores não
   são secretos — foram feitos pelo próprio Google para ficar no código do
   site). Eu coloco no projeto, faço o commit e a sincronização passa a
   funcionar para todo mundo que usar o link.
