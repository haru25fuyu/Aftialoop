const express = require("express");
const mysql = require("mysql");
const { SquareClient, SquareEnvironment } = require("square");
const { v4: uuidv4 } = require("uuid");
const jwt = require("jsonwebtoken");
const Mailjet = require("node-mailjet");
const axios = require("axios");
const cookieParser = require("cookie-parser");

const mailjet = Mailjet.apiConnect(
  "febc3b75a254bad3d2a659482dd53aa2",
  "130e9056600b21ed8d48ccfc382391f9"
);

const { GetUniqueID,generateUniqueID,hashPassword,SaveSquareCustomer} = require("./function");
const {
  connection,
  corsOptions,
  square,
  googleOAuth,
  GenerateToken,
  getUserFromToken,
  GenerateRefreshToken,
  getUserFromRefreshToken,
  CheckUser,
  checkRefreshToken
} = require("./config");

const app = express();
const port = 4000;

//ローカルホスト同士でも通信できるようにする
const cors = require("cors");

// CORSミドルウェアを使う
app.use(cors(corsOptions));

app.use(express.json());

app.use(cookieParser());

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
    return;
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

  const id = uuidv4();
  const hashedPassword = await hashPassword(password);

  const token = GenerateToken({
    id: id,
    email: email,
    limit: "24h"
  });


  //本登録用トークンをSQLに保存
  //前にあったら消す
  connection.query(
    "DELETE FROM user_registration_tokens WHERE email = ?",
    [email],
    (error, results) => {
      if (error) {
        console.error("エラーが発生しました:", error);
        res.status(500).json({ err_message: "サーバーエラーが発生しました" });
        return;
      }
    }
  );
  await connection.query(
   "INSERT INTO user_registration_tokens (id,email,password_hash, token, expires_at) VALUES (?, ?, ?,?,?)",
    [id, email, hashedPassword, token, new Date(Date.now() + 24 * 60 * 60 * 1000)],
    (error, results) => {
      if (error) {
        console.error("エラーが発生しました:", error);
        res.status(500).json({ err_message: "サーバーエラーが発生しました" });
        return;
      }
    }
  );
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
      res.status(200).json({ message: "登録に成功しました" });
    })
    .catch(err => {
      console.log(err.statusCode);
      res.status(500).json({ err_message: "メール送信エラーが発生しました" });
    });
});

//本登録
app.get("/register/confirm", async (req, res) => {
  const { token } = req.query;
  const decoded  = getUserFromToken(token);

  if (!decoded) {
    res.status(401).json({ err_message: "トークンが切れています。" });
    return;
  }

  if (!token || !decoded.email || !decoded.id) {
    res.status(200).json({ err_message: "トークンが無効です。" });
    return;
  }

const getUserData = async (decoded, token) => {
  return new Promise((resolve, reject) => {
    connection.query(
      "SELECT * FROM user_registration_tokens WHERE id = ?",
      [decoded.id],
      (error, results) => {
        if (error) {
          reject({ err_message: "サーバーエラーが発生しました" });
          return;
        }

        if (results.length === 0) {
          reject({ err_message: "トークンが無効です。" });
          return;
        }

        if (new Date(results[0].expires_at) < new Date()) {
          reject({ err_message: "トークンが切れています。" });
          return;
        }

        if (results[0].token !== token) {
          reject({ err_message: "トークンが無効です。" });
          return;
        }

        resolve(results[0]); // 正常時はデータを返す
      }
    );
  });

const saveUserDB = async (decoded, token, res) => {
      await connection.query(
      "INSERT INTO users (id,name, pass) VALUES ( ?, ?, ?)",
      [squareResponse.id, user_data.email, user_data.password_hash],
      (error, results) => {
        if (error) {
          console.error("エラーが発生しました:", error);
          res.status(200).json({ err_message: "登録に失敗しました: " + error });
          return;
        }
        connection.query(
          "INSERT INTO profile (user_id) VALUES (?)",
          [squareResponse.id],
          (error, results) => {
            if (error) {
              console.error("エラーが発生しました:", error);
              res.status(500).json({ err_message: "サーバーエラーが発生しました" });
              return;
            }
            //トークンを削除
            connection.query(
              "DELETE FROM user_registration_tokens WHERE id = ?",
              [decoded.id],
              (error, results) => {
                if (error) {
                  console.error("エラーが発生しました:", error);
                  res.status(500).json({ err_message: "サーバーエラーが発生しました" });
                  return;
                }
              }
            );
            // 登録成功
            res.status(200).json({ message: "登録に成功しました" });
          }
        );
      }
    );
  };
      
};
  
const handleUser = async (decoded, token, res) => {
  try {
     const user_data = await getUserData(decoded, token);
    //Squareに顧客情報を保存
      console.log("user:",user_data);
     
   catch (error) {
    console.error("エラーが発生しました:", error);
    res.status(500).json({ err_message: "サーバーエラーが発生しました:"+error });
  }
};
handleUser(decoded, token, res);
});


app.post("/login", async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    res.status(200).json({ err_message: "メールアドレス、パスワードを入力してください" });
    return;
  }

  connection.query(
    "SELECT * FROM users WHERE email = ?",
    [email],
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
      //パスワードの照合
      bcrypt.compare(password, results[0].pass, (err, result) => {
        if (err) {
          console.error("エラーが発生しました:", err);
          res.status(500).json({ err_message: "サーバーエラーが発生しました" });
          return;
        }
        if (!result) {
          res.status(200).json({ err_message: "メールアドレスまたはパスワードが間違っています" });
          return;
        }
        let user = results[0];
        user["limit"] = "1h";
        checkRefreshToken(res, user);
        const response = {
          AccessToken: GenerateToken(user),
          token_type: "Bearer",
          expires_in: 3600
        };
        res.status(200).json({ response });
      });
    }
  );
});

