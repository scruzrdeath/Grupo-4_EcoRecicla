/**
 * ARCHIVO: registro.js
 * RESPONSABILIDAD: registro de materiales, estadísticas, ranking y reloj simulador.
 *
 * Organización interna (separación de responsabilidades):
 *   1. Configuración (constantes)      4. Modelo   (getLeaderboardData)
 *   2. Reloj simulador                 5. Vista    (render*)
 *   3. Repositorio (load/saveRecords)  6. Controladores / eventos
 */
// ---------- Vista: Registro + Ranking ----------
// [BUENA PRÁCTICA: constantes con nombre] Evita "strings mágicos" repetidos por el código.
var STORAGE_KEY_REGISTROS = 'ecorecicla_registros';
var STORAGE_KEY_CURRENT_USER = 'ecorecicla_usuario_actual';
var STORAGE_KEY_RANKING_STATUS = 'ecorecicla_ranking_estado';
var STORAGE_KEY_SECONDS = 'ecorecicla_sim_seconds';

// [PATRÓN: Singleton (a nivel de módulo)] currentSeconds, clockInterval e isClockRunning
// son el único estado del reloj y se comparten por todas las funciones de este archivo.
// Reloj simulador de 24 horas
var currentSeconds = parseInt(localStorage.getItem(STORAGE_KEY_SECONDS) || '0', 10);
var clockInterval = null;
var isClockRunning = true;

function updateClockDisplay() {
  var hours = Math.floor(currentSeconds / 3600) % 24;
  var minutes = Math.floor((currentSeconds % 3600) / 60);
  var seconds = currentSeconds % 60;
  var pad = function(n){ return n.toString().padStart(2, '0'); };
  document.getElementById('clockDisplay').textContent = pad(hours) + ':' + pad(minutes) + ':' + pad(seconds);
}

// [PATRÓN: Observer / Timer] setInterval notifica a tick() periódicamente y éste actualiza la vista.
function tick() {
  currentSeconds += 1;
  localStorage.setItem(STORAGE_KEY_SECONDS, currentSeconds);

  if (currentSeconds >= 86400) {
    trigger24HourReset();
    return;
  }
  updateClockDisplay();
}

function startClock() {
  if (!clockInterval) {
    clockInterval = setInterval(tick, 200);
  }
  isClockRunning = true;
  document.getElementById('toggleClockBtn').textContent = '⏸ Pausar';
}

function stopClock() {
  if (clockInterval) {
    clearInterval(clockInterval);
    clockInterval = null;
  }
  isClockRunning = false;
  document.getElementById('toggleClockBtn').textContent = '▶ Reanudar';
}

function toggleClock() {
  if (isClockRunning) stopClock();
  else startClock();
}

function addTime(minutes) {
  currentSeconds += minutes * 60;
  if (currentSeconds >= 86400) {
    trigger24HourReset();
  } else {
    localStorage.setItem(STORAGE_KEY_SECONDS, currentSeconds);
    updateClockDisplay();
  }
}

function trigger24HourReset() {
  currentSeconds = 0;
  localStorage.setItem(STORAGE_KEY_SECONDS, '0');
  updateClockDisplay();

  var leaderboard = getLeaderboardData();
  var winner = leaderboard[0];

  localStorage.setItem(STORAGE_KEY_RANKING_STATUS, 'finalizado');

  alert('⏰ ¡Han transcurrido 24 horas! La jornada ha terminado.\n\n🏆 GANADOR DE HOY: ' + winner.username + ' con ' + winner.points.toLocaleString() + ' puntos.\n\nEl ranking se reiniciará a 0 para el nuevo ciclo.');

  localStorage.removeItem(STORAGE_KEY_REGISTROS);
  localStorage.removeItem(STORAGE_KEY_RANKING_STATUS);

  renderStats();
  renderRanking();
}

// Navegación entre sub-pestañas Registro / Ranking
// [PATRÓN: State (simple)] Controla qué sub-vista (Registrar / Ranking) está activa.
function switchSubTab(tabName) {
  document.querySelectorAll('#view-registro .view-section').forEach(function(sec){ sec.classList.remove('active'); });
  document.querySelectorAll('#view-registro .tab-btn').forEach(function(btn){ btn.classList.remove('active'); });

  if (tabName === 'registro') {
    document.getElementById('subview-registro').classList.add('active');
    document.querySelectorAll('#view-registro .tab-btn')[0].classList.add('active');
  } else {
    document.getElementById('subview-ranking').classList.add('active');
    document.querySelectorAll('#view-registro .tab-btn')[1].classList.add('active');
    renderRanking();
  }
}

