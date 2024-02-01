
# Google-Tpu-SDXL-API

An Unofficial Api For Googles SDXL TPU v5 PlayGround On HuggingFace



## API Reference

#### Get all items

```http
  POST http://localhost:3000/generate
```

| Parameter | Type     | Description                |
| :-------- | :------- | :------------------------- |
| `prompt` | `string` | **Required**. Your Prompt |
| `negativePrompt` | `string` | **Required**. Your Negative Prompt |


## Screenshots

![App Screenshot](https://github.com/pranavkdileep/Google-Tpu-SDXL-API/blob/main/docs/Screenshot%20from%202024-02-01%2021-48-45.png?raw=true)


## Installation

Install my-project with Docker

```bash
  git clone https://github.com/pranavkdileep/Google-Tpu-SDXL-API
  cd Google-Tpu-SDXL-API
  docker build --pull --rm -f "Dockerfile" -t googletpusdxlapi:latest "."
  docker run --rm -it -p 3000:3000/tcp googletpusdxlapi:latest
```
    
## License

[MIT](https://choosealicense.com/licenses/mit/)

