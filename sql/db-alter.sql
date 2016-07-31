--Первичный ключ для products для конкретно этой задачи не нужен, но ПК по моему необходим почти любой таблице
ALTER TABLE products
ADD CONSTRAINT "productsPk" PRIMARY KEY(id);
--Индекс по продукту, так как в данной задаче необходимо соединять таблицы по провайдеру и фильтровать по продукту ()
--CREATE INDEX product
--ON products (product COLLATE pg_catalog."C.UTF-8" ASC NULLS LAST);

--Всяко нужен, таблицу надо обновляеть
ALTER TABLE credits
ADD CONSTRAINT "creditsPk" PRIMARY KEY(provider);

-- поле product имеет тип bit varying почему-то
ALTER TABLE "order" DROP COLUMN product;
ALTER TABLE "order" ADD COLUMN product character varying;