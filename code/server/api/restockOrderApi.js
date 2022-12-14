'use strict';

const express = require('express')
const RestockOrderDBU = require('../database_utilities/restockOrderDBU.js')
const validators = require('./validation');

let router = express.Router()


function getState(str) {
  const clean = str && str.trim().toUpperCase();
  switch (clean) {
    case "ISSUED":
    case "DELIVERY":
    case "DELIVERED":
    case "TESTED":
    case "COMPLETEDRETURN":
    case "COMPLETED":
      return clean;
    default:
      return undefined;
  }
}

async function checkState(db, orderId, stateRequested) {
  try{
    const currentState = await db.retriveState(orderId);
    return currentState ? currentState == stateRequested : undefined;
  }
  catch {
    return false;
  }
}

//GET /api/restockOrders
router.get('/api/restockOrders', async (req,res) => {
  // create connection with the db  
  try {
    const db = new RestockOrderDBU('ezwh.db');
    const restockOrderList = await db.loadRestockOrder();
    return res.status(200).json(restockOrderList);
  } catch (err) {
      return res.status(500).json({message: `Something went wrong...`, error: err});
  }
});

//GET /api/restockOrdersIssued
router.get('/api/restockOrdersIssued', async (req,res) => {
  // create connection with the db  
  try {
    const db = new RestockOrderDBU('ezwh.db');
    const restockOrderList = await db.loadRestockOrder(null, 'ISSUED');
    return res.status(200).json(restockOrderList);
  } catch (err) {
      return res.status(500).json({message: `Something went wrong...`, error: err});
  }
});

//GET /api/restockOrders/:id
router.get('/api/restockOrders/:id', async (req,res) => {
  // create connection with the db  
  try {
    const id = parseInt(req.params.id);
    if(!Number.isInteger(id) || id <= 0)
      return res.status(422).json({error: `Invalid restockOrder id.`});
    const db = new RestockOrderDBU('ezwh.db');
    const restockOrderList = await db.loadRestockOrder(id);
    if(restockOrderList.length === 0)
      return res.status(404).json({error: `No restockOrder with matching id.`});
    return res.status(200).json(restockOrderList.pop().clean(['id']));
  } catch (err) {
      return res.status(500).json({error: `Something went wrong...`, message: err.message});
  }
});

// GET /api/restockOrders/:id/returnItems
router.get('/api/restockOrders/:id/returnItems', async (req,res) => {
  // create connection with the db  
  try {
    const id = parseInt(req.params.id);
    if(!Number.isInteger(id) || id <= 0)
      return res.status(422).json({error: `Invalid restockOrder id.`});
    const db = new RestockOrderDBU('ezwh.db');

    const isRightState = await checkState(db, id, 'COMPLETEDRETURN');
    if (isRightState===undefined) {
      return res.status(404).json({error: `No restockOrder with matching id.`});
    }
    if(isRightState===false) {
      return res.status(422).json({error: 'Order status is not COMPLETEDRETURN.'});
    }

    const returnItems = await db.selectReturnItems(id);
    return res.status(200).json(returnItems);
  } catch (err) {
      return res.status(500).json({error: `Something went wrong...`, message: err.message});
  }
}); 

// POST /api/restockOrder
// add a new restockOrder to the database
router.post('/api/restockOrder', async (req,res) => {
  if (req.body === undefined || req.body.issueDate === undefined || !validators.dateIsValid(req.body.issueDate) || 
      req.body.products === undefined || !Array.isArray(req.body.products) ||
      req.body.products.some(p => (p.SKUId === undefined || typeof p.SKUId !== 'number' ||
      !Number.isInteger(p.SKUId) || p.SKUId <= 0 || p.itemId === undefined || typeof p.itemId !== 'number' ||
      !Number.isInteger(p.itemId) || p.itemId <= 0 || p.description === undefined || p.price === undefined ||
      typeof p.price !== 'number' || p.price <= 0 || p.qty === undefined || typeof p.qty !== 'number' ||
      !Number.isInteger(p.qty) || p.qty < 0)) ||
      req.body.supplierId === undefined || typeof req.body.supplierId !== 'number' 
      || !Number.isInteger(req.body.supplierId)) {
    return res.status(422).json({error: `Invalid restockOrder data.`});
  }
  try{
      const db = new RestockOrderDBU('ezwh.db');
      await db.insertRestockOrder(req.body.issueDate, req.body.products, req.body.supplierId);
      return res.status(201).end();
  }
  catch(err){
    if (err.code==6)
      return res.status(404).json({error: "Supplier not found. Operation aborted."});
    return res.status(503).json({error: `Something went wrong...`, message: err.message});
  }
});


