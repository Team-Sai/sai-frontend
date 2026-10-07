# 1단계: 빌드 (CI와 같은 Node 22 사용)
FROM node:22-alpine AS builder

WORKDIR /app

# 의존성 파일을 먼저 복사해서, 소스만 바뀌었을 때는 npm ci를 다시 하지 않게 한다
COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build


# 2단계: 실행 (빌드 결과물만 Nginx에 담는다. Node는 들어가지 않는다)
FROM nginx:stable-alpine

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80