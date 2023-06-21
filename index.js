const htmlParser = require("htmlparser");
// add <wbr> to the list of empty tags (those that have no chilidren)
htmlParser.DefaultHandler._emptyTags = {
    ...htmlParser.DefaultHandler._emptyTags,
    wbr: 1,
};

const R = require("ramda");
const mime = require("mime-types");
const {
    paragraph,
    styles,
    decodeHtmlEntities,
    hashCode,
} = require("./helpers");
const htmlAttrs = {
    tag: {
        ul: "unordered-list",
        ol: "ordered-list",
        li: "list-item",
        blockquote: "blockquote",
        p: "paragraph",
        h1: "heading-1",
        h2: "heading-2",
        h3: "heading-3",
        h4: "heading-4",
        h5: "heading-5",
        h6: "heading-6",
        hr: "hr",
        a: "hyperlink",
        b: "bold",
        strong: "bold",
        sup: "superscript",
        sub: "subscript",
        code: "text",
        i: "italic",
        em: "italic",
        u: "underline",
        iframe: "embedded-entry-inline",
        img: "embedded-asset-block",
        span: "text",
    },
    text: "text",
};

const invalidNodeTypes = ["bold", "italic"];
const listTypes = ["unordered-list", "ordered-list"];

let transformed = []; //What should come out in the end
let parsedAssets = [];

// Detects empty paragraphs for removal
const isEmptyParagraph = (paragraph) => {
    return (
        !paragraph.content ||
        paragraph.content.length === 0 ||
        (paragraph.content.length === 1 && !paragraph.content[0].nodeType)
    );
};

// Enforces that content adheres to Contentful rich text format.
const enforceValidContent = (parentType, content) => {
    if (listTypes.includes(parentType)) {
        return content.filter((listItem) => listItem.nodeType === "list-item");
    } else if (parentType === "document") {
        return content.filter(
            (item) => !(item.type === "paragraph" && isEmptyParagraph(item))
        );
    }

    return content;
};

const enforceTopLevelParagraphs = (content) => {
    return content.map((node) => {
        if (node.nodeType === "hyperlink" || node.nodeType === "br") {
            return {
                data: {},
                content: [node],
                nodeType: "paragraph",
            };
        }

        return node;
    });
};

/**
 * Produces a list of assets from a block of HTML.
 *
 * These are intended to be used with 'contentful-management' library.
 *
 */
const parseAssetsFromDom = (dom, getAssetId) => {
    let assets = [];
    R.forEach((elem) => {
        const { type, name, data, attribs, children } = elem;

        if (children) {
            assets = assets.concat(parseAssetsFromDom(children));
        }

        if (type === "tag" && name === "img") {
            const url = attribs.src;
            const fileName = R.last(R.split("/", url));
            const assetId = getAssetId
                ? getAssetId(url)
                : hashCode(url).toString();

            const assetDescription = attribs?.alt
                ? {
                      description: {
                          "en-US": attribs.alt,
                      },
                  }
                : {};

            assets = [
                ...assets,
                [
                    assetId,
                    {
                        fields: {
                            title: {
                                "en-US": fileName,
                            },
                            file: {
                                "en-US": {
                                    contentType: mime.lookup(fileName),
                                    fileName: fileName,
                                    upload: url,
                                },
                            },
                            ...assetDescription,
                        },
                    },
                ],
            ];
        }
    }, dom);

    return assets;
};

const parseIFramesFromDom = (dom) => {
    let iFrames = [];
    R.forEach((elem) => {
        const { type, name, data, attribs, children } = elem;

        if (children) {
            iFrames = iFrames.concat(parseIFramesFromDom(children));
        }

        if (type === "tag" && name === "iframe") {
            const url = attribs.src;
            const mediaId = hashCode(url).toString();

            iFrames = [
                ...iFrames,
                [
                    mediaId,
                    {
                        fields: {
                            url: {
                                "en-US": url,
                            },
                        },
                    },
                ],
            ];
        }
    }, dom);

    return iFrames;
};

