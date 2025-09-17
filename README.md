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

## Guía de despliegue en Linux con systemd y Nginx

Si quieres publicar la billetera en un servidor Linux (por ejemplo Ubuntu
22.04) detrás de Nginx, estos son los pasos recomendados.

### 1. Preparar el servidor

1. Actualiza los paquetes del sistema y las herramientas base:

   ```bash
   sudo apt update && sudo apt upgrade -y
   sudo apt install -y git curl nginx
   ```

2. Instala Node.js 18 LTS (o superior). Con `nvm` puedes hacerlo así:

   ```bash
   curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
   source ~/.bashrc
   nvm install 18
   nvm use 18
   ```

   > También puedes instalar Node.js desde los paquetes oficiales o usando el
   > repositorio de NodeSource si prefieres una instalación global para todos los
   > usuarios.

3. (Opcional) Crea un usuario dedicado para ejecutar la aplicación y evitar usar
   `root`:

   ```bash
   sudo adduser --system --group --home /opt/geth-wallet wallet
   ```

### 2. Clonar el proyecto y construir la versión de producción

```bash
sudo mkdir -p /opt/geth-wallet
sudo chown wallet:wallet /opt/geth-wallet
git clone https://github.com/blockchaintechnologysas/wallet.git /opt/geth-wallet
cd /opt/geth-wallet
npm install
npm run build
```

El comando `npm run build` generará la carpeta `dist/` con los archivos estáticos
que se servirán en producción.

### 3. Crear el servicio systemd

1. Abre el archivo del servicio:

   ```bash
   sudo nano /etc/systemd/system/geth-wallet.service
   ```

2. Copia el siguiente contenido (ajusta la ruta de `WorkingDirectory` si es
   diferente):

   ```ini
   [Unit]
   Description=Geth Wallet (Scolcoin) - Frontend
   After=network.target

   [Service]
   Type=simple
   User=wallet
   Group=wallet
   WorkingDirectory=/opt/geth-wallet
   Environment=NODE_ENV=production
   ExecStart=/usr/bin/npm run preview -- --host 0.0.0.0 --port 4173
   Restart=on-failure

   [Install]
   WantedBy=multi-user.target
   ```

   - Si no creaste el usuario `wallet`, reemplaza `User` y `Group` por el usuario
     con el que vayas a ejecutar la aplicación (por ejemplo `www-data` o tu
     usuario administrador).
   - Asegúrate de que `/usr/bin/npm` sea la ruta correcta al ejecutable `npm` en
     tu sistema (`which npm`).

3. Recarga systemd y habilita el servicio para que inicie automáticamente con el
   servidor:

   ```bash
   sudo systemctl daemon-reload
   sudo systemctl enable --now geth-wallet.service
   sudo systemctl status geth-wallet.service
   ```

   El comando `status` debe mostrar el servicio activo escuchando en el puerto
   4173.

### 4. Configurar Nginx como proxy inverso

1. Crea un bloque de servidor para tu dominio (por ejemplo
   `wallet.scolcoin.com`):

   ```bash
   sudo nano /etc/nginx/sites-available/wallet.scolcoin.com
   ```

2. Añade la configuración:

   ```nginx
   server {
       listen 80;
       listen [::]:80;
       server_name wallet.scolcoin.com;

       location / {
           proxy_pass http://127.0.0.1:4173;
           proxy_http_version 1.1;
           proxy_set_header Host $host;
           proxy_set_header X-Real-IP $remote_addr;
           proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
           proxy_set_header X-Forwarded-Proto $scheme;
       }
   }
   ```

3. Habilita el sitio y recarga Nginx:

   ```bash
   sudo ln -s /etc/nginx/sites-available/wallet.scolcoin.com /etc/nginx/sites-enabled/
   sudo nginx -t
   sudo systemctl reload nginx
   ```

4. (Recomendado) Configura HTTPS con Certbot o el cliente que prefieras:

   ```bash
   sudo apt install -y certbot python3-certbot-nginx
   sudo certbot --nginx -d wallet.scolcoin.com
   ```

### 5. Verificar el despliegue 

- Abre `http://wallet.scolcoin.com` en tu navegador y comprueba que la billetera
  carga correctamente.
- Revisa los logs en caso de problemas:

  ```bash
  sudo journalctl -u geth-wallet.service -f
  ```

Con esto tendrás la aplicación levantada como un servicio de sistema y expuesta a
Internet a través de Nginx.
