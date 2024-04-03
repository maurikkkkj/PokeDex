const { Telegraf, session, Markup } = require('telegraf');
const axios = require('axios');


const token = ' ' // Não se esqueça de colocar o token do seu bot.
const bot = new Telegraf(token)

bot.use(session());

let currentPokemon = null; 
let attempts = {}; 

async function sendRandomPokemon(ctx) {
    currentPokemon = await getRandomPokemon();
    const photoUrl = await getPokemonPhotoUrl(currentPokemon.name);
    const caption = `🎉 Um pokémon aleatório apareceu. Ache o nome do pokémon correto nos botões abaixo, e capture rapidamente.`;
    const incorrectOptions = await getRandomPokemonNames(3);
    const keyboard = Markup.inlineKeyboard([
        Markup.button.callback(currentPokemon.name, currentPokemon.name),
        Markup.button.callback(incorrectOptions[0], 'wrong'),
        Markup.button.callback(incorrectOptions[1], 'wrong'),
        Markup.button.callback(incorrectOptions[2], 'wrong')
    ]);
    ctx.replyWithPhoto({ url: photoUrl }, { caption: caption, parse_mode: 'Markdown', ...keyboard });
}

bot.on('new_chat_members', async (ctx) => {
    await sendRandomPokemon(ctx);
    setInterval(async () => {
        await sendRandomPokemon(ctx);
    }, 5 * 60 * 1000);
});

bot.action(/.*/, async (ctx) => {
    if (!currentPokemon) {
        return; 
    }

    const pokemonName = ctx.callbackQuery.data;

    if (pokemonName === currentPokemon.name) {
        ctx.answerCbQuery(`Parabéns! Você capturou ${currentPokemon.name}.`);
        ctx.session.pokemonList = ctx.session.pokemonList || [];
        ctx.session.pokemonList.push(currentPokemon.name);
        currentPokemon = null;
        attempts[ctx.callbackQuery.from.id] = 0;
    } else if (pokemonName === 'wrong') {
        const userId = ctx.callbackQuery.from.id;
        attempts[userId] = attempts[userId] ? attempts[userId] + 1 : 1;
        if (attempts[userId] < 3) {
            ctx.answerCbQuery(`Ops! Essa não é a resposta correta. Você tem mais ${3 - attempts[userId]} tentativa(s).`);
        } else {
            ctx.answerCbQuery(`Ops! Essa não é a resposta correta. Você esgotou suas tentativas.`);
            delete attempts[userId];
        }
    }
});

async function getRandomPokemon() {
    const response = await axios.get('https://pokeapi.co/api/v2/pokemon-species/?limit=1000');
    const randomIndex = Math.floor(Math.random() * response.data.results.length);
    const randomPokemonUrl = response.data.results[randomIndex].url;
    const pokemonResponse = await axios.get(randomPokemonUrl);
    return {
        name: pokemonResponse.data.name,
    };
}

async function getPokemonPhotoUrl(pokemonName) {
    const response = await axios.get(`https://pokeapi.co/api/v2/pokemon/${pokemonName}`);
    return response.data.sprites.other['official-artwork'].front_default;
}

async function getRandomPokemonNames(count) {
    const response = await axios.get('https://pokeapi.co/api/v2/pokemon-species/?limit=1000');
    const pokemonNames = response.data.results.map(result => result.name);
    const randomPokemonNames = pokemonNames.filter(name => name !== currentPokemon.name);
    return randomPokemonNames.sort(() => 0.5 - Math.random()).slice(0, count);
}

bot.launch();