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
    // 'FP221ETF18067422': { 'x': 2, 'y': 8 },
    'FP231FTF20011651': { 'x': 6.2, 'y': 15.5 },
    'FP231FTF21008385': { 'x': 13, 'y': 15.5 },
    'FP231FTF20011648': { 'x': 18, 'y': 15 },
    'FP231FTF20011778': { 'x': 16.8, 'y': 5 },
    'FP231FTF20011660': { 'x': 25, 'y': 12 },
    'FP231FTF20011704': { 'x': 26, 'y': 2 },
    'FP231FTF20011781': { 'x': 31.8, 'y': 3 },
    'FP231FTF21007223': { 'x': 32, 'y': 14 },
    // 'FP23JFTF21006176': { 'x': 26, 'y': 2.3 }
};

const bounds = [
    [0, 0],
    [615, 1230]
];

// Corrija o loop for...in para multiplicar 'y' corretamente
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

//  Função que recupera dados da API para plotá-los
async function fetchDataAndPlotMarkers() {
    try {
        const response = await fetch('http://localhost:3000/dados');
        const markerData = await response.json();

        if (Array.isArray(markerData)) {
            markerData.forEach(item => {
                if (item.type === "BLE device" && item.position) {
                    const { x, y, mac } = item.position;
                    const marker = L.marker([y, x]).addTo(map);
                    marker.bindPopup(mac);
                } else if (item.type === "BLE device" && item.trilateration_object) {
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

// Função para centralizar o mapa na posição inicial
function centerMapToInitialPosition() {
    map.setView([219, 615], -1);
}

// Adicione o botão para centralizar o mapa
const btnCenterMap = document.getElementById("btnCenterMap");
btnCenterMap.addEventListener("click", centerMapToInitialPosition);

// Variável 'markersData' não está definida em seu código, certifique-se de definir e preenchê-la adequadamente
const markersData = [];  // Defina esta variável com os dados relevantes

function highlightMarkerByMAC(mac) {
    let marker; // Declare a variável marker fora do loop

    // Percorra o objeto 'markersData'
    for (const markerData of markersData) {
        if (markerData.mac === mac) {
            const latlng = L.latLng(markerData.y, markerData.x);
            // Crie o marcador e associe-o ao mapa
            marker = L.marker(latlng).addTo(map);

            const popupContent = `<b>Endereço MAC:</b> ${markerData.mac}<br><b>Last Seen:</b> ...`;

            // Associe o conteúdo do popup ao marcador
            marker.bindPopup(popupContent).openPopup();

            // Centralize o mapa na localização do marcador com um nível de zoom
            map.setView(latlng, 1);

            break;
        }
    }
}

// Função para buscar o endereço MAC inserido na barra de pesquisa e chamar a função de destaque
function searchMAC() {
    const input = document.getElementById("search");
    const macToSearch = input.value;
    highlightMarkerByMAC(macToSearch);
}
