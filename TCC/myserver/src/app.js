const express = require('express');
const axios = require('axios');
const app = express();
const port = 3000;
const Circle = require('least-squares');

// URL de acesso ao FGT de produção: fgt.nct.com.br e chave da API para acesso

const url = 'https://fgt.nct.com.br/api/v2/monitor/wifi/unassociated-devices?with_triangulation=true&access_token=d4g1y41n66qgp1ymQsngbxckc7wyd3';

// Coordenadas (x,y) dos APs que realizam a captura dos dados - unassociated devices

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

// Recuperação de todos os dados retornados pelo firewall
// Aqui também é realizado um tratamento inicial

// app.get('/dados', (req, res) => {
//     axios.get(url)
//         .then(response => {

//             const responseData = response.data.results;

//             // Para realizar a trilateração, é necessário que pelo menos 3 APs estajam enxergando o beacon BLE. Para isso, realizou-se a filtragem dos objetos que estavam sendo "enxegados" por pelo menos 3 APs.
//             const objetosFiltrados = responseData.filter(objeto => objeto.triangulation_regions && objeto.triangulation_regions.length === 3 && objeto.type === 'BLE device');



//             const trilaterationData = objetosFiltrados.map(objeto => {
//                 const trilaterationInfo = objeto.triangulation_regions.map(region => {
//                     const { wtp_id, rssi } = region;
//                     const { x, y } = localizacao_aps[wtp_id] || { x: 0, y: 0 }; 
//                     return { x, y, rssi };
//                 });

//                 return {
//                     type: objeto.type,
//                     mac: objeto.mac,
//                     trilateration_object: trilaterationInfo,
//                 };
//             });



//             res.json(objetosFiltrados);
//         })
//         .catch(error => {
//             console.error('Erro na requisição:', error);
//             res.status(500).json({ error: 'Erro na requisição' });
//         });


// });

app.get('/dados', (req, res) => {
    axios.get(url)
        .then(response => {

            // Filtragem dos dados brutos obtidos via API
            const responseData = response.data.results;
            const objetosFiltrados = responseData.filter(objeto => objeto.triangulation_regions && objeto.triangulation_regions.length === 3 && objeto.type === 'BLE device');

            // Formatação para cálculo de trilateração

            const trilaterationData = objetosFiltrados.map(objeto => {
                const trilaterationInfo = objeto.triangulation_regions.map(region => {
                    const { wtp_id, rssi } = region;
                    const { x, y } = localizacao_aps[wtp_id] || { x: 0, y: 0 };
                    return { x, y, rssi };
                });

            // Formação de objeto no formato desejado
                return {
                    type: objeto.type,
                    mac: objeto.mac,
                    trilateration_object: trilaterationInfo,
                };
            });

            res.json(trilaterationData); 
        })
        .catch(error => {
            console.error('Erro na requisição:', error);
            res.status(500).json({ error: 'Erro na requisição' });
        });
});


// ALGORITMO UTILIZADO

/**
 
Capturar dados relativos ao BLE
Obter objeto no formato: 

    "type": "BLE device",
    "mac": "1c:1a:c0:61:dd:c7",
    "manufacturer": "Apple",
    "triangulation_regions": [
    {
    "wtp_id": "FP231FTF20011648",
    "rssi": 4,
    "last_seen": 1697549759
    },
    {
    "wtp_id": "FP231FTF20011781",
    "rssi": 17,
    "last_seen": 1693916877
    },
    {
    "wtp_id": "FP231FTF20011660",
    "rssi": 24,
    "last_seen": 1693916071
    }

depois disso, deve-se realizar a posição estimada do dispositivo.
para cada triangulation region

verificar wtp_id. Na lista de APs, existem as coordenadas (x,y) de cada um dos APs que estão capturando informações

criar objeto do tipo:

    type: BLE device
    mac: endereço mac
    trilateration_object:{
        x;
        y;
        distance;
    }

Aplicar trilateração -> coordenadas x,y de um ponto

Armazenar posição + endereço MAC


 */


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

// FUNÇÃO QUE REALIZA A TRILATERAÇÃO

function trilateration(ap_positions_with_distances) {
    const circles = ap_positions_with_distances.map(item => new Circle(item.x, item.y, item.distancia));
    const { result, meta } = Circle.leastSquares(circles);
    const estimated_position = { x: result.center.x, y: result.center.y };
    return estimated_position;
}

/*

Exemplo de uso:
const ap_positions_with_distances = [
    { x: x1, y: y1, distancia: d1 },
    { x: x2, y: y2, distancia: d2 },
    { x: x3, y: y3, distancia: d3 }
];

*/