// [PATRÓN: Repository] loadRecords() y saveRecords() ocultan cómo se guardan los datos (localStorage).
// Si mañana se cambia por una API, solo se modifican estas dos funciones.
// [BUENA PRÁCTICA: manejo básico de errores] try/catch ante JSON inválido o almacenamiento lleno.
function loadRecords() {
  try {
    var raw = localStorage.getItem(STORAGE_KEY_REGISTROS);
    return raw ? JSON.parse(raw) : [];
  } catch (e) { return []; }
}

function saveRecords(records) {
  try {
    localStorage.setItem(STORAGE_KEY_REGISTROS, JSON.stringify(records));
  } catch (e) { console.error('Error guardando registros', e); }
}

function getCurrentUser() {
  return localStorage.getItem(STORAGE_KEY_CURRENT_USER) || document.getElementById('usuario').value;
}

function startOfWeek(date) {
  var d = new Date(date);
  var day = d.getDay();
  var diff = d.getDate() - day + (day === 0 ? -6 : 1);
  var monday = new Date(d.setDate(diff));
  monday.setHours(0,0,0,0);
  return monday;
}

// [PATRÓN: MVC – capa Vista] Las funciones render* solo dibujan en el DOM los datos que reciben.
function renderStats() {
  var records = loadRecords();
  var totalWeight = records.reduce(function(sum, r){ return sum + r.peso; }, 0);

  var weekStart = startOfWeek(new Date());
  var weeklyWeight = records
    .filter(function(r){ return new Date(r.fecha) >= weekStart; })
    .reduce(function(sum, r){ return sum + r.peso; }, 0);

  document.getElementById('totalWeight').textContent = totalWeight.toFixed(2) + ' kg';
  document.getElementById('weeklyWeight').textContent = weeklyWeight.toFixed(2) + ' kg';
  document.getElementById('totalRecords').textContent = records.length;
}

function renderHistory() {
  var records = loadRecords().slice().reverse();
  var container = document.getElementById('historyContent');

  if (records.length === 0) {
    container.innerHTML = '<p class="empty-msg">Aún no hay registros.</p>';
    return;
  }

  var html = '<table class="modal-table"><thead><tr><th>Fecha</th><th>Usuario</th><th>Material</th><th>Peso (kg)</th><th>Cant.</th><th>Descripción</th></tr></thead><tbody>';
  records.forEach(function(r){
    var fecha = new Date(r.fecha).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });
    var desc = r.descripcion ? r.descripcion : '—';
    html += '<tr><td>' + fecha + '</td><td>' + r.usuario + '</td><td>' + r.material + '</td><td>' + r.peso.toFixed(2) + '</td><td>' + r.cantidad + '</td><td>' + desc + '</td></tr>';
  });
  html += '</tbody></table>';
  container.innerHTML = html;
}

function openModal() {
  renderHistory();
  document.getElementById('modalOverlay').classList.add('open');
}

function closeModal() {
  document.getElementById('modalOverlay').classList.remove('open');
}

// [PATRÓN: MVC – capa Modelo] Aquí vive la lógica de negocio: 1 kg = 100 puntos y el Top 10.
function getLeaderboardData() {
  var records = loadRecords();

  var baseUsersMap = {
    'Sofía': 0, 'Mateo': 0, 'Damián': 0, 'Ana': 0, 'Carlos': 0,
    'Valentina': 0, 'Lucas': 0, 'Camila': 0, 'Diego': 0, 'Mariana': 0
  };

  records.forEach(function(r){
    var u = r.usuario || 'Damián';
    var pts = Math.round((r.peso || 0) * 100);
    baseUsersMap[u] = (baseUsersMap[u] || 0) + pts;
  });

  return Object.keys(baseUsersMap).map(function(u){
    return { username: u, points: baseUsersMap[u] };
  }).sort(function(a, b){ return b.points - a.points; }).slice(0, 10);
}

