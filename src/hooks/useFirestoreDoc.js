import { useEffect, useState } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "../firebase/config";

/**
 * Subscribes to a single Firestore document in realtime. Returns `null` while
 * loading, while not ready (falsy/missing path segment), or if the document
 * doesn't exist yet.
 *
 *   const settings = useFirestoreDoc(uid && ["users", uid, "salesSettings", "main"]);
 */
export function useFirestoreDoc(pathSegments) {
  const [data, setData] = useState(null);
  const ready = Array.isArray(pathSegments) && pathSegments.every(Boolean);
  const pathKey = ready ? pathSegments.join("/") : "";

  useEffect(() => {
    if (!ready) return;
    const ref = doc(db, ...pathSegments);
    const unsub = onSnapshot(ref, (snap) => {
      setData(snap.exists() ? { id: snap.id, ...snap.data() } : null);
    });
    return unsub;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathKey]);

  return ready ? data : null;
}
