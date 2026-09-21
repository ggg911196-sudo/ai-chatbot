# 🤖 چت‌بات هوش مصنوعی چند API

یه چت‌بات وب فارسی و راست‌چین که به چند ارائه‌دهنده‌ی هوش مصنوعی (سازگار با OpenAI API) وصل میشه و می‌تونی بینشون جابه‌جا بشی.

## ✨ امکانات

- اتصال به چند API: **OpenAI**، **OpenRouter**، **Groq**، **DeepSeek**، **xAI (Grok)** + گزینه‌ی **سفارشی** برای هر سرویس OpenAI-Compatible دیگه
- ذخیره‌ی جداگانه‌ی کلید API برای هر ارائه‌دهنده (فقط توی مرورگر خودت، با localStorage)
- دکمه‌ی **تست اتصال** و **دریافت لیست مدل‌ها** از API
- پاسخ **استریمینگ** (زنده) با دکمه‌ی توقف
- رندر **مارک‌داون** + هایلایت کد
- سایدبار گفتگوها: ساخت، تغییرنام خودکار، حذف
- رابط فارسی راست‌چین با فونت وزیرمتن و تم تیره

## 🚀 دیپلوی روی Railway

۱. این ریپو رو به گیت‌هاب پوش کن.
۲. توی [Railway](https://railway.app) پروژه‌ی جدید بساز و گزینه‌ی **Deploy from GitHub repo** رو انتخاب کن.
۳. همین ریپو رو انتخاب کن — ریل‌وی خودش `Dockerfile` رو پیدا می‌کنه و بیلد می‌گیره.
۴. از بخش Settings یه دامنه‌ی عمومی (Generate Domain) بگیر. تمام!

> نکته: کلیدهای API سمت کاربر (توی مرورگر) ذخیره می‌شن و نیازی به تنظیم Environment Variable نیست.

## 🖥 اجرای محلی

```bash
cd ai-chatbot
python3 -m http.server 8080
```

بعد باز کن: http://localhost:8080

## 🔑 گرفتن کلید API

| ارائه‌دهنده | آدرس گرفتن کلید |
|---|---|
| OpenAI | https://platform.openai.com/api-keys |
| OpenRouter | https://openrouter.ai/keys |
| Groq | https://console.groq.com/keys |
| DeepSeek | https://platform.deepseek.com/api_keys |
| xAI | https://console.x.ai |
