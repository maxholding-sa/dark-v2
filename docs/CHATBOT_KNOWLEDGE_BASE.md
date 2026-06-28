# Chatbot Knowledge Base Integration

## Overview

The Click Car AI chatbot now uses **real-time data from the Supabase database** as its knowledge base. This means the chatbot can provide accurate, up-to-date information about actual cars available on the platform, including prices, specifications, images, and direct links.

## Features

### 1. **Smart Car Search**
The chatbot can search for cars based on:
- **Car Make**: Audi, BMW, Mercedes, Toyota, Honda, etc. (supports Arabic and English)
- **Body Type**: SUV, Sedan, Hatchback, Convertible, Coupe
- **Fuel Type**: Electric, Hybrid, Gasoline, Diesel
- **Keywords**: Color, model, price range, features

### 2. **Average Price Calculation**
When users ask about average prices (e.g., "What's the average price of Audi cars?"), the chatbot:
- Calculates real-time average prices from available cars
- Shows minimum and maximum prices
- Displays the number of available cars

### 3. **Car Details Display**
For each relevant car, the chatbot provides:
- ✅ Make and Model
- ✅ Year
- ✅ Price (formatted with currency)
- ✅ Mileage
- ✅ Color
- ✅ Fuel Type
- ✅ Transmission Type
- ✅ Body Type
- ✅ Number of Seats
- ✅ Description
- ✅ Direct link to car details page
- ✅ Main image
- ✅ Featured badge (if applicable)

### 4. **Visual Car Cards**
The chatbot displays interactive car cards that include:
- Car thumbnail image
- Key specifications
- Price highlighted in green
- Featured badge for special listings
- Clickable link to full car details

## How It Works

### Database Query Process

1. **User Query Analysis**: The chatbot analyzes the user's message to identify search intent
2. **Database Search**: Searches the Supabase database for matching cars
3. **Result Formatting**: Formats up to 5 matching cars with full details
4. **AI Processing**: Sends car data + user query to Gemini AI
5. **Intelligent Response**: AI generates a natural language response with relevant car information
6. **UI Display**: Shows response text + interactive car cards

### Example Queries

#### Query 1: Asking about a specific car brand
```
User: "أريد أن أعرف عن سيارات أودي المتوفرة"
(I want to know about available Audi cars)

Response:
- Text: Conversational response about Audi cars
- Cards: Up to 3 Audi cars with images, prices, and links
```

#### Query 2: Asking about average price
```
User: "ما هو متوسط سعر سيارات مرسيدس؟"
(What is the average price of Mercedes cars?)

Response:
- Average price calculation
- Price range (min-max)
- Number of available cars
- Individual car listings with details
```

#### Query 3: Searching by body type
```
User: "هل لديكم سيارات دفع رباعي؟"
(Do you have SUV cars?)

Response:
- List of available SUVs
- Each with full specifications
- Direct links to view details
```

#### Query 4: Fuel type search
```
User: "أبحث عن سيارات كهربائية"
(I'm looking for electric cars)

Response:
- All available electric cars
- Specifications and prices
- Direct links to each car
```

## Technical Implementation

### Backend (`src/actions/chatbot.js`)

#### Key Functions:

1. **`searchCarsInDatabase(query)`**
   - Analyzes user query
   - Builds dynamic search conditions
   - Supports Arabic and English terms
   - Returns up to 5 matching cars
   - Prioritizes featured cars

2. **`getAveragePriceByMake(make)`**
   - Calculates average price for a car brand
   - Returns min, max, average, and count
   - Only considers available cars

3. **`formatCarsForAI(cars)`**
   - Formats car data for AI context
   - Includes all specifications
   - Adds car URLs and images
   - Marks featured cars

4. **`getChatbotResponse(message, conversationHistory)`**
   - Main chatbot function
   - Searches database
   - Formats context for AI
   - Generates intelligent response
   - Returns response + car data

5. **`getCarRecommendations(preferences)`**
   - Gets available cars from database
   - Uses AI to match preferences
   - Returns top 3 recommendations with links

### Frontend (`src/components/ChatBot.jsx`)

#### Key Features:

1. **Message State Enhancement**
   ```javascript
   {
     id: number,
     text: string,
     sender: "user" | "bot",
     timestamp: Date,
     cars: Array<Car> // New: Contains car data
   }
   ```

2. **Car Card Display**
   - Shows up to 3 cars per message
   - Thumbnail image with fallback
   - Key specifications
   - Price highlighting
   - Featured badge
   - Clickable link to full details

