Here’s a detailed instruction set you can pass to your CodePilot partner:  

---

### **Telegram Bot for Tracking Kaito Yaps (TypeScript + SQLite)**  

#### **Overview**  
We need a **TypeScript-based Telegram bot** that allows users to:  
1. **Query Kaito Yaps Scores** by sending an X (Twitter) handle.  
2. **Track an X handle** and receive daily notifications if their Yaps points increase.  
3. **Unsubscribe from tracking** a specific X handle.  
4. Store data using **SQLite**.  

---

### **Tech Stack**
- **Node.js + TypeScript**  
- **Telegram Bot API (Using `node-telegram-bot-api` or equivalent)**  
- **SQLite for storage**  
- **Axios** for API requests to Kaito  

---

### **Bot Features & Implementation Details**  

#### **1. Query Kaito Yaps Score**  
- Users send an X (Twitter) handle.  
- The bot fetches Yaps scores via:  
  ```plaintext
  GET https://api.kaito.ai/api/v1/yaps?username=<twitter_username>
  ```
- The bot responds with the user's **total Yaps points** and their **daily, weekly, and monthly changes**.  

✅ **Example Interaction:**  
**User:** `/query elonmusk`  
**Bot Response:**  
```plaintext
📊 Yaps Score for @elonmusk  
- Total: 3569.71  
- Last 24h: 0  
- Last 7d: 0  
- Last 30d: 3569.71  
```

---

#### **2. Track X Handle for Yaps Score Updates**  
- Users send `/track <X handle>`.  
- The bot **stores the handle** in SQLite.  
- Every 1 hours, the bot:  
  - Fetches the latest Yaps score.  
  - Compares it to the previously stored score.  
  - Sends a notification **only if the score increases, show % increased too**.  

✅ **Example Interaction:**  
**User:** `/track elonmusk`  
**Bot Response:**  
```plaintext
✅ @elonmusk is now being tracked.  
You'll receive daily updates if their Yaps score increases.
```
**Daily Notification Example (if Yaps increased):**  
```plaintext
🚀 @elonmusk gained 200 Yaps today!  
New total: 3769.71
```

---

#### **3. Unsubscribe from Tracking**  
- Users send `/unsubscribe <X handle>`.  
- The bot removes the handle from the database.  
- The bot confirms the action.  

✅ **Example Interaction:**  
**User:** `/unsubscribe elonmusk`  
**Bot Response:**  
```plaintext
❌ You have unsubscribed from @elonmusk updates.
```

---

### **Database Schema (SQLite)**
```sql
CREATE TABLE IF NOT EXISTS tracked_users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    telegram_id INTEGER NOT NULL,
    twitter_username TEXT NOT NULL UNIQUE,
    last_yaps REAL DEFAULT 0
);
```

---

### **Background Job for Daily Notifications**
- A **cron job (e.g., `node-cron`)** runs every day at a fixed time.  
- It fetches **latest Yaps** for all tracked users.  
- If Yaps **increased**, send an alert to the user.  

✅ **Example Cron Job Flow:**  
1. Query all tracked users from SQLite.  
2. Fetch their latest Yaps score from the API.  
3. Compare with stored `last_yaps` value.  
4. If the score increased, send a Telegram notification.  
5. Update `last_yaps` in SQLite.  

---

### **Additional Notes**
- Use **dotenv** for API keys.  
- Implement **error handling** for API failures.  
- Rate-limit Telegram requests to avoid spam.  
- Consider using **Telegram inline keyboard** for easier interaction.  

---

Let me know if you need further details! 🚀