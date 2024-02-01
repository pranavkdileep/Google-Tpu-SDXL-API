const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');
const { createWriteStream } = require('fs');
const { pipeline } = require('stream');
const { promisify } = require('util');
const streamPipeline = promisify(pipeline);


(async () => {
	const browser = await puppeteer.launch({
        headless: 'new'
    });
	const page = await browser.newPage();
    await page.setRequestInterception(true);
    
    
  page.on('request', (request) => {
    request.continue();
  });

  
  page.on('response', async (response) => {
    if(response.url().includes('data:image')) {
      fs.writeFileSync("image.png", await response.buffer());
    }
  });

	await page.goto('https://google-sdxl.hf.space');
    await page.setViewport({ width: 1480, height: 1100 });
    await page.waitForSelector('input[placeholder="Enter your prompt"]');
    await page.type('input[placeholder="Enter your prompt"]', 'digital wallpaper portrait of brutal cyberpunk samurai, anime, in the style of marvel comics, dark, muted colors, brutal epic composition, dramatic, digital painting, very intricate');
    await new Promise(r => setTimeout(r, 3000));
    await page.click('#component-11 > button');
    await page.waitForSelector('input[placeholder="Enter a negative prompt"]');
    await page.type('input[placeholder="Enter a negative prompt"]', 'bad animation');
    await page.screenshot({ path: 'examplebutton.png' });
    await page.waitForSelector('button[id="gen-button"]');
    await page.click('button[id="gen-button"]');
    await new Promise(r => setTimeout(r, 10000));
    await page.waitForSelector('#gallery > div.grid-wrap.svelte-vg7mqq.fixed-height > div > div > button');
    await page.click('#gallery > div.grid-wrap.svelte-vg7mqq.fixed-height > div > div > button');
    await new Promise(r => setTimeout(r, 10000));
	await page.screenshot({ path: 'example.png' });
    await browser.close();
    

})();