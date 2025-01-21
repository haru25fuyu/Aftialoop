@echo off

set SERVER_USER=haru25fuyu
set SERVER_HOST=34.28.36.10
set PROJECT_DIR=/var/www/animaloop.jp/react
set SSH_KEY=GCP_animaloop


ssh -i "%SSH_KEY%" %SERVER_USER%@%SERVER_HOST% "cd %PROJECT_DIR% && npm run dev"
pause