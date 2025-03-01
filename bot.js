const { Client, LocalAuth } = require('whatsapp-web.js');
const fs = require('fs');
const QRCode = require('qrcode');
const EXAMES_FILE = 'exames.json';

// ========== CONFIGURAÇÃO INICIAL ==========
let examesData;
const usuariosCadastrando = new Map();
const usuariosConfirmando = new Map();
const usuariosFeedback = new Map();
const usuariosAlterandoData = new Map(); // Novo mapa para controle de alteração de data
const ADMIN_NUMEROS = ['5511970934543@c.us']; // Adicione os números dos administradores aqui

// ========== FUNÇÕES AUXILIARES ==========
function inicializarArquivoDados() {
    try {
        if (!fs.existsSync(EXAMES_FILE)) {
            fs.writeFileSync(EXAMES_FILE, JSON.stringify({ pacientes: {} }, null, 2));
        }
        
        const conteudo = fs.readFileSync(EXAMES_FILE, 'utf8');
        examesData = conteudo.trim() === '' ? { pacientes: {} } : JSON.parse(conteudo);
        
        if (!examesData.pacientes || typeof examesData.pacientes !== 'object') {
            examesData.pacientes = {};
        }
    } catch (error) {
        console.log('🔧 Criando novo arquivo de dados...');
        examesData = { pacientes: {} };
        fs.writeFileSync(EXAMES_FILE, JSON.stringify(examesData, null, 2));
    }
}

async function enviarBroadcast(mensagem) {
    try {
        const pacientes = Object.keys(examesData.pacientes);
        for (const numero of pacientes) {
            await client.sendMessage(numero, mensagem);
            console.log(`Mensagem enviada para ${numero}`);
        }
        console.log('✅ Broadcast concluído!');
    } catch (error) {
        console.error('❌ Erro no broadcast:', error);
    }
}

function salvarDados() {
    try {
        fs.writeFileSync(EXAMES_FILE, JSON.stringify(examesData, null, 2));
    } catch (error) {
        console.error('❌ Erro ao salvar dados:', error);
        fs.writeFileSync(EXAMES_FILE + '.backup', JSON.stringify(examesData));
    }
}

function usuarioCadastrado(numero) {
    return examesData.pacientes.hasOwnProperty(numero);
}

// ========== SISTEMA DE MENU ==========
async function exibirMenu(numero) {
    const menu = 
        `📋 *Menu Principal*\n\n` +
        `1️⃣ - Ver detalhes do exame\n` +
        `2️⃣ - Alterar data\n` + 
        `3️⃣ - Cancelar exame\n\n` +
        `Digite o número da opção desejada:`;
    
    await client.sendMessage(numero, menu);
}

// ========== FUNÇÃO PARA ALTERAR DATA ==========
async function processarAlteracaoData(numero, texto) {
    try {
        const [dia, mes, ano] = texto.split('/');
        const novaData = new Date(ano, mes - 1, dia);

        // Validação robusta da data
        const dataValida = (
            novaData.getDate() === parseInt(dia) &&
            novaData.getMonth() === parseInt(mes) - 1 &&
            novaData.getFullYear() === parseInt(ano)
        );

        if (!dataValida || novaData < new Date()) {
            throw new Error('Data inválida ou já passou');
        }

        examesData.pacientes[numero].dataExame = texto;
        examesData.pacientes[numero].notificacoes = {}; // Reseta notificações
        salvarDados();

        await client.sendMessage(numero, '✅ Data alterada com sucesso!');
        await exibirMenu(numero);
    } catch (error) {
        await client.sendMessage(numero, `❌ Erro: ${error.message}`);
    } finally {
        usuariosAlterandoData.delete(numero);
    }
}

async function verificarNotificacoes() {
    const agora = new Date();
    agora.setHours(0, 0, 0, 0); // Ignora horas, minutos, segundos e milissegundos

    for (const [numero, paciente] of Object.entries(examesData.pacientes)) {
        try {
            if (!paciente.dataExame) continue;

            // Valida e converte a data do exame
            const partesData = paciente.dataExame.split('/');
            if (partesData.length !== 3) {
                console.error(`Formato de data inválido para o paciente ${numero}: ${paciente.dataExame}`);
                continue;
            }

            const dataExame = new Date(partesData[2], partesData[1] - 1, partesData[0]);
            if (isNaN(dataExame.getTime())) {
                console.error(`Data inválida para o paciente ${numero}: ${paciente.dataExame}`);
                continue;
            }
            dataExame.setHours(0, 0, 0, 0); // Ignora horas, minutos, segundos e milissegundos

            // Calcula a diferença de dias
            const diffTempo = dataExame - agora;
            const diffDias = Math.floor(diffTempo / (1000 * 60 * 60 * 24)); // Usa Math.floor para evitar erros de arredondamento

            // Notificação 7 dias antes
            if (diffDias === 7 && !paciente.notificacoes?.seteDias) {
                await enviarNotificacao(numero, 7);
                paciente.notificacoes = { ...(paciente.notificacoes || {}), seteDias: true };
            }

            // Notificação 2 dias antes
            if (diffDias === 2 && !paciente.notificacoes?.doisDias) {
                await enviarNotificacao(numero, 2);
                paciente.notificacoes = { ...(paciente.notificacoes || {}), doisDias: true };
            }

            // Feedback 1 dia após
            const dataFeedback = new Date(dataExame);
            dataFeedback.setDate(dataExame.getDate() + 1);
            dataFeedback.setHours(0, 0, 0, 0);

            if (agora.getTime() === dataFeedback.getTime() && !paciente.feedbackEnviado) {
                await solicitarFeedback(numero);
                paciente.feedbackEnviado = true;
            }

        } catch (error) {
            console.error(`Erro no paciente ${numero}:`, error);
        }
    }
    salvarDados();
}

