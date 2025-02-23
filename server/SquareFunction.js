const { Client, Environment } = require("square");
const { connection } = require("./config");
const { v4: uuidv4 } = require("uuid");

const squareClient = new Client({
  environment: Environment.Sandbox,
  accessToken: process.env.SQUARE_ACCESS_TOKEN
});

const SaveSquareCustomer = user_data => {
  return new Promise((resolve, reject) => {
    try {
      const squareResponse = squareClient.customers.create({
        idempotencyKey: uuidv4(),
        emailAddress: user_data.email,
        givenName: user_data.name
      });
      console.log("スクエア", squareResponse);
      resolve(squareResponse);
    } catch (err) {
      console.error("エラーが発生しました:", err);
      reject(false);
    }
  });
};

const CheckSquareCustomer = email => {
  return new Promise((resolve, reject) => {
    try {
      const squareResponse = squareClient.customers.searchCustomers({
        query: {
          filter: {
            emailAddress: {
              exact: email
            }
          }
        }
      });
      console.log("スクエア", squareResponse);
      resolve(true);
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
