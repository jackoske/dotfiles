// Forward the last completed assistant text to Herdr's pane lifecycle API.
// This is deliberately best-effort: terminal state is still verified by Herdr.
import net from "node:net";

const SOURCE = "herdr:opencode-final-report";
const AGENT = "opencode";
let sequence = Date.now() * 1000;
const latestBySession = new Map();

function nextSequence() {
  sequence += 1;
  return sequence;
}

function sendReport(message, state, reportKey) {
  const paneId = process.env.HERDR_PANE_ID;
  const socketPath = process.env.HERDR_SOCKET_PATH;
  if (!paneId || !socketPath || !message) return;

  const endpoint = process.platform === "win32" ? `\\\\.\\pipe\\${socketPath}` : socketPath;
  const request = {
    id: `${SOURCE}:${Date.now()}:${Math.floor(Math.random() * 1_000_000)}`,
    method: "pane.report_agent",
    params: {
      pane_id: paneId,
      source: SOURCE,
      agent: AGENT,
      state,
      message,
      seq: nextSequence(),
    },
  };

  return new Promise((resolve) => {
    const client = net.createConnection(endpoint, () => {
      client.write(`${JSON.stringify(request)}\n`);
    });
    const finish = () => {
      client.destroy();
      resolve();
    };
    client.setTimeout(750, finish);
    client.on("data", finish);
    client.on("error", finish);
    client.on("end", finish);
    client.on("close", resolve);
  });
}

export default async () => ({
  "experimental.text.complete": async (input, output) => {
    const reportKey = `${input.sessionID}:${input.messageID}:${input.partID}`;
    latestBySession.set(input.sessionID, { message: output.text, reportKey });
    // Publish the latest text immediately, but leave lifecycle classification
    // to Herdr's normal session.idle event below.
    await sendReport(output.text, "working", reportKey);
  },
  event: async ({ event }) => {
    if (event?.type !== "session.idle") return;
    const sessionID = event.properties?.sessionID;
    const report = sessionID ? latestBySession.get(sessionID) : undefined;
    if (!report) return;
    await sendReport(report.message, "idle", `${report.reportKey}:idle`);
    latestBySession.delete(sessionID);
  },
});