// PUT /api/restockOrder/:id
router.put('/api/restockOrder/:id', async (req,res) => {
  const id = parseInt(req.params.id);
  if(!Number.isInteger(id) || id <= 0)
    return res.status(422).json({error: `Invalid restockOrder id.`});
  if (req.body === undefined || getState(req.body.newState) === undefined) {
    return res.status(422).json({error: `Invalid restockOrder data.`});
  }
  try{
      const db = new RestockOrderDBU('ezwh.db');
      // get the restockOrder to be modified
      const updated = await db.patchRestockOrderState(id, getState(req.body.newState));
      if(!updated)
        return res.status(404).json({error: `No restockOrder with matching id.`});
      return res.status(200).end();
  }
  catch(err){
    return res.status(503).json({error: `Something went wrong...`, message: err.message});
  }
});


// PUT /api/restockOrder/:id/skuItems 
router.put('/api/restockOrder/:id/skuItems', async (req,res) => {
  const id = parseInt(req.params.id);
  if(!Number.isInteger(id) || id <= 0)
    return res.status(422).json({error: `Invalid restockOrder id.`});
  if (req.body === undefined || req.body.skuItems === undefined || !Array.isArray(req.body.skuItems) ||
    req.body.skuItems.some((i) => (i.SKUId===undefined || typeof i.SKUId !== 'number' ||
    !Number.isInteger(i.SKUId) || i.SKUId <= 0 || i.itemId===undefined || typeof i.itemId !== 'number' ||
    !Number.isInteger(i.itemId) || i.itemId <=0 || i.rfid===undefined || !validators.rfidIsValid(i.rfid)))) {
    return res.status(422).json({error: `Invalid restockOrder data.`});
  }
  try{
      const db = new RestockOrderDBU('ezwh.db');

      const isRightState = await checkState(db, id, 'DELIVERED');
      if (isRightState===undefined) {
        return res.status(404).json({error: `No restockOrder with matching id.`});
      }
      if(isRightState===false) {
        return res.status(422).json({error: 'Order status is not DELIVERED.'});
      }

      await db.patchRestockOrderSkuItems(id, req.body.skuItems);
      return res.status(200).end();
  }
  catch(err){
    if (err.code==12)
      return res.status(404).json({error: `No restockOrder with matching id.`});
    return res.status(503).json({error: `Something went wrong...`, message: err.message});
  }
});


// PUT /api/restockOrder/:id/transportnote
router.put('/api/restockOrder/:id/transportNote', async (req,res) => {
  const id = parseInt(req.params.id);
  if(!Number.isInteger(id) || id <= 0)
    return res.status(422).json({error: `Invalid restockOrder id.`});
  if (req.body === undefined || req.body.transportNote === undefined || 
    req.body.transportNote.deliveryDate === undefined || !validators.dateIsValid(req.body.transportNote.deliveryDate, false)) {
    return res.status(422).json({error: `Invalid restockOrder data.`});
  }
  try{
      const db = new RestockOrderDBU('ezwh.db');
      // get the restockOrder to be modified
      const restockOrderList = await db.loadRestockOrder(id);
      if (restockOrderList.length==0)
        return res.status(404).json({error: `No restockOrder with matching id.`});
      if(restockOrderList.pop().issueDate > req.body.transportNote.deliveryDate)
        return res.status(422).json({error: `Delivery Date Before Issue Date.`});

      const isRightState = await checkState(db, id, 'DELIVERY');
      if (isRightState===undefined) {
        return res.status(404).json({error: `No restockOrder with matching id.`});
      }
      if(isRightState===false) {
        return res.status(422).json({error: 'Order status is not DELIVERY.'});
      }
      
      await db.patchRestockOrderTransportNote(id, req.body.transportNote);
      return res.status(200).end();
  }
  catch(err){
    return res.status(503).json({error: `Something went wrong...`, message: err.message});
  }
});


// DELETE /restockOrder/restockOrder/:id
// remove a restockOrder from the database
router.delete('/api/restockOrder/:id', async (req,res) => {
  const id = parseInt(req.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    return res.status(422).json({error: `Validation of id failed`});
  }
  try{
      const db = new RestockOrderDBU('ezwh.db');
      // delete the restockOrder
      await db.deleteRestockOrder(id);
      return res.status(204).end();
  }
  catch(err){
    return res.status(503).json({error: `Something went wrong...`, message: err.message});
  }
});

module.exports = router;