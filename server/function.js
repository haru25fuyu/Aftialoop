const mysql = require("mysql");
const { connection } = require("./config");
const bcrypt = require("bcrypt");

// 使用する数字の範囲（1〜9）で、隣接する数字が同じでない20桁のIDを生成
function generateUniqueID() {
  var newID = 0;
  var in_digit = 1;
  for (let i = 0; i < 10; i++) {
    const digit = Math.floor(Math.random() * 9) + 1; // 1〜9のランダムな数字
    newID += digit * in_digit;
    in_digit *= 10;
  }
  return newID;
}

// 重複チェックと挿入処理
function GetUniqueID(newID) {
  return new Promise((resolve, reject) => {
    connection.query(
      "SELECT COUNT(*) AS count FROM users WHERE id = ?",
      [newID],
      (err, results) => {
        if (err) {
          console.error("エラーが発生しました:", err);
          return reject(err); // エラーを返す
        }

        if (results[0].count === 0) {
          // 重複がなければIDを返す
          return resolve(newID);
        } else {
          // 再帰的に新しいIDを生成
          GetUniqueID(generateUniqueID()).then(resolve).catch(reject);
        }
      }
    );
  });
}

async function hashPassword(password) {
  const saltRounds = 10; // 計算コスト（10〜12が推奨）
  const hashedPassword = await bcrypt.hash(password, saltRounds);
  return hashedPassword;
}

module.exports = {
  GetUniqueID,
  generateUniqueID,
  hashPassword,
  SaveSquareCustomer
};
