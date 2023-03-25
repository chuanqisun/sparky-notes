//-----------------------------------------------------------------------
// <copyright company="Microsoft Corporation">
//    Copyright (c) Microsoft Corporation.  All rights reserved.
// </copyright>
//-----------------------------------------------------------------------

export const toNumberedList = <T>(items: T[], itemToText?: (item: T) => string) => items
    .map((item, i) => `${i + 1}. ${itemToText ? itemToText(item) : item}`)
    .join('\n');
