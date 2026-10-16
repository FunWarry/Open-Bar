/**
 * STOMP 1.2 frame builder and parser for k6 WebSocket load testing.
 */

export const NULL_BYTE = '\u0000';

/**
 * Builds a STOMP CONNECT frame.
 *
 * @param {string} [token] Bearer JWT token
 * @returns {string} Serialized STOMP CONNECT frame
 */
export function buildConnectFrame(token) {
  let frame = 'CONNECT\naccept-version:1.2,1.1,1.0\nheart-beat:10000,10000\n';
  if (token) {
    frame += `Authorization:Bearer ${token}\n`;
  }
  frame += '\n' + NULL_BYTE;
  return frame;
}

/**
 * Builds a STOMP SUBSCRIBE frame.
 *
 * @param {string} destination STOMP topic or queue destination
 * @param {string} id Unique subscription identifier
 * @returns {string} Serialized STOMP SUBSCRIBE frame
 */
export function buildSubscribeFrame(destination, id = 'sub-0') {
  return `SUBSCRIBE\nid:${id}\ndestination:${destination}\nack:auto\n\n${NULL_BYTE}`;
}

/**
 * Builds a STOMP SEND frame.
 *
 * @param {string} destination STOMP destination
 * @param {object|string} body Message body
 * @returns {string} Serialized STOMP SEND frame
 */
export function buildSendFrame(destination, body) {
  const content = typeof body === 'string' ? body : JSON.stringify(body);
  return `SEND\ndestination:${destination}\ncontent-type:application/json\ncontent-length:${content.length}\n\n${content}${NULL_BYTE}`;
}

/**
 * Parses incoming STOMP frames from a raw WebSocket message string.
 *
 * @param {string} raw Raw text from WebSocket
 * @returns {Array<{command: string, headers: object, body: string}>} List of parsed frames
 */
export function parseStompFrames(raw) {
  if (!raw) return [];
  const frames = [];
  const parts = raw.split(NULL_BYTE);

  for (const part of parts) {
    const chunk = part.trim();
    if (!chunk) continue;

    const headerBodySplit = chunk.indexOf('\n\n');
    let headerSection = '';
    let body = '';

    if (headerBodySplit !== -1) {
      headerSection = chunk.slice(0, headerBodySplit);
      body = chunk.slice(headerBodySplit + 2);
    } else {
      headerSection = chunk;
    }

    const lines = headerSection.split('\n');
    const [commandLine, ...headerLines] = lines;
    const command = commandLine ? commandLine.trim() : '';
    const headers = {};

    for (const line of headerLines) {
      const colonIdx = line.indexOf(':');
      if (colonIdx !== -1) {
        const key = line.slice(0, colonIdx).trim();
        const val = line.slice(colonIdx + 1).trim();
        headers[key] = val;
      }
    }

    frames.push({ command, headers, body });
  }

  return frames;
}
