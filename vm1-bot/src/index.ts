import "dotenv/config";
import process = require("process");
import {
  Client,
  GatewayIntentBits,
  Message,
  REST,
  Routes,
  SlashCommandBuilder,
} from "discord.js";


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
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.DirectMessages,
    GatewayIntentBits.MessageContent,
  ],
});

const commands = [
  new SlashCommandBuilder()
    .setName("ping")
    .setDescription("Vérifie que le bot répond"),
  new SlashCommandBuilder()
    .setName("weather")
    .setDescription("Affiche la météo actuelle à la HE Vinci"),
].map((command) => command.toJSON());

client.once("clientReady", async () => {
  console.log(`✅ connected as ${client.user?.tag}`);

  try {
    const rest = new REST({ version: "10" }).setToken(TOKEN);
    await rest.put(Routes.applicationCommands(client.user!.id), {
      body: commands,
    });
    console.log("✅ commandes slash enregistrées");
  } catch (error) {
    console.error("Erreur lors de l'enregistrement des commandes slash :", error);
  }

  try {
    const user = await client.users.fetch(USER_ID);
    await user.send("je suis connecté 🫡");
  } catch (error) {
    console.error("Erreur Récupération du USER :", error);
  }
});

client.on("messageCreate", async (message: Message) => {
  if (message.author.bot || message.content.trim().length === 0) {
    return;
  }

  try {
    const response = await getGroqResponse(message.content.trim());
    await message.reply(response);
  } catch (error) {
    console.error("Erreur lors de l'appel à Groq :", error);
    await message.reply("Impossible de contacter l'assistant pour le moment.");
  }
});

client.on("interactionCreate", async (interaction) => {
  if (!interaction.isChatInputCommand()) {
    return;
  }

  try {
    if (interaction.commandName === "ping") {
      await interaction.reply("POOOOOOOOOOOOOONGG");
      return;
    }

    if (interaction.commandName === "weather") {
      await interaction.deferReply();
      await interaction.editReply(await getIPLWeather());
    }
  } catch (error) {
    console.error("Erreur lors du traitement de la commande Discord :", error);

    if (interaction.deferred || interaction.replied) {
      await interaction.editReply("Impossible de récupérer la météo pour le moment.");
    } else {
      await interaction.reply("Impossible de traiter la commande pour le moment.");
    }
  }
});


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



async function getGroqResponse(prompt: string): Promise<string> {
  const response = await fetch(`${API_URL}/api/groq`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ message: prompt }),
  });

  if (!response.ok) {
    const details = await response.text();
    throw new Error(
      `L'API Groq a répondu avec le statut ${response.status}: ${details}`,
    );
  }

  const body = await response.json();
  if (
    typeof body !== "object" ||
    body === null ||
    !("response" in body) ||
    typeof body.response !== "string"
  ) {
    throw new Error("La réponse de l'API Groq est invalide");
  }

  return body.response;
}

client.login(TOKEN);
