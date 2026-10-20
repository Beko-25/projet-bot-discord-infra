import express from 'express';

const app = express();

app.use(express.json());


// Appeler Weather API ici
  // Transformer sa réponse en JSON
  // Renvoyer le résultat au bot
app.get("/api/weather", async (req, res) => {
  const city = req.query.city;

  if (typeof city !== "string" || city.trim() === "") {
    res.status(400).json({
      error: "Une ville est requise",
    });
    return;
  }

  
});


export default app;
