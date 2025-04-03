FROM node:slim AS app



WORKDIR /app

COPY . /app

RUN mkdir -p /app/images && chown -R node:node /app/images
RUN npm install

EXPOSE 3000

CMD ["npm", "start"]
