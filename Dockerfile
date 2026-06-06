FROM node:18-alpine

WORKDIR /app

COPY backend/package*.json ./backend/
RUN cd backend && npm install --production

COPY backend ./backend

WORKDIR /app/backend
RUN mkdir -p uploads

EXPOSE 3000

CMD ["node", "app.js"]
