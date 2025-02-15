const express = require("express");
const mysql = require("mysql");
const { SquareClient, SquareEnvironment } = require("square");
const { v4: uuidv4 } = require("uuid");
const jwt = require("jsonwebtoken");
const bodyParser = require("body-parser");
const validator = require("validator");
const Mailjet = require("node-mailjet");
const axios = require("axios");

const mailjet = Mailjet.apiConnect(
  "febc3b75a254bad3d2a659482dd53aa2",
  "130e9056600b21ed8d48ccfc382391f9"
);
const cookieParser = require("cookie-parser");

const { generateUniqueID } = require("./function");
const { GetUniqueID } = require("./function");
const {
  connection,
  corsOptions,
  square,
  googleOAuth,
  GenerateToken,
  getUserFromToken,
  GenerateRefreshToken,
  getUserFromRefreshToken,
  checkRefreshToken,
  CheckUser
} = require("./config");

const app = express();
const port = 4000;

//ローカルホスト同士でも通信できるようにする
const cors = require("cors");
const e = require("express");

// CORSミドルウェアを使う
app.use(cors(corsOptions));

app.use(express.json());
app.use(cookieParser());
app.use(bodyParser.json());
//httpsに強制する
app.use((req, res, next) => {
  if (req.headers["x-forwarded-proto"] !== "https") {
    return res.redirect("https://" + req.headers.host + req.url);
  }
  return next();
});

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

