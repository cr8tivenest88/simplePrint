const fs = require('fs').promises;
const path = require('path');

class JsonDB {
    constructor(filename) {
        this.filepath = path.join(__dirname, '..', 'data', filename);
    }

    async readData() {
        try {
            const data = await fs.readFile(this.filepath, 'utf8');
            return JSON.parse(data);
        } catch (error) {
            throw new Error(`Error reading ${this.filepath}: ${error.message}`);
        }
    }

    async writeData(data) {
        try {
            await fs.writeFile(this.filepath, JSON.stringify(data, null, 2));
        } catch (error) {
            throw new Error(`Error writing to ${this.filepath}: ${error.message}`);
        }
    }

    async findOne(collection, query) {
        const data = await this.readData();
        return data[collection].find(item =>
            Object.entries(query).every(([key, value]) => item[key] === value)
        );
    }

    async findById(collection, id) {
        const data = await this.readData();
        return data[collection].find(item => item.id === id);
    }

    async findAll(collection, query = {}) {
        const data = await this.readData();
        return data[collection].filter(item =>
            Object.entries(query).every(([key, value]) => item[key] === value)
        );
    }

    async insert(collection, item) {
        const data = await this.readData();
        const newId = Math.max(...data[collection].map(i => parseInt(i.id)), 0) + 1;
        const newItem = { ...item, id: newId.toString() };
        data[collection].push(newItem);
        await this.writeData(data);
        return newItem;
    }

    async update(collection, id, updates) {
        const data = await this.readData();
        const index = data[collection].findIndex(item => item.id === id);
        if (index === -1) throw new Error('Item not found');
        data[collection][index] = { ...data[collection][index], ...updates };
        await this.writeData(data);
        return data[collection][index];
    }

    async delete(collection, id) {
        const data = await this.readData();
        const index = data[collection].findIndex(item => item.id === id);
        if (index === -1) throw new Error('Item not found');
        data[collection].splice(index, 1);
        await this.writeData(data);
    }
}

module.exports = JsonDB;
