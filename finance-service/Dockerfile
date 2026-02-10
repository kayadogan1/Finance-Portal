FROM maven:3.9.9-eclipse-temurin-21 AS builder

WORKDIR /build

COPY pom.xml .

COPY finance-service/pom.xml ./finance-service/

RUN mvn -f finance-service/pom.xml dependency:go-offline -B

COPY finance-service/src ./finance-service/src

RUN mvn -f finance-service/pom.xml clean package -DskipTests -B

FROM eclipse-temurin:21-jre-alpine

RUN adduser -S appuser

WORKDIR /app

COPY --from=builder /build/finance-service/target/*.jar app.jar
RUN chown appuser app.jar

USER appuser

EXPOSE 8081

CMD ["java", "-XX:+UseContainerSupport", "-XX:MaxRAMPercentage=75.0", "-jar", "app.jar"]