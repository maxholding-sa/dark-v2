# AI Chatbot Integration with Gemini AI

## Overview
The Crown Auto chatbot is now powered by Google's Gemini AI, providing intelligent, context-aware responses to user queries about cars, test drives, and platform features.

## Features

### ✨ Intelligent Responses
- **Context-Aware**: Maintains conversation history for more natural interactions
- **Arabic Language Support**: Responds in clear, professional Arabic
- **Car Expertise**: Specialized knowledge about car brands, models, and features
- **Platform-Specific**: Understands Crown Auto services and features

### 🚗 Capabilities
The chatbot can help with:
- Finding the right car based on preferences
- Information about car brands (Toyota, BMW, Mercedes, Hyundai, etc.)
- Electric and hybrid vehicle inquiries
- Test drive booking assistance
- Pricing information
- Used vs. new car comparisons
- Financing options
- Platform features and services

### 📱 User Experience
- **Responsive Design**: Works seamlessly on desktop and mobile
- **Real-time Responses**: Fast AI-powered replies
- **Typing Indicators**: Shows when the bot is processing
- **Conversation History**: Maintains context across messages
- **Error Handling**: Graceful fallback messages if API fails

## Technical Implementation

### Files Created/Modified

#### 1. `/src/actions/chatbot.js`
Server action that handles Gemini AI integration:
- `getChatbotResponse()`: Main function for chat responses
- `getCarRecommendations()`: Generate car recommendations based on preferences
- Implements conversation context management
- Error handling and fallback responses

#### 2. `/src/components/ChatBot.jsx`
Updated to integrate with Gemini AI:
- Calls server action for AI responses
- Manages conversation state
- Handles API errors gracefully
- Fully responsive design

### Environment Variables Required

```env
GEMINI_API_KEY=your_gemini_api_key_here
```

Already configured in your `.env` file.

## How It Works

### 1. User Flow
```
User types message → ChatBot component
    ↓
Server Action (getChatbotResponse)
    ↓
Gemini AI API
    ↓
AI Response → Displayed to user
```

### 2. Context Management
The chatbot maintains the last 6 messages of conversation history to provide context-aware responses. This allows for more natural, flowing conversations.

### 3. System Prompt
The AI is configured with detailed context about:
- Click Car AI platform features
- Available car brands and services
- Test drive booking process
- Financing options
- Customer support guidelines

### 4. Response Guidelines
The AI follows specific rules:
- Use clear, simple Arabic
- Be friendly and professional
- Keep responses concise (2-3 sentences typically)
- Use emojis sparingly for friendliness
- Suggest contacting support for uncertain information

## API Features

### `getChatbotResponse(message, conversationHistory)`
**Parameters:**
- `message` (string): User's current message
- `conversationHistory` (array): Array of previous messages for context

**Returns:**
```javascript
{
  success: boolean,
  message: string,
  error?: string
}
```

### `getCarRecommendations(preferences)`
**Parameters:**
- `preferences` (string): User preferences for car recommendations

**Returns:**
```javascript
{
  success: boolean,
  recommendations: string,
  message?: string
}
```

## Usage Examples

### Basic Chat
```javascript
const result = await getChatbotResponse(
  "أبحث عن سيارة عائلية",
  conversationHistory
);
```

### Get Recommendations
```javascript
const result = await getCarRecommendations(
  "سيارة عائلية، 7 مقاعد، استهلاك وقود جيد"
);
```

## Error Handling

The chatbot includes multiple layers of error handling:

1. **API Errors**: Catches Gemini API failures
2. **Network Errors**: Handles connection issues
3. **Fallback Messages**: Provides helpful messages when AI is unavailable
4. **User Feedback**: Clear error communication in Arabic

## Performance Considerations

- **Conversation Limit**: Only last 6 messages sent for context (reduces token usage)
- **Async Operations**: Non-blocking API calls
- **Loading States**: Visual feedback during processing
- **Optimized Prompts**: Efficient token usage with clear instructions

## Testing Suggestions

Test the chatbot with these sample queries:

### Arabic Queries
- "أبحث عن سيارة تويوتا"
- "ما هي أسعار السيارات المتوفرة؟"
- "كيف أحجز اختبار قيادة؟"
- "أريد سيارة كهربائية"
- "ما الفرق بين السيارات الجديدة والمستعملة؟"

### English Queries
- "I'm looking for a BMW"
- "Tell me about electric cars"
- "How do I book a test drive?"

## Future Enhancements

Potential improvements:
- [ ] Voice input/output
- [ ] Image-based car search
- [ ] Multilingual support
- [ ] Personalized recommendations based on user history
- [ ] Integration with car database for real-time availability
- [ ] Appointment scheduling directly through chat
- [ ] Price comparison tools
- [ ] Financing calculator integration

## Troubleshooting

### Common Issues

**Issue**: API responses are slow
- **Solution**: Check internet connection and Gemini API status

**Issue**: Bot returns fallback messages
- **Solution**: Verify GEMINI_API_KEY in environment variables

**Issue**: Context not maintained
- **Solution**: Ensure conversation history is properly passed

## Support

For issues or questions:
1. Check environment variables
2. Review console logs for errors
3. Test API key validity
4. Contact development team

## Credits

- **AI Provider**: Google Gemini AI
- **Framework**: Next.js 14
- **UI Components**: Radix UI + Tailwind CSS
