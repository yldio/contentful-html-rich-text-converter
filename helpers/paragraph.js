const R = require('ramda');

const processSubNodes = (subNodes, nodeType) => {
    if (!["bold", "italics"].contains(nodeType)) {
        return subNodes;
    }

    return subNodes.map((subNode) => ({
        ...subNode,
        marks: [{type: nodeType}]
    }));
}

const paragraph = (subContent, nodeType) => {
    let subNodes = [];
    if (!subContent.length) {
        subNodes = [[{
            data: {},
            marks: [],
            value: '',
            nodeType: 'text',
        }]];
    } else {
        subNodes = [subContent];

        let brIndex = R.findIndex(R.propEq('nodeType', 'br'), R.last(subNodes));

        while(brIndex !== -1) {
            const last = subNodes.pop();

            const split = R.splitAt(brIndex, last);
            split[1].shift();//remove the br node
            subNodes = R.concat(subNodes, split);
            brIndex = R.findIndex(R.propEq('nodeType', 'br'), R.last(subNodes));
        }
    }

    newData = R.map((content) => ({
        data: {},
        content,
        nodeType,
    }), subNodes);

    return newData;
};

module.exports = paragraph;
