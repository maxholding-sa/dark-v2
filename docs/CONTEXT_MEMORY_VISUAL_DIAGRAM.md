# 🎨 Chatbot Context Memory - Visual Flow Diagram

## Overall Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                      USER CONVERSATION                           │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                   ChatBot Component (UI)                         │
│  • Maintains conversation history                               │
│  • Passes history to backend on each message                    │
│  • Renders car cards from AI response                           │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│              getChatbotResponse() - Server Action                │
│  • Receives: message + conversationHistory                      │
│  • Returns: AI response + filtered cars                         │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│           searchCarsInDatabase() - Context Engine                │
│                                                                  │
│  ┌──────────────────────────────────────────────────────┐      │
│  │ Step 1: Detect Follow-up Query                       │      │
│  │ • Check for general keywords                         │      │
│  │ • Check message length (short = likely follow-up)    │      │
│  └──────────────────────────────────────────────────────┘      │
│                              │                                   │
│                              ▼                                   │
│  ┌──────────────────────────────────────────────────────┐      │
│  │ Step 2: Extract Context from History                 │      │
│  │ • Get last 3 user messages                           │      │
│  │ • Apply spelling correction                          │      │
│  │ • Combine with current query                         │      │
│  └──────────────────────────────────────────────────────┘      │
│                              │                                   │
│                              ▼                                   │
│  ┌──────────────────────────────────────────────────────┐      │
│  │ Step 3: Extract Filters                              │      │
│  │ • Car makes (Toyota, BMW, etc.)                      │      │
│  │ • Body types (SUV, sedan, etc.)                      │      │
│  │ • Fuel types (electric, hybrid)                      │      │
│  │ • Colors (red, black, white)                         │      │
│  │ • Models (Camry, Hilux, etc.)                        │      │
│  └──────────────────────────────────────────────────────┘      │
│                              │                                   │
│                              ▼                                   │
│  ┌──────────────────────────────────────────────────────┐      │
│  │ Step 4: Build Database Query                         │      │
│  │ WHERE status = "AVAILABLE"                           │      │
│  │   AND [maintained filters from context]             │      │
│  └──────────────────────────────────────────────────────┘      │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Database (Prisma)                           │
│  • Returns filtered cars based on context                       │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Gemini AI (Google)                            │
│  • Receives: prompt + car data + conversation history           │
│  • Generates: contextual response                               │
│  • Aware that car list is already filtered                      │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                        Response to User                          │
│  • Message text with bold formatting                            │
│  • Car cards (only relevant cars)                               │
│  • Context maintained for next message                          │
└─────────────────────────────────────────────────────────────────┘
```

## Decision Flow - Context Detection

```
                        User sends message
                              │
                              ▼
                  ┌───────────────────────┐
                  │  Is it a short query  │
                  │  with general words?  │
                  │  (متوفر، show، all)   │
                  └───────────────────────┘
                              │
                ┌─────────────┴─────────────┐
                │                           │
               YES                         NO
                │                           │
                ▼                           ▼
    ┌─────────────────────┐    ┌──────────────────────┐
    │ General Follow-up   │    │   Specific Search    │
    │ MAINTAIN FILTERS    │    │   NEW SEARCH         │
    └─────────────────────┘    └──────────────────────┘
                │                           │
                ▼                           ▼
    Get last 3 user messages    Extract filters from
    Extract all filters         current message only
    from conversation                     │
                │                          │
                └──────────┬───────────────┘
                           ▼
              Apply filters to database query
```

## Example Conversation Flow

```
┌────────────────────────────────────────────────────────────────┐
│ Message 1: User asks "سيارة عائلية" (family car)              │
└────────────────────────────────────────────────────────────────┘
                              │
                              ▼
                    Extract: bodyType = ["SUV", "van"]
                              │
                              ▼
                Database Query: bodyType IN ["SUV", "van"]
                              │
                              ▼
                    Returns: 5 family cars
                              │
                              ▼
        AI generates response about family cars
                              │
                              ▼
┌────────────────────────────────────────────────────────────────┐
│ Bot shows:                                                      │
│ • Toyota RAV4 (SUV) - $35,000                                  │
│ • Honda CR-V (SUV) - $32,000                                   │
│ • Kia Carnival (van) - $38,000                                 │
└────────────────────────────────────────────────────────────────┘
                              │
        Conversation history saved with:
        - User message: "سيارة عائلية"
        - Bot response: [text + 3 cars]
                              │
                              ▼
┌────────────────────────────────────────────────────────────────┐
│ Message 2: User asks "ايش السيارات المتوفرة؟"                │
│            (what cars are available?)                          │
└────────────────────────────────────────────────────────────────┘
                              │
                              ▼
              Detect: Short query with "متوفرة"
                   = GENERAL FOLLOW-UP
                              │
                              ▼
          Look back at conversation history
                              │
                              ▼
          Find: "سيارة عائلية" in Message 1
                              │
                              ▼
          Extract: bodyType = ["SUV", "van"]
                              │
                              ▼
          MAINTAIN FILTER: bodyType IN ["SUV", "van"]
                              │
                              ▼
                Database Query: bodyType IN ["SUV", "van"]
                              │
                              ▼
                    Returns: SAME 5 family cars
                              │
                              ▼
        AI understands context and responds appropriately
                              │
                              ▼
