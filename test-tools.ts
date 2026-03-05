import axios from 'axios';
import * as cheerio from 'cheerio';

async function testTRM() {
    console.log('\n── TEST TRM ──');
    try {
        const today = new Date();
        const yyyy = today.getFullYear();
        const mm = String(today.getMonth() + 1).padStart(2, '0');
        const dd = String(today.getDate()).padStart(2, '0');
        const dateStr = `${yyyy}-${mm}-${dd}`;

        const url =
            `https://www.datos.gov.co/resource/mcec-87by.json` +
            `?vigenciadesde=${dateStr}T00:00:00.000`;

        const res = await axios.get(url);
        console.log('BanRep data:', res.data[0] ?? 'No data for today');
    } catch (e) {
        console.error('TRM error:', e.message);
    }
}

async function testWeather() {
    console.log('\n── TEST WEATHER ──');
    try {
        const res = await axios.get(
            'https://api.open-meteo.com/v1/forecast?latitude=4.71&longitude=-74.07&current_weather=true'
        );

        const weather = res.data.current_weather;

        console.log(
            `Bogotá: ${weather.temperature}°C - viento ${weather.windspeed} km/h`
        );
    } catch (e) {
        console.error('Weather error:', e.message);
    }
}

async function testNews() {
    console.log('\n── TEST NEWS ──');
    try {
        const url =
            'https://news.google.com/rss/search?q=inteligencia+artificial' +
            '+when:7d&hl=es-419&gl=CO&ceid=CO:es-419';
        const res = await axios.get(url, {
            headers: { 'User-Agent': 'Mozilla/5.0' },
        });
        const $ = cheerio.load(res.data, { xmlMode: true });
        $('item').each((i, el) => {
            if (i >= 3) return false;
            console.log(`${i + 1}. ${$(el).find('title').text().trim()}`);
        });
    } catch (e) {
        console.error('News error:', e.message);
    }
}

async function run() {
    await testTRM();
    await testWeather();
    await testNews();
}

run();