//マイページの表示
app.post("/mypage", async (req, res) => {
  const user = CheckUser(req, res);

  if (!user.user)  {
    return;
  }
  const decoded = getUserFromToken(user.access_token);
  const id = decoded.id;
  let view_history = [];
  let favorites = [];
  //閲覧履歴とお気に入りを取得
  connection.query(
    "SELECT h.*, i.* FROM view_history h JOIN items i ON h.item_id = i.id WHERE h.user_id = ?",
    [id],
    (error, results) => {
      if (error) {
        console.error("エラーが発生しました:", error);
        res.status(500).json({ err_message: "サーバーエラーが発生しました" });
        return;
      }
      view_history = results;
    }
  );

  connection.query(
    //お気に入りを取得(itemテーブルとジョイン)
    "SELECT f.*, i.* FROM favorites AS f JOIN items AS i ON f.item_id = i.id WHERE f.user_id = ?",
    [id],
    (error, results) => {
      if (error) {
        console.error("エラーが発生しました:", error);
        res.status(500).json({ err_message: "サーバーエラーが発生しました" });
        return;
      }
      favorites = results;
    }
  );
  res.status(200).json({user, view_history, favorites });});

  app.post("/get-customer", async (req, res) => {
    const user = CheckUser(req, res);
    if (!user.user) {
      return;
    }
    const decoded = getUserFromToken(user.access_token);
    const id = decoded.id;
    return res.status(200).json({ customerId: id });
  });

  app.post("/get-customer/data", async (req, res) => {
    const user = CheckUser(req, res);
    if (!user.user) {
      return;
    }
    const decoded = getUserFromToken(user.access_token);
    const id = decoded.id;

    connection.query(
      //プロフィールとユーザーテーブルから情報を取得
      "SELECT u.*, p.* FROM users AS u JOIN profile AS p ON u.id = p.user_id WHERE u.id = ?",
      [id],
      (error, results) => {
        if (error) {
          console.error("エラーが発生しました:", error);
          res.status(500).json({ err_message: "サーバーエラーが発生しました" });
          return;
        }
        console.log(results);
        res.status(200).json({ user: results[0] });
      }
    );
  });

app.post("/api/save-card", async (req, res) => {
    const { token, customerId } = req.body; // フロントからトークンを受け取る

    try {
        // もし顧客IDがなければ、新しく作成
        let customer = customerId;
        if (!customer) {
            res.status(500).json({ success: false, error: "ユーザー認証に失敗しました。" });
        }

        // 受け取ったnonceでカードを保存
       const cardResponse = await client.cardsApi.createCard({
          idempotencyKey: uuidv4(),
          sourceId: token, // フロントエンドで取得したトークン
        card: {
          customerId: customer,
        },
      });

        res.json({
            success: true,
            customerId: customer,
            cardId: cardResponse.result.card?.id,
        });
    } catch (error) {
        console.error("カード保存エラー:", error);
        res.status(500).json({ success: false, error: error.message });
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
      "SELECT * FROM users WHERE google_id = ? OR email = ?",
      [payload.sub, payload.email],
      async (error, results) => {
        if (error) {
          console.error("エラーが発生しました:", error);
          res.status(500).json({ message: "サーバーエラーが発生しました" });
          return;
        }

        if (results.length === 0) {
          //スクエアに登録
          const squareResponse = await client.customers.create({
            idempotencyKey: uuidv4(),
            emailAddress: payload.email,
            givenName: payload.name
          });

          // ユーザーが存在しない場合は登録
          connection.query(
            "INSERT INTO users (id, name, email, google_id) VALUES (?, ?, ?, ?)",
            [squareResponse.customer.id, payload.name, payload.email, payload.sub],
            (error, results) => {
              if (error) {
                console.error("エラーが発生しました:", error);
                res.status(500).json({ message: "サーバーエラーが発生しました" });
                return;
              }
            },
            connection.query(
            "INSERT INTO profile (user_id) VALUES (?)",
            [squareResponse.customer.id],
            (error, results) => {
              if (error) {
                console.error("エラーが発生しました:", error);
                res.status(500).json({ message: "サーバーエラーが発生しました" });
                return;
              }

              let user = {
                id: squareResponse.customer.id,
                email: payload.email,
                name: payload.name
              };
              user["limit"] = "1h";
              checkRefreshToken(res, user);
          
              const response = {
                AccessToken: GenerateToken(user),
                token_type: "Bearer",
                expires_in: 3600
              }; 
              res.status(200).json({ response });
            }
          )
        )
        }else{
          // ユーザーが存在する場合は更新
          connection.query(
            "UPDATE users SET google_id = ?,email = ?,name = ? WHERE email = ? OR google_id = ?",
            [payload.sub, payload.email, payload.name, payload.email, payload.sub],
            (error, results) => {
              if (error) {
                console.error("エラーが発生しました:", error);
                res.status(500).json({ message: "サーバーエラーが発生しました" });
                return;
              }
            }
          );
          let user = results[0];
          user["limit"] = "1h";
         checkRefreshToken(res, user);
          
          const response = {
            AccessToken: GenerateToken(user),
            token_type: "Bearer",
            expires_in: 3600
          }; 
          res.status(200).json({ response });
        }
      }
    );
  } catch (error) {
    console.error("認証エラー:", error);
    res.status(401).json({ message: error.message });
  }
});

app.listen(port, () => {
  console.log(`Example app listening at http://localhost:${port}`);
});
