export interface DockerLayer {
  layer: string;
  size: string;
  description: string;
}

type TechStack =
  | "node"
  | "python"
  | "go"
  | "java"
  | "rust"
  | "php"
  | "ruby"
  | "default";

function detectStack(
  language: string | null,
  topics: string[],
  fileTree: string[],
): TechStack {
  const lang = (language || "").toLowerCase();
  const files = fileTree.map((f) => f.toLowerCase());
  const topicsLower = topics.map((t) => t.toLowerCase());

  if (
    lang === "typescript" ||
    lang === "javascript" ||
    files.some((f) => f === "package.json") ||
    topicsLower.includes("nodejs") ||
    topicsLower.includes("node")
  )
    return "node";

  if (
    lang === "python" ||
    files.some(
      (f) =>
        f === "requirements.txt" || f === "pyproject.toml" || f === "setup.py",
    ) ||
    topicsLower.includes("python")
  )
    return "python";

  if (
    lang === "go" ||
    files.some((f) => f === "go.mod") ||
    topicsLower.includes("golang")
  )
    return "go";

  if (
    lang === "java" ||
    files.some((f) => f === "pom.xml" || f === "build.gradle") ||
    topicsLower.includes("java") ||
    topicsLower.includes("spring")
  )
    return "java";

  if (
    lang === "rust" ||
    files.some((f) => f === "cargo.toml") ||
    topicsLower.includes("rust")
  )
    return "rust";

  if (lang === "php" || files.some((f) => f === "composer.json")) return "php";
  if (lang === "ruby" || files.some((f) => f === "gemfile")) return "ruby";
  return "default";
}

function lines(...parts: string[]): string {
  return parts.join("\n");
}

