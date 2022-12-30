const Entities = require('html-entities').XmlEntities;
const entities = new Entities();

const decodeHtmlEntities = (input) => {
    // html-entities throws errors if we pass non-string input in
    if (!input || typeof input !== 'string') return input;
    // inexplicably, html-entities replaces &nbsp; with nothing
    input = input.replace(/&nbsp;/, ' ');

    return entities.decode(input);
};

module.exports = decodeHtmlEntities;
