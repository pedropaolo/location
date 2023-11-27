const express = require('express');
const axios = require('axios');
const app = express();
const cors = require('cors'); // Importe o pacote cors
const port = 3000;
const trilateration = require('./trilateration.js');


// ferramentas de inteligencia artificial

const tf = require('@tensorflow/tfjs')
const sk = require('scikitjs')
sk.setBackend(tf)


// Configuração básica do CORS para permitir todas as origens (não recomendado para produção)
app.use(cors());


// URL de acesso ao FGT de produção: fgt.nct.com.br e chave da API para acesso

const url = 'https://fgt.nct.com.br/api/v2/monitor/wifi/unassociated-devices?with_triangulation=true&access_token=d4g1y41n66qgp1ymQsngbxckc7wyd3';

const url2 = 'https://fgt.nct.com.br/api/v2/monitor/wifi/client/?with_triangulation=true&access_token=d4g1y41n66qgp1ymQsngbxckc7wyd3'

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


const cache = {};
// Dispositivos conectados

app.get('/associados', (req, res) => {
    axios.get(url2)
        .then(response => {
            
            const responseData = response.data.results;
            // Objetos recuperados nos últimos 15 minutos
            const objetosVistosNosUltimos15Minutos = responseData.filter(objeto => {
                const now = Date.now() / 1000;
                return objeto.triangulation_regions &&
                    objeto.triangulation_regions.every(region => (now - region.last_seen) <= 1800);
            });

            // Criação de novo formato, apenas com nome e objeto triangulation_regions
            const novoFormato = objetosVistosNosUltimos15Minutos.map(objeto => {
                return {
                    mac: objeto.user,
                    trilateration_object: objeto.triangulation_regions,
                };
            });

            // Atualizar o cache com os valores RSSI acumulados para cada wtp_id
            novoFormato.forEach(objeto => {
                const mac = objeto.mac;
                const trilaterationObjects = objeto.trilateration_object;

                if (!cache[mac]) {
                    cache[mac] = {};
                }

                trilaterationObjects.forEach(region => {
                    const wtpId = region.wtp_id;
                    const rssiValue = region.rssi;

                    if (!cache[mac][wtpId]) {
                        cache[mac][wtpId] = [];
                    }

                    cache[mac][wtpId].push(rssiValue);
                });
            });

            res.json(cache);
        })
        .catch(error => {
            res.status(500).json({ error: 'Ocorreu um erro ao processar a requisição de dados.' });
        });
});


// Endpoint para manter os três APs com mais amostras de RSSI para cada endereço MAC
app.get('/manterTop3Aps', (req, res) => {
    const dadosFiltrados = {};

    for (const mac in cache) {
        if (cache.hasOwnProperty(mac)) {
            const aps = Object.entries(cache[mac]); // Converte para array de arrays [wtpId, rssiValues]
            aps.sort((a, b) => b[1].length - a[1].length); // Ordena os APs pela quantidade de amostras de RSSI

            const top3Aps = aps.slice(0, 3); // Mantém apenas os três primeiros APs com mais amostras de RSSI

            dadosFiltrados[mac] = {};
            top3Aps.forEach(([wtpId, rssiValues]) => {
                const mediaFiltrada = filtroKalman(rssiValues);
                dadosFiltrados[mac][wtpId] = mediaFiltrada;
            });
        }
    }

    // res.json(dadosFiltrados)

    // Retorna objetos após a aplicação do filtro de kalman

    const trilaterationData = Object.keys(dadosFiltrados).map(mac => {
        const trilaterationInfo = Object.entries(dadosFiltrados[mac]).map(([wtp_id, rssi]) => {
            const { x, y } = localizacao_aps[wtp_id] || { x: 0, y: 0 };
            const distancia = estimate_distance_from_rssi(rssi);
            return { x, y, z: 0, r: distancia };
        });

        return {
            mac,
            trilateration_object: trilaterationInfo,
        };
    });

    // res.json(trilaterationData)

    const trilaterationResult = trilaterationData.map(objeto => {
        const { mac, trilateration_object } = objeto;
        if (trilateration_object.length >= 3) {
            const ap1 = trilateration_object[0];
            const ap2 = trilateration_object[1];
            const ap3 = trilateration_object[2];
            const estimatedPosition = trilateration(ap1, ap2, ap3, true);

            if (estimatedPosition != null) {
                return {
                    mac,
                    position: {
                        x: estimatedPosition.x,
                        y: estimatedPosition.y,
                    },
                };
            }
        }
             else  return {
                    mac,
                    position: {
                        x: 0,
                        y: 0,
                    },
        };
    });
    
    res.json(trilaterationResult)
   
});


app.get('/dados', (req, res) => {
    axios.get(url)
        .then(response => {

            // Filtragem dos dados brutos obtidos via API
            const responseData = response.data.results;
            //res.json(responseData)
            const objetosFiltrados = responseData.filter(objeto => objeto.triangulation_regions && objeto.triangulation_regions.length === 3 && objeto.type === 'BLE device');

            const now = Date.now() / 1000; // Convertendo o tempo atual para segundos
            const objetosVistosNosUltimos15Minutos = objetosFiltrados.filter(objeto => {
                return objeto.triangulation_regions.some(region => (now - region.last_seen) <= 1800); 
            });

            //res.json(objetosVistosNosUltimos15Minutos);

            // Condição removida (objeto.length === 3) - Atualmente os APs da empresa 

            // Formatação para cálculo de trilateração
            const trilaterationData = objetosFiltrados.map(objeto => {

                // Aplicação da regressão polinomial e criação de um novo campo dentro do objeto triangulation regions: distancia
                const trilaterationInfo = objeto.triangulation_regions.map(region => {
                    const { wtp_id, rssi } = region;
                    const { x, y } = localizacao_aps[wtp_id] || { x: 0, y: 0 };
                    const distancia = estimate_distance_from_rssi(rssi);
                    return { x, y, z:0, r: distancia };
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
                    const estimatedPosition = trilateration(ap1, ap2, ap3, true);
                    //console.log(estimatedPosition)

                    if(estimatedPosition != null){
                        const resultObj = {
                            type,
                            mac,
                            position: {
                                x: estimatedPosition.x,
                                y: estimatedPosition.y,
                            },
                        };

                        return resultObj;
                    }

                    
                } else {
                    const resultObj = {
                        type,
                        mac,
                        position: {
                            x: 0,
                            y: 0,
                        },
                    };

                    return resultObj;
                }
            });
           

            // Agora, você tem uma matriz de objetos contendo as coordenadas estimadas (x, y) e os endereços MAC
            res.json(trilaterationResult);


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

function filtroKalman(valoresRSSI) {
    let mediaFiltrada = 0;
    let erroEstimado = 1;

    for (const valor of valoresRSSI) {
        const ganhoKalman = erroEstimado / (erroEstimado + 1);
        mediaFiltrada = mediaFiltrada + ganhoKalman * (valor - mediaFiltrada);
        erroEstimado = (1 - ganhoKalman) * erroEstimado;
    }

    return mediaFiltrada;
}


