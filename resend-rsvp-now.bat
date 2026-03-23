@echo off
echo ================================================
echo  BANF RSVP Resend - 31 Missing Recipients
echo  Will wait if rate limited, then send
echo ================================================
cd /d C:\projects\banf
node _evite-resend-missing.js
echo.
echo Done! Check _evite-resend-log.txt for details.
pause