function renderRanking() {
  var leaderboard = getLeaderboardData();
  var currentUser = getCurrentUser();
  var isFinished = localStorage.getItem(STORAGE_KEY_RANKING_STATUS) === 'finalizado';
  var tbody = document.getElementById('rankingBody');

  tbody.innerHTML = '';

  leaderboard.forEach(function(item, index){
    var pos = index + 1;
    var isMe = item.username === currentUser;

    var tr = document.createElement('tr');
    if (isMe) tr.classList.add('current-user');

    var crown = '';
    if (pos === 1) crown = '🥇 ';
    else if (pos === 2) crown = '🥈 ';
    else if (pos === 3) crown = '🥉 ';

    tr.innerHTML =
      '<td><span class="rank-num">#' + pos + '</span></td>' +
      '<td>' + crown + '<strong>' + item.username + '</strong>' + (isMe ? ' <span class="badge-you">Tú</span>' : '') + '</td>' +
      '<td style="text-align: right;"><span class="points-badge">' + item.points.toLocaleString() + ' pts</span></td>';

    tbody.appendChild(tr);
  });

  var myData = leaderboard.filter(function(u){ return u.username === currentUser; })[0];
  document.getElementById('myUserName').textContent = currentUser;
  document.getElementById('myRankVal').textContent = myData ? '#' + (leaderboard.indexOf(myData) + 1) : 'Top 10+';
  document.getElementById('myPointsVal').textContent = myData ? myData.points.toLocaleString() : '0';

  renderStatusBanner(leaderboard, isFinished);
}

// [PATRÓN: State] La competencia tiene dos estados ("activa" / "finalizada") y el banner,
// el texto y la acción del botón cambian según el estado.
function renderStatusBanner(leaderboard, isFinished) {
  var banner = document.getElementById('statusBanner');
  var info = document.getElementById('statusInfo');
  var btn = document.getElementById('finishBtn');

  if (isFinished) {
    var winner = leaderboard[0];
    banner.classList.add('finished');
    info.innerHTML = '<h3>🏆 Competencia Finalizada</h3><p>¡El ganador es <strong>' + winner.username + '</strong> con <strong>' + winner.points.toLocaleString() + ' puntos</strong>!</p>';
    btn.innerText = 'Reiniciar Competencia';
    btn.onclick = resetAllData;
  } else {
    banner.classList.remove('finished');
    info.innerHTML = '<h3>Competencia Activa</h3><p>El ranking se actualiza automáticamente con cada registro.</p>';
    btn.innerText = 'Finalizar Competencia';
    btn.onclick = finishRanking;
  }
}

function finishRanking() {
  localStorage.setItem(STORAGE_KEY_RANKING_STATUS, 'finalizado');
  renderRanking();
}

function resetAllData() {
  if (confirm("¿Deseas reiniciar todo el ranking y poner los contadores en cero?")) {
    localStorage.removeItem(STORAGE_KEY_REGISTROS);
    localStorage.removeItem(STORAGE_KEY_RANKING_STATUS);
    currentSeconds = 0;
    localStorage.setItem(STORAGE_KEY_SECONDS, '0');
    updateClockDisplay();
    renderStats();
    renderRanking();
  }
}

// [PATRÓN: Observer + Controller] El formulario notifica el "submit"; este controlador valida,
// guarda mediante el Repositorio y pide a la Vista que se actualice.
document.getElementById('recycleForm').addEventListener('submit', function(e) {
  e.preventDefault();

  var usuario = document.getElementById('usuario').value;
  var material = document.getElementById('material').value;
  var peso = parseFloat(document.getElementById('peso').value);
  var cantidad = parseInt(document.getElementById('cantidad').value, 10);
  var descripcion = document.getElementById('descripcion').value.trim();

  if (!usuario || !material || isNaN(peso) || isNaN(cantidad)) return;

  var records = loadRecords();
  records.push({
    usuario: usuario,
    material: material,
    peso: peso,
    cantidad: cantidad,
    descripcion: descripcion,
    fecha: new Date().toISOString()
  });
  saveRecords(records);

  localStorage.setItem(STORAGE_KEY_CURRENT_USER, usuario);

  this.reset();
  document.getElementById('usuario').value = usuario;

  renderStats();
  renderRanking();

  switchSubTab('ranking');
});

document.getElementById('usuario').addEventListener('change', function() {
  localStorage.setItem(STORAGE_KEY_CURRENT_USER, this.value);
  renderRanking();
});

document.getElementById('modalOverlay').addEventListener('click', function(e) {
  if (e.target === this) closeModal();
});

updateClockDisplay();
startClock();
renderStats();
renderRanking();
