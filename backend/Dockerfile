# Étape 1 : Build Maven
FROM maven:3.9-eclipse-temurin-22 AS build
WORKDIR /app

# Copier le pom.xml en premier pour profiter du cache des dépendances
COPY pom.xml .
RUN mvn dependency:go-offline --no-transfer-progress

# Copier les sources et compiler
COPY src ./src
RUN mvn package -DskipTests --no-transfer-progress

# Étape 2 : Image de runtime minimale
FROM eclipse-temurin:22-jre-alpine
WORKDIR /app

RUN addgroup -S spring && adduser -S spring -G spring \
    && mkdir -p /var/log/openbar/backend \
    && chown -R spring:spring /var/log/openbar /app

COPY --from=build /app/target/*.jar app.jar
RUN chown spring:spring /app/app.jar

USER spring:spring

EXPOSE 8080

ENTRYPOINT ["java", "-jar", "app.jar"]
