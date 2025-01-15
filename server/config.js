const mysql = require("mysql");

const connection = mysql.createConnection({
  host: "10.27.96.3",
  user: "app-user",
  password: 'q+b4(F}{bH"LzSQm',
  database: "animaloop"
});

const allowedOrigins = [
  "https://animaloop.jp",
  "https://dev.animaloop.jp",
  "http://34.28.36.10:3000",
  "http://34.28.36.10"
  // 他の許可したいオリジンを追加
];

const corsOptions = {
  origin: (origin, callback) => {
    // リクエストのオリジンが許可リストに含まれているか、またはオリジンが未定義（例えば、同一オリジンからのリクエスト）の場合に許可
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error("CORSポリシーによりブロックされました"));
    }
  },
  optionsSuccessStatus: 200,
  methods: ["GET", "POST", "PUT", "DELETE"], // 許可するHTTPメソッド
  allowedHeaders: ["Content-Type", "Authorization"], // 許可するヘッダー
  credentials: true // クッキーなどの認証情報を許可する場合
};

module.exports = { connection, corsOptions };
