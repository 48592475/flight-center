# Cómo publicar Flight Center con base de datos (Render)

El repositorio tiene dos versiones:

| Versión | Dónde | Datos |
|---|---|---|
| Demo | GitHub Pages: https://48592475.github.io/flight-center/ | Se guardan en el navegador de cada persona |
| Real | Render (esta guía) | Base de datos PostgreSQL compartida por todos |

## 1. Crear la cuenta en Render

1. Entrá a https://render.com y tocá **Get Started**. Elegí **GitHub** para iniciar sesión con tu cuenta.
2. Cuando Render pida acceso a GitHub, permití el repositorio **flight-center**.
3. Cargá una tarjeta en **Billing**: el servidor y la base de datos que usa el sistema son pagos (aproximadamente USD 7 por mes cada uno; confirmalo en render.com/pricing).

## 2. Publicar con el Blueprint

1. En Render tocá **New → Blueprint**.
2. Elegí el repositorio **48592475/flight-center**. Render lee el archivo `render.yaml` y muestra lo que va a crear:
   - `flight-center` (servidor web)
   - `flight-center-db` (base de datos PostgreSQL)
3. Completá las variables que pide:
   - **ADMIN_EMAIL**: el email con el que va a entrar la administración.
   - **ADMIN_PASSWORD**: una contraseña segura (mínimo 6 caracteres). Cambiala después desde *Mi perfil*.
   - Las demás (SMTP, WHATSAPP, FAA) se pueden dejar vacías y cargar más adelante.
4. Tocá **Apply**. En unos minutos queda online en una dirección tipo `https://flight-center.onrender.com`.
5. Entrá con ADMIN_EMAIL y ADMIN_PASSWORD. Desde **Usuarios** cargá instructores, alumnos, pilotos y mecánicos, y desde **Instructores** asigná los días y horarios de vuelo.

La base arranca vacía: solo con el administrador, la flota (LV-FCA, LV-FCB, LV-FCC, LV-FCD, Frasca y Simu 1) y las tarifas. La flota y las tarifas se pueden cambiar desde la administración.

## 3. Activar los emails (Gmail)

1. Creá un Gmail de la escuela, por ejemplo `flightcenter.reservas@gmail.com`.
2. En https://myaccount.google.com/security activá la **Verificación en dos pasos**.
3. Entrá a https://myaccount.google.com/apppasswords, creá una contraseña de aplicación llamada "Flight Center" y copiá las 16 letras.
4. En Render: servicio **flight-center → Environment**, cargá:
   - `SMTP_USER` = el Gmail
   - `SMTP_PASS` = la contraseña de aplicación (sin espacios)
5. Guardá. El servicio se reinicia solo y desde ahí los avisos salen por email.

Más adelante, con un dominio propio (por ejemplo @flightcenter.com.ar), se cambian `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS` y `MAIL_FROM` por los del proveedor de correo.

## 4. Activar WhatsApp (API oficial de Meta)

1. Creá una cuenta en https://business.facebook.com y después una app en https://developers.facebook.com con el producto **WhatsApp**.
2. Registrá el número de la escuela (no puede estar en uso en la app de WhatsApp) y verificá la empresa.
3. En **WhatsApp Manager → Plantillas de mensaje** creá estas tres plantillas, categoría **Utilidad**, idioma **Español (ARG)** (`es_AR`). El texto tiene que respetar el orden de las variables:

   **reserva_confirmada**
   ```
   Hola {{1}}, tu {{2}} en Flight Center quedó confirmado.
   Fecha: {{3}}
   Horario: {{4}}
   Equipo: {{5}}
   Instructor: {{6}}
   Código: {{7}}
   Cancelación sin cargo hasta 24 h antes; después se cobra el 20% del bloque.
   ```

   **clase_confirmada**
   ```
   Hola {{1}}, quedaste inscripto/a en la clase {{2}} de Flight Center.
   Fecha: {{3}}
   Horario: {{4}}
   Lugar: {{5}}
   ```

   **recordatorio_pago**
   ```
   Hola {{1}}, tu cuenta en Flight Center registra un saldo pendiente de {{2}}. Podés abonar en la oficina de la escuela en efectivo, tarjeta, transferencia o Mercado Pago. Si ya pagaste, desestimá este mensaje.
   ```
4. Cuando Meta apruebe las plantillas, cargá en Render:
   - `WHATSAPP_TOKEN` = token permanente de un usuario del sistema (System User) con permiso `whatsapp_business_messaging`
   - `WHATSAPP_PHONE_ID` = el "Phone number ID" del número
5. Los teléfonos de los perfiles tienen que estar en formato argentino con característica, por ejemplo `+54 9 11 5555-1234`.

## 5. NOTAM automáticos (opcional)

1. Pedí una clave gratuita en https://api.faa.gov (NOTAM API).
2. Cargá en Render `FAA_CLIENT_ID` y `FAA_CLIENT_SECRET`.

El METAR y el TAF funcionan sin clave (Aviation Weather Center, NOAA).

## 6. Recordatorio diario de deuda

Sale solo todos los días a las 9:00 (hora de Argentina) a cada alumno o piloto con saldo a pagar, por email y WhatsApp. La administración puede enviarlo en el momento desde **Avisos → Enviar ahora**.

## 7. Dominio propio (opcional)

1. Registrá el dominio en https://nic.ar (por ejemplo `flightcenter.com.ar`).
2. En Render: **flight-center → Settings → Custom Domains → Add** y seguí las instrucciones para cargar el registro DNS.

## 8. Copias de seguridad

La base de datos de Render tiene copias de seguridad automáticas en los planes pagos. Desde **flight-center-db → Recovery** se puede restaurar a un momento anterior.

## Para quien mantiene el código

- El código fuente está en `src/`. Después de cambiarlo, correr `python3 build.py`, que arma `index.html` (demo) y `servidor/public/index.html` + `servidor/nucleo.js` (versión real).
- Para probar el servidor en una computadora: `cd servidor && npm install && npm run demo` (usa datos de ejemplo y guarda en `servidor/datos/`).