export function generateDockerfile(
  repoName: string,
  language: string | null,
  topics: string[],
  fileTree: string[],
): string {
  const stack = detectStack(language, topics, fileTree);
  const appName = repoName.split("/").pop() || "app";

  switch (stack) {
    case "node": {
      const isTs =
        (language || "").toLowerCase() === "typescript" ||
        fileTree.some((f) => f.endsWith("tsconfig.json"));
      const entrypoint = isTs ? "dist/index.js" : "index.js";
      const copyLine = isTs ? "COPY --from=build /app/dist ./dist" : "COPY . .";
      const buildStage = isTs
        ? lines(
            "FROM base AS build",
            "COPY package*.json ./",
            "RUN npm ci",
            "COPY . .",
            "RUN npm run build",
          )
        : "";
      return lines(
        "# syntax=docker/dockerfile:1",
        "FROM node:20-alpine AS base",
        "WORKDIR /app",
        "",
        "# Install dependencies",
        "FROM base AS deps",
        "COPY package*.json ./",
        "RUN npm ci --only=production",
        "",
        `# Build stage${buildStage ? `\n${buildStage}` : ""}`,
        "",
        "# Production image",
        "FROM base AS runner",
        "ENV NODE_ENV=production",
        "",
        "RUN addgroup --system --gid 1001 nodejs",
        "RUN adduser --system --uid 1001 nextjs",
        "",
        "COPY --from=deps /app/node_modules ./node_modules",
        copyLine,
        "USER nextjs",
        "EXPOSE 3000",
        "ENV PORT=3000",
        'ENV HOSTNAME="0.0.0.0"',
        "",
        `CMD ["node", "${entrypoint}"]`,
      );
    }

    case "python": {
      const hasFastapi =
        topics.some((t) => t.toLowerCase().includes("fastapi")) ||
        fileTree.some((f) => f.toLowerCase().includes("fastapi"));
      const cmd = hasFastapi
        ? 'CMD ["python", "-m", "uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]'
        : 'CMD ["python", "-m", "flask", "run", "--host=0.0.0.0", "--port=8000"]';
      return lines(
        "# syntax=docker/dockerfile:1",
        "FROM python:3.11-slim AS base",
        "WORKDIR /app",
        "",
        "# Install system dependencies",
        "RUN apt-get update && apt-get install -y \\",
        "    gcc \\",
        "    && rm -rf /var/lib/apt/lists/*",
        "",
        "# Install Python dependencies",
        "COPY requirements*.txt ./",
        "RUN pip install --no-cache-dir -r requirements.txt",
        "",
        "# Copy application code",
        "COPY . .",
        "",
        "# Create non-root user",
        "RUN useradd --create-home appuser && chown -R appuser /app",
        "USER appuser",
        "",
        "EXPOSE 8000",
        "",
        cmd,
      );
    }

    case "go":
      return lines(
        "# syntax=docker/dockerfile:1",
        "FROM golang:1.21-alpine AS builder",
        "WORKDIR /app",
        "",
        "# Download dependencies",
        "COPY go.mod go.sum ./",
        "RUN go mod download",
        "",
        "# Build the binary",
        "COPY . .",
        `RUN CGO_ENABLED=0 GOOS=linux go build -ldflags="-s -w" -o /app/${appName} ./...`,
        "",
        "# Minimal runtime image",
        "FROM gcr.io/distroless/base-debian12 AS runner",
        "WORKDIR /app",
        "",
        `COPY --from=builder /app/${appName} ./${appName}`,
        "",
        "EXPOSE 8080",
        "",
        "USER nonroot:nonroot",
        `CMD ["./${appName}"]`,
      );

    case "java": {
      const isMaven = fileTree.some((f) => f.toLowerCase() === "pom.xml");
      const buildBlock = isMaven
        ? lines(
            "# Maven build",
            "COPY mvnw pom.xml ./",
            "COPY .mvn .mvn",
            "RUN chmod +x ./mvnw && ./mvnw dependency:go-offline -B",
            "COPY src ./src",
            "RUN ./mvnw package -DskipTests",
          )
        : lines(
            "# Gradle build",
            "COPY gradlew build.gradle ./",
            "COPY gradle gradle",
            "RUN chmod +x ./gradlew && ./gradlew dependencies",
            "COPY src ./src",
            "RUN ./gradlew bootJar -x test",
          );
      return lines(
        "# syntax=docker/dockerfile:1",
        "FROM eclipse-temurin:17-jdk-alpine AS builder",
        "WORKDIR /app",
        "",
        buildBlock,
        "",
        "# Production image",
        "FROM eclipse-temurin:17-jre-alpine AS runner",
        "WORKDIR /app",
        "",
        "RUN addgroup -S appgroup && adduser -S appuser -G appgroup",
        "COPY --from=builder /app/target/*.jar app.jar",
        "USER appuser",
        "",
        "EXPOSE 8080",
        "",
        'ENTRYPOINT ["java", "-jar", "app.jar"]',
      );
    }

    case "rust":
      return lines(
        "# syntax=docker/dockerfile:1",
        "FROM rust:1.73-alpine AS builder",
        "WORKDIR /app",
        "",
        "RUN apk add --no-cache musl-dev",
        "",
        "# Cache dependencies",
        "COPY Cargo.toml Cargo.lock ./",
        "RUN mkdir src && echo 'fn main() {}' > src/main.rs",
        "RUN cargo build --release && rm -rf src",
        "",
        "# Build actual binary",
        "COPY . .",
        "RUN touch src/main.rs && cargo build --release",
        "",
        "# Minimal runtime",
        "FROM debian:bookworm-slim AS runner",
        "WORKDIR /app",
        "",
        "RUN apt-get update && apt-get install -y ca-certificates && rm -rf /var/lib/apt/lists/*",
        "RUN useradd --create-home appuser",
        "",
        `COPY --from=builder /app/target/release/${appName} /usr/local/bin/${appName}`,
        "USER appuser",
        "",
        "EXPOSE 8080",
        `CMD ["${appName}"]`,
      );

    case "php":
      return lines(
        "# syntax=docker/dockerfile:1",
        "FROM php:8.2-fpm-alpine AS base",
        "WORKDIR /var/www/html",
        "",
        "# Install extensions",
        "RUN docker-php-ext-install pdo pdo_mysql",
        "",
        "# Install Composer",
        "COPY --from=composer:2 /usr/bin/composer /usr/bin/composer",
        "",
        "COPY composer*.json ./",
        "RUN composer install --no-interaction --no-dev --optimize-autoloader",
        "",
        "COPY . .",
        "RUN chown -R www-data:www-data /var/www/html",
        "",
        "EXPOSE 9000",
        'CMD ["php-fpm"]',
      );

    case "ruby":
      return lines(
        "# syntax=docker/dockerfile:1",
        "FROM ruby:3.2-alpine AS base",
        "WORKDIR /app",
        "",
        "RUN apk add --no-cache build-base postgresql-dev",
        "",
        "COPY Gemfile Gemfile.lock ./",
        "RUN bundle install --jobs 4 --retry 3",
        "",
        "COPY . .",
        "",
        "RUN adduser -D appuser && chown -R appuser /app",
        "USER appuser",
        "",
        "EXPOSE 3000",
        'CMD ["bundle", "exec", "rails", "server", "-b", "0.0.0.0"]',
      );

    default:
      return lines(
        "# syntax=docker/dockerfile:1",
        "FROM ubuntu:22.04 AS base",
        "WORKDIR /app",
        "",
        "# Install runtime dependencies",
        "RUN apt-get update && apt-get install -y \\",
        "    curl \\",
        "    wget \\",
        "    git \\",
        "    && rm -rf /var/lib/apt/lists/*",
        "",
        "# Copy application files",
        "COPY . .",
        "",
        "# Create non-root user",
        "RUN useradd --create-home appuser && chown -R appuser /app",
        "USER appuser",
        "",
        "EXPOSE 8080",
        "",
        "# Update CMD to match your application's start command",
        'CMD ["echo", "Update this CMD to start your application"]',
      );
  }
}

