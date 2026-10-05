import ws from 'k6/ws';
import { check, sleep } from 'k6';
import { Trend, Counter } from 'k6/metrics';
import { buildConnectFrame, buildSubscribeFrame, parseStompFrames } from '../helpers/stomp-ws.js';
import { authenticateUser, DEFAULT_BASE_URL } from '../helpers/auth.js';

const wsConnectDuration = new Trend('ws_connect_duration', true);
const stompMessagesReceived = new Counter('stomp_messages_received');
const wsConnectionErrors = new Counter('ws_connection_errors');

export const options = {
  vus: 8,
  duration: '30s',
  thresholds: {
    'ws_connect_duration': ['p(95)<150'],
    'ws_connection_errors': ['count<5'],
  },
};

export default function websocketStompScenario() {
  const baseUrl = DEFAULT_BASE_URL;
  // Convert http:// to ws://
  const wsUrl = baseUrl.replace(/^http:/, 'ws:').replace(/^https:/, 'wss:') + '/ws';

  const token = authenticateUser('barman1', 'barman123', baseUrl);
  const startTime = Date.now();

  const res = ws.connect(wsUrl, {}, function (socket) {
    socket.on('open', function () {
      wsConnectDuration.add(Date.now() - startTime);

      // 1. Send STOMP CONNECT frame
      const connectFrame = buildConnectFrame(token);
      socket.send(connectFrame);
    });

    socket.on('message', function (data) {
      const frames = parseStompFrames(data);

      for (const frame of frames) {
        if (frame.command === 'CONNECTED') {
          // 2. STOMP handshake established: Subscribe to order and kitchen topics
          socket.send(buildSubscribeFrame('/topic/commandes', 'sub-commandes'));
          socket.send(buildSubscribeFrame('/topic/barman/commandes', 'sub-barman'));
          socket.send(buildSubscribeFrame('/topic/stock/alerte', 'sub-stock'));
        } else if (frame.command === 'MESSAGE') {
          stompMessagesReceived.add(1);
        }
      }
    });

    socket.on('error', function (e) {
      wsConnectionErrors.add(1);
    });

    // Keep workstation connection open for 10 seconds per iteration
    socket.setTimeout(function () {
      socket.close();
    }, 10000);
  });

  check(res, {
    'WebSocket upgrade handshake status is 101 or connected': (r) => r && (r.status === 101 || r.status === 0),
  });

  sleep(1);
}
