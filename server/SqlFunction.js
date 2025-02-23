const { v4: uuidv4 } = require("uuid");
const { connection } = require("./config");
const { hashPassword, GenerateToken } = require("./Utils");

function EmailCheck(email) {
  return new Promise((resolve, reject) => {
    try {
      // e-mailの重複チェック
      connection.query(
        "SELECT * FROM users WHERE email = ?",
        [email],
        async (error, results) => {
          if (error) {
            console.error("エラーが発生しました:", error);
            reject(new Error("サーバーエラーが発生しました"));
            return;
          }

          if (results.length > 0) {
            resolve(true); // 重複あり
          } else {
            resolve(false); // 重複なし
          }
        }
      );
    } catch (error) {
      console.error("エラーが発生しました:", error);
      reject({ error: error, code: 500 }); // エラーが発生した場合の戻り値
    }
  });
}

//仮登録トークン発行
const RegistartionToken = async (email, password) => {
  return new Promise(async (resolve, reject) => {
    const id = uuidv4();
    const hashedPassword = await hashPassword(password);

    const token = GenerateToken({
      id: id,
      email: email,
      limit: "24h"
    });

    // DELETEクエリ
    connection.query(
      "DELETE FROM user_registration_tokens WHERE email = ?",
      [email],
      (error, results) => {
        if (error) {
          console.error("DELETEエラーが発生しました:", error);
          return reject("DELETEエラーが発生しました:", error);
        }

        // INSERTクエリ（DELETE成功後に実行）
        connection.query(
          "INSERT INTO user_registration_tokens (id, email, password, token, expires_at) VALUES (?, ?, ?, ?, ?)",
          [
            id,
            email,
            hashedPassword,
            token,
            new Date(Date.now() + 24 * 60 * 60 * 1000) // 24時間後
          ],
          (error, results) => {
            if (error) {
              console.error("INSERTエラーが発生しました:", error);
              return reject({ error: error, code: 500 });
            }

            // 正常終了後にトークンを返す
            resolve(token);
          }
        );
      }
    );
  });
};

//仮登録トークンからユーザーの取り出し
const GetUserFromRegistrationToken = token => {
  return new Promise((resolve, reject) => {
    connection.query(
      "SELECT * FROM user_registration_tokens WHERE token = ?",
      [token],
      (error, results) => {
        if (error) {
          console.error("エラーが発生しました:", error);
          return reject({ error: "データベースエラー" + error, code: 500 });
        }
        console.log(results);
        if (!results) {
          return reject({ error: "トークンが見つかりません", code: 404 });
        }
        resolve(results[0]);
      }
    );
  });
};

//仮登録トークンの削除
const DeleteRegistrationToken = token => {
  return new Promise((resolve, reject) => {
    connection.query(
      "DELETE FROM user_registration_tokens WHERE token = ?",
      [token],
      (error, results) => {
        if (error) {
          console.error("エラーが発生しました:", error);
          return reject({ error: error, code: 500 });
        }
        resolve(true);
      }
    );
  });
};

//ユーザー情報の保存
function SaveUser(user) {
  return new Promise((resolve, reject) => {
    let columns = [];
    let values = [];

    // Object.entries() で key と value を取り出し、columns と values に格納
    Object.entries(user).forEach(([key, value]) => {
      columns.push(key);
      values.push(value);
    });

    // プレースホルダを使って、SQLインジェクションを防ぐ
    const sql = `INSERT INTO users (${columns.join(",")}) VALUES (${columns
      .map(() => "?")
      .join(",")})`;

    connection.query(sql, values, (error, results) => {
      if (error) {
        console.error("エラーが発生しました:", error);
        reject({ error: error, code: 500 }); // エラーが発生した場合の戻り値};
      }
      return resolve(true); // 成功した場合の戻り値
    });
  });
}

const SaveProfile = user => {
  return new Promise((resolve, reject) => {
    let columns = [];
    let values = [];

    Object.entries(user).forEach(([key, value]) => {
      columns.push(key);
      values.push(value);
    });

    const placeholders = columns.map(() => "?").join(",");
    const sql = `INSERT INTO profile (${columns.join(
      ","
    )}) VALUES (${placeholders})`;

    // クエリの結果を待たずに実行
    connection.query(sql, values, (error, results) => {
      if (error) {
        console.error("エラーが発生しました:", error);
        return reject({ error: error, code: 500 });
      }
    });
    return resolve(true);
  });
};

