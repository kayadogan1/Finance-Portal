FROM maven:3.9.9-eclipse-temurin-21 AS builder

WORKDIR /build

COPY pom.xml .

COPY api-gateway/pom.xml ./api-gateway/

RUN mvn -f api-gateway/pom.xml dependency:go-offline -B

COPY api-gateway/src ./api-gateway/src

RUN mvn -f api-gateway/pom.xml clean package -DskipTests -B


FROM eclipse-temurin:21-jre-alpine

COPY keycloak/conf/keycloak.crt /tmp/keycloak.crt
RUN keytool -importcert -file /tmp/keycloak.crt -alias keycloak-final -cacerts -storepass changeit -noprompt

RUN adduser -S appuser

WORKDIR /app

COPY --from=builder --chown=appuser /build/api-gateway/target/*.jar app.jar

USER appuser

EXPOSE 8080

CMD ["java", "-XX:+UseContainerSupport", "-XX:MaxRAMPercentage=75.0", "-jar", "app.jar"]