import axios from "axios";
import { Groq } from "groq-sdk";
import { Router } from "express";
import "dotenv/config";

const router = Router();
const GROQ_API_KEY = process.env.GROQ_API_KEY;

if (!GROQ_API_KEY) {
  throw new Error("La variable d'environnement GROQ_API_KEY est obligatoire");
}

const groq = new Groq({
  apiKey: GROQ_API_KEY,
});

router.get("/weather", async (_req, res) => {
  try {
    const latitude = 50.849425;
    const longitude = 4.450933;

    const url =
      `https://api.open-meteo.com/v1/forecast?latitude=${latitude}` +
      `&longitude=${longitude}&current_weather=true` +
      `&hourly=temperature_2m,apparent_temperature,precipitation,weathercode,windspeed_10m` +
      "&timezone=Europe/Brussels";

    const response = await axios.get(url, {
      headers: {
        "User-Agent": "ProjetInfra/1.0 (projetInfra4@gmail.com)",
      },
    });

    const { temperature: currentTemp, weathercode: currentCode } =
      response.data.current_weather;

    let weatherMessage = "";
    if (currentCode === 71) {
      weatherMessage = "Conditions: neige\n";
    } else if (currentCode >= 51) {
      weatherMessage = "Conditions: pluie\n";
    }

    const fullWeatherMessage =
      `Météo actuelle à la HE Vinci: ${currentTemp}\n${weatherMessage}`;

    res.json(fullWeatherMessage);
  } catch (error) {
    console.error("Erreur lors de la récupération de la météo :", error);

    res.status(502).json({
      error: "Impossible de récupérer la météo",
    });
  }
});

router.post("/groq", async (req, res) => {
  const { message } = req.body as { message?: unknown };

  if (typeof message !== "string" || message.trim().length === 0) {
    res.status(400).json({
      error: "Le champ 'message' doit être une chaîne non vide",
    });
    return;
  }

  try {
    const chatCompletion = await groq.chat.completions.create({
      messages: [
        {
          role: "user",
          content: message.trim(),
        },
      ],
      model: "openai/gpt-oss-120b",
      temperature: 0.6,
      max_completion_tokens: 1024,
      top_p: 1,
      stream: false,
      reasoning_effort: "medium",
    });

    const content = chatCompletion.choices[0]?.message?.content;
    if (typeof content !== "string" || content.length === 0) {
      throw new Error("La réponse de Groq ne contient aucun message");
    }

    res.json({ response: content });
  } catch (error) {
    console.error("Erreur lors de l'appel à Groq :", error);
    res.status(502).json({
      error: "Le service Groq est indisponible",
    });
  }
});

export default router;
