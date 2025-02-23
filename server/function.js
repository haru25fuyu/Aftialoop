const cookieParser = require("cookie-parser");
const {
  SaveRefreshToken,
  SaveUser,
  SaveProfile,
  DeleteRegistrationToken
} = require("./SqlFunction");
const { SaveSquareCustomer } = require("./SquareFunction");

function CheckUser(req, res) {
  const authHeader = req.headers.authorization;
  const refresh_token = req.cookies.refresh_token;

  // もしアクセストークンがない場合は、リフレッシュトークンを使用
  if (!authHeader && !refresh_token) {
    return res.status(401).json({ user: false, message: "トークンが有りません" });
  }

  let token = authHeader ? authHeader.replace("Bearer ", "") : null;
  let user = token ? getUserFromToken(token) : null;

  if (!user && !refresh_token) {
    return res.status(401).json({ user: false, message: "トークンが期限切れです" });
  }

  if (!user) {
    user = refresh_token ? getUserFromRefreshToken(refresh_token) : null;
    if (!user) {
      return res.status(401).json({ user: false, message: "アクセストークンが期限切れです" });
    } else {
      //リフレッシュトークンは存在するがアクセストークンがない場合
      const newAccessToken = GenerateToken(user); //アクセストークンの再発行

      //リフレッシュトークンの期限を確認少なかったら再発行
      const remainingTime = user.exp - Math.floor(Date.now() / 1000); // 秒数
      const daysRemaining = Math.floor(remainingTime / 86400); // 日数に変換

      if (daysRemaining < 7) {
        // 7日未満なら新しいリフレッシュトークンを発行
        checkRefreshToken(res, user);

        return res
          .status(200)
          .json({ user: true, access_token: newAccessToken });
      }

      return res.status(200).json({ user: true, access_token: newAccessToken });
    }
  } else {
    user["limit"] = "1h"; // ユーザーごとの制限に合わせる
    //アクセストークンの再発行
    const newAccessToken = GenerateToken(user);
    //リフレッシュトークンが存在すれば、期限を確認無ければ再発行
    if (!refresh_token) {
      checkRefreshToken(res, user);

      return { user: true, access_token: newAccessToken };
    }

    let decoded = getUserFromRefreshToken(refresh_token);
    if (!decoded) {
      //リフレッシュトークンが不鮮明でもアクセストークンで入ってるから大丈夫
      checkRefreshToken(res, user, newRefreshToken);
      return { user: true, access_token: newAccessToken };
    }

    const remainingTime = decoded.exp - Math.floor(Date.now() / 1000); // 秒数
    const daysRemaining = Math.floor(remainingTime / 86400); // 日数に変換

    if (daysRemaining < 7) {
      // 7日未満なら新しいリフレッシュトークンを発行
      checkRefreshToken(res, decoded);
    }
    return { user: true, access_token: newAccessToken };
  }
}

//リフレッシュトークンの設定
function checkRefreshToken(res, user) {
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 14);

  // `expiresAt` を `YYYY-MM-DD HH:MM:SS` に変換
  const formattedExpiresAt = expiresAt
    .toISOString()
    .slice(0, 19)
    .replace("T", " ");

  // リフレッシュトークンを生成
  const RefreshToken = GenerateRefreshToken(user);
  // リフレッシュトークンをHTTP Onlyクッキーに設定
  res.cookie("refresh_token", RefreshToken, {
    httpOnly: true, // JavaScriptからアクセスできない
    //secure: process.env.NODE_ENV === "production", // 本番環境でのみhttps
    secure: false,
    maxAge: 14 * 24 * 60 * 60 * 1000, // 14日間の有効期限
    sameSite: "None" // クロスサイトリクエストを制限
  });

  SaveRefreshToken(user, RefreshToken, formattedExpiresAt);
}

const registerUser = async (token, user) => {
  try {
    const squareResponse = await SaveSquareCustomer(user);

    const setUser = {
      id: squareResponse.customer.id,
      password: user.password,
      email: user.email
    };

    const save_user = await SaveUser(setUser);
    const save_profile = await SaveProfile({ user_id: setUser.id });
    const delete_token = await DeleteRegistrationToken(token);

    // 保存処理が成功したかどうかを返す
    if (save_user.error || save_profile.error || delete_token.error) {
      throw new Error(
        save_user.error || save_profile.error || delete_token.error
      );
    }

    return { success: true }; // 成功を示すオブジェクトを返す
  } catch (error) {
    console.error("エラーが発生しました:", error);
    return { success: false, error: error.message }; // エラーメッセージを返す
  }
};

module.exports = {
  CheckUser,
  checkRefreshToken,
  registerUser
};
