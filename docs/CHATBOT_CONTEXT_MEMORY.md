# 🧠 Chatbot Context Memory - Smart Follow-up Query Handling

## Overview

The chatbot now has **intelligent context memory** that maintains search filters from previous messages when users ask follow-up questions.

## Problem Solved

### Before (❌ Old Behavior):
```
User: "سيارة عائلية" (family car)
Bot: Shows 5 family SUVs/vans

User: "ايش السيارات المتوفرة؟" (what cars are available?)
Bot: Shows ALL cars in database (sedans, sports, SUVs, etc.)
```

### After (✅ New Behavior):
```
User: "سيارة عائلية" (family car)
Bot: Shows 5 family SUVs/vans

User: "ايش السيارات المتوفرة؟" (what cars are available?)
Bot: Shows ONLY family SUVs/vans (maintains context)
```

## How It Works

### 1. **Context Detection**
The system detects when a user asks a general follow-up question by looking for keywords like:
- Arabic: `متوفر`, `متاح`, `عرض`, `اعرض`, `كل`, `جميع`, `السيارات`, `ايه`, `ايش`
- English: `available`, `show`, `all`, `cars`, `what`

### 2. **Context Extraction**
When a follow-up is detected, the system:
- Looks back at the **last 3 user messages**
- Extracts search criteria (make, model, body type, color, fuel type)
- Applies spelling correction to all previous messages
- Combines criteria from conversation history

### 3. **Smart Filtering**
The database query maintains filters from previous context:
```javascript
// If user previously searched "سيارة عائلية"
// The system extracts: bodyType = "دفع رباعي" OR "SUV"

// When user asks "what cars available?"
// Query maintains: status=AVAILABLE AND bodyType IN ["دفع رباعي", "SUV"]
```

### 4. **AI Context Awareness**
The AI model receives:
- Previous conversation history (last 6 messages)
- Previously shown cars
- Filtered results based on context
- Special instruction to maintain context

## Examples

### Example 1: Body Type Context
```
User: "سيارة عائلية"
System: Finds SUVs and vans
Bot: "لدينا هذه السيارات العائلية المتوفرة..."

User: "كم سعرها؟"
System: Maintains SUV/van filter + looks for price info
Bot: "أسعار السيارات العائلية المعروضة تتراوح بين..."
```

### Example 2: Brand Context
```
User: "تويوتا"
System: Finds Toyota cars
Bot: "لدينا هذه سيارات تويوتا..."

User: "ايش المتوفر منها؟"
System: Maintains Toyota filter
Bot: "المتوفر من تويوتا حالياً..."
```

### Example 3: Combined Context
```
User: "سيارة تويوتا عائلية"
System: Finds Toyota + SUV/van
Bot: Shows Toyota SUVs

User: "فيه منها احمر؟"
System: Maintains Toyota + SUV/van + adds red color filter
Bot: Shows red Toyota SUVs
```

## Technical Implementation

### Key Functions

#### `searchCarsInDatabase(query, conversationHistory)`
Located in: `src/actions/chatbot.js`

**New Logic:**
```javascript
// 1. Detect if current query is a general follow-up
const isGeneralFollowUp = generalFollowUpQueries.some(term => searchTerms.includes(term)) 
  && searchTerms.split(/\s+/).length <= 4;

// 2. If follow-up, use conversation history context
if (isGeneralFollowUp && recentUserMessages.length > 0) {
  contextualSearchTerms = `${recentUserMessages} ${searchTerms}`;
  maintainPreviousFilters = true;
}

// 3. Extract filters from contextual search terms
// (make, model, bodyType, fuelType, color, etc.)

// 4. Build database query with maintained filters
const cars = await db.car.findMany({
  where: {
    status: "AVAILABLE",
    AND: [...contextFilters] // Filters from conversation history
  }
});
```

### AI Prompt Enhancement

