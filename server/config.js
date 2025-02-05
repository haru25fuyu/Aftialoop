const mysql = require("mysql");
const { SquareClient, SquareEnvironment } = require("square"); 
const { OAuth2Client } = require("google-auth-library");

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
  "http://34.28.36.10",
  "http://localhost:3000"
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

const googleOAuth = new OAuth2Client(
  "301597739219-5s828gi856ag0vng8e50hds2re77rj00.apps.googleusercontent.com"
);

const square = new SquareClient({
  timeout: 3000,
  environment: SquareEnvironment.Sandbox,
  token: "AAAl7pyi2lBTaZGdxQT2T27qHwMCz8BtoEurNnI5L2EI0rbv9pVv5zOGdICu-lg"
});

module.exports = { connection, corsOptions, square, googleOAuth };
