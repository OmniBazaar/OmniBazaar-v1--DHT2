const assert = require('assert');
const sinon = require('sinon');

const dhtConnector = require('./../lib/connector');

let clock;

beforeEach(() => (clock = sinon.useFakeTimers()));

afterEach(() => clock.restore());

describe('#dhtConnector', () => {
  describe('#connect', () => {
    it('should publish all keywords on connect', done => {
      const server = dhtConnector({
        host: '127.0.0.1',
        bootstrap: []
      });
      const keyword = 'testing';

      server
        .connect({
          port: 5000,
          nodes: [],
          keywords: [keyword]
        })
        .catch(err => console.log(err.message));

      server.listenPeerAnnouncement(resp => {
        assert.equal(resp.keyword, keyword);
        assert.equal(resp.peer.port, 5000);

        server.destroy();
        done();
      }, done);
    });

    it.skip('should re-announce(polling) keywords after after a minute', () => {
      //:TODO
    });
  });

  describe('#findPeersFor(keyword)', () => {
    let testKeyword;
    let server;

    beforeEach(() => {
      testKeyword = 'testing';
      server = dhtConnector({
        host: '127.0.0.1',
        bootstrap: []
      });
    });

    afterEach(() => {
      server.destroy();
    });

    it('should find peers for announced keyword', done => {
      server
        .connect({
          port: 5000,
          nodes: [],
          keywords: [testKeyword]
        })
        .catch(() => {});

      const client = dhtConnector({
        bootstrap: ['127.0.0.1:5000']
      });

      client
        .connect({
          port: 5001,
          nodes: [{ host: '127.0.0.1', port: 5000 }]
        })
        .catch(() => {});

      client.listenPeerLookup(({ peer, keyword, from }) => {
        assert.deepEqual(peer, { host: '127.0.0.1', port: 5000, weight: 0 });
        assert.equal(testKeyword, keyword);

        client.destroy();

        done();
      });

      client.findPeersFor(testKeyword);
    });

    it('should return peers with weight for keyword', (done) => {
      const testWeight = 12;

      server
        .connect({
          port: 5000,
          nodes: [],
          keywords: [{ keyword: testKeyword, weight: testWeight }]
        })
        .catch(() => {});

      const client = dhtConnector({
        bootstrap: ['127.0.0.1:5000']
      });

      client
        .connect({
          port: 5001,
          nodes: [{ host: '127.0.0.1', port: 5000 }]
        })
        .catch(() => {});

      client.listenPeerLookup(({ peer, keyword, from }) => {
        assert.deepEqual(peer, { host: '127.0.0.1', port: 5000, weight: testWeight });
        assert.equal(testKeyword, keyword);

        client.destroy();

        done();
      });

      client.findPeersFor(testKeyword);
    });
  });
});
