/* =================== ESTADO =================== */
const TOTAL_POR_TENTATIVA = 4; // Valor fixo para 4 questões
let questoesSelecionadas = [];
let indiceQuestao = 0;
let respostaSelecionada = null;
let acertos = 0;
let todasQuestoes = [];

/* =================== CONFIGURAÇÃO =================== */
const arquivosQuestoes = {
  'Álgebra': 'data/algebra.json',
  'Geometria': 'data/geometria.json',
  'Grandezas e Medidas': 'data/medidas.json',
  'Números e Operações': 'data/numeros.json',
  'Probabilidade e Estatística': 'data/probabilidade_estatistica.json'
};

/* =================== SOM =================== */
let audioCtx=null;
function ensureAudio(){
  if(!audioCtx) audioCtx = new (window.AudioContext||window.webkitAudioContext)();
  if(audioCtx.state==="suspended") audioCtx.resume();
}
function somAcerto(){
  ensureAudio();
  const t=audioCtx.currentTime;
  const g=audioCtx.createGain();
  g.gain.setValueAtTime(0.0001,t);
  g.gain.exponentialRampToValueAtTime(0.18,t+0.02);
  g.gain.exponentialRampToValueAtTime(0.0001,t+0.35);
  const o1=audioCtx.createOscillator();
  const o2=audioCtx.createOscillator();
  o1.type="sine"; o2.type="sine";
  o1.frequency.setValueAtTime(660,t);
  o2.frequency.setValueAtTime(880,t+0.02);
  o1.connect(g); o2.connect(g); g.connect(audioCtx.destination);
  o1.start(t); o2.start(t+0.01);
  o1.stop(t+0.36); o2.stop(t+0.36);
}
function somErro(){
  ensureAudio();
  const t=audioCtx.currentTime;
  const g=audioCtx.createGain();
  g.gain.setValueAtTime(0.0001,t);
  g.gain.exponentialRampToValueAtTime(0.12,t+0.02);
  g.gain.exponentialRampToValueAtTime(0.0001,t+0.35);
  const o=audioCtx.createOscillator();
  o.type="sine";
  o.frequency.setValueAtTime(440,t);
  o.frequency.exponentialRampToValueAtTime(320,t+0.25);
  o.connect(g); g.connect(audioCtx.destination);
  o.start(t); o.stop(t+0.35);
}

/* =================== FUNÇÕES DE CARREGAMENTO =================== */
async function carregarTodasQuestoes(){
  if (todasQuestoes.length > 0) {
    return;
  }
  
  let pool = [];
  const baseHref = window.location.pathname.endsWith('/') ? window.location.pathname : window.location.pathname.substring(0, window.location.pathname.lastIndexOf('/') + 1);
  const arquivos = Object.values(arquivosQuestoes);
  
  try {
    const promessas = arquivos.map(arq => fetch(baseHref + arq).then(res => res.json()));
    const resultados = await Promise.all(promessas);
    resultados.forEach(res => pool = pool.concat(res));
  } catch (error) {
    console.error("Erro ao carregar as questões:", error);
    alert("Ocorreu um erro ao carregar as questões. Tente novamente mais tarde.");
    return;
  }
  
  todasQuestoes = pool;
}