async function enviarNotificacao(numero, dias) {
    const mensagem = dias === 7 
        ? `*Olá! Estamos a 7 dias do seu exame de colonoscopia.*\n\n` +
          `Este exame é muito importante para avaliar sua saúde intestinal e prevenir diversas doenças. ` +
          `Certifique-se de seguir as orientações fornecidas pelo seu médico.\n\n` +
          `*Você confirma sua presença?*\n` +
          `1️⃣ - SIM\n2️⃣ - NÃO (reagendaremos)`
        : `*Faltam apenas 2 dias para seu exame!*\n\n` +
          `Não se esqueça de comprar o kit de preparo e seguir todas as instruções.\n\n` +
          `*Confirmar presença?*\n` +
          `1️⃣ - SIM\n2️⃣ - NÃO`;

    await client.sendMessage(numero, mensagem);
    usuariosConfirmando.set(numero, { dias });
}

async function solicitarFeedback(numero) {
    await client.sendMessage(numero,
        `*Avalie nosso serviço*\n\n` +
        `De 1️⃣ a 5️⃣, como foi sua experiência com nossos lembretes?\n` +
        `(1 = Não útil, 5 = Muito útil)`
    );
    usuariosFeedback.set(numero, true);
}

// ========== FLUXO DE CADASTRO ==========
async function iniciarCadastro(numero) {
    if (usuarioCadastrado(numero)) {
        await client.sendMessage(numero, '⚠️ Você já está cadastrado! Digite *menu*');
        return;
    }
    
    usuariosCadastrando.set(numero, {
        etapa: 1,
        telefone: numero.replace('@c.us', '')
    });
    
    await client.sendMessage(numero, '📝 *Cadastre seu exame*\n\n1. Qual seu nome completo?');
}

async function processarCadastro(numero, texto) {
    const estado = usuariosCadastrando.get(numero);
    if (!estado) return;

    try {
        switch(estado.etapa) {
            case 1:
                estado.nome = texto;
                estado.etapa = 2;
                await client.sendMessage(numero, '2. Qual sua idade?');
                break;
                
            case 2:
                if (!/^\d+$/.test(texto) || parseInt(texto) < 1) {
                    throw new Error('Idade inválida');
                }
                estado.idade = texto;
                estado.etapa = 3;
                await client.sendMessage(numero, '3. Digite seu e-mail:');
                break;
                
            case 3:
                if (!/^\S+@\S+\.\S+$/.test(texto)) {
                    throw new Error('E-mail inválido');
                }
                estado.email = texto;
                estado.etapa = 4;
                await client.sendMessage(numero, '4. Data do exame (DD/MM/AAAA):');
                break;
                
            case 4:
                const [dia, mes, ano] = texto.split('/');
                const dataExame = new Date(ano, mes - 1, dia);
                
                const dataValida = (
                    dataExame.getDate() === parseInt(dia) &&
                    dataExame.getMonth() === parseInt(mes) - 1 &&
                    dataExame.getFullYear() === parseInt(ano)
                );
                
                if (!dataValida || dataExame < new Date()) {
                    throw new Error('Data inválida ou já passou');
                }
                
                examesData.pacientes[numero] = {
                    nome: estado.nome,
                    idade: estado.idade,
                    email: estado.email,
                    telefone: estado.telefone,
                    dataExame: texto,
                    confirmado: null, // Status inicial: null (Pendente)
                    notificacoes: {}
                };
                
                salvarDados();
                await client.sendMessage(numero, '✅ *Cadastro concluído!*');
                await exibirMenu(numero);
                usuariosCadastrando.delete(numero);
                break;
        }
    } catch (error) {
        await client.sendMessage(numero, `❌ Erro: ${error.message}`);
    }
}

// ========== CONFIGURAÇÃO DO CLIENTE ==========
const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: { args: ['--no-sandbox'] }
});