export function generateDockerCompose(
  repoName: string,
  language: string | null,
  topics: string[],
  fileTree: string[],
): string {
  const stack = detectStack(language, topics, fileTree);
  const appName = (repoName.split("/").pop() || "app")
    .replace(/[^a-z0-9-]/gi, "-")
    .toLowerCase();

  const portMap: Record<TechStack, string> = {
    node: "3000",
    python: "8000",
    go: "8080",
    java: "8080",
    rust: "8080",
    php: "9000",
    ruby: "3000",
    default: "8080",
  };
  const port = portMap[stack];

  const needsPostgres =
    fileTree.some(
      (f) =>
        f.toLowerCase().includes("postgres") ||
        f.toLowerCase().includes("database"),
    ) ||
    topics.some((t) =>
      ["postgres", "postgresql", "database", "db"].includes(t.toLowerCase()),
    );

  const needsRedis =
    fileTree.some((f) => f.toLowerCase().includes("redis")) ||
    topics.some((t) => t.toLowerCase() === "redis");

  const needsMongo =
    fileTree.some((f) => f.toLowerCase().includes("mongo")) ||
    topics.some((t) => t.toLowerCase().includes("mongo"));

  const dependsLines: string[] = [];
  if (needsPostgres) dependsLines.push("      - postgres");
  if (needsRedis) dependsLines.push("      - redis");
  if (needsMongo) dependsLines.push("      - mongodb");
  const dependsSection =
    dependsLines.length > 0
      ? `\n    depends_on:\n${dependsLines.join("\n")}`
      : "";

  const appService =
    lines(
      `  ${appName}:`,
      "    build:",
      "      context: .",
      "      dockerfile: Dockerfile",
      "    ports:",
      `      - "${port}:${port}"`,
      "    environment:",
      "      - NODE_ENV=development",
      "    volumes:",
      "      - .:/app",
      "      - /app/node_modules",
      "    restart: unless-stopped",
    ) + dependsSection;

  const serviceBlocks: string[] = [appService];

  if (needsPostgres) {
    serviceBlocks.push(
      lines(
        "  postgres:",
        "    image: postgres:15-alpine",
        "    environment:",
        `      - POSTGRES_DB=${appName}`,
        "      - POSTGRES_USER=postgres",
        "      - POSTGRES_PASSWORD=postgres",
        "    ports:",
        '      - "5432:5432"',
        "    volumes:",
        "      - postgres_data:/var/lib/postgresql/data",
        "    healthcheck:",
        '      test: ["CMD-SHELL", "pg_isready -U postgres"]',
        "      interval: 5s",
        "      timeout: 5s",
        "      retries: 5",
      ),
    );
  }

  if (needsRedis) {
    serviceBlocks.push(
      lines(
        "  redis:",
        "    image: redis:7-alpine",
        "    ports:",
        '      - "6379:6379"',
        "    healthcheck:",
        '      test: ["CMD", "redis-cli", "ping"]',
        "      interval: 5s",
        "      timeout: 5s",
        "      retries: 3",
      ),
    );
  }

  if (needsMongo) {
    serviceBlocks.push(
      lines(
        "  mongodb:",
        "    image: mongo:6",
        "    ports:",
        '      - "27017:27017"',
        "    volumes:",
        "      - mongo_data:/data/db",
      ),
    );
  }

  const volumeLines: string[] = [];
  if (needsPostgres) volumeLines.push("  postgres_data:");
  if (needsMongo) volumeLines.push("  mongo_data:");

  const header = lines(
    `# Docker Compose for ${repoName}`,
    "# Generated by GitHub AI Explorer",
    "",
    "version: '3.8'",
    "",
    "services:",
  );
  const servicesBlock = serviceBlocks.join("\n\n");
  const volumesBlock =
    volumeLines.length > 0 ? `\n\nvolumes:\n${volumeLines.join("\n")}` : "";

  return `${header}\n${servicesBlock}${volumesBlock}`;
}

