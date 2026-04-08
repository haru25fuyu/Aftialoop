FROM golang:1.25-alpine

WORKDIR /app

# 最新のAirをインストール
RUN go install github.com/air-verse/air@latest

COPY go.mod go.sum ./
RUN go mod download

COPY . .

# Airで起動
CMD ["air", "-c", ".air.toml"]