/* =================== FUNÇÕES DE INÍCIO DO QUIZ =================== */
function iniciarQuiz(pool){
  acertos = 0;
  indiceQuestao = 0;
  respostaSelecionada = null;
  
  // Usa o valor fixo TOTAL_POR_TENTATIVA
  questoesSelecionadas = embaralhar(pool).slice(0, Math.min(TOTAL_POR_TENTATIVA, pool.length));
  
  if (questoesSelecionadas.length === 0) {
      alert("Nenhuma questão encontrada para a seleção. Verifique o console para mais detalhes.");
      console.error("Pool de questões vazio para a seleção:", pool);
      reiniciarQuiz();
      return;
  }

  const quizCard = document.getElementById("quizCard");
  quizCard.style.display="block";
  quizCard.innerHTML = `
    <div class="pergunta-card">
      <div class="progresso">
        <div id="barraProgresso"></div>
      </div>
      <h2 id="cabecalho1"></h2>
      <p id="cabecalho2" class="dados-prova"></p>
      <h3 id="pergunta"></h3>
      <img id="imagemQuestao" src="" alt="Imagem da questão" style="display:none;">
      <div id="alternativas" class="alternativas-lista"></div>
    </div>
    <div id="mensagem" aria-live="assertive"></div>
    <div class="botoes">
      <button id="confirmarBtn" onclick="confirmarResposta()">Confirmar</button>
      <button id="proximaBtn" onclick="proximaQuestao()">Próxima</button>
      <button id="reiniciarBtn" onclick="reiniciarQuiz()">Reiniciar</button>
    </div>
  `;

  const conteudoArea = document.querySelector('.conteudo-area');
  if (conteudoArea) {
    conteudoArea.style.display = "none";
  }

  document.getElementById("reiniciarBtn").style.display="none";
  document.getElementById("mensagem").innerHTML = "";

  atualizarBarraProgresso();
  mostrarQuestao();
  
  // Garante que o MathJax seja renderizado no início do quiz
  if (window.MathJax) {
    MathJax.typesetPromise([document.getElementById("quizCard")]);
  }
}

async function iniciarQuizPorAssunto(area, assunto){
  await carregarTodasQuestoes();
  const pool = todasQuestoes.filter(q => q.area === area && q.assunto === assunto);
  // Chama a função iniciarQuiz sem o segundo parâmetro
  iniciarQuiz(pool);
}

/* =================== FUNÇÕES DE BUSCA =================== */
async function buscarHabilidade(){
  const habilidade = document.getElementById('inputHabilidade').value.trim().toUpperCase();
  const resultadosDiv = document.getElementById('resultados');
  resultadosDiv.innerHTML = 'Carregando...';

  if (!habilidade) {
      resultadosDiv.innerHTML = '<p>Por favor, digite um código de habilidade.</p>';
      return;
  }
  
  await carregarTodasQuestoes();
  const questoesEncontradas = todasQuestoes.filter(q => q.habilidade_bncc.toUpperCase().includes(habilidade));
  
  if (questoesEncontradas.length === 0) {
      resultadosDiv.innerHTML = '<p>Nenhuma questão encontrada para esta habilidade.</p>';
      return;
  }
  
  let htmlResultados = `<h3>${questoesEncontradas.length} Questões Encontradas:</h3>`;
  questoesEncontradas.forEach((q, index) => {
      const imgHtml = q.imagem ? `<img src="${q.imagem}" alt="Imagem da questão"/>` : '';
      htmlResultados += `
        <div class="bloco-assunto">
          <h4>${q.disciplina} | ${q.area} | ${q.assunto}</h4>
          <p>${q.pergunta}</p>
          ${imgHtml}
          <div class="materiais">
            <button class="material-btn quiz-btn" onclick="iniciarQuiz([todasQuestoes.find(item => item.codigo === '${q.codigo}')])">
              Fazer Quiz
            </button>
          </div>
        </div>
      `;
  });
  resultadosDiv.innerHTML = htmlResultados;
  if (window.MathJax) {
    MathJax.typesetPromise();
  }
}

// A nova função para mostrar todas as habilidades
function mostrarTodasHabilidades() {
  const resultadosDiv = document.getElementById('resultados');
  resultadosDiv.innerHTML = 'Carregando...';

  const habilidadesOrdenadas = habilidadesBNCC.sort((a, b) => a.codigo.localeCompare(b.codigo));
  
  let htmlResultados = `<h3>Habilidades Encontradas:</h3>`;
  htmlResultados += `<ul>`;
  
// Apenas esta linha foi alterada para incluir a classe
  htmlResultados += `<ul class="habilidades-lista">`;
  
  habilidadesOrdenadas.forEach(habilidade => {
    htmlResultados += `
      <li>
        <strong>${habilidade.codigo}</strong>: ${habilidade.descricao}
        <button onclick="buscarHabilidadeComCodigo('${habilidade.codigo}')">Ver questões</button>
      </li>
    `;
  });

  htmlResultados += `</ul>`;
  resultadosDiv.innerHTML = htmlResultados;
}

