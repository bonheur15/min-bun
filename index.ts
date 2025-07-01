import express from 'express';

const app = express();
const port = 3000;

app.get('/', (req, res) => {
    res.send('Hello, world!');
});

app.get('/demo', (req, res) => {
    res.send('This is the /demo route.');
});

app.listen(port, () => {
    console.log(`Server is running at http://localhost:${port}`);
});