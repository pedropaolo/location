// Construção do mapa que será aproveitado. Utilizando Leaflet
const map = L.map("map", {
    crs: L.CRS.Simple,
    minZoom: -10,
    maxZoom: 2,
    scrollWheelZoom: true,
    smoothWheelZoom: true,
    smoothSensitivity: 1.5,
    zoomControl: true,
    attributionControl: false
});

// Objeto com as coordenadas que vêm do backend. JSON com coordenadas x, y e endereço MAC

const posicao_aps_metros = {
    'FP231FTF20011687': { 'x': 2.8, 'y': 6.2 },
    'FP231FTF20011686': { 'x': 7.5, 'y': 2.8 },
    'FP231FTF20011651': { 'x': 6.2, 'y': 15.5 },
    'FP231FTF21008385': { 'x': 13, 'y': 15.5 },
    'FP231FTF20011648': { 'x': 18, 'y': 15 },
    'FP231FTF20011778': { 'x': 16.8, 'y': 5 },
    'FP231FTF20011660': { 'x': 25, 'y': 12 },
    'FP231FTF20011704': { 'x': 26, 'y': 2 },
    'FP231FTF20011781': { 'x': 31.8, 'y': 3 },
    'FP231FTF21007223': { 'x': 32, 'y': 14 },
    // 'FP23JFTF21006176': { 'x': 26, 'y': 2.3 },
    // 'FP221ETF18067422': { 'x': 2, 'y': 8 },
};

const bounds = [
    [0, 0],
    [615, 1230]
];


for (const key in posicao_aps_metros) {
    if (posicao_aps_metros.hasOwnProperty(key) && posicao_aps_metros[key].hasOwnProperty('x')) {
        posicao_aps_metros[key].x *= 35.1428571;
    }

    if (posicao_aps_metros.hasOwnProperty(key) && posicao_aps_metros[key].hasOwnProperty('y')) {
        posicao_aps_metros[key].y *= 29.6100144;
    }
}

// Adição da imagem da planta NCT
L.imageOverlay("./plant.png", bounds).addTo(map);

// Ajuste o zoom do mapa para exibir toda a imagem
map.fitBounds(bounds);

// Customização do ícone
const fortiAP = new L.Icon({
    iconUrl: './point.png',
    iconSize: [42, 42],
    iconAnchor: [21, 42],
});

const ball = new L.Icon({
    iconUrl: '../images/ball.png',
    iconSize: [12, 12],
    iconAnchor: [21, 42],
});

function convertCoordinates(coordinates) {
    const convertedCoordinates = { x: coordinates.x * 35.1428571, y: coordinates.y * 29.6100144 };
    return convertedCoordinates;
}


//  Função que recupera dados da API para plotá-los - Unassociated devices
// async function fetchDataAndPlotMarkers() {
//     try {
//         const response = await fetch('http://localhost:3000/dados');
//         const markerData = await response.json();
//         console.log("ALOOOOOOOOOOOOOOOO", markerData);

//         if (Array.isArray(markerData)) {
//             markerData.forEach(item => {
//                 if (item && item.type === "BLE device") {
//                     if (item.position) {
//                         const { x, y } = item.position;
//                         const convertedCoordinates = convertCoordinates({ x, y });
//                         const marker = L.marker([convertedCoordinates.y, convertedCoordinates.x], { icon: ball }).addTo(map);
//                         if (item.mac) {
//                             marker.bindPopup(`Endereço MAC: ${item.mac}`);
//                         } else {
//                             marker.bindPopup(`Endereço MAC não encontrado`);
//                         }
//                     } else if (item.trilateration_object) {
//                         const { x, y, rssi } = item.trilateration_object[0];
//                         if (x && y && rssi) {
//                             const convertedCoordinates = convertCoordinates({ x, y });
//                             const circle = L.circle([convertedCoordinates.y, convertedCoordinates.x], {
//                                 radius: calculateRadiusFromRSSI(rssi),
//                                 color: 'red',
//                                 fillColor: '#f03',
//                                 fillOpacity: 0.3
//                             }).addTo(map);
//                             circle.bindPopup(`Endereço MAC: ${item.mac}`);
//                         }
//                     }
//                 }
//             });
//         }
//     } catch (error) {
//         console.error('Erro ao buscar dados do backend:', error);
//     }
// }



// Função equivalente para plotar dispositivos associados via wifi

