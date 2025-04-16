@echo off

set SERVER_USER=haru25fuyu
set SERVER_HOST=160.251.168.238
set SERVER_PASS=mino96haru
set PROJECT_DIR=/var/www/web/Animaloop/react

REM plinkでパスワード自動送信（インタラクティブじゃなくなる）
echo y | plink.exe -ssh %SERVER_USER%@%SERVER_HOST% -pw %SERVER_PASS% "cd %PROJECT_DIR% && npm run dev"

pause
