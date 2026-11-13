// [PATRÓN: Module (IIFE)] Encapsula variables y funciones para no contaminar el ámbito global.
// Solo se expone window.__ecomap, que usa navigation.js.
(function(){
  /**
 * ARCHIVO: mapa.js
 * RESPONSABILIDAD: mapa interactivo de puntos de reciclaje (búsqueda, filtros, ubicación y rutas).
 */
// ---------- Vista: Mapa ----------
  var MATERIALES = ["Papel y cartón", "Plástico", "Vidrio", "Metales", "Electrónicos (RAEE)", "Orgánicos", "Pilas y baterías", "Textiles"];

  // [PATRÓN: Data / Model] Catálogo de puntos separado de la lógica que lo usa.
var points = [
    { id: 1, name: "EcoPunto Chapinero", address: "Calle 60 con Carrera 9, Chapinero", lat: 4.6486, lng: -74.0628,
      hours: "Lun. a sáb., 8:00 a.m. – 5:00 p.m.", materials: ["Papel y cartón", "Plástico", "Vidrio"] },
    { id: 2, name: "Centro de Acopio Usaquén", address: "Carrera 7 con Calle 119, Usaquén", lat: 4.6946, lng: -74.0307,
      hours: "Todos los días, 7:00 a.m. – 6:00 p.m.", materials: ["Metales", "Electrónicos (RAEE)", "Pilas y baterías"] },
    { id: 3, name: "Punto Verde Teusaquillo", address: "Avenida 39 con Carrera 24, Teusaquillo", lat: 4.6360, lng: -74.0906,
      hours: "Lun. a vie., 9:00 a.m. – 4:00 p.m.", materials: ["Papel y cartón", "Textiles"] },
    { id: 4, name: "Recicladora Suba Rincón", address: "Avenida Ciudad de Cali con Calle 132, Suba", lat: 4.7413, lng: -74.0817,
      hours: "Mar. a dom., 8:00 a.m. – 5:00 p.m.", materials: ["Plástico", "Vidrio", "Metales"] },
    { id: 5, name: "EcoPunto Kennedy Central", address: "Carrera 78K con Calle 41 Sur, Kennedy", lat: 4.6280, lng: -74.1611,
      hours: "Lun. a sáb., 7:30 a.m. – 4:30 p.m.", materials: ["Orgánicos", "Papel y cartón", "Plástico"] },
    { id: 6, name: "Centro de Acopio Fontibón", address: "Carrera 97 con Calle 17, Fontibón", lat: 4.6740, lng: -74.1469,
      hours: "Lun. a vie., 8:00 a.m. – 5:00 p.m.", materials: ["Electrónicos (RAEE)", "Metales"] },
    { id: 7, name: "Punto Verde Engativá", address: "Avenida Rodrigo Lara Bonilla con Carrera 78, Engativá", lat: 4.7096, lng: -74.1096,
      hours: "Todos los días, 8:00 a.m. – 6:00 p.m.", materials: ["Vidrio", "Papel y cartón", "Textiles"] },
    { id: 8, name: "EcoPunto La Candelaria", address: "Carrera 3 con Calle 12, La Candelaria", lat: 4.5981, lng: -74.0758,
      hours: "Mié. a lun., 9:00 a.m. – 5:00 p.m.", materials: ["Papel y cartón", "Pilas y baterías", "Orgánicos"] }
  ];

  var BOGOTA_CENTER = [4.6486, -74.0921];
  var userLocation = null;
  var activeFilters = new Set();
  var selectedPointId = null;
  var routingControl = null;
  var markersById = {};

  var map = L.map('map', { zoomControl: true }).setView(BOGOTA_CENTER, 11.5);
  // [PATRÓN: Singleton] Una única instancia del mapa compartida con el resto de la app.
window.__ecomap = map;

  L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}', {
    maxZoom: 19,
    attribution: 'Tiles &copy; Esri &mdash; Source: Esri, HERE, Garmin, USGS, EPA, NPS'
  }).addTo(map);

  // [PATRÓN: Factory Method] Construye los distintos íconos (punto, seleccionado, usuario) con una sola función.
function makeDivIcon(className, size){
    return L.divIcon({
      className: 'leaflet-div-icon ' + className,
      iconSize: [size, size],
      iconAnchor: [size/2, size]
    });
  }

  // [BUENA PRÁCTICA: reutilización] Función pura usada por distanceLabel() y por el ordenamiento de renderAll().
