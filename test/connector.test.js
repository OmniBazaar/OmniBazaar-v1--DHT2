const assert = require('assert');
const sinon = require('sinon');

const dhtConnector = require('./../lib/connector');

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
      });
    });
  });

  describe('#announce(keyword, weight)', () => {
    const testKeyword = 'testing';
    let server;

    beforeEach(async () => {
      server = dhtConnector({
        bootstrap: false
      });

      return server
        .connect({
          port: 5000,
          nodes: [],
          keywords: []
        })
        .catch(() => {});
    });

    afterEach(() => {
      server.destroy();
    });

    it('should announce nodes of new keywords', (done) => {
      const server2 = dhtConnector({
        bootstrap: ['127.0.0.1:5000']
      });

      server2
        .connect({
          port: 5001,
          nodes: []
        })
        .catch(() => {});

      server.listenPeerAnnouncement(resp => {
        assert.equal(resp.keyword, testKeyword);
        assert.equal(resp.peer.port, 5001);
        assert.equal(resp.peer.weight, 12);

        server2.destroy();
        done();
      });

      server2.announce(testKeyword, 12);
    });
  });

  describe('#findPeersFor(keyword)', () => {
    const testKeyword = 'testing';
    let server;

    beforeEach(() => {
      server = dhtConnector({
        host: '127.0.0.1',
        bootstrap: []
      });
    });

    afterEach(() => {
      server.destroy();
    });

    it('should find peers for announced keyword', (done) => {
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
          nodes: []
        })
        .catch(() => {});

      client.findPeersFor(testKeyword)
        .then(({ peers, keyword, from }) => {
          assert.deepEqual(peers, [{ host: '127.0.0.1', port: 5000, weight: 0 }]);
          assert.equal(testKeyword, keyword);

          client.destroy();

          done();
        })
        .catch(done);
    });

    it('should return peers with weight for keyword', done => {
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
          nodes: []
        })
        .catch(() => {});

      client.findPeersFor(testKeyword)
        .then(({ peers, keyword, from }) => {
          assert.deepEqual(peers, [
            { host: '127.0.0.1', port: 5000, weight: testWeight }
          ]);
          assert.equal(testKeyword, keyword);

          client.destroy();

          done();
        });
    });
  });

  describe('#removePeerFor(keyword)', () => {
    const testKeyword = 'testing';
    let server;
    let clock;

    beforeEach(() => {
      clock = sinon.useFakeTimers();

      server = dhtConnector({
        host: '127.0.0.1',
        bootstrap: []
      });
    });

    afterEach(() => {
      clock.restore();
      server.destroy();
    });

    it('should make keyword unavailable for lookup in the network', (done) => {
      server
        .connect({
          port: 5000,
          nodes: [],
          keywords: [testKeyword]
        })
        .then(() => {
          const client = dhtConnector({
            bootstrap: ['127.0.0.1:5000']
          });

          client
            .connect({
              port: 5001,
              nodes: [],
              asPublisher: false
            });

          server.removePeerFor(testKeyword)
            .then(() => {
              client.findPeersFor(testKeyword)
                .then(({ noPeers }) => {
                  assert.ok(noPeers); // No peers were found

                  client.destroy();

                  done();
                })
                .catch(done);

                // If after 5 secs the DHT has not found peers, the promise will resolve
                clock.tick(5000);
            });
        });
    });
  });
});
