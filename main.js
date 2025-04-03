const express = require('express');
const fs = require('fs');
const axios = require('axios');
const WebSocket = require('ws');
const formdata = require('form-data');

require('dotenv').config();

const app = express();
const url = 'wss://google-sdxl.hf.space/queue/join';

app.use(express.json());

app.get('/', (req, res) => {
    res.send('Hello World!');
});

app.post('/generate', async (req, res) => {
    const { prompt, negativePrompt,guidancescale,style } = req.body;
    const Json = await genimage(prompt, negativePrompt,guidancescale,style);
    console.log(Json);
    res.send(Json);
});

app.post('/generate/stream', async (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Transfer-Encoding', 'chunked');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('Cache-Control', 'no-cache');
    
    const { prompt, negativePrompt, guidancescale, style } = req.body;
    
    genimagestream(prompt, negativePrompt, guidancescale, style, (data) => {
        try {
            res.write(JSON.stringify(data) + '\n');
            if (data.success === true || data.success === false) {
                res.end();
            }
        } catch (error) {
            console.error('Error writing to stream:', error);
            res.end();
        }
    });
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
                resolve({success: false,data:'Queue full'});
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
                        saveBase64Image(image, filePath);
                    });
                    resolve({success: true, data: images});
                }else{
                    resolve({success: false,data:message.output.error});
                }
            }
        });

        ws.on('close', () => {
            console.log('WebSocket connection closed');
        });

        ws.on('error', (err) => {
            console.error('WebSocket error:', err);
            resolve({success: false,data:err});
        });
    });
}

async function genimagestream(prompt, negativePrompt = "", guidancescale = 7.5, style = "(No style)",senddata) {
    const sesionhash = generateSessionHash();
        const ws = new WebSocket(url);
        ws.on('open', () => {
            console.log('Connected to WebSocket server');
            senddata('Image generation started');
        });

        ws.on('message', async (data) => {
            console.log('Received:', data.toString());
            const message = JSON.parse(data.toString());
            if (message.msg === 'send_hash') {
                ws.send(JSON.stringify({ "fn_index": 3, "session_hash": sesionhash }));
                console.log({ "fn_index": 3, "session_hash": sesionhash })
            }
            if (message.msg === 'queue_full') {
                console.log('Queue full');
                ws.close();
                senddata('Queue full Retrying...');
                genimagestream(prompt, negativePrompt, guidancescale, style,senddata);
                return;
            }
            if (message.msg === 'send_data') {
                const data = { "data": [prompt, negativePrompt, guidancescale, style], "event_data": null, "fn_index": 3, "session_hash": sesionhash };
                ws.send(JSON.stringify(data));
                console.log(data);
            }
            if (message.msg === 'process_completed') {
                if(message.success){
                    const images = message.output.data[0];
                    const imageurls = [];
                    for (let index = 0; index < images.length; index++) {
                        const image = images[index];
                        const url = await hostimage(image);
                        imageurls.push(url);
                    }
                    // resolve({success: true, data: images});
                    senddata({success: true,urls:imageurls, data: imageurls});
                }else{
                    // resolve({success: false,data:message.output.error});
                    senddata({success: false,data:message.output.error});
                }
            }
            if(message.msg === 'estimation'){
                senddata(`Ranking: ${message.rank}`);
            }
            if(message.msg === 'process_starts'){
                senddata(`Image generation Process started`);
            }
        });

        ws.on('close', () => {
            console.log('WebSocket connection closed');
        });

        ws.on('error', (err) => {
            console.error('WebSocket error:', err);
            // resolve({success: false,data:err});
            senddata({success: false,data:err});
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

async function hostimage(base64Data) {
    // Base64 string might already be clean or might need cleaning
    const base64String = base64Data.includes('data:image')
        ? base64Data.replace(/^data:image\/[a-z]+;base64,/, '')
        : base64Data;
        
    try {
        const urlpost = `https://api.imgbb.com/1/upload?expiration=600&key=${process.env.IMGBB_API_KEY}`;
        const form = new formdata();
        form.append('image', base64String); // Send the base64 string directly, not as buffer
        
        const upload = await axios.post(urlpost, form, {
            headers: {
                'Content-Type': `multipart/form-data; boundary=${form._boundary}`
            }
        });
        
        console.log('Image uploaded successfully');
        return upload.data.data.url;
    } catch(err) {
        console.error('Error uploading image:', err.message);
        if (err.response) {
            console.error('Response data:', err.response.data);
        }
        return null;
    }
}




const port = 3000;
app.listen(port, () => console.log(`Server listening on port ${port}`));

