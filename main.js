const express = require('express');
const fs = require('fs');
const axios = require('axios');
const WebSocket = require('ws');

require('dotenv').config();

const app = express();
const url = 'wss://google-sdxl.hf.space/queue/join';

app.use(express.json());

app.post('/generate', async (req, res) => {
    const { prompt, negativePrompt } = req.body;
    const Json = await genimage(prompt, negativePrompt);
    console.log(Json);
    res.send(Json);
});

async function genimage(prompt, negativePrompt = "", guidancescale = 7.5, style = "(No style)") {
    const sesionhash = generateSessionHash();
    return new Promise((resolve, reject) => {
        const ws = new WebSocket(url);
        ws.on('open', () => {
            console.log('Connected to WebSocket server');
        });

        ws.on('message', (data) => {
            console.log('Received:', data.toString());
            const message = JSON.parse(data.toString());
            if (message.msg === 'send_hash') {
                ws.send(JSON.stringify({ "fn_index": 3, "session_hash": sesionhash }));
                console.log({ "fn_index": 3, "session_hash": sesionhash })
            }
            if (message.msg === 'queue_full') {
                console.log('Queue full');
                ws.close();
                reject('Queue full');
            }
            if (message.msg === 'send_data') {
                const data = { "data": [prompt, negativePrompt, guidancescale, style], "event_data": null, "fn_index": 3, "session_hash": sesionhash };
                ws.send(JSON.stringify(data));
                console.log(data);
            }
            if (message.msg === 'process_completed') {
                if(message.success){
                    const images = message.output.data[0];
                    images.forEach((image, index) => {
                        const filePath = `./images/image_${index}.jpg`;
                        //saveBase64Image(image, filePath);
                    });
                }else{
                    reject(message.output.error);
                }
            }
        });

        ws.on('close', () => {
            console.log('WebSocket connection closed');
        });

        ws.on('error', (err) => {
            console.error('WebSocket error:', err);
        });
    });
}

function generateSessionHash(length = 10) {
    const characters = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
        result += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    return result;
}

function saveBase64Image(base64Data, filePath) {
    const base64String = base64Data.replace(/^data:image\/jpeg;base64,/, '');
    const imageBuffer = Buffer.from(base64String, 'base64');
    fs.writeFile(filePath, imageBuffer, (err) => {
        if (err) {
            console.error('Error saving image:', err);
        } else {
            console.log('Image saved successfully:', filePath);
        }
    });
}


// const port = 3000;
// app.listen(port, () => console.log(`Server listening on port ${port}`));


genimage("A serious capybara at work, wearing a suit").then(console.log).catch(console.error);