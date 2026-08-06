# Chat module (Firebase Realtime Database)

Real-time delivery no longer goes through a Socket.IO gateway. Instead:

1. Every write (`POST /chat/conversations/:id/messages`, `PATCH .../read`,
   `GET /chat/conversations/me`) is persisted to SQL as before, then mirrored
   into **Firebase Realtime Database** by `ChatRealtimeService`.
2. The user app and the admin dashboard authenticate with Firebase Auth (same
   ID tokens they already use for the REST API) and subscribe **directly** to
   Realtime Database with the Firebase client SDK — no socket connection to
   this server is needed.
3. SQL stays the source of truth. RTDB is a disposable, best-effort cache for
   live updates; if a mirror write ever fails, the data is still correct in
   SQL and will show up correctly on the next REST fetch.

## Data shape in Realtime Database

```
chats/
  conversations/{conversationId}: {
    userId, userDisplayName, lastMessagePreview, lastMessageAt,
    unreadByAdmin, unreadByUser, updatedAt
  }
  messages/{conversationId}/{messageId}: {
    senderId, senderRole, body, isRead, createdAt
  }
  userIndex/{userId}: conversationId
  typing/{conversationId}/{role}: timestamp   // optional, client-writable
```

## Required env vars

Already present in `.env`:

- `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY` — used
  by `firebase-admin` (server-side).
- `FIREBASE_DATABASE_URL` — e.g. `https://<project-id>-default-rtdb.firebaseio.com`.

## Security rules

Deploy `firebase-database.rules.json` (project root) to your Realtime
Database via the Firebase console or:

```bash
firebase deploy --only database
```

All writes are `false` (or restricted to the `typing` node) — clients only
ever read; every real write happens through this API using the Admin SDK,
which bypasses rules entirely.

## Admin vs. user access in the rules

The rules check `auth.token.role === 'admin'`. That claim is set server-side
whenever a role changes, via `UsersService` (`findOrCreateFromFirebase`,
`setRole`) and `AdminBootstrapService` calling
`getAuth().setCustomUserClaims(uid, { role })`.

**Caveat:** custom claims only apply to a Firebase ID token obtained *after*
the claim was set. If you promote a user to admin while they're logged in,
their current session's rules access won't reflect it until they force a
token refresh, e.g. on the client:

```js
await firebase.auth().currentUser.getIdToken(true); // force refresh
```

## Client usage (user or admin app)

```js
import { getDatabase, ref, onValue } from 'firebase/database';

const db = getDatabase();

// Live messages for one conversation
onValue(ref(db, `chats/messages/${conversationId}`), (snap) => {
  const messages = Object.entries(snap.val() ?? {})
    .map(([id, m]) => ({ id, ...m }))
    .sort((a, b) => a.createdAt - b.createdAt);
  // render...
});

// Admin: live list of all conversations (fetch the list via
// GET /chat/conversations once, then subscribe to each conversation node,
// or subscribe to `chats/conversations` as a whole for the inbox view)
onValue(ref(db, 'chats/conversations'), (snap) => {
  const conversations = Object.entries(snap.val() ?? {}).map(([id, c]) => ({
    id,
    ...c,
  }));
  // render inbox, sorted by lastMessageAt...
});
```

Sending a message is still a normal REST call (`POST
/chat/conversations/:id/messages`) — the response comes back over HTTP as
usual, and the RTDB mirror arrives ~instantly afterward for the other party.
