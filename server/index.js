const express = require("express");
const mysql = require("mysql");
const { SquareClient, SquareEnvironment } = require("square");
const { v4: uuidv4 } = require("uuid");
const jwt = require("jsonwebtoken");
const Mailjet = require("node-mailjet");
const mailjet = Mailjet.apiConnect(
  "febc3b75a254bad3d2a659482dd53aa2",
  "130e9056600b21ed8d48ccfc382391f9"
);

const { generateUniqueID } = require("./function");
const { GetUniqueID } = require("./function");
const {
  connection,
  corsOptions,
  square,
  googleOAuth,
  GenerateRefreshToken
} = require("./config");

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

//仮登録
app.post("/signup", async (req, res) => {
  const { password, email } = req.body;

  if (!email || !password) {
    res.status(200).json({ err_message: "メールアドレス、パスワードを入力して下さい" });
    return;
  }

  //try {
  //  const response = await client.customers.search({
  //    count: true,
  //    query: {
  //      filter: {
  //        emailAddress: {
  //          exact: email,
  //        },
  //      },
  //      sort: {},
  //    },
  //  });
  //  console.log("スクエア", response);
  //  if (response.count > 0) {
  //    res.status(200).json({ err_message: "このメールアドレスは既に登録されています" });
  //    return;
  //  }
  //} catch (error) {
  //  console.log(error);
  //  res.status(500).json({ err_message: "Square APIエラーが発生しました" });
  //}

  /*try {
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
    id = uuidv4();
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
  }*/

    const token = GenerateToken({ user_id: password, email: email, limit: "24h" });
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
  const request = mailjet
    .post("send", { version: "v3.1" })
    .request({
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
app.get("/register/confirm", async (req, res) => {
  const { token } = req.query;
  const { decoded } = getUserFromToken(token);

  if (!decoded) {
    res.status(401).json({ err_message: "トークンが切れています。" });
    return;
  }

  if (!token || !decoded.email || !decoded.user_id) {
    res.status(200).json({ err_message: "トークンが無効です。" });
    return;
  }

  try {
    //Squareに顧客情報を保存
    try {
      const squareResponse = await client.customers.create({
        idempotencyKey: uuidv4(),
        emailAddress: results[0].email,
        givenName: results[0].name
      });
      console.log("スクエア", squareResponse);
      res.status(200).json({ response: squareResponse });
    } catch (error) {
      console.log(error);
      res.status(500).json({ err_message: "Square APIエラーが発生しました" });
    }
    var id = await GetUniqueID(generateUniqueID());

    connection.query(
      "INSERT INTO users (id,name, pass) VALUES ( ?, ?, ?)",
      [squareResponse.id, results[0].email, results[0].password],
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
  res.status(200).json({ message: "登録が完了しました" });
});

app.post("/login", async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    res.status(200).json({ err_message: "メールアドレス、パスワードを入力してください" });
    return;
  }

  connection.query(
    "SELECT * FROM users WHERE email = ? AND pass = ?",
    [email, password],
    (error, results) => {
      if (error) {
        console.error("エラーが発生しました:", error);
        res.status(500).json({ err_message: "サーバーエラーが発生しました" });
        return;
      }

      if (results.length === 0) {
        res.status(200).json({ err_message: "メールアドレスまたはパスワードが間違っています" });
        return;
      }

      var user = results[0];
      user.add("limit", "1h");
      const RefreshToken = GenerateRefreshToken(user);
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 31);
      //リフレッシュトークをSQLに保存
      connection.query(
        "INSERT INTO refresh_tokens (user_id, refresh_token,expires_at ) VALUES (?, ?)",
        [user.id, RefreshToken, expiresAt],
        (error, results) => {
          if (error) {
            console.error("エラーが発生しました:", error);
            res.status(500).json({ err_message: "サーバーエラーが発生しました" });
            return;
          }
        }
      );
      const response = {
        AccessToken: GenerateToken(user),
        RefreshToken: RefreshToken,
        token_type: "Bearer",
        expires_in: 3600
      };
      アクセストークンとリフレッシュトークンを返す;
      res.status(200).json({ response });
    }
  );
});

app.post("/refresh_token", (req, res) => {
  const refreshToken = req.body.refresh_token;

  try {
    // リフレッシュトークンをデコード
    const decoded = jwt.verify(refreshToken, SECRET_KEY);
    const userId = decoded.user_id;

    // 新しいアクセストークンを発行
    const newAccessToken = jwt.sign({ user_id: userId }, SECRET_KEY, {
      expiresIn: "1h"
    });

    res.json({ access_token: newAccessToken });
  } catch (err) {
    if (err instanceof jwt.ExpiredSignatureError) {
      return res.status(401).json({ message: "Refresh token expired" });
    }
    return res.status(401).json({ message: "Invalid refresh token" });
  }
});

//google認証
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
