const express = require('express');
const axios = require('axios');
const app = express();
const port = 3000;
const { Circle } = require('least-squares');


// URL de acesso ao FGT de produção: fgt.nct.com.br e chave da API para acesso

const url = 'https://fgt.nct.com.br/api/v2/monitor/wifi/unassociated-devices?with_triangulation=true&access_token=d4g1y41n66qgp1ymQsngbxckc7wyd3';

// Coordenadas (x,y) dos APs que realizam a captura dos dados - FortiAPs NCT Informática

localizacao_aps = {
    'FP231FTF20011687': { 'x': 2.8, 'y': 6.2 },
    'FP231FTF20011686': { 'x': 7.5, 'y': 2 },
    'FP221ETF18067422': { 'x': 2, 'y': 8 },
    'FP231FTF20011651': { 'x': 6, 'y': 9.4 },
    'FP231FTF21008385': { 'x': 13, 'y': 10.5 },
    'FP231FTF20011648': { 'x': 18, 'y': 9 },
    'FP231FTF20011778': { 'x': 16.8, 'y': 5 },
    'FP231FTF20011660': { 'x': 25, 'y': 8.3 },
    'FP231FTF20011704': { 'x': 26, 'y': 2 },
    'FP231FTF20011781': { 'x': 31.8, 'y': 3 },
    'FP231FTF21007223': { 'x': 32, 'y': 10.6 },
    'FP23JFTF21006176': { 'x': 26, 'y': 2.3 }
}


app.get('/dados', (req, res) => {
    axios.get(url)
        .then(response => {

            // Filtragem dos dados brutos obtidos via API
            const responseData = response.data.results;
            const objetosFiltrados = responseData.filter(objeto => objeto.triangulation_regions && objeto.triangulation_regions.length === 3 && objeto.type === 'BLE device');

            // Formatação para cálculo de trilateração
            const trilaterationData = objetosFiltrados.map(objeto => {

                // Aplicação da regressão polinomial e criação de um novo campo dentro do objeto triangulation regions: distancia
                const trilaterationInfo = objeto.triangulation_regions.map(region => {
                    const { wtp_id, rssi } = region;
                    const { x, y } = localizacao_aps[wtp_id] || { x: 0, y: 0 };
                    const distancia = estimate_distance_from_rssi(rssi); 
                    return { x, y, rssi, distancia };
                });

                return {
                    type: objeto.type,
                    mac: objeto.mac,
                    trilateration_object: trilaterationInfo,
                };
            });

            // Determinação da coordenada estimada (x,y) através da trilateração
            res.json(trilaterationData);
        })
        .catch(error => {
            console.error('Erro na requisição:', error);
            res.status(500).json({ error: 'Erro na requisição' });
        });
});


app.listen(port, () => {
    console.log(`Servidor Express rodando na porta ${port}`);
});


// FUNÇÔES AUXILIARES

// Estimativa de distância com RSSI - Regressão polinomial

function estimate_distance_from_rssi(rssi) {
    // Coeficientes da equação
    const w0 = 0;
    const w1 = -3.90103347e-01;
    const w2 = 7.10195916e-03;
    const w3 = -7.53416567e-05;
    const w4 = 2.10842385e-07;
    const intercept = 17.689259549594077;

    // Calcula a distância estimada com base no RSSI
    const distancia = intercept + w0 + w1 * rssi + w2 * Math.pow(rssi, 2) + w3 * Math.pow(rssi, 3) + w4 * Math.pow(rssi, 4);

    return distancia;
}




