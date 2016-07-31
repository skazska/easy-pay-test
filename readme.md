#test task
PostgreSQL, db tables:
products (product | provider | price) - relation of product and provider with price using names.
credits (provider | credit) - current balance of provider.
order (product | provider | price | datetime) - orders
dbdump- test.backup.

Node.js  (node-server) :
1. accepts GET /<product> , <product> - product name
2. Finds product provider with minimum price. provider balance should be not less than price
3. Reduces provider limit on price and places order
4. responses 200 OK with empty body.
6. 500 with JSON-encoded error: {"error":"No such product."}

consider:
1. requests concurrent.
2. many node-servers could be started and connected to same db.
3. provider balance should not go bellow 0.
4. there could be some db changes required.
5. server should be started on post 3000 by npm start