FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
ENV VITE_API_URL=/api/v1/
RUN npm run build

FROM nginxinc/nginx-unprivileged:1.29-alpine
# Exposes the pod's DNS servers as ${NGINX_LOCAL_RESOLVERS} for the template.
ENV NGINX_ENTRYPOINT_LOCAL_RESOLVERS=1
COPY deploy/nginx.conf.template /etc/nginx/templates/default.conf.template
COPY --chmod=755 deploy/15-api-proxy-env.envsh /docker-entrypoint.d/
COPY --from=build /app/dist /usr/share/nginx/html
