-- superuser: postgres ile �al���r (entrypoint otomatik)
CREATE ROLE app WITH LOGIN PASSWORD 'devpass' SUPERUSER;
CREATE DATABASE appdb OWNER app;
\connect appdb
ALTER SCHEMA public OWNER TO app;
GRANT ALL PRIVILEGES ON DATABASE appdb TO app;
GRANT ALL ON SCHEMA public TO app;
