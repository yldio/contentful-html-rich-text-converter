const R = require('ramda');

const invalidNodeTypes = ['bold', 'italic'];
const invalidChildNodeTypes = ['embedded-asset-block'];

const breakOutInvalidChildren = (newData) => {
    if (!newData.content || !newData.nodeType === 'paragraph') return newData;

    const brokenUp = newData.content.reduce(
        (acc, entry) => {
            if (invalidChildNodeTypes.includes(entry.nodeType)) {
                return {
                    nodes: [...acc.nodes, entry],
                    currentIndex: acc.currentIndex + 1,
                    indexIsParagraph: false
                };
            } else if (acc.indexIsParagraph === false) {
                const newNodes = [
                    ...acc.nodes,
                    {...newData, content: [entry]}
                ];

                return {
                    nodes: newNodes,
                    currentIndex: acc.currentIndex + 1,
                    indexIsParagraph: true
                };
            } else {
                const replaceNode = {
                    ...acc.nodes[acc.currentIndex],
                    content: [
                        ...acc.nodes[acc.currentIndex].content,
                        entry
                    ]
                };

                acc.nodes[acc.currentIndex] = replaceNode;

                return acc;
            }
        },
        {
            nodes: [{...newData, content: []}],
            currentIndex: 0,
            indexIsParagraph: true
        }
    );

    return brokenUp.nodes.length === 1 ? brokenUp.nodes[0] : brokenUp.nodes;
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
    newData = R
        .map((content) => ({
            data: {},
            content,
            nodeType: invalidNodeTypes.includes(nodeType) ? "paragraph" : nodeType,
        }), subNodes);

    newData = newData
        .map(breakOutInvalidChildren)
        .flat();

    return newData;
};

module.exports = paragraph;
