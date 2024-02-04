const express = require('express');
const bodyParser = require('body-parser');
const puppeteer = require('puppeteer');
const fs = require('fs');
const imageValid = require('valid-jpeg');
const axios = require('axios');
const FormData = require('form-data');

//require('dotenv').config();

const app = express();

app.use(bodyParser.json());

app.post('/generate', async (req, res) => {
    const { prompt, negativePrompt } = req.body;
    const Json = await genimage(prompt, negativePrompt);
    console.log(Json);
    res.send(Json);
});

async function genimage(prompt, negativePrompt) {
    const browser = await puppeteer.launch({
        executablePath: "/usr/bin/google-chrome",
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
        headless: 'new'
    });
    const page = await browser.newPage();
    await page.setRequestInterception(true);

    page.on('request', (request) => {
        request.continue();
    });

    var filename = generateRandomFilename('png');
    page.on('response', async (response) => {
        if (response.url().includes('data:image')) {
            fs.writeFileSync("images/" + filename, await response.buffer());
        }
    });
    try{
    await page.goto('https://google-sdxl.hf.space');
    await page.setViewport({ width: 1480, height: 1100 });
    await page.waitForSelector('input[placeholder="Enter your prompt"]');
    await page.type('input[placeholder="Enter your prompt"]', prompt);
    await new Promise(r => setTimeout(r, 3000));
    await page.click('#component-11 > button');
    await page.waitForSelector('input[placeholder="Enter a negative prompt"]');
    await page.type('input[placeholder="Enter a negative prompt"]', negativePrompt);
    await page.screenshot({ path: 'examplebutton.png' });
    await page.waitForSelector('button[id="gen-button"]');
    await page.click('button[id="gen-button"]');
    await new Promise(r => setTimeout(r, 10000));
    await page.waitForSelector('#gallery > div.grid-wrap.svelte-vg7mqq.fixed-height > div > div > button');
    await page.click('#gallery > div.grid-wrap.svelte-vg7mqq.fixed-height > div > div > button');
    await new Promise(r => setTimeout(r, 5000));
    await page.screenshot({ path: 'example.png' });
    await browser.close();
    }catch(e){
        console.log(e);
    }
    

    return new Promise((resolve) => {
        imageValid.isValid("images/" + filename, (err, valid) => {
            if (err) {
                console.log(err);
                resolve(JSON.stringify({ valid: false, error: err }));
            }
            if (valid) {
                let api_key = process.env.IMAGE_API_KEY;
                let filePath = "images/" + filename;
                let form = new FormData();
                form.append('image', fs.createReadStream(filePath));
                axios.post(`https://api.imgbb.com/1/upload?expiration=600&key=def305376dfbdfa1d27cccebdb296bfa`, form, {
                    headers: form.getHeaders()
                })
                .then(response => {
                    console.log(response.data);
                    let data = JSON.stringify(response.data);
                    let image_url = JSON.parse(data).data.url;
                    console.log(image_url);
                    resolve(JSON.stringify({ valid: true, ImageUrl: image_url }));
                })
                .catch(error => {
                    resolve(JSON.stringify({ valid: false, error: error }));
                });
            } else {
                resolve(JSON.stringify({ valid: false, error: "invalid image" }));
            }
        });
    });
}

function generateRandomFilename(extension) {
    return Math.random().toString(36).substring(2, 15) + Date.now().toString() + '.' + extension;
}

const port = 3000;
app.listen(port, () => console.log(`Server listening on port ${port}`));
