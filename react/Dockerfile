FROM node:20-alpine

WORKDIR /app

# 依存関係をコピー
COPY package*.json ./

# 一度クリーンインストールし、esbuildをLinux(64bit)用に強制再インストール
RUN npm install && npm rebuild esbuild

# node_modules/.bin 以下のすべての実行権限を強制
RUN chmod -R +x node_modules/.bin

COPY . .

# 実行ユーザーをrootにして権限問題を回避
USER root

CMD ["npx", "vite", "--host", "0.0.0.0"]