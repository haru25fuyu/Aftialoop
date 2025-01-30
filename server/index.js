const express = require("express");
const mysql = require("mysql");
const { OAuth2Client } = require("google-auth-library");

const { generateUniqueID } = require("./function");
const { GetUniqueID } = require("./function");
const { connection } = require("./config");
const { corsOptions } = require("./config");

const app = express();
const client = new OAuth2Client(
  "301597739219-5s828gi856ag0vng8e50hds2re77rj00.apps.googleusercontent.com"
);
const port = 4000;

//ローカルホスト同士でも通信できるようにする
const cors = require("cors");

// CORSミドルウェアを使う
app.use(cors(corsOptions));

app.use(express.json());

app.get("/", (req, res) => {
  res.send("Hello World!");
});

app.get("/name", (req, res) => {
  req.query.name
    ? res.status(200).send(`Hello ${req.query.name}`)
    : res.status(200).json({ err_message: "名前を入力して下さい" });
});

app.post("/signup", async (req, res) => {
  const { name, password } = req.body;

  if (!name || !password) {
    res.status(200).json({ err_message: "名前、パスワードを入力して下さい" });
    return;
  }

  try {
    var id = await GetUniqueID(generateUniqueID());

    connection.query(
      "INSERT INTO users (id,name, pass) VALUES ( ?, ?, ?)",
      [id, name, password],
      (error, results) => {
        if (error) {
          res.status(200).json({ err_message: "登録に失敗しました: " + error });
          return;
        }
        // 登録成功
      }
    );
  } catch (error) {
    console.error("エラーが発生しました:", error);
    res.status(500).json({ err_message: "サーバーエラーが発生しました" });
  }
});

app.post("/api/auth/google", async (req, res) => {
  const { token } = req.body;

  try {
    // トークンを検証
    const ticket = await client.verifyIdToken({
      idToken: token,
      audience:
        "301597739219-5s828gi856ag0vng8e50hds2re77rj00.apps.googleusercontent.com" // 必ずクライアントIDを指定
    });

    const payload = ticket.getPayload(); // トークンのデータを取得
    console.log("認証成功:", payload);

    // 必要ならユーザー情報を保存
    connection.query(
      "SELECT * FROM users WHERE google_id = ?",
      [payload.sub],
      async (error, results) => {
        if (error) {
          console.error("エラーが発生しました:", error);
          res.status(500).json({ message: "サーバーエラーが発生しました" });
          return;
        }
        var id = await GetUniqueID(generateUniqueID());

        if (results.length === 0) {
          // ユーザーが存在しない場合は登録
          connection.query(
            "INSERT INTO users (id, name, email, google_id) VALUES (?, ?, ?, ?)",
            [id, payload.name, payload.email, payload.sub],
            (error, results) => {
              if (error) {
                console.error("エラーが発生しました:", error);
                res.status(500).json({ message: "サーバーエラーが発生しました" });
                return;
              }
            }
          );
        }
      }
    );
  } catch (error) {
    console.error("認証エラー:", error);
    res.status(401).json({ message: "認証失敗" });
  }
});

app.listen(port, () => {
  console.log(`Example app listening at http://localhost:${port}`);
});
