import express from 'express';
import router from "./routes/router.ts";

//à mettre dans la VM2
//sudo ufw allow from 192.168.56.101 to any port 3000 proto tcp
//cela onfigure le pare-feu UFW de la VM2 pour autoriser une connexion précise de la VM1 sur le port 3000

const PORT = 3000;
const app = express();

app.use(express.json());
app.use("/api", router);

// 0.0.0.0 permet aux autres machines, notamment VM1, d'atteindre l'API.
app.listen(PORT, "0.0.0.0", () => {
  console.log(`API démarrée sur le port ${PORT}`);
});


export default app;
