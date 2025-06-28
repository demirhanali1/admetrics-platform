FROM node:20-slim

WORKDIR /app

COPY package*.json tsconfig.json ./

RUN npm install

COPY . .

CMD ["npx", "ts-node", "src/index.ts"]
