// ================= VARIÁVEIS GLOBAIS =================
let encomendas = JSON.parse(localStorage.getItem('encomendas')) || [];
let selecionadaId = null;
let canvas, ctx, desenhando = false;

// ================= SALVAR NOVO RECEBIMENTO =================
document.getElementById('formRecebimento').addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const arquivo = document.getElementById('fotoEncomenda').files[0];
    let fotoBase64 = "";

    if (arquivo) {
        fotoBase64 = await reduzirEConverterFoto(arquivo);
    }

    const nova = {
        id: Date.now(),
        nf: document.getElementById('notaFiscal').value,
        torre: document.getElementById('torre').value,
        sala: document.getElementById('sala').value,
        destinatario: document.getElementById('destinatario').value,
        telefone: document.getElementById('telefone').value,
        foto: fotoBase64, // Aqui salvamos a foto reduzida
        data: new Date().toLocaleDateString('pt-BR'),
        status: 'Aguardando retirada',
        quemRetirou: '',
        dataRetirada: '',
        assinatura: ''
    };
    
    encomendas.push(nova);
    salvarEAtualizar();
    this.reset();
});

function salvarEAtualizar() {
    localStorage.setItem('encomendas', JSON.stringify(encomendas));
    atualizarDashboard();
    renderizarTabela();
}

function atualizarDashboard() {
    const hoje = new Date().toLocaleDateString('pt-BR');
    document.getElementById('dashTotal').innerText = encomendas.filter(e => e.data === hoje).length;
    document.getElementById('dashAguardando').innerText = encomendas.filter(e => e.status === 'Aguardando retirada').length;
    document.getElementById('dashRetirados').innerText = encomendas.filter(e => e.status === 'Retirado').length;
}

// ================= RENDERIZAR TABELA (ESQUERDA) =================
function renderizarTabela(dados = encomendas) {
    const corpo = document.getElementById('listaCorpo');
    if (!corpo) return;
    corpo.innerHTML = '';
    dados.forEach(item => {
        const tr = document.createElement('tr');
        tr.onclick = () => selecionarUnica(item.id);
        tr.innerHTML = `
            <td>${item.data}</td>
            <td>${item.nf}</td>
            <td>${item.sala}</td>
            <td>${item.destinatario}</td>
            <td style="font-weight:bold; color:${item.status === 'Retirado' ? 'green' : '#f59e0b'}">${item.status}</td>
            <td><button onclick="event.stopPropagation(); apagar(${item.id})" style="cursor:pointer;">🗑️</button></td>
        `;
        corpo.appendChild(tr);
    });
}

// ================= FILTROS E PAINEL LATERAL =================
function aplicarFiltros() {
    const fSala = document.getElementById('filtroSala').value.toLowerCase();
    const fNome = document.getElementById('filtroNome').value.toLowerCase();
    const fNF = document.getElementById('filtroNF').value.toLowerCase();
    const fStatus = document.getElementById('filtroStatus').value;

    const filtrados = encomendas.filter(e => {
        return (fSala === "" || e.sala.toLowerCase().includes(fSala)) &&
               (fNome === "" || e.destinatario.toLowerCase().includes(fNome)) &&
               (fNF === "" || e.nf.toLowerCase().includes(fNF)) &&
               (fStatus === "" || e.status === fStatus);
    });

    renderizarTabela(filtrados);
    montarPainelLateral(filtrados);
}

function visualizarTudo() {
    // Limpa campos visuais dos filtros
    document.getElementById('filtroSala').value = "";
    document.getElementById('filtroNome').value = "";
    document.getElementById('filtroNF').value = "";
    document.getElementById('filtroStatus').value = "";
    
    renderizarTabela(encomendas);
    montarPainelLateral(encomendas);
}

