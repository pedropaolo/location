# Documentação de implementação - Solução IPS

## 1. Configurações de acesso - FNDN

### 1.1 Overview

A REST API da FortiNet permite realizar operações de configuração e monitoramente em um dispositivo FortiGate (Appliance ou VM). São suportados os seguintes tipos de API:

- **Configuração:** Realiza a **busca** e **modificação** de comandos que podem ser executados via CLI, como, por exemplo criar ou deletar uma regra de firewall ou mudar alguma das configurações do sistema.

- **Monitoramento:** Recupera dados de forma dinâmica e realiza operações de rede como : reiniciar, desligar ou realizar backup em uma appliance FortiGate;

- **Logs:** recupera/realiza download de logs dos mais diversos tipos (segurança, eventos na rede, eventos de sistema)

Cada uma das APIs é documentada de acordo com a versão do sistema operacional executado pelos dispositivos. 

### 1.2 Criação de perfis administrativos e geração do token de autenticação

Cada requisição às APIs REST disponíveis deve ser **autenticada** através de um **token**. A geração do Token é realizada dentro da appliance FGT que deseja se autenticar na API. Deve-se incialmente criar um perfil do tipo **admin**, onde serão configuradas as devidas permissões:

![image](./images/admin-profile.PNG)

Como pode ser observado na imagem, existem diferentes níveis de permissão que podem ser atribuidos para cada uma das funcionalidades que podem ser acessadas via API.

Uma vez realizada a criação do perfil administrativo e configuradas suas devidas permissões, deve-se criar um perfil administrativo para REST API. Especifica-se um **nome de usuário** e realiza-se a **associação** do mesmo com o perfil administrativo configurado anteriormente. É possível também ativar um nível extra de segurança utilizando certificados. A opção **CORS allow origin** permite que a aplicação seja acessada por outras aplicações que utilizam JavaScript além do browser.

Isso é importante para garantir que uma terceira aplicação possa realizar a conexão segura com a API

![image](./images/api-admin-profile.PNG)

## 1.3 API Request

Uma vez realizada a configurações dos perfis administrativos e gerado o token de acesso para autenticação, já é possível realizar requisições à máquina autorizada. Um exemplo de URL que pode ser utilizada para requisitar todos os endereços de firewall:

> https://(your-fortigate-address)/api/v2/cmdb/firewall/address/?access_token=(your-api-token)

As respostas são recebidas no formato JSON:

