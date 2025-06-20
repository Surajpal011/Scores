import React, { useState, useEffect, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { LogOut, User, Edit } from "lucide-react";
import { useAuth } from "../../context/AuthContext";

interface Team {
  abbreviation: string;
}

interface Event {
  id: string;
  event_status: string;
  game_date: string;
  home_team: Team;
  away_team: Team;
}

const Dashboard: React.FC = () => {
  const [loading, setLoading] = useState("Loading MLB games...");
  const [games, setGames] = useState<Event[]>([]);
  const { currentUser, logout } = useAuth();
  const navigate = useNavigate();
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const userName =
    currentUser?.name || currentUser?.email?.split("@")[0] || "User";

  useEffect(() => {
    const fetchMLBGames = async () => {
      setLoading("Loading MLB games...");
      setGames([]);

      try {
        const res = await fetch("http://localhost:3001/api/mlb/games");
        const data = await res.json();

        if (!data.events?.length) {
          setLoading(data.message || "No MLB games found.");
          return;
        }

        const order: Record<string, number> = {
          in_progress: 0,
          pre_game: 1,
          final: 2,
        };

        data.events.sort((a: any, b: any) => {
          const statusA = order[a.event_status.toLowerCase()] ?? 99;
          const statusB = order[b.event_status.toLowerCase()] ?? 99;
          return statusA !== statusB
            ? statusA - statusB
            : new Date(a.game_date).getTime() - new Date(b.game_date).getTime();
        });

        setGames(data.events);
        setLoading("");
      } catch (err) {
        console.error("Error loading games:", err);
        setLoading("Failed to load MLB games.");
      }
    };

    fetchMLBGames();
  }, []);

  const handleLogout = async () => {
    try {
      await logout();
      navigate("/login");
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  const liveOrUpcomingGames = useMemo(
    () =>
      games.filter(
        (ev) =>
          ev.event_status.toLowerCase() === "in_progress" ||
          ev.event_status.toLowerCase() === "pre_game"
      ),
    [games]
  );

  const renderGameItem = (ev: Event) => {
    const status = ev.event_status.toLowerCase();
    const start = new Date(ev.game_date).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
    const label = `${ev.away_team.abbreviation} - ${ev.home_team.abbreviation}`;

    if (status === "in_progress") {
      return (
        <li
          key={ev.id}
          className="p-4 rounded mb-3 bg-red-700 text-white font-bold shadow-lg"
        >
          <div className="flex items-center space-x-2 mb-1">
            <svg
              className="w-5 h-5 text-red-400 animate-pulse"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <circle cx="10" cy="10" r="6" />
            </svg>
            <span>{label}</span>
            <span className="ml-auto bg-red-600 px-2 py-0.5 rounded text-sm uppercase">
              LIVE
            </span>
          </div>
          <div className="text-gray-300 mb-2">{start}</div>
          <button
            onClick={() => navigate(`/live/mlb/${ev.id}`)}
            className="inline-block bg-red-600 hover:bg-red-700 px-3 py-1 rounded font-semibold transition"
          >
            Watch Live
          </button>
        </li>
      );
    } else if (status === "pre_game") {
      return (
        <li key={ev.id} className="p-4 rounded mb-3 bg-gray-800 text-gray-400">
          <div className="mb-1">{label}</div>
          <div className="mb-2">{start} — Upcoming</div>
          <button
            disabled
            className="bg-gray-600 cursor-not-allowed px-3 py-1 rounded text-sm"
          >
            Watch Live
          </button>
        </li>
      );
    } else {
      return (
        <li
          key={ev.id}
          className="p-4 rounded mb-3 bg-gray-700 text-gray-500 italic"
        >
          <div className="mb-1">{label}</div>
          <div className="mb-2">{start} — Finished</div>
          <button
            disabled
            className="bg-gray-600 cursor-not-allowed px-3 py-1 rounded text-sm"
          >
            Watch Live
          </button>
        </li>
      );
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white p-6">
      <div className="max-w-4xl mx-auto">
        <header className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-extrabold tracking-wide">
            Welcome, {userName}
          </h1>

          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setShowDropdown(!showDropdown)}
              className="flex items-center justify-center w-10 h-10 bg-gray-700 hover:bg-gray-600 rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-400"
            >
              <User size={20} />
            </button>

            {showDropdown && (
              <div className="absolute right-0 mt-2 w-56 bg-gray-800 rounded-lg shadow-xl border border-gray-700 z-50">
                <div className="py-2">
                  <button
                    onClick={() => {
                      navigate("/profile");
                      setShowDropdown(false);
                    }}
                    className="flex items-center gap-3 w-full px-4 py-3 text-left hover:bg-gray-700 transition-colors duration-150"
                  >
                    <Edit size={16} />
                    <span>Edit Profile</span>
                  </button>

                  {/* Show Admin Panel button only for admin or developer */}
                  {(currentUser?.role === "admin" ||
                    currentUser?.role === "developer") && (
                    <button
                      onClick={() => {
                        navigate("/admin");
                        setShowDropdown(false);
                      }}
                      className="flex items-center gap-3 w-full px-4 py-3 text-left hover:bg-gray-700 transition-colors duration-150"
                    >
                      <User size={16} />
                      <span>Admin Panel</span>
                    </button>
                  )}

                  <button
                    onClick={() => {
                      handleLogout();
                      setShowDropdown(false);
                    }}
                    className="flex items-center gap-3 w-full px-4 py-3 text-left hover:bg-gray-700 transition-colors duration-150 border-t border-gray-700 text-red-400 hover:text-red-300"
                  >
                    <LogOut size={16} />
                    <span>Logout</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </header>

        <main>
          <nav className="flex space-x-4 mb-8 justify-center">
            <button className="px-6 py-2 text-lg font-semibold rounded-lg bg-blue-600 hover:bg-blue-700">
              MLB
            </button>
          </nav>

          {loading ? (
            <p className="text-center text-gray-400 text-lg mb-6">{loading}</p>
          ) : liveOrUpcomingGames.length === 0 ? (
            <p className="text-center text-gray-400 text-lg mb-6">
              No games to show for now. Please check back later.
            </p>
          ) : (
            <ul className="space-y-6">
              {liveOrUpcomingGames.map(renderGameItem)}
            </ul>
          )}
        </main>
      </div>
    </div>
  );
};

export default Dashboard;
