const { decode } = require('html-entities');

const decodeHtmlEntities = (input) => {
    // html-entities throws errors if we pass non-string input in
    if (!input || typeof input !== 'string') return input;

    return decode(input);
};

module.exports = decodeHtmlEntities;
