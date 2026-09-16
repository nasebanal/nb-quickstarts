FROM node:22.23.2-slim

WORKDIR /app

# The npm bundled with this base image has a dependency-resolution bug
# (npm error: Cannot read properties of null (reading 'edgesOut')) that
# trips on this project's dependency graph; a newer npm doesn't have it.
RUN npm install -g npm@11

COPY package.json ./
RUN npm install

COPY . .

EXPOSE 5173

CMD ["npm", "run", "dev"]
