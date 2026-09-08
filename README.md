# Oftalvista Web + CMS

Sitio público en PHP 8.3 con un panel administrativo para publicaciones y contenido editable. Usa PostgreSQL como fuente de datos y Redis para el caché del blog, rate limiting y revocación de sesiones JWT.

## Inicio rápido

1. Crea el archivo local de configuración con secretos aleatorios:

   ```bash
   sh bin/create-env.sh
   ```

2. Revisa `.env` si deseas cambiar el correo, la contraseña inicial o los puertos. `ADMIN_PASSWORD` necesita al menos 12 caracteres.

3. Levanta y verifica los servicios:

   ```bash
   docker compose up --build -d
   docker compose ps
   curl http://localhost:8080/api/health.php
   ```

- Sitio: <http://localhost:8080>
- Administrador: <http://localhost:8080/admin/login.php>
- pgAdmin: <http://localhost:5050>
- En pgAdmin, el host de PostgreSQL es `postgres`, puerto `5432`, y las credenciales son las variables `POSTGRES_*` del `.env`.

En el primer arranque se crean las tablas, el usuario administrador y se importan las seis publicaciones HTML originales. Los siguientes arranques conservan publicaciones, ajustes e imágenes en volúmenes Docker.

## Módulos

- Publicaciones: crear, editar, guardar como borrador, programar/publicar, subir imagen y eliminar.
- Contenido del sitio: título principal, texto destacado, métricas, títulos/descripciones de secciones, etiquetas del menú, contacto, horarios y redes sociales.
- Página pública: portada, listado dinámico del blog y detalle por slug, con compatibilidad 301 para enlaces `.html` anteriores.

## Arquitectura y nombres

- `public/` es el único directorio expuesto por Apache y contiene el front controller, recursos, API y panel administrativo.
- `app/Http/Controllers/` contiene la lógica de las páginas; `resources/views/` contiene únicamente su presentación.
- `database/migrations/` y `database/seeds/` contienen el esquema y los datos iniciales.
- Las clases PHP usan `PascalCase`; métodos y variables, `camelCase`; plantillas, recursos y URLs, `kebab-case`; base de datos, `snake_case`.
- Las rutas públicas son limpias: `/servicios`, `/blog`, `/blog/{slug}` y `/cirugia-de-cataratas`. Las URLs antiguas redirigen con estado 301.

La estructura completa y la guía para agregar páginas están en [docs/project-structure.md](docs/project-structure.md).

## Seguridad aplicada

- Contraseñas con Argon2id y rehash automático.
- JWT HS256 firmado con `APP_KEY`, expiración de 8 horas, cookie `HttpOnly`/`SameSite=Strict` y revocación en Redis al cerrar sesión.
- Protección CSRF en toda mutación administrativa.
- Bloqueo temporal tras cinco intentos fallidos por combinación de correo e IP.
- PDO con consultas preparadas y emulación desactivada.
- Escape contextual de textos y allowlist HTML para el cuerpo de las publicaciones.
- Validación de imágenes por contenido real, tipo y tamaño; nombres aleatorios y SVG no permitido.
- CSP, protección contra iframes, MIME sniffing y listado de directorios desactivado.

En producción usa HTTPS (activa automáticamente `Secure` en la cookie si `APP_URL` empieza con `https://`), no expongas pgAdmin públicamente y administra secretos fuera del repositorio.

## Despliegue en Vercel

`vercel.json` declara el servicio `web` con runtime `container` y dirige todas
las rutas a `Dockerfile.vercel` en la raíz del proyecto. La imagen usa PHP 8.3
y Apache, sirve únicamente `public/` y escucha en la variable `PORT` de Vercel
(8080 por defecto para pruebas locales). No requiere desplegar `compose.yaml`.
Referencia: [contenedores en Vercel](https://vercel.com/kb/guide/does-vercel-support-docker-deployments).

1. Crea una base PostgreSQL externa y ejecuta en ella
   `database/migrations/001_create_cms_schema.sql`.
2. Configura en Vercel `APP_ENV=production`, `APP_URL` con tu dominio HTTPS,
   `APP_KEY`, `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER` y `DB_PASSWORD`.
   Para conexiones PostgreSQL que requieran TLS, configura también
   `PGSSLMODE=require` (o `verify-full` con los certificados del proveedor).
3. Inicializa el administrador y las publicaciones una vez desde la imagen,
   usando un archivo privado de variables con los valores anteriores y
   `ADMIN_EMAIL` / `ADMIN_PASSWORD` (mínimo 8 caracteres; usa una contraseña más larga en producción):

   ```bash
   docker build -f Dockerfile.vercel -t oftalvista-vercel .
   docker run --rm --env-file /ruta/privada/vercel.env oftalvista-vercel php bin/setup.php
   ```

   `setup.php` también restablece la contraseña del administrador existente;
   no se ejecuta automáticamente al iniciar el contenedor.
4. Importa el repositorio en Vercel con esta carpeta como raíz del proyecto,
   incluyendo `Dockerfile.vercel` y `vercel.json` en el commit, o ejecuta
   `vercel deploy` para generar una preview desde los archivos locales.
   Para actualizar el dominio de producción usa `vercel deploy --prod`.
   No configures `public/` como directorio de salida estático: los archivos
   PHP deben ejecutarse dentro del contenedor.

Para probar la imagen localmente:

```bash
docker run --rm --env-file /ruta/privada/vercel.env -e PORT=8080 -p 8080:8080 oftalvista-vercel
```

### PostgreSQL en Supabase

La aplicación se conecta por PDO al **Session pooler**, puerto 5432, con el
usuario `postgres.<project-ref>` y `DB_NAME=postgres`. Obtén el host en
Supabase → Connect → Session pooler. No necesita las claves publishable/secret
de la API ni cambiar la autenticación propia del CMS.

En Vercel configura las variables `DB_*`, `PGSSLMODE=verify-full` y
`PGSSLROOTCERT=/usr/local/share/ca-certificates/supabase-ca.crt`. La imagen
incluye la [CA pública de Supabase](https://supabase-downloads.s3-ap-southeast-1.amazonaws.com/prod/ssl/prod-ca-2021.crt).
Mantén `DB_PASSWORD` y `APP_KEY` en los secretos de Vercel.

Ejecuta las migraciones SQL en orden antes de servir el sitio. La migración
`002_protect_supabase_api.sql` activa RLS sin políticas públicas: PHP accede
por PostgreSQL, mientras las claves públicas de la API no pueden leer ni
modificar estas tablas. Para cargar únicamente las publicaciones iniciales
sin crear ni restablecer administradores usa `php bin/setup.php --content-only`.

**Limitaciones pendientes del CMS:** Vercel no conserva el sistema de archivos
entre instancias. Las imágenes nuevas de `public/uploads/` necesitan una
integración con almacenamiento externo (por ejemplo, Blob o S3) antes de usar
las subidas en producción. El cliente Redis actual solo configura `REDIS_HOST`
y `REDIS_PORT`, sin autenticación; para un Redis administrado que exija
credenciales hay que ampliar `app/Core/Cache.php`. Sin Redis no funcionan el
rate limiting ni la revocación de sesiones respaldados por ese servicio.
Las sesiones PHP usadas por CSRF también se guardan localmente; hay que
configurar un almacén compartido para que funcionen entre distintas instancias.

## Pruebas

```bash
docker compose exec php php tests/run.php
curl -I http://localhost:8080/admin/login.php
curl -I http://localhost:8080/blog
```
