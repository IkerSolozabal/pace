# pace.

Calculadora de ritmos de carrera para **ruta** y **pista**. Web estática, sin dependencias ni build, pensada para el móvil y publicada en GitHub Pages en **[pace.sogra.es](https://pace.sogra.es)**.

## Qué hace

- **Calcula una magnitud a partir de las otras dos**: ritmo, tiempo o distancia. Eliges qué quieres calcular y ese campo se convierte en el resultado.
- **Dos modos**:
  | | Ruta | Pista |
  |---|---|---|
  | Parciales | cada **1 km** | cada **200 m** o **400 m** (seleccionable) |
  | Unidad de distancia | km | m |
  | Ritmo | min/km | min/km **o** tiempo por vuelta |
  | Distancias rápidas | 5K · 10K · Media · Maratón | 400 · 800 · 1500 · 3000 · 5K · 10K · Media · Maratón |
- **Tabla de parciales** con tiempo parcial y acumulado. En pista se resaltan los kilómetros enteros y se muestran décimas de segundo.
- **Resumen**: ritmo /km, tiempo total, distancia, velocidad (km/h) y ritmo por milla (ruta) o tiempo por vuelta (pista).
- **Enlace compartible**: el cálculo se guarda en la URL (`#m=ruta&c=pace&d=10000&t=3000`) y en `localStorage`, así que al volver se mantiene.
- Modo **oscuro y claro** automáticos según el sistema, accesible con teclado y respetando `prefers-reduced-motion`.

> Los cálculos asumen **ritmo constante** (todos los parciales iguales).

## Uso

1. Elige **Ruta** o **Pista** arriba a la derecha.
2. En *¿Qué quieres calcular?* elige **Ritmo**, **Tiempo** o **Distancia**.
3. Rellena los otros dos campos (o pulsa una distancia rápida). El resultado se actualiza al momento.
4. En pista, elige vuelta de **200 m** o **400 m** y si quieres introducir el ritmo **/km** o **/vuelta**.

Ejemplos:

| Quiero… | Modo | Calcular | Datos | Resultado |
|---|---|---|---|---|
| Ritmo para bajar de 50' en 10K | Ruta | Ritmo | 10K + 0:50:00 | 5:00 /km |
| Tiempo de maratón a 4:15/km | Ruta | Tiempo | Maratón + 4:15 | 2:59:20 |
| Vueltas a ritmo de maratón sub-3 | Pista (400 m) | Ritmo | Maratón + 2:59:59 | 4:16 /km → 1:42.4 /vuelta |

### Parámetros de la URL

| Parámetro | Valores | Significado |
|---|---|---|
| `m` | `ruta` \| `pista` | Modo |
| `c` | `pace` \| `time` \| `distance` | Magnitud que se calcula |
| `l` | `200` \| `400` | Longitud de vuelta (solo pista) |
| `u` | `km` \| `lap` | Unidad del ritmo (solo pista) |
| `d` | metros | Distancia |
| `t` | segundos | Tiempo |
| `p` | segundos por km | Ritmo |

## Estructura

```
.
├── index.html            # Estructura y textos
├── styles.css            # Estilos (tokens en :root, oscuro/claro, responsive)
├── app.js                # Interacción con el DOM, estado y persistencia
├── calc.js               # Lógica pura de cálculo (sin DOM) — testeable
├── tests/calc.test.mjs   # Tests con node:test
├── favicon.svg
├── manifest.webmanifest  # Permite "Añadir a pantalla de inicio"
├── CNAME                 # Dominio personalizado de GitHub Pages
└── .nojekyll             # Sirve los ficheros tal cual, sin Jekyll
```

Unidades internas: distancia en **metros**, tiempo en **segundos**, ritmo en **segundos por km**. Las conversiones a km, vueltas o h:mm:ss solo ocurren al leer y escribir los campos.

## Desarrollo local

No hay build. Solo hace falta servir la carpeta por HTTP (los módulos ES no funcionan con `file://`):

```bash
python -m http.server 5173
```

y abrir <http://localhost:5173>. Alternativa con Node:

```bash
npm start
```

### Tests

Requiere Node 18+:

```bash
npm test
```

## Despliegue en GitHub Pages

1. Sube el repositorio a GitHub.
2. En **Settings → Pages**, elige *Deploy from a branch*, rama `main` y carpeta `/ (root)`.
3. El fichero `CNAME` ya contiene `pace.sogra.es`. En el DNS debe existir un registro `CNAME` de `pace` apuntando a `<usuario>.github.io`.
4. Cuando GitHub emita el certificado, activa **Enforce HTTPS**.

## Licencia

MIT
