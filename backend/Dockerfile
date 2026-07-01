# ---------------------------------------------------------------------------
# Stage 1: build the SourceAFIS fingerprint matcher fat-jar
# ---------------------------------------------------------------------------
FROM maven:3.9-eclipse-temurin-21 AS matcher-build
WORKDIR /matcher
COPY fingerprint-matcher/pom.xml ./pom.xml
# Pre-fetch dependencies (cached layer) then build.
RUN mvn -q -e dependency:go-offline || true
COPY fingerprint-matcher/src ./src
RUN mvn -q -e package

# ---------------------------------------------------------------------------
# Stage 2: runtime — Node backend + JRE to run the matcher jar
# ---------------------------------------------------------------------------
FROM node:20-bookworm-slim

ENV DEBIAN_FRONTEND=noninteractive \
    NODE_ENV=production \
    PORT=3001 \
    FINGERPRINT_MATCHER_JAR=/app/fingerprint-matcher.jar

# A headless JRE is all the runtime needs to run the shaded matcher jar.
# No USB/libfprint stack anymore: the reader now lives in the user's browser
# (DigitalPersona WebSDK); the server only extracts/matches templates.
RUN apt-get update && apt-get install -y --no-install-recommends \
      default-jre-headless ca-certificates \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package*.json ./
RUN npm install --include=dev

COPY tsconfig.json ./
COPY src ./src
COPY certs ./certs

RUN npm run build && npm prune --omit=dev

# Bring in the matcher jar built in stage 1.
COPY --from=matcher-build /matcher/target/fingerprint-matcher.jar /app/fingerprint-matcher.jar

EXPOSE 3001

CMD ["node", "dist/server.js"]
