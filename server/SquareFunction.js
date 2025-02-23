const { SquareClient } = require("square");
const { connection } = require("./config");
const { v4: uuidv4 } = require("uuid");

const squareClient = new SquareClient({
  token: "EAAAl3qvaEFwgNjCiYc51iRS8DabAhTUuJl0apLduuOWCWk0dAAw4SWf-4TnHopZ"
});

const SaveSquareCustomer = async user_data => {
  return new Promise(async (resolve, reject) => {
    try {
      const squareResponse = await squareClient.customers.create({
        idempotencyKey: uuidv4(),
        emailAddress: user_data.email,
        givenName: user_data.name
      });
      resolve(squareResponse);
    } catch (err) {
      console.error("エラーが発生しました:", err);
      reject({ error: err, code: 500 });
    }
  });
};

const CheckSquareCustomer = email => {
  return new Promise(async (resolve, reject) => {
    try {
      const squareResponse = await squareClient.customers.search({
        query: {
          filter: {
            emailAddress: {
              exact: email
            }
          }
        }
      });
      console.log("スクエア", squareResponse);
      // 顧客が存在する場合はtrueを返す
      resolve(squareResponse.count > 0);
    } catch (err) {
      console.error("エラーが発生しました:", err);
      reject(false);
    }
  });
};

module.exports = {
  SaveSquareCustomer,
  CheckSquareCustomer
};
