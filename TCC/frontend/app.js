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


//  Função que recupera dados da API para plotá-los
async function fetchDataAndPlotMarkers() {
    try {
        const response = await fetch('http://localhost:3000/dados');
        const markerData = await response.json();
        console.log("ALOOOOOOOOOOOOOOOO", markerData);

        if (Array.isArray(markerData)) {
            markerData.forEach(item => {
                if (item.type === "BLE device") {
                    if (item.position) {
                        // O objeto já contém as coordenadas estimadas
                        const { x, y } = item.position;
                        const convertedCoordinates = convertCoordinates({ x, y });
                        const marker = L.marker([convertedCoordinates.y, convertedCoordinates.x], { icon: ball }).addTo(map);
                        if (item.mac) {
                            marker.bindPopup(`Endereço MAC: ${item.mac}`);
                        } else {
                            marker.bindPopup(`Endereço MAC não encontrado`);
                        }
                    } else {
                      
                    }
                } else if (item.type === "BLE device" && item.trilateration_object) {
                    // O objeto contém informações de RSSI e distância estimada
                    // Faça o tratamento específico desejado aqui, se necessário
                    // Por exemplo, criar círculos centrados no AP com raio igual ao valor de RSSI
                    createCirclesForTrilateration(item.trilateration_object);
                }
            });
        }
    } catch (error) {
        console.error('Erro ao buscar dados do backend:', error);
    }
}


// Chame a função para plotar os marcadores APENAS após os dados da API serem carregados
axios.get('http://localhost:3000/dados')
    .then(response => {
        plotMarkersOnMap(posicao_aps_metros);
        fetchDataAndPlotMarkers();
    })
    .catch(error => {
        console.error('Erro na requisição:', error);
    });

// const marker = L.marker([0, 0]).addTo(map);
// const marker2 = L.marker([0, 1230]).addTo(map);

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

// Chame a função para plotar os marcadores
plotMarkersOnMap(posicao_aps_metros);
fetchDataAndPlotMarkers();

// Função para centralizar o mapa na posição inicial
function centerMapToInitialPosition() {
    map.setView([219, 615], -1);
}

// Adicione o botão para centralizar o mapa
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