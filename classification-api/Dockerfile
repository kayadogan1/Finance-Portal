FROM maven:3.9.9-eclipse-temurin-21 AS builder

WORKDIR /build

COPY pom.xml .

COPY classification-api/pom.xml ./classification-api/

RUN mvn -f classification-api/pom.xml dependency:go-offline -B

COPY classification-api/src ./classification-api/src

RUN mvn -f classification-api/pom.xml clean package -DskipTests -B

FROM eclipse-temurin:21-jre-alpine

RUN adduser -S appuser

WORKDIR /app

COPY --from=builder --chown=appuser /build/classification-api/target/*.jar app.jar

USER appuser

EXPOSE 8081

CMD ["java", "-XX:+UseContainerSupport", "-XX:MaxRAMPercentage=75.0", "-jar", "app.jar"]