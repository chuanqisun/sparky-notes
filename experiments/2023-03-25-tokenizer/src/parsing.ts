//-----------------------------------------------------------------------
// <copyright company="Microsoft Corporation">
//    Copyright (c) Microsoft Corporation.  All rights reserved.
// </copyright>
//-----------------------------------------------------------------------

export const tryParseJson = <T>(text: string, defaultValue?: T) => {
    try {
        return JSON.parse(text) as T;
    } catch (uncorrectedError) {
        // attempt to remove surrounding text
        const start = Math.min(text.indexOf('['), text.indexOf('{'));
        const end = Math.max(text.lastIndexOf(']'), text.lastIndexOf('}'));
        let correctedText = text.slice(start, end + 1);
        try {
            correctedText = (correctedText as any).replaceAll(/(,)(\s*)([}\]])/gm, '$2$3'); // remove trailing commas
            return JSON.parse(correctedText) as T;
        } catch (correctedError) {
            console.log('tryParseJson.error', {
                text,
                start,
                end,
                correctedText,
                uncorrectedError,
                correctedError,
            });
            return defaultValue;
        }
    }
};

const listRegex = /^(?:(?:\d+\.)|(?:-+))\s*(.+)\s*\n?$/gm;
export const tryExtractList = (text: string): string[] => Array.from(text.matchAll(listRegex)).map(match => match[1].trim());
