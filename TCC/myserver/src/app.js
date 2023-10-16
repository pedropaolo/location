const express = require('express');
const axios = require('axios');
const app = express();
const port = 3000;
let responseData; // Defina responseData fora do escopo do .then

// Realizando requisição ao FGT - Objeto bruto com todas as informações

const url = 'https://fgt.nct.com.br/api/v2/monitor/wifi/unassociated-devices?with_triangulation=true&access_token=d4g1y41n66qgp1ymQsngbxckc7wyd3';

axios.get(url)
    .then(response => {
        responseData = response.data.results; // Atribua a responseData aqui

        // Filtrar os resultados para objetos com um campo "triangulation_regions"
        const objetosFiltrados = responseData.filter(objeto => objeto.triangulation_regions);

        console.log('Objetos com triangulation_regions:');
        console.log(objetosFiltrados);
    })
    .catch(error => {
        console.error('Erro na requisição:', error);
    });

// Criação de método com framework express para exportar JSON recuperado

app.get('/dados', (req, res) => {
    if (responseData) {
        res.json(responseData);
    } else {
        res.status(500).json({ error: 'Os dados não foram carregados ainda.' });
    }
});

app.listen(port, () => {
    console.log(`Servidor Express rodando na porta ${port}`);
});