// ========== HANDLER DE MENSAGENS ==========
client.on('message', async msg => {
    const numero = msg.from;
    const texto = msg.body.trim();

    try {
        // Comando de broadcast (apenas para administradores)
        if (texto.startsWith('/broadcast') && ADMIN_NUMEROS.includes(numero)) {
            const mensagem = texto.replace('/broadcast', '').trim();
            if (mensagem) {
                await enviarBroadcast(mensagem);
                await client.sendMessage(numero, '✅ Broadcast enviado com sucesso!');
            } else {
                await client.sendMessage(numero, '❌ Use: /broadcast <mensagem>');
            }
            return;
        }

        // Fluxo de confirmação
        if (usuariosConfirmando.has(numero)) {
            const resposta = texto === '1' ? true : false; // true = Confirmado, false = Cancelado
            const dias = usuariosConfirmando.get(numero).dias;
        
            const mensagem = resposta 
                ? (dias === 7 
                    ? 'Obrigado por confirmar! Enviaremos um lembrete próximo da data.' 
                    : 'Excelente! Siga as orientações de preparo. Nos vemos em breve!')
                : 'Entendemos. Nossa equipe entrará em contato para reagendamento.';
        
            if (examesData.pacientes[numero]) {
                examesData.pacientes[numero].confirmado = resposta; // Atualiza o status
                salvarDados();
        
                // Notificar administrador se a consulta foi cancelada
                if (!resposta) {
                    const paciente = examesData.pacientes[numero];
                    const mensagemAdmin = 
                        `🚨 *Consulta Desmarcada*\n\n` +
                        `Nome: ${paciente.nome}\n` +
                        `Telefone: ${paciente.telefone}\n` +
                        `Email: ${paciente.email}\n` +
                        `Data do exame: ${paciente.dataExame}`;
        
                    for (const admin of ADMIN_NUMEROS) {
                        await client.sendMessage(admin, mensagemAdmin);
                    }
                }
            }
        
            await client.sendMessage(numero, `✅ ${mensagem}`);
            usuariosConfirmando.delete(numero);
            return;
        }

        // Fluxo de feedback
        if (usuariosFeedback.has(numero)) {
            const nota = parseInt(texto);
            if (nota >= 1 && nota <= 5) {
                if (examesData.pacientes[numero]) {
                    examesData.pacientes[numero].feedback = nota;
                    salvarDados();
                }
                await client.sendMessage(numero, '🌟 Obrigado pelo seu feedback!');
            } else {
                await client.sendMessage(numero, '❌ Por favor, digite uma nota entre 1 e 5.');
            }
            usuariosFeedback.delete(numero);
            return;
        }

        // Fluxo de alteração de data
        if (usuariosAlterandoData.has(numero)) {
            await processarAlteracaoData(numero, texto);
            return;
        }

        // Fluxo de cadastro
        if (usuariosCadastrando.has(numero)) {
            await processarCadastro(numero, texto);
            return;
        }

        // Comandos gerais
        switch(texto.toLowerCase()) {
            case 'oi': case 'ola': case 'olá':
                if (usuarioCadastrado(numero)) {
                    await exibirMenu(numero);
                } else {
                    await client.sendMessage(numero, '👋 Bem-vindo! Digite *cadastrar* para começar');
                }
                break;

            case 'cadastrar': case 'cadastro':
                await iniciarCadastro(numero);
                break;

            case '1':
                if (usuarioCadastrado(numero)) {
                    const paciente = examesData.pacientes[numero];
                    const status = paciente.confirmado === null 
                        ? '🟡 Pendente' 
                        : (paciente.confirmado ? '✅ Confirmada' : '❌ Cancelada'); // Exibe o status atualizado
                    await client.sendMessage(numero, 
                        `📅 *Sua Consulta*\n` +
                        `Nome: ${paciente.nome}\n` +
                        `Data: ${paciente.dataExame}\n` +
                        `Status: ${status}` // Exibe o status atualizado
                    );
                } else {
                    await client.sendMessage(numero, '❌ Você não está cadastrado. Digite *cadastrar*');
                }
                break;

            case '2':
                if (usuarioCadastrado(numero)) {
                    usuariosAlterandoData.set(numero, true);
                    await client.sendMessage(numero, '📅 Digite a nova data do exame (DD/MM/AAAA):');
                } else {
                    await client.sendMessage(numero, '❌ Você não está cadastrado. Digite *cadastrar*');
                }
                break;

            case '3':
                if (usuarioCadastrado(numero)) {
                    delete examesData.pacientes[numero];
                    salvarDados();
                    await client.sendMessage(numero, '✅ Exame cancelado com sucesso!');
                } else {
                    await client.sendMessage(numero, '❌ Você não possui cadastro');
                }
                break;

            case 'menu':
                await exibirMenu(numero);
                break;

            default:
                await client.sendMessage(numero, '🔍 Digite *menu* para ver as opções');
        }
    } catch (error) {
        console.error('Erro no handler:', error);
        await client.sendMessage(numero, '⚠️ Ocorreu um erro. Tente novamente!');
    }
});

// ========== INICIALIZAÇÃO DO BOT ==========
client.on('qr', async qr => {
    await QRCode.toFile('qr.png', qr, { scale: 8 });
    console.log('🔑 QR Code gerado: qr.png');
});

client.on('ready', () => {
    console.log('🤖 Bot online!');
    inicializarArquivoDados();
    setInterval(verificarNotificacoes, 60 * 1000);
    verificarNotificacoes();
});

client.initialize();