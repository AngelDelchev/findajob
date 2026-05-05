# --- Stage 1: Build Frontend ---
FROM node:20-alpine AS frontend-build
WORKDIR /frontend
COPY frontend/package*.json ./
RUN npm install
COPY frontend/ ./
RUN npm run build

# --- Stage 2: Build Backend ---
FROM mcr.microsoft.com/dotnet/sdk:10.0 AS backend-build
WORKDIR /backend
COPY backend/*.csproj ./
RUN dotnet restore
COPY backend/ ./
RUN dotnet publish -c Release -o /app/publish

# --- Stage 3: Final Production Image ---
FROM mcr.microsoft.com/dotnet/aspnet:10.0
WORKDIR /app

# Ensure data directory exists for SQLite persistence
RUN mkdir -p /app/data
ENV ASPNETCORE_URLS=http://+:8080
EXPOSE 8080

COPY --from=backend-build /app/publish .
# Copy frontend build to the backend's wwwroot folder
# This allows .NET to serve the React app as static files
COPY --from=frontend-build /frontend/dist ./wwwroot

ENTRYPOINT ["dotnet", "findajob.dll"]
