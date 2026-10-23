# Auditoría completa de i18n de la consola

Fecha: 23 de octubre de 2026. Base: `origin/main`, commit `3aaa831c2151a902d12dd659679ee7e61c3611dd` (PR #5 fusionada).

## Resultado y recuento

Se mantiene el sistema de `src/i18n`: cookie `qv_locale`, valores internos `es`/`en`, español de España (`es-ES`) por defecto e inglés (`en-US`). No se añade ninguna biblioteca de traducción.

- **225 traducciones nuevas** y **144 traducciones corregidas**.
- **2.103 claves españolas** frente a 1.878 en la base. Ambos idiomas declaran explícitamente las mismas claves; `extended.en.json` sustituye el fallback implícito a la clave inglesa para el catálogo complementario.
- El recuento compara claves únicas de la unión de `es.json` y `extended.es.json`, no el número de apariciones en componentes. Una corrección es un valor español distinto para una clave ya existente. El inventario reproducible de claves y valores anteriores/nuevos está en [translation-changes.json](translation-changes.json).
- Se unifica «Panel de control», «Agentes» y «Base de conocimiento».

Los nombres de voces/modelos/proveedores, prompts, transcripciones y datos del usuario conservan su contenido. Los códigos de API, identificadores, valores persistidos, columnas de importación CSV y claves técnicas de exportación no se traducen.

## Por qué la auditoría anterior no bastaba

La PR #5 cubría JSX literal, algunos atributos y determinadas notificaciones. La búsqueda de archivos de consultas dependía de `/hooks/queries/`, que no coincide con las rutas Windows. No recorría todos los `.ts`, los esquemas Zod, las etiquetas almacenadas en objetos/arrays ni varios mensajes dinámicos. La ejecución predeterminada del CLI comprobaba una sola categoría y no fallaba por hallazgos. Los fallbacks a la clave inglesa ocultaban entradas ausentes del catálogo complementario inglés.

Tener una traducción tampoco garantizaba que el componente la utilizara: quedaban descripciones de plantillas, labels de helpers, estados de llamada y errores visibles que pasaban directamente al render. Había fallos de hidratación cuando las cachés de sesión/organización del cliente estaban disponibles antes que su primer render de hidratación.

## Cobertura por apartados

El análisis estático recorre **231 archivos TypeScript/TSX** de `src` (excepto declaraciones `.d.ts`). La revisión manual se organizó por rutas y componentes de presentación.

| Apartado | Rutas y estados revisados |
| --- | --- |
| Autenticación | `/login`, `/register`, `/forgot-password`, `/reset-password`, `/verify`, `/accept-invitation`; validaciones, errores, invitación incompleta y enlaces de recuperación |
| Organización inicial | `/orgs`, `/orgs/create`, `/orgs/[id]`; selección, creación, miembros y roles |
| Panel y navegación | `/`, `/dashboard`, menú lateral, cabecera, breadcrumbs, selector de idioma, KPI, comparaciones, fechas, gráficos, tablas y carga |
| Agentes | `/agents`, `/agents/[id]`; diálogo de plantillas, comportamiento, modelos/voces, análisis, webhooks, herramientas, widget web, conocimiento, límites y opciones avanzadas |
| Llamadas | `/calls`, `/calls/[id]`; filtros, paginación, estados/direcciones, audio, metadatos, valores booleanos, transcripciones y panel de llamadas en directo |
| Telefonía | `/numbers`; estados vacíos, compra, búsqueda, asignación y confirmaciones de liberación |
| Conocimiento | `/kb`; carga, estados de procesamiento/error, indicaciones de recuperación y diálogo de detalle/edición |
| Herramientas y secretos | `/tools`, `/secrets`; HTTP, parámetros, MCP, errores de URL/sincronización y selectores de credenciales |
| Llamadas salientes | `/outbound`; llamada rápida, campañas, CSV, comprobación previa, personalización, experimentos y conversiones |
| Configuración | `/settings`, `/settings/profile`, `/settings/organization`, `/settings/api-keys`, `/settings/roles`, `/settings/billing`, `/settings/danger` |
| Estados compartidos | 404, errores, skeletons, tooltips, placeholders, aria/alt/title, notificaciones y formularios |

No hay una ruta independiente de contactos o suscripciones en esta versión: los destinatarios se gestionan en los flujos CSV/campañas y la facturación disponible es la cartera de prepago.

## Cambios de presentación relevantes

Los errores conocidos se traducen en `src/i18n/errors.ts`; los desconocidos muestran un fallback contextual y los objetos originales conservan sus diagnósticos. Las validaciones implícitas de Zod tienen una indicación traducida. Se recupera la clave de los mensajes ya traducidos para mantener su orientación específica y permitir cambiar de idioma.

Se localizan fechas, cantidades, nombres de idiomas y campos accesibles. El SDK de Stripe y Elements reciben el idioma de la consola; las instancias se reutilizan por idioma. Se mantiene la moneda de cada operación y el funcionamiento de pagos. Los valores de sesión y organización respetan el primer render SSR antes de mostrar la caché del cliente.

## Auditoría automática y límites

```powershell
pnpm --filter console i18n:audit
pnpm --filter console test:i18n
node apps/console/scripts/i18n-audit.mjs --review-properties
```

El CLI comprueba por defecto todas sus categorías y devuelve código 1 ante hallazgos accionables. Incluye JSX, atributos literales/condicionales, opciones, toast, alias locales de errores, arrays mapeados, propiedades de configuración, claves de ambos idiomas, copy de eventos/estados y presentación directa de estados/direcciones API. Reconoce helpers locales que traducen props o las delegan a otro helper comprobado. Los tests de la consola exigen que todas las categorías accionables estén vacías.

**Límites:** es análisis sintáctico con seguimiento local conservador, no un análisis completo de tipos/datos entre archivos o de todas las respuestas posibles de servicios externos. No prueba por sí solo que cada string dinámico use una traducción. Por eso el informe separa **165 declaraciones catalogadas informativas** de los hallazgos accionables; sus consumidores se revisaron manualmente. `--review-properties` las lista para futuras revisiones; no son una lista de errores confirmados. Marcas, endpoints, código, datos y contenido externo no se traducen automáticamente. Los nombres de helpers compartidos que traducen props requieren mantener su contrato y sus pruebas.

## Verificación ejecutada

Entorno: Windows, Node.js 22.17.1. No se instalaron dependencias nuevas ni se modificó el lockfile.

| Comprobación | Resultado |
| --- | --- |
| `node --experimental-strip-types --test apps/console/tests/*.test.mjs` | **197/197** |
| `pnpm --filter console test:i18n` | **41/41**, incluidos 16 casos del auditor |
| `pnpm --filter console i18n:audit` | **0 hallazgos accionables**; 165 declaraciones informativas |
| `pnpm --filter console lint` | Correcto, cero avisos de ESLint |
| `pnpm --filter console check-types` | Correcto |
| `pnpm --filter console build` | Compilación de producción correcta |
| `git diff --check` | Correcto |
| Revisión independiente | Sin hallazgos bloqueantes; verificó pruebas i18n y las correcciones de hidratación, enums y Stripe |
| Navegador Chromium, API ficticia local | **56 visitas**: 28 rutas/entradas en español y 28 en inglés; cero errores de página/hidratación |
| Interacciones Chromium | **25 escenarios**; cero errores de página/hidratación |

Las 25 interacciones incluyen validación y error de autenticación, cambio de idioma y recarga en ambos sentidos, navegación posterior, panel poblado, plantillas de agentes, las nueve pestañas de configuración, documento fallido/detalle, diálogos de secretos/herramientas/compra y las tres pestañas salientes. Se emplearon exclusivamente datos ficticios en una API de pruebas en `127.0.0.1:5101` y una consola aislada en `localhost:3101`.

El flag de TypeScript es necesario para los tests existentes que importan `.ts` directamente en Node 22.17. Las pruebas i18n usan el compilador TypeScript ya disponible y no necesitan ese flag. El ejecutable pnpm del entorno emitió un aviso sobre la ubicación de `pnpm.overrides`/`patchedDependencies`; no se cambió la configuración de dependencias para este trabajo.

### Pruebas generales ajenas a la consola

`pnpm test` se ejecutó: la primera suite general terminó con **106/118** y no continuó a las siguientes suites por el encadenado `&&`. La suite de consola se ejecutó aparte y pasó completa. No hay cambios de este trabajo en las pruebas o módulos generales afectados. Fallaron estas 12 entradas:

- MCP workflow deploys through Coolify API resource UUID.
- docs dependencies build without OIDC and only the protected deploy job can mint it.
- valid tagged images PATCH configuration before triggering deploy.
- configuration and PATCH failures cannot trigger a deploy.
- hotfix image payload builder escapes quotes, backslashes, and newlines.
- emergency validator accepts only confirmed merged commits and records the incident.
- `tests/phone-number-contract.test.mjs` (importación directa de TypeScript sin el flag en este Node).
- server shell-expanded test globs include every test on Node 20 (ruta URL Windows inválida).
- deploy diff uses successful deployment job, includes missed commits and fails closed.
- normal deployment recovery re-runs CI on main and reusable jobs reject other branches.
- deployment detection preserves matches in large diffs under pipefail.
- security audit distinguishes below-threshold findings from suppressions.

Los fallos incluyen expectativas de workflows/CRLF, utilidades de shell/despliegue, rutas Windows y soporte de TypeScript del runtime; no se han alterado pruebas para ocultarlos. El comando general del monorepo **no se presenta como aprobado**.

## Capturas y validación pendiente con servicios reales

Capturas posteriores con datos sintéticos: [panel](screenshots/dashboard-es.png), [plantillas](screenshots/new-agent-es.png), [voces](screenshots/voice-es.png), [documento fallido](screenshots/knowledge-error-es.png). Las muestras/prompts sintéticos en inglés son datos de agente deliberadamente conservados. No se capturó un antes equivalente.

No se realizaron llamadas reales, generación/audio LiveKit o ElevenLabs, autenticación Google, entrega real de correo, aceptación de invitaciones reales, compra/liberación real de números ni transacciones Stripe. No se verificó visualmente el iframe real de Stripe ni todo el contenido remoto de un catálogo MCP. Los componentes, estados simulados y tests cubren la presentación correspondiente, pero no sustituyen una prueba con esos proveedores y credenciales. El comportamiento financiero, voces Tony/Carolina, modelos y configuración local permanecen fuera del diff.

## Actualizar la instalación local cuando se fusione la PR

Ejecutar en PowerShell en la instalación original, donde ya existen los archivos locales:

```powershell
Set-Location 'C:\Users\Usuario\Desktop\Zona Desarrollo\QuickVoice\QuickVoice'
git fetch origin
git switch main
git merge --ff-only origin/main

$qvCompose = @(
  '-f', 'docker-compose.dev.yml',
  '-f', 'docker-compose.local.yml',
  '-f', 'docker-compose.voice.yml',
  '--profile', 'mail',
  '--profile', 'voice'
)
docker compose @qvCompose up -d --no-deps --force-recreate console
docker compose @qvCompose logs --tail 80 console
```

Abrir `http://localhost:3000`, recargar y seleccionar Español si la cookie anterior estaba en inglés. La cookie existente se respeta; no se borra la preferencia del usuario. La consola local monta el código y ejecuta `next dev`, por lo que no necesita `docker compose build console`. El comando recrea únicamente `console` y conserva el resto de los servicios y sus datos. Si Git rechaza la actualización por cambios locales o divergencia, conservarlos y resolver ese bloqueo antes de continuar; no ejecutar operaciones que los descarten.
