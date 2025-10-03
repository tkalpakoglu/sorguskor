-- entrypoint, postgres superuser ile çalýþýr
CREATE ROLE app WITH LOGIN PASSWORD 'devpass' SUPERUSER CREATEDB CREATEROLE;
CREATE DATABASE appdb OWNER app;
CREATE DATABASE appdb_shadow OWNER app;
\\connect appdb
ALTER SCHEMA public OWNER TO app;
GRANT ALL PRIVILEGES ON DATABASE appdb TO app;
GRANT ALL ON SCHEMA public TO app;
