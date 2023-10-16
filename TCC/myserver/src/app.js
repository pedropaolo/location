// const express = require("express");

// const app = express();
// const PORT = process.env.PORT || 3000;


// app.listen(PORT, () => {
//     console.log(`Server listening on ${PORT}`);
// });

// // Parte 1. Conexão com firewall, recuperação dinâmica dos dados provenientes da REST API Fortinet

// app.get('/', (req, res) => {
//     res.send('hello world');
// });

const express = require('express');
const axios = require('axios');
const app = express();
const port = 3000;

// Rota para fazer a requisição à URL e apresentar os dados no console
app.get('/req', async (req, res) => {
    try {
        const response = await axios.get('https://10.69.70.254/api/v2/cmdb/firewall/address/?access_token=d4g1y41n66qgp1ymQsngbxckc7wyd3'); 


        console.log('Dados da Requisição:');
        console.log(response.data);
        res.json(response.data); // Você também pode retornar os dados como resposta da rota
         
    } catch (error) {
        console.error('Erro ao fazer a requisição:', error);
        res.status(500).send('Erro ao fazer a requisição.');
    }
});

app.listen(port, () => {
    console.log(`Servidor Express rodando na porta ${port}`);
});




