const express = require('express');
const axios = require('axios');
const app = express();
const port = 3000;

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

app.get('/dados', (req, res) => {
    axios.get(url)
        .then(response => {

            const responseData = response.data.results;

            // Para realizar a trilateração, é necessário que pelo menos 3 APs estajam enxergando o beacon BLE. Para isso, realizou-se a filtragem dos objetos que estavam sendo "enxegados" por pelo menos 3 APs.
            const objetosFiltrados = responseData.filter(objeto => objeto.triangulation_regions && objeto.triangulation_regions.length === 3);

            // Envie a resposta JSON
            res.json(objetosFiltrados);
        })
        .catch(error => {
            console.error('Erro na requisição:', error);
            res.status(500).json({ error: 'Erro na requisição' });
        });
});


app.listen(port, () => {
    console.log(`Servidor Express rodando na porta ${port}`);
});


// // Dados dos pontos de acesso com coordenadas conhecidas
// const accessPoints = [
//     { wtp_id: "FP231FTF20011660", x: 0, y: 0 },
//     { wtp_id: "FP231FTF20011648", x: 1, y: 0 },
//     { wtp_id: "FP231FTF20011651", x: 0, y: 1 },
//     // Adicione mais pontos de acesso conhecidos conforme necessário
// ];

// // Função para estimar a posição com base nas medições de RSSI
// function estimatePosition(deviceData) {
//     const distances = [];
//     for (const region of deviceData.triangulation_regions) {
//         const ap = accessPoints.find(ap => ap.wtp_id === region.wtp_id);
//         if (ap) {
//             // Use o modelo RSSI para estimar a distância (substitua com sua própria fórmula)
//             const distance = calculateDistanceFromRSSI(region.rssi);
//             distances.push({ x: ap.x, y: ap.y, distance });
//         }
//     }

//     if (distances.length < 3) {
//         return "Não é possível estimar a posição com menos de 3 medições.";
//     }

//     // Realize a trilateração para determinar a posição do dispositivo
//     const position = trilaterate(distances);
//     return position;
// }

// // Função para calcular a distância com base no modelo RSSI (substitua com sua própria fórmula)
// function calculateDistanceFromRSSI(rssi) {
//     // Substitua esta fórmula pelo seu próprio modelo RSSI-distância
//     return Math.pow(10, (27.55 - rssi) / 20.0);
// }

// // Função de trilateração (exemplo simples)
// function trilaterate(distances) {
//     // Implemente aqui a lógica de trilateração para determinar a posição
//     // Consulte recursos de trilateração para obter detalhes sobre a implementação.
//     // Existem várias bibliotecas disponíveis que podem ajudar nesse processo.

//     // Exemplo simples: média ponderada das coordenadas ponderadas pelas distâncias
//     let weightedX = 0;
//     let weightedY = 0;
//     let totalWeight = 0;

//     for (const d of distances) {
//         const weight = 1 / d.distance;
//         totalWeight += weight;
//         weightedX += d.x * weight;
//         weightedY += d.y * weight;
//     }

//     return { x: weightedX / totalWeight, y: weightedY / totalWeight };
// }

// // Exemplo de uso
// const deviceData = {
//     type: "unassociated device",
//     mac: "00:05:16:65:13:13",
//     manufacturer: "SMART Modular",
//     triangulation_regions: [
//         { wtp_id: "FP231FTF20011660", rssi: 26, last_seen: 1697478640 },
//         { wtp_id: "FP231FTF20011648", rssi: 36, last_seen: 1697478641 },
//         { wtp_id: "FP231FTF20011651", rssi: 17, last_seen: 1697478139 },
//     ],
// };

// const estimatedPosition