const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const SECRET_KEY = "your_secret_key"; // 🔑 秘密鍵（本番では環境変数にする）
const SECRET_REFRESH_KEY = "your_secret_refresh_key"; // 🔑 秘密鍵（本番では環境変数にする）

const GenerateToken = user => {
  return jwt.sign(
    { id: user.id, email: user.email, name: user.name },
    SECRET_KEY,
    {
      expiresIn: user.limit
    }
  ); // ユーザーごとの制限に合わせる
};

const GenerateRefreshToken = user => {
  return jwt.sign({ id: user.id, email: user.email }, SECRET_REFRESH_KEY, {
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

async function hashPassword(password) {
  const saltRounds = 10; // 計算コスト（10〜12が推奨）
  const hashedPassword = await bcrypt.hash(password, saltRounds);
  return hashedPassword;
}

module.exports = {
  hashPassword,
  GenerateToken,
  GenerateRefreshToken,
  getUserFromToken,
  getUserFromRefreshToken
};
