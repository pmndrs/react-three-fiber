FROM node:18-alpine

WORKDIR /app

RUN apk add --no-cache git

COPY package.json yarn.lock ./

COPY packages/fiber/package.json ./packages/fiber/
COPY packages/eslint-plugin/package.json ./packages/eslint-plugin/
COPY packages/test-renderer/package.json ./packages/test-renderer/
COPY example/package.json ./example/

RUN yarn install --frozen-lockfile --ignore-scripts

COPY . .

RUN yarn postinstall

RUN yarn build

EXPOSE 5173

CMD ["yarn", "examples", "--", "--host"]
