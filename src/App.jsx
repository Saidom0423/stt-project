import { useEffect, useRef, useState } from "react";
import { supabase } from "./supabase";

const API_BASE = import.meta.env.VITE_API_URL;

export default function App() {
  /* ---------------- STATE ---------------- */
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [file, setFile] = useState(null);
  const [transcript, setTranscript] = useState("");
  const [history, setHistory] = useState([]);

  const [loading, setLoading] = useState(false);
  const [recording, setRecording] = useState(false);
  const [toast, setToast] = useState("");
  const [dark, setDark] = useState(true);

  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);

  /* ---------------- TOAST ---------------- */
  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(""), 3000);
  };

  /* ---------------- AUTH STATE ---------------- */
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setUser(data?.session?.user || null);
      setAuthLoading(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setUser(session?.user || null);
      }
    );

    return () => listener.subscription.unsubscribe();
  }, []);

  /* ---------------- DATA ---------------- */
  const fetchHistory = async (uid) => {
    try {
      const res = await fetch(`${API_BASE}/history`, {
        headers: { "x-user-id": uid },
      });
      const data = await res.json();
      setHistory(data);
    } catch {
      showToast("Failed to load history");
    }
  };

  useEffect(() => {
    if (user) fetchHistory(user.id);
  }, [user]);

  /* ---------------- AUTH ACTIONS ---------------- */
  const signIn = async () => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) showToast(error.message);
  };

  const signUp = async () => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
    });
    if (error) showToast(error.message);
    else showToast("Check email to confirm signup");
  };

  const logout = async () => {
    await supabase.auth.signOut();
  };

  /* ---------------- UPLOAD ---------------- */
  const uploadAudio = async () => {
    if (!file) return showToast("Please select an audio file");

    setLoading(true);
    setTranscript("");

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
      showToast(err.message);
    } finally {
      setLoading(false);
    }
  };

  /* ---------------- DELETE ---------------- */
  const deleteHistory = async (id) => {
    try {
      const res = await fetch(`${API_BASE}/history/${id}`, {
        method: "DELETE",
        headers: { "x-user-id": user.id },
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setHistory((prev) => prev.filter((item) => item._id !== id));
      showToast("Deleted successfully");
    } catch (err) {
      showToast(err.message || "Delete failed");
    }
  };

  /* ---------------- RECORD ---------------- */
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream);
      audioChunksRef.current = [];

      mediaRecorderRef.current.ondataavailable = (e) =>
        audioChunksRef.current.push(e.data);

      mediaRecorderRef.current.onstop = async () => {
        setLoading(true);
        setTranscript("");

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
          showToast(err.message);
        } finally {
          setLoading(false);
        }
      };

      mediaRecorderRef.current.start();
      setRecording(true);
    } catch {
      showToast("Microphone permission denied");
    }
  };

  const stopRecording = () => {
    mediaRecorderRef.current.stop();
    setRecording(false);
  };

  /* ---------------- LOADING ---------------- */
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black text-white">
        Loading…
      </div>
    );
  }

  /* ---------------- LOGIN ---------------- */
  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-black to-gray-900">
        <div className="bg-white/90 backdrop-blur p-8 rounded-2xl w-80 shadow-2xl">
          <h1 className="text-2xl font-bold mb-6 text-center">
            🎙️ Speech<span className="text-indigo-600">2</span>Text
          </h1>

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
            className="w-full bg-indigo-600 text-white py-2 rounded mb-2"
          >
            Sign In
          </button>

          <button
            onClick={signUp}
            className="w-full border py-2 rounded"
          >
            Sign Up
          </button>
        </div>
      </div>
    );
  }

  /* ---------------- MAIN UI ---------------- */
  return (
    <div
      className={`min-h-screen ${
        dark ? "bg-gray-950 text-white" : "bg-gray-100 text-black"
      }`}
    >
      {/* Header */}
      <header className="flex justify-between items-center px-6 py-4 border-b border-gray-800">
        <h1 className="font-bold text-lg">🎙️ Speech2Text</h1>
        <div className="flex gap-4 items-center">
          <button onClick={() => setDark(!dark)}>🌙</button>
          <button onClick={logout} className="text-sm text-red-400">
            Logout
          </button>
        </div>
      </header>

      <main className="max-w-3xl mx-auto p-6 space-y-6">
        {/* Upload / Record */}
        <div className="bg-gray-900 p-6 rounded-2xl shadow-xl">
          <input
            type="file"
            accept="audio/*"
            onChange={(e) => setFile(e.target.files[0])}
          />

          <button
            onClick={uploadAudio}
            disabled={loading || recording}
            className="ml-3 px-4 py-2 bg-indigo-600 rounded text-white disabled:opacity-50"
          >
            Upload
          </button>

          <div className="mt-4">
            {!recording ? (
              <button
                onClick={startRecording}
                className="px-4 py-2 bg-emerald-600 rounded text-white"
              >
                🎙️ Start Recording
              </button>
            ) : (
              <button
                onClick={stopRecording}
                className="px-4 py-2 bg-red-600 rounded text-white animate-pulse"
              >
                ⏹️ Stop Recording
              </button>
            )}
          </div>

          {loading && (
            <div className="mt-4 h-3 bg-gray-700 rounded animate-pulse" />
          )}
        </div>

        {/* Transcript */}
        {transcript && (
          <div className="bg-gradient-to-r from-indigo-600 to-purple-600 p-5 rounded-2xl shadow-xl">
            <h2 className="font-semibold mb-2">✨ Latest Transcript</h2>
            <p className="leading-relaxed">{transcript}</p>
          </div>
        )}

        {/* History */}
        <h2 className="text-xl font-semibold">History</h2>

        {history.length === 0 && (
          <p className="text-sm text-gray-400">
            No transcriptions yet 🎧
          </p>
        )}

        <div className="space-y-3">
          {history.map((h) => (
            <div
              key={h._id}
              className="bg-gray-900 p-4 rounded-xl flex justify-between items-start"
            >
              <div>
                <p>{h.text}</p>
                <p className="text-xs text-gray-500">
                  {new Date(h.createdAt).toLocaleString()}
                </p>
              </div>
              <button
                onClick={() => deleteHistory(h._id)}
                className="text-sm text-red-400 hover:text-red-500"
              >
                Delete
              </button>
            </div>
          ))}
        </div>
      </main>

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-black text-white px-4 py-2 rounded-xl shadow-xl">
          {toast}
        </div>
      )}
    </div>
  );
}