The AI system prompt now includes:
```javascript
`**🔥 مهم جداً: عندما يسأل العميل "ما السيارات المتوفرة؟" أو "اعرض لي السيارات"، 
انظر للسياق - إذا كان قد طلب قبل ذلك نوع معين (مثل سيارة عائلية، دفع رباعي، تويوتا، إلخ)، 
فاعرض فقط السيارات التي تطابق ذلك النوع من القائمة أدناه**

**السيارات المعروضة أدناه هي بالفعل مصفاة بناءً على سياق المحادثة**`
```

## Supported Context Types

The system maintains context for:

✅ **Car Make** (e.g., Toyota, BMW, Mercedes)
✅ **Body Type** (e.g., SUV, sedan, hatchback)  
✅ **Fuel Type** (e.g., electric, hybrid)
✅ **Color** (e.g., red, black, white)
✅ **Transmission** (e.g., automatic, manual)
✅ **Model Names** (e.g., Camry, Hilux, Corolla)

## Testing

Run the test script to see context memory in action:
```bash
npm run test-context-memory
```

Or manually:
```bash
node test-context-memory.mjs
```

### What the test does:
1. Simulates user searching "سيارة عائلية"
2. Checks what cars are returned
3. User asks "ايش السيارات المتوفرة؟"
4. Verifies that ONLY family cars are shown (context maintained)

## Logs to Watch

When testing, watch for these console logs:

```
🔍 searchCarsInDatabase called with query: ايش السيارات المتوفرة؟
✏️ Corrected query: No corrections needed
🎯 General follow-up detected, maintaining context from previous search
📚 Using contextual search terms from conversation history
🔒 Maintaining previous search filters from context
✅ Matched body type: دفع رباعي
✅ 1 filter group(s) applied to search
🎯 Successfully maintained context filters from previous conversation
📊 Database returned 3 cars
```

## Edge Cases Handled

### Case 1: No Previous Context
```
User: "ايش عندكم؟" (first message, no context)
System: Shows featured/recent cars (no filters to maintain)
```

### Case 2: Context Too Old
```
User: "سيارة عائلية"
... (10 messages about other topics)
User: "ايش المتوفر؟"
System: Only looks at last 3 user messages (context too old, ignored)
```

### Case 3: Explicit New Search
```
User: "سيارة عائلية"
Bot: Shows SUVs

User: "لا، ابغى سيدان" (No, I want sedan)
System: Recognizes this is NOT a follow-up, starts new search
Bot: Shows sedans
```

## Configuration

### Conversation History Depth
Currently set to **last 3 user messages**. Can be adjusted:
```javascript
// In searchCarsInDatabase()
const recentUserMessages = conversationHistory
  .filter(msg => msg.sender === "user")
  .slice(-3)  // Change this number to adjust depth
```

### Follow-up Detection Words
Add more detection keywords:
```javascript
const generalFollowUpQueries = [
  "متوفر", "متاح", "available", "show", 
  "عرض", "اعرض", "كل", "جميع", "all", 
  "السيارات", "cars", "ايه", "ايش", "what",
  // Add more here...
];
```

## Benefits

✅ **Better User Experience** - Users don't need to repeat themselves
✅ **Natural Conversation** - Mimics human conversation flow
✅ **Reduced Confusion** - Results stay relevant to user's search intent
✅ **Smarter AI** - AI understands context across multiple messages
✅ **Accurate Results** - Database queries maintain proper filters

## Future Enhancements

Potential improvements:
- 🔮 Add explicit "reset context" command (e.g., "ابدأ بحث جديد")
- 🔮 Track multiple parallel contexts (e.g., comparing two car types)
- 🔮 Add context expiry based on time, not just message count
- 🔮 Visual indicator in UI showing active search context
- 🔮 "Edit search" feature to modify specific filters

## Related Files

- `src/actions/chatbot.js` - Main chatbot logic with context handling
- `test-context-memory.mjs` - Test script for context memory
- `src/components/ChatBot.jsx` - UI component (maintains conversation history)

---

**Last Updated:** November 8, 2025  
**Version:** 1.0  
**Feature Status:** ✅ Active
