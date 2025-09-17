# Scolcoin Web Wallet

Este proyecto es una billetera web no custodial para la red Scolcoin (EVM compatible).
Fue pensada para que cualquier persona pueda levantarla en su propio computador
sin depender de servidores externos. Todo el manejo de llaves ocurre en el
navegador del usuario.

## Requisitos

- [Node.js](https://nodejs.org/) 18 LTS o superior
- [npm](https://www.npmjs.com/) (incluido en Node.js)

## Puesta en marcha rápida

1. Clona este repositorio o descarga el código fuente.
2. Instala las dependencias:

   ```bash
   npm install
   ```

3. Inicia el entorno de desarrollo:

   ```bash
   npm run dev
   ```

4. Abre el navegador en [http://localhost:5173](http://localhost:5173) y verás la
   billetera corriendo de forma local.

## Construir para producción

Para generar una versión optimizada lista para publicar en un hosting estático
(ej. Netlify, Vercel, GitHub Pages), ejecuta:

```bash
npm run build
```

Los archivos generados quedarán en la carpeta `dist/`. Puedes previsualizar el
resultado con:

```bash
npm run preview
```

## Características principales

- Conexión a los RPC públicos de Scolcoin mediante `ethers` v6.
- Creación e importación de carteras por mnemónico, clave privada o JSON
  keystore (compatible con MetaMask).
- Descarga de keystore cifrado (sin almacenar la clave privada en texto plano).
- Gestión de tokens ERC-20 (consulta de balance y transferencias).
- Historial de transacciones reciente consumiendo la API pública de Blockscout.
- Atajos para añadir la red a MetaMask (EIP-3085).

## Buenas prácticas de seguridad

- **Nunca compartas** tu frase semilla ni tu clave privada.
- Usa este proyecto únicamente en equipos confiables y con navegadores
  actualizados.
- Cuando descargues el keystore JSON, guárdalo en un lugar seguro y crea una
  contraseña robusta (mínimo 8 caracteres, idealmente más).
- Evita dejar el keystore almacenado en el navegador si el computador es
  compartido. Puedes borrarlo limpiando el `localStorage` del sitio.
- Revisa y personaliza la lista de RPC si quieres operar contra nodos propios.

## Personalización

La aplicación está construida con [Vite](https://vitejs.dev/), [React](https://react.dev/)
y [Tailwind CSS](https://tailwindcss.com/). Puedes modificar los estilos en
`src/index.css` o extender componentes dentro de `src/App.tsx`.

Para cambiar los valores por defecto de la red edita las constantes
`DEFAULT_RPCS` y `DEFAULT_CHAIN` en `src/App.tsx`.

## Licencia

Este código se distribuye para fines educativos y demostrativos. Úsalo bajo tu
propia responsabilidad.
