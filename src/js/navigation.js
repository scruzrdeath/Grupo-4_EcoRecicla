/**
 * ARCHIVO: navigation.js
 * RESPONSABILIDAD: navegación entre las vistas principales (Mapa, Registro, Guías).
 */
// ---------- Navegación entre vistas ----------
// [PATRÓN: Facade] switchView() es el único punto de entrada para cambiar de vista;
// oculta los detalles (clases CSS, invalidateSize del mapa) detrás de una sola función.
function switchView(view){
  document.querySelectorAll('.app-view').forEach(function(v){ v.classList.remove('active'); });
  document.querySelectorAll('.nav-btn').forEach(function(b){ b.classList.remove('active'); });

  document.getElementById('view-' + view).classList.add('active');
  document.querySelector('.nav-btn[data-view="' + view + '"]').classList.add('active');

  if(view === 'mapa' && window.__ecomap){
    setTimeout(function(){ window.__ecomap.invalidateSize(); }, 50);
  }
}

// [PATRÓN: Observer] Cada botón se suscribe al evento "click" y reacciona cuando ocurre.
document.querySelectorAll('.nav-btn').forEach(function(btn){
  btn.addEventListener('click', function(){ switchView(btn.dataset.view); });
});
