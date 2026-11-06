"""Arma las dos versiones de la página a partir de src/:
   - index.html                 → demo para GitHub Pages (todo en el navegador)
   - servidor/public/index.html → versión real, conectada al servidor
   Uso: python3 build.py
"""
import os
R = os.path.dirname(os.path.abspath(__file__))
src = lambda f: open(os.path.join(R, 'src', f), encoding='utf-8').read()
CSS = src('base.css') + src('extra.css') + src('extra3.css')
APP = ['qrcode.js', 'app1.js', 'app2.js', 'app3.js', 'app4.js', 'app5.js', 'app6.js']
ICONO = "data:image/svg+xml,<svg xmlns=%27http://www.w3.org/2000/svg%27 viewBox=%270 0 24 24%27><path fill=%27%2359b2ea%27 d=%27M21 16v-2l-8-5V3.5a1.5 1.5 0 0 0-3 0V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5z%27/></svg>"

def pagina(cliente, store=True):
    js = '\n'.join(src(f) for f in ['logos.js', 'syllabus.js'] + (['store.js'] if store else []) + [cliente, 'avisos-contenido.js'] + APP)
    return f'''<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>Flight Center Reservas</title>
<link rel="icon" href="{ICONO}">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Barlow:wght@400;500;600;700;800&family=JetBrains+Mono:wght@500;700&family=Source+Serif+4:ital,opsz,wght@0,8..60,400;0,8..60,600;0,8..60,700;1,8..60,400&display=swap">
<style>
{CSS}
</style>
</head>
<body>
<div id="app"></div>
<div id="modal-root"></div>
<div id="toasts"></div>
<script>
{js}
</script>
</body>
</html>
'''

open(os.path.join(R, 'index.html'), 'w', encoding='utf-8').write(pagina('cliente-demo.js'))
open(os.path.join(R, 'servidor', 'public', 'index.html'), 'w', encoding='utf-8').write(pagina('cliente-servidor.js', store=False))
print('ok: index.html y servidor/public/index.html')

# núcleo para el servidor: las mismas reglas del negocio que usa la demo
quitar = lambda t: '\n'.join(l for l in t.split('\n') if not l.startswith("if (typeof module !== 'undefined')"))
nucleo = ('/* Archivo generado por build.py a partir de src/. No editar a mano. */\n'
          + src('syllabus.js') + quitar(src('store.js')) + quitar(src('avisos-contenido.js'))
          + '\nmodule.exports = { crearStore, contenidoAviso, SYLLABUS };\n')
open(os.path.join(R, 'servidor', 'nucleo.js'), 'w', encoding='utf-8').write(nucleo)
print('ok: servidor/nucleo.js')