//ユーザー情報の取得
const GetUserData = async (where = [], values = []) => {
  return new Promise(async (resolve, reject) => {
    try {
      let sql = "SELECT * FROM users";

      if (where.length > 0) {
        sql += ` WHERE ${where.join(" AND ")}`;
      }

      const [results] = await connection.promise().query(sql, values);

      if (results.length === 0) {
        return resolve(false);
      }

      return resolve(results[0]);
    } catch (error) {
      console.error("エラーが発生しました:", error);
      return reject({ error: error, code: 500 });
    }
  });
};

//ユーザーとプロフィールのデータを取得
const GetUserDataAndProfile = async id => {
  return new Promise(async (resolve, reject) => {
    try {
      // ユーザーデータを取得
      const user = await GetUserData(["id = ?"], [id]);

      // プロフィールデータを取得
      const profile = await GetProfileData(["user_id = ?"], [id]);

      resolve({ user, profile });
    } catch (error) {
      console.error("エラー:", error);
      return reject(error);
    }
  });
};

//ユーザー情報の更新
const UpdateUser = (id, user) => {
  return new Promise((resolve, reject) => {
    let setClauses = [];
    let values = [];

    // ユーザー情報のキーと値をループ処理
    Object.entries(user).forEach(([key, value]) => {
      setClauses.push(`${key} = ?`); // カラム名 = ? にしてプレースホルダーを使用
      values.push(value);
    });

    // SQL文の組み立て（WHERE id = ? にしてプレースホルダーを使用）
    const sql = `UPDATE users SET ${setClauses.join(", ")} WHERE id = ?`;
    values.push(id); // IDを最後に追加

    // クエリ実行
    connection.query(sql, values, (error, results) => {
      if (error) {
        console.error("エラーが発生しました:", error);
        return reject({ error: error, code: 500 });
      }
      resolve(true);
    });
  });
};

//プロフィール情報の更新
const UpdateProfile = (id, profile) => {
  return new Promise((resolve, reject) => {
    let setClauses = [];
    let values = [];

    // プロフィールのキーと値をループ処理
    Object.entries(profile).forEach(([key, value]) => {
      setClauses.push(`${key} = ?`);
      values.push(value);
    });

    // SQL文の組み立て（WHERE user_id = ? にしてプレースホルダーを使用）
    const sql = `UPDATE profile SET ${setClauses.join(", ")} WHERE user_id = ?`;
    values.push(id); // IDを最後に追加

    // クエリ実行
    connection.query(sql, values, (error, results) => {
      if (error) {
        console.error("エラーが発生しました:", error);
        return reject({ error: error, code: 500 });
      }
      resolve(true);
    });
  });
};

//プロフィールとユーザー情報をジョインして取得
const GetProfileAndUserData = id => {
  return new Promise((resolve, reject) => {
    connection.query(
      `SELECT * FROM profile INNER JOIN users ON profile.user_id = users.id WHERE profile.user_id = ?`,
      [id],
      (error, results) => {
        if (error) {
          console.error("エラーが発生しました:", error);
          return reject({ error: error, code: 500 });
        }
        resolve(results[0]);
      }
    );
  });
};

//お気に入りと商品情報をjoinして取得
const GetFavoriteItems = user_id => {
  return new Promise((resolve, reject) => {
    connection.query(
      `SELECT * FROM favorites INNER JOIN items ON favorites.item_id = items.id WHERE favorites.user_id = `,
      (error, results) => {
        if (error) {
          console.error("エラーが発生しました:", error);
          return reject({ error: error, code: 500 });
        }
        resolve(results);
      }
    );
  });
};

//お気に入りの追加
const AddFavorite = (user_id, item_id) => {
  return new Promise((resolve, reject) => {
    connection.query(
      "INSERT INTO favorites (user_id, item_id) VALUES (?, ?)",
      [user_id, item_id],
      (error, results) => {
        if (error) {
          console.error("エラーが発生しました:", error);
          return reject({ error: error, code: 500 });
        }
        resolve(true);
      }
    );
  });
};

//お気に入りの削除
const DeleteFavorite = (user_id, item_id) => {
  return new Promise((resolve, reject) => {
    connection.query(
      "DELETE FROM favorites WHERE user_id = ? AND item_id = ?",
      [user_id, item_id],
      (error, results) => {
        if (error) {
          console.error("エラーが発生しました:", error);
          return reject({ error: error, code: 500 });
        }
        resolve(true);
      }
    );
  });
};

