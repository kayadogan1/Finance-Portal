FROM maven:3.9.9-eclipse-temurin-21 AS builder

WORKDIR /build

COPY pom.xml .
COPY news-service/pom.xml ./news-service/

RUN mvn -f news-service/pom.xml dependency:go-offline -B

COPY news-service/src ./news-service/src

RUN mvn -f news-service/pom.xml clean package -DskipTests -B

FROM eclipse-temurin:21-jre-alpine

RUN adduser -S appuser

WORKDIR /app

COPY keycloak/conf/keycloak.crt /tmp/keycloak.crt
RUN keytool -importcert -file /tmp/keycloak.crt -alias keycloak-final -cacerts -storepass changeit -noprompt

COPY --from=builder --chown=appuser /build/news-service/target/*.jar app.jar

USER appuser

EXPOSE 8082

CMD ["java", "-XX:+UseContainerSupport", "-XX:MaxRAMPercentage=75.0", "-jar", "app.jar"]