import { useEffect, useState } from "react";
import { collection, onSnapshot, orderBy, query } from "firebase/firestore";
import { db } from "../firebase/config";

/**
 * Subscribes to a Firestore collection in realtime and returns its documents as
 * plain objects (with `id`). Pass `pathSegments` as `null`/`undefined`/containing a
 * falsy segment (e.g. while `uid` isn't known yet) to skip subscribing.
 *
 *   const companies = useFirestoreCollection(uid && ["users", uid, "companies"], {
 *     orderByField: "createdAt",
 *   });
 */
export function useFirestoreCollection(pathSegments, { orderByField, direction = "desc" } = {}) {
  const [items, setItems] = useState([]);
  const ready = Array.isArray(pathSegments) && pathSegments.every(Boolean);
  const pathKey = ready ? pathSegments.join("/") : "";

  useEffect(() => {
    if (!ready) return;
    const ref = collection(db, ...pathSegments);
    const q = orderByField ? query(ref, orderBy(orderByField, direction)) : ref;
    const unsub = onSnapshot(q, (snap) => {
      setItems(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
    return unsub;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathKey, orderByField, direction]);

  // Never expose a stale/previous subscription's items once the path isn't ready.
  return ready ? items : [];
}