3. **Responsive Design**
   - Works on mobile and desktop
   - Smooth animations
   - Proper overflow handling

## Database Schema

The chatbot queries the `Car` table with these fields:
```prisma
model Car {
  id           String   @id @default(uuid())
  make         String   // e.g., "audi", "bmw"
  model        String   // e.g., "A4", "X5"
  year         Int      // e.g., 2024
  price        Decimal  // Car price in USD
  mileage      Int      // In kilometers
  color        String   // e.g., "أبيض", "أسود"
  fuelType     String   // e.g., "بنزين", "كهربائي"
  transmission String   // e.g., "أوتوماتيك", "يدوي"
  bodyType     String   // e.g., "دفع رباعي", "سيدان"
  seats        Int?     // Number of seats
  description  String   // Full description
  status       CarStatus // AVAILABLE, UNAVAILABLE, SOLD
  featured     Boolean  // Featured car flag
  images       String[] // Array of image URLs
  createdAt    DateTime
  updatedAt    DateTime
}
```

## Search Algorithm

### Multi-language Support
The chatbot supports both Arabic and English terms:

```javascript
const carMakes = [
  { ar: "اودي", en: "audi" },
  { ar: "بي ام دبليو", en: "bmw" },
  { ar: "مرسيدس", en: "mercedes" },
  // ... more brands
];
```

### Search Priority
1. ✅ Exact brand matches
2. ✅ Body type matches
3. ✅ Fuel type matches
4. ✅ Broad text search (make, model, description, color)

### Filtering
- Only shows cars with `status: "AVAILABLE"`
- Orders by: Featured → Creation Date (newest first)
- Limits to 5 results to avoid overwhelming the AI

## Configuration

### Environment Variables Required
```env
GEMINI_API_KEY=your_gemini_api_key
DATABASE_URL=your_postgres_connection_string
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
NEXT_PUBLIC_BASE_URL=http://localhost:3000 # or your production URL
```

### AI Model Settings
- Model: `gemini-2.5-flash`
- Temperature: Default
- Context Window: Last 6 messages
- Max Cars per Response: 5

## Benefits

### For Users
✅ **Accurate Information**: Real data from your database, not generic responses
✅ **Visual Browsing**: See car images and specs directly in chat
✅ **Quick Navigation**: Click car cards to view full details
✅ **Price Transparency**: Real-time prices and averages
✅ **Smart Search**: Natural language queries in Arabic or English

### For Business
✅ **Increased Engagement**: Interactive car browsing in chat
✅ **Better Conversion**: Direct links from chat to car details
✅ **Reduced Support Load**: AI handles common queries automatically
✅ **Data-Driven**: Uses your actual inventory
✅ **Always Up-to-Date**: Reflects current availability and prices

## Limitations & Future Enhancements

### Current Limitations
- Maximum 5 cars per search (to avoid context overflow)
- Only shows available cars
- English database records with Arabic translations

### Planned Enhancements
1. ⏳ Price range filtering ("cars under $50,000")
2. ⏳ Sorting options (price, year, mileage)
3. ⏳ Saved searches and favorites
4. ⏳ Comparison between multiple cars
5. ⏳ Test drive booking directly from chat
6. ⏳ Financing calculator integration
7. ⏳ Similar car recommendations

## Testing Examples

### Test Case 1: Brand Search
```
Input: "أبحث عن سيارات أودي"
Expected: List of Audi cars with specs and prices
```

### Test Case 2: Price Query
```
Input: "what is the average price of BMW cars"
Expected: Average price + price range + car listings
```

### Test Case 3: Body Type
```
Input: "هل لديكم دفع رباعي"
Expected: List of SUV cars
```

### Test Case 4: Electric Cars
```
Input: "سيارات كهربائية"
Expected: List of electric vehicles
```

### Test Case 5: General Query
```
Input: "أريد سيارة عائلية مريحة"
Expected: AI suggests sedans/SUVs with good seating
```

## Maintenance

### Regular Tasks
1. ✅ Monitor chatbot response accuracy
2. ✅ Update car make/model mappings as needed
3. ✅ Optimize search queries for performance
4. ✅ Review and improve AI prompts
5. ✅ Ensure database indexes are optimal

### Performance Optimization
- Uses database indexes on: make, model, bodyType, price, year, status
- Limits query results to prevent slow responses
- Caches conversation history (last 6 messages only)

## Support

For issues or questions:
1. Check that all environment variables are set
2. Ensure database connection is working
3. Verify Gemini API key is valid
4. Check console logs for error messages

---

**Last Updated**: November 7, 2025
**Version**: 1.0.0
