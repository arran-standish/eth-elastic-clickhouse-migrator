# About
A simple process that pulls data from elastic -raw-* indices, takes the hits and mimics them as a fhir bundle and pushes to kafka for consuming into clickhouse.

## HOW TO RUN IN QA / PROD
### Step 1: Start migration / duplication process
1. Scale down reverse proxy to 0 (we will need to have clickhouse + clickhouse mapper running during the process, and we do not want new data to interfere with the migration).
```sh
docker service scale reverse-proxy_reverse-proxy-nginx=0
```
2. Create `migration` topic in kafka
```sh
docker exec kafka_kafka-01.1. ... /opt/bitnami/kafka/bin/kafka-topics.sh --bootstrap-server localhost:9092 --create --topic migration --partitions 3
```
3. Deploy clickhouse
4. Set `KAFKA_2XX_TOPIC` to `migration` in the relevant .env file
5. Set `RAW_CONSUMER_GROUP_ID` to `clickhouse-migration` in the relevant .env file
> This is required before deploying the kafka-mapper-consumer service so we consume from the migration topic instead and so we do not influence the default xx group id.
6. Deploy kafka-mapper-consumer
7. Update `ELASTIC_PASSWORD` under docker/docker-compose.yml to the correct password
8. Copy this folder to the QA / PROD server
```sh
GLOBIGNORE='.git:.vscode' scp -r /path/to/folder/elastic-clickhouse-migrator/* user@ip-address:~/elastic-clickhouse-migrator
```
9. Deploy this code base as a service on the server. This is necessary since the networks are not attachable and to avoid creating a temporary attachable network we deploy this as a service, since that allows you to connect to the networks.
```sh
docker stack deploy -c docker/docker-compose.yml migration
```

### Step 2: Cleanup
Once the service we deploy has exited double check the logs to make sure it exited due to finishing and not due to an error. If it was due to an error, investigate it, resovle any issues and then retry from step 1. You will need to remove clickhouse + clickhouse volumes on all nodes before starting step 1 again (just so we have a fresh clickhouse instance and not partial data). Also remove the migration stack since it won't restart if you redeploy the stack.
1. Remove the service we just deployed to migrate data
```sh
docker stack rm migration
```
2. Remove the migration topic
```sh
docker exec kafka_kafka-01.1. ... /opt/bitnami/kafka/bin/kafka-topics.sh --bootstrap-server localhost:9092 --delete --topic migration
```
3. Set `KAFKA_2XX_TOPIC` to `2xx` and set `RAW_CONSUMER_GROUP_ID` to `clickhouse-2xx`.
```sh
docker service update kafka-mapper-consumer_kafka-mapper-consumer --env-add=KAFKA_2XX_TOPIC=2xx --env-add=RAW_CONSUMER_GROUP_ID=clickhouse-2xx
```
4. Scale reverse-proxy back again
```sh
docker service scale reverse-proxy_reverse-proxy-nginx=1
```
