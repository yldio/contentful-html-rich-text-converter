const R = require('ramda');

const nl = (content) => process.stdout.write('\n' + content + '\n');

/**
 * compare original contentful data to generated data
 */
const compare = (transformed, richText, html, extension = [], json) => {
    const gen = R.pathOr('undefined', extension, transformed);
    const cont = R.pathOr('undefined', extension, richText);
    const equal = JSON.stringify(gen) === JSON.stringify(cont);

    if (typeof json === 'boolean') {
        nl('**html**');
        console.log(html);

        if (json) {
            nl('**generated**');
            console.log(JSON.stringify(gen));
            nl('**contentful**');
            console.log(JSON.stringify(cont));
        } else {
            nl('**generated**');
            console.log(gen);
            nl('**contentful**');
            console.log(cont);
        }

        nl('**equal**');
        console.log(equal);
    }

    return equal;
};

const { hashCode, decodeHtmlEntities } = require('../helpers');

const testHelperFn = (input, expected, name) => {
    const processed = decodeHtmlEntities(input);
    const res = expected === processed;
    const color = res ? '\x1b[42m' : '\x1b[41m';
    const status = res ? '✓' : '×';
    console.log(color, status, '\x1b[0m', name);
};

const testHashCodeFn = (input, expected, name) => {
    const processed = hashCode(input);

    const res = expected === processed;
    const color = res ? '\x1b[42m' : '\x1b[41m';
    const status = res ? '✓' : '×';
    console.log(color, status, '\x1b[0m', name);
};

testHelperFn('', '', 'decode empty string');
testHelperFn(null, null, 'decode null');
testHelperFn(undefined, undefined, 'decode undefined');
testHelperFn(1234, 1234, 'decode number');
testHelperFn('&nbsp;', ' ', 'decode &nbsp;');
testHelperFn('&amp;', '&', 'decode &amp;');

testHashCodeFn('', 0, 'hashcode for empty string');
testHashCodeFn('Hello', 69609650, 'hashcode for hello');

const { parseHtml, parseAssets } = require('../index');
const { documentToHtmlString } = require('@contentful/rich-text-html-renderer');
const { BLOCKS } = require('@contentful/rich-text-types');

/**
 * Only for testing our `parseHtml()`
 */
const runTest = (richText, extension = [], json) => {
    const options = {
        renderNode: {
            [BLOCKS.EMBEDDED_ASSET]: ({
                data: {
                    target: { fields },
                },
            }) =>
                `<img src="${fields.file.url}" height="${fields.file.details.image.height}" width="${fields.file.details.image.width}" alt="${fields.description}"/>`,
        },
    };
    const html = documentToHtmlString(richText, options);

    const transformed = parseHtml(html); // leads to handlFn

    return compare(transformed, richText, html, extension, json);
};
/*
const contentful = require('contentful');
//Create a creds.json file with fields `space`, `accessToken`
const creds = require('../creds.json');
const getContentfulContent = () => {
    contentful.createClient(creds).getEntries({
        content_type: 'sample',
        'fields.name[in]': 'Test',
    }).then((entries) => {
        runTest(entries.items[0].fields.richText, [], true);
    }).catch((e) => {
        throw e;
    });
};
getContentfulContent();
/*/
const printRes = (title, file) => {
    const res = runTest(require(file));
    const color = res ? '\x1b[42m' : '\x1b[41m';
    const status = res ? '✓' : '×';

    console.log(color, status, '\x1b[0m', title); //valid
};
//*
//https://jsonformatter.org/
printRes('Bold, Italic, Underline', './boldItalicUnderline.json');
printRes('ul', './ul.json');
printRes('ol', './ol.json');
printRes('hr', './hr.json');
printRes('blockquote', './blockquote.json');
printRes('headings', './headings.json');
printRes('hyperlink', './hyperlink.json');
printRes('codeblock', './codeblock.json');
printRes('Break Things #1', './break1.json');
//Still broken
//console.log('img:' + runTest(require('./img.json'), ['content', 0, 'data', 'target'], false));
//printRes('img', './img.json');
//*/