function buscarHabilidadeComCodigo(codigo) {
    document.getElementById('inputHabilidade').value = codigo;
    buscarHabilidade();
}

/* =================== FUNÇÕES DE VISUALIZAÇÃO DO QUIZ =================== */
function mostrarQuestao(){
  const q = questoesSelecionadas[indiceQuestao];
  document.getElementById("cabecalho1").textContent = `Código: ${q.codigo} | ${q.disciplina} | ${q.area}`;
  document.getElementById("cabecalho2").textContent = `Ano: ${q.ano} | Banca/Órgão: ${q.banca} | ${q.orgao} | Prova: ${q.prova}`;
  const perguntaEl = document.getElementById("pergunta");
  perguntaEl.innerHTML = q.pergunta;
  const img = document.getElementById("imagemQuestao");
  if(q.imagem){ img.src=q.imagem; img.style.display="block"; }
  else { img.style.display="none"; }
  const letras=["A","B","C","D"];
  const altHtml = q.alternativas.map((alt,i)=>
    `<div class="alternativa" onclick="selecionarAlternativa(${i})" role="button" tabindex="0">
       <span class="letra">${letras[i]}</span> ${alt}
     </div>`).join("");
  document.getElementById("alternativas").innerHTML = altHtml;
  document.getElementById("mensagem").innerHTML = "";
  respostaSelecionada = null;
  document.getElementById("confirmarBtn").style.display="inline-block";
  document.getElementById("proximaBtn").style.display="none";
  atualizarBarraProgresso();
  if (window.MathJax) { MathJax.typesetPromise([perguntaEl]); }
}

function selecionarAlternativa(i){
  document.querySelectorAll(".alternativa").forEach(el=>el.classList.remove("selecionada"));
  const lista = document.querySelectorAll(".alternativa");
  if(!lista[i]) return;
  lista[i].classList.add("selecionada");
  respostaSelecionada = i;
}

function confirmarResposta(){
  if(respostaSelecionada===null){
    alert("Selecione uma alternativa antes de confirmar.");
    return;
  }
  const q = questoesSelecionadas[indiceQuestao];
  const correta = q.correta;

  questoesSelecionadas[indiceQuestao].respostaDoUsuario = respostaSelecionada;

  if(respostaSelecionada===correta){
    document.getElementById("mensagem").innerHTML = `<span class="msg-acerto">✅ Muito bem! Você acertou.</span><span id="particles">🎉</span>`;
    somAcerto();
    acertos++;
  } else {
    const textoCorreto = q.alternativas[correta];
    document.getElementById("mensagem").innerHTML = `<span class="msg-erro">❌ Não foi dessa vez. Correta: ${textoCorreto}</span>`;
    somErro();
  }
  document.getElementById("confirmarBtn").style.display="none";
  document.getElementById("proximaBtn").style.display="inline-block";
}

function proximaQuestao(){
  indiceQuestao++;
  if(indiceQuestao < questoesSelecionadas.length){
    mostrarQuestao();
  } else {
    mostrarGabarito();
  }
}

