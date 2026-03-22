# Elio

Aplicacion React/Vite para alumnado que aprende euskera. La app propone 10 niveles de sinonimia y guarda el progreso de cada jugador en Supabase.

## Requisitos

- Node.js
- Un proyecto de Supabase
- Una tabla de sinonimos llamada `synonym_groups`
- La tabla de progreso `player_progress`

## Puesta en marcha

1. Instala dependencias:
   `npm install`
2. Configura `.env.local` con:
   - `VITE_SUPABASE_URL=...`
   - `VITE_SUPABASE_ANON_KEY=...`
   - `VITE_SUPABASE_SYNONYMS_TABLE=synonym_groups`
   - `VITE_SUPABASE_PLAYER_PROGRESS_TABLE=player_progress`
   - `VITE_SUPABASE_DAILY_PILLS_TABLE=eguneko_pildorak`
   - `VITE_SUPABASE_EROGLIFIKOAK_TABLE=eroglifikoak`
   - `VITE_SUPABASE_EROGLIFIKOAK_BUCKET=eroglificos`
   - `VITE_SUPABASE_EROGLIFIKOAK_BASE_URL=https://.../storage/v1/object/public/eroglificos`
   - `VITE_SUPABASE_PLAYER_EMAIL_DOMAIN=lexiko.app`
3. En Supabase:
   - Mantén tu tabla `synonym_groups`.
   - Ejecuta `player_progress_schema.sql`.
   - Ejecuta `teacher_admin_schema.sql`.
   - Desactiva la confirmacion obligatoria por email en Auth si quieres alta automatica al primer acceso.
4. Lanza la app:
   `npm run dev`

## Esquema esperado

La app puede leer varios alias de columnas, pero con tu estructura actual basta con:

- `word`
- `synonyms`
- `group_number`

Campos opcionales compatibles:

- `difficulty`
- `theme`
- `translation_es`
- `example_sentence`
- `tags`
- `active`

`group_number` debe ir de `1` a `10`, porque cada numero corresponde a uno de los niveles del juego.

## Progreso

- El progreso del jugador se guarda en `player_progress`.
- `forced_unlock_level` permite que `irakasle` desbloquee niveles manualmente.
- Supabase Auth identifica a cada jugador por su `user.id`.
- El usuario escribe solo algo como `joka1`, pero internamente la app usa `joka1@lexiko.app`.
- Si existia progreso antiguo en `localStorage`, la app intenta migrarlo una sola vez a Supabase y deja de usarlo como fuente principal.

## Usuario irakasle

- El usuario `irakasle` tiene un panel de administracion dentro de la app.
- Puede crear jugadores nuevos, añadir o editar palabras en `synonym_groups`, revisar el avance de cada jugador, resetear sus datos y forzar niveles desbloqueados.
- Para que estas acciones funcionen, las politicas de `teacher_admin_schema.sql` deben estar activas.

## Logica del juego

- Solo el primer nivel arranca desbloqueado.
- Cada nivel usa exclusivamente las palabras cuyo `group_number` coincide con ese nivel.
- Para desbloquear el siguiente nivel hay que superar el `70%` del nivel actual.
