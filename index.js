import { run } from './elastic.js';
import { sendToKafka } from './kafka.js';

async function main() {
  const processElasticResponse = async (hits) => {
    const entries = [];
    for (const hit of hits) {
      entries.push({
        resource: hit._source.resource,
      });
    }

    await sendToKafka(entries);
  }

  await run(processElasticResponse);
}

main().catch((err) => console.log(JSON.stringify(err)));
