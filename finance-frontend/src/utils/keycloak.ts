import Keycloak from 'keycloak-js';

const keycloak = new Keycloak({
    url: 'http://localhost:9090',
    realm: 'FinancePortal',
    clientId: 'finance-gateway-client',
});

export default keycloak;
