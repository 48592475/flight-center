# Flight Center · Sistema de reservas

Sistema de reservas de la escuela de vuelo Flight Center (Aeródromo de Morón): vuelos, simulador y clases teóricas, syllabus del curso PPA, libros de novedades de la flota, estado de cuenta, avisos por email y WhatsApp, y METAR, TAF y NOTAM.

- **Demo** (datos en el navegador): https://48592475.github.io/flight-center/
  Cuentas de prueba, contraseña `flight123`: alumno@flightcenter.com, ppa@flightcenter.com, instructor@flightcenter.com, mecanico@flightcenter.com, admin@flightcenter.com.
- **Versión real con base de datos**: se publica gratis en Render (servidor) + Neon (base de datos). Ver [DESPLIEGUE.md](DESPLIEGUE.md).

## Estructura

| Carpeta / archivo | Qué es |
|---|---|
| `src/` | Código fuente de la página y de las reglas del negocio |
| `build.py` | Arma las dos versiones a partir de `src/` |
| `index.html` | Demo para GitHub Pages (generado) |
| `servidor/` | Servidor Node.js: base de datos, avisos, METAR/TAF/NOTAM |
| `render.yaml` | Configuración para publicar en Render |
