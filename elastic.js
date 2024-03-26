import { Client } from '@elastic/elasticsearch';

const node = process.env.ELASTIC_NODE ?? 'localhost:9201';
const password = process.env.ELASTIC_PASSWORD ?? 'dev_password_only';

const client = new Client({
  node: `http://${node}`,
  auth: {
    username: 'elastic',
    password: password
  },
});

export async function run(processBundle) {
  let processCounter = 0;

  // Get total hits
  let result = await client.search({
    index: 'fhir-raw-*',
    from: 0,
    size: 30,
    scroll: '120s',
    track_total_hits: true,
    body: {
      query: {
        match_all: {},
      },
    },
  });

  const totalHits = result.body.hits.total.value;

  do {
    if (result.body.hits.hits.length === 0) {
      console.log('reached end of scroll breaking out of loop');
      break;
    }

    await processBundle(result.body.hits.hits);
    
    processCounter += result.body.hits.hits.length;

    console.log(`processed ${processCounter} out of ${totalHits}`);

    result = await client.scroll({
      scroll_id: result.body._scroll_id,
      scroll: '120s',
    });

  } while (totalHits !== processCounter);

  console.log('done');
  
  return Promise.resolve();
}
