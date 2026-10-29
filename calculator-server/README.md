# Lab 9: Docker Compose Calculator Server

This Compose project runs the existing FastAPI calculator server with a MySQL
8.4 database. The backend is available at `http://localhost:34242`, and MySQL
is optionally published to the host at `127.0.0.1:54242`.

## Start and verify the services

```bash
docker compose config
docker compose up --build -d
docker compose ps
docker compose logs backend database
curl http://localhost:34242/test-db
curl -X POST http://localhost:34242/calculate \
  -H 'Content-Type: application/json' \
  -d '{"expr":"30/4"}'
```

The database request must return `{"db_result":1}`. The calculator request
must report a successful result of `7.5`.

## Prove that database data persists

Open the MySQL client and enter `classroom-app` when prompted:

```bash
docker compose exec database mysql -u appuser -p appdb
```

Create and inspect a record:

```sql
CREATE TABLE IF NOT EXISTS lab_check (
  id INT PRIMARY KEY,
  note VARCHAR(100) NOT NULL
);
INSERT INTO lab_check (id, note)
VALUES (1, 'data survives recreation')
ON DUPLICATE KEY UPDATE note = 'data survives recreation';
SELECT * FROM lab_check;
exit
```

Remove and recreate the containers without deleting the named volume:

```bash
docker compose down
docker compose up -d
docker compose exec database mysql -u appuser -p appdb
```

After entering `classroom-app`, run `SELECT * FROM lab_check;`. The row must
still exist. This is stronger than a restart because `docker compose down`
removes the original containers and their writable layers; the recreated
database container can recover the row only from the separately managed
`dbdata` volume. Do not use `docker compose down -v` for this check because
`-v` deletes that volume and its data.
