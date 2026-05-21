FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src

# Убираем Windows-специфичные пути NuGet
ENV NUGET_FALLBACK_PACKAGES=""

COPY SewingStudio.API/SewingStudio.API.csproj SewingStudio.API/
RUN dotnet restore SewingStudio.API/SewingStudio.API.csproj

COPY SewingStudio.API/ SewingStudio.API/
WORKDIR /src/SewingStudio.API
RUN dotnet publish SewingStudio.API.csproj -c Release -o /app/publish

FROM mcr.microsoft.com/dotnet/aspnet:10.0
WORKDIR /app
COPY --from=build /app/publish .
EXPOSE 8080
ENTRYPOINT ["dotnet", "SewingStudio.API.dll"]