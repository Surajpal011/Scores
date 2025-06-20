import React, { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

type MatchParams = {
  sport: string;
  id: string;
};

interface MatchData {
  awayTeam?: string;
  homeTeam?: string;
  awayScore?: number;
  homeScore?: number;
  liveLastPlay?: string;
  bases?: {
    first?: boolean;
    second?: boolean;
    third?: boolean;
  };
  balls?: number;
  strikes?: number;
  outs?: number;
}

const LiveMatch: React.FC = () => {
  const { sport, id } = useParams<MatchParams>();
  const navigate = useNavigate();
  const [data, setData] = useState<MatchData>({});
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const throttledRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (sport !== "mlb" || !id) {
      setError("Only MLB matches are supported.");
      setIsLoading(false);
      return;
    }

    // Connect to local backend server instead of external API
    const evtSource = new EventSource(
      `http://localhost:3001/stream/${id}?t=${Date.now()}`
    );

    evtSource.onopen = () => {
      setIsLoading(false);
      setError("");
    };

    evtSource.onmessage = (event) => {
      if (event.data === ": keep-alive" || event.data === ":") return;
      try {
        const newData = JSON.parse(event.data);
        // Throttle rapid updates every 500ms
        if (throttledRef.current) clearTimeout(throttledRef.current);
        throttledRef.current = setTimeout(() => {
          setData((prev) => ({ ...prev, ...newData }));
        }, 500);
      } catch (err) {
        console.error("Error parsing data:", err);
      }
    };

    evtSource.onerror = (err) => {
      console.error("EventSource error:", err);
      evtSource.close();
      setError(
        "Unable to connect to live updates. Please check that the backend server is running on port 3001 and try again."
      );
      setIsLoading(false);
    };

    return () => {
      evtSource.close();
    };
  }, [sport, id]);

  // Reusable Fallback Component
  const LoadingOrError = () => (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center px-4">
      <div className="text-center max-w-md w-full">
        {error ? (
          <>
            <div className="text-red-400 text-lg sm:text-xl font-semibold bg-slate-800/80 backdrop-blur-lg rounded-xl p-6 sm:p-8 mb-6">
              {error}
            </div>
            <button
              onClick={() => navigate("/dashboard")}
              className="inline-flex items-center gap-2 bg-slate-700/50 hover:bg-slate-700/70 text-white px-6 py-3 rounded-xl transition-all duration-300"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Dashboard
            </button>
          </>
        ) : (
          <>
            <div className="text-white text-lg sm:text-xl font-semibold mb-4">
              Connecting to live updates...
            </div>
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-400 mx-auto"></div>
          </>
        )}
      </div>
    </div>
  );

  if (isLoading || error) return <LoadingOrError />;

  return (
    <div className="min-h-screen bg-slate-900">
      <div className="container mx-auto px-4 sm:px-6 py-4">
        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-6 sm:mb-8">
            <h1 className="text-2xl sm:text-4xl font-bold text-purple-400 mb-2 tracking-wide">
              Realtimescores.io
            </h1>
          </div>

          <h2 className="text-lg sm:text-2xl font-bold text-center text-white mb-4">
            {data.awayTeam || "AWAY"} vs {data.homeTeam || "HOME"}
          </h2>

          <div className="flex justify-center items-center gap-8 sm:gap-40 mb-4">
            <div className="text-2xl sm:text-4xl font-extrabold text-blue-400">
              {data.awayTeam || "--"}
            </div>
            <div className="text-xl sm:text-3xl text-white font-light">vs</div>
            <div className="text-2xl sm:text-4xl font-extrabold text-red-400">
              {data.homeTeam || "--"}
            </div>
          </div>

          <div className="text-center text-3xl sm:text-5xl font-bold text-white mb-6">
            {data.awayScore ?? "--"} - {data.homeScore ?? "--"}
          </div>

          {/* Base Diamond */}
          <div className="flex justify-center mb-6">
            <div className="relative w-40 h-40 sm:w-56 sm:h-56">
              {["second", "third", "first"].map((base) => (
                <div
                  key={base}
                  className={`absolute ${
                    base === "second"
                      ? "top-0 left-1/2 -translate-x-1/2"
                      : base === "third"
                      ? "left-0 top-1/2 -translate-y-1/2"
                      : "right-0 top-1/2 -translate-y-1/2"
                  } w-12 h-12 sm:w-16 sm:h-16 rotate-45 rounded-lg flex items-center justify-center text-xs sm:text-sm font-bold transition-all duration-300 ${
                    data.bases?.[base as keyof MatchData["bases"]]
                      ? "bg-purple-600 text-white shadow-lg shadow-purple-400/50"
                      : "bg-gray-600 text-gray-300"
                  }`}
                >
                  <span className="-rotate-45">
                    {base === "first" ? "1B" : base === "second" ? "2B" : "3B"}
                  </span>
                </div>
              ))}
              <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-12 h-12 sm:w-16 sm:h-16 rotate-45 rounded-lg bg-gray-600 text-gray-300 flex items-center justify-center text-xs font-bold">
                <span className="-rotate-45">H</span>
              </div>
            </div>
          </div>

          {/* Count Display */}
          <div className="grid grid-cols-3 gap-4 sm:gap-8 mb-6 max-w-md mx-auto">
            {[
              ["Balls", data.balls, "green"],
              ["Strikes", data.strikes, "blue"],
              ["Outs", data.outs, "red"],
            ].map(([label, value, color]) => (
              <div className="text-center" key={label}>
                <div
                  className={`text-${color}-400 text-lg sm:text-2xl font-extrabold mb-2`}
                >
                  {label}
                </div>
                <div className="text-3xl sm:text-5xl font-bold text-white">
                  {value ?? "--"}
                </div>
              </div>
            ))}
          </div>

          <div className="text-center text-gray-300 italic text-sm sm:text-lg mb-6 min-h-[2rem] px-4">
            {data.liveLastPlay || "Waiting for live play updates..."}
          </div>

          <div className="text-center">
            <button
              onClick={() => navigate("/dashboard")}
              className="inline-flex items-center gap-2 bg-slate-700/50 hover:bg-slate-700/70 text-white px-6 py-3 rounded-xl transition-all duration-300 hover:scale-105 border border-slate-600/50 hover:border-blue-400/50"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Dashboard
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LiveMatch;
