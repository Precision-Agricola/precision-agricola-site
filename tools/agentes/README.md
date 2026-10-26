# Agentes: Claude Code, Codex y Antigravity

Claude Code es el dueño de cada tarea y su PR. Codex (OpenAI) y Antigravity (`agy`, Google)
ayudan con piezas acotadas y Codex da una segunda opinión del diff. Se coordinan por
archivos del repo, no por un servicio aparte:

| Pieza | Para qué |
|---|---|
| `AGENTS.md` | Reglas comunes. Lo leen Codex y Antigravity; Claude lo carga desde `CLAUDE.md` con `@AGENTS.md` |
| `.agents/skills/` | Skills compartidas (fuente). `.claude/skills/` es su copia para Claude Code |
| `tools/agentes/delegar.py` | Claude le pasa una tarea a `codex` o `agy` en un worktree aparte, o pide revisión |
| `tools/agentes/preambulo.md` | Lo único propio del proyecto: el contexto que recibe el otro agente |
| `.claude/settings.json` | Hook `Stop` que pide revisión a Codex si `CODEX_REVIEW=1` |
| `tools/agentes/sincronizar-skills.py` | Copia `.agents/skills/` a `.claude/skills/` (`--check` en CI) |

## Dónde funciona

Las CLIs y sus sesiones viven en tu PC. La delegación funciona cuando Claude Code corre ahí,
directo o por Remote Control. En la nube de claude.ai no hay CLIs: el script sale con código 2
y lo dice, y el hook no hace nada.

## Preparar la PC (una vez)

| Agente | Pasos | Prueba |
|---|---|---|
| Codex | `npm i -g @openai/codex` y `codex login` | `python tools/agentes/delegar.py estado` muestra su versión |
| Antigravity | Instala la CLI `agy` e inicia sesión con tu cuenta de Google | `estado` muestra `agy` |
| Revisión automática | En `.claude/settings.local.json` (no se versiona): `{ "env": { "CODEX_REVIEW": "1" } }` | `estado` dice «prendida» |

Python 3.9 o más reciente. Sin dependencias extra; funciona en Windows con Git Bash.

## Uso

```bash
python tools/agentes/delegar.py estado
python tools/agentes/delegar.py codex "agrega la meta description que falta en web/src/pages/drones.astro"
python tools/agentes/delegar.py agy "aplica el espaciado aprobado a la tarjeta de producto en web/"
python tools/agentes/delegar.py agy --modo plan "lee el manual y resume el protocolo de limpieza"
python tools/agentes/delegar.py review
python tools/agentes/delegar.py limpiar
```

Cada tarea crea un worktree en `.claude/worktrees/delegar-<agente>-<slug>-<fecha>` con la rama
`delegar/...`, desde `HEAD` (`--base` para otro commit). El agente no hace commit. Su resumen
queda en `.claude/delegaciones/`. Ambas rutas están en `.gitignore`.

Después Claude lee el resumen y `git -C <worktree> diff HEAD`, corre el build y el audit en el
worktree, trae lo que sirve con `git -C <worktree> diff HEAD --binary | git apply` y limpia.

Códigos de salida: `0` terminó, `2` falta la CLI, `3` se pasó del límite, `4` agy no trabajó
porque el modo headless le negó un permiso.

### agy solo edita

`agy -p` lee y edita archivos pero no corre comandos. Su permiso por defecto
(`toolPermission: request-review`) pide confirmar cada comando y sin terminal la confirmación
se niega sola; entonces agy sale con 0 sin hacer nada. El script se lo advierte en el prompt,
detecta ese caso y devuelve `4`. Para que corriera comandos habría que aprobarle todo
(`always-proceed` o `--dangerously-skip-permissions`); el script no lo hace: lo que necesite
comandos va a Codex.

### Hook de revisión de Codex

Con `CODEX_REVIEW=1`, al terminar cada turno de Claude, Codex revisa en solo lectura el diff
contra la rama principal (`origin/HEAD`). Revisa cada estado del diff una vez y no encadena
revisiones. Si reporta algo, Claude lo recibe como pista y lo verifica antes de actuar.

## Llevarlo a otro repo

Se copia tal cual, salvo dos archivos que se reescriben para el proyecto nuevo:

1. Copia `tools/agentes/` completa, `.agents/skills/delegar/` y el hook de `.claude/settings.json`
   (si el repo ya tiene uno, mezcla el bloque `Stop`).
2. Reescribe `tools/agentes/preambulo.md` (qué es el repo y sus reglas duras) y `AGENTS.md`.
   En la skill `delegar`, ajusta la tabla «Quién hace qué» y el comando de pruebas.
3. Si había skills en `.claude/skills/`, muévelas a `.agents/skills/` y corre
   `python tools/agentes/sincronizar-skills.py`.
4. Agrega a `.gitignore`: `.claude/worktrees/`, `.claude/delegaciones/`, `.claude/settings.local.json`.
5. Copia `.github/workflows/agentes.yml` para que CI avise si las skills se desincronizan.
