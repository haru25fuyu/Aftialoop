const express = require('express');
const app = express();
const port = 3000;
const mysql = require('mysql');

const connection = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'subscription'
});

app.get('/', (req, res) => {
    res.send('Hello World');
}
);
app.get('/name', (req, res) => {
    req.query.name ? res.send(`Hello ${req.query.name}`) : res.json({'err_message' : '名前を入力して下さい'});
}
);

app.post('/signup', (req, res) => {
    const {name, password} = req.query;
    console.log(req.query);
    res.json({'name' : name, 'password' : password});
    return;
    if (!name || !password) {
        res.json({'err_message' : '名前、パスワードを入力して下さい'});
        return;
    
    }

    const date = new Date();
    connection.query('INSERT INTO users (name, pass, date) VALUES (?, ?, ?)', [name, password,date], (error, results) => {
        if (error) {
            res.json({'err_message' : '登録に失敗しました'});
            return;
        }
        res.json({'message' : '登録が完了しました'});
    });
});

app.listen(port, () => {
    console.log(`Example app listening at http://localhost:${port}`);
});