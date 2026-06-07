# Finance Portal

Finance Portal is a microservice-based finance application with market data, financial news, news classification, portfolio management, authentication/authorization, and observability support.

The main goal of this README is to run the application quickly with Docker, open the frontend, and inspect the services through Swagger.

## 1. How to Run the Application

The project runs with default Docker Compose values. Creating a separate `.env` file is not required.

Requirements:

- Docker Desktop or Docker Engine
- Docker Compose v2
- Git

Steps:

```bash
git clone https://github.com/kayadogan1/Finance-Portal
cd Finance-Portal
docker compose up -d --build
```

Check container status:

```bash
docker compose ps
```

On first startup, two bootstrap containers run briefly and then exit:

- `finance_postgres_bootstrap`: checks and creates `finance_db`, `news_db`, and `keycloak` databases when missing.
- `finance_keycloak_bootstrap`: enables registration, adds the default `USER` role mapping, and applies `USER` to existing users.

Seeing these containers as `Exited (0)` is expected; they complete their setup task and stop.

Open the homepage:

[http://localhost:5173](http://localhost:5173)

After the application starts, the first screen to check is the frontend homepage. Use the sign-in or registration flow from the top-right area to authenticate.

Stop the application:

```bash
docker compose down
```

Reset local development data:

```bash
docker compose down -v
docker compose up -d --build
```

## 2. Running Services and URLs

| Purpose | URL |
| --- | --- |
| Web application | [http://localhost:5173](http://localhost:5173) |
| API Gateway | [http://localhost:8080](http://localhost:8080) |
| Gateway Swagger | [http://localhost:8080/swagger-ui.html](http://localhost:8080/swagger-ui.html) |
| Finance Swagger | [http://localhost:8081/swagger-ui.html](http://localhost:8081/swagger-ui.html) |
| News Swagger | [http://localhost:8082/swagger-ui.html](http://localhost:8082/swagger-ui.html) |
| Classification Swagger | [http://localhost:8083/swagger-ui.html](http://localhost:8083/swagger-ui.html) |
| Classification Health | [http://localhost:8083/api/v1/news/health](http://localhost:8083/api/v1/news/health) |
| Keycloak | [http://localhost:9090](http://localhost:9090) |
| phpLDAPadmin | [http://localhost:8085](http://localhost:8085) |
| Kibana logs UI (EC2) | [http://63.177.252.23:5601](http://63.177.252.23:5601) |
| Grafana LGTM metrics/traces (EC2) | [http://63.177.252.23:3000](http://63.177.252.23:3000) |
| Elasticsearch health (EC2) | [http://63.177.252.23:9200](http://63.177.252.23:9200) |

Local Keycloak admin credentials:

```text
username: admin
password: admin
```

### How to Add an Admin User

To access the admin panel, news refresh/approval flow, and admin endpoints, the user must have the `ADMIN` role under the `finance-gateway-client` client.

Add it from the UI:

1. Open the Keycloak admin console at [http://localhost:9090](http://localhost:9090).
2. Log in with `admin / admin`.
3. Select the `FinancePortal` realm from the realm selector.
4. Open `Users` from the left menu and select the target user.
5. Go to the `Role mapping` tab.
6. Click `Assign role`.
7. Switch/filter to client roles and select `finance-gateway-client ADMIN`.
8. Click `Assign`.
9. Log out and log back in from the application.

Quick container-based method:

```bash
docker exec finance_keycloak /opt/keycloak/bin/kcadm.sh config credentials \
  --server http://localhost:8080 \
  --realm master \
  --user admin \
  --password admin

docker exec finance_keycloak /opt/keycloak/bin/kcadm.sh add-roles \
  -r FinancePortal \
  --uusername <username> \
  --cclientid finance-gateway-client \
  --rolename ADMIN
```

Example:

```bash
docker exec finance_keycloak /opt/keycloak/bin/kcadm.sh add-roles \
  -r FinancePortal \
  --uusername dodo \
  --cclientid finance-gateway-client \
  --rolename ADMIN
```

After the `ADMIN` role is assigned, the `Admin` menu appears in the frontend. From this page, provider status, admin metrics, instrument management, and news refresh/approval flows can be checked.

## 3. Container-Based Verification

This project is prepared to be evaluated and checked through containers. Running each service directly on the host machine is not required.

Follow logs:

```bash
docker compose logs -f api-gateway finance-service news-service classification-api
```

Follow a single service:

```bash
docker compose logs -f finance-service
```

Expected main containers:

| Container | Description |
| --- | --- |
| `finance-frontend` | Serves the React application through Nginx |
| `api-gateway` | Single entry point for backend services |
| `finance-service` | Market, portfolio, admin, and inflation operations |
| `news-service` | News listing and RSS refresh operations |
| `classification-api` | News classification service |
| `finance_db` | PostgreSQL |
| `finance-redis` | Redis cache |
| `finance_keycloak` | Identity management |
| `finance_openldap` | LDAP directory |
| `finance_filebeat` | Log collector |
| `finance_postgres_bootstrap` | First-start database setup, exits after completion |
| `finance_keycloak_bootstrap` | First-start Keycloak setup, exits after completion |

### Why Do Bootstrap Containers Exist?

Bootstrap containers are not main application services. They are short-lived one-shot init jobs that run during `docker compose up` and automatically complete setup tasks.

The goal is to make the application start on another computer or on a remote EC2 server without manual setup, similar to the local development experience.

`finance_postgres_bootstrap` does the following:

- Waits for PostgreSQL to become ready.
- Checks `finance_db`, `news_db`, and `keycloak` databases.
- Creates missing databases.
- Leaves existing databases untouched.
- Exits after completion.

`finance_keycloak_bootstrap` does the following:

- Waits for Keycloak to become ready.
- Waits for the `FinancePortal` realm to become available.
- Enables user registration: `registrationAllowed=true`.
- Sets the login theme: `loginTheme=finance`.
- Adds the default `USER` role mapping for new users.
- Tries to assign the `USER` role to already existing users.
- Exits after completion.

These containers do not build custom images. They use existing images:

- `postgres:16-alpine`
- `quay.io/keycloak/keycloak:23.0.7`

They only mount and execute shell scripts from the [scripts](scripts) directory.

Seeing this in `docker compose ps -a` is expected:

```text
finance_postgres_bootstrap   Exited (0)
finance_keycloak_bootstrap   Exited (0)
```

This is not an error. It means the bootstrap task completed successfully.

Without these bootstrap steps, new installations would require these manual actions:

- Create the `keycloak` database
- Enable Keycloak registration
- Select the `finance` login theme
- Add the `USER` role mapping to `default-roles-financeportal`
- Assign the `USER` role to existing users

## 4. First Run on Another PC and Empty Data State

When the project runs for the first time on another computer, the PostgreSQL volume starts empty. This is expected, and the application should not break.

Expected clean-install behavior:

- Flyway migrations create the database tables automatically.
- Keycloak imports the realm, client, and role configuration.
- The finance service loads the instrument catalog on startup from `instruments.properties` and `bist-instruments.json`.
- Market prices and historical data are populated by schedulers from Yahoo Finance, Binance, Fintables, and other providers.
- News may look empty at first; it is populated after the RSS scheduler or the admin refresh flow runs.
- Portfolio data is user-specific; the portfolio page stays empty until the user creates a portfolio.

Important notes:

- Without internet access, external provider data cannot be fetched. In that case, pages may show empty data, but the main application still runs.
- Chart endpoints may return an empty list if market data has not been collected for the selected symbol yet.
- Historical return calculations can return an error until the required market data exists.
- The admin page requires the user to have the `ADMIN` role in Keycloak.

In short, restoring a database backup is not required on another PC. The application starts with defaults, and data is populated over time by schedulers and user actions.

## 5. Endpoint Summary

All details are available through Swagger UI. The main API entry point is the API Gateway:

```text
http://localhost:8080
```

Gateway routes:

| Path | Service | Description |
| --- | --- | --- |
| `/api/market/**` | finance-service | Instruments, market data, charts, and prices |
| `/api/portfolio/**` | finance-service | Portfolio, deposit, buy/sell, profit/loss |
| `/api/admin/**` | finance-service | Admin metrics, provider status, instrument activation |
| `/api/inflation/**` | finance-service | Inflation data |
| `/api/news/**` | news-service | News listing, news refresh, provider status |
| `/api/v1/news/**` | classification-api | News classification and health |
| `/finance/v3/api-docs` | finance-service | OpenAPI JSON |
| `/news/v3/api-docs` | news-service | OpenAPI JSON |
| `/classification/v3/api-docs` | classification-api | OpenAPI JSON |

Important endpoints:

| Method | Endpoint | Description |
| --- | --- | --- |
| `GET` | `/api/market` | Lists instruments |
| `GET` | `/api/market/{symbol}` | Gets a single instrument |
| `GET` | `/api/market/candles/{symbol}` | Candlestick chart data |
| `GET` | `/api/market/line/{symbol}` | Line chart data |
| `GET` | `/api/market/hypothetical-return/{symbol}` | Calculates a historical purchase scenario |
| `GET` | `/api/portfolio/myPortfolios` | Gets user portfolios |
| `POST` | `/api/portfolio/create` | Creates a portfolio |
| `POST` | `/api/portfolio/deposit` | Deposits cash into a portfolio |
| `POST` | `/api/portfolio/buy` | Buys an instrument |
| `POST` | `/api/portfolio/sell` | Sells an instrument |
| `GET` | `/api/portfolio/transactions` | Transaction history |
| `GET` | `/api/news` | Lists news |
| `POST` | `/api/news/refresh` | Manually refreshes news, requires admin |
| `GET` | `/api/news/topics` | News categories |
| `GET` | `/api/admin/providers/status` | Finance provider status |
| `GET` | `/api/news/admin/providers/status` | News provider status |
| `GET` | `/api/v1/news/health` | Classification health |
| `POST` | `/api/v1/news/classify` | Classifies a news headline |

Use the service Swagger UI pages for the latest detailed endpoint documentation.

## 6. Observability Notes

Observability has two main parts:

- Logs: Spring services produce JSON logs. Filebeat forwards logs to Elasticsearch. Kibana is used for dashboards.
- Metrics/Traces: Spring Boot Actuator and OpenTelemetry export data to Grafana LGTM through OTLP.

Flow:

```text
Spring services -> Docker logs -> Filebeat -> Elasticsearch -> Kibana
Spring services -> OpenTelemetry OTLP -> Grafana LGTM
```

Important delivery note:

- The observability stack is hosted on an AWS EC2 instance that will remain available for the presentation.
- The fixed EC2 IP is `63.177.252.23`.
- Docker Compose uses this remote IP by default for metric, trace, and log forwarding.
- During testing, Grafana and Kibana should be opened in the browser through the EC2 IP, not through `localhost`.
- Elasticsearch and Grafana are not preferred for local testing because of local RAM limitations.
- Elastic/Kibana and Grafana validation was performed on the remote EC2 server.
- Related screenshots are included under the `docs` directory.

Browser URLs for observability validation:

| Purpose | URL |
| --- | --- |
| Kibana Discover / log search | [http://63.177.252.23:5601](http://63.177.252.23:5601) |
| Grafana LGTM / metrics and traces | [http://63.177.252.23:3000](http://63.177.252.23:3000) |
| Elasticsearch API check | [http://63.177.252.23:9200](http://63.177.252.23:9200) |

If a different remote observability server is used, override the host like this:

```bash
REMOTE_OBSERVABILITY_HOST=<remote-host-or-ip> docker compose up -d --build
```

The default run does not require `.env`. If observability endpoints are unavailable, the main application still runs through containers; only log/metric forwarding to the remote stack is unavailable.

### Filebeat Root Permission Error

If `docker logs finance_filebeat` shows the following error on EC2, `filebeat.yml` must be owned by root:

```text
Exiting: error loading config file: config file ("filebeat.yml") must be owned by the user identifier (uid=0) or root
```

Fix:

```bash
sudo chown root:root filebeat.yml
sudo chmod 644 filebeat.yml
docker compose restart filebeat
```

After restarting Filebeat, verify log ingestion from the `finance-logs` data view in Kibana.

## 7. Screenshots and Page Mapping

| Page | Screenshot |
| --- | --- |
| Landing / main entry screen | ![Landing](docs/Screenshot%202026-05-08%20at%2002.13.22.png) |
| Landing / live ticker view | ![Landing ticker](docs/Screenshot%202026-05-08%20at%2002.15.21.png) |
| News page | ![News](docs/Screenshot%202026-05-27%20at%2000.06.26.png) |
| Login page | ![Login](docs/Screenshot%202026-05-27%20at%2000.07.22.png) |
| Admin panel | ![Admin](docs/Screenshot%202026-05-27%20at%2000.08.00.png) |
| Instrument detail / price chart and buy-sell panel | ![Instrument detail](docs/Screenshot%202026-05-31%20at%2014.14.22.png) |
| Portfolio analytics / return and inflation analysis | ![Portfolio analytics](docs/Screenshot%202026-05-31%20at%2014.14.32.png) |
| Overview / asset comparison chart | ![Overview comparison](docs/Screenshot%202026-05-31%20at%2014.14.43.png) |
| Kibana log dashboard overview | ![Kibana dashboard 1](docs/Screenshot%202026-05-05%20at%2018.00.37.png) |
| Kibana log dashboard detail | ![Kibana dashboard 2](docs/Screenshot%202026-05-05%20at%2018.00.40.png) |
| Grafana metrics drilldown / news-service filtered metrics | ![Grafana metrics drilldown](docs/Screenshot%202026-06-07%20at%2014.38.04.png) |
| Grafana traces drilldown / finance-service and api-gateway spans | ![Grafana traces drilldown](docs/Screenshot%202026-06-07%20at%2014.38.19.png) |
| Filebeat root ownership error and fix note | ![Filebeat root ownership error](docs/Screenshot%202026-06-07%20at%2014.42.10.png) |
| Kibana Discover / finance logs from EC2 | ![Kibana Discover finance logs](docs/Screenshot%202026-06-07%20at%2014.44.26.png) |

## 8. System Architecture

Mermaid Live:

[https://mermaid.live](https://mermaid.live)

The architecture is organized into these layers:

- Client Layer
- Web / Edge Layer
- Identity Layer
- Core Microservices
- Data Layer
- External Data Providers
- Observability Layer

## 9. Technologies Used

| Area | Technology |
| --- | --- |
| Frontend | React 19, TypeScript, Vite, Tailwind CSS, Axios, React Query, Keycloak JS |
| Gateway | Spring Boot 4, Spring Cloud Gateway, Spring Security |
| Backend | Java 21, Spring Boot 4, Spring Data JPA, Flyway |
| Auth | Keycloak, OpenLDAP, OAuth2/OIDC, JWT |
| Database | PostgreSQL 16 |
| Cache | Redis 7 |
| News classification | Spring Boot, OpenNLP model files, lexicon/rule matching |
| API docs | Springdoc OpenAPI, Swagger UI |
| Observability | Filebeat, Elasticsearch, Kibana, OpenTelemetry, Grafana OTEL LGTM |
| DevOps | Docker, Docker Compose, GitHub Actions, GHCR, EC2 |

## 10. Deployment Summary

The production deployment workflow is located at [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml).

Main EC2 troubleshooting notes and lessons learned are summarized in this README.

Summary:

1. A push is made to `main`, `master`, or `develop`.
2. GitHub Actions runs the Maven build.
3. Docker images are built for changed services.
4. Images are pushed to GHCR.
5. The workflow connects to the EC2 server.
6. The server runs `docker compose pull` and `docker compose up -d --remove-orphans`.

Production compose:

```bash
docker compose -f docker-compose.prod.yml pull
docker compose -f docker-compose.prod.yml up -d
```
