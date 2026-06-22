FROM node:20-alpine
WORKDIR /app
COPY  package*.json ./
RUN npm i
ENV URL_DATABASE="mongodb+srv://gabrielrodrigueslima22_db_user:99897792Gb@portifolio.dgso1f2.mongodb.net/?appName=portifolio"
COPY  . .
EXPOSE 3000
CMD [ "node", "start" ]
