FROM eclipse-temurin:21-jre

WORKDIR /app
COPY target/bin/gateway.jar gateway.jar
COPY entrypoint.sh entrypoint.sh
RUN chmod +x entrypoint.sh

EXPOSE 9000
ENTRYPOINT ["./entrypoint.sh"]
