from flask import Flask, request, jsonify
import requests

app = Flask(__name__)

# URL de acesso ao FGT de produção: fgt.nct.com.br e chave da API para acesso
url = 'https://fgt.nct.com.br/api/v2/monitor/wifi/unassociated-devices?with_triangulation=true&access_token=d4g1y41n66qgp1ymQsngbxckc7wyd3'

# Coordenadas (x,y) dos APs que realizam a captura dos dados - FortiAPs NCT Informática
localizacao_aps = {
    'FP231FTF20011687': {'x': 2.8, 'y': 6.2},
    'FP231FTF20011686': {'x': 7.5, 'y': 2.0},
    'FP221ETF18067422': {'x': 2.0, 'y': 8.0},
    'FP231FTF20011651': {'x': 6.0, 'y': 9.4},
    'FP231FTF21008385': {'x': 13.0, 'y': 10.5},
    'FP231FTF20011648': {'x': 18.0, 'y': 9.0},
    'FP231FTF20011660': {'x': 25.0, 'y': 8.3},
    'FP231FTF20011704': {'x': 26.0, 'y': 2.0},
    'FP231FTF20011781': {'x': 31.8, 'y': 3.0},
    'FP231FTF21007223': {'x': 32.0, 'y': 10.6},
    'FP23JFTF21006176': {'x': 26.0, 'y': 2.3},
}

@app.route('/dados', methods=['GET'])
def get_data():
    response = requests.get(url)
    if response.status_code == 200:
        data = response.json()

        # Filtragem dos dados brutos obtidos via API
        objetosFiltrados = [objeto for objeto in data['results'] if objeto.get('triangulation_regions') and objeto.get('type') == 'BLE device']

        # Formatação para cálculo de trilateração
        trilaterationData = []
        for objeto in objetosFiltrados:
            trilaterationInfo = []
            for region in objeto['triangulation_regions']:
                wtp_id = region['wtp_id']
                rssi = region['rssi']
                x, y = localizacao_aps.get(wtp_id, {'x': 0, 'y': 0})
                distancia = estimate_distance_from_rssi(rssi)
                trilaterationInfo.append({'x': x, 'y': y, 'rssi': rssi, 'distancia': distancia})
            trilaterationData.append({'type': objeto['type'], 'mac': objeto['mac'], 'trilateration_object': trilaterationInfo})

        # Determinação da coordenada estimada (x,y) através da trilateração
        trilaterationResult = []
        for objeto in trilaterationData:
            type = objeto['type']
            mac = objeto['mac']
            trilateration_object = objeto['trilateration_object']

            if len(trilateration_object) >= 3:
                ap1, ap2, ap3 = trilateration_object[:3]
                estimatedPosition = trilaterate(ap1, ap2, ap3)
                resultObj = {'type': type, 'mac': mac, 'position': {'x': estimatedPosition['x'], 'y': estimatedPosition['y']}}
                trilaterationResult.append(resultObj)
            else:
                # Não há pontos de referência suficientes para a trilateração
                # Você pode tomar ação apropriada, como retornar None ou definir um valor padrão
                trilaterationResult.append(objeto)

        # Remova os objetos nulos, que não possuem pontos de referência suficientes
        validTrilaterationResults = [result for result in trilaterationResult if result is not None]

        return jsonify(validTrilaterationResults)
    else:
        return jsonify({'error': 'Erro na requisição'}), 500

# FUNÇÔES AUXILIARES
# Estimativa de distância com RSSI - Regressão polinomial

def estimate_distance_from_rssi(rssi):
    # Coeficientes da equação
    w0 = 0
    w1 = -3.90103347e-01
    w2 = 7.10195916e-03
    w3 = -7.53416567e-05
    w4 = 2.10842385e-07
    intercept = 17.689259549594077

    # Calcula a distância estimada com base no RSSI
    distancia = intercept + w0 + w1 * rssi + w2 * (rssi ** 2) + w3 * (rssi ** 3) + w4 * (rssi ** 4)

    return distancia

# Trilateração
def trilaterate(ap1, ap2, ap3):
    x1, y1, d1 = ap1['x'], ap1['y'], ap1['distancia']
    x2, y2, d2 = ap2['x'], ap2['y'], ap2['distancia']
    x3, y3, d3 = ap3['x'], ap3['y'], ap3['distancia']

    A = 2 * (x2 - x1)
    B = 2 * (y2 - y1)
    C = 2 * (x3 - x1)
    D = 2 * (y3 - y1)

    E = d1**2 - d2**2 - x1**2 + x2**2 - y1**2 + y2**2
    F = d2**2 - d3**2 - x2**2 + x3**2 - y2**2 + y3**2

    x = (E * D - B * F) / (A * D - B * C)
    y = (E * C - A * F) / (B * C - A * D)

    return {'x': x, 'y': y}

if __name__ == '__main__':
    app.run(port=3000)
