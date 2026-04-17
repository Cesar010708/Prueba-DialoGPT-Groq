import fetch from 'node-fetch';
import dotenv from 'dotenv';
import fs from 'fs';
dotenv.config();

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function llamarDialoGPT(historial) {
  const response = await fetch(
    "https://router.huggingface.co/v1/chat/completions",
    {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.HUGGINGFACE_TOKEN}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "meta-llama/Llama-3.1-8B-Instruct:cerebras",
        messages: [
          {
            role: "system",
            content: "Eres un chatbot conversacional casual. Responde de forma corta y natural, máximo 2 oraciones. Sin listas, sin formato, sin explicaciones largas. Responde siempre en español."
          },
          ...historial
        ],
        max_tokens: 80
      })
    }
  );

  const data = await response.json();

  if (data.error) {
    console.error(`  [DialoGPT] Error: ${data.error.message || JSON.stringify(data.error)}`);
    return "Lo siento, no pude procesar tu mensaje en este momento.";
  }

  if (!data.choices || !data.choices[0]) {
    console.error(`  [DialoGPT] Respuesta inesperada:`, JSON.stringify(data));
    return "Lo siento, no pude procesar tu mensaje en este momento.";
  }

  return data.choices[0].message.content.trim();
}

async function llamarGroq(historial, sistemaPrompt) {
  const response = await fetch(
    "https://api.groq.com/openai/v1/chat/completions",
    {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.GROQ_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "llama-3.1-8b-instant",
        messages: [
          { role: "system", content: sistemaPrompt },
          ...historial
        ],
        temperature: 0.7,
        max_tokens: 150
      })
    }
  );

  const data = await response.json();

  if (data.error) {
    console.error(`  [Groq] Error: ${data.error.message || JSON.stringify(data.error)}`);
    return "No pude generar una respuesta en este momento.";
  }

  if (!data.choices || !data.choices[0]) {
    console.error(`  [Groq] Respuesta inesperada:`, JSON.stringify(data));
    return "No pude generar una respuesta en este momento.";
  }

  return data.choices[0].message.content.trim();
}

async function ejecutarEscenario(nombreEscenario, mensajeInicial, sistemaPrompt, archivoSalida) {
  const historial = [];
  let mensajeActual = mensajeInicial;

  console.log(`\n===== ${nombreEscenario} =====`);

  for (let turno = 1; turno <= 4; turno++) {
    console.log(`\nTurno ${turno}/4`);

    historial.push({ role: "user", content: mensajeActual });
    console.log("  Groq    :", mensajeActual);

    const respuestaDialoGPT = await llamarDialoGPT(historial);
    historial.push({ role: "assistant", content: respuestaDialoGPT });
    console.log("  DialoGPT:", respuestaDialoGPT);

    if (turno < 4) {
      await sleep(1500);
      mensajeActual = await llamarGroq(
        [{ role: "user", content: `El chatbot respondió: "${respuestaDialoGPT}". ¿Qué le dices a continuación?` }],
        sistemaPrompt
      );
    }
  }

  const evaluacionPrompt = `Eres un evaluador de calidad de chatbots. Sé objetivo y crítico pero justo.
Responde estas 3 preguntas sobre la conversación y un muy breve analisis:
1. ¿El chatbot entendió los mensajes del usuario?
2. ¿Las respuestas fueron coherentes con el contexto?
3. ¿La conversación tuvo sentido o quedó incompleta?

Responde ÚNICAMENTE con este JSON válido, sin markdown, sin texto extra, sin comillas faltantes:
{"veredicto":"PASS o FAIL o PARCIAL","analisis":"texto aqui"}`;

  const respuestaEvaluacion = await llamarGroq(
    [{ role: "user", content: `Evalúa esta conversación: ${JSON.stringify(historial)}` }],
    evaluacionPrompt
  );

  let evaluacion;
  try {
    evaluacion = JSON.parse(respuestaEvaluacion);
  } catch {
    evaluacion = { veredicto: "PARCIAL", analisis: respuestaEvaluacion };
  }

  const resultado = {
    escenario: nombreEscenario,
    turnos: historial,
    veredicto: evaluacion.veredicto,
    analisis: evaluacion.analisis
  };

  fs.mkdirSync('./output', { recursive: true });
  fs.writeFileSync(`./output/${archivoSalida}`, JSON.stringify(resultado, null, 2));

  console.log("\nEvaluación:", evaluacion.veredicto);
  console.log("Análisis:", evaluacion.analisis);
  console.log(`Archivo guardado en output/${archivoSalida}`);

  await sleep(3000);
}

// ESCENARIO 1 
await ejecutarEscenario(
  "Escenario 1 - Consulta simple",
  "Hola, ¿me puedes recomendar algo para hacer cuando estás aburrido en casa?",
  `Eres un usuario humano simulado.
Saluda y pide una recomendación general. Luego pregunta más detalles sobre una de las sugerencias. Al final pide que te explique por qué esa opción es buena.
Responde SOLO con el mensaje del usuario, sin explicaciones, sin comillas.`,
  "escenario1.json"
);

// ESCENARIO 2 
await ejecutarEscenario(
  "Escenario 2 - Cambio de tema abrupto",
  "¿Cuál crees que es la mejor forma de aprender a programar desde cero?",
  `Eres un usuario humano simulado.
El turno 1 ya fue enviado y fue sobre programación.
A partir del turno 2 tu única tarea es hablar de Cocina Mexicana. 
No expliques el cambio, no uses frases de transición, simplemente 
pregunta algo sobre él como si la conversación anterior nunca hubiera existido.
Mantén ese tema hasta el turno 4.

Escribe solo el mensaje, sin comillas ni explicaciones.`,
  "escenario2.json"
);

// ESCENARIO 3 
// Elegí este escenario porque en la vida real los usuarios rara vez son precisos.
// Quería ver si el chatbot pide aclaración o simplemente adivina y sigue adelante.
await ejecutarEscenario(
  "Escenario 3 - Preguntas ambiguas",
  "Oye, ¿me puedes ayudar con eso que te dije?",
  `Eres un usuario humano simulado. 
Eres alguien distraído que asume que el chatbot recuerda todo. 
Cada mensaje que mandes debe referirse a algo diferente pero igual de vago, 
como "lo del otro día", "aquello que te pregunté", "eso que me dijiste antes", 
"ya sabes, lo mismo de siempre". 
Varía las frases, no repitas la misma. 
Si el chatbot pregunta de qué hablas, ignora la pregunta y sigue con otro tema vago.
Escribe solo el mensaje, sin comillas ni explicaciones.`,
  "escenario3.json"
);

// ESCENARIO 4
// Lo elegí porque quería ver cómo reacciona el chatbot cuando el usuario se frustra.
// Es un escenario común en soporte al cliente y pocos lo prueban en QA básico.
await ejecutarEscenario(
  "Escenario 4 - Presión emocional",
  "Llevo media hora intentando que me expliques algo sencillo y sigues sin entenderme.",
  `Eres un usuario humano simulado.
Muéstrate frustrado y directo. Si el chatbot responde con algo genérico o no resuelve, escala la frustración. Si responde bien y específico, baja un poco el tono pero sigue siendo exigente.
Responde SOLO con el mensaje del usuario, sin explicaciones, sin comillas.`,
  "escenario4.json"
);

console.log("\n==========Fin de la prueba==========");