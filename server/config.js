const mysql = require("mysql");
const { SquareClient, SquareEnvironment } = require("square");
const { OAuth2Client } = require("google-auth-library");
const jwt = require("jsonwebtoken");
const cookieParser = require("cookie-parser");

const connection = mysql.createConnection({
  host: "localhost",
  user: "app-user",
  password: 'q+b4(F}{bH"LzSQm',
  database: "Animaloop"
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

const SECRET_KEY = "vU4@i1nQMSLN2pr9xQ7A!J^@7rw"; // 🔑 秘密鍵（本番では環境変数にする）
const SECRET_REFRESH_KEY = "lZ2!6mFJa&!kWq^kszJ2*hU159BF"; // 🔑 リフレッシュトークンの秘密鍵
const GenerateToken = user => {
  return jwt.sign({ user_id: user.id, email: user.email }, SECRET_KEY, {
    expiresIn: user.limit
  }); // ユーザーごとの制限に合わせる
};

const GenerateRefreshToken = user => {
  return jwt.sign({ user_id: user.id, email: user.email }, SECRET_REFRESH_KEY, {
    expiresIn: "14d" // 14日間有効
  });
};

function getUserFromToken(token) {
  try {
    return jwt.verify(token, SECRET_KEY);
  } catch (err) {
    return null;
  }
}

function getUserFromRefreshToken(token) {
  try {
    return jwt.verify(token, SECRET_REFRESH_KEY);
  } catch (err) {
    return null;
  }
}

function checkAccessToken(req, res, next) {
  const authHeader = req.headers.authorization;
  const refresh_token = req.cookies.refresh_token;

  // もしアクセストークンがない場合は、リフレッシュトークンを使用
  if (!authHeader && !refresh_token) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const token = authHeader ? authHeader.replace("Bearer ", "") : null;
  const user = token
    ? getUserFromToken(token)
    : getUserFromRefreshToken(refresh_token);

  if (!user) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const newAccessToken = GenerateToken(user);

  if (refresh_token) {
    // リフレッシュトークンの期限確認
    let decoded;
    try {
      decoded = jwt.verify(refresh_token, SECRET_REFRESH_KEY);
    } catch (err) {
      return res
        .status(401)
        .json({ message: "Unauthorized", error: err.message });
    }

    const remainingTime = decoded.exp - Math.floor(Date.now() / 1000); // 秒数
    const daysRemaining = Math.floor(remainingTime / 86400); // 日数に変換

    if (daysRemaining < 7) {
      // 7日未満なら新しいリフレッシュトークンを発行
      const newRefreshToken = GenerateRefreshToken(user);
      res.cookie("refresh_token", newRefreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        maxAge: REFRESH_LIMIT * 1000,
        sameSite: "lax"
      });
      return res.json({
        access_token: newAccessToken
      });
    } else {
      return res.json({ access_token: newAccessToken });
    }
  }

  // ユーザー情報をリクエストに追加
  req.user = user;
  next();
}

//リフレッシュトークンの設定
function checkRefreshToken(res, user, RefreshToken) {
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 31);

  // `expiresAt` を `YYYY-MM-DD HH:MM:SS` に変換
  const formattedExpiresAt = expiresAt
    .toISOString()
    .slice(0, 19)
    .replace("T", " ");

  // リフレッシュトークンをHTTP Onlyクッキーに設定
  res.cookie("refresh_token", RefreshToken, {
    httpOnly: true, // JavaScriptからアクセスできない
    secure: process.env.NODE_ENV === "production", // 本番環境でのみhttps
    maxAge: 14 * 24 * 60 * 60 * 1000, // 14日間の有効期限
    sameSite: "lax" // クロスサイトリクエストを制限
  });

  //リフレッシュトークンおなじuser_idを持つトークンを削除
  connection.query(
    "DELETE FROM refresh_tokens WHERE user_id = ?",
    [user.id],
    (error, results) => {
      if (error) {
        console.error("エラーが発生しました:", error);
        res.status(500).json({
          err_message: "サーバーエラーが発生しました"
        });
        return;
      }
    }
  );
  //リフレッシュトークをSQLに保存
  connection.query(
    "INSERT INTO refresh_tokens (user_id, refresh_token,expires_at ) VALUES (?, ?, ?)",
    [user.id, RefreshToken, formattedExpiresAt],
    (error, results) => {
      if (error) {
        console.error("エラーが発生しました:", error);
        res.status(500).json({
          err_message: "サーバーエラーが発生しました"
        });
        return;
      }
    }
  );
}

module.exports = {
  connection,
  corsOptions,
  square,
  googleOAuth,
  GenerateToken,
  getUserFromToken,
  GenerateRefreshToken,
  getUserFromRefreshToken,
  checkAccessToken,
  checkRefreshToken
};