export function analyzeDockerLayers(dockerfile: string): DockerLayer[] {
  const inputLines = dockerfile.split("\n").filter((l) => l.trim());
  const layers: DockerLayer[] = [];

  const instructionSizes: Record<string, string> = {
    FROM: "~50-200 MB",
    RUN: "~5-100 MB",
    COPY: "~1-50 MB",
    ADD: "~1-100 MB",
    ENV: "~0 MB",
    WORKDIR: "~0 MB",
    USER: "~0 MB",
    EXPOSE: "~0 MB",
    CMD: "~0 MB",
    ENTRYPOINT: "~0 MB",
    ARG: "~0 MB",
    LABEL: "~0 MB",
    VOLUME: "~0 MB",
    ONBUILD: "~0 MB",
    STOPSIGNAL: "~0 MB",
    HEALTHCHECK: "~0 MB",
    SHELL: "~0 MB",
  };

  const instructionDescriptions: Record<string, (line: string) => string> = {
    FROM: (l) => {
      const img = l
        .replace(/^FROM\s+/i, "")
        .split(/\s+AS\s+/i)[0]
        .trim();
      if (img.includes("alpine")) return `Minimal Alpine-based image: ${img}`;
      if (img.includes("slim")) return `Slim Debian-based image: ${img}`;
      if (img.includes("distroless")) return `Distroless runtime image: ${img}`;
      return `Base image: ${img}`;
    },
    RUN: (l) => {
      const cmd = l
        .replace(/^RUN\s+/i, "")
        .trim()
        .substring(0, 80);
      if (cmd.includes("apt-get") || cmd.includes("apk add"))
        return "Install system packages";
      if (cmd.includes("npm") || cmd.includes("yarn"))
        return "Install Node.js dependencies";
      if (cmd.includes("pip")) return "Install Python packages";
      if (cmd.includes("go mod") || cmd.includes("go build"))
        return "Go build step";
      if (cmd.includes("cargo")) return "Rust build step";
      if (cmd.includes("bundle")) return "Install Ruby gems";
      if (cmd.includes("composer")) return "Install PHP dependencies";
      if (cmd.includes("chmod") || cmd.includes("chown"))
        return "Set file permissions";
      if (cmd.includes("useradd") || cmd.includes("adduser"))
        return "Create application user";
      if (cmd.includes("rm -rf") || cmd.includes("clean"))
        return "Clean up cache/temp files";
      return `Run: ${cmd.substring(0, 60)}${cmd.length > 60 ? "..." : ""}`;
    },
    COPY: (l) => {
      const parts = l
        .replace(/^COPY\s+/i, "")
        .trim()
        .split(/\s+/);
      const from = parts[0];
      const to = parts[parts.length - 1];
      if (from === "--from=deps" || from === "--from=builder")
        return "Copy build artifacts from previous stage";
      if (from === "package*.json" || from === "package.json")
        return "Copy package manifest for layer caching";
      if (from === ".") return `Copy all source files to ${to}`;
      return `Copy ${from} to ${to}`;
    },
    ADD: (l) => {
      const parts = l
        .replace(/^ADD\s+/i, "")
        .trim()
        .split(/\s+/);
      return `Add ${parts[0]} to container`;
    },
    ENV: (l) =>
      `Set environment variable: ${l
        .replace(/^ENV\s+/i, "")
        .trim()
        .substring(0, 60)}`,
    WORKDIR: (l) =>
      `Set working directory: ${l.replace(/^WORKDIR\s+/i, "").trim()}`,
    USER: (l) => `Switch to user: ${l.replace(/^USER\s+/i, "").trim()}`,
    EXPOSE: (l) => `Expose port: ${l.replace(/^EXPOSE\s+/i, "").trim()}`,
    CMD: (l) =>
      `Default command: ${l
        .replace(/^CMD\s+/i, "")
        .trim()
        .substring(0, 60)}`,
    ENTRYPOINT: (l) =>
      `Container entrypoint: ${l
        .replace(/^ENTRYPOINT\s+/i, "")
        .trim()
        .substring(0, 60)}`,
    ARG: (l) => `Build argument: ${l.replace(/^ARG\s+/i, "").trim()}`,
    LABEL: () => "Image metadata label",
  };

  for (const line of inputLines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    const instruction = trimmed.split(/\s+/)[0].toUpperCase();
    if (!instructionSizes[instruction]) continue;

    const descFn = instructionDescriptions[instruction];
    const description = descFn ? descFn(trimmed) : trimmed.substring(0, 80);

    layers.push({
      layer: instruction,
      size: instructionSizes[instruction],
      description,
    });
  }

  return layers;
}
