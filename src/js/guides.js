/**
 * ARCHIVO: guides.js
 * RESPONSABILIDAD: mostrar la mini guía seleccionada.
 */
// ---------- Vista: Guías ----------
// [PATRÓN: State (simple)] Solo una guía y un botón pueden estar en estado "active";
// la función limpia el estado anterior y activa el nuevo.
function showGuide(guideId, btnElement) {
  var cards = document.querySelectorAll('.guide-card');
  cards.forEach(function(card){ card.classList.remove('active'); });

  var buttons = document.querySelectorAll('.btn-guide');
  buttons.forEach(function(btn){ btn.classList.remove('active'); });

  var selectedGuide = document.getElementById(guideId);
  if (selectedGuide) selectedGuide.classList.add('active');
  if (btnElement) btnElement.classList.add('active');
}