//仮登録
app.post("/signup", async (req, res) => {
  let { email, password } = req.body;

  // サニタイズ: 不要な空白を削除
  email = email.trim();
  password = password.trim();

  // バリデーション: メールアドレスが正しい形式か確認
  if (!validator.isEmail(email)) {
    return res.status(400).json({ err_message: "無効なメールアドレスです" });
  }

  // バリデーション: パスワードが十分に強いか確認 (例: 8文字以上、数字・大文字・小文字を含む)
  if (!validator.isLength(password, { min: 8 })) {
    return res.status(400).json({ err_message: "パスワードは8文字以上である必要があります" });
  }

  if (!/[A-Z]/.test(password) || !/[0-9]/.test(password)) {
    return res.status(400).json({ err_message: "パスワードは大文字と数字を含む必要があります" });
  }
  if (!email || !password) {
    res.status(200).json({ err_message: "メールアドレス、パスワードを入力して下さい" });
    return;
  }

  try {
    const response = await client.customers.search({
      count: true,
      query: {
        filter: {
          emailAddress: {
            exact: email
          }
        },
        sort: {}
      }
    });
    console.log("スクエア", response);
    if (response.count > 0) {
      res.status(200).json({ err_message: "このメールアドレスは既に登録されています" });
      return;
    }
  } catch (error) {
    console.log(error);
    res.status(500).json({ err_message: "Square APIエラーが発生しました" });
  }

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
  } catch (error) {
    console.error("エラーが発生しました:", error);
    res.status(500).json({ err_message: "サーバーエラーが発生しました" });
  }

  const token = GenerateToken({
    id: password,
    email: email,
    limit: "24h"
  });
  const registrationLink =
    "https://animaloop.jp/register/confirm?token=" + token;
  // HTMLテンプレートに変数を埋め込む
  const htmlContent = `
<h3>${email}様</h3><br />
<p>この度は、Animaloopへのご登録ありがとうございます。</p><br />
<hr />
<p>以下のリンクをクリックして、本登録を完了してください。</p><br />
<p><a href="${registrationLink}">本登録を完了する</a></p><br />
<hr />
<p>もしリンクに問題がある場合は、以下のURLをコピーしてブラウザに貼り付けてください。</p><br />
<p>URL: ${registrationLink}</p><br />
<hr />
<p>※このリンクは24時間以内にご利用ください。</p><br />
<p>何かご不明な点がございましたら、サポートまでご連絡ください。</p><br />
<hr />
<p>今後とも、Animaloopをどうぞよろしくお願いいたします。</p><br />
<p>Animaloopサポートチーム</p>
`;

  //メールが正しいかチェックするためにメールを送信する
  const request = mailjet.post("send", { version: "v3.1" }).request({
    Messages: [
      {
        From: {
          Email: "haru25fuyu@animaloop.jp",
          Name: "Animaloop"
        },
        To: [
          {
            Email: email,
            Name: email + " 様"
          }
        ],
        Subject: "【Animaloop】アカウント作成の完了には確認が必要です",
        HTMLPart: htmlContent
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

  res.status(200).json({ message: "登録に成功しました" });
  return;
});

//本登録
app.post("/register/confirm", async (req, res) => {
  const { token } = req.body;

  if (!token || !validator.isJWT(token)) {
    return res.status(400).json({ err_message: "無効なトークンです。" });
  }

  const decoded = getUserFromToken(token);
  if (!decoded) {
    res.status(401).json({ err_message: "トークンが切れています。" });
    return;
  }

  if (!token || !decoded.email || !decoded.user_id) {
    res.status(200).json({ err_message: "トークンが無効です。" });
    return;
  }

  //メールアドレスが重複していないかチェック完了まで待機させる
  const checkEmail = () => {
    return new Promise((resolve, reject) => {
      connection.query(
        "SELECT * FROM users WHERE email = ?",
        [decoded.email], // クオート不要
        (error, results) => {
          if (error) {
            reject(error);
          } else {
            resolve(results);
          }
        }
      );
    });
  };

  // await で実行
  const results = await checkEmail();

  if (results.length > 0) {
    console.log("このメールアドレスはすでに登録されています。");
    res.status(200).json({ err_message: "このメールアドレスはすでに登録されています。" });
    return; // ここで処理を終了
  } else {
    console.log("登録可能です。");
  }

  try {
    //Squareに顧客情報を保存
    try {
      const squareResponse = await client.customers.create({
        idempotencyKey: uuidv4(),
        emailAddress: decoded.email
      });
      console.log("スクエア", squareResponse);

      // MySQLのクエリを非同期で実行
      const queryPromise = new Promise((resolve, reject) => {
        connection.query(
          "INSERT INTO users (id, email, pass) VALUES (?, ?, ?)",
          [
            squareResponse.customer.id,
            squareResponse.customer.emailAddress,
            decoded.user_id
          ],
          (error, results) => {
            if (error) {
              reject(error);
            } else {
              resolve(results);
            }
          }
        );
      });

      // クエリの完了を待つ
      await queryPromise;

      res.status(200).json({ message: "登録が完了しました" });
    } catch (error) {
      console.log(error);
      res.status(500).json({ err_message: "Square APIエラーが発生しました" });
    }
  } catch (error) {
    console.error("エラーが発生しました:", error);
    res.status(500).json({ err_message: "サーバーエラーが発生しました" });
  }
});

app.post("/login", async (req, res) => {
  let { email, password } = req.body;

  // メールアドレスの形式をチェック
  if (!validator.isEmail(email)) {
    return res.status(400).json({
      err_message: "無効なメールアドレスです"
    });
  }

  if (!email || !password) {
    res.status(200).json({
      err_message: "メールアドレス、パスワードを入力してください"
    });
    return;
  }

  // サニタイズ: ユーザーが入力したデータを安全にする
  email = validator.escape(email);
  password = validator.escape(password);

  connection.query(
    "SELECT * FROM users WHERE email = ? AND pass = ?",
    [email, password],
    (error, results) => {
      if (error) {
        console.error("エラーが発生しました:", error);
        res.status(500).json({
          err_message: "サーバーエラーが発生しました"
        });
        return;
      }

      if (results.length === 0) {
        res.status(200).json({
          err_message: "メールアドレスまたはパスワードが間違っています"
        });
        return;
      }

      var user = results[0];
      user["limit"] = "1h";
      const RefreshToken = GenerateRefreshToken(user);

      checkRefreshToken(res, user, RefreshToken);

      const response = {
        AccessToken: GenerateToken(user),
        token_type: "Bearer",
        expires_in: 3600
      };
      //アクセストークンを返す;
      res.status(200).json({
        response
      });
    }
  );
});

//マイページの表示
app.post("/mypage", async (req, res) => {
  console.log("マイページ");
  CheckUser(req, res);
});

//google認証
app.post("/api/auth/google", async (req, res) => {
  const { token } = req.body;

  if (!token) {
    return res.status(400).json({ err_message: "トークンが提供されていません" });
  }

  try {
    // トークンを検証
    const ticket = await googleOAuth.verifyIdToken({
      idToken: token,
      audience:
        "301597739219-5s828gi856ag0vng8e50hds2re77rj00.apps.googleusercontent.com" // 必ずクライアントIDを指定
    });

    const payload = ticket.getPayload(); // トークンのデータを取得
    console.log("認証成功:", payload);

    // ユーザー情報を取得して処理
    connection.query(
      "SELECT * FROM users WHERE google_id = ?",
      [payload.sub],
      async (error, results) => {
        if (error) {
          console.error("エラーが発生しました:", error);
          return res.status(500).json({ message: "サーバーエラーが発生しました" });
        }

        // ユーザーが見つからない場合、登録
        if (results.length === 0) {
          // 重複登録防止
          try {
            //mailアドレスの重複チェック
            const email = await client.customers.search({
              count: true,
              query: {
                filter: {
                  emailAddress: {
                    exact: payload.email
                  }
                },
                sort: {}
              }
            });
            //メールアドレスが重複している場合
            if (email.count > 0) {
              //googleのidをSQLに追加しておく
              const queryPromise = new Promise((resolve, reject) => {
                connection.query(
                  "UPDATE  users SET google_id = ?  WHERE email = ?",
                  [payload.sub, payload.email],
                  (error, results) => {
                    if (error) {
                      reject(error);
                    } else {
                      resolve(results);
                    }
                  }
                );
              });
              await queryPromise;

              //ログイン処理
              const user = {
                id: email.customers[0].id,
                email: payload.email,
                name: payload.name,
                google_id: payload.sub,
                limit: "1h"
              };
              const RefreshToken = GenerateRefreshToken(user);

              checkRefreshToken(res, user, RefreshToken);
              const response = {
                AccessToken: GenerateToken(user),
                token_type: "Bearer",
                expires_in: 3600
              };
              //アクセストークンを返す;
              res.status(200).json({ response });
              return;
            } else {
              const squareResponse = await client.customers.create({
                idempotencyKey: uuidv4(),
                emailAddress: payload.email,
                givenName: payload.name
              });
              console.log("スクエア", squareResponse);

              // MySQLのクエリを非同期で実行
              const queryPromise = new Promise((resolve, reject) => {
                connection.query(
                  "INSERT INTO users (id, name, email, google_id) VALUES (?, ?, ?, ?)",
                  [
                    squareResponse.customer.id,
                    payload.name,
                    payload.email,
                    payload.sub
                  ],
                  (error, results) => {
                    if (error) {
                      reject(error);
                    } else {
                      resolve(results);
                    }
                  }
                );
              });

              // クエリの完了を待つ
              await queryPromise;

              if (error) {
                return res.status(500).json({ message: "サーバーエラーが発生しました" });
              }

              user = {
                id: squareResponse.customer.id,
                email: payload.email,
                name: payload.name,
                google_id: payload.sub,
                limit: "1h"
              };
              const RefreshToken = GenerateRefreshToken(user);
              checkRefreshToken(res, user, RefreshToken);
              const response = {
                AccessToken: GenerateToken(user),
                token_type: "Bearer",
                expires_in: 3600
              };
              //アクセストークンを返す;
              res.status(200).json({ response });
              return;
            }
          } catch (error) {
            console.log(error);
            res.status(500).json({ err_message: "Square APIエラーが発生しました" });
          }
        } else {
          // ユーザーが見つかった場合、アクセストークンを発行
          const user = results[0];
          user["limit"] = "1h";
          const RefreshToken = GenerateRefreshToken(user);
          checkRefreshToken(res, user, RefreshToken);

          const response = {
            AccessToken: GenerateToken(user),
            token_type: "Bearer",
            expires_in: 3600
          };
          res.status(200).json({
            response
          });
        }
      }
    );
  } catch (error) {
    console.error("認証エラー:", error);
    return res.status(401).json({ message: "認証失敗" });
  }
});

app.listen(port, () => {
  console.log(`Example app listening at http://localhost:${port}`);
});
