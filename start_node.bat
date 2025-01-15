@echo off
REM サーバー情報とプロジェクトディレクトリを設定
set SERVER_USER=haru25fuyu
set SERVER_HOST=animaloop.jp
set NODR_DIR=/var/www/animaloop.jp/node/
set SSH_KEY=GCP_animaloop

REM SSH接続してReactアプリを起動
ssh -i "%SSH_KEY%" %SERVER_USER%@%SERVER_HOST% "cd %NODR_DIR% && npm start"

pause