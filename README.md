# ♻️ EcoRecicla

## 📖 Descripción

EcoRecicla es una aplicación web que promueve hábitos sostenibles. Su interfaz permite **consultar en qué caneca va cada material**, **buscar puntos de reciclaje por localidad y material**, **registrar el reciclaje realizado** (material, cantidad en kg y fecha) y **visualizar el progreso personal** con totales, puntos acumulados, insignias e historial.

En esta etapa el proyecto cuenta con la interfaz completa (HTML y CSS) y con el diseño de la arquitectura que la volverá dinámica mediante JavaScript y patrones de diseño.

## 🎯 Objetivo

Diseñar una solución digital que facilite la consulta de puntos de reciclaje, el aprendizaje sobre la separación de residuos y el registro de acciones ecológicas, promoviendo hábitos sostenibles.

**Problema que resuelve:** la comunidad necesita información accesible para separar residuos correctamente, ubicar puntos de reciclaje y conocer el impacto de sus acciones.

## 🧭 Alcance

**Incluye:**

- Guía de separación de residuos por material.
- Búsqueda de puntos de reciclaje por localidad y material.
- Registro de reciclaje con validación de datos.
- Historial, total reciclado, puntos e insignias del usuario.
- Almacenamiento local en el navegador (sin servidor).

**No incluye (por ahora):**

- Cuentas de usuario ni inicio de sesión.
- Base de datos ni backend.
- Mapa interactivo de puntos de reciclaje.
- Sincronización de datos entre dispositivos.

## ✅ Funcionalidades implementadas

- Interfaz web de una sola página con cuatro secciones: **Guía de separación**, **Puntos de reciclaje**, **Registrar reciclaje** e **Historial y progreso**.
- Formularios con sus campos (material, localidad, cantidad en kg, fecha) y zonas reservadas para mostrar resultados, mensajes de error, totales, insignias y tabla de historial.
- Navegación por secciones y estructura semántica con atributos de accesibilidad (`aria-live`, `role="alert"`).
- Estilos con variables CSS, diseño adaptable y soporte para `prefers-reduced-motion`.
- Documentación del proyecto y selección de los patrones de diseño que darán el comportamiento dinámico.

> El comportamiento dinámico (llenar listas, validar, guardar y actualizar el progreso) se implementará en JavaScript siguiendo los patrones descritos más abajo.

## 🛠️ Tecnologías utilizadas

- **HTML5**: estructura semántica de la página.
- **CSS3**: estilos con variables CSS y diseño adaptable.
- **JavaScript (vanilla)**: lógica dinámica, organizada en módulos.
- **Almacenamiento del navegador (`localStorage`)**: persistencia local de los registros.
- **Git y GitHub**: control de versiones.
- **Markdown**: documentación.
- **UML**: diseño y documentación de la solución.

## 📁 Estructura actual del proyecto

```
EcoRecicla/
├── docs/
│   └── descripcion_proyecto.md
├── src/
│   ├── index.html
│   └── css/
│       └── styles.css
├── tests/
│   └── README.md
└── README.md
```

- `docs/`: documentación del proyecto.
- `src/`: interfaz (HTML y estilos).
- `tests/`: pruebas del proyecto (pendientes).

**Estructura prevista para la carpeta `src/js/`** (módulos que se agregarán):

```
src/js/
├── eventos.js          # Observer: emisor de eventos (suscribir / emitir)
├── almacenamiento.js   # Repository: acceso a datos (registros y catálogos)
├── validaciones.js     # validación de formularios
├── registro.js         # lógica del registro de reciclaje
├── progreso.js         # totales, puntos e insignias (observador)
├── guia.js             # guía de separación
├── puntos.js           # búsqueda de puntos de reciclaje
├── ecorecicla.js       # punto de entrada a la lógica
└── app.js              # conexión con la interfaz (eventos del DOM)
```

## 🧩 Patrones y decisiones de construcción

Para volver dinámico el proyecto se seleccionaron **dos patrones de diseño que se complementan**: **Repository** (de dónde salen y dónde se guardan los datos) y **Observer** (cómo se entera la interfaz de que algo cambió).

### 1. Patrón Repository (Repositorio)

