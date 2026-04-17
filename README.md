# Prueba-DialoGPT-Groq
# Prueba Técnica — QA Engineer: Integración y análisis de chatbot

Script que simula conversaciones entre dos IAs para evaluar la calidad de respuestas de un chatbot. Groq actúa como usuario simulado y evaluador, mientras que el chatbot evaluado responde y mantiene el contexto de la conversación.

## Tecnologías

- Node.js
- Groq API — `llama-3.1-8b-instant` (usuario simulado + evaluador)
- HuggingFace Router — `meta-llama/Llama-3.1-8B-Instruct:cerebras` (chatbot evaluado)

> **Nota:** DialoGPT-medium fue reemplazado por el modelo de HuggingFace Router ya que su endpoint está deprecado en el servicio de inferencia de HuggingFace.

## Requisitos

- Node.js v18 o superior
- Cuenta en [Groq](https://console.groq.com) con API Key
- Cuenta en [HuggingFace](https://huggingface.co) con token y permiso de escritura
## Instalación

```bash
git clone https://github.com/Cesar010708/Prueba-DialoGPT-Groq.git
cd prueba-tecnica
npm install
```

## Configuración

Crea un archivo `.env` basado en `.env.example`:

```bash
cp .env.example .env
```

Llena las variables con tus credenciales:
GROQ_API_KEY=tu_api_key_aqui
HUGGINGFACE_TOKEN=tu_token_aqui

## Uso

```bash
node index.js
```

Los resultados se guardan automáticamente en la carpeta `/output`.

## Escenarios

| # | Nombre 	         	     | Descripción                                                              |
|---|------------------------|--------------------------------------------------------------------------|
| 1 | Consulta simple        | El usuario saluda, pide una recomendación y solicita más detalles        |
| 2 | Cambio de tema abrupto | El usuario cambia de tema sin transición ni explicación                  |
| 3 | Preguntas ambiguas     | El usuario hace referencias vagas asumiendo que el chatbot recuerda todo |
| 4 | Presión emocional      | El usuario se muestra frustrado y exige respuestas directas              |

Los escenarios 3 y 4 fueron propuestos por mí. 
El 3 porque en la vida real los usuarios rara vez dan contexto completo — quería ver si el chatbot pide aclaración o simplemente improvisa. 
El 4 porque la frustración del usuario es uno de los casos más comunes en soporte real y pocos scripts de QA básico lo cubren.

## Estructura del proyecto
prueba-tecnica/
├── index.js
├── .env.example
├── .gitignore
├── package.json
├── README.md
└── output/
├── escenario1.json
├── escenario2.json
├── escenario3.json
└── escenario4.json

## Formato de resultados

Cada escenario genera un archivo JSON con esta estructura:

```json
{
  "escenario": "nombre del escenario",
  "turnos": [
    { "rol": "groq", "mensaje": "..." },
    { "rol": "chatbot", "mensaje": "..." }
  ],
  "veredicto": "PASS | FAIL | PARCIAL",
  "analisis": "Explicación basada en los criterios de evaluación"
}
```

## Criterios de evaluación

Groq analiza la conversación de manera critica para dar el veredicto
Cada escenario es analizado respondiendo estas 3 preguntas:
1. ¿El chatbot entendió los mensajes del usuario?
2. ¿Las respuestas fueron coherentes con el contexto?
3. ¿La conversación tuvo sentido o quedó incompleta?
