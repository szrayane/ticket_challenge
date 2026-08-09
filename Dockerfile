FROM node:22-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
ARG VITE_APP_API_URL=http://localhost:3333/api
ARG VITE_CINEMA_API_URL=https://mock-api.driven.com.br/api/v8/cineflex
ENV VITE_APP_API_URL=$VITE_APP_API_URL
ENV VITE_CINEMA_API_URL=$VITE_CINEMA_API_URL
RUN npm run build

FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
