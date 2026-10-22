import "dotenv/config";
import process = require("process");
import  {  Client, GatewayIntentBits, Message } from "discord.js"; 

const TOKEN = process.env.TOKEN;
const USER_ID = process.env.USER_ID;
const API_URL = process.env.API_URL;



if(!TOKEN){
    throw new Error("ERROR: the TOKEN is invalid");
}

if(!USER_ID){
    throw new Error("ERROR: the USER ID is invalid");
}

if(!API_URL){
    throw new Error("ERROR: the API_URL is invalid");
}

//création du bot et obtention des permissions
const client = new Client({
    intents: [GatewayIntentBits.DirectMessages, GatewayIntentBits.MessageContent],
});

client.once("clientReady", async () => {    
    console.log(`✅ connected as ${client.user?.tag}`);

        try {
    const user = await client.users.fetch(USER_ID);
        user.send( `je suis connecté 🫡`);
    } catch (error) {
                console.error("Erreur Récupération du USER: " + error);
    }    

});





client.on("messageCreate", async (message: Message) => {
    if (message.channel.type !== 1 || message.author.bot) {
        return;
    }

    const user = await client.users.fetch(USER_ID);

    if(message.content.startsWith("!ping")){
        return user.send("POOOOOOOOOOOOOONGG");
    }

    if(message.content.startsWith("!weather")){
        try {
            const weatherMessage = await getIPLWeather();
            return user.send(weatherMessage);
        } catch (error) {
            console.error("Erreur lors de la récupération de la météo :", error);
            return user.send("Impossible de récupérer la météo pour le moment.");
        }
    }
}
);
        

async function getIPLWeather(): Promise<string> {
  const response = await fetch(`${API_URL}/api/weather`);

  if (!response.ok) {
    throw new Error(`L'API a répondu avec le statut ${response.status}`);
  }

  const weatherMessage: unknown = await response.json();
  if (typeof weatherMessage !== "string") {
    throw new Error("La réponse de l'API météo est invalide");
  }

  return weatherMessage;
}

client.login(TOKEN);
