# Stage 1: Build the JAR using Maven and Java 21
FROM maven:3.9-eclipse-temurin-21 AS builder
WORKDIR /app

# Copy project definition and source code
COPY pom.xml .
COPY src ./src

# Build the executable jar without running tests
RUN mvn clean package -DskipTests

# Stage 2: Run the JAR on a slim JRE 21 image
FROM eclipse-temurin:21-jre-alpine
WORKDIR /app

# Copy the packaged jar from the builder stage
COPY --from=builder /app/target/*.jar app.jar

# Set default port and expose it
ENV PORT=8080
EXPOSE 8080

# Run the Spring Boot application
ENTRYPOINT ["java", "-jar", "app.jar"]