| Elemento | Descripción |
|---|---|
| **Problema que resuelve** | Si cada módulo accede directamente a `localStorage` o a listas de datos, el código se duplica y cambiar la forma de guardar obliga a modificar todo el proyecto. |
| **Justificación** | La interfaz tiene listas vacías (materiales, localidades, puntos) y un historial que deben llenarse con datos. Un único punto de acceso a esos datos mantiene el código ordenado y permite cambiar `localStorage` por una base de datos más adelante sin tocar el resto. |
| **Aplicación** | `almacenamiento.js` ofrece operaciones como `guardarRegistro`, `obtenerRegistros`, `borrarRegistros`, `obtenerMateriales`, `obtenerLocalidades` y `buscarPuntos`. Los demás módulos no conocen cómo ni dónde se guardan los datos. |
| **Componentes** | `almacenamiento.js` (repositorio), `registro.js`, `guia.js`, `puntos.js` y `progreso.js` (clientes que lo usan). |
| **Beneficios** | Elimina código duplicado, separa responsabilidades, facilita cambiar el almacenamiento y permite hacer pruebas con datos simulados. |

### 2. Patrón Observer (Observador)

| Elemento | Descripción |
|---|---|
| **Problema que resuelve** | Al registrar o borrar un reciclaje deben actualizarse varias partes de la pantalla (total, puntos, insignias, tabla, mensajes). Llamarlas una por una desde el formulario genera código acoplado y fácil de romper. |
| **Justificación** | Con Observer, quien registra solo emite un evento y cada parte interesada se actualiza por su cuenta. Agregar una nueva sección (por ejemplo, la página de estadísticas) solo requiere suscribirla, sin modificar el registro. |
| **Aplicación** | `eventos.js` implementa un emisor con `suscribir(evento, funcion)` y `emitir(evento, datos)`. Eventos previstos: `registro:agregado`, `historial:borrado` y `registros:cambiaron`. `progreso.js` y la tabla del historial se suscriben a ellos. |
| **Componentes** | `eventos.js` (sujeto), `registro.js` (publica eventos), `progreso.js` y la tabla del historial (observadores), `app.js` (conecta con la interfaz). |
| **Beneficios** | Interfaz que se actualiza sola, bajo acoplamiento entre módulos, código más legible y facilidad para agregar nuevas funciones (estadísticas, gráficas) sin reescribir lo existente. |

### Cómo trabajan juntos

1. Al cargar la página, la interfaz le pide datos al **Repository** (materiales, localidades, registros) y llena las listas y la tabla.
2. Cuando el usuario envía el formulario, se valida y el **Repository** guarda el registro.
3. Se emite el evento `registro:agregado` y los **observadores** actualizan totales, puntos, insignias e historial.

La carpeta `src/js/` y su código se incorporarán en la siguiente etapa del proyecto.

## ▶️ Instrucciones de ejecución

No requiere instalación ni servidor.

1. Clonar el repositorio:

   ```bash
   git clone https://github.com/<usuario>/EcoRecicla.git
   cd EcoRecicla
   ```

2. Abrir `src/index.html` en el navegador (doble clic o arrastrándolo a una ventana).

   Opcionalmente, servirlo localmente (requiere Python 3):

   ```bash
   cd src
   python -m http.server 8000
   ```

   y abrir <http://localhost:8000>.

## 👥 Integrantes del equipo

- Andrés Camilo Cárdenas García
- Santiago Cruz Rojas
- Nicolás Estiben Aguilera Tique
- Damián Fernando Forero Moros

Proyecto académico — Universidad Manuela Beltrán.

## 📊 Estado actual del proyecto

**En desarrollo.**

| Componente | Estado |
|---|---|
| Documentación y descripción del proyecto | ✅ Completa |
| Interfaz web (HTML y CSS) | ✅ Completa |
| Selección y diseño de patrones (Repository y Observer) | ✅ Definidos |
| Lógica dinámica en JavaScript | ⏳ Pendiente |
| Pruebas automatizadas | ⏳ Pendiente |
| Diagramas UML | ⏳ Pendiente |

## 🔮 Próximos avances

- Implementar en `src/js/` los patrones Repository y Observer para volver dinámica la interfaz.
- Llenar los selectores y listas (materiales, localidades, puntos) desde el repositorio.
- Validar el formulario de registro y mostrar mensajes de error claros.
- Actualizar automáticamente totales, puntos, insignias e historial.
- Agregar estadísticas y gráficas del progreso del usuario.
- Incluir una descripción opcional en cada registro de reciclaje.
- Agregar pruebas automatizadas en `tests/`.
- Completar los diagramas UML en `docs/`.
- Mostrar los puntos de reciclaje en un mapa interactivo.