function haversine(lat1, lon1, lat2, lon2){
    var R = 6371;
    var dLat = (lat2-lat1) * Math.PI/180;
    var dLon = (lon2-lon1) * Math.PI/180;
    var a = Math.sin(dLat/2)*Math.sin(dLat/2) +
            Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180) *
            Math.sin(dLon/2)*Math.sin(dLon/2);
    var c = 2*Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  }

  function referencePoint(){
    return userLocation ? [userLocation.lat, userLocation.lng] : BOGOTA_CENTER;
  }

  function distanceLabel(p){
    var ref = referencePoint();
    var d = haversine(ref[0], ref[1], p.lat, p.lng);
    return d < 1 ? Math.round(d*1000) + " m" : d.toFixed(1) + " km";
  }

  // [PATRÓN: Observer] Cada chip se suscribe a "click" y al cambiar el filtro se vuelve a renderizar.
var chipContainer = document.getElementById('filter-chips');
  MATERIALES.forEach(function(mat){
    var chip = document.createElement('button');
    chip.type = 'button';
    chip.className = 'chip';
    chip.textContent = mat;
    chip.addEventListener('click', function(){
      if(activeFilters.has(mat)){
        activeFilters.delete(mat);
        chip.classList.remove('active');
      } else {
        activeFilters.add(mat);
        chip.classList.add('active');
      }
      renderAll();
    });
    chipContainer.appendChild(chip);
  });

  points.forEach(function(p){
    var marker = L.marker([p.lat, p.lng], { icon: makeDivIcon('point-marker', 20) }).addTo(map);
    marker.on('click', function(){ selectPoint(p.id, true); });
    markersById[p.id] = marker;
  });

  function refreshMarkerIcons(){
    points.forEach(function(p){
      var isSel = p.id === selectedPointId;
      markersById[p.id].setIcon(makeDivIcon(isSel ? 'point-marker selected-marker' : 'point-marker', isSel ? 26 : 20));
    });
  }

  var listEl = document.getElementById('point-list');
  var countEl = document.getElementById('list-count');
  var searchInput = document.getElementById('search-input');

  // [PATRÓN: Specification / Filter] Concentra en un solo lugar la regla "¿este punto debe mostrarse?".
function matchesFilters(p){
    var query = searchInput.value.trim().toLowerCase();
    var matchesQuery = !query || p.name.toLowerCase().indexOf(query) !== -1 || p.address.toLowerCase().indexOf(query) !== -1;
    var matchesMaterial = activeFilters.size === 0 || p.materials.some(function(m){ return activeFilters.has(m); });
    return matchesQuery && matchesMaterial;
  }

  // [PATRÓN: MVC – capa Vista] Redibuja lista y marcadores a partir del estado actual
// (filtros, búsqueda, ubicación, punto seleccionado).
function renderAll(){
    var ref = referencePoint();
    var visible = points.filter(matchesFilters).slice().sort(function(a,b){
      return haversine(ref[0],ref[1],a.lat,a.lng) - haversine(ref[0],ref[1],b.lat,b.lng);
    });

    listEl.innerHTML = '';
    countEl.textContent = visible.length + (visible.length === 1 ? ' punto' : ' puntos');

    if(visible.length === 0){
      var empty = document.createElement('li');
      empty.className = 'empty-state';
      empty.textContent = 'No hay puntos que coincidan con la búsqueda o los filtros.';
      listEl.appendChild(empty);
    }

    visible.forEach(function(p){
      var li = document.createElement('li');
      li.className = 'point-item' + (p.id === selectedPointId ? ' selected' : '');
      li.innerHTML =
        '<div class="meta-row"><h3>' + p.name + '</h3><span class="distance">' + distanceLabel(p) + '</span></div>' +
        '<p class="address">' + p.address + '</p>' +
        '<div class="tag-row">' + p.materials.map(function(m){ return '<span class="tag">' + m + '</span>'; }).join('') + '</div>';
      li.addEventListener('click', function(){ selectPoint(p.id, true); });
      listEl.appendChild(li);
    });

    points.forEach(function(p){
      var visibleNow = matchesFilters(p);
      var marker = markersById[p.id];
      if(visibleNow && !map.hasLayer(marker)) marker.addTo(map);
      if(!visibleNow && map.hasLayer(marker)) map.removeLayer(marker);
    });
  }

  var detailPanel = document.getElementById('detail-panel');
  var routeBtn = document.getElementById('route-btn');
  var routeStatus = document.getElementById('route-status');

  // [PATRÓN: State] selectedPointId es el estado de selección; al cambiarlo se actualizan panel, ícono y ruta.
