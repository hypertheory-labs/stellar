# Sample "Copy all for AI" output

*Generated from the same session state as `sample-snapshot.json`.*
*This is what an AI assistant receives when the developer clicks "Copy all for AI".*

---

## Stellar Devtools Snapshot — CounterStore

**Captured**: 2026-03-22 14:23:27 UTC
**Route**: /

### Current State
```json
{
  "count": 2,  // number
  "label": "Counter"  // string
}
```

### Recent History (last 2 transitions)

**#3** 14:23:27 UTC — [Counter] increment — click: "+"
  count: 1 → 2

**#2** 14:23:25 UTC — [Counter] increment — click: "+"
  count: 0 → 1

---

## Stellar Devtools Snapshot — UserStore

**Captured**: 2026-03-22 14:23:35 UTC
**Route**: /

### Current State
```json
{
  "name": "Jeff G.",  // string
  "loggedIn": true  // boolean
}
```

### Recent History (last 1 transitions)

**#2** 14:23:35 UTC — click: "Login"
  name: "Guest" → "Jeff G."
  loggedIn: false → true

---

## Stellar Devtools Snapshot — TodosStore

**Captured**: 2026-03-22 14:24:00 UTC
**Route**: /
**HTTP**: ← POST https://jsonplaceholder.typicode.com/todos (201, 320ms)

### Current State
```json
{
  "todos": [
    { "id": 1, "title": "delectus aut autem", "completed": false, "userId": 1 },
    { "id": 2, "title": "quis ut nam facilis et officia qui", "completed": true, "userId": 1 },
    { "id": 3, "title": "fugiat veniam minus", "completed": false, "userId": 1 },
    { "id": 4, "title": "et porro tempora", "completed": true, "userId": 1 },
    { "id": 5, "title": "laboriosam mollitia et enim quasi", "completed": false, "userId": 1 },
    { "id": 1742649640000, "title": "my new todo", "completed": false, "userId": 1 }
  ],  // array
  "loading": false,  // boolean
  "error": null  // null
}
```

### Recent History (last 3 transitions)

**#4** 14:24:00 UTC ← POST /todos (201, 320ms)
  todos: [5 items] → [6 items]

**#3** 14:23:40 UTC ← GET /todos?_limit=5 (200, 890ms)
  loading: true → false
  todos: [] → [5 items]

**#2** 14:23:40 UTC — click: "Load todos"
  loading: false → true

---

## HTTP Traffic

*2 request(s), most recent first*

**POST** `https://jsonplaceholder.typicode.com/todos` → 201 (320ms) 14:24:00 UTC — *click: "Add"*
  → TodosStore #4

**GET** `https://jsonplaceholder.typicode.com/todos?_limit=5` → 200 (890ms) 14:23:40 UTC — *click: "Load todos"*
  → TodosStore #3