┌────────────────────────────────────────────────────────────────┐
│ Bot shows:                                                      │
│ "السيارات العائلية المتوفرة حالياً هي:"                       │
│ • Toyota RAV4 (SUV) - $35,000                                  │
│ • Honda CR-V (SUV) - $32,000                                   │
│ • Kia Carnival (van) - $38,000                                 │
└────────────────────────────────────────────────────────────────┘

✅ Context successfully maintained!
```

## Context Memory State Diagram

```
┌────────────────────┐
│   Initial State    │
│  No conversation   │
│  No context        │
└────────────────────┘
          │
          ▼
    User sends specific query
    (e.g., "سيارة عائلية")
          │
          ▼
┌────────────────────┐
│  Context Active    │
│  Filters stored:   │
│  • bodyType: SUV   │
│  • bodyType: van   │
└────────────────────┘
          │
    ┌─────┴─────┐
    │           │
    ▼           ▼
┌─────────┐ ┌──────────────┐
│ Follow  │ │ New Specific │
│   Up    │ │    Query     │
│ Query   │ │              │
└─────────┘ └──────────────┘
    │             │
    │             ▼
    │       ┌─────────────────┐
    │       │ Context Updated │
    │       │ New filters     │
    │       └─────────────────┘
    │             │
    └─────────────┘
          │
    Conversation continues...
```

## Key Components Interaction

```
┌──────────────────────────────────────────────────────────────┐
│                         Frontend                              │
│                                                               │
│  ┌─────────────────────────────────────────────────────┐    │
│  │          ChatBot.jsx Component                       │    │
│  │                                                      │    │
│  │  State:                                             │    │
│  │  • messages: [                                      │    │
│  │      {                                              │    │
│  │        sender: "user",                              │    │
│  │        text: "سيارة عائلية",                       │    │
│  │        timestamp: Date                              │    │
│  │      },                                             │    │
│  │      {                                              │    │
│  │        sender: "bot",                               │    │
│  │        text: "لدينا هذه السيارات...",              │    │
│  │        cars: [Car1, Car2, Car3],                   │    │
│  │        timestamp: Date                              │    │
│  │      }                                              │    │
│  │    ]                                                │    │
│  └─────────────────────────────────────────────────────┘    │
│                              │                               │
│                    On user sends message                     │
│                              │                               │
│                              ▼                               │
│             getChatbotResponse(message, history)             │
└──────────────────────────────────────────────────────────────┘
                               │
                               ▼
┌──────────────────────────────────────────────────────────────┐
│                         Backend                               │
│                                                               │
│  ┌─────────────────────────────────────────────────────┐    │
│  │       chatbot.js Server Action                       │    │
│  │                                                      │    │
│  │  1. Receive message + history                       │    │
│  │  2. Call searchCarsInDatabase()                     │    │
│  │     └─> Detect context                              │    │
│  │     └─> Extract filters                             │    │
│  │     └─> Query database                              │    │
│  │  3. Format cars for AI                              │    │
│  │  4. Call Gemini AI with context                     │    │
│  │  5. Parse AI response                               │    │
│  │  6. Save chat log                                   │    │
│  │  7. Return response + cars                          │    │
│  └─────────────────────────────────────────────────────┘    │
└──────────────────────────────────────────────────────────────┘
```

## Filter Extraction Logic

```
Input: "سيارة تويوتا دفع رباعي حمراء"
       (Red Toyota SUV)
       │
       ▼
┌──────────────────────┐
│ Spelling Correction  │
│ تويوتا ✓             │
└──────────────────────┘
       │
       ▼
┌──────────────────────┐
│  Extract Car Make    │
│  Found: toyota       │
└──────────────────────┘
       │
       ▼
┌──────────────────────┐
│ Extract Body Type    │
│ Found: دفع رباعي     │
└──────────────────────┘
       │
       ▼
┌──────────────────────┐
│  Extract Color       │
│  Found: أحمر         │
└──────────────────────┘
       │
       ▼
┌──────────────────────────────────┐
│  Build Database Query            │
│  WHERE status = "AVAILABLE"      │
│    AND make CONTAINS "toyota"    │
│    AND bodyType CONTAINS "دفع"   │
│    AND color CONTAINS "أحمر"     │
└──────────────────────────────────┘
```

## Context Maintenance Timeline

```
Time    User Message              Context State              DB Query
─────────────────────────────────────────────────────────────────────
t0      "سيارة عائلية"           bodyType: [SUV, van]       Filter: SUV|van
                                                             Returns: 5 cars

t1      "ايش المتوفر؟"           bodyType: [SUV, van]       Filter: SUV|van
        (follow-up detected)      ← MAINTAINED               Returns: 5 cars

t2      "فيه منها حمراء؟"        bodyType: [SUV, van]       Filter: SUV|van
        (follow-up detected)      color: [red]                 + red color
                                  ← MAINTAINED + ADDED       Returns: 2 cars

t3      "ابغى سيدان"             bodyType: [sedan]          Filter: sedan
        (new search detected)     ← RESET & NEW              Returns: 8 cars
```

---

**Legend:**
- `│` = Flow direction
- `▼` = Next step
- `┌─┐` = Component boundary
- `←` = Data flow

**Color Coding (if viewing in color-supported viewer):**
- 🟢 = Success path
- 🔵 = Data flow
- 🟡 = Decision point
- 🔴 = Error handling