function selectPoint(id, panTo){
    selectedPointId = id;
    var p = points.filter(function(x){ return x.id === id; })[0];
    if(!p) return;

    document.getElementById('detail-name').textContent = p.name;
    document.getElementById('detail-address').textContent = p.address;
    document.getElementById('detail-hours').textContent = p.hours;
    document.getElementById('detail-materials').innerHTML =
      p.materials.map(function(m){ return '<span class="tag">' + m + '</span>'; }).join('');
    document.getElementById('detail-distance').textContent = distanceLabel(p) + (userLocation ? ' desde tu ubicación' : ' desde el centro de referencia (Bogotá)');
    detailPanel.classList.remove('hidden');
    routeStatus.textContent = '';

    if(routingControl){
      map.removeControl(routingControl);
      routingControl = null;
    }

    if(panTo) map.setView([p.lat, p.lng], 14, { animate: true });

    refreshMarkerIcons();
    renderAll();
  }

  document.getElementById('close-detail').addEventListener('click', function(){
    detailPanel.classList.add('hidden');
    selectedPointId = null;
    if(routingControl){
      map.removeControl(routingControl);
      routingControl = null;
    }
    refreshMarkerIcons();
    renderAll();
  });

  // [PATRÓN: Facade/Adapter] Se usa Leaflet Routing Machine detrás de una interfaz simple (botón "Cómo llegar").
routeBtn.addEventListener('click', function(){
    var p = points.filter(function(x){ return x.id === selectedPointId; })[0];
    if(!p) return;
    var origin = referencePoint();

    if(routingControl) map.removeControl(routingControl);

    routeStatus.textContent = 'Calculando ruta...';
    routingControl = L.Routing.control({
      waypoints: [ L.latLng(origin[0], origin[1]), L.latLng(p.lat, p.lng) ],
      lineOptions: { styles: [{ color: '#3FA34D', weight: 5, opacity: 0.85 }] },
      show: false,
      addWaypoints: false,
      draggableWaypoints: false,
      fitSelectedRoutes: true,
      createMarker: function(){ return null; }
    }).addTo(map);

    routingControl.on('routesfound', function(e){
      var r = e.routes[0];
      var km = (r.summary.totalDistance/1000).toFixed(1);
      var min = Math.round(r.summary.totalTime/60);
      routeStatus.textContent = 'Ruta: ' + km + ' km · aprox. ' + min + ' min.';
    });
    routingControl.on('routingerror', function(){
      routeStatus.textContent = 'No se pudo calcular la ruta en este momento.';
    });
  });

  var locateBtn = document.getElementById('locate-btn');
  var locationStatus = document.getElementById('location-status');
  var userMarker = null;

  // [BUENA PRÁCTICA: manejo de errores] Se contemplan sin soporte, sin https, permiso denegado, sin señal y timeout.
locateBtn.addEventListener('click', function(){
    if(!navigator.geolocation){
      locationStatus.textContent = 'Tu navegador no permite geolocalización. Se usará el centro de Bogotá como referencia.';
      return;
    }
    if(location.protocol !== 'https:' && location.hostname !== 'localhost' && location.protocol !== 'file:'){
      locationStatus.textContent = 'El navegador solo permite obtener la ubicación en páginas seguras (https).';
      return;
    }

    locationStatus.textContent = 'Obteniendo tu ubicación...';

    function onSuccess(pos){
      userLocation = { lat: pos.coords.latitude, lng: pos.coords.longitude };
      if(userMarker) map.removeLayer(userMarker);
      userMarker = L.marker([userLocation.lat, userLocation.lng], { icon: makeDivIcon('user-marker', 16) })
        .addTo(map).bindPopup('Estás aquí');
      map.setView([userLocation.lat, userLocation.lng], 13);
      locationStatus.textContent = 'Ubicación activa. Las distancias se calculan desde tu posición.';
      renderAll();
    }

    function onError(err){
      if(err.code === 1){
        locationStatus.textContent = 'Permiso denegado. Revisa el ícono de ubicación en la barra del navegador y permite el acceso para este sitio.';
      } else if(err.code === 2){
        locationStatus.textContent = 'Reintentando con menor precisión...';
        navigator.geolocation.getCurrentPosition(onSuccess, function(){
          locationStatus.textContent = 'El navegador no pudo determinar tu posición (sin GPS ni red disponible). Se usará el centro de Bogotá como referencia.';
        }, { enableHighAccuracy: false, timeout: 15000, maximumAge: 60000 });
      } else if(err.code === 3){
        locationStatus.textContent = 'La solicitud de ubicación tardó demasiado. Intenta de nuevo o revisa tu conexión.';
      } else {
        locationStatus.textContent = 'No se pudo acceder a tu ubicación. Se usará el centro de Bogotá como referencia.';
      }
    }

    navigator.geolocation.getCurrentPosition(onSuccess, onError, { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 });
  });

  searchInput.addEventListener('input', renderAll);

  renderAll();
})();