function mostrarGabarito() {
  const total = questoesSelecionadas.length;
  const quizCard = document.getElementById("quizCard");

  let gabaritoHTML = `
    <div class="pergunta-card">
      <h2 style="color: var(--azul);">${acertos} de ${total} Acertos</h2>
      <p>Revisão das questões:</p>
    </div>
  `;

  questoesSelecionadas.forEach((q, i) => {
    const letras = ["A", "B", "C", "D"];
    const respostaCorreta = q.correta;
    const respostaUsuario = q.respostaDoUsuario;
    const acertou = (respostaUsuario === respostaCorreta);
    
    let alternativasHTML = q.alternativas.map((alt, index) => {
      let classe = '';
      if (index === respostaCorreta) {
        classe = 'alternativa-correta';
      }
      if (index === respostaUsuario && !acertou) {
        classe = 'alternativa-errada';
      }
      return `<li class="${classe}">
          <span class="letra">${letras[index]}</span> ${alt}
        </li>`;
    }).join('');

    gabaritoHTML += `
      <div class="bloco-gabarito">
        <h3>Questão ${i + 1}</h3>
        <p>${q.pergunta}</p>
        <div class="gabarito-respostas">
          <ul>
            ${alternativasHTML}
          </ul>
        </div>
        <div class="gabarito-status">
          ${acertou ? '✅ Sua resposta está correta!' : '❌ Sua resposta está incorreta.'}
        </div>
      </div>
    `;
  });

  quizCard.innerHTML = gabaritoHTML;
  quizCard.innerHTML += `<div class="botoes"><button id="reiniciarBtn" onclick="reiniciarQuiz()">Reiniciar</button></div>`;
  document.getElementById("reiniciarBtn").style.display = "inline-block";
  atualizarBarraProgresso(100);

  // Renderiza o LaTeX no novo conteúdo do gabarito
  if (window.MathJax) {
    MathJax.typesetPromise([quizCard]);
  }
}

function reiniciarQuiz(){
  const quizCard = document.getElementById("quizCard");
  quizCard.style.display="none";
  
  // Re-cria a estrutura HTML do quiz para a próxima partida
  quizCard.innerHTML = `
    <div class="pergunta-card">
      <div class="progresso">
        <div id="barraProgresso"></div>
      </div>
      <h2 id="cabecalho1"></h2>
      <p id="cabecalho2" class="dados-prova"></p>
      <h3 id="pergunta"></h3>
      <img id="imagemQuestao" src="" alt="Imagem da questão" style="display:none;">
      <div id="alternativas" class="alternativas-lista"></div>
    </div>
    <div id="mensagem" aria-live="assertive"></div>
    <div class="botoes">
      <button id="confirmarBtn" onclick="confirmarResposta()">Confirmar</button>
      <button id="proximaBtn" onclick="proximaQuestao()">Próxima</button>
      <button id="reiniciarBtn" onclick="reiniciarQuiz()">Reiniciar</button>
    </div>
  `;

  const conteudoArea = document.querySelector('.conteudo-area');
  if (conteudoArea) {
    conteudoArea.style.display = "block";
  }
  const resultados = document.getElementById("resultados");
  if (resultados) {
    resultados.innerHTML = "";
  }
  acertos = 0;
  indiceQuestao = 0;
  respostaSelecionada = null;
  atualizarBarraProgresso(0);
}

/* =================== UTIL =================== */
function embaralhar(arr){
  const a = arr.slice();
  for(let i=a.length-1;i>0;i--){
    const j = Math.floor(Math.random()*(i+1));
    [a[i],a[j]] = [a[j],a[i]];
  }
  return a;
}
function atualizarBarraProgresso(forcarPct){
  const el = document.getElementById("barraProgresso");
  const total = questoesSelecionadas.length;
  const pct = (typeof forcarPct === "number") ? forcarPct : (total ? Math.round((indiceQuestao/total)*100) : 0);
  el.style.width = pct + "%";
}
document.addEventListener("keydown", (e)=>{
  if(e.key==="Enter"){
    const foco = document.activeElement;
    if(foco && foco.classList.contains("alternativa")){
      const idx = Array.from(document.querySelectorAll(".alternativa")).indexOf(foco);
      if(idx>=0) selecionarAlternativa(idx);
    }
  }
});