> {
  "http_method":"GET",
  "revision":"124.0.206.9538334086041268915.1559577065",
  "results":[
    {
      "q_origin_key":"AD-Server",
      "name":"AD-Server",
      "uuid":"********-****-****-****-************",
      "subnet":"10.100.77.240 255.255.255.255",
      "type":"ipmask",
      "start-mac":"00:00:00:00:00:00",
      "end-mac":"00:00:00:00:00:00",
      "start-ip":"10.100.77.240",
      "end-ip":"255.255.255.255",
      "fqdn":"",
      "country":"",
      "wildcard-fqdn":"",
      "cache-ttl":0,
      "wildcard":"10.100.99.240 255.255.255.255",
      "sdn":"",
      "interface":"",
      "tenant":"",
      "organization":"",
      "epg-name":"",
      "subnet-name":"",
      "sdn-tag":"",
      "policy-group":"",
      "comment":"",
      "visibility":"enable",
      "associated-interface":"",
      "color":0,
      "filter":"",
      "sdn-addr-type":"private",
      "obj-id":"",
      "list":[
      ],
      "tagging":[
      ],
      "allow-routing":"disable"
    },
    {
      "q_origin_key":"AWS-us-east-1a",
      "name":"AWS-us-east-1a",
      "uuid":"********-****-****-****-************",

## 1.4 FortiOS Monitor API

Como explicitado anteriormente, dentre as APIs disponibilizadas temos as do tipo de **monitoramento** com uma extensa lista de métodos que podem ser utilizados:

- azure
- casb
- endpoint-control
- extender-controller
- extension-controller
- firewall
- fortiguard
.
.
.
- wifi

Dentro da parte de **wifi** é possível recuperar dados referentes ao dispositivos **não associados (unassociated devices)**, tanto do tipo wifi - 802.11 quanto dispositivos do tipo BLE. Em uma rede sem fio (Wi-Fi), dispositivos não associados são dispositivos que ainda não estabeleceram uma conexão ativa com o ponto de acesso (AP) ou roteador sem fio. A associação é o processo pelo qual um dispositivo cliente se conecta à rede sem fio, autentica-se e obtém um endereço IP atribuído para poder comunicar-se com outros dispositivos e acessar a Internet, se aplicável.

As imagens a seguir apresentam o formato da assinatura da URL que acessa o método e seus respectivos campos de retorno:

![image](./images/get-un.PNG)

![image](./images/un-params.PNG)

![](./images/un-res.PNG)

Como pode ser observado, dentre as informações que podem ser recuperadas temos:

- **tipo:** Tipo de dispositivo associado;
- **mac:** Endereço MAC do dispositivo;
- **manufacturer**: 
- **triangulation_regions:** Apresenta os APs que entraram em contato com o dispositivo. Dentro deste parâmetro, existem ainda duas ramificações: **FortiAPs Detecting the device** que indica se existem pelo menos três APs que enxergam o dispositivo. **FortiAP Detecting the device** que traz informações individuais de cada AP acerca dos dispositivos próximos como **wtp_id**, **rssi**, **last_seen**.

De maneira resumida, pode-se dizer que o método recupera informações de dispositivos que passarm pelas proximidades dos pontos de acesso instalados na infraestrutura estudada. Objetiva-se através destes parâmetros realizar o **mapeamento em tempo real** do dispositivos do tipo **BLE**.

## 3. Tratamento de dados

Como verificado na seção 1.3, apesar dos dados já estarem sendo devidamento direcionados apenas para os dispositivos não associados e do tipo BLE, ainda existem diversas informações não perminentes sendo ingeridas pela aplicação através do método GET. Afim de facilitar a manipulação dos dados e melhorar a performance da aplicação ao **consumir** e **armazenar** dados, foi realizado o tratamento dos dados para um formato mais enxuto.

![Arquivo bruto tratado para o formato desejado](./images/filtered.PNG)

A imagem acima apresenta o objeto já em um formato mais próximo do ideal. Cada objeto traz consigo o tipo, o endereço MAC do dispositivo, o produtor e as respectivas informações coletadas por cada um dos três APs que "enxergam" o dispositivo não-associado - wtp_id, rssi e last_seen.

## 4. Localização dos dispositivos não associados

A partir dos dados obtidos, objetiva-se determinar a localização dos dispositivos não associados que foram capturados pelos APs. Para isso, utiliza-se uma técnica chamada **trilateração**. 

[Trilateração com beacons bluetooth](C:/Users/pedro.picinin/Downloads/sensors-18-02820.pdf)

[PSO-BPNN - used to train the RSSI distance model to reduce the positioning
error](https://ieeexplore.ieee.org/document/4603226)

<!-- Exemplo JSON tratado -->

## Infraestrutura e fluxo de dados

O FortiGate é um NGFW responsável pela segurança da rede interna. Todos os pacotes que entram e saem da LAN passam obrigatoriamente pela entidade. Deve-se observar que são os **APs** que realizam a captura de dados dos dispositivos BLE e wifi não associados, mas todas as informações são centralizadas e podem ser consultadas apenas no FGT.

![image](./images/fluxo.PNG)



## 4. Trilateração

## Do artigo - Será que vale a pena tentar implementar esse algoritmo de correção da flutuação RSSI?

<!-- PEquena intro e principais algoritmos utilizados

Para este projeto, deve-se levar em consideração o fato do FGT ja devolver o valor RSSi de cada dispositivo não associado (beacon)
 -->

Low-power Bluetooth is favored in indoor positioning because of its advantages such as easy deployment, low power consumption, and low cost.In 2013, Apple introduced the iBeacon technology based on Bluetooth low-energy (BLE), which made BLE widely used in various indoor environments.


The positioning algorithms are mainly divided into two categories: 

- Received signal strength indication (RSSI) distance method ;

-  Wireless fingerprint positioning technology;

<!-- Aplicações tecnologia IPS com BLE -->

These applications can be used in many scenarios such as assets management, staff tracking, indoor tourist guiding in museums, train stations, airports, shopping complex etc. For example in European IST project ADAMANT (1), the researchers built an indoor information system for airport travellers and tailored location bases services were provided

(1):Wang, et al., "An Agent-based Passenger Support System over Heterogeneous Wireless Infrastructures in an Airport Environment, " in IASTED International Conference on Networks and Communication Systems (NCS 2006), Chiang Mai, Thailand, Mar 2006, pp. 240-244.

<!-- Triangulation -->

[Artigo de referência](https://ieeexplore.ieee.org/abstract/document/6488558?casa_token=0L5sZukRM3YAAAAA:hqHc38nxUYkhcCXsKrlnQA2vKXm1Idnc5SIVJzt7eW3bdsBsVddiJxAEB8vSi4siOaDFNp97SA)

Triangulation based positioning method is a well-studied method. The method **forms circles centred at the access points**, where the radius of each circle is determined by 

1) the measured signal strength of the mobile terminal OR

2) the time elapsed transmitting the signal between the access point and the mobile terminal. 

An intersection point arises when there are three or more access points within a certain range, and the intersection point gives the estimated location of the mobile terminal. In practice, it is almost impossible to obtain a single interaction point due to errors in measurements. The signal strength measurement can be affected by obstacles and imperfect propagation models used. For example in Fig. 1, there are three intersections points, the final position estimation of point x will be the **average coordinate** of intersection points x1, x2 and x3.

![triangulation](./images/triangulation.PNG)

<!-- Mitigação de erro de precisão

vou contornar esse problema com um algoritmo de IA?
 -->

There are two main approaches to mitigate positioning error, the first is to choose and formulate a proper position algorithm, and the second is to improve the RSSI reading accuracy. As the radio signals changes quickly duo to fast fading effects, the instant RSSI readings may fluctuate and may not fit our path loss model. However, we can choose a filter to smooth the RSSI readings. The most commonly and easily achieved filters are average filter and weighting filter. These filters take several readings and average those to get a more accurate result that reflects the path loss model.

[Trilateração com node.js](https://journalofcloudcomputing.springeropen.com/articles/10.1186/s13677-019-0142-y)

[Artigo com uma boa descrição do desenvolvimento do projeto e das partes envolvidas](https://journalofcloudcomputing.springeropen.com/articles/10.1186/s13677-019-0142-y)

## Libs de triangulação JS

[nodejs lib](https://github.com/TBMSP/Trilateration)




