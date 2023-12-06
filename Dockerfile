FROM node:18-alpine
WORKDIR /usr/src/app
COPY ./package*.json ./
RUN npm i
COPY . .
CMD [ "node", "main.js"]