const htmlTest = (html, testHtml, log = false) => {
    const json = parseHtml(html);
    const options = {
        renderNode: {
            [BLOCKS.EMBEDDED_ASSET]: ({
                data: {
                    target: { fields },
                },
            }) =>
                `<img src="${fields.file.url}" height="${fields.file.details.image.height}" width="${fields.file.details.image.width}" alt="${fields.description}"/>`,
        },
    };
    const newHtml = documentToHtmlString(json, options);
    if (log) {
        nl('** Original **');
        console.log(html);

        nl('** New **');
        console.log(newHtml);

        nl('** Test **');
        console.log(testHtml);

        nl('json');
        console.log(R.pathOr('wrong path', ['content'], json));
    }

    const res = testHtml === newHtml;
    const color = res ? '\x1b[42m' : '\x1b[41m';
    const status = res ? '✓' : '×';
    console.log(color, status, '\x1b[0m', 'htmlTest'); //valid

    if (res === false) {
        console.log('\x1b[31m', `- ${testHtml}`);
        console.log('\x1b[32m', `+ ${newHtml}`);
    }
};

const jsonTest = (html, expectedJson) => {
    const json = parseHtml(html);
    const res = JSON.stringify(json) === JSON.stringify(expectedJson);
    const color = res ? '\x1b[42m' : '\x1b[41m';
    const status = res ? '✓' : '×';
    console.log(color, status, '\x1b[0m', 'jsonTest'); //valid

    if (res === false) {
        console.log('\x1b[31m', `- ${html}`);
        console.log('\x1b[32m', `+ ${JSON.stringify(json, null, 2)}`);
    }
}

const parseTest = (html, expected, title) => {
    const doc = parseHtml(html);
    const result = JSON.stringify(doc) === JSON.stringify(expected);

    const color = result ? '\x1b[42m' : '\x1b[41m';
    const status = result ? '✓' : '×';
    console.log(color, status, '\x1b[0m', `assetTest: ${title}`);

    if (result === false) {
        console.log('\x1b[31m', `- ${JSON.stringify(expected)}`);
        console.log('\x1b[32m', `+ ${JSON.stringify(doc)}`);
    }
};

const assetTest = (html, expected, title) => {
    const assets = parseAssets(html);
    const result = JSON.stringify(assets) === JSON.stringify(expected);

    const color = result ? '\x1b[42m' : '\x1b[41m';
    const status = result ? '✓' : '×';
    console.log(color, status, '\x1b[0m', `parseTest: ${title}`);

    if (result === false) {
        console.log('\x1b[31m', `- ${JSON.stringify(expected)}`);
        console.log('\x1b[32m', `+ ${JSON.stringify(assets)}`);
    }
};

htmlTest(
    '<ul><li><span><span>Do not</span></span></li><li><span><span>You must work.</span></span></li><li><span><span>You may need to risk software.</span></span></li></ul>',
    '<ul><li><p>Do not</p></li><li><p>You must work.</p></li><li><p>You may need to risk software.</p></li></ul>'
);
htmlTest(
    '<ul><li><a href="https://example.com">A link in a list item.</a></li></ul>',
    '<ul><li><p><a href="https://example.com">A link in a list item.</a></p></li></ul>'
);
htmlTest(
    '<p>Next</p><ul><li>Open</li><li>is: <strong>${gateway}</strong></li><li>verify.<br /><strong>-c 3 ${gateway}</strong></li></ul><p></p><ul><li>If contact <u><a href="mailto:Support@test.org">Support@test.org</a></u> assistance.</li></ul>',
    '<p>Next</p><ul><li><p>Open</p></li><li><p>is: <b>${gateway}</b></p></li><li><p>verify.</p><p><b>-c 3 ${gateway}</b></p></li></ul><p></p><ul><li><p>If contact <a href="mailto:Support@test.org"><u>Support@test.org</u></a> assistance.</p></li></ul>'
);
htmlTest(
    '<ul><li>Ping.<br /><strong>ping</strong> test</li></ul>',
    '<ul><li><p>Ping.</p><p><b>ping</b> test</p></li></ul>'
);
htmlTest('<em>Test</em>', '<i>Test</i>');
htmlTest(
    '<a href="https://bbc.co.uk">BBC</a>',
    '<p><a href="https://bbc.co.uk">BBC</a></p>'
);
htmlTest(
    '<div><em><a href="https://bbc.co.uk">BBC</a></em></div>',
    '<p><a href="https://bbc.co.uk"><i>BBC</i></a></p>'
);
htmlTest('<p>&nbsp;test&nbsp;</p>', '<p> test </p>');
htmlTest('<p>&raquo;</p>', '<p>»</p>');
// Ampersand is escaped in JSON but converted back to html entity in html
htmlTest('<p>&amp;</p>', '<p>&amp;</p>');
htmlTest('<sub>test</sub>', '<sub>test</sub>');
htmlTest('<sup>test</sup>', '<sup>test</sup>');
jsonTest('<p>&amp;</p>', {
    data: {},
    content: [
      {
        data: {},
        content: [
          {
            data: {},
            marks: [],
            value: "&",
            nodeType: "text",
          },
        ],
        nodeType: "paragraph",
      },
    ],
    nodeType: "document",
});
//not working
//console.log(htmlTest('<ul><li><a>Ping.<br /><strong>ping</strong> test</a></li></ul>', '<ul><li><a>Ping.<br /><strong>ping</strong> test</a></li></ul>'));