async function fetchDataAndPlotMarkers() {
    try {
        const response = await fetch('http://localhost:3000/manterTop3Aps');
        const markerData = await response.json();
        console.log("ALOOOOOOOOOOOOOOOO", markerData);

        if (Array.isArray(markerData)) {
            markerData.forEach(item => {
                if (item && item.position) {
                    const { x, y } = item.position;
                    const convertedCoordinates = convertCoordinates({ x, y });
                    const marker = L.marker([convertedCoordinates.y, convertedCoordinates.x], { icon: ball }).addTo(map);
                    if (item.mac) {
                        marker.bindPopup(`Usuário: ${item.mac}`);
                    } else {
                        marker.bindPopup(`Usuário não encontrado`);
                    }
                }
            });
        }
    } catch (error) {
        console.error('Erro ao buscar dados do backend:', error);
    }
}


function createCirclesForTrilateration(trilaterationData) {
    console.log("PASSEI AQUI?")
    trilaterationData.forEach(data => {
        const { x, y, rssi } = data;
        const convertedCoordinates = convertCoordinates({ x, y });
        const circle = L.circle([convertedCoordinates.y, convertedCoordinates.x], {
            radius: calculateRadiusFromRSSI(rssi),
            color: 'red',
            fillColor: '#f03',
            fillOpacity: 0.3
        }).addTo(map);
        circle.bindPopup(`Endereço MAC: ${item.mac}`);
    });
}

function calculateRadiusFromRSSI(rssi) {
    // Lógica para calcular o raio com base no RSSI
    const minRadius = 10;
    const maxRadius = 100;
    const scaleFactor = 5; 

    // Mapeia o valor de RSSI para o intervalo [minRadius, maxRadius]
    const radius = Math.min(maxRadius, Math.max(minRadius, scaleFactor * rssi));

    return radius;
}



axios.get('http://localhost:3000/dados')
    .then(response => {
        plotMarkersOnMap(posicao_aps_metros);
        fetchDataAndPlotMarkers();
    })
    .catch(error => {
        console.error('Erro na requisição:', error);
    });


function plotMarkersOnMap(data) {
    for (const key in data) {
        if (data.hasOwnProperty(key)) {
            const coordenadasMetros = data[key];
            const { x, y } = coordenadasMetros;
            const marker = L.marker([y, x], { icon: fortiAP }).addTo(map);
            marker.bindPopup(key); 
        }
    }
}

plotMarkersOnMap(posicao_aps_metros);
fetchDataAndPlotMarkers();



// const armando = L.marker([88.8300432, 1117.54285578]).addTo(map);
// const recepcao = L.marker([(12* 29.6100144), (23.5* 35.1428571)]).addTo(map);
// const RH = L.marker([(18* 29.6100144), (28* 35.1428571)]).addTo(map);
// const rafa = L.marker([(12* 29.6100144), (6.2* 35.1428571)]).addTo(map);
// const comercial = L.marker([(17* 29.6100144), (19* 35.1428571)]).addTo(map);
const gerencia = L.marker([(17.5* 29.6100144), (2.8* 35.1428571)]).addTo(map);
// const eu = L.marker([(7.2* 29.6100144), (3* 35.1428571)]).addTo(map);
// const treinamento = L.marker([(88.8300432), (6.2* 35.1428571)]).addTo(map);


// FERRAMENTA TESTE: 00:0b:82:ea:c9:cd

// Função para centralizar o mapa na posição inicial
function centerMapToInitialPosition() {
    map.setView([219, 615], -1);
}

// Adição do botão para centralizar o mapa
const btnCenterMap = document.getElementById("btnCenterMap");
btnCenterMap.addEventListener("click", centerMapToInitialPosition);


function highlightMarkerByMAC(mac) {
    let found = false;
    map.eachLayer((layer) => {
        if (layer instanceof L.Marker) {
            const popup = layer.getPopup();
            if (popup && popup.getContent().includes(mac)) {
                // O marcador contém o endereço MAC pesquisado no conteúdo do popup
                layer.openPopup();
                map.setView(layer.getLatLng(), 1);
                found = true; 
            }
        }

        else if (layer instanceof L.Circle) {
            // Verifica se é um círculo
            const popup = layer.getPopup();
            if (popup && popup.getContent().includes(mac)) {
                layer.openPopup();
                map.setView(layer.getLatLng(), 1);
                found = true;
            }
        }
    });

    if (!found) {
        // Mostrar uma mensagem de erro se o endereço MAC não for encontrado
        alert(`Endereço MAC '${mac}' não encontrado.`);
    }
}

// Função para buscar o endereço MAC inserido na barra de pesquisa e chamar a função de destaque
function searchMAC() {
    console.log("PESQUISEI")
    const input = document.getElementById("search");
    const macToSearch = input.value;
    highlightMarkerByMAC(macToSearch);
}