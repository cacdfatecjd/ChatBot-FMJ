# Chatbot de WhatsApp para Lembretes de Exames

## 📌 Visão Geral do Projeto
Este projeto tem como objetivo **reduzir o absenteísmo em exames de colonoscopia** por meio de um chatbot no WhatsApp. Ele envia lembretes automatizados para os pacientes e permite interação para confirmação, reagendamento ou cancelamento dos exames.

O sistema foi desenvolvido utilizando **Node.js** com a biblioteca **whatsapp-web.js**, além de armazenamento local em **JSON** para gerenciar os pacientes cadastrados.

## 🚀 Tecnologias Utilizadas

- **Node.js** - Ambiente de execução JavaScript
- **whatsapp-web.js** - Biblioteca para automação do WhatsApp Web
- **qrcode** - Geração de QR Code para autenticação
- **moment-timezone** - Manipulação e formatação de datas
- **fs** - Manipulação de arquivos JSON para persistência de dados

## 📖 Funcionalidades do Chatbot

✅ **Cadastro de pacientes** via WhatsApp com nome, idade, telefone, e-mail e data do exame.  

✅ **Envio automático de lembretes** nos seguintes intervalos:
  - **7 dias antes** do exame
  - **2 dias antes** do exame
  - **1 dia depois** para coleta de feedback

✅ **Menu interativo** para consultar detalhes do exame, alterar a data ou cancelar.  

✅ **Administração via WhatsApp**, incluindo broadcast de mensagens para pacientes cadastrados.

## 📌 Como Utilizar

### 1️⃣ **Instalação e Configuração**

1. Clone o repositório:
   ```sh
   git clone https://github.com/seu-repositorio/chatbot-colonoscopia.git
   cd chatbot-colonoscopia
   ```
2. Instale as dependências:
   ```sh
   npm install
   ```
3. Inicie o chatbot:
   ```sh
   node bot.js
   ```
4. Escaneie o **QR Code** que será gerado no terminal para autenticar no WhatsApp Web.

### 2️⃣ **Fluxo de Cadastro e Notificações**

1. O paciente envia a mensagem **"cadastrar"**.
2. O chatbot solicita informações básicas (nome, idade, telefone, e-mail e data do exame).
3. Os dados são salvos em `exames.json`.
4. O chatbot verifica diariamente os exames agendados e envia mensagens conforme a proximidade da data.

### 3️⃣ **Comandos Disponíveis**

- `menu` - Exibe o menu com opções.
- `1` - Consulta os detalhes do exame.
- `2` - Permite alterar a data do exame.
- `3` - Cancela o exame agendado.
- `/broadcast <mensagem>` - (Administradores) Envia mensagem para todos os pacientes cadastrados.

## 🔧 Estrutura de Arquivos
```
📂 chatbot-colonoscopia
│── 📄 bot.js            # Código principal do chatbot
│── 📄 exames.json       # Armazena os pacientes cadastrados
│── 📄 package.json      # Dependências do projeto
│── 📄 README.md         # Documentação do projeto
```

## 🎯 Créditos

👨‍💻 **Desenvolvedor:** Breno de Oliveira Brocanello  
🔗 [GitHub](https://github.com/BrenoBrocanello) | 🌐 [LinkedIn](https://www.linkedin.com/in/breno-brocanello/)

🛠️ **Revisão/Supervisão/Scrum Master:** Ariel Ladislau Reises  
🔗 [GitHub](https://github.com/arielreises) | 🌐 [LinkedIn](https://www.linkedin.com/in/arielreises/)

🏥 **Projeto desenvolvido em parceria com:** CACD Jundiaí
🌐 [Site](https://cacdjundiai.com.br/)

---
✅ **Este chatbot foi desenvolvido para otimizar a comunicação entre pacientes e clínicas, contribuindo para a melhoria na adesão aos exames médicos.**