assetTest('<p>&amp;</p>', [], 'No images to parse.');

assetTest(
    '<img src="https://example.com/example.jpg">',
    [
        [
            '1002443364',
            {
                fields: {
                    title: { 'en-US': 'example.jpg' },
                    file: {
                        'en-US': {
                            contentType: 'image/jpeg',
                            fileName: 'example.jpg',
                            upload: 'https://example.com/example.jpg',
                        },
                    },
                },
            },
        ],
    ],
    'JPG image alone.'
);

assetTest(
    '<img src="https://example.com/example.jpeg">',
    [
        [
            '1010973171',
            {
                fields: {
                    title: { 'en-US': 'example.jpeg' },
                    file: {
                        'en-US': {
                            contentType: 'image/jpeg',
                            fileName: 'example.jpeg',
                            upload: 'https://example.com/example.jpeg',
                        },
                    },
                },
            },
        ],
    ],
    'JPG image alone (alternative "JPEG" extension).'
);

assetTest(
    '<img src="https://example.com/example.png">',
    [
        [
            '1002437660',
            {
                fields: {
                    title: { 'en-US': 'example.png' },
                    file: {
                        'en-US': {
                            contentType: 'image/png',
                            fileName: 'example.png',
                            upload: 'https://example.com/example.png',
                        },
                    },
                },
            },
        ],
    ],
    'PNG image alone.'
);

assetTest(
    '<p><img src="https://example.com/example.png"></p><p><i><img src="https://example.com/example.jpg"></i></p>',
    [
        [
            '1002437660',
            {
                fields: {
                    title: { 'en-US': 'example.png' },
                    file: {
                        'en-US': {
                            contentType: 'image/png',
                            fileName: 'example.png',
                            upload: 'https://example.com/example.png',
                        },
                    },
                },
            },
        ],
        [
            '1002443364',
            {
                fields: {
                    title: { 'en-US': 'example.jpg' },
                    file: {
                        'en-US': {
                            contentType: 'image/jpeg',
                            fileName: 'example.jpg',
                            upload: 'https://example.com/example.jpg',
                        },
                    },
                },
            },
        ],
    ],
    'Multiple images in complex DOM.'
);

parseTest(
    '<img src="https://example.com/example.jpg">',
    {
        data: {},
        content: [
            {
                data: {
                    target: {
                        sys: {
                            type: 'Link',
                            linkType: 'Asset',
                            id: '1002443364',
                        },
                    },
                },
                content: [],
                nodeType: 'embedded-asset-block',
            },
        ],
        nodeType: 'document',
    },
    'Single JPEG image.'
);

parseTest(
    '<iframe src="https://vimeo.com/video">',
    {
        data: {},
        content: [
            {
                data: {
                    target: {
                        sys: {
                            type: 'Link',
                            linkType: 'Entry',
                            id: '1564116844',
                        },
                    },
                },
                content: [],
                nodeType: 'embedded-entry-inline',
            },
        ],
        nodeType: 'document',
    },
    'Single iframe'
);

parseTest(
    '<p>Video <iframe src="https://vimeo.com/video"></p><p>PDF <iframe src="https://drive.com/file"></p>',
    {
        data: {},
        content: [
            {
                data: {},
                content: [
                    { data: {}, marks: [], value: 'Video ', nodeType: 'text' },
                    {
                        data: {
                            target: {
                                sys: {
                                    type: 'Link',
                                    linkType: 'Entry',
                                    id: '1564116844',
                                },
                            },
                        },
                        content: [],
                        nodeType: 'embedded-entry-inline',
                    },
                ],
                nodeType: 'paragraph',
            },
            {
                data: {},
                content: [
                    { data: {}, marks: [], value: 'PDF ', nodeType: 'text' },
                    {
                        data: {
                            target: {
                                sys: {
                                    type: 'Link',
                                    linkType: 'Entry',
                                    id: '523299395',
                                },
                            },
                        },
                        content: [],
                        nodeType: 'embedded-entry-inline',
                    },
                ],
                nodeType: 'paragraph',
            },
        ],
        nodeType: 'document',
    },
    'Multiple iframes'
);
