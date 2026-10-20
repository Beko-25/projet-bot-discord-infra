import "dotenv/config";
import process = require("process");
import  {  Client, GatewayIntentBits, Message } from "discord.js"; 

const TOKEN = process.env.TOKEN;
const USER_ID = process.env.USER_ID;


if(!TOKEN){
    throw new Error("ERROR: the TOKEN is invalid");
}

if(!USER_ID){
    throw new Error("ERROR: the USER ID is invalid");
}

//création du bot et obtention des permissions
const client = new Client({
    intents: [GatewayIntentBits.DirectMessages, GatewayIntentBits.MessageContent],
});

client.once("clientReady", async () => {    
    console.log(`✅ connected as ${client.user?.tag}`);

        try {
    const user = await client.users.fetch(USER_ID);
        user.send( `Salam 3aleykoum,  je suis connecté 🫡`);
    } catch (error) {
                console.error("Erreur Récupération du USER: " + error);
    }    

});





client.on("messageCreate", async (message: Message) => {
    const user = await client.users.fetch(USER_ID);

     if(message.channel.type === 1) { // message.channel.type === 1 signifie que c'est les DM

        if(message.author.bot){
            return;
        }   

        if(message.content.startsWith("!ping")){
            return user.send("POOOOOOOOOOOOOONGG");
        }

        if(message.content.startsWith("!Jalal")){
            const response = await message.reply("Identification de Jalal en cours");
            const resultat = "771352830324899870";
            response.edit(`Voici l'identifiant de Jalal: ${resultat}`)
        }
     }
}
);
        
client.login(TOKEN);
