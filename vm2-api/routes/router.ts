import axios from "axios";
import { Router } from "express";

const router = Router();

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

export default router;
