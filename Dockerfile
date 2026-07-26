# --- Stage 1: Build the React frontend -------------------------------------
FROM node:20-alpine AS frontend-build
WORKDIR /frontend

# `npm ci` installs exactly what the lockfile pins, so an image build cannot
# quietly pick up a different dependency tree than the one that was tested.
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci

COPY frontend/ ./
RUN npm run build

# --- Stage 2: Build and publish the API ------------------------------------
FROM mcr.microsoft.com/dotnet/sdk:10.0 AS backend-build
WORKDIR /src

COPY backend/*.csproj ./
RUN dotnet restore

COPY backend/ ./
RUN dotnet publish -c Release -o /app/publish --no-restore

# --- Stage 3: Runtime image ------------------------------------------------
FROM mcr.microsoft.com/dotnet/aspnet:10.0
WORKDIR /app

ENV ASPNETCORE_URLS=http://+:8080 \
    ASPNETCORE_ENVIRONMENT=Production
EXPOSE 8080

COPY --from=backend-build /app/publish ./
# The compiled SPA becomes the API's static content, so one origin serves both.
COPY --from=frontend-build /frontend/dist ./wwwroot

# /data is a mounted volume (see fly.toml). The SQLite database and every user
# upload live here so that redeploying the image does not wipe them; this is
# also why uploads are no longer written under wwwroot.
RUN mkdir -p /data/uploads
VOLUME ["/data"]

# Lets the platform restart the machine when the app stops answering.
HEALTHCHECK --interval=30s --timeout=3s --start-period=20s \
  CMD wget -qO- http://localhost:8080/health || exit 1

ENTRYPOINT ["dotnet", "findajob.dll"]
