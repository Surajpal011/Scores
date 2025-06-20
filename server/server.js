import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import express from "express";
import WebSocket from "ws";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, "../.env") });

const app = express();

const WS_URL = process.env.WS_URL;
const HEADERS = {
  "User-Agent": process.env.USER_AGENT,
  Authorization: `ScoreConnect access_token="${process.env.AUTH_TOKEN}"`,
  "X-Api-Version": process.env.API_VERSION,
};
// Pre-compiled query string for performance
const BASEBALL_QUERY = `subscription{eventUpdated(eventIds:["/baseball/events/MATCH_ID"]){event{...on BaseballEvent{id awayTeam{abbreviation}homeTeam{abbreviation}boxScore{awayScore homeScore balls strikes outs liveLastPlay progress{description}firstBaseOccupied secondBaseOccupied thirdBaseOccupied}}}}}`;

const matchData = new Map();
const clients = new Map();
const connections = new Map();

function connectWebSocket(matchId) {
  if (connections.has(matchId)) return connections.get(matchId);

  const ws = new WebSocket(WS_URL);
  let reconnectAttempts = 0;

  const setupWebSocket = (wsInstance) => {
    wsInstance.on("open", () => {
      wsInstance.send(
        JSON.stringify({
          type: "connection_init",
          payload: HEADERS,
        })
      );
    });

    wsInstance.on("message", (data) => {
      try {
        const message = JSON.parse(data);

        if (message.type === "connection_ack") {
          // Send subscription immediately
          wsInstance.send(
            JSON.stringify({
              id: "1",
              type: "start",
              payload: {
                variables: { eventIds: [`/baseball/events/${matchId}`] },
                query: BASEBALL_QUERY.replace("MATCH_ID", matchId),
              },
            })
          );
        } else if (message.type === "data") {
          const event = message.payload?.data?.eventUpdated?.event;
          if (!event) return;

          // Direct data mapping - no intermediate variables
          const data = JSON.stringify({
            awayTeam: event.awayTeam?.abbreviation || "TBD",
            homeTeam: event.homeTeam?.abbreviation || "TBD",
            awayScore: event.boxScore?.awayScore ?? 0,
            homeScore: event.boxScore?.homeScore ?? 0,
            balls: event.boxScore?.balls ?? 0,
            strikes: event.boxScore?.strikes ?? 0,
            outs: event.boxScore?.outs ?? 0,
            liveLastPlay: event.boxScore?.liveLastPlay || "",
            progress: {
              description: event.boxScore?.progress?.description || "",
            },
            bases: {
              first: event.boxScore?.firstBaseOccupied ?? false,
              second: event.boxScore?.secondBaseOccupied ?? false,
              third: event.boxScore?.thirdBaseOccupied ?? false,
            },
          });

          // Cache and broadcast in one step
          matchData.set(matchId, data);
          const clientList = clients.get(matchId);
          if (clientList) {
            const message = `data: ${data}\n\n`;
            for (const client of clientList) {
              if (client.writable) {
                client.write(message);
              } else {
                clientList.delete(client);
              }
            }
          }
        }
      } catch (err) {
        // Silent error handling for speed
      }
    });

    wsInstance.on("error", () => {
      if (reconnectAttempts < 3) {
        reconnectAttempts++;
        setTimeout(() => {
          const newWs = new WebSocket(WS_URL);
          setupWebSocket(newWs);
          connections.set(matchId, newWs);
        }, 1000);
      }
    });

    wsInstance.on("close", () => {
      const clientList = clients.get(matchId);
      if (clientList && clientList.size > 0 && reconnectAttempts < 3) {
        reconnectAttempts++;
        setTimeout(() => {
          const newWs = new WebSocket(WS_URL);
          setupWebSocket(newWs);
          connections.set(matchId, newWs);
        }, 1000);
      } else {
        connections.delete(matchId);
      }
    });
  };

  setupWebSocket(ws);
  connections.set(matchId, ws);
  return ws;
}

// Minimal CORS
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  next();
});
app.get("/api/mlb/games", async (req, res) => {
  try {
    const scheduleRes = await fetch(process.env.SCORE_SCHEDULE_URL);

    if (!scheduleRes.ok) {
      throw new Error(`Schedule API failed: ${scheduleRes.status}`);
    }

    const scheduleData = await scheduleRes.json();

    const todayIds = scheduleData?.current_group?.event_ids ?? [];

    if (!todayIds.length) {
      return res.json({ message: "No MLB games for today.", events: [] });
    }

    const fullEventsUrl = `${process.env.SCORE_EVENTS_URL}${todayIds.join(
      ","
    )}`;

    const eventsRes = await fetch(fullEventsUrl);
    if (!eventsRes.ok) {
      throw new Error(`Events API failed: ${eventsRes.status}`);
    }

    const events = await eventsRes.json();
    res.json({ events });
  } catch (error) {
    console.error("Server error:", error.message);
    res.status(500).json({ error: "Failed to fetch MLB games" });
  }
});

app.get("/stream/:matchId", (req, res) => {
  const matchId = req.params.matchId;

  // Set headers once
  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
    "Access-Control-Allow-Origin": "*",
  });

  // Minimal keep-alive
  const keepAlive = setInterval(() => res.write(":\n\n"), 30000);

  // Add client
  let clientList = clients.get(matchId);
  if (!clientList) {
    clientList = new Set();
    clients.set(matchId, clientList);
  }
  clientList.add(res);

  // Send cached data immediately
  const cached = matchData.get(matchId);
  if (cached) {
    res.write(`data: ${cached}\n\n`);
  }

  // Cleanup on disconnect
  req.on("close", () => {
    clearInterval(keepAlive);
    clientList.delete(res);
    if (clientList.size === 0) {
      clients.delete(matchId);
      const ws = connections.get(matchId);
      if (ws) {
        ws.close();
        connections.delete(matchId);
      }
    }
  });

  // Connect WebSocket
  connectWebSocket(matchId);
});

app.get("/connect/:matchId", (req, res) => {
  connectWebSocket(req.params.matchId);
  res.json({ status: "OK" });
});

app.get("/disconnect/:matchId", (req, res) => {
  const ws = connections.get(req.params.matchId);
  if (ws) {
    ws.close();
    connections.delete(req.params.matchId);
  }
  res.json({ status: "OK" });
});

app.listen(3001, () => console.log("Server running on port 3001"));
