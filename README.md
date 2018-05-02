# DHT Connector

A DHT implementation using based on [BitTorrent DHT](https://github.com/webtorrent/bittorrent-dht).

## Getting Started

These instructions will get you a copy of the project up and running on your local machine for development and testing purposes.

### Prerequisites

You'll need to install [NodeJS](https://nodejs.org/en/).

Then, you'll have to `npm install` or `yarn` so the dependencies get installed.

## Usage

This connector provides some methods that will all you to perform many operations over the network.

But before calling any of the methods that will be described you must call the connector as a function passing as parameters the host URL and the bootstrap URLs from where the connector will pull information accross the network.

```javascript
const dhtConnector = require('./lib/connector');

const server = dhtConnector({
  host: '127.0.0.1',
  bootstrap: [] // Calling it with an empty array to not bootstrap
});
```

### #connect({ port, nodes, keywords, asPublisher, announceInterval })

When using the connector you may want to connect to a respective port passing the nodes that this instance of the connector will be attached to.

You may also want to pass default keywords to be announced immediatly after the connection so all nodes in the network are able to find those keywords.

The `asPublisher` option will setup the connector as being able to publish information in the DHT, such as keywords.

The `announceInterval` option will setup an interval to periodically publish keywords to the network.

```javascript
const payload = { keyword: 'Laptops', weight: 2500 };

server
  .connect({
    port: 5000,
    nodes: [],
    keywords: [payload] // Please notice that a keyword can be a single string or a keyword/weight object
  })
  .catch(err => console.log(err.message));
```

### #addNode({ host, port })

This will add a node for the connector instance.

### #announce(keyword, weight)

This is handy when you need to spread any keyword over the network with its corresponding weight(amount of information available for that keyword somewhere else).

```javascript
server.announce('My keyword', 12); // This only allows a strign keyword, not an object
```

### #listenPeerAnnouncement(handler)

Allows you to listen to the `announce` event triggered after calling the `#announce` method listed above.

It receives a callback as parameter, this callback will receive a `{ peer, keyword }` object as paramenter, here is where you perform any operations for this event.

```javascript
server.listenPeerAnnouncement(resp => {
  console.log(resp.keyword);
  console.log(resp.peer.port);
  console.log(resp.peer.host);
  console.log(resp.peer.weight);
});
```

### #findPeersFor(keyword)

This will search in the network for all peers that announced the keyword passed as parameter and will return them on the `#listenPeerLookup` event method.

```javascript
server.findPeersFor('Another keyword');
```

### #listenPeerLookup(handler, perPeer = false)

Allows you to listen to the `peer` event, when `perPeer === true`, or to the `peers` event triggered after calling the `#findPeersFor` method listed above.

The difference between the `peer` and `peers` event is that the first will be trigger for all the peers found, one by one, the second one will be triggered once per `#findPeersFor` call, returning an array with all the peers found.

```javascript
server.listenPeerLookup(({ peers, keyword, from }) => {
  // Handle your event here
});
```

## Example

Here's a full example having one publisher node and a client node.

```javascript
const server = dhtConnector({
  host: '127.0.0.1',
  bootstrap: []
});

server
  .connect({
    port: 5000,
    nodes: [],
    keywords: [{ keyword: 'Screens', weight: 300 }]
  })
  .catch(err => console.log(err.message));

const client = dhtConnector({
  bootstrap: ['127.0.0.1:5000'] // Notice how we bootstrap using the server node
});

client
  .connect({
    port: 5001,
    nodes: []
  })
  .catch(() => {});

client.listenPeerLookup(({ peers, keyword }) => {
  console.log(`Found ${peers.length} peers for '${keyword}'`, peers);
});

client.findPeersFor('Screens');
```

## Running the tests

Run `yarn run test` or `node run test` to run the test suite.

## License

This project is licensed under the MIT License - see the [LICENSE.md](LICENSE.md) file for details.
