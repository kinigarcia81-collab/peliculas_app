const btnBuscar = document.getElementById("btnBuscar");
const btnModo = document.getElementById("btnModo");
const input = document.getElementById("busqueda");
const inputAnio = document.getElementById("anio");
const resultados = document.getElementById("resultados");
const mensaje = document.getElementById("mensaje");
const detalles = document.getElementById("detalles");
const favoritosDiv = document.getElementById("favoritos");
const btnLimpiar = document.getElementById("btnLimpiar");
const btnPrev = document.getElementById("btnPrev");
const btnNext = document.getElementById("btnNext");
const infoPagina = document.getElementById("infoPagina");
const ordenSelect = document.getElementById("orden");

const API_KEY = "cdc374ec";

// ------------------ MODO OSCURO (GUARDADO) ------------------
let oscuro = localStorage.getItem("modoOscuroPeliculas") === "on";

function aplicarModo() {
  document.body.classList.toggle("oscuro", oscuro);
  btnModo.textContent = oscuro ? "Modo claro" : "Modo oscuro";
}

aplicarModo();

btnModo.addEventListener("click", () => {
  oscuro = !oscuro;
  localStorage.setItem("modoOscuroPeliculas", oscuro ? "on" : "off");
  aplicarModo();
});

// ------------------ FAVORITOS (GUARDADOS) ------------------
function cargarFavoritos() {
  const datos = localStorage.getItem("favoritosPeliculas");
  if (!datos) return [];
  try { return JSON.parse(datos); } catch { return []; }
}

function guardarFavoritos(lista) {
  localStorage.setItem("favoritosPeliculas", JSON.stringify(lista));
}

let favoritos = cargarFavoritos();

function pintarFavoritos() {
  favoritosDiv.innerHTML = "";

  if (favoritos.length === 0) {
    favoritosDiv.innerHTML = "<p>No tienes favoritos todavía.</p>";
    return;
  }

  favoritos.forEach((peli) => {
    const card = document.createElement("div");
    card.classList.add("card");

    const poster = peli.Poster !== "N/A" ? peli.Poster : "";

    card.innerHTML = `
      ${poster ? `<img src="${poster}" alt="Poster">` : ""}
      <h3>${peli.Title}</h3>
      <p>Año: ${peli.Year}</p>
      <button class="btnQuitar" type="button">Quitar</button>
    `;

    card.querySelector(".btnQuitar").addEventListener("click", () => {
      favoritos = favoritos.filter(f => f.imdbID !== peli.imdbID);
      guardarFavoritos(favoritos);
      pintarFavoritos();
    });

    favoritosDiv.appendChild(card);
  });
}

pintarFavoritos();

// ------------------ BUSCAR ------------------
btnBuscar.addEventListener("click", buscarPeliculas);

input.addEventListener("keydown", (e) => {
  if (e.key === "Enter") btnBuscar.click();
});
btnLimpiar.addEventListener("click", () => {
  input.value = "";
  inputAnio.value = "";
  mensaje.textContent = "";
  resultados.innerHTML = "";
  detalles.innerHTML = "";
  input.focus();
  paginaActual = 1;
totalPaginas = 1;
ultimaBusqueda = "";
ultimoAnio = "";
if (infoPagina) infoPagina.textContent = "Página 1";
if (btnPrev) btnPrev.disabled = true;
if (btnNext) btnNext.disabled = true;

});

let detalleActual = null; // para abrir/cerrar detalles
let paginaActual = 1;
let totalPaginas = 1;
let ultimaBusqueda = "";
let ultimoAnio = "";

