const repo = require('./audit.repository');

const list = (params) => repo.findAll(params);

const log = (entry) => repo.log(entry);

module.exports = { list, log };