//閲覧履歴の追加
const AddHistory = (user_id, item_id) => {
  return new Promise((resolve, reject) => {
    connection.query(
      "INSERT INTO histories (user_id, item_id) VALUES (?, ?)",
      [user_id, item_id],
      (error, results) => {
        if (error) {
          console.error("エラーが発生しました:", error);
          return reject({ error: error, code: 500 });
        }
        resolve(true);
      }
    );
  });
};

//閲覧履歴の取得
const GetHistory = user_id => {
  return new Promise((resolve, reject) => {
    connection.query(
      `SELECT * FROM histories INNER JOIN items ON histories.item_id = items.id WHERE histories.user_id = ?`,
      [user_id],
      (error, results) => {
        if (error) {
          console.error("エラーが発生しました:", error);
          return reject({ error: error, code: 500 });
        }
        resolve(results);
      }
    );
  });
};

//商品の追加
const AddItem = item => {
  return new Promise((resolve, reject) => {
    let columns = [];
    let values = [];

    // SQLのベース作成
    let sql = "INSERT INTO items (";
    let sql_values = "VALUES (";

    // item オブジェクトをループ
    Object.entries(item).forEach(([key, value]) => {
      columns.push(key);
      values.push(value);
    });

    // カラム名と `?` のプレースホルダーを正しく組み立てる
    sql += columns.join(", ") + ") ";
    sql_values += values.map(() => "?").join(", ") + ")";

    // 完成したSQL文
    sql += sql_values;

    // クエリ実行
    connection.query(sql, values, (error, results) => {
      if (error) {
        console.error("エラーが発生しました:", error);
        return reject({ error: error, code: 500 });
      }
      resolve(true);
    });
  });
};

//商品の更新
const UpdateItem = (id, item) => {
  return new Promise((resolve, reject) => {
    let set = "";
    item.map((key, value) => {
      set += `${key} = ${value},`;
    });
    const sql = `UPDATE items SET ${set} WHERE id = ${id}`;
    connection.query(sql, (error, results) => {
      if (error) {
        console.error("エラーが発生しました:", error);
        return reject({ error: error, code: 500 });
      }
      resolve(true);
    });
  });
};

//商品の削除
const DeleteItem = id => {
  return new Promise((resolve, reject) => {
    connection.query(
      "DELETE FROM items WHERE id = ?",
      [id],
      (error, results) => {
        if (error) {
          console.error("エラーが発生しました:", error);
          return reject({ error: error, code: 500 });
        }
        resolve(true);
      }
    );
  });
};

//商品の取得
const GetItem = id => {
  return new Promise((resolve, reject) => {
    connection.query(
      "SELECT * FROM items WHERE id = ?",
      [id],
      (error, results) => {
        if (error) {
          console.error("エラーが発生しました:", error);
          return reject({ error: error, code: 500 });
        }
        resolve(results[0]);
      }
    );
  });
};

//商品のリスト検索
const GetItems = (where, value) => {
  return new Promise((resolve, reject) => {
    let sql = "SELECT * FROM items";
    if (where) {
      sql += ` WHERE ${where.join(" AND ")}`;
    }
    connection.query(sql, value, (error, results) => {
      if (error) {
        console.error("エラーが発生しました:", error);
        return reject({ error: error, code: 500 });
      }
      resolve(results);
    });
  });
};

//商品の検索
const SearchItems = keyword => {
  return new Promise((resolve, reject) => {
    connection.query(
      `SELECT * FROM items WHERE name LIKE '%?%' OR description LIKE '%?%'`,
      [keyword, keyword],
      (error, results) => {
        if (error) {
          console.error("エラーが発生しました:", error);
          return reject({ error: error, code: 500 });
        }
        resolve(results);
      }
    );
  });
};

const SaveRefreshToken = (user_id, RefreshToken, formattedExpiresAt) => {
  return new Promise((resolve, reject) => {
    connection.query(
      "DELETE FROM refresh_tokens WHERE user_id = ?",
      [user_id],
      (error, results) => {
        if (error) {
          console.error("エラーが発生しました:", error);
          return reject({ error: error, code: 500 });
        }
      }
    );
    connection.query(
      "INSERT INTO refresh_tokens (user_id, refresh_token,expires_at ) VALUES (?, ?, ?)",
      [user_id, RefreshToken, formattedExpiresAt],
      (error, results) => {
        if (error) {
          console.error("エラーが発生しました:", error);
          return reject({ error: error, code: 500 });
        }
      }
    );
  });
};

module.exports = {
  EmailCheck,
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
  SearchItems,
  SaveRefreshToken
};
