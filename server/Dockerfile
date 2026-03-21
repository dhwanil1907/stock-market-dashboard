FROM node:18-slim

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .
RUN npm run build || true 

EXPOSE 3001

CMD ["npm", "run", "dev"]
