FROM node:boron
WORKDIR /usr/src/app
COPY package.json .
RUN npm install
COPY queries/ ./queries/
COPY views/ ./views/
COPY public/ ./public/
COPY app.js .
COPY websitetitle.js .
EXPOSE 6099
CMD [ "node", "app.js" ]
