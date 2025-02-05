const express = require("express");
const mysql = require("mysql");
const { SquareClient, SquareEnvironment } = require("square");
const { v4: uuidv4 } = require("uuid");
const mailjet = require("node-mailjet").connect(
  process.env.MJ_APIKEY_PUBLIC,
  process.env.MJ_APIKEY_PRIVATE
);

const { generateUniqueID } = require("./function");
const { GetUniqueID } = require("./function");
const { connection, corsOptions, square, googleOAuth } = require("./config");


const app = express();
const port = 4000;

//ローカルホスト同士でも通信できるようにする
const cors = require("cors");

// CORSミドルウェアを使う
app.use(cors(corsOptions));

app.use(express.json());

const client = new SquareClient({
  token: "EAAAl3qvaEFwgNjCiYc51iRS8DabAhTUuJl0apLduuOWCWk0dAAw4SWf-4TnHopZ"
});


app.get("/", (req, res) => {
  res.send("Hello World!");
});

app.get("/name", (req, res) => {
  req.query.name
    ? res.status(200).send(`Hello ${req.query.name}`)
    : res.status(200).json({ err_message: "名前を入力して下さい" });
});

app.post("/signup", async (req, res) => {
  const { name, password, email } = req.body;

  if (!name || !password) {
    res.status(200).json({ err_message: "名前、パスワードを入力して下さい" });
    return;
  }

  try {
    const response = await client.customers.search({
      count:true,
        query: {
            filter: {
                emailAddress: {
                    exact: email,
                },
            },
            sort: {},
        },
    });
    console.log("スクエア",response);
    if(response.count>0){
      res.status(200).json({ err_message: "このメールアドレスは既に登録されています" });
      return;
    }
  } catch (error) {
    console.log(error);
    res.status(500).json({ err_message: "Square APIエラーが発生しました" });
  }

  //メールが正しいかチェックするためにメールを送信する
  const request = mailjet
    .post("send", { version: "v3.1" })
    .request({
      Messages: [
        {
          From: {
            Email: "haru25fuyu@gmail.com",
            Name: "Mailjet Pilot"
          },
          To: [
            {
              Email: "haru25fuyu@gmail.com",
              Name: "passenger 1"
            }
          ],
          Subject: "Your email flight plan!",
          TextPart:
            "Dear passenger 1, welcome to Mailjet! May the delivery force be with you!",
          HTMLPart:
            '<h3>Dear passenger 1, welcome to <a href="https://www.mailjet.com/">Mailjet</a>!</h3><br />May the delivery force be with you!'
        }
      ]
    });
  request
    .then(result => {
      console.log(result.body);
    })
    .catch(err => {
      console.log(err.statusCode);
    });

  //Squareに顧客情報を保存
  try {
    const response = await client.customers.create({
        idempotencyKey: uuidv4(),
        emailAddress: email,
        givenName: name,
    });
    console.log("スクエア",response);
    res.status(200).json({ response: response });
  } catch (error) {
    console.log(error);
    res.status(500).json({ err_message: "Square APIエラーが発生しました" });
  }
  return;

  try {
    //e-mailの重複チェック
    connection.query(
      "SELECT * FROM users WHERE email = ?",
      [email],
      async (error, results) => {
        if (error) {
          console.error("エラーが発生しました:", error);
          res.status(500).json({ err_message: "サーバーエラーが発生しました" });
          return;
        }

        if (results.length > 0) {
          res.status(200).json({ err_message: "この名前は既に使用されています" });
          return;
        }
      }
    );
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
        res.status(200).json({ message: "登録に成功しました" });
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
    const ticket = await googleOAuth.verifyIdToken({
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