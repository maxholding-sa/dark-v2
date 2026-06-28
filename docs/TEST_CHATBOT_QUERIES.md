# Chatbot Test Queries

Use these test queries to verify that the chatbot knowledge base integration is working correctly.

## Test Setup
1. Make sure you have cars in your database with status "AVAILABLE"
2. Open the application in your browser (http://localhost:3000)
3. Click on the chatbot icon in the bottom-left corner
4. Try the following queries

---

## Arabic Test Queries

### 1. Brand-Specific Search
```
أريد أن أعرف عن سيارات أودي المتوفرة
```
**Expected Result**: 
- List of Audi cars with specifications
- Car cards showing Audi vehicles
- Links to car detail pages

### 2. Average Price Query
```
ما هو متوسط سعر سيارات مرسيدس؟
```
**Expected Result**:
- Average price calculation
- Min and max prices
- Number of available Mercedes cars
- List of Mercedes vehicles

### 3. Body Type Search
```
هل لديكم سيارات دفع رباعي؟
```
**Expected Result**:
- List of SUV vehicles
- Car specifications
- Interactive car cards

### 4. Fuel Type Search
```
أبحث عن سيارات كهربائية
```
**Expected Result**:
- List of electric vehicles
- Specifications highlighting electric features
- Car cards with images

### 5. General Query
```
أريد سيارة عائلية مريحة بسعر معقول
```
**Expected Result**:
- AI suggests appropriate family cars (sedans/SUVs)
- Considers price and comfort
- Shows relevant options

### 6. Color Search
```
هل لديكم سيارات بيضاء؟
```
**Expected Result**:
- Cars with white color
- All available white vehicles

---

## English Test Queries

### 1. Brand Search
```
Show me available BMW cars
```
**Expected Result**:
- List of BMW vehicles
- Specifications in Arabic (as stored)
- Interactive car cards

### 2. Price Query
```
What is the average price of Toyota cars?
```
**Expected Result**:
- Average price of Toyota vehicles
- Price statistics
- Car listings

### 3. Body Type
```
Do you have any sedans?
```
**Expected Result**:
- Sedan vehicles
- Full specifications
- Car cards

### 4. Hybrid Search
```
I'm looking for hybrid cars
```
**Expected Result**:
- Hybrid and plug-in hybrid vehicles
- Fuel type clearly indicated
- Specifications

### 5. Specific Model
```
Tell me about Mercedes E-Class
```
**Expected Result**:
- E-Class models if available
- If not, similar Mercedes models
- Specifications and prices

---

## Mixed Language Queries

### 1. Arabic + English
```
أريد BMW دفع رباعي
```
**Expected Result**:
- BMW SUV vehicles
- Proper filtering
- Car details

### 2. Price Range (Natural Language)
```
هل لديكم سيارات تحت 50000 دولار؟
```
**Expected Result**:
- AI should understand price context
- Show cars within or near that range
- Provide options

---

## Edge Cases

### 1. No Results
```
أريد سيارة فيراري
```
**Expected Result**:
- Polite message that Ferrari is not available
- Suggestion to browse other luxury brands
- No car cards displayed

### 2. Very General Query
```
مرحبا
```
**Expected Result**:
- Friendly greeting
- Ask how the bot can help
- Mention available features

### 3. Service Query (Not About Cars)
```
كيف يمكنني حجز اختبار قيادة؟
```
**Expected Result**:
- Explanation of test drive booking process
- Mention that user can book through car detail pages
- No car cards (unless user asks about a specific car)

### 4. Multiple Brands
```
قارن بين تويوتا وهوندا
```
**Expected Result**:
- Show cars from both brands
- AI provides comparison based on available data
- Multiple car cards

---

## Advanced Test Cases

### 1. Features Search
```
أريد سيارة اقتصادية في استهلاك الوقود
```
**Expected Result**:
- AI suggests cars with good fuel economy
- May show hybrids or small cars
- Relevant recommendations

### 2. Year Preference
```
أريد سيارة حديثة موديل 2024 أو أحدث
```
**Expected Result**:
- AI filters or highlights newer cars
- Shows recent models
- Specifications

### 3. Budget Query
```
ما هي أرخص سيارة متوفرة؟
```
**Expected Result**:
- AI identifies lowest-priced cars
- Shows budget options
- Price clearly displayed

### 4. Premium Search
```
أبحث عن سيارة فاخرة ومريحة
```
**Expected Result**:
- Luxury brands (Mercedes, BMW, Lexus, etc.)
- Featured cars highlighted
- Premium options

---

## Verification Checklist

After testing, verify:

- [ ] Car cards display correctly with images
- [ ] Links to car detail pages work
- [ ] Prices are formatted properly ($XX,XXX)
- [ ] Featured badge shows on featured cars
- [ ] Arabic text displays correctly (right-to-left)
- [ ] Average price calculations are accurate
- [ ] Search works in both Arabic and English
- [ ] No errors in browser console
- [ ] Chatbot responds within reasonable time (< 5 seconds)
- [ ] Conversation history is maintained
- [ ] Typing indicator shows while AI is thinking
- [ ] Mobile responsive design works
- [ ] Car images load correctly or show fallback icon

---

## Troubleshooting

### Issue: No cars showing up
**Solution**: 
1. Check database has cars with status "AVAILABLE"
2. Verify DATABASE_URL in .env
3. Check browser console for errors

### Issue: Car images not loading
**Solution**:
1. Verify NEXT_PUBLIC_SUPABASE_URL is correct
2. Check that car images are uploaded to Supabase storage
3. Verify storage bucket is public

### Issue: Chatbot not responding
**Solution**:
1. Check GEMINI_API_KEY is valid
2. Verify internet connection
3. Check browser console for errors
4. Look at terminal logs for server errors

### Issue: Search not finding cars
**Solution**:
1. Ensure car makes in database match the search mappings
2. Check car status is "AVAILABLE"
3. Try broader search terms
4. Verify database connection

---

## Performance Benchmarks

Expected performance:
- **Search Query Time**: < 1 second
- **AI Response Time**: 2-5 seconds
- **Total Response Time**: < 6 seconds
- **Cars Returned**: Up to 5 per query
- **Memory Usage**: Reasonable (not leaking)

---

## Next Steps After Testing

1. ✅ Verify all test cases pass
2. ✅ Check error handling works
3. ✅ Test on different devices (mobile, tablet, desktop)
4. ✅ Test with real users for feedback
5. ✅ Monitor API usage (Gemini)
6. ✅ Optimize queries if needed
7. ✅ Add analytics to track popular queries
8. ✅ Consider caching frequently requested data

---

**Testing Date**: November 7, 2025
**Tested By**: _____________
**Status**: _____________
**Notes**: _____________
