const express = require("express");

const app = express();
const PORT = process.env.PORT || 3000;


app.listen(PORT, () => {
    console.log(`Server listening on ${PORT}`);
});

// Parte 1. Conexão com firewall, recuperação dinâmica dos dados provenientes da REST API Fortinet

app.get('/', (req, res) => {
    res.send('hello world');
});

