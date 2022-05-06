'use strict';

const PositionDBU = require('../database_utilities/positionDBU');
const ErrorCode = require('./error');

class SKU {

    // attributes
    // - id (int)
    // - description (string)
    // - weight (int)
    // - volume (int)
    // - notes (string)
    // - position (string)
    // - availableQuantity (int)
    // - price (float)
    // - testDescriptors (list<int>)

    constructor(id=undefined, description, weight, volume, notes, position=undefined, price, availableQuantity) {
        this.id = id;
        this.description = description;
        this.weight = weight;
        this.volume = volume;
        this.notes = notes;
        this.price = price;
        this.position = position;
        this.availableQuantity = availableQuantity;
    }

    setTestDescriptors(testDescriptors) {
        this.testDescriptors = testDescriptors;
    }

    modify(openDB, newDescription, newWeight, newVolume, newNotes, newPrice, newAvailableQuantity) {
        if(this.position && newAvailableQuantity!=this.availableQuantity) {
            try{
                this.#propagatePosition(openDB, newAvailableQuantity*newWeight, newAvailableQuantity*newVolume);
            } catch(err) {
                // propagate exception
                throw(err);
            }
        }
        this.description = newDescription;
        this.weight = newWeight;
        this.volume = newVolume;
        this.notes = newNotes;
        this.price = newPrice;
        this.availableQuantity = newAvailableQuantity;
    }

    async delete(openDB) {
        if (this.position) {
            try {
                this.#propagatePosition(openDB);
            } catch(err) {
                // if there is some exception, propagate it
                throw(err);
            }
        }
    }

    async setPosition(openDB, newPositionId) {
        // here, we suppose we have already checked if the position is assigned to another sku
        if (newPositionId && newPositionId!=this.position) {
            try {
                await this.#propagatePosition(openDB, newPositionId, this.availableQuantity*this.weight, this.availableQuantity*this.volume);     
            } catch(err) {
                // if there is some exception, propagate it
                throw(err);
            }
        }
        if (this.position) {
            // reset the current position
            try {
                await this.#propagatePosition(openDB);
            } catch(err) {
                // if there is some exception, propagate it
                throw(err);
            }
        }
        this.position = newPositionId;
    }

    async #propagatePosition(openDB, position=this.position, occupiedWeight=0, occupiedVolume=0) {
        let db;
        try {
            // fetch position
            db = new PositionDBU(null, openDB);
            const posList = await db.loadPosition(position);
            if(posList.lenght==0) {
                throw(new Error("The provided position does not exist.", 5));
            }
            const pos = posList.pop();
            // update occupiedWeight and Volume
            pos.updateOccupiedWeightAndVolume(occupiedWeight, occupiedVolume);
            // update position
            await db.updatePosition(pos.positionID, pos);
        } catch(err) {
            // if there is some exception, propagate it
            throw(err);
        } finally {
            db.close();
        }
    }

}

module.exports = SKU;