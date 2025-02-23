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
const { CheckSquareCustomer } = require("./SquareFunction");
const {EmailCheck,
  RegistartionToken,
  GetUserFromRegistrationToken,
  DeleteRegistrationToken,
  SaveUser,
  SaveProfile,
  GetUserData,
  GetUserDataAndProfile,
  UpdateUser,
  UpdateProfile,
  GetProfileAndUserData,
  GetFavoriteItems,
  AddFavorite,
  DeleteFavorite,
  AddHistory,
  GetHistory,
  AddItem,
  UpdateItem,
  DeleteItem,
  GetItem,
  GetItems,
  SearchItems} = require("./SqlFunction");
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
    return res.status(200).json({ err_message: "メールアドレス、パスワードを入力して下さい" });
  }

  try {
    // 非同期で重複メールのチェック
    const sqlMail = await EmailCheck(email);
    const squareMail = await CheckSquareCustomer(email);

    if (sqlMail || squareMail) {
      return res.status(200).json({ err_message: "このメールアドレスは既に登録されています" });
    }

    if (sqlMail.error || squareMail.error) {
      return res.status(200).json({ err_message: sqlMail.error || squareMail.error });
    }

    // トークンの発行
    const token = await RegistartionToken(email, password);  

    if (token.error) {
      return res.status(token.code).json({ err_message: token.error });
    }

    // 登録リンクを作成
    const registrationLink = `https://animaloop.jp/register/confirm?token=${token}`;

    // HTMLコンテンツ作成
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

    // メール送信処理
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
              Name: `${email} 様`
            }
          ],
          Subject: "【Animaloop】アカウント作成の完了には確認が必要です",
          HTMLPart: htmlContent
        }
      ]
    });

    const result = await request;
    console.log(result.body);

    res.status(200).json({ message: "登録に成功しました" });

  } catch (err) {
    console.error(err);
    res.status(500).json({ err_message: "サーバーエラーが発生しました" });
  }
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

  const user = GetUserFromRegistrationToken(token)

  if (user.err_msg) {
    res.status(user.code).json({ err_message: user.err_msg });
    return;
  }

  user.name = user.name ? user.name : "";

  SaveSquareCustomer(user).then((squareResponse) =>{
    user.id = squareResponse.id;
    SaveUser(user);
    SaveProfile(user);
    DeleteRegistrationToken(token);
    res.status(200).json({ message: "登録に成功しました" });
  }).catch((error) => {
    console.error("エラーが発生しました:", error);
    res.status(500).json({ err_message: "サーバーエラーが発生しました" });
  });
});

app.post("/login", async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    res.status(200).json({ err_message: "メールアドレス、パスワードを入力してください" });
    return;
  }
  const where = ["email = ?"];
  const user = GetUserData(where,[email]);

  if (user.error) {
    res.status(user.code).json({ err_message: user.error });
    return;
  }

  if (!user) {
    res.status(200).json({ err_message: "メールアドレスまたはパスワードが間違っています" });
    return;
  }

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
});

//マイページの表示
app.post("/mypage", async (req, res) => {
  const user = CheckUser(req, res);

  if (!user.user)  {
    return;
  }
  const decoded = getUserFromToken(user.access_token);
  const id = decoded.id;
  

  const favorites = GetFavoriteItems(id);
  if (favorites.error) {
    res.status(favorites.code).json({ err_message: favorites.error });
    return;
  }

  const history = GetHistory(id);
  if (history.error) {
    res.status(history.code).json({ err_message: history.error });
    return;
  }

  res.status(200).json({user, view_history, favorites });
});

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

    const userData = GetUserDataAndProfile(id);
    if (userData.error) {
      res.status(userData.code).json({ err_message: userData.error });
      return;
    }
    res.status(200).json(userData);
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

    const where = ["email = ?"];
    const user =  GetUserData(where,[payload.email]);

    if (user.error) {
      res.status(user.code).json({ err_message: user.error });
      return;
    }

    if (!user) {
      //ユーザーの登録
      SaveSquareCustomer(payload).then((squareResponse) =>{
        payload.id = squareResponse.id;
        SaveUser(payload);
        SaveProfile(payload);
        res.status(200).json({ message: "登録に成功しました" });
      }).catch((error) => {
        console.error("エラーが発生しました:", error);
        res.status(500).json({ err_message: "サーバーエラーが発生しました" });
      });
    }
    
    const update_data = { name:payload.name, email:payload.email, google_id:payload.sub };
    // ユーザーが存在する場合は更新
    UpdateUser(user.id,update_data);

    let token_data = results[0];
          user["limit"] = "1h";
         checkRefreshToken(res, token_data);
          
          const response = {
            AccessToken: GenerateToken(token_data),
            token_type: "Bearer",
            expires_in: 3600
          }; 
          res.status(200).json({ response });
          
  } catch (error) {
    console.error("認証エラー:", error);
    res.status(500).json({ err_message: "認証エラーが発生しました" });
  }
});

app.listen(port, () => {
  console.log(`Example app listening at http://localhost:${port}`);
});
