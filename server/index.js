const express = require('express');
const mysql = require('mysql');
const { OAuth2Client } = require("google-auth-library");

const app = express();
const client = new OAuth2Client(
  "301597739219-5s828gi856ag0vng8e50hds2re77rj00.apps.googleusercontent.com"
);
const port = 4000;

//ローカルホスト同士でも通信できるようにする
const cors = require("cors");

const corsOptions = {
  origin: "http://localhost:3000", // フロントエンドのURLを指定
  methods: ["GET", "POST", "PUT", "DELETE"], // 許可するHTTPメソッド
  allowedHeaders: ["Content-Type", "Authorization"], // 許可するヘッダー
  credentials: true // クッキーなどの認証情報を許可する場合
};

// CORSミドルウェアを使う
app.use(cors(corsOptions));

app.use(express.json());

const connection = mysql.createConnection({
  host: '35.200.1.50',
  user: 'app-user',
  password: 'q+b4(F}{bH"LzSQm',
  database: 'animaloop'
});

app.get('/', (req, res) => {
  res.send('Hello World');
  // 接続の確認
  connection.connect((err) => {
    if (err) {
      console.error('接続エラー:', err.stack);
      return;
    }
    console.log('接続成功');
    connection.end();
  });
}
);
app.get('/name', (req, res) => {
  req.query.name ? res.send(`Hello ${req.query.name}`) : res.json({ 'err_message': '名前を入力して下さい' });
}
);

app.post('/signup', (req, res) => {
  const { name, password } = req.body;

  if (!name || !password) {
    res.json({ 'err_message': '名前、パスワードを入力して下さい' });
    return;

  }

  const date = new Date();
  connection.query('INSERT INTO users (name, pass, date) VALUES (?, ?, ?)', [name, password, date], (error, results) => {
    if (error) {
      res.json({ 'err_message': '登録に失敗しました: ' + error });
      return;
    }
    res.json({ 'message': '登録が完了しました' });
  });
});

app.post("/api/auth/google", async (req, res) => {
  const { token } = req.body;
  console.log(token);
  try {
    // トークンを検証
    const ticket = await client.verifyIdToken({
      idToken: token,
      audience: "301597739219-5s828gi856ag0vng8e50hds2re77rj00.apps.googleusercontent.com" // 必ずクライアントIDを指定
    });

    const payload = ticket.getPayload(); // トークンのデータを取得
    console.log("認証成功:", payload);

    // 必要ならユーザー情報を保存
    res.status(200).json({ message: "認証成功", user: payload });
  } catch (error) {
    console.error("認証エラー:", error);
    res.status(401).json({ message: "認証失敗" });
  }
});

app.listen(port, () => {
  console.log(`Example app listening at http://localhost:${port}`);
});