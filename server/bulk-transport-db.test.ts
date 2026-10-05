import test from "node:test";
import assert from "node:assert/strict";
import {randomUUID} from "node:crypto";
import {pool} from "./db";

test("bulk flags share barcode identity, survive new batches and do not change price/stock",
  {skip:process.env.BULK_TRANSPORT_DB_TEST!=="1"},async()=>{
    const client=await pool.connect();
    try{
      await client.query("BEGIN");
      const barcode="BULK-TEST-"+randomUUID();
      const base=(await client.query(`insert into showcase_products(name,description,category,unit_price,stock_quantity,barcode,is_bulk_sale)
        values('Rollback bulk fixture','Rollback test','test',123,50,$1,true) returning id`,[barcode])).rows[0];
      const shop=(await client.query(`insert into shop_products(name,description,category,price,price_unit,sku,barcode,stock_quantity)
        values('Rollback bulk shop','Rollback test','test',999,'IQD',$1,$2,50) returning id,is_bulk_sale`,[randomUUID(),barcode])).rows[0];
      assert.equal(shop.is_bulk_sale,true);
      const batch=(await client.query(`insert into showcase_products(name,description,category,unit_price,stock_quantity,barcode)
        values('Rollback bulk batch','Rollback test','test',456,20,$1) returning id,is_bulk_sale`,[barcode])).rows[0];
      assert.equal(batch.is_bulk_sale,true);
      await client.query("update showcase_products set is_bulk_sale=false where id=$1",[batch.id]);
      const products=(await client.query(`select id,is_bulk_sale,unit_price::text as price,stock_quantity as stock
        from showcase_products where barcode=$1 order by id`,[barcode])).rows;
      assert.equal(products.length,2);
      assert.equal(products.every(p=>p.is_bulk_sale===false),true);
      assert.equal(products.find(p=>p.id===base.id)?.stock,50);
      assert.equal(Number(products.find(p=>p.id===base.id)?.price),123);
      assert.equal(products.find(p=>p.id===batch.id)?.stock,20);
      assert.equal(Number(products.find(p=>p.id===batch.id)?.price),456);
      const unchanged=(await client.query("select price::text as price,stock_quantity as stock,is_bulk_sale from shop_products where id=$1",[shop.id])).rows[0];
      assert.equal(Number(unchanged.price),999);
      assert.equal(unchanged.stock,50);assert.equal(unchanged.is_bulk_sale,false);
      const vehicle=(await client.query(`insert into vehicle_templates(name,vehicle_type,max_weight_kg,allowed_routes,base_price,price_per_km,transport_category)
        values('Rollback bulk vehicle','heavy_truck',20000,'{urban}',100,1,'bulk') returning id,transport_category`)).rows[0];
      assert.equal(vehicle.transport_category,"bulk");
      await client.query("update vehicle_templates set transport_category='standard' where id=$1",[vehicle.id]);
      assert.equal((await client.query("select transport_category from vehicle_templates where id=$1",[vehicle.id])).rows[0].transport_category,"standard");
    }finally{await client.query("ROLLBACK");client.release();await pool.end();}
  });