const transformDom = (dom, parents = [], getAssetId) => {
    let results = [];

    R.forEach((elm) => {
        const { type, name, data, attribs, children } = elm;

        let content = [];
        let newData = {};

        let decodedData = decodeHtmlEntities(data);

        let newParents = [...parents, htmlAttrs[type][name]];

        if (children) {
            content = transformDom(children, newParents);
        }

        const topLevelElements = [
            "paragraph",
            "list-item",
            "heading-1",
            "heading-2",
            "heading-3",
            "heading-4",
            "heading-5",
            "heading-6"
        ];

        if (!topLevelElements.some(element => newParents.includes(element))) {
            content = enforceTopLevelParagraphs(content);
        }

        if (type === "text") {
            newData = {
                data: {},
                marks: [],
                value: decodedData,
                nodeType: type,
            };
        } else if (type === "tag") {
            switch (name) {
                case "div":
                case "span":
                    //Spans seem to just be passed through
                    newData = content;
                    break;
                case "wbr":
                case "br":
                    // line breaks are represented as a single newline character
                    newData = {
                        data: {},
                        marks: [],
                        value: "\n",
                        nodeType: "text",
                    };
                    break;
                case "code":
                    const { decode } = require("html-entities");

                    newData = R.map((node) => {
                        node = R.assoc(
                            "value",
                            decode(node.value, { level: "xml" }),
                            node
                        );
                        node = R.assoc(
                            "marks",
                            R.append({ type: "code" }, node.marks),
                            node
                        );
                        return node;
                    }, content);
                    break;
                case "img":
                    const url = attribs.src;

                    newData = {
                        data: {
                            target: {
                                sys: {
                                    type: "Link",
                                    linkType: "Asset",
                                    id: getAssetId
                                        ? getAssetId(url)
                                        : hashCode(url).toString(),
                                },
                            },
                        },
                        content: [],
                        nodeType: htmlAttrs[type][name],
                    };
                    break;
                case "iframe":
                    const mediaURL = attribs.src;
                    const mediaId = hashCode(mediaURL).toString();

                    newData = {
                        data: {
                            target: {
                                sys: {
                                    type: "Link",
                                    linkType: "Entry",
                                    id: mediaId,
                                },
                            },
                        },
                        content: [],
                        nodeType: htmlAttrs[type][name],
                    };
                    break;
                case "i":
                case "em":
                case "b":
                case "strong":
                case "sup":
                case "sub":
                case "u":
                    newData = styles(content, htmlAttrs[type][name]);
                    break;
                case "a":
                    newData = {
                        data: { uri: R.propOr("", "href", attribs) },
                        content,
                        nodeType: htmlAttrs[type][name],
                    };

                    break;
                case "li":
                    //@TODO shouldn't need to cast to an array...
                    content = R.type(content) === "Array" ? content : [content];
                    let newContent = [];

                    //Seems to want text wrapped in some type of content tag (p, h*, etc)
                    content = R.forEach((node) => {
                        if (
                            node.nodeType === "text" ||
                            node.nodeType === "hyperlink"
                        ) {
                            //if the last of new content isn't a `paragraph`
                            if (
                                R.propOr(
                                    false,
                                    "nodeType",
                                    R.last(newContent)
                                ) !== "paragraph"
                            ) {
                                newContent = R.concat(
                                    newContent,
                                    paragraph([], "paragraph")
                                );
                            }
                            //put node in R.last(newContent).content
                            newContent[newContent.length - 1].content.push(
                                node
                            );
                        } else {
                            newContent = R.append(node, newContent);
                        }
                    }, content);

                    if (newContent[newContent.length - 1].nodeType === "br") {
                        newContent = newContent.slice(0, 1);
                    }

                    newData = {
                        data: {},
                        content: newContent,
                        nodeType: htmlAttrs[type][name],
                    };
                    break;
                case "p":
                case "h1":
                case "h2":
                case "h3":
                case "h4":
                case "h5":
                case "h6":
                    newData = paragraph(content, htmlAttrs[type][name]);

                    break;
                default:
                    if (!htmlAttrs[type][name]) {
                        console.log("*** new data needed under -", type, name);
                    }

                    content = enforceValidContent(
                        htmlAttrs[type][name],
                        content
                    );

                    newData = {
                        data: {},
                        content,
                        nodeType: invalidNodeTypes.includes(
                            htmlAttrs[type][name]
                        )
                            ? "paragraph"
                            : htmlAttrs[type][name],
                    };
                    break;
            }
        } else {
            console.log("***new type needed -", type, data);
        }

        results =
            R.type(newData) === "Array"
                ? R.concat(results, newData)
                : R.append(newData, results);
    }, dom);
    return results;
};

const parseHtml = (html, getAssetId) => {
    const handleFn = (error, dom) => {
        if (error) {
            throw error;
        }
        transformed = {
            data: {},
            content: enforceTopLevelParagraphs(
                transformDom(dom, [], getAssetId)
            ),
            nodeType: "document",
        };
    };

    const parser = new htmlParser.Parser(
        new htmlParser.DefaultHandler(handleFn)
    );

    parser.parseComplete(html); //returns undefined...
    return transformed;
};

const parseAssets = (html, getAssetId) => {
    const assetsFn = (error, dom) => {
        if (error) {
            throw error;
        }

        parsedAssets = parseAssetsFromDom(dom, getAssetId);
    };

    const assetParser = new htmlParser.Parser(
        new htmlParser.DefaultHandler(assetsFn)
    );

    assetParser.parseComplete(html);
    return parsedAssets;
};

const parseIFrames = (html) => {
    const iFramesParser = new htmlParser.Parser(
        new htmlParser.DefaultHandler((error, dom) => {
            if (error) {
                throw error;
            }

            parsedIFrames = parseIFramesFromDom(dom);
        })
    );

    iFramesParser.parseComplete(html);
    return parsedIFrames;
};

module.exports = {
    parseHtml,
    parseAssets,
    parseIFrames,
};
