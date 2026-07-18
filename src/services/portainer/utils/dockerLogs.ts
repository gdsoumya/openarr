// Non-TTY container logs arrive as a multiplexed stream: each frame starts
// with an 8-byte header (byte 0 = stream type \x00|\x01|\x02, bytes 4-7 =
// payload length). Axios delivers the body as text, which can mangle the
// length bytes, so the header length field cannot be trusted — instead strip
// the 8-char prefix from any line that starts with a stream-type byte.
// TTY containers send raw text and pass through unchanged.
export function demuxDockerLogs(raw: string): string {
  if (!raw) return '';
  return raw
    .split('\n')
    .map((line) => {
      const first = line.charCodeAt(0);
      if (first === 0 || first === 1 || first === 2) return line.slice(8);
      return line;
    })
    .join('\n');
}
