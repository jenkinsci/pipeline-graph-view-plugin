import React from 'react';

export interface Result {
    isSelectGraphicRendition?: boolean,
    escapeCode?: string, // input
    setFG?: number | false, // 0-7 if a foreground color is specified
    setBG?: number | false, // 0-7 if a background color is specified
    resetFG?: boolean, // true if contains a reset back to default foreground
    resetBG?: boolean // true if contains a reset back to default background
}

/**
 * Parse an isolated escape code, looking for "SelectGraphicsRendition" codes specifically.
 *
 * Result:
 * ```
 * // Supported code
 * {
 *     isSelectGraphicRendition: true,
 *     escapeCode: string, // input
 *     setFG: integer | false, // 0-7 if a foreground color is specified
 *     setBG: integer | false, // 0-7 if a background color is specified
 *     resetFG: bool, // true if contains a reset back to default foreground
 *     resetBG: bool // true if contains a reset back to default background
 * }
 *
 * // Unsupported or malformed code:
 * {
 *     isSelectGraphicRendition: false,
 *     escapeCode: string // input
 * }
 * ```
 */
export function parseEscapeCode(escapeCode: string): Result {
    const graphicsPattern = /^\u001b\[([;0-9]*)m$/; // We only care about SGR codes

    const result: Result = {
        isSelectGraphicRendition: false, // True when is a color / font command
        escapeCode,
    };

    const match = graphicsPattern.exec(escapeCode);

    if (match) {
        result.isSelectGraphicRendition = true;
        result.setFG = false;
        result.setBG = false;
        result.resetFG = false;
        result.resetBG = false;

        // Convert param string to array<int> with length > 1
        const params = (match[1] || '').split(';').map(str => parseInt(str || '0'));

        // Now go through the ints, decode them into bg/fg info
        for (const num of params) {
            if (num >= 30 && num <= 37) {
                result.setFG = num - 30; // Normal FG set
            } else if (num >= 40 && num <= 47) {
                result.setBG = num - 40; // Normal BG set
            } else {
                if (num === 38 || num === 0) {
                    result.resetFG = true;
                    result.setFG = false;
                }

                if (num === 48 || num === 0) {
                    result.resetBG = true;
                    result.setBG = false;
                }
            }
        }
    }

    return result;
}

/**
 * Break up a string into an array of plain strings and escape codes. Returns [input] if no codes present.
 */
export function tokenizeANSIString(input?: string): string[] | Result[] {
    if (typeof input !== 'string') {
        return [];
    }

    const len = input.length;

    if (len === 0) {
        return [];
    }

    let i1 = 0,
        i2 = 0;
    const result: string[] | Result[] = [];

    while (i1 < len) {
        //--------------------------------------------------------------------------
        //  Find next escape code

        i2 = input.indexOf('\x1b', i1);

        if (i2 === -1) {
            // No more escape codes
            break;
        }

        //--------------------------------------------------------------------------
        //  Capture any text between the start pointer and the escape code

        if (i2 > i1) {
            result.push(input.substring(i1, i2));
            i1 = i2; // Advance our start pointer to the beginning of the escape code
        }

        //--------------------------------------------------------------------------
        //  Find the end of the escape code (a char from 64 - 126 indicating command)

        i2 += 2; // Skip past ESC and '['

        let code = input.charCodeAt(i2);
        while (i2 < len && (code < 64 || code > 126)) {
            i2++;
            code = input.charCodeAt(i2);
        }

        //--------------------------------------------------------------------------
        //  Create token for the escape code

        // TODO fix type checking
        const parsedEscapeCode: any = parseEscapeCode(input.substring(i1, i2 + 1));
        result.push(parsedEscapeCode);

        //--------------------------------------------------------------------------
        //  Keep looking in the rest of the string

        i1 = i2 + 1;
    }

    if (i1 < len) {
        result.push(input.substr(i1));
    }

    return result;
}

/**
 * Takes an array of string snippets and parsed escape codes produced bv tokenizeANSIString, and creates
 * an array of strings and spans with classNames for attributes.
 */
export function makeReactChildren(tokenizedInput: string[] | Result[]) {
    const result = [];
    let currentState: Result = {
        setFG: false,
        setBG: false,
    };

    for (const codeOrString of tokenizedInput) {
        if (typeof codeOrString === 'string') {
            // Need to output a <span> or plain text if there's no interesting current state

            if (!currentState.setFG && !currentState.setBG) {
                result.push(codeOrString);
            } else {
                const classNames = [];

                if (typeof currentState.setFG === 'number') {
                    classNames.push(`ansi-fg-${currentState.setFG}`);
                }
                if (typeof currentState.setBG === 'number') {
                    classNames.push(`ansi-bg-${currentState.setBG}`);
                }

                result.push(<span className={classNames.join(' ')}>{codeOrString}</span>);
            }
        } else if (codeOrString.isSelectGraphicRendition) {
            // Update the current FG / BG colors for the next text span
            const nextState = { ...currentState };

            if (codeOrString.resetFG) {
                nextState.setFG = false;
            }
            if (codeOrString.resetBG) {
                nextState.setBG = false;
            }

            if (typeof codeOrString.setFG === 'number') {
                nextState.setFG = codeOrString.setFG;
            }
            if (typeof codeOrString.setBG === 'number') {
                nextState.setBG = codeOrString.setBG;
            }

            currentState = nextState;
        }
    }

    return result;
}
