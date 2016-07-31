/**
 * Created by ska on 6/6/16.
 */

var async = require("async");

function transaction(client, level, executor){
  var sql = "START TRANSACTION";
  if (level) sql += " ISOLATION LEVEL " + level;
  client.query(sql, function(err) {
    executor(
      err,
      function commit(done){
        client.query('COMMIT', function(err) {
           return done(err);
        });
      },
      function rollback(done){
        client.query('ROLLBACK', function(err) {
           return done(err);
        });
      }
    )
  });
}

function newOrder( client, product, provider, price, callback ) {
  var dcSql = "update credits set credit = credit - $1 where provider = $2";
  var ioSql = "insert into \"order\" (provider, price, datetime, product) values ($2::text, $3::real, CURRENT_TIMESTAMP, $1::text)";

  async.parallel(
    [
      function decreaseCredit(creditCb){
        client.query(dcSql, [ price, provider ], creditCb);
      },
      function insertOrder(orderCb){
        client.query(ioSql, [ product, provider, price ], orderCb);
      }
    ],
    function(err){
      setTimeout(function(){
        callback(err);
      }, 20000);
    }
//    callback
  )
}

function getProduct(client, product, final){
  // Запрос возвращает список подходящих предложений по нарастанию цены и при равной цене по убыванию кредитов
  var sql = "select  p.product, p.provider, p.price " + //, c.credit" +
    "from products as p inner join credits as c on p.provider = c.provider " +
    "where product = $1::text and credit > price " +
    "order by price asc, credit desc " +
    "limit 10 " ;
  //получение списка
  client.query(sql, [product||''], function(err, result) {
    if (err) return final(err);
    if (result.rowCount == 0) return final(new Error("Подходящих вариантов не найдено"));
    //оставим только наилучшую цену
    var price = result.rows[0]['price'];
    var rows = result.rows.filter(function(record) { return record['price'] <= price} );
    var nowait = rows.length > 1; //если больше 1 вариантов то не будем ждать блокировок

    //последовательно для каждой записи пытаемся провести транзакцию при первом успехе - прерываем перебор ОШИБКОЙ!
    //попытка провести транзакцию
    async.eachSeries(
      rows,
      function (record, recordCb) {

        //старт транзакции
        transaction(client, 'SERIALIZABLE', function(err, commit, rollback) {
          if (err) return recordCb(err);

          client.query(
            "select * from credits where provider = $1::text for update " + (nowait ? "nowait" : ""),
            [record['provider']],
            function (err, result) {
              if (err || !(result && result.rowCount)) return rollback(function () {
                recordCb(); //не удалось взять блокировку - далее
              });
              //проверка внутри транзакции
              if (result.rows[0]['credit'] < record['price']) return rollback(function (rollbackErr) {
                recordCb(); //на момент блокировки условия не выполняются - дальше
              });
              //обновлем данные
              newOrder( client, record['product'], record['provider'], record['price'], function(err){
                if (err) return rollback(function (rollbackErr) { recordCb(err); }); //ошибка в процессе изменения данных внутри транзакции, транслируем для отката и завершения
                //Ура
                commit(function (commitErr) {
                  recordCb(new Error("SUCCESS"));
                });
              })
            }
          );
        });
      },
      function (err) {
        //если ни одна транзакция не выполнена то не будет ошибки! => повтор
        if (!err) return setTimeout(function(){ getProduct(client, product, final);}, 1000); //повторяем попытку
        //неуспешная ошибка SUCCESS для индикации успеха
        if (err.message !== 'SUCCESS') return final(err);
        //успех
        final(null);
      }
    );





  });
}


module.exports = function(db){

  return {
    getProduct: function(req, res, next){

      db.connect(function(err, client, done) {
        if (err) return next(err);

        // проход порциями
        getProduct(client, req.params['product'], function (err, result) {
          done();
          if (err) return next(err);
          res.xSet(200, '', 'text', next);
        });
      });
    }
  }
};