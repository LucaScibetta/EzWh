'use strict';

const express = require('express');
const PositionDBU = require('../database_utilities/positionDBU.js');

let router = express.Router();

function isValid(str) {
    const regex = /^\d{4}$/;
    return str.match(regex);
}

function idIsValid(str) {
    const regex = /^\d{12}$/;
    return str.match(regex);
}

// GET /api/positions
// retrieves all positions from the database
router.get('/api/positions', async (req,res) => {
  try {
    const db = new PositionDBU('ezwh.db');
    const positionList = await db.loadPosition();
    return res.status(200).json(positionList);
  } catch (err) {
      return res.status(500).json({error: `Something went wrong...`, message: err.message});
  }
});

// POST /api/position
// add a new position to the database
router.post('/api/position', async (req,res) => {
  if (req.body === undefined || req.body.positionID === undefined || req.body.aisleID === undefined ||
      req.body.row === undefined || req.body.col === undefined || !isValid(req.body.aisleID) || !isValid(req.body.row) ||
      !isValid(req.body.col) || req.body.positionID !== req.body.aisleID + req.body.row + req.body.col ||
      req.body.maxWeight === undefined || !Number.isInteger(req.body.maxWeight) || req.body.maxWeight < 0 ||
      req.body.maxVolume === undefined || !Number.isInteger(req.body.maxVolume) || req.body.maxVolume < 0 ) {
    return res.status(422).json({error: `Invalid position data.`});
  }
  try{
      const db = new PositionDBU('ezwh.db');
      positionList = db.loadPosition(req.body.positionID);
      if(positionList.length > 0)
        return res.status(422).json({error: `Position already in database.`});
      await db.insertPosition(req.body.positionID, req.body.aisleID, req.body.row, req.body.col, req.body.maxWeight, req.body.maxVolume);
      return res.status(201).end();
  }
  catch(err){
    return res.status(503).json({error: `Something went wrong...`, message: err.message});
  }
});


// PUT /api/position/:positionID
// modify a position in the database
router.put('/api/position/:positionID', async (req,res) => {
  const positionID = req.params.positionID;
  if (req.body === undefined || req.body.newAisleID === undefined || req.body.newRow === undefined ||
    req.body.newCol === undefined || !isValid(req.body.newAisleID) || !isValid(req.body.newRow) || !isValid(req.body.newCol) ||
    req.body.newMaxWeight === undefined || !Number.isInteger(req.body.newMaxWeight) || req.body.newMaxWeight < 0 ||
    req.body.newMaxVolume === undefined || !Number.isInteger(req.body.newMaxVolume) || req.body.newMaxVolume < 0 ||
    req.body.newOccupiedWeight === undefined || !Number.isInteger(req.body.newOccupiedWeight) || req.body.newOccupiedWeight < 0 ||
    req.body.newOccupiedVolume === undefined || !Number.isInteger(req.body.newOccupiedVolume) || req.body.newOccupiedVolume < 0 ) {
    return res.status(422).json({error: `Invalid position data.`});
  }
  try{
      const db = new PositionDBU('ezwh.db');
      // get the sku item to be modified
      const positionList = await db.loadPosition(positionID);
      if(positionList.length === 0)
        return res.status(404).json({error: `No position with matching id.`});
      const positionList2 = await db.loadPosition(req.body.aisleID + req.body.row + req.body.col);
      if(positionList2.length > 0)
        return res.status(422).json({error: `New position already in database.`});
      const position = positionList.pop();
      position.modify(req.body.newAisleID, req.body.newRow, req.body.newCol, req.body.newMaxWeight, req.body.newMaxVolume, req.body.newOccupiedWeight, req.body.newOccupiedVolume, db.db);
      await db.updatePosition(position);
      return res.status(200).end();
  }
  catch(err){
    return res.status(503).json({error: `Something went wrong...`, message: err.message});
  }
});

// PUT /api/position/:positionID/changeID
// modify the id of a position in the database
router.put('/api/position/:positionID/changeID', async (req,res) => {
    const positionID = req.params.positionID;
    if (req.body === undefined || req.body.newPositionID === undefined || !idIsValid(req.body.newPositionID) ) {
      return res.status(422).json({error: `Invalid position id.`});
    }
    try{
        const db = new PositionDBU('ezwh.db');
        // get the sku item to be modified
        const positionList = await db.loadPosition(positionID);
        if(positionList.length === 0)
          return res.status(404).json({error: `No position with matching id.`});
        const positionList2 = await db.loadPosition(req.body.newPositionID);
        if(positionList2.length > 0)
          return res.status(422).json({error: `New position already in database.`});
        const position = positionList.pop();
        position.modify(req.body.newPositionID);
        await db.updatePosition(position);
        return res.status(200).end();
    }
    catch(err){
      return res.status(503).json({error: `Something went wrong...`, message: err.message});
    }
  });

// DELETE /api/position/:positionID
// remove a position from the database
router.delete('/api/position/:positionID', async (req,res) => {
  const positionID = req.params.positionID;
  if (!idIsValid(positionID)) {
    return res.status(422).json({error: `Validation of positionID failed`});
  }
  try{
      const db = new PositionDBU('ezwh.db');
      // get the position to be deleted
      const positionList = await db.loadPosition(positionID);
      if(positionList.length > 0){
        const position = positionList.pop();
        position.delete(db.db);
        // now, delete the position
        await db.deletePosition(positionID);
      }
      return res.status(204).end();
  }
  catch(err){
    return res.status(503).json({error: `Something went wrong...`, message: err.message});
  }
});

module.exports = router;