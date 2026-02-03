import { useEffect, useRef, useState } from "react";
import { supabase } from "./supabase";

const API_BASE = import.meta.env.VITE_API_URL;

export default function App() {
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [file, setFile] = useState(null);
  const [transcript, setTranscript] = useState("");
  const [history, setHistory] = useState([]);

  const [loading, setLoading] = useState(false);
  const [recording, setRecording] = useState(false);
  const [error, setError] = useState("");

  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);

  // ---------------- AUTH STATE ----------------
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setUser(data?.session?.user || null);
      setAuthLoading(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setUser(session?.user || null);
        setAuthLoading(false);
      }
    );

    return () => {
      listener.subscription.unsubscribe();
    };
  }, []);

  // ---------------- DATA ----------------
  const fetchHistory = async (uid) => {
    try {
      const res = await fetch(`${API_BASE}/history`, {
        headers: { "x-user-id": uid },
      });
      const data = await res.json();
      setHistory(data);
    } catch {
      setError("Failed to load history");
    }
  };

  useEffect(() => {
    if (user) fetchHistory(user.id);
  }, [user]);

  // ---------------- AUTH ----------------
  const signIn = async () => {
    setError("");
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) setError(error.message);
  };

  const signUp = async () => {
    setError("");
    const { error } = await supabase.auth.signUp({
      email,
      password,
    });
    if (error) setError(error.message);
    else alert("Check your email to confirm signup");
  };

  const logout = async () => {
    await supabase.auth.signOut();
  };

  // ---------------- UPLOAD ----------------
  const uploadAudio = async () => {
    if (!file) return setError("Please select an audio file");

    setLoading(true);
    setTranscript("");
    setError("");

    const formData = new FormData();
    formData.append("audio", file);

    try {
      const res = await fetch(`${API_BASE}/transcribe`, {
        method: "POST",
        headers: { "x-user-id": user.id },
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setTranscript(data.transcript);
      fetchHistory(user.id);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // ---------------- DELETE ----------------
  const deleteHistory = async (id) => {
    if (!confirm("Delete this transcription?")) return;

    try {
      const res = await fetch(`${API_BASE}/history/${id}`, {
        method: "DELETE",
        headers: { "x-user-id": user.id },
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setHistory((prev) => prev.filter((item) => item._id !== id));
    } catch (err) {
      setError(err.message);
    }
  };

  // ---------------- RECORD ----------------
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream);
      audioChunksRef.current = [];

      mediaRecorderRef.current.ondataavailable = (e) => {
        audioChunksRef.current.push(e.data);
      };

      mediaRecorderRef.current.onstop = async () => {
        setLoading(true);
        setTranscript("");
        setError("");

        const audioBlob = new Blob(audioChunksRef.current, {
          type: "audio/webm",
        });

        const formData = new FormData();
        formData.append("audio", audioBlob, "recording.webm");

        try {
          const res = await fetch(`${API_BASE}/transcribe`, {
            method: "POST",
            headers: { "x-user-id": user.id },
            body: formData,
          });

          const data = await res.json();
          if (!res.ok) throw new Error(data.error);

          setTranscript(data.transcript);
          fetchHistory(user.id);
        } catch (err) {
          setError(err.message);
        } finally {
          setLoading(false);
        }
      };

      mediaRecorderRef.current.start();
      setRecording(true);
    } catch {
      setError("Microphone permission denied");
    }
  };

  const stopRecording = () => {
    mediaRecorderRef.current.stop();
    setRecording(false);
  };

  // ---------------- LOADING ----------------
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black text-white">
        <p>Loading…</p>
      </div>
    );
  }

  // ---------------- LOGIN ----------------
  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <div className="bg-white p-8 rounded-xl w-80">
          <h1 className="text-2xl font-bold mb-6 text-center">
            🎙️ Speech-to-Text
          </h1>

          {error && (
            <div className="bg-red-100 text-red-700 p-2 mb-3 rounded text-sm">
              {error}
            </div>
          )}

          <input
            className="border p-2 rounded w-full mb-3"
            placeholder="Email"
            onChange={(e) => setEmail(e.target.value)}
          />
          <input
            className="border p-2 rounded w-full mb-4"
            type="password"
            placeholder="Password"
            onChange={(e) => setPassword(e.target.value)}
          />

          <button
            onClick={signIn}
            className="w-full bg-black text-white py-2 rounded mb-2"
          >
            Sign In
          </button>

          <button onClick={signUp} className="w-full border py-2 rounded">
            Sign Up
          </button>
        </div>
      </div>
    );
  }

  // ---------------- MAIN UI ----------------
  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-black text-white p-4 flex justify-between">
        <h1>🎙️ Speech-to-Text</h1>
        <button onClick={logout} className="text-sm">
          Logout
        </button>
      </header>

      <main className="max-w-4xl mx-auto p-6">
        {error && (
          <div className="bg-red-100 text-red-700 p-3 mb-4 rounded">
            {error}
          </div>
        )}

        <div className="bg-white p-6 rounded-xl shadow mb-6">
          <input
            type="file"
            accept="audio/*"
            onChange={(e) => setFile(e.target.files[0])}
          />

          <button
            onClick={uploadAudio}
            disabled={loading || recording}
            className="ml-2 px-4 py-2 bg-black text-white rounded"
          >
            Upload
          </button>

          <div className="mt-4">
            {!recording ? (
              <button
                onClick={startRecording}
                className="border px-4 py-2 rounded"
              >
                🎙️ Start Recording
              </button>
            ) : (
              <button
                onClick={stopRecording}
                className="bg-red-500 text-white px-4 py-2 rounded"
              >
                ⏹️ Stop Recording
              </button>
            )}
          </div>

          {loading && (
            <p className="text-sm text-gray-500 mt-2">Transcribing…</p>
          )}
        </div>

        {transcript && (
          <div className="bg-white p-4 rounded shadow mb-6">
            <h2 className="font-semibold mb-1">Latest Transcript</h2>
            <p>{transcript}</p>
          </div>
        )}

        <h2 className="text-xl font-semibold mb-3">History</h2>
        <div className="space-y-3">
          {history.map((h) => (
            <div
              key={h._id}
              className="bg-white p-4 rounded shadow flex justify-between"
            >
              <div>
                <p>{h.text}</p>
                <p className="text-xs text-gray-500">
                  {new Date(h.createdAt).toLocaleString()}
                </p>
              </div>
              <button
                onClick={() => deleteHistory(h._id)}
                className="text-red-500 text-sm"
              >
                Delete
              </button>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
