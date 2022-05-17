'use strict';

const express = require('express')
const InternalOrderDBU = require('../database_utilities/internalOrderDBU.js')

let router = express.Router()

function getState(str) {
  const clean = str.trim().toUpperCase();
  switch (clean) {
    case "ISSUED":
    case "ACCEPTED":
    case "REFUSED":
    case "CANCELED":
    case "COMPLETED":
      return clean;
    default:
      return undefined;
  }
}

function dateIsValid(dateStr) {
  const regex = /^\d{4}\/\d{2}\/\d{2}$/;
  const regex2 = /^\d{4}\/\d{2}\/\d{2} \d{2}:\d{2}$/;

  if (!dateStr.match(regex) && !dateStr.match(regex2)) {
    return false;
  }

  const now = new Date();
  if(dateStr.match(regex2)){
      const [date, time] = dateStr.split(' ');
      const [year, month, day] = date.split('/');
      const [hour, minute] = time.split(':');
      const myDate = new Date(year, month - 1, day, hour, minute);
      if(!(myDate instanceof Date))
          return false;
      if(myDate.getTime() > now.getTime())
          return false;
  }
  else{
      const [year, month, day] = dateStr.split('/');
      const myDate = new Date(year, month - 1, day);
      if(!(myDate instanceof Date))
          return false;
      if(myDate.getTime() > now.getTime())
          return false;
  }

  return true;
}

function rfidIsValid(str){
  const regex = /^\d{32}$/;
  return regex.test(str);
}

router.get('/api/internalOrders', async (req,res) => {
  // create connection with the db  
  try {
    const db = new InternalOrderDBU('ezwh.db');
    const internalOrderList = await db.loadInternalOrder();
    return res.status(200).json(internalOrderList);
  } catch (err) {
      return res.status(500).json({message: `Something went wrong...`, error: err});
  }
});

router.get('/api/internalOrdersIssued', async (req,res) => {
  // create connection with the db  
  try {
    const db = new InternalOrderDBU('ezwh.db');
    const internalOrderList = await db.loadInternalOrder(null, "ISSUED");
    return res.status(200).json(internalOrderList);
  } catch (err) {
      return res.status(500).json({message: `Something went wrong...`, error: err});
  }
});

router.get('/api/internalOrdersAccepted', async (req,res) => {
  // create connection with the db  
  try {
    const db = new InternalOrderDBU('ezwh.db');
    const internalOrderList = await db.loadInternalOrder(null, "ACCEPTED");
    return res.status(200).json(internalOrderList);
  } catch (err) {
      return res.status(500).json({message: `Something went wrong...`, error: err});
  }
});

router.get('/api/internalOrders/:id', async (req,res) => {
  // create connection with the db  
  try {
    const id = parseInt(req.params.id);
    if(!Number.isInteger(id) || id < 0)
      return res.status(422).json({error: `Invalid internalOrder id.`});
    const db = new InternalOrderDBU('ezwh.db');
    const internalOrderList = await db.loadInternalOrder(id);
    if(internalOrderList.length === 0)
      return res.status(404).json({error: `No internalOrder with matching id.`});
    return res.status(200).json(internalOrderList.pop());
  } catch (err) {
      return res.status(500).json({error: `Something went wrong...`, message: err.message});
  }
});

// POST /api/internalOrder
// add a new internalOrder to the database
router.post('/api/internalOrders', async (req,res) => {
  if (req.body === undefined || req.body.issueDate == undefined || !dateIsValid(req.body.issueDate) ||
      req.body.products === undefined || 
      req.body.products.some(p => (p.SKUId === undefined || typeof p.SKUId !== 'number' ||
      p.SKUId <= 0 || p.description === undefined || p.price === undefined ||
      typeof p.price !== 'number' || p.price <= 0 || p.qty === undefined || typeof p.qty !== 'number' ||
      !Number.isInteger(p.qty) || p.qty < 0)) || req.body.customerId === undefined ||
      typeof req.body.customerId !== 'number' || !Number.isInteger(req.body.customerId)
) {
    return res.status(422).json({error: `Invalid internal order data.`});
  }
  try{
      const db = new InternalOrderDBU('ezwh.db');
      await db.insertInternalOrder(req.body.issueDate, req.body.products, req.body.customerId);
      return res.status(201).end();
  }
  catch(err){
    return res.status(503).json({error: `Something went wrong...`, message: err.message});
  }
});

// PUT /api/internalOrder/:id
// Modify the state of an internal order, given its id. If newState is = COMPLETED an array of RFIDs is sent
router.put('/api/internalOrders/:id', async (req,res) => {
  const id = parseInt(req.params.id);
  if (req.body === undefined || id === undefined || req.body.newState ===undefined|| !getState(req.body.newState) || 
     (getState(req.body.newState)=="COMPLETED" && (req.body.products===undefined || 
      req.body.products.some((i) => (i.SkuID===undefined || typeof p.SkuID !== 'number' ||
    p.SkuID <= 0 || i.RFID===undefined || !rfidIsValid(i.RFID)))))) {
    return res.status(422).json({error: `Invalid item data.`});
  }
  try{
    const db = new InternalOrderDBU('ezwh.db');
    const updated = await db.updateInternalOrder(id, getState(req.body.newState), req.body.products);
    if (!updated)
      return res.status(404).json({error: `No internalOrder with matching id.`});
    return res.status(200).end();
  }
  catch(err){
    return res.status(503).json({error: `Something went wrong...`, message: err.message});
  }
});


// DELETE /item/internalOrder/:id
// remove a internalOrder from the database
router.delete('/api/internalOrders/:id', async (req,res) => {
  const id = parseInt(req.params.id);
  if (!Number.isInteger(id) || id < 0) {
    return res.status(422).json({error: `Validation of id failed`});
  }
  try{
      const db = new InternalOrderDBU('ezwh.db');
      await db.deleteInternalOrder(id);
      return res.status(204).end();
  }
  catch(err){
    return res.status(503).json({error: `Something went wrong...`, message: err.message});
  }
});

module.exports = router;