async function buscarPeliculas() {
  const texto = input.value.trim();
  const anio = inputAnio.value.trim();
ultimaBusqueda = texto;
ultimoAnio = anio;
paginaActual = 1;

  if (texto === "") {
    mensaje.textContent = "Escribe una película.";
    return;
  }

  mensaje.textContent = "Buscando...";
  resultados.innerHTML = "";
  detalles.innerHTML = "";
  detalleActual = null;

  try {
    const respuesta = await fetch(
      `https://www.omdbapi.com/?apikey=${API_KEY}&s=${encodeURIComponent(texto)}&page=${paginaActual}`

    );

    const datos = await respuesta.json();

    if (datos.Response === "False") {
      mensaje.textContent = "No se encontraron resultados.";
      return;
    }
totalPaginas = Math.ceil((Number(datos.totalResults) || 0) / 10);
if (totalPaginas < 1) totalPaginas = 1;
actualizarPaginacion();
// Por si antes estaban desactivados
if (btnPrev) btnPrev.disabled = (paginaActual <= 1);
if (btnNext) btnNext.disabled = (paginaActual >= totalPaginas);

    mensaje.textContent = "";

    // Filtro por año (si el usuario escribió algo)
    let lista = datos.Search;
    if (anio !== "") {
      lista = lista.filter(p => (p.Year || "").includes(anio));
    }

    if (lista.length === 0) {
      mensaje.textContent = "No hay resultados para ese año.";
      return;
    }
   lista = ordenarLista(lista);

    lista.forEach((pelicula) => {
      const card = document.createElement("div");
      card.classList.add("card");

      const poster = pelicula.Poster !== "N/A" ? pelicula.Poster : "";

      card.innerHTML = `
        ${poster ? `<img src="${poster}" alt="Poster">` : `<p>(Sin imagen)</p>`}
        <h3>${pelicula.Title}</h3>
        <p>Año: ${pelicula.Year}</p>
        <p>Tipo: ${pelicula.Type}</p>
        <button class="btnDetalles" type="button">Ver detalles</button>
      `;

      card.querySelector(".btnDetalles").addEventListener("click", () => {
        cargarDetalles(pelicula.imdbID);
      });

      resultados.appendChild(card);
    });
  } catch {
    mensaje.textContent = "Error al conectar con el servidor.";
  }
 }

  // ------------------ DETALLES (ABRIR / CERRAR) ------------------
  async function cargarDetalles(imdbID) {
  // Si pulsas la MISMA peli otra vez -> cerrar
  if (detalleActual === imdbID) {
    detalles.innerHTML = "";
    detalleActual = null;
    return;
  }

  detalleActual = imdbID;
  detalles.innerHTML = "Cargando detalles...";
  detalles.scrollIntoView({ behavior: "smooth" });

  try {
    const respuesta = await fetch(
      `https://www.omdbapi.com/?apikey=${API_KEY}&i=${imdbID}`
    );

    const peli = await respuesta.json();

    if (peli.Response === "False") {
      detalles.innerHTML = "No se pudieron cargar los detalles.";
      return;
    }

    const poster = peli.Poster !== "N/A" ? peli.Poster : "";

    detalles.innerHTML = `
      <div class="card">
        ${poster ? `<img src="${poster}" alt="Poster">` : ""}
        <h3>${peli.Title} (${peli.Year})</h3>
        <p><b>Director:</b> ${peli.Director}</p>
        <p><b>Actores:</b> ${peli.Actors}</p>
        <p><b>Género:</b> ${peli.Genre}</p>
        <p><b>Nota IMDb:</b> ${peli.imdbRating}</p>
        <p><b>Trama:</b> ${peli.Plot}</p>

        <button id="btnFav" type="button">Guardar en favoritos</button>
      </div>
    `;

    // Botón favoritos
    const btnFav = document.getElementById("btnFav");
    btnFav.addEventListener("click", () => {
      const yaExiste = favoritos.some(f => f.imdbID === peli.imdbID);
      if (yaExiste) {
        btnFav.textContent = "Ya estaba en favoritos";
        return;
      }

      favoritos.push({
        imdbID: peli.imdbID,
        Title: peli.Title,
        Year: peli.Year,
        Poster: peli.Poster
      });

      guardarFavoritos(favoritos);
      pintarFavoritos();
      btnFav.textContent = "Guardado ✅";
    });

  } catch {
    detalles.innerHTML = "Error cargando detalles.";
  }
  }
  function yearToNumber(yearStr) {
  // "2010" -> 2010, "2010–2012" -> 2010, "N/A" -> 0
  const match = String(yearStr).match(/\d{4}/);
  return match ? Number(match[0]) : 0;
 }

  function ordenarLista(lista) {
  const modo = ordenSelect ? ordenSelect.value : "relevancia";
  const copia = [...lista];

  if (modo === "anio_desc") {
    copia.sort((a, b) => yearToNumber(b.Year) - yearToNumber(a.Year));
  } else if (modo === "anio_asc") {
    copia.sort((a, b) => yearToNumber(a.Year) - yearToNumber(b.Year));
  } else if (modo === "titulo_az") {
    copia.sort((a, b) => a.Title.localeCompare(b.Title));
  } else if (modo === "titulo_za") {
    copia.sort((a, b) => b.Title.localeCompare(a.Title));
  }
  // relevancia: no tocamos
  return copia;
}
  function actualizarPaginacion() {
  if (!infoPagina) return;
  infoPagina.textContent = `Página ${paginaActual} / ${totalPaginas}`;

  if (btnPrev) btnPrev.disabled = (paginaActual <= 1);
  if (btnNext) btnNext.disabled = (paginaActual >= totalPaginas);
}

  async function cambiarPagina(delta, forzar = false) {
  function repintarPaginaActual() {
  if (!ultimaBusqueda) return;
  // Llamamos a cambiarPagina pero sin mover, usando una búsqueda directa
  cambiarPagina(0, true);
}

  const nueva = paginaActual + delta;
  if (nueva < 1 || nueva > totalPaginas) return;

  paginaActual = nueva;

  // Repetimos la búsqueda pero en otra página
  mensaje.textContent = "Buscando...";
  resultados.innerHTML = "";
  detalles.innerHTML = "";
  detalleActual = null;

  try {
    const respuesta = await fetch(
      `https://www.omdbapi.com/?apikey=${API_KEY}&s=${encodeURIComponent(ultimaBusqueda)}&page=${paginaActual}`
    );
    const datos = await respuesta.json();

    if (datos.Response === "False") {
      mensaje.textContent = "No se encontraron resultados.";
      return;
    }

    mensaje.textContent = "";

    let lista = datos.Search;

    // filtro por año
    if (ultimoAnio !== "") {
      lista = lista.filter(p => (p.Year || "").includes(ultimoAnio));
    }

    lista = ordenarLista(lista);

    lista.forEach((pelicula) => {
      const card = document.createElement("div");
      card.classList.add("card");
      const poster = pelicula.Poster !== "N/A" ? pelicula.Poster : "";

      card.innerHTML = `
        ${poster ? `<img src="${poster}" alt="Poster">` : `<p>(Sin imagen)</p>`}
        <h3>${pelicula.Title}</h3>
        <p>Año: ${pelicula.Year}</p>
        <p>Tipo: ${pelicula.Type}</p>
        <button class="btnDetalles" type="button">Ver detalles</button>
      `;

      card.querySelector(".btnDetalles").addEventListener("click", () => {
        cargarDetalles(pelicula.imdbID);
      });

      resultados.appendChild(card);
    });

    totalPaginas = Math.ceil((Number(datos.totalResults) || 0) / 10);
    if (totalPaginas < 1) totalPaginas = 1;
    actualizarPaginacion();

  } catch {
    mensaje.textContent = "Error al conectar con el servidor.";
  }
}

// Botones de paginación
if (btnPrev) btnPrev.addEventListener("click", () => cambiarPagina(-1));
if (btnNext) btnNext.addEventListener("click", () => cambiarPagina(1));

// Si cambias el orden, repinta la página actual
if (ordenSelect) {
  ordenSelect.addEventListener("change", () => {
    if (ultimaBusqueda) cambiarPagina(0, true);
  });
}
