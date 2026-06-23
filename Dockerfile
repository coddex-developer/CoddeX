FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY . .
EXPOSE 3000
# As variáveis de ambiente (MONGODB_URI, SECRET_KEY, ADMIN_USER, ADMIN_PASS, etc.)
# devem ser fornecidas em tempo de execução via --env-file ou docker-compose,
# NUNCA escritas no Dockerfile.
CMD ["npm", "start"]
