const express = require('express');
const axios = require('axios');
const app = express();
const cors = require('cors'); // Importe o pacote cors
const port = 3000;

// Configuração básica do CORS para permitir todas as origens (não recomendado para produção)
app.use(cors());

// const allowedOrigins = ['http://localhost:3000']; // Substitua pelo seu URL real
// app.use(cors({
//     origin: function (origin, callback) {
//         if (allowedOrigins.indexOf(origin) !== -1 || !origin) {
//             callback(null, true);
//         } else {
//             callback(new Error('Acesso não permitido por CORS'));
//         }
//     },
// }));

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
    'FP23JFTF21006176': { 'x': 26, 'y': 2.3 },
}




app.get('/dados', (req, res) => {
    axios.get(url)
        .then(response => {

            // Filtragem dos dados brutos obtidos via API
            const responseData = response.data.results;
            const objetosFiltrados = responseData.filter(objeto => objeto.triangulation_regions && objeto.type === 'BLE device');

            const now = Date.now() / 1000; // Convertendo o tempo atual para segundos
            const objetosVistosNosUltimos15Minutos = objetosFiltrados.filter(objeto => {
                return objeto.triangulation_regions.some(region => (now - region.last_seen) <= 1800); 
            });

            //res.json(objetosVistosNosUltimos15Minutos);

            // Condição removida (objeto.length === 3) - Atualmente os APs da empresa 

            //res.json(objetosFiltrados)

            // Formatação para cálculo de trilateração
            const trilaterationData = objetosVistosNosUltimos15Minutos.map(objeto => {

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
            //res.json(trilaterationData);


            const trilaterationResult = trilaterationData.map(objeto => {
                const { type, mac, trilateration_object } = objeto;

                // Verifique se existem pelo menos 3 pontos de referência para a trilateração
                if (trilateration_object.length >= 3) {
                    // Extraia os pontos de referência
                    const ap1 = trilateration_object[0];
                    const ap2 = trilateration_object[1];
                    const ap3 = trilateration_object[2];

                    // Realize a trilateração
                    const estimatedPosition = trilaterate(ap1, ap2, ap3);

                    // Crie um novo objeto com as informações desejadas
                    const resultObj = {
                        type,
                        mac,
                        position: {
                            x: estimatedPosition.x,
                            y: estimatedPosition.y,
                        },
                    };

                    return resultObj;
                } else {
                    // Não há pontos de referência suficientes para a trilateração
                    // Você pode tomar ação apropriada, como retornar null ou definir um valor padrão
                    return objeto;
                   
                }
            });

            // Remova os objetos nulos, que não possuem pontos de referência suficientes
            const validTrilaterationResults = trilaterationResult.filter(result => result !== null);

            // Agora, você tem uma matriz de objetos contendo as coordenadas estimadas (x, y) e os endereços MAC
            res.json(validTrilaterationResults);


        })
        .catch(error => {
            console.error('Erro na requisição:', error);
            res.status(500).json({ error: 'Erro na requisição' });
        });
    // Obtenha a URL de origem da requisição
    const origin = req.get('Origin');
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

// Trilateração

function trilaterate(ap1, ap2, ap3) {
    const x1 = ap1.x;
    const y1 = ap1.y;
    const d1 = ap1.distancia;

    const x2 = ap2.x;
    const y2 = ap2.y;
    const d2 = ap2.distancia;

    const x3 = ap3.x;
    const y3 = ap3.y;
    const d3 = ap3.distancia;

    const A = 2 * (x2 - x1);
    const B = 2 * (y2 - y1);
    const C = 2 * (x3 - x1);
    const D = 2 * (y3 - y1);

    const E = (d1 * d1 - d2 * d2 - x1 * x1 + x2 * x2 - y1 * y1 + y2 * y2);
    const F = (d2 * d2 - d3 * d3 - x2 * x2 + x3 * x3 - y2 * y2 + y3 * y3);

    const x = ((E * D - B * F) / (A * D - B * C));
    const y = ((E * C - A * F) / (B * C - A * D));

    return { x, y };
}



