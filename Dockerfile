# ایمیج سبک پایتون که فایل‌های استاتیک رو با پورت داینامیک ریل‌وی سرو می‌کنه
FROM python:3.12-alpine

WORKDIR /app
COPY . .

# ریل‌وی پورت رو با متغیر محیطی PORT میده
CMD ["sh", "-c", "python -m http.server ${PORT:-8080} --directory /app"]
