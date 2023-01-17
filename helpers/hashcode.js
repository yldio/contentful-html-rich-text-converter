/**
 * This is a transpiled version of the String.hashCode() function from Java.
 *
 * Contentful requires integer IDs, and we require asset IDs to be predictable.
 * hashCode is an industry-proven method to produce an integer hash from a string.
 *
 * Modified from: https://gist.github.com/hyamamoto/fd435505d29ebfa3d9716fd2be8d42f0
 */

const hashCode = (string) => {
    let hash = 0;
    let len = string.length;
    let i = 0;

    if (len > hash) {
        while (i < len) {
            hash = (hash << 5) - hash + string.charCodeAt(i++) | 0;
        }
    }

    return hash > 0 ? hash : 0 - hash;
}

module.exports = hashCode;
