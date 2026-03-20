FROM node:20-alpine AS builder

WORKDIR /app

# Build-time SEO and config variables (VITE_ vars are baked into the JS bundle)
ARG VITE_SITE_NAME="Auto Québec"
ARG VITE_DOMAIN="auto.canadaquebec.ca"
ARG VITE_GTM_ID=""
ARG VITE_BACKEND_URL=""

ENV VITE_SITE_NAME=$VITE_SITE_NAME
ENV VITE_DOMAIN=$VITE_DOMAIN
ENV VITE_GTM_ID=$VITE_GTM_ID
ENV VITE_BACKEND_URL=$VITE_BACKEND_URL

COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 3000
CMD ["nginx", "-g", "daemon off;"]
