const axios = require('axios');
const TelegramBot = require('node-telegram-bot-api');
const express = require('express');
require('dotenv').config();

const token = '6416421723:AAGcrBVbPY9E8-bIdK_4-AeM7t1KCtpn4AA'
const chat_bot = '-1002055941207'
const bot = new TelegramBot(token, { polling: false });
const app = express();

async function enviarMensagemTelegram(chat_id, mensagem) {
    try {
        await bot.sendMessage(chat_id, mensagem, { parse_mode: 'Markdown' });
    } catch (error) {
        console.error('Erro ao enviar mensagem para o Telegram:', error);
    }
}

const apiKey = process.env.RAPIDAPI_KEY;

const options = {
  method: 'GET',
  url: 'https://soccer-football-info.p.rapidapi.com/live/full/',
  params: {
    l: 'en_US',
    f: 'json',
    e: 'no'
  },
  headers: {
    'X-RapidAPI-Key': apiKey,
    'X-RapidAPI-Host': 'soccer-football-info.p.rapidapi.com'
  }
};

function casaFavoritoPressao(apCasa, apFora, oddCasa, placarCasa, placarFora, idPartida, partidasNotificadas){
    if((oddCasa <= 1.45) && (apCasa>=45) && ((apFora + apFora)<=apCasa) && placarCasa==placarFora && !partidasNotificadas.has(idPartida)){
        return true;
    }
}

function foraFavoritoPressao(apCasa, apFora, oddFora, placarCasa, placarFora, idPartida, partidasNotificadas){
    if((oddFora <= 1.45) && (apFora>=45) && ((apCasa + apCasa)<=apFora) && placarCasa==placarFora && !partidasNotificadas.has(idPartida)){
        return true;
    }
}

const partidasEmAnalise = new Set();
const partidasNotificadas = new Set();
var qtdPartidas = 0;

async function analisarPartidas(){
    try {
        const response = await axios.request(options);
        const partidas = response.data.result;
        qtdPartidas = partidas.length;
        for(let i=0; i<qtdPartidas; i++){
            const minutos = parseInt( partidas[i].timer.split(':')[0]);
            const idPartida = partidas[i].id;
            if(minutos>=45 && minutos<=47){
                partidasEmAnalise.add(idPartida);
                const apCasa = partidas[i].teamA.stats.attacks.d;
                const apFora = partidas[i].teamB.stats.attacks.d;
                const oddCasa = partidas[i].odds.starting['1X2'].bet365['1'];
                const oddFora = partidas[i].odds.starting['1X2'].bet365['2'];
                const placarCasa = partidas[i].teamA.score.f;
                const placarFora = partidas[i].teamB.score.f;
                if(casaFavoritoPressao(apCasa,apFora,oddCasa,placarCasa,placarCasa,idPartida,partidasNotificadas) || foraFavoritoPressao(apCasa, apFora, oddFora, placarCasa, placarFora, idPartida, partidasNotificadas)){
                    if(oddCasa < oddFora){
                        mensagemIndicacao = "🏆Entrar em Win casa";
                    } 
                    if(oddCasa > oddFora){
                        mensagemIndicacao = "🏆Entrar em Win fora"
                    }
                    const nomeCasa = partidas[i].teamA.name;
                    const nomeFora = partidas[i].teamB.name;
                    const mensagem = `*${nomeCasa}* vs *${nomeFora}*\n\n⚽ Placar: ${placarCasa} x ${placarFora}\n⚔️ Ataques Perigosos: ${apCasa >= 45 ? '*' + apCasa + '* 🔥' : apCasa} x ${apFora >= 45 ? '*' + apFora + '* 🔥' : apFora}\n📈 Odds Pré: ${oddCasa <= 1.45 ? oddCasa + ' 👑' : oddCasa} x ${oddFora <= 1.45 ? oddFora + ' 👑' : oddFora}\n🕛 Tempo: ${minutos}\n\n*${mensagemIndicacao}*`;
                    await enviarMensagemTelegram(chat_bot,mensagem);
                    console.log(mensagem);
                    partidasNotificadas.add(idPartida);
                }
            } else {
                partidasEmAnalise.delete(idPartida);
            }
        }
    } catch (error) {
        console.error(error);
    }
}

setInterval(iniciar, 60000);

async function iniciar() {
    try {
        await analisarPartidas();
        console.log("Ao vivo: " + qtdPartidas + "\nAnalisando: " + partidasEmAnalise.size + "\nPartidas Notificadas: ["+ [...partidasNotificadas].join(", ")+"]");
    } catch (error) {
        console.log(error)
    }
}

const port = process.env.PORT || 3001; 

app.get('/win', (req, res) => {
    res.send("<b>BOT WIN</b><br>"+ " 🚨 "+ qtdPartidas + " Jogos ao vivo<br>"+" 🤖 Analisando " + partidasEmAnalise.size + " Partidas<br>" + " 💾 Partidas Notificadas: ["+ [...partidasNotificadas].join(", ")+"]");
});

app.get('/win/aovivo', (req, res) => {
    res.send([...partidasEmAnalise]);  
});

app.listen(port, () => {
    console.log(`Servidor rodando na porta ${port}`);
});