function montarPainelLateral(lista) {
    const conteudo = document.getElementById('resultadoConteudo');
    const blocoR = document.getElementById('blocoConfirmarRetirada');
    blocoR.style.display = 'none';

    if (lista.length === 0) {
        conteudo.innerHTML = "Nenhum resultado encontrado.";
        return;
    }

    // Se houver apenas 1 resultado no filtro, detalha ele automaticamente
    if (lista.length === 1) {
        selecionarUnica(lista[0].id);
        return;
    }

    const pendentes = lista.filter(e => e.status === 'Aguardando retirada');
    const retiradas = lista.filter(e => e.status === 'Retirado');

    let html = `<h4>${lista.length} Resultados Encontrados</h4>`;

    if (pendentes.length > 0) {
        html += `<h5 style="color:#f59e0b; border-bottom: 2px solid #f59e0b;">📦 A RETIRAR (${pendentes.length})</h5>`;
        pendentes.forEach(item => {
            html += `<div class="card-detalhe-lista" style="border-left:5px solid #f59e0b; cursor:pointer;" onclick="selecionarUnica(${item.id})">
                <strong>NF: ${item.nf}</strong> - Sala ${item.sala}<br>
                👤 ${item.destinatario}
            </div>`;
        });
    }

    if (retiradas.length > 0) {
        html += `<h5 style="color:green; border-bottom: 2px solid green; margin-top:15px;">✅ RETIRADAS (${retiradas.length})</h5>`;
        retiradas.forEach(item => {
            html += `<div class="card-detalhe-lista" style="border-left:5px solid green; cursor:pointer;" onclick="selecionarUnica(${item.id})">
                <strong>NF: ${item.nf}</strong> - Sala ${item.sala}<br>
                👤 ${item.destinatario}
            </div>`;
        });
    }
    conteudo.innerHTML = html;
}

// ================= DETALHES E ASSINATURA =================
function selecionarUnica(id) {
    selecionadaId = id;
    const item = encomendas.find(e => e.id === id);
    if (!item) return;
    
    // O código abaixo "desenha" as informações no painel da direita
    document.getElementById('resultadoConteudo').innerHTML = `
        <div class="card-detalhe-lista" style="border-left:5px solid #2563eb; background:#fff;">
            <h4>📋 Detalhes</h4>
            <p><strong>NF:</strong> ${item.nf}</p>
            <p><strong>Nome:</strong> ${item.destinatario}</p>
            <p><strong>Local:</strong> Sala ${item.sala} (${item.torre})</p>
            <p><strong>Status:</strong> ${item.status}</p>

            ${item.foto ? `
                <p><strong>📸 Foto do Pacote:</strong><br>
                <img src="${item.foto}" style="width:100%; border-radius:8px; margin-top:5px; border:1px solid #ddd;">
                </p>` : ''}

            ${item.status === 'Aguardando retirada' ? `
                <button onclick="enviarAvisoWhatsapp(${item.id})" 
                        style="background:#25d366; color:white; border:none; padding:10px; border-radius:5px; cursor:pointer; font-weight:bold; margin-top:10px; width:100%;">
                    🟢 Avisar Morador (WhatsApp)
                </button>
            ` : ''}

            <hr style="margin: 15px 0; border: 0; border-top: 1px solid #eee;">
            
            ${item.dataRetirada ? `<p style="color:green"><strong>Entregue em:</strong> ${item.dataRetirada}</p>` : ''}
            ${item.quemRetirou ? `<p><strong>Recebedor:</strong> ${item.quemRetirou}</p>` : ''}
            // Localize onde você exibe o nome de quem retirou e cole isso logo abaixo:

${item.status === 'Retirado' && item.telefone ? `
    <button onclick="enviarComprovanteRetirada(${item.id})" 
            style="background:#075e54; color:white; border:none; padding:10px; border-radius:5px; cursor:pointer; font-weight:bold; margin-top:10px; width:100%; display:flex; align-items:center; justify-content:center; gap:8px;">
        📄 Enviar Comprovante no WhatsApp
    </button>
` : ''}            
            ${item.assinatura ? `
                <p><strong>Assinatura:</strong><br>
                <img src="${item.assinatura}" style="width:100%; border:1px solid #eee; background:#f9f9f9; margin-top:5px;">
                </p>` : ''}
        </div>
    `;

    // Lógica para mostrar ou esconder o bloco de assinar (o canvas)
    const blocoR = document.getElementById('blocoConfirmarRetirada');
    if (item.status === 'Aguardando retirada') {
        blocoR.style.display = 'block';
        // Aqui dentro o código do Canvas que já fizemos continua igual...
        blocoR.innerHTML = `
            <h3 style="color:green; margin-top:0">✅ Confirmar Entrega</h3>
            <input type="text" id="nomeRec" placeholder="Nome de quem retira" style="width:100%; padding:10px; margin-bottom:10px; border:1px solid #ccc; border-radius:5px; box-sizing:border-box;">
            <label>Assine abaixo:</label>
            <div style="border:1px solid #ccc; background:#fff; margin:10px 0;">
                <canvas id="canvasAssinatura" width="340" height="150" style="cursor:crosshair; width:100%; display:block;"></canvas>
            </div>
            <div style="display:flex; gap:5px;">
                <button onclick="limparAssinatura()" style="flex:1; padding:10px; border-radius:5px; border:1px solid #ccc; background:#f1f5f9;">Limpar</button>
                <button onclick="finalizarEntrega()" style="flex:2; background:green; color:white; border:none; padding:10px; border-radius:5px; font-weight:bold;">Finalizar</button>
            </div>
        `;
        configurarCanvas();
    } else {
        blocoR.style.display = 'none';
    }
}

// ================= LÓGICA DO CANVAS (DESENHO) =================
function configurarCanvas() {
    canvas = document.getElementById('canvasAssinatura');
    if (!canvas) return;
    ctx = canvas.getContext('2d');
    
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#000';

    const obterPosicao = (e) => {
        const rect = canvas.getBoundingClientRect();
        // Lógica para Mouse ou Touch (Celular)
        const clientX = e.clientX || (e.touches && e.touches[0].clientX);
        const clientY = e.clientY || (e.touches && e.touches[0].clientY);
        return {
            x: clientX - rect.left,
            y: clientY - rect.top
        };
    };

    const desenhar = (e) => {
        if (!desenhando) return;
        const pos = obterPosicao(e);
        ctx.lineTo(pos.x, pos.y);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(pos.x, pos.y);
    };

    // Eventos Mouse
    canvas.addEventListener('mousedown', (e) => { desenhando = true; ctx.beginPath(); desenhar(e); });
    window.addEventListener('mouseup', () => { desenhando = false; ctx.beginPath(); });
    canvas.addEventListener('mousemove', desenhar);
    
    // Eventos Touch (Celular/Tablet)
    canvas.addEventListener('touchstart', (e) => { 
        desenhando = true; 
        ctx.beginPath();
        desenhar(e.touches[0]); 
        e.preventDefault(); 
    }, {passive: false});
    
    canvas.addEventListener('touchmove', (e) => { 
        desenhar(e.touches[0]); 
        e.preventDefault(); 
    }, {passive: false});

    window.addEventListener('touchend', () => { desenhando = false; ctx.beginPath(); });
}

function limparAssinatura() {
    if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
}

// ================= FINALIZAÇÃO COM DATA E HORA =================
function finalizarEntrega() {
    const nome = document.getElementById('nomeRec').value;
    if(!nome) return alert("Por favor, digite o nome de quem está retirando.");
    
    // Captura a assinatura
    const assinaturaImg = canvas.toDataURL(); 
    const idx = encomendas.findIndex(e => e.id === selecionadaId);
    
    // Grava Status, Nome, Data/Hora e Assinatura
    encomendas[idx].status = 'Retirado';
    encomendas[idx].quemRetirou = nome;
    encomendas[idx].dataRetirada = new Date().toLocaleString('pt-BR'); // Ex: 04/02/2026 15:30:10
    encomendas[idx].assinatura = assinaturaImg;
    
    salvarEAtualizar();
    selecionarUnica(selecionadaId); // Atualiza visualização com a assinatura salva
}

function apagar(id) {
    if(confirm("Deseja realmente excluir este registro?")) {
        encomendas = encomendas.filter(e => e.id !== id);
        salvarEAtualizar();
        document.getElementById('resultadoConteudo').innerHTML = "Registro removido.";
        document.getElementById('blocoConfirmarRetirada').style.display = 'none';
    }
}

