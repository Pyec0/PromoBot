import logger from "./logger.js";
import 'dotenv/config';
import { Client, GatewayIntentBits } from "discord.js";
import fetch from "node-fetch";

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages],
});

// As variáveis vêm direto do ambiente do Replit:
const DISCORD_TOKEN = process.env.DISCORD_TOKEN;
const CHANNEL_ID = process.env.CHANNEL_ID;

// === EVENTO QUANDO O BOT FICA ONLINE ===
client.once('ready', async () => {
  console.log(`✅ Logado como ${client.user.tag}`);

  try {
    const channel = await client.channels.fetch(CHANNEL_ID);
    if (channel) {
      await channel.send('🟢 **Bot de promoções está online e monitorando ofertas de tecnologia!**');
      console.log('Mensagem de inicialização enviada com sucesso.');
    } else {
      console.log('❌ Canal não encontrado.');
    }
  } catch (err) {
    console.error('Erro ao enviar mensagem inicial:', err);
  }
});

// === LOGIN ===
client.login(process.env.DISCORD_TOKEN);

process.on("unhandledRejection", (reason, p) => {
  logger.error(`Unhandled Rejection at: ${p} - reason: ${reason}`);
});

process.on("uncaughtException", (err) => {
  logger.error(`Uncaught Exception: ${err.stack || err}`);
  // opcional: esperar 1s e sair, para garantir flush do log
  setTimeout(() => process.exit(1), 1000);
});

process.on('SIGINT', async () => {
  logger.info("SIGINT recebido — encerrando.");
  try {
    const channel = await client.channels.fetch(process.env.CHANNEL_ID);
    if (channel) await channel.send('🔴 **Bot de promoções foi desligado!**');
  } catch (err) {
    logger.error("Erro ao enviar mensagem de desligamento: " + (err.stack || err.message));
  } finally {
    logger.info("Saindo do processo.");
    process.exit(0);
  }
});


async function buscarPromocoes() {
  try {
    const canal = await client.channels.fetch(CHANNEL_ID);

    // fontes de promoções reais
    const fontes = [
      "https://api.pelando.com.br/v1/posts?topic=tecnologia&per_page=5",
      "https://api.tecmundo.com.br/descontos/api/ofertas?categoria=tecnologia"
    ];

    for (const url of fontes) {
      const response = await fetch(url);
      const data = await response.json();

      let ofertas = [];

      // tratamento para Pelando
      if (url.includes("pelando")) {
        ofertas = data.data.map(o => ({
          titulo: o.attributes.title,
          link: `https://www.pelando.com.br/ofertas/${o.attributes.slug}`,
          preco: o.attributes.price || "Preço não informado"
        }));
      }

      // tratamento para TecMundo
      if (url.includes("tecmundo")) {
        ofertas = data.ofertas.map(o => ({
          titulo: o.titulo,
          link: o.url,
          preco: o.preco
        }));
      }

      for (const oferta of ofertas) {
        if (!ultimosLinks.has(oferta.link)) {
          ultimosLinks.add(oferta.link);
          await canal.send(
            `🛍️ **${oferta.titulo}**\n💰 ${oferta.preco}\n🔗 ${oferta.link}`
          );
          console.log(`Nova promoção enviada: ${oferta.titulo}`);
        }
      }
    }
  } catch (err) {
    console.error("Erro ao buscar promoções:", err.message);
  }
}

// === EVENTO QUANDO O BOT É DESLIGADO OU ENCERRADO ===
async function enviarMensagemDesligamento(motivo) {
  try {
    const channel = await client.channels.fetch(CHANNEL_ID);
    if (channel) {
      await channel.send(`🔴 **Bot de promoções foi desligado (${motivo})!** 💤 Voltaremos em breve com mais ofertas!`);
      console.log(`Mensagem de desligamento enviada (${motivo}).`);
    }
  } catch (err) {
    console.error('Erro ao enviar mensagem de desligamento:', err);
  } finally {
    setTimeout(() => process.exit(0), 2000);
  }
}

// Captura Ctrl + C
process.on('SIGINT', () => enviarMensagemDesligamento('manual'));

// Captura encerramento do sistema (Replit, servidor, etc)
process.on('SIGTERM', () => enviarMensagemDesligamento('sistema'));


client.login(process.env.DISCORD_TOKEN);