import { useState } from "react";
import SessionList from "./SessionList";
import SessionDetail from "./SessionDetail";
import EntriesPage from "./EntriesPage";

export default function SessionsPage() {
  const [view, setView] = useState("list");
  const [session, setSession] = useState(null);
  const [entryTab, setEntryTab] = useState("deposit");

  const openDetail = (s) => {
    setSession(s);
    setView("detail");
  };
  const openEntries = (s, tab) => {
    setSession(s);
    setEntryTab(tab);
    setView("entries");
  };
  const goBack = () => setView("list");
  const goDetail = () => setView("detail");

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column" }}>
      {view === "list" && <SessionList onOpen={openDetail} />}
      {view === "detail" && (
        <SessionDetail session={session} onBack={goBack} onOpenEntries={openEntries} />
      )}
      {view === "entries" && (
        <EntriesPage session={session} onBack={goDetail} defaultTab={entryTab} />
      )}
    </div>
  );
}
