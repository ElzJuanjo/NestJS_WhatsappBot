# WhatsApp Bot — NestJS + OpenAI + Meta Cloud API

Bot de WhatsApp inteligente construido con NestJS que usa OpenAI para analizar la intención del usuario y ejecutar herramientas personalizadas (TRM, noticias tech, clima).

---

## 📋 Tabla de Contenidos

- [Arquitectura](#arquitectura)
- [Requisitos](#requisitos)
- [Instalación](#instalación)
- [Levantar el Proyecto](#levantar-el-proyecto)
- [Endpoints](#endpoints)
- [Tools Disponibles](#tools-disponibles)
- [Estructura del Proyecto](#estructura-del-proyecto)
- [Flujo de un Mensaje](#flujo-de-un-mensaje)
- [Tests](#tests)

---

## 🏗️ Arquitectura

```
src/
├── modules/
│   ├── whatsapp/          → Webhook, envío de mensajes, orquestación
│   │   ├── whatsapp.controller.ts
│   │   ├── whatsapp.service.ts
│   │   └── message-processor.service.ts   ← Director de orquesta
│   ├── openai/            → Análisis de intención + tool calling
│   │   ├── openai.service.ts
│   │   └── tools.definition.ts
│   ├── tools/             → Herramientas ejecutables
│   │   ├── implementations/
│   │   │   ├── trm.tool.ts
│   │   │   ├── tech-news.tool.ts
│   │   │   └── weather.tool.ts
│   │   ├── interfaces/tool.interface.ts
│   │   └── tools.registry.ts
│   └── conversation/      → Historial + persistencia
│       └── conversation.service.ts
├── database/
│   └── entities/          → TypeORM entities
│       ├── conversation.entity.ts
│       ├── message.entity.ts
│       └── tool-execution.entity.ts
└── common/
    └── filters/           → Manejo global de errores
```

---

## ✅ Requisitos

- Node.js v18+
- npm v9+
- PostgreSQL 17+ (o Docker)
- Cuenta de Meta Developer con app de WhatsApp
- API Key de Groq

---

## 🚀 Instalación

### 1. Clonar el repositorio

```bash
git clone https://github.com/ElzJuanjo/NestJS_WhatsappBot.git
cd NestJS_WhatsappBot
```

### 2. Instalar dependencias

```bash
npm install
```

### 3. Copiar variables de entorno

```bash
cp .env.example .env
```

Edita `.env` con tus credenciales.

---

## ▶️ Levantar el Proyecto

### Opción A — Con Docker

```bash
# Levantar PostgreSQL
docker-compose up -d

# Iniciar el bot en modo desarrollo
npm run start:dev
```

### Opción B — PostgreSQL local

Asegúrate de tener PostgreSQL corriendo y crea la base de datos:

```sql
CREATE DATABASE whatsapp_bot;
```

Luego:

```bash
npm run start:dev
```

### Verificar que funciona

```bash
curl http://localhost:3000/api/webhook?hub.mode=subscribe\
&hub.verify_token=mi_token_secreto_personalizado\
&hub.challenge=test123
# Respuesta esperada: test123
```

---

## 📡 Endpoints

| Método  | Ruta             | Descripción                       |
| -------- | ---------------- | ---------------------------------- |
| `GET`  | `/api/webhook` | Verificación del webhook con Meta |
| `POST` | `/api/webhook` | Recepción de mensajes entrantes   |

### GET /api/webhook — Verificación

Meta llama a este endpoint al configurar el webhook.

**Query params:**

```
hub.mode=subscribe
hub.verify_token=<tu_verify_token>
hub.challenge=<string_aleatorio>
```

**Respuesta exitosa:** `200 OK` con el valor de `hub.challenge`

---

### POST /api/webhook — Recibir mensaje

Meta envía este payload cuando un usuario escribe al bot.

**Body (enviado automáticamente por Meta):**

```json
{
  "object": "whatsapp_business_account",
  "entry": [{
    "id": "123456789",
    "changes": [{
      "field": "messages",
      "value": {
        "messaging_product": "whatsapp",
        "metadata": {
          "display_phone_number": "573001234567",
          "phone_number_id": "1234567890"
        },
        "contacts": [{
          "profile": { "name": "Juan Pérez" },
          "wa_id": "573009876543"
        }],
        "messages": [{
          "from": "573009876543",
          "id": "wamid.xxx",
          "timestamp": "1709500000",
          "type": "text",
          "text": { "body": "¿Cuánto está el dólar hoy?" }
        }]
      }
    }]
  }]
}
```

**Respuesta:** `200 OK` — `{ "status": "ok" }`

---

## 🛠️ Tools Disponibles

### 1. `get_trm` — Precio del dólar (TRM)

Obtiene la Tasa Representativa del Mercado oficial de Colombia.

- **Fuente primaria**: API de datos.gov.co (Banco de la República)
- **Fallback**: Google Finance (scraping)
- **Activadores**: "dólar", "TRM", "tasa de cambio", "precio del dólar"

**Ejemplo:**

```
Usuario: ¿Cuánto está el dólar hoy?
Bot: 💵 La TRM hoy (2024-03-04) es $4.123,45 COP por 1 USD.
     Fuente: Banco de la República de Colombia.
```

---

### 2. `get_tech_news` — Noticias de tecnología

Busca las 5 noticias más recientes sobre un tema tech.

- **Fuente**: RSS de Google News
- **Sin API key requerida**
- **Activadores**: "noticias de X", "novedades sobre X", "últimas noticias X"

**Ejemplo:**

```
Usuario: Noticias de inteligencia artificial
Bot: 📰 Noticias sobre "inteligencia artificial":

     1. OpenAI lanza GPT-5 con capacidades...
        Fuente: El Tiempo

     2. Google Gemini supera benchmarks...
        Fuente: TechCrunch
```

---

### 3. `get_weather` — Clima actual

Obtiene la temperatura actual, humedad y velocidad del viento de cualquier ciudad del mundo mediante geocodificación automática.

- **Fuente**: Open-Meteo (API gratuita, sin registro)
- **Geocoding**: Open-Meteo Geocoding API (búsqueda dinámica por nombre de ciudad)
- **Activadores**: "clima en X", "temperatura en X", "cómo está el tiempo en X"

**Ejemplo:**

```
Usuario: ¿Cómo está el clima en Medellín?
Bot: ☀️ Clima en Medellín:
     🌡️ Temperatura: 24°C
     💧 Humedad: 68%
     💨 Viento: 12 km/h
```

---

### Comandos especiales (sin OpenAI)

| Comando                | Descripción                          |
| ---------------------- | ------------------------------------- |
| `/start` o `/hola` | Mensaje de bienvenida con capacidades |
| `/ayuda` o `/help` | Lista de comandos y ejemplos          |

---

## 🗄️ Estructura de Base de Datos

### Tabla `conversations`

| Columna     | Tipo      | Descripción                    |
| ----------- | --------- | ------------------------------- |
| id          | UUID      | PK                              |
| phoneNumber | VARCHAR   | Número único del usuario      |
| userName    | VARCHAR   | Nombre del contacto en WhatsApp |
| createdAt   | TIMESTAMP | Primera interacción            |
| updatedAt   | TIMESTAMP | Última actualización          |

### Tabla `messages`

| Columna        | Tipo      | Descripción                  |
| -------------- | --------- | ----------------------------- |
| id             | UUID      | PK                            |
| conversationId | UUID      | FK → conversations           |
| role           | ENUM      | user / assistant / tool       |
| content        | TEXT      | Contenido del mensaje         |
| toolName       | VARCHAR   | Nombre de la tool (si aplica) |
| metadata       | JSONB     | Datos adicionales             |
| createdAt      | TIMESTAMP | Timestamp del mensaje         |

### Tabla `tool_executions`

| Columna      | Tipo      | Descripción                |
| ------------ | --------- | --------------------------- |
| id           | UUID      | PK                          |
| toolName     | VARCHAR   | Nombre de la tool ejecutada |
| input        | JSONB     | Argumentos de entrada       |
| output       | JSONB     | Resultado de la ejecución  |
| success      | BOOLEAN   | Si fue exitosa              |
| errorMessage | TEXT      | Error si falló             |
| phoneNumber  | VARCHAR   | Usuario que lo solicitó    |
| executedAt   | TIMESTAMP | Cuándo se ejecutó         |

---

## 🔄 Flujo de un Mensaje

```
1. Usuario escribe en WhatsApp
         ↓
2. Meta envía POST /api/webhook
         ↓
3. Controller responde 200 inmediato (evita reintentos)
         ↓
4. MessageProcessorService.process() (asíncrono)
         ↓
5. ¿Es comando especial? (/ayuda, /start)
   └─ SÍ → Responder directamente
   └─ NO → Continuar
         ↓
6. Guardar mensaje en PostgreSQL
         ↓
7. OpenAI analiza intención + historial
         ↓
8. ¿Requiere tool?
   ├─ NO → Responder con texto de OpenAI
   └─ SÍ → Ejecutar tool (TRM / Noticias / Clima)
              ↓
          9. OpenAI redacta respuesta con datos
              ↓
         10. Enviar respuesta por WhatsApp
              ↓
         11. Guardar respuesta en PostgreSQL
```

---

## 🧪 Tests

Los scripts de prueba están ubicados en la raíz del proyecto y permiten verificar el funcionamiento de las herramientas externas y la integración con la IA de forma aislada, sin necesidad de levantar el servidor completo.

### test-tools.ts — Prueba de herramientas externas

Verifica la conexión y respuesta de las tres APIs externas: TRM (datos.gov.co), clima (Open-Meteo) y noticias (Google News RSS).

```bash
npx ts-node test-tools.ts
```

**Salida esperada:**

```
── TEST TRM ──
BanRep data: { valor: '4123.45', vigenciadesde: '2024-03-04T00:00:00.000', ... }

── TEST WEATHER ──
Bogotá: 14°C - viento 9 km/h

── TEST NEWS ──
1. OpenAI lanza GPT-5 con nuevas capacidades multimodales
2. Google Gemini supera benchmarks en razonamiento matemático
3. Meta presenta su nuevo modelo de lenguaje de código abierto
```

> **Nota:** Si `BanRep data` devuelve `No data for today`, puede ser que la TRM del día aún no haya sido publicada. Reintenta más tarde o verifica directamente en [datos.gov.co](https://www.datos.gov.co/resource/mcec-87by.json).

---

### test-openai.ts — Prueba de integración con Groq/OpenAI

Verifica que el modelo de lenguaje detecta correctamente la intención del usuario y realiza un `tool_call` para la herramienta correspondiente.

Requiere tener configurada la variable `OPENAI_API_KEY` en el archivo `.env`.

```bash
npx ts-node test-openai.ts
```

**Salida esperada:**

```
finish_reason: tool_calls
tool_calls: [
  {
    id: 'call_abc123',
    type: 'function',
    function: { name: 'get_trm', arguments: '{}' }
  }
]
content: null
```

> Si `finish_reason` es `stop` y `tool_calls` es `null`, el modelo no está reconociendo la intención. Verifica que el modelo configurado soporta function calling y que la `OPENAI_API_KEY` es válida.

---

### Captura de funcionamiento

<!-- Adjunta aquí una captura de pantalla del bot en funcionamiento -->

![WhatsApp Image 2026-03-05 at 10 51 15 AM](https://github.com/user-attachments/assets/72b236c9-cb49-4d1a-85c1-f80efb47a809)

---

## 🧪 Pruebas con curl

**Simular mensaje de texto:**

```bash
curl -X POST http://localhost:3000/api/webhook \
  -H "Content-Type: application/json" \
  -d '{
    "object": "whatsapp_business_account",
    "entry": [{ "id": "1", "changes": [{ "field": "messages", "value": {
      "messaging_product": "whatsapp",
      "metadata": { "display_phone_number": "1234", "phone_number_id": "abc" },
      "contacts": [{ "profile": { "name": "Test" }, "wa_id": "573001234567" }],
      "messages": [{ "from": "573001234567", "id": "m1", "timestamp": "123",
        "type": "text", "text": { "body": "¿Cuánto está el dólar?" } }]
    }}]}]
  }'
```

---

## 📦 Scripts disponibles

```bash
npm run start:dev     # Desarrollo con hot reload
npm run start:prod    # Producción
npm run build         # Compilar TypeScript
npm run lint          # Lint del código
npm run test          # Tests unitarios
```

---

## 🔧 Agregar una nueva Tool

1. Crear `src/modules/tools/implementations/mi-tool.tool.ts` implementando `ITool`
2. Agregar la definición en `src/modules/openai/tools.definition.ts`
3. Registrar en `src/modules/tools/tools.module.ts` (providers)
4. Inyectar y registrar en `src/modules/tools/tools.registry.ts`

---

## 👤 Autor

Desarrollado por Juan José JV (ElzJuanjo)