// Inicializa o sistema ao carregar a página
atualizarDashboard();
renderizarTabela();
// Esta função prepara e abre o WhatsApp
function enviarAvisoWhatsapp(id) {
    // 1. Localiza a encomenda pelo ID
    const item = encomendas.find(e => e.id === id);
    
    // 2. Verifica se tem telefone. Se não tiver, avisa você.
    if (!item.telefone || item.telefone.trim() === "") {
        alert("Ops! Você não cadastrou um telefone para esta nota.");
        return;
    }

    // 3. Limpa o número: remove espaços e traços, deixando só números
    const tel = item.telefone.replace(/\D/g, '');
    
    // 4. Cria o texto. O \n serve para "pular linha" no WhatsApp
    const texto = `Olá, *${item.destinatario}*! 📦\n` +
                  `Sua encomenda da NF *${item.nf}* chegou.\n` +
                  `Retire no -1 Setor de Encomendas *Sala${item.sala}*.`;

    // 5. Monta o link final
    const link = `https://api.whatsapp.com/send?phone=55${tel}&text=${encodeURIComponent(texto)}`;

    // 6. Abre o WhatsApp em uma nova aba
    window.open(link, '_blank');
}
// Função para Exportar os dados para Excel (CSV)
function exportarCSV() {
    if (encomendas.length === 0) {
        alert("Não há dados para exportar.");
        return;
    }

    // 1. Definimos o cabeçalho do Excel
    // Usamos o ponto e vírgula (;) como separador para o Excel reconhecer as colunas automaticamente no Brasil/Portugal
    let csvContent = "Data;NF;Torre;Sala;Destinatario;Status;Retirado Por;Data Retirada\n";

    // 2. Percorremos cada encomenda e adicionamos uma linha no ficheiro
    encomendas.forEach(item => {
        let linha = [
            item.data,
            item.nf,
            item.torre,
            item.sala,
            item.destinatario,
            item.status,
            item.quemRetirou || "N/A", // Se não tiver nome, escreve N/A
            item.dataRetirada || "N/A"
        ].join(";"); // Une os dados com ponto e vírgula
        
        csvContent += linha + "\n";
    });

    // 3. Criamos o ficheiro para download
    // O "BOM" (\uFEFF) serve para o Excel entender acentos corretamente (UTF-8)
    const blob = new Blob(["\uFEFF" + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    
    // 4. Criamos um link "invisível" para disparar o download no telemóvel
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `relatorio_encomendas_${new Date().toLocaleDateString('pt-BR')}.csv`);
    document.body.appendChild(link);
    
    link.click(); // Simula o clique
    document.body.removeChild(link); // Remove o link após o uso
}
function reduzirEConverterFoto(arquivo) {
    return new Promise((resolve) => {
        const leitor = new FileReader();
        leitor.readAsDataURL(arquivo);
        leitor.onload = (event) => {
            const img = new Image();
            img.src = event.target.result;
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const MAX_WIDTH = 400; // Reduzimos a largura para 400px (suficiente para ver o pacote)
                const scaleSize = MAX_WIDTH / img.width;
                canvas.width = MAX_WIDTH;
                canvas.height = img.height * scaleSize;

                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                
                // Exporta a imagem com qualidade reduzida (0.7) para economizar espaço
                resolve(canvas.toDataURL('image/jpeg', 0.7));
            };
        };
    });
}
// Função para enviar o comprovante de retirada por WhatsApp
function enviarComprovanteRetirada(id) {
    const item = encomendas.find(e => e.id === id);
    if (!item || !item.telefone) {
        alert("Telefone não encontrado.");
        return;
    }

    const tel = item.telefone.replace(/\D/g, '');
    
    // Mensagem de confirmação detalhada
    const mensagem = `✅ *Confirmação de Retirada*\n\n` +
                     `Olá, *${item.destinatario}*!\n` +
                     `Sua encomenda (NF: *${item.nf}*) foi retirada agora.\n\n` +
                     `👤 *Quem retirou:* ${item.quemRetirou}\n` +
                     `⏰ *Data/Hora:* ${item.dataRetirada}\n\n` +
                     `Obrigado!`;

    const url = `https://api.whatsapp.com/send?phone=55${tel}&text=${encodeURIComponent(mensagem)}`;
    window.open(url, '_blank